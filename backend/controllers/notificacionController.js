// controllers/notificacionController.js
const { getSupabase } = require('../config/supabase');
const { sendGenericNotification } = require('../services/pushNotificationService');
const { sendWebPush, isWebPushSubscription } = require('../services/webPushService');
const { llamarTimbre, twilioConfigurado } = require('../services/twilioService');
const logger = require('../config/logger');

/**
 * POST /api/notificaciones/guardar-token
 */
const guardarToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'pushToken requerido.' });

    const sb = getSupabase();
    await sb.from('usuarios').update({
      push_token: pushToken, push_token_updated_at: new Date().toISOString(),
    }).eq('id', req.usuario._id);

    res.json({ success: true, message: 'Token de notificación guardado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notificaciones/test
 */
const testNotification = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: usuario } = await sb.from('usuarios').select('push_token').eq('id', req.usuario._id).maybeSingle();
    if (!usuario?.push_token) {
      return res.status(400).json({
        error: 'No hay notificaciones activadas. Tocá "Activar notificaciones" primero (y en iPhone, agregá la app a la pantalla de inicio).',
      });
    }

    const token = usuario.push_token;
    const title = '🔔 ¡Timbre! (prueba)';
    const body = 'Así vas a recibir el timbre con la app cerrada.';

    // El push_token puede ser una suscripción Web Push (PWA) o un token FCM.
    // Elegimos el canal según el formato — igual que el timbrazo real.
    let result;
    if (isWebPushSubscription(token)) {
      result = await sendWebPush(token, { title, body, data: { type: 'TEST' } });
      if (result.gone) {
        await sb.from('usuarios').update({ push_token: null }).eq('id', req.usuario._id);
        return res.status(400).json({ error: 'La suscripción venció. Tocá "Activar notificaciones" de nuevo.' });
      }
    } else {
      result = await sendGenericNotification({ pushToken: token, title, body, data: { type: 'TEST' } });
    }

    if (result.success) {
      res.json({ success: true, message: 'Notificación de prueba enviada.', messageId: result.messageId });
    } else {
      logger.warn('Test notification failed:', result.error);
      res.status(500).json({ error: 'Error enviando notificación.', detail: result.error });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notificaciones/test-llamada
 * Llama al teléfono del propio usuario para probar la llamada de timbre.
 */
const testLlamada = async (req, res, next) => {
  try {
    if (!twilioConfigurado) {
      return res.status(503).json({ error: 'Las llamadas todavía no están configuradas en el servidor.' });
    }
    const sb = getSupabase();
    const { data: usuario } = await sb.from('usuarios').select('telefono').eq('id', req.usuario._id).maybeSingle();
    if (!usuario?.telefono) {
      return res.status(400).json({ error: 'Cargá tu teléfono en el perfil (con código de país, ej. +5491122334455).' });
    }
    const r = await llamarTimbre({ to: usuario.telefono, visitorName: 'Prueba', address: 'tu casa' });
    if (r.success) return res.json({ success: true, message: 'Te estamos llamando…' });
    return res.status(400).json({ error: r.error === 'Teléfono inválido'
      ? 'El teléfono no tiene un formato válido. Usá código de país, ej. +5491122334455.'
      : 'No se pudo hacer la llamada de prueba.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { guardarToken, testNotification, testLlamada };
