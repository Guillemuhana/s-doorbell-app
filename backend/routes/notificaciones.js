// routes/notificaciones.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { guardarToken, testNotification, testLlamada } = require('../controllers/notificacionController');

router.use(protect);
router.post('/guardar-token', guardarToken);
router.post('/test', testNotification);
router.post('/test-llamada', testLlamada);

module.exports = router;
