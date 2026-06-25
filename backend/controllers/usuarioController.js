// controllers/usuarioController.js
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/supabase');
const { mapUsuario } = require('../db/mappers');
const { uploadImagen, borrarImagen } = require('../services/storageService');

const checkOwnership = (req, res, userId) => {
  if (req.usuario._id !== userId) {
    res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    return false;
  }
  return true;
};

/**
 * GET /api/usuarios/:id
 */
const getUsuario = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;
    const sb = getSupabase();
    const { data } = await sb.from('usuarios').select('*').eq('id', req.params.id).maybeSingle();
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ success: true, usuario: mapUsuario(data) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/usuarios/:id
 */
const updateUsuario = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;

    const updates = { updated_at: new Date().toISOString() };
    ['nombre', 'apellido', 'telefono'].forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    // Email (normalizado). Se valida unicidad más abajo vía constraint.
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
      }
      updates.email = email;
    }
    // Cambio de contraseña (limpia el flag de provisoria)
    if (req.body.password && req.body.password.length >= 6) {
      updates.password = await bcrypt.hash(req.body.password, 12);
      updates.forzar_cambio_password = false;
    }

    const sb = getSupabase();
    const { data, error } = await sb.from('usuarios').update(updates).eq('id', req.params.id).select().single();
    if (error) {
      // 23505 = violación de unique (email ya registrado)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ese email ya está registrado.' });
      }
      throw error;
    }
    res.json({ success: true, usuario: mapUsuario(data) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios/:id/foto-fachada
 */
const uploadFotoFachada = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen.' });

    const sb = getSupabase();
    const { data: usuario } = await sb.from('usuarios').select('foto_fachada').eq('id', req.params.id).maybeSingle();
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const fileUrl = await uploadImagen(req.file.buffer, req.file.mimetype);
    if (usuario.foto_fachada) await borrarImagen(usuario.foto_fachada);
    const { data } = await sb.from('usuarios').update({ foto_fachada: fileUrl }).eq('id', req.params.id).select().single();
    res.json({ success: true, foto_fachada: fileUrl, usuario: mapUsuario(data) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/usuarios/:id/push-token
 */
const guardarPushToken = async (req, res, next) => {
  try {
    if (!checkOwnership(req, res, req.params.id)) return;
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'pushToken es requerido.' });

    const sb = getSupabase();
    await sb.from('usuarios').update({ push_token: pushToken, push_token_updated_at: new Date().toISOString() }).eq('id', req.params.id);
    res.json({ success: true, message: 'Token guardado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsuario, updateUsuario, uploadFotoFachada, guardarPushToken };
