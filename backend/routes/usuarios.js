// routes/usuarios.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getUsuario,
  updateUsuario,
  uploadFotoFachada,
  guardarPushToken,
  getQR,
  regenerarQR,
} = require('../controllers/usuarioController');

router.use(protect); // All routes require auth

router.get('/:id', getUsuario);
router.put('/:id', updateUsuario);
router.post('/:id/foto-fachada', upload.single('foto_fachada'), uploadFotoFachada);
router.post('/:id/push-token', guardarPushToken);
router.get('/:id/qr', getQR);
router.post('/:id/regenerar-qr', regenerarQR);

module.exports = router;
