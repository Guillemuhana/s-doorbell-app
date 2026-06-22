// services/pushNotificationService.js
const { getMessaging } = require('../config/firebase');
const logger = require('../config/logger');

/**
 * Envía push notification de timbrazo al dueño de casa
 */
const sendRingNotification = async ({ pushToken, ownerName, visitorName, address }) => {
  if (!pushToken) {
    logger.warn('No pushToken available for notification');
    return { success: false, error: 'No hay token de notificación registrado' };
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateStr = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const visitorLabel = visitorName || 'Alguien';
  const title = '🔔 ¡Timbre!';
  const body = `${visitorLabel} está en tu puerta • ${timeStr} hs`;

  const message = {
    token: pushToken,
    notification: {
      title,
      body,
    },
    data: {
      type: 'DOORBELL_RING',
      visitorName: visitorName || '',
      address: address || '',
      date: dateStr,
      time: timeStr,
      timestamp: now.toISOString(),
    },
    android: {
      notification: {
        channelId: 'doorbell',
        priority: 'high',
        sound: 'doorbell',
        icon: 'ic_notification',
        color: '#007AFF',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: 'doorbell.caf',
          badge: 1,
          'content-available': 1,
          'mutable-content': 1,
        },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
    },
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.send(message);
    logger.info(`Push notification sent: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('Push notification error:', error);

    // Handle invalid token
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      return { success: false, error: 'Token inválido o expirado', tokenInvalid: true };
    }

    return { success: false, error: error.message };
  }
};

/**
 * Envía push notification genérica
 */
const sendGenericNotification = async ({ pushToken, title, body, data = {} }) => {
  if (!pushToken) return { success: false, error: 'No pushToken' };

  const message = {
    token: pushToken,
    notification: { title, body },
    data: { ...data, timestamp: new Date().toISOString() },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  };

  try {
    const messaging = getMessaging();
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('Generic notification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendRingNotification, sendGenericNotification };
