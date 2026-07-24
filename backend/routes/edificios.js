// routes/edificios.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listEdificios,
  createEdificio,
  getEdificio,
  updateEdificio,
  deleteEdificio,
  addUnidad,
  removeUnidad,
  historialEdificio,
  bulkCrearUsuarios,
  bulkCrearUnidades,
} = require('../controllers/edificioController');

router.use(protect); // Todas requieren auth

router.get('/', listEdificios);
router.post('/', createEdificio);
router.get('/:id', getEdificio);
router.put('/:id', updateEdificio);
router.delete('/:id', deleteEdificio);

// Unidades del edificio
router.post('/:id/unidades', addUnidad);
router.post('/:id/unidades-bulk', bulkCrearUnidades);
router.delete('/:id/unidades/:unidadId', removeUnidad);

// Alta masiva de usuarios sobre el timbre de una unidad
router.post('/:id/unidades/:unidadId/usuarios-bulk', bulkCrearUsuarios);

// Historial global del edificio
router.get('/:id/historial', historialEdificio);

module.exports = router;
