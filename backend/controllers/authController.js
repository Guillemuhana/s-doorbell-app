// controllers/authController.js
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/supabase');
const { mapUsuario } = require('../db/mappers');
const { generateToken } = require('../middleware/auth');
const { generateQRDataURL } = require('../services/qrService');
const { initializeFirebase } = require('../config/firebase');
const logger = require('../config/logger');

try { initializeFirebase(); } catch (e) { logger.warn('Firebase not initialized:', e.message); }

const publicUsuario = (u) => ({
  _id: u._id, nombre: u.nombre, apellido: u.apellido, email: u.email,
  telefono: u.telefono, foto_fachada: u.foto_fachada, pushToken: u.pushToken,
  forzarCambioPassword: u.forzarCambioPassword,
});

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }
    const sb = getSupabase();
    const { data: row } = await sb
      .from('usuarios').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();

    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    if (!row.is_active) return res.status(403).json({ error: 'Cuenta desactivada.' });

    await sb.from('usuarios').update({ last_login: new Date().toISOString() }).eq('id', row.id);
    await sb.from('eventos').insert({
      user_id: row.id, tipo: 'login', visitor_ip: req.ip, user_agent: req.headers['user-agent'],
    });

    const usuario = mapUsuario(row);
    res.json({ success: true, token: generateToken(row.id), usuario: publicUsuario(usuario) });
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
    const sb = getSupabase();
    const emailNorm = email.toLowerCase().trim();

    const { data: existente } = await sb.from('usuarios').select('id').eq('email', emailNorm).maybeSingle();
    if (existente) return res.status(400).json({ error: 'El email ya está registrado.' });

    const hash = await bcrypt.hash(password, 12);
    const { data: u, error: uErr } = await sb.from('usuarios')
      .insert({ nombre, apellido, email: emailNorm, password: hash, telefono: telefono || '' })
      .select().single();
    if (uErr) throw uErr;

    // Dirección + membership (dueño) + timbre con QR
    const { data: dir } = await sb.from('direcciones')
      .insert({ owner_id: u.id, nombre: direccion?.trim() || 'Mi casa', tipo: 'Casa', direccion: direccion?.trim() || '' })
      .select().single();
    await sb.from('memberships').insert({ usuario_id: u.id, direccion_id: dir.id, rol: 'dueño' });
    const { data: timbre } = await sb.from('timbres')
      .insert({ direccion_id: dir.id, nombre: 'Puerta', tipo: 'Timbre particular' })
      .select().single();
    const qr = await generateQRDataURL(timbre.qr_id);
    if (qr.success) await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);

    const usuario = mapUsuario(u);
    res.status(201).json({ success: true, token: generateToken(u.id), usuario: publicUsuario(usuario) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res) => {
  res.json({ success: true, usuario: publicUsuario(req.usuario) });
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  res.json({ success: true, token: generateToken(req.usuario._id) });
};

module.exports = { login, register, me, refreshToken };
