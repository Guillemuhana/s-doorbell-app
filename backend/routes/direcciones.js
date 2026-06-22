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
} = require('../controllers/direccionController');
const { crearTimbre } = require('../controllers/timbreController');
const {
  listFamiliares,
  crearInvitacion,
  eliminarFamiliar,
} = require('../controllers/familiarController');

router.use(protect); // Todas requieren auth

// Direcciones
router.get('/', listDirecciones);
router.post('/', createDireccion);
router.get('/:id', getDireccion);
router.put('/:id', updateDireccion);
router.delete('/:id', deleteDireccion);
router.post('/:id/foto', upload.single('foto'), uploadFotoDireccion);

// Timbres de la dirección
router.post('/:id/timbres', crearTimbre);

// Familiares / invitaciones de la dirección
router.get('/:id/familiares', listFamiliares);
router.post('/:id/invitaciones', crearInvitacion);
router.delete('/:id/familiares/:membershipId', eliminarFamiliar);

module.exports = router;
