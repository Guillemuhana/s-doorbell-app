// controllers/callController.js
// Videollamada de timbre (WebRTC). El backend solo hace de "signaling":
// reenvía offer/answer/ICE entre el visitante (web) y el residente (app) vía
// polling. El video viaja P2P directo entre los dos dispositivos.
const { getSupabase } = require('../config/supabase');
const { sendIncomingCallNotification } = require('../services/pushNotificationService');
const { mapCallSession } = require('../db/mappers');
const logger = require('../config/logger');

// ─── Config de servidores ICE (STUN/TURN) ──────────────────────────────────
// STUN basta en redes simples/LAN. Para NAT estricto / redes celulares hace
// falta un TURN (configurar TURN_URL/TURN_USERNAME/TURN_CREDENTIAL en el .env).
const getIceServers = () => {
  const stunUrls = (process.env.STUN_URLS || 'stun:stun.l.google.com:19302')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const servers = [{ urls: stunUrls }];
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL.split(',').map((s) => s.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
};

// Resuelve un qrId → timbre + dirección (activos).
const resolverTimbre = async (qrId) => {
  const sb = getSupabase();
  const { data: timbre } = await sb.from('timbres').select('*').eq('qr_id', qrId).eq('activo', true).maybeSingle();
  if (!timbre) return null;
  const { data: direccion } = await sb.from('direcciones').select('*').eq('id', timbre.direccion_id).maybeSingle();
  if (!direccion || !direccion.activa) return null;
  return { timbre, direccion };
};

// El residente debe ser miembro activo de la dirección de la llamada.
const puedeAtender = async (sb, usuarioId, direccionId) => {
  const { data } = await sb.from('memberships')
    .select('id').eq('usuario_id', usuarioId).eq('direccion_id', direccionId)
    .eq('estado', 'activo').maybeSingle();
  return !!data;
};

// Marca la sesión como finalizada (idempotente).
const finalizar = async (sb, callId, estado) => {
  await sb.from('call_sessions')
    .update({ estado, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', callId).in('estado', ['ringing', 'accepted']);
};

// ════════════════════════════════════════════════════════════════════════════
// PÚBLICO (visitante) — el callId secreto actúa como capacidad de acceso.
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/calls/config → servidores ICE para el cliente WebRTC.
 */
const getConfig = (_req, res) => {
  res.json({ success: true, iceServers: getIceServers() });
};

/**
 * POST /api/calls/start/:qrId
 * El visitante inicia una videollamada. Crea la sesión y notifica a los miembros.
 */
const startCall = async (req, res, next) => {
  try {
    const { visitorName } = req.body || {};
    const resuelto = await resolverTimbre(req.params.qrId);
    if (!resuelto) return res.status(404).json({ error: 'QR no válido.' });
    const { timbre, direccion } = resuelto;
    const sb = getSupabase();

    const nombre = visitorName?.trim() || null;

    // Evento (queda en el historial como videollamada).
    const { data: evento } = await sb.from('eventos').insert({
      user_id: direccion.owner_id, direccion_id: direccion.id, timbre_id: timbre.id,
      tipo: 'videollamada', visitor_ip: req.ip, visitor_name: nombre,
      user_agent: req.headers['user-agent'],
    }).select('id').maybeSingle();

    // Sesión de llamada.
    const { data: call, error } = await sb.from('call_sessions').insert({
      direccion_id: direccion.id, timbre_id: timbre.id, evento_id: evento?.id || null,
      visitor_name: nombre, estado: 'ringing',
    }).select('*').single();
    if (error) throw error;

    // Notificar a todos los miembros con pushToken.
    const { data: ms } = await sb.from('memberships')
      .select('usuario:usuarios(id,nombre,apellido,push_token)')
      .eq('direccion_id', direccion.id).eq('estado', 'activo');

    await Promise.all((ms || []).filter((m) => m.usuario && m.usuario.push_token).map(async (m) => {
      const result = await sendIncomingCallNotification({
        pushToken: m.usuario.push_token,
        ownerName: `${m.usuario.nombre} ${m.usuario.apellido}`,
        visitorName: nombre,
        address: `${direccion.nombre} · ${timbre.nombre}`,
        callId: call.id,
      });
      if (result.tokenInvalid) {
        await sb.from('usuarios').update({ push_token: null }).eq('id', m.usuario.id);
      }
    }));

    res.json({ success: true, callId: call.id, iceServers: getIceServers() });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/calls/:callId/visitor/signal   body { tipo, payload }
 * GET  /api/calls/:callId/visitor/poll?after=<seq>
 * POST /api/calls/:callId/visitor/hangup
 * (versión "visitante": emite como 'visitor', lee señales del 'resident')
 */
const visitorSignal = (req, res, next) => postSignal(req, res, next, 'visitor');
const visitorPoll = (req, res, next) => pollSignals(req, res, next, 'visitor');
const visitorHangup = (req, res, next) => hangup(req, res, next);

// ════════════════════════════════════════════════════════════════════════════
// PRIVADO (residente autenticado)
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/calls/incoming → videollamadas 'ringing' en las direcciones del usuario.
 */
const listIncoming = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: mems } = await sb.from('memberships')
      .select('direccion_id').eq('usuario_id', req.usuario._id).eq('estado', 'activo');
    const dirIds = (mems || []).map((m) => m.direccion_id);
    if (!dirIds.length) return res.json({ success: true, calls: [] });

    // Solo llamadas recientes (últimos 60s) para no resucitar sesiones colgadas.
    const desde = new Date(Date.now() - 60000).toISOString();
    const { data, error } = await sb.from('call_sessions')
      .select('*, direccion:direcciones(id,nombre), timbre:timbres(id,nombre)')
      .in('direccion_id', dirIds).eq('estado', 'ringing')
      .gte('created_at', desde).order('created_at', { ascending: false }).limit(10);
    if (error) throw error;

    const calls = (data || []).map((r) => ({
      ...mapCallSession(r),
      direccion: r.direccion ? { _id: r.direccion.id, nombre: r.direccion.nombre } : null,
      timbre: r.timbre ? { _id: r.timbre.id, nombre: r.timbre.nombre } : null,
    }));
    res.json({ success: true, calls });
  } catch (error) {
    next(error);
  }
};

const loadCallForResident = async (sb, callId, usuarioId) => {
  const { data: call } = await sb.from('call_sessions').select('*').eq('id', callId).maybeSingle();
  if (!call) return { error: 404 };
  if (!(await puedeAtender(sb, usuarioId, call.direccion_id))) return { error: 403 };
  return { call };
};

/**
 * POST /api/calls/:callId/accept
 */
const acceptCall = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { call, error } = await loadCallForResident(sb, req.params.callId, req.usuario._id);
    if (error) return res.status(error).json({ error: error === 404 ? 'Llamada no encontrada.' : 'Sin permiso.' });
    if (call.estado !== 'ringing') return res.status(409).json({ error: 'La llamada ya no está disponible.', estado: call.estado });

    const { data, error: upErr } = await sb.from('call_sessions')
      .update({ estado: 'accepted', answered_by: req.usuario._id, updated_at: new Date().toISOString() })
      .eq('id', call.id).eq('estado', 'ringing').select('*').maybeSingle();
    if (upErr) throw upErr;
    if (!data) return res.status(409).json({ error: 'Otro miembro atendió la llamada.' });

    res.json({ success: true, call: mapCallSession(data), iceServers: getIceServers() });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/calls/:callId/reject
 */
const rejectCall = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { call, error } = await loadCallForResident(sb, req.params.callId, req.usuario._id);
    if (error) return res.status(error).json({ error: error === 404 ? 'Llamada no encontrada.' : 'Sin permiso.' });
    await finalizar(sb, call.id, 'rejected');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const residentSignal = (req, res, next) => postSignal(req, res, next, 'resident');
const residentPoll = (req, res, next) => pollSignals(req, res, next, 'resident');
const residentHangup = (req, res, next) => hangup(req, res, next);

// ════════════════════════════════════════════════════════════════════════════
// Helpers de signaling compartidos
// ════════════════════════════════════════════════════════════════════════════

// emisor = quién manda ('visitor' | 'resident')
async function postSignal(req, res, next, emisor) {
  try {
    const { tipo, payload } = req.body || {};
    if (!['offer', 'answer', 'ice'].includes(tipo) || payload == null) {
      return res.status(400).json({ error: 'Señal inválida.' });
    }
    const sb = getSupabase();
    const { data: call } = await sb.from('call_sessions').select('id,estado').eq('id', req.params.callId).maybeSingle();
    if (!call) return res.status(404).json({ error: 'Llamada no encontrada.' });
    if (['ended', 'rejected', 'timeout'].includes(call.estado)) {
      return res.status(409).json({ error: 'La llamada finalizó.', estado: call.estado });
    }
    const { error } = await sb.from('call_signals').insert({ call_id: call.id, emisor, tipo, payload });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// emisor = quién consulta; devuelve las señales del OTRO lado + estado de la sesión.
async function pollSignals(req, res, next, emisor) {
  try {
    const otro = emisor === 'visitor' ? 'resident' : 'visitor';
    const after = parseInt(req.query.after, 10) || 0;
    const sb = getSupabase();

    const { data: call } = await sb.from('call_sessions').select('estado').eq('id', req.params.callId).maybeSingle();
    if (!call) return res.status(404).json({ error: 'Llamada no encontrada.' });

    const { data: signals, error } = await sb.from('call_signals')
      .select('seq, tipo, payload')
      .eq('call_id', req.params.callId).eq('emisor', otro).gt('seq', after)
      .order('seq', { ascending: true }).limit(50);
    if (error) throw error;

    const cursor = signals && signals.length ? signals[signals.length - 1].seq : after;
    res.json({ success: true, estado: call.estado, cursor, signals: signals || [] });
  } catch (error) {
    next(error);
  }
}

// Cualquiera de los dos cuelga → sesión 'ended'.
async function hangup(req, res, next) {
  try {
    const sb = getSupabase();
    const { data: call } = await sb.from('call_sessions').select('id').eq('id', req.params.callId).maybeSingle();
    if (!call) return res.status(404).json({ error: 'Llamada no encontrada.' });
    await sb.from('call_sessions')
      .update({ estado: 'ended', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', call.id).not('estado', 'in', '("rejected")');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getConfig, startCall,
  visitorSignal, visitorPoll, visitorHangup,
  listIncoming, acceptCall, rejectCall,
  residentSignal, residentPoll, residentHangup,
};
