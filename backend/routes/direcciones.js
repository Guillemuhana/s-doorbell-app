// routes/direcciones.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  listDirecciones,
  createDireccion,
  getDireccion,
  updateDireccion,
  deleteDireccion,
  uploadFotoDireccion,
  geocodificarDireccion,
} = require('../controllers/direccionController');
const { crearTimbre } = require('../controllers/timbreController');
const {
  listFamiliares,
  crearInvitacion,
  eliminarFamiliar,
} = require('../controllers/familiarController');
const {
  listBloqueos,
  crearBloqueo,
  eliminarBloqueo,
} = require('../controllers/bloqueoController');

router.use(protect); // Todas requieren auth

// Direcciones
router.get('/', listDirecciones);
router.post('/', createDireccion);
router.get('/:id', getDireccion);
router.put('/:id', updateDireccion);
router.delete('/:id', deleteDireccion);
router.post('/:id/foto', upload.single('foto'), uploadFotoDireccion);
router.post('/:id/geocodificar', geocodificarDireccion);

// Timbres de la dirección
router.post('/:id/timbres', crearTimbre);

// Familiares / invitaciones de la dirección
router.get('/:id/familiares', listFamiliares);
router.post('/:id/invitaciones', crearInvitacion);
router.delete('/:id/familiares/:membershipId', eliminarFamiliar);

// Bloqueo de visitantes de la dirección
router.get('/:id/bloqueos', listBloqueos);
router.post('/:id/bloqueos', crearBloqueo);
router.delete('/:id/bloqueos/:bloqueoId', eliminarBloqueo);

module.exports = router;
