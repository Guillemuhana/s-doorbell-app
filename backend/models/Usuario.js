// models/Usuario.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
      maxlength: [50, 'El apellido no puede superar 50 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'Mínimo 6 caracteres'],
      select: false, // Never return password in queries
    },
    telefono: {
      type: String,
      trim: true,
      default: '',
    },
    direccion: {
      type: String,
      trim: true,
      default: '',
    },
    foto_fachada: {
      type: String,
      default: null, // URL or file path
    },
    qrId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    qrImage: {
      type: String,
      default: null, // Base64 data URL of QR
    },
    pushToken: {
      type: String,
      default: null,
    },
    pushTokenUpdatedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// email y qrId ya tienen índice por `unique: true`.

// ─── Pre-save: Hash Password ──────────────────────────────────────────────────
UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
UsuarioSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UsuarioSchema.methods.getFullName = function () {
  return `${this.nombre} ${this.apellido}`;
};

UsuarioSchema.methods.getPublicProfile = function () {
  return {
    nombre: this.nombre,
    apellido: this.apellido,
    direccion: this.direccion,
    foto_fachada: this.foto_fachada,
  };
};

module.exports = mongoose.model('Usuario', UsuarioSchema);
