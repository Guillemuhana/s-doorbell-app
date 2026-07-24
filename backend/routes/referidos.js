// routes/referidos.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMiCodigo,
  getReferidoPublico,
  canjear,
  marcarAplicado,
} = require('../controllers/referidoController');

// Privadas (dueño del código)
router.get('/mi-codigo', protect, getMiCodigo);
router.patch('/mi-canje/aplicar', protect, marcarAplicado);

// Públicas (el amigo que canjea) — van al final para no pisar /mi-codigo.
router.get('/:code', getReferidoPublico);
router.post('/:code/canjear', canjear);

module.exports = router;
