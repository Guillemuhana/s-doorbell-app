// controllers/direccionController.js
const path = require('path');
const fs = require('fs');
const Direccion = require('../models/Direccion');
const Membership = require('../models/Membership');
const Timbre = require('../models/Timbre');
const Invitacion = require('../models/Invitacion');
const { generateQRDataURL } = require('../services/qrService');
const { getRol } = require('../utils/access');
const logger = require('../config/logger');

/**
 * GET /api/direcciones
 * Lista las direcciones del usuario (a través de sus memberships).
 */
const listDirecciones = async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      usuario: req.usuario._id,
      estado: 'activo',
    })
      .populate('direccion')
      .sort({ createdAt: -1 })
      .lean();

    // Filtrar memberships cuya dirección fue borrada
    const validos = memberships.filter((m) => m.direccion);

    const direcciones = await Promise.all(
      validos.map(async (m) => {
        const [timbresCount, familiaresCount] = await Promise.all([
          Timbre.countDocuments({ direccion: m.direccion._id }),
          Membership.countDocuments({ direccion: m.direccion._id, estado: 'activo' }),
        ]);
        return {
          ...m.direccion,
          rol: m.rol,
          timbresCount,
          familiaresCount,
        };
      })
    );

    res.json({ success: true, direcciones });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones
 * Crea una dirección, hace al usuario dueño y genera un timbre por defecto.
 */
const createDireccion = async (req, res, next) => {
  try {
    const { nombre, tipo, direccion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la dirección es requerido.' });
    }

    const nuevaDireccion = await Direccion.create({
      owner: req.usuario._id,
      nombre,
      tipo: tipo || 'Casa',
      direccion: direccion || '',
    });

    await Membership.create({
      usuario: req.usuario._id,
      direccion: nuevaDireccion._id,
      rol: 'dueño',
    });

    // Timbre por defecto "Puerta" con su QR
    const timbre = await Timbre.create({
      direccion: nuevaDireccion._id,
      nombre: 'Puerta',
      tipo: 'Timbre particular',
    });
    const qr = await generateQRDataURL(timbre.qrId);
    if (qr.success) {
      timbre.qrImage = qr.dataURL;
      await timbre.save();
    }

    res.status(201).json({
      success: true,
      direccion: { ...nuevaDireccion.toJSON(), rol: 'dueño', timbresCount: 1, familiaresCount: 1 },
      timbre,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/direcciones/:id
 * Detalle de la unidad: dirección + timbres + familiares.
 */
const getDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'No tienes acceso a esta dirección.' });

    const direccion = await Direccion.findById(req.params.id);
    if (!direccion) return res.status(404).json({ error: 'Dirección no encontrada.' });

    const [timbres, memberships, invitaciones] = await Promise.all([
      Timbre.find({ direccion: direccion._id }).sort({ createdAt: 1 }).lean(),
      Membership.find({ direccion: direccion._id, estado: 'activo' })
        .populate('usuario', 'nombre apellido email foto_fachada')
        .lean(),
      Invitacion.find({ direccion: direccion._id, estado: 'pendiente' }).lean(),
    ]);

    const familiares = memberships
      .filter((m) => m.usuario)
      .map((m) => ({
        membershipId: m._id,
        usuario: m.usuario,
        rol: m.rol,
        nombreCompleto: `${m.usuario.nombre} ${m.usuario.apellido}`,
      }));

    res.json({
      success: true,
      rol,
      direccion,
      timbres,
      familiares,
      invitacionesPendientes: invitaciones,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/direcciones/:id  (solo dueño)
 */
const updateDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede editar.' });

    const allowed = ['nombre', 'tipo', 'direccion', 'activa'];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const direccion = await Direccion.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!direccion) return res.status(404).json({ error: 'Dirección no encontrada.' });

    res.json({ success: true, direccion });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/direcciones/:id  (solo dueño) — borra en cascada.
 */
const deleteDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede eliminar.' });

    await Promise.all([
      Timbre.deleteMany({ direccion: req.params.id }),
      Membership.deleteMany({ direccion: req.params.id }),
      Invitacion.deleteMany({ direccion: req.params.id }),
      Direccion.findByIdAndDelete(req.params.id),
    ]);

    res.json({ success: true, message: 'Dirección eliminada.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones/:id/foto  (solo dueño)
 */
const uploadFotoDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede cambiar la foto.' });

    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen.' });

    const direccion = await Direccion.findById(req.params.id);
    if (!direccion) return res.status(404).json({ error: 'Dirección no encontrada.' });

    if (direccion.foto) {
      const oldPath = path.join(__dirname, '../uploads', path.basename(direccion.foto));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const fileUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
    direccion.foto = fileUrl;
    await direccion.save();

    res.json({ success: true, foto: fileUrl, direccion });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDirecciones,
  createDireccion,
  getDireccion,
  updateDireccion,
  deleteDireccion,
  uploadFotoDireccion,
};
