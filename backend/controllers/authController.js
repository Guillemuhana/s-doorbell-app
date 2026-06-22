// controllers/authController.js
const Usuario = require('../models/Usuario');
const Evento = require('../models/Evento');
const Direccion = require('../models/Direccion');
const Membership = require('../models/Membership');
const Timbre = require('../models/Timbre');
const { generateToken } = require('../middleware/auth');
const { generateQRDataURL } = require('../services/qrService');
const { initializeFirebase } = require('../config/firebase');
const logger = require('../config/logger');

// Initialize Firebase on startup
try { initializeFirebase(); } catch (e) { logger.warn('Firebase not initialized:', e.message); }

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    // Include password in query (select: false in schema)
    const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!usuario || !(await usuario.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    if (!usuario.isActive) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    // Update last login
    usuario.lastLogin = new Date();
    await usuario.save({ validateBeforeSave: false });

    // Log event
    await Evento.create({
      userId: usuario._id,
      tipo: 'login',
      visitorIP: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = generateToken(usuario._id);

    res.json({
      success: true,
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        foto_fachada: usuario.foto_fachada,
        qrId: usuario.qrId,
        qrImage: usuario.qrImage,
        pushToken: usuario.pushToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, telefono, direccion } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ error: 'Nombre, apellido, email y contraseña son requeridos.' });
    }

    const existente = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (existente) {
      return res.status(400).json({ error: 'El email ya está registrado.' });
    }

    const usuario = new Usuario({ nombre, apellido, email, password, telefono, direccion });
    await usuario.save();

    // Crear la primera dirección + membership (dueño) + timbre por defecto
    const nuevaDireccion = await Direccion.create({
      owner: usuario._id,
      nombre: direccion?.trim() || 'Mi casa',
      tipo: 'Casa',
      direccion: direccion?.trim() || '',
    });
    await Membership.create({
      usuario: usuario._id,
      direccion: nuevaDireccion._id,
      rol: 'dueño',
    });
    const timbre = await Timbre.create({
      direccion: nuevaDireccion._id,
      nombre: 'Puerta',
      tipo: 'Timbre particular',
    });
    const qrResult = await generateQRDataURL(timbre.qrId);
    if (qrResult.success) {
      timbre.qrImage = qrResult.dataURL;
      await timbre.save();
    }

    const token = generateToken(usuario._id);

    res.status(201).json({
      success: true,
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        direccion: usuario.direccion,
        foto_fachada: usuario.foto_fachada,
        qrId: usuario.qrId,
        qrImage: usuario.qrImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ success: true, usuario });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  const token = generateToken(req.usuario._id);
  res.json({ success: true, token });
};

module.exports = { login, register, me, refreshToken };
