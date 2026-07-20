// controllers/visitorController.js
const { getSupabase } = require('../config/supabase');
const { sendRingNotification } = require('../services/pushNotificationService');
const { sendWebPush, isWebPushSubscription } = require('../services/webPushService');
const { distanciaMetros, UMBRAL_VERIFICADO } = require('../utils/geo');
const logger = require('../config/logger');

// Resuelve un qrId → timbre + dirección (activos).
const resolverTimbre = async (qrId) => {
  const sb = getSupabase();
  const { data: timbre } = await sb.from('timbres').select('*').eq('qr_id', qrId).eq('activo', true).maybeSingle();
  if (!timbre) return null;
  const { data: direccion } = await sb.from('direcciones').select('*').eq('id', timbre.direccion_id).maybeSingle();
  if (!direccion || !direccion.activa) return null;
  return { timbre, direccion };
};

/**
 * GET /api/visitor/:qrId
 */
const getVisitorInfo = async (req, res, next) => {
  try {
    const resuelto = await resolverTimbre(req.params.qrId);
    if (!resuelto) return res.status(404).json({ error: 'QR no válido o no encontrado.' });
    const { timbre, direccion } = resuelto;

    const sb = getSupabase();
    const { data: owner } = await sb.from('usuarios').select('nombre,apellido').eq('id', direccion.owner_id).maybeSingle();

    await sb.from('eventos').insert({
      user_id: direccion.owner_id, direccion_id: direccion.id, timbre_id: timbre.id,
      tipo: 'vista_qr', visitor_ip: req.ip, user_agent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      casa: {
        // `familia` es el nombre de la dirección (p.ej. "Familia Muhana"), que es
        // lo que se muestra grande en la web del visitante. `nombreCompleto` es
        // el dueño, como dato secundario.
        familia: direccion.nombre || (owner ? `${owner.nombre} ${owner.apellido}` : 'Timbre'),
        nombreCompleto: owner ? `${owner.nombre} ${owner.apellido}` : direccion.nombre,
        direccion: direccion.direccion || direccion.nombre || 'Dirección privada',
        foto_fachada: direccion.foto,
        timbre: timbre.nombre,
        qrId: timbre.qr_id,
        modoGeo: !!timbre.modo_geo,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visitor/:qrId/ring
 */
const ringDoorbell = async (req, res, next) => {
  try {
    const { visitorName, lat, lng, accuracy } = req.body;
    const resuelto = await resolverTimbre(req.params.qrId);
    if (!resuelto) return res.status(404).json({ error: 'QR no válido.' });
    const { timbre, direccion } = resuelto;
    const sb = getSupabase();

    const visitorIP =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] || req.connection?.remoteAddress || req.ip;

    // Geo
    const visitorLat = typeof lat === 'number' ? lat : null;
    const visitorLng = typeof lng === 'number' ? lng : null;

    // Si el dueño activó "exigir ubicación" (modo_geo), no se permite timbrar sin
    // compartir la ubicación. Evita que timbren de lejos o al pasar escaneando.
    if (timbre.modo_geo && (visitorLat === null || visitorLng === null)) {
      return res.status(428).json({
        error: 'Este timbre requiere compartir tu ubicación para poder tocar.',
        requiereUbicacion: true,
      });
    }
    let distancia = null;
    let ubicacionVerificada = null;
    if (visitorLat !== null && visitorLng !== null && direccion.lat != null && direccion.lng != null) {
      distancia = distanciaMetros(visitorLat, visitorLng, direccion.lat, direccion.lng);
      if (distancia !== null) ubicacionVerificada = distancia <= UMBRAL_VERIFICADO;
    }

    // Notificar a todos los miembros con pushToken
    const { data: ms } = await sb.from('memberships')
      .select('usuario:usuarios(id,nombre,apellido,push_token)')
      .eq('direccion_id', direccion.id).eq('estado', 'activo');

    let enviados = 0;
    const nombreVisitante = visitorName?.trim() || null;
    const address = `${direccion.nombre} · ${timbre.nombre}`;
    await Promise.all((ms || []).filter((m) => m.usuario && m.usuario.push_token).map(async (m) => {
      const token = m.usuario.push_token;
      // El push_token puede ser una suscripción Web Push (PWA, JSON) o un token
      // FCM legacy. Se elige el canal según el formato.
      if (isWebPushSubscription(token)) {
        const result = await sendWebPush(token, {
          title: '🔔 ¡Timbre!',
          body: `${nombreVisitante || 'Alguien'} está en tu puerta · ${direccion.nombre}`,
          data: { type: 'DOORBELL_RING', address, visitorName: nombreVisitante || '' },
        });
        if (result.success) enviados += 1;
        if (result.gone) {
          await sb.from('usuarios').update({ push_token: null }).eq('id', m.usuario.id);
          logger.warn(`Suscripción Web Push expirada, limpiada: user ${m.usuario.id}`);
        }
      } else {
        const result = await sendRingNotification({
          pushToken: token,
          ownerName: `${m.usuario.nombre} ${m.usuario.apellido}`,
          visitorName: nombreVisitante,
          address,
        });
        if (result.success) enviados += 1;
        if (result.tokenInvalid) {
          await sb.from('usuarios').update({ push_token: null }).eq('id', m.usuario.id);
          logger.warn(`Cleared invalid pushToken for user ${m.usuario.id}`);
        }
      }
    }));

    await sb.from('eventos').insert({
      user_id: direccion.owner_id, direccion_id: direccion.id, timbre_id: timbre.id,
      tipo: 'timbrazo', visitor_ip: visitorIP, visitor_name: visitorName?.trim() || null,
      user_agent: req.headers['user-agent'],
      visitor_lat: visitorLat, visitor_lng: visitorLng,
      visitor_accuracy: typeof accuracy === 'number' ? accuracy : null,
      distancia_metros: distancia, ubicacion_verificada: ubicacionVerificada,
      notification_sent: enviados > 0,
      notification_error: enviados > 0 ? null : 'Sin destinatarios con token',
    });

    res.json({
      success: true, message: 'Timbre enviado.', notificados: enviados,
      distanciaMetros: distancia, ubicacionVerificada,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVisitorInfo, ringDoorbell };
