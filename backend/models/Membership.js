// models/Membership.js
// Vincula un Usuario con una Direccion y define su rol dentro de esa unidad.
const mongoose = require('mongoose');

const MembershipSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    direccion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Direccion',
      required: true,
      index: true,
    },
    rol: {
      type: String,
      enum: ['dueño', 'familiar', 'colaborador'],
      default: 'familiar',
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
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

// Un usuario no puede estar dos veces en la misma dirección
MembershipSchema.index({ usuario: 1, direccion: 1 }, { unique: true });

module.exports = mongoose.model('Membership', MembershipSchema);
