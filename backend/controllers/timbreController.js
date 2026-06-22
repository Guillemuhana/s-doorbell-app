// controllers/timbreController.js
const { v4: uuidv4 } = require('uuid');
const Timbre = require('../models/Timbre');
const Direccion = require('../models/Direccion');
const { generateQRDataURL } = require('../services/qrService');
const { getRol } = require('../utils/access');

// Helper: obtiene el timbre y el rol del usuario en su dirección
const loadTimbreConRol = async (usuarioId, timbreId) => {
  const timbre = await Timbre.findById(timbreId);
  if (!timbre) return { error: 404 };
  const rol = await getRol(usuarioId, timbre.direccion);
  if (!rol) return { error: 403 };
  return { timbre, rol };
};

/**
 * POST /api/direcciones/:id/timbres  (solo dueño)
 */
const crearTimbre = async (req, res, next) => {
  try {
    const direccionId = req.params.id;
    const rol = await getRol(req.usuario._id, direccionId);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede agregar timbres.' });

    const direccion = await Direccion.findById(direccionId);
    if (!direccion) return res.status(404).json({ error: 'Dirección no encontrada.' });

    const { nombre, tipo } = req.body;
    const timbre = await Timbre.create({
      direccion: direccionId,
      nombre: nombre || 'Puerta',
      tipo: tipo || 'Timbre particular',
    });

    const qr = await generateQRDataURL(timbre.qrId);
    if (qr.success) {
      timbre.qrImage = qr.dataURL;
      await timbre.save();
    }

    res.status(201).json({ success: true, timbre });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timbres/:id  (miembro)
 */
const getTimbre = async (req, res, next) => {
  try {
    const { timbre, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    res.json({ success: true, timbre });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timbres/:id/qr  (miembro)
 */
const getQR = async (req, res, next) => {
  try {
    const { timbre, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });

    if (!timbre.qrImage) {
      const qr = await generateQRDataURL(timbre.qrId);
      if (qr.success) {
        timbre.qrImage = qr.dataURL;
        await timbre.save();
      }
    }

    res.json({
      success: true,
      qrId: timbre.qrId,
      qrImage: timbre.qrImage,
      visitorUrl: `${process.env.VISITOR_BASE_URL}/${timbre.qrId}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/timbres/:id  (solo dueño)
 */
const updateTimbre = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede editar.' });

    ['nombre', 'tipo', 'activo'].forEach((f) => {
      if (req.body[f] !== undefined) timbre[f] = req.body[f];
    });
    await timbre.save();

    res.json({ success: true, timbre });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/timbres/:id  (solo dueño)
 */
const deleteTimbre = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede eliminar.' });

    await timbre.deleteOne();
    res.json({ success: true, message: 'Timbre eliminado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timbres/:id/regenerar-qr  (solo dueño)
 */
const regenerarQR = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede regenerar.' });

    const nuevoQrId = uuidv4();
    const qr = await generateQRDataURL(nuevoQrId);
    if (!qr.success) return res.status(500).json({ error: 'Error generando QR.' });

    timbre.qrId = nuevoQrId;
    timbre.qrImage = qr.dataURL;
    await timbre.save();

    res.json({
      success: true,
      qrId: timbre.qrId,
      qrImage: timbre.qrImage,
      visitorUrl: `${process.env.VISITOR_BASE_URL}/${timbre.qrId}`,
      timbre,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearTimbre,
  getTimbre,
  getQR,
  updateTimbre,
  deleteTimbre,
  regenerarQR,
};
