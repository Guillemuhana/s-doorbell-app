// controllers/pushController.js
// Suscripción a Web Push (PWA). La suscripción del navegador se guarda como JSON
// en usuarios.push_token (reutilizamos esa columna; ver webPushService).
const { getSupabase } = require('../config/supabase');
const { vapidPublicKey } = require('../services/webPushService');
const logger = require('../config/logger');

// GET /api/push/vapid-public-key — la app la necesita para suscribirse.
const getVapidKey = (req, res) => {
  if (!vapidPublicKey) return res.status(503).json({ error: 'Web Push no configurado en el servidor.' });
  res.json({ publicKey: vapidPublicKey });
};

// POST /api/push/subscribe  { subscription }  (autenticado)
const subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida.' });
    }
    const sb = getSupabase();
    await sb.from('usuarios').update({
      push_token: JSON.stringify(subscription),
      push_token_updated_at: new Date().toISOString(),
    }).eq('id', req.usuario._id);
    logger.info(`Web Push suscripto: usuario ${req.usuario._id}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// POST /api/push/unsubscribe (autenticado)
const unsubscribe = async (req, res, next) => {
  try {
    const sb = getSupabase();
    await sb.from('usuarios').update({ push_token: null, push_token_updated_at: new Date().toISOString() })
      .eq('id', req.usuario._id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVapidKey, subscribe, unsubscribe };
