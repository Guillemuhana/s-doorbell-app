// routes/eventos.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getHistorial, getStats, deleteEvento } = require('../controllers/eventoController');

router.use(protect);

router.get('/historial/:userId', getHistorial);
router.get('/stats/:userId', getStats);
router.delete('/:id', deleteEvento);

module.exports = router;
