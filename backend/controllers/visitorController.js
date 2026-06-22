// controllers/visitorController.js
const Timbre = require('../models/Timbre');
const Direccion = require('../models/Direccion');
const Membership = require('../models/Membership');
const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const { sendRingNotification } = require('../services/pushNotificationService');
const logger = require('../config/logger');

/**
 * Resuelve un qrId a su timbre + dirección + dueño.
 * Devuelve null si no existe.
 */
const resolverTimbre = async (qrId) => {
  const timbre = await Timbre.findOne({ qrId, activo: true });
  if (!timbre) return null;
  const direccion = await Direccion.findById(timbre.direccion);
  if (!direccion || !direccion.activa) return null;
  return { timbre, direccion };
};

/**
 * GET /api/visitor/:qrId
 * Info pública de la casa para la web del visitante.
 */
const getVisitorInfo = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const resuelto = await resolverTimbre(qrId);
    if (!resuelto) return res.status(404).json({ error: 'QR no válido o no encontrado.' });

    const { timbre, direccion } = resuelto;
    const owner = await Usuario.findById(direccion.owner).select('nombre apellido');

    // Log de escaneo
    await Evento.create({
      userId: direccion.owner,
      direccionId: direccion._id,
      timbreId: timbre._id,
      tipo: 'vista_qr',
      visitorIP: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      casa: {
        nombreCompleto: owner ? `${owner.nombre} ${owner.apellido}` : direccion.nombre,
        direccion: direccion.direccion || direccion.nombre || 'Dirección privada',
        foto_fachada: direccion.foto,
        timbre: timbre.nombre,
        qrId: timbre.qrId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/visitor/:qrId/ring
 * Toca el timbre: notifica a todos los miembros de la dirección.
 */
const ringDoorbell = async (req, res, next) => {
  try {
    const { qrId } = req.params;
    const { visitorName } = req.body;

    const resuelto = await resolverTimbre(qrId);
    if (!resuelto) return res.status(404).json({ error: 'QR no válido.' });

    const { timbre, direccion } = resuelto;

    const visitorIP =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip;

    // Todos los miembros activos con pushToken
    const memberships = await Membership.find({ direccion: direccion._id, estado: 'activo' })
      .populate('usuario', 'nombre apellido pushToken')
      .lean();

    let enviados = 0;
    await Promise.all(
      memberships
        .filter((m) => m.usuario && m.usuario.pushToken)
        .map(async (m) => {
          const result = await sendRingNotification({
            pushToken: m.usuario.pushToken,
            ownerName: `${m.usuario.nombre} ${m.usuario.apellido}`,
            visitorName: visitorName?.trim() || null,
            address: `${direccion.nombre} · ${timbre.nombre}`,
          });
          if (result.success) enviados += 1;
          if (result.tokenInvalid) {
            await Usuario.findByIdAndUpdate(m.usuario._id, { pushToken: null });
            logger.warn(`Cleared invalid pushToken for user ${m.usuario._id}`);
          }
        })
    );

    await Evento.create({
      userId: direccion.owner,
      direccionId: direccion._id,
      timbreId: timbre._id,
      tipo: 'timbrazo',
      visitorIP,
      visitorName: visitorName?.trim() || null,
      userAgent: req.headers['user-agent'],
      notificationSent: enviados > 0,
      notificationError: enviados > 0 ? null : 'Sin destinatarios con token',
    });

    res.json({
      success: true,
      message: 'Timbre enviado.',
      notificados: enviados,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVisitorInfo, ringDoorbell };
