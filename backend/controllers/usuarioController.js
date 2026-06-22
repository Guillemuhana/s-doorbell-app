// controllers/usuarioController.js
const path = require('path');
const fs = require('fs');
const Usuario = require('../models/Usuario');
const { generateQRDataURL } = require('../services/qrService');
const logger = require('../config/logger');

// Helper: ensure user can only access their own data
const checkOwnership = (req, res, userId) => {
  if (req.usuario._id.toString() !== userId.toString()) {
    res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    return false;
  }
  return true;
};

/**
 * GET /api/usuarios/:id
 */
const getUsuario = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    res.json({ success: true, usuario });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/usuarios/:id
 */
const updateUsuario = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const allowedFields = ['nombre', 'apellido', 'telefono', 'direccion'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Password change
    if (req.body.password && req.body.password.length >= 6) {
      const usuario = await Usuario.findById(req.params.id).select('+password');
      usuario.password = req.body.password;
      Object.assign(usuario, updates);
      await usuario.save();
      return res.json({ success: true, usuario });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    res.json({ success: true, usuario });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios/:id/foto-fachada
 */
const uploadFotoFachada = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó imagen.' });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // Delete old photo if exists
    if (usuario.foto_fachada) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(usuario.foto_fachada));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const fileUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
    usuario.foto_fachada = fileUrl;
    await usuario.save({ validateBeforeSave: false });

    res.json({ success: true, foto_fachada: fileUrl, usuario });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios/:id/push-token
 */
const guardarPushToken = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken es requerido.' });
    }

    await Usuario.findByIdAndUpdate(req.params.id, {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    });

    res.json({ success: true, message: 'Token guardado correctamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/usuarios/:id/qr
 */
const getQR = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!usuario.qrImage) {
      const result = await generateQRDataURL(usuario.qrId);
      if (result.success) {
        usuario.qrImage = result.dataURL;
        await usuario.save({ validateBeforeSave: false });
      }
    }

    const visitorUrl = `${process.env.VISITOR_BASE_URL}/${usuario.qrId}`;

    res.json({
      success: true,
      qrId: usuario.qrId,
      qrImage: usuario.qrImage,
      visitorUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios/:id/regenerar-qr
 */
const regenerarQR = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const { v4: uuidv4 } = require('uuid');
    const nuevoQrId = uuidv4();

    const result = await generateQRDataURL(nuevoQrId);
    if (!result.success) {
      return res.status(500).json({ error: 'Error generando QR.' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { qrId: nuevoQrId, qrImage: result.dataURL },
      { new: true }
    );

    res.json({
      success: true,
      qrId: nuevoQrId,
      qrImage: result.dataURL,
      visitorUrl: `${process.env.VISITOR_BASE_URL}/${nuevoQrId}`,
      usuario,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsuario,
  updateUsuario,
  uploadFotoFachada,
  guardarPushToken,
  getQR,
  regenerarQR,
};
