// middleware/auth.js
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../config/supabase');
const { mapUsuario } = require('../db/mappers');
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

    const sb = getSupabase();
    const { data: row, error } = await sb
      .from('usuarios')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !row) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }
    if (!row.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada.' });
    }

    req.usuario = mapUsuario(row); // tiene _id
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
