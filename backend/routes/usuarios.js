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
} = require('../controllers/usuarioController');

router.use(protect);

router.get('/:id', getUsuario);
router.put('/:id', updateUsuario);
router.post('/:id/foto-fachada', upload.single('foto_fachada'), uploadFotoFachada);
router.post('/:id/push-token', guardarPushToken);

module.exports = router;
