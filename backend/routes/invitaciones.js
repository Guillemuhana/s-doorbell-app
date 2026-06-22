// routes/invitaciones.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getInvitacion,
  aceptarInvitacion,
  rechazarInvitacion,
} = require('../controllers/familiarController');

// Pública: ver info de la invitación
router.get('/:token', getInvitacion);
router.post('/:token/rechazar', rechazarInvitacion);

// Aceptar requiere estar logueado (se une con la cuenta actual)
router.post('/:token/aceptar', protect, aceptarInvitacion);

module.exports = router;
