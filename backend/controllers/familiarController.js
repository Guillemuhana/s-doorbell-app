// controllers/familiarController.js
// Gestión de familiares/colaboradores e invitaciones por dirección.
const Membership = require('../models/Membership');
const Invitacion = require('../models/Invitacion');
const Direccion = require('../models/Direccion');
const Usuario = require('../models/Usuario');
const { getRol } = require('../utils/access');

/**
 * GET /api/direcciones/:id/familiares  (miembro)
 * Lista miembros activos + invitaciones pendientes.
 */
const listFamiliares = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'Sin acceso a esta dirección.' });

    const [memberships, invitaciones] = await Promise.all([
      Membership.find({ direccion: req.params.id, estado: 'activo' })
        .populate('usuario', 'nombre apellido email')
        .lean(),
      Invitacion.find({ direccion: req.params.id, estado: 'pendiente' }).lean(),
    ]);

    const familiares = memberships
      .filter((m) => m.usuario)
      .map((m) => ({
        membershipId: m._id,
        usuario: m.usuario,
        rol: m.rol,
        nombreCompleto: `${m.usuario.nombre} ${m.usuario.apellido}`,
      }));

    res.json({ success: true, familiares, invitacionesPendientes: invitaciones });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones/:id/invitaciones  (solo dueño)
 * body: { email, rol }
 */
const crearInvitacion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede invitar.' });

    const { email, rol: rolInvitado } = req.body;
    if (!email) return res.status(400).json({ error: 'El email del invitado es requerido.' });

    const emailNorm = email.toLowerCase().trim();

    // ¿Ya es miembro?
    const usuarioExistente = await Usuario.findOne({ email: emailNorm });
    if (usuarioExistente) {
      const yaMiembro = await Membership.findOne({
        usuario: usuarioExistente._id,
        direccion: req.params.id,
      });
      if (yaMiembro) {
        return res.status(400).json({ error: 'Esa persona ya es parte de la dirección.' });
      }
    }

    // ¿Ya hay invitación pendiente?
    const pendiente = await Invitacion.findOne({
      direccion: req.params.id,
      email: emailNorm,
      estado: 'pendiente',
    });
    if (pendiente) {
      return res.status(400).json({ error: 'Ya existe una invitación pendiente para ese email.' });
    }

    const invitacion = await Invitacion.create({
      direccion: req.params.id,
      invitadoPor: req.usuario._id,
      email: emailNorm,
      rol: rolInvitado === 'colaborador' ? 'colaborador' : 'familiar',
    });

    const inviteUrl = `${process.env.VISITOR_BASE_URL?.replace('/visit', '')}/invitacion/${invitacion.token}`;

    res.status(201).json({
      success: true,
      invitacion,
      inviteUrl,
      message: 'Invitación creada. Compartí el enlace con la persona.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitaciones/:token  (público)
 * Info de la invitación para mostrar antes de aceptar.
 */
const getInvitacion = async (req, res, next) => {
  try {
    const invitacion = await Invitacion.findOne({ token: req.params.token })
      .populate('direccion', 'nombre tipo direccion foto')
      .populate('invitadoPor', 'nombre apellido')
      .lean();

    if (!invitacion) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (invitacion.estado !== 'pendiente') {
      return res.status(410).json({ error: `La invitación ya fue ${invitacion.estado}.` });
    }
    if (invitacion.expiresAt && new Date(invitacion.expiresAt) < new Date()) {
      await Invitacion.findByIdAndUpdate(invitacion._id, { estado: 'expirada' });
      return res.status(410).json({ error: 'La invitación expiró.' });
    }

    res.json({ success: true, invitacion });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitaciones/:token/aceptar  (auth)
 * El usuario logueado se une a la dirección.
 */
const aceptarInvitacion = async (req, res, next) => {
  try {
    const invitacion = await Invitacion.findOne({ token: req.params.token });
    if (!invitacion) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (invitacion.estado !== 'pendiente') {
      return res.status(410).json({ error: `La invitación ya fue ${invitacion.estado}.` });
    }
    if (invitacion.expiresAt && new Date(invitacion.expiresAt) < new Date()) {
      invitacion.estado = 'expirada';
      await invitacion.save();
      return res.status(410).json({ error: 'La invitación expiró.' });
    }

    // Crear membership (idempotente gracias al índice único)
    const yaMiembro = await Membership.findOne({
      usuario: req.usuario._id,
      direccion: invitacion.direccion,
    });
    if (!yaMiembro) {
      await Membership.create({
        usuario: req.usuario._id,
        direccion: invitacion.direccion,
        rol: invitacion.rol,
      });
    }

    invitacion.estado = 'aceptada';
    await invitacion.save();

    res.json({ success: true, message: 'Te uniste a la dirección.', direccionId: invitacion.direccion });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitaciones/:token/rechazar
 */
const rechazarInvitacion = async (req, res, next) => {
  try {
    const invitacion = await Invitacion.findOne({ token: req.params.token });
    if (!invitacion) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (invitacion.estado === 'pendiente') {
      invitacion.estado = 'rechazada';
      await invitacion.save();
    }
    res.json({ success: true, message: 'Invitación rechazada.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/direcciones/:id/familiares/:membershipId  (solo dueño)
 * No se puede eliminar al dueño.
 */
const eliminarFamiliar = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede quitar familiares.' });

    const membership = await Membership.findById(req.params.membershipId);
    if (!membership || membership.direccion.toString() !== req.params.id) {
      return res.status(404).json({ error: 'Familiar no encontrado.' });
    }
    if (membership.rol === 'dueño') {
      return res.status(400).json({ error: 'No se puede quitar al dueño de la dirección.' });
    }

    await membership.deleteOne();
    res.json({ success: true, message: 'Familiar eliminado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFamiliares,
  crearInvitacion,
  getInvitacion,
  aceptarInvitacion,
  rechazarInvitacion,
  eliminarFamiliar,
};
