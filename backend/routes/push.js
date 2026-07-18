// routes/push.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getVapidKey, subscribe, unsubscribe } = require('../controllers/pushController');

// La llave pública se puede pedir sin login (es pública por definición).
router.get('/vapid-public-key', getVapidKey);

router.use(protect);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

module.exports = router;
