// models/Invitacion.js
// Invitación a un familiar/colaborador para unirse a una Direccion.
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const InvitacionSchema = new mongoose.Schema(
  {
    direccion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Direccion',
      required: true,
      index: true,
    },
    invitadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    email: {
      type: String,
      required: [true, 'El email del invitado es requerido'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    rol: {
      type: String,
      enum: ['familiar', 'colaborador'],
      default: 'familiar',
    },
    token: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    estado: {
      type: String,
      enum: ['pendiente', 'aceptada', 'rechazada', 'expirada'],
      default: 'pendiente',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
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

// token (unique) y direccion (index: true) ya generan sus índices.
InvitacionSchema.index({ direccion: 1, estado: 1 });
InvitacionSchema.index({ email: 1, estado: 1 });

module.exports = mongoose.model('Invitacion', InvitacionSchema);
