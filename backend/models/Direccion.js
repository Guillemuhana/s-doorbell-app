// models/Direccion.js
const mongoose = require('mongoose');

const DireccionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre de la dirección es requerido'],
      trim: true,
      maxlength: [80, 'El nombre no puede superar 80 caracteres'],
    },
    tipo: {
      type: String,
      enum: ['Casa', 'Departamento', 'Oficina', 'Local', 'Otro'],
      default: 'Casa',
    },
    direccion: {
      type: String,
      trim: true,
      default: '',
    },
    foto: {
      type: String,
      default: null, // URL of the facade photo
    },
    // Ubicación de la puerta/casa (para verificar al visitante en modo geo)
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    activa: {
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

DireccionSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Direccion', DireccionSchema);
