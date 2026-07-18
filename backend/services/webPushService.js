// services/webPushService.js
// Envío de notificaciones por Web Push (PWA). Convive con el FCM legacy: la
// suscripción del navegador se guarda en la MISMA columna usuarios.push_token,
// como JSON. El discriminador es simple: si el push_token parsea a un objeto con
// `.endpoint`, es una suscripción Web Push; si no, es un token FCM viejo.
const webpush = require('web-push');
const logger = require('../config/logger');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// El "subject" debe ser un mailto: o una URL; identifica a quién contactar si un
// push server tiene problemas con nuestros envíos.
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@s-doorbell.app';

let configurado = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configurado = true;
} else {
  logger.warn('Web Push sin configurar: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
}

const isWebPushSubscription = (pushToken) => {
  if (!pushToken || typeof pushToken !== 'string') return false;
  const t = pushToken.trim();
  if (t[0] !== '{') return false;
  try {
    const o = JSON.parse(t);
    return !!(o && o.endpoint);
  } catch {
    return false;
  }
};

/**
 * Envía un push a una suscripción (guardada como JSON en push_token).
 * Devuelve { success, gone } — gone=true si la suscripción expiró/no existe
 * (404/410), para que el caller la borre.
 */
const sendWebPush = async (pushTokenJson, { title, body, data }) => {
  if (!configurado) return { success: false, error: 'VAPID no configurado' };
  let subscription;
  try {
    subscription = JSON.parse(pushTokenJson);
  } catch {
    return { success: false, error: 'Suscripción inválida' };
  }

  const payload = JSON.stringify({
    title: title || '🔔 ¡Timbre!',
    body: body || 'Alguien está en tu puerta',
    data: data || {},
  });

  try {
    await webpush.sendNotification(subscription, payload, { TTL: 60, urgency: 'high' });
    return { success: true };
  } catch (err) {
    const code = err && err.statusCode;
    if (code === 404 || code === 410) {
      // Suscripción muerta: el caller debe limpiarla.
      return { success: false, gone: true };
    }
    logger.warn('Web Push error: ' + (err && err.message));
    return { success: false, error: err && err.message };
  }
};

module.exports = { sendWebPush, isWebPushSubscription, vapidPublicKey: PUBLIC_KEY, webPushConfigurado: configurado };
