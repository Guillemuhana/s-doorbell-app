// middleware/auth.js
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const logger = require('../config/logger');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
      }
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    if (!usuario.isActive) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Error de autenticación.' });
  }
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { protect, generateToken };
