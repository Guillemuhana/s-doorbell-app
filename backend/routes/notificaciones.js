// routes/notificaciones.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { guardarToken, testNotification } = require('../controllers/notificacionController');

router.use(protect);
router.post('/guardar-token', guardarToken);
router.post('/test', testNotification);

module.exports = router;
