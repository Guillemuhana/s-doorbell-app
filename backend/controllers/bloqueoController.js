// controllers/bloqueoController.js
// Bloqueo de visitantes por dirección. El visitante se identifica por un id de
// su navegador (visitor_id) y/o por IP. Un visitante bloqueado que toca el
// timbre NO genera notificación (ver visitorController.ringDoorbell).
const { getSupabase } = require('../config/supabase');
const { getRol } = require('../utils/access');

const mapBloqueo = (r) => r && ({
  _id: r.id,
  direccionId: r.direccion_id,
  visitorId: r.visitor_id,
  visitorIp: r.visitor_ip,
  visitorName: r.visitor_name,
  motivo: r.motivo,
  createdAt: r.created_at,
});

/**
 * GET /api/direcciones/:id/bloqueos (miembro)
 */
const listBloqueos = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'Sin acceso a esta dirección.' });
    const sb = getSupabase();
    const { data, error } = await sb.from('bloqueos')
      .select('*').eq('direccion_id', req.params.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, bloqueos: (data || []).map(mapBloqueo) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones/:id/bloqueos (miembro) — bloquear un visitante.
 * body: { visitorId?, visitorIp?, nombre?, motivo? } (al menos uno de id/ip)
 */
const crearBloqueo = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'Sin acceso a esta dirección.' });

    const visitorId = (req.body.visitorId || '').trim() || null;
    const visitorIp = (req.body.visitorIp || '').trim() || null;
    if (!visitorId && !visitorIp) {
      return res.status(400).json({ error: 'No se puede identificar a este visitante para bloquearlo.' });
    }

    const sb = getSupabase();
    // Evitar duplicados por el mismo identificador.
    let dup = sb.from('bloqueos').select('id').eq('direccion_id', req.params.id);
    dup = visitorId ? dup.eq('visitor_id', visitorId) : dup.eq('visitor_ip', visitorIp);
    const { data: existente } = await dup.maybeSingle();
    if (existente) return res.json({ success: true, yaBloqueado: true, bloqueoId: existente.id });

    const { data, error } = await sb.from('bloqueos')
      .insert({
        direccion_id: req.params.id,
        visitor_id: visitorId,
        visitor_ip: visitorIp,
        visitor_name: (req.body.nombre || '').trim() || null,
        motivo: (req.body.motivo || '').trim() || null,
        created_by: req.usuario._id,
      })
      .select().single();
    if (error) throw error;
    res.status(201).json({ success: true, bloqueo: mapBloqueo(data) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/direcciones/:id/bloqueos/:bloqueoId (miembro) — desbloquear.
 */
const eliminarBloqueo = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'Sin acceso a esta dirección.' });
    const sb = getSupabase();
    const { data: b } = await sb.from('bloqueos').select('id, direccion_id').eq('id', req.params.bloqueoId).maybeSingle();
    if (!b || b.direccion_id !== req.params.id) return res.status(404).json({ error: 'Bloqueo no encontrado.' });
    await sb.from('bloqueos').delete().eq('id', b.id);
    res.json({ success: true, message: 'Visitante desbloqueado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listBloqueos, crearBloqueo, eliminarBloqueo };
