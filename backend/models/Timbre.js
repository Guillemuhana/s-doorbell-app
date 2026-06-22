// models/Timbre.js
// Un timbre pertenece a una Direccion. El QR vive acá (antes vivía en Usuario).
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TimbreSchema = new mongoose.Schema(
  {
    direccion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Direccion',
      required: true,
      index: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del timbre es requerido'],
      trim: true,
      maxlength: [60, 'El nombre no puede superar 60 caracteres'],
      default: 'Puerta',
    },
    tipo: {
      type: String,
      enum: ['Timbre particular', 'Portón', 'Entrada', 'Oficina', 'Otro'],
      default: 'Timbre particular',
    },
    qrId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    qrImage: {
      type: String,
      default: null, // Base64 data URL del QR
    },
    activo: {
      type: Boolean,
      default: true,
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

// qrId (unique) y direccion (index: true) ya generan sus índices.

module.exports = mongoose.model('Timbre', TimbreSchema);
