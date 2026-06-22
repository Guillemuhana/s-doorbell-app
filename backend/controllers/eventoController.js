// controllers/eventoController.js
const Evento = require('../models/Evento');

/**
 * GET /api/eventos/historial/:userId
 */
const getHistorial = async (req, res, next) => {
  try {
    if (req.usuario._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const tipo = req.query.tipo || null;
    const skip = (page - 1) * limit;

    const filter = { userId: req.params.userId };
    if (tipo) filter.tipo = tipo;

    const [eventos, total] = await Promise.all([
      Evento.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Evento.countDocuments(filter),
    ]);

    res.json({
      success: true,
      eventos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/eventos/stats/:userId
 */
const getStats = async (req, res, next) => {
  try {
    if (req.usuario._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    const userId = req.params.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalTimbre, hoy, semana, ultimoTimbre] = await Promise.all([
      Evento.countDocuments({ userId, tipo: 'timbrazo' }),
      Evento.countDocuments({ userId, tipo: 'timbrazo', createdAt: { $gte: today } }),
      Evento.countDocuments({ userId, tipo: 'timbrazo', createdAt: { $gte: weekAgo } }),
      Evento.findOne({ userId, tipo: 'timbrazo' }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      success: true,
      stats: {
        totalTimbre,
        hoy,
        semana,
        ultimoTimbre: ultimoTimbre?.createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/eventos/:id
 */
const deleteEvento = async (req, res, next) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado.' });

    if (evento.userId.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({ error: 'Sin permiso.' });
    }

    await evento.deleteOne();
    res.json({ success: true, message: 'Evento eliminado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHistorial, getStats, deleteEvento };
