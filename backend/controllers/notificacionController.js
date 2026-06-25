// controllers/notificacionController.js
const { getSupabase } = require('../config/supabase');
const { sendGenericNotification } = require('../services/pushNotificationService');

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
      return res.status(400).json({ error: 'No hay token registrado. Abre la app primero.' });
    }

    const result = await sendGenericNotification({
      pushToken: usuario.push_token,
      title: '🔔 S-Doorbell Test',
      body: 'Las notificaciones están funcionando correctamente.',
      data: { type: 'TEST' },
    });

    if (result.success) {
      res.json({ success: true, message: 'Notificación de prueba enviada.', messageId: result.messageId });
    } else {
      res.status(500).json({ error: 'Error enviando notificación.', detail: result.error });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { guardarToken, testNotification };
