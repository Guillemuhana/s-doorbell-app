// models/Evento.js
const mongoose = require('mongoose');

const EventoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    direccionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Direccion',
      default: null,
      index: true,
    },
    timbreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timbre',
      default: null,
      index: true,
    },
    tipo: {
      type: String,
      enum: ['timbrazo', 'vista_qr', 'login', 'logout'],
      default: 'timbrazo',
      required: true,
    },
    visitorIP: {
      type: String,
      default: 'unknown',
    },
    visitorName: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationError: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
EventoSchema.index({ userId: 1, createdAt: -1 });
EventoSchema.index({ tipo: 1 });
EventoSchema.index({ createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────
EventoSchema.statics.getHistorialUsuario = function (userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

EventoSchema.statics.contarTimbrazosDia = function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.countDocuments({
    userId,
    tipo: 'timbrazo',
    createdAt: { $gte: today },
  });
};

module.exports = mongoose.model('Evento', EventoSchema);
