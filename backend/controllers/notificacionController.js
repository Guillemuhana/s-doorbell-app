// controllers/notificacionController.js
const Usuario = require('../models/Usuario');
const { sendRingNotification, sendGenericNotification } = require('../services/pushNotificationService');

/**
 * POST /api/notificaciones/guardar-token
 */
const guardarToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'pushToken requerido.' });

    await Usuario.findByIdAndUpdate(req.usuario._id, {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    });

    res.json({ success: true, message: 'Token de notificación guardado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notificaciones/test
 * Send a test notification to the authenticated user
 */
const testNotification = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario.pushToken) {
      return res.status(400).json({ error: 'No hay token registrado. Abre la app primero.' });
    }

    const result = await sendGenericNotification({
      pushToken: usuario.pushToken,
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
