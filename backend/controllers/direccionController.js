// controllers/direccionController.js
const { getSupabase } = require('../config/supabase');
const { mapDireccion, mapTimbre } = require('../db/mappers');
const { generateQRDataURL } = require('../services/qrService');
const { uploadImagen, borrarImagen } = require('../services/storageService');
const { getRol } = require('../utils/access');

/**
 * GET /api/direcciones — direcciones del usuario (vía memberships).
 */
const listDirecciones = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: ms, error } = await sb
      .from('memberships')
      .select('rol, direccion:direcciones(*)')
      .eq('usuario_id', req.usuario._id)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const validos = (ms || []).filter((m) => m.direccion);
    const direcciones = await Promise.all(validos.map(async (m) => {
      const [{ count: timbresCount }, { count: familiaresCount }] = await Promise.all([
        sb.from('timbres').select('id', { count: 'exact', head: true }).eq('direccion_id', m.direccion.id),
        sb.from('memberships').select('id', { count: 'exact', head: true }).eq('direccion_id', m.direccion.id).eq('estado', 'activo'),
      ]);
      return mapDireccion(m.direccion, { rol: m.rol, timbresCount: timbresCount || 0, familiaresCount: familiaresCount || 0 });
    }));

    res.json({ success: true, direcciones });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones — crea dirección + membership(dueño) + timbre por defecto.
 */
const createDireccion = async (req, res, next) => {
  try {
    const { nombre, tipo, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre de la dirección es requerido.' });

    const sb = getSupabase();
    const { data: dir, error } = await sb.from('direcciones')
      .insert({ owner_id: req.usuario._id, nombre, tipo: tipo || 'Casa', direccion: direccion || '' })
      .select().single();
    if (error) throw error;

    await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: dir.id, rol: 'dueño' });
    const { data: timbre } = await sb.from('timbres')
      .insert({ direccion_id: dir.id, nombre: 'Puerta', tipo: 'Timbre particular' }).select().single();
    const qr = await generateQRDataURL(timbre.qr_id);
    if (qr.success) await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);

    res.status(201).json({
      success: true,
      direccion: mapDireccion(dir, { rol: 'dueño', timbresCount: 1, familiaresCount: 1 }),
      timbre: mapTimbre(timbre),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/direcciones/:id — detalle (dirección + timbres + familiares).
 */
const getDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'No tienes acceso a esta dirección.' });

    const sb = getSupabase();
    const { data: dir } = await sb.from('direcciones').select('*').eq('id', req.params.id).maybeSingle();
    if (!dir) return res.status(404).json({ error: 'Dirección no encontrada.' });

    const [{ data: timbres }, { data: ms }, { data: invs }] = await Promise.all([
      sb.from('timbres').select('*').eq('direccion_id', dir.id).order('created_at', { ascending: true }),
      sb.from('memberships').select('id, rol, usuario:usuarios(id,nombre,apellido,email,foto_fachada)').eq('direccion_id', dir.id).eq('estado', 'activo'),
      sb.from('invitaciones').select('*').eq('direccion_id', dir.id).eq('estado', 'pendiente'),
    ]);

    const familiares = (ms || []).filter((m) => m.usuario).map((m) => ({
      membershipId: m.id,
      usuario: { _id: m.usuario.id, nombre: m.usuario.nombre, apellido: m.usuario.apellido, email: m.usuario.email },
      rol: m.rol,
      nombreCompleto: `${m.usuario.nombre} ${m.usuario.apellido}`,
    }));

    res.json({
      success: true,
      rol,
      direccion: mapDireccion(dir),
      timbres: (timbres || []).map(mapTimbre),
      familiares,
      invitacionesPendientes: invs || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/direcciones/:id (solo dueño)
 */
const updateDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede editar.' });

    const updates = {};
    if (req.body.nombre !== undefined) updates.nombre = req.body.nombre;
    if (req.body.tipo !== undefined) updates.tipo = req.body.tipo;
    if (req.body.direccion !== undefined) updates.direccion = req.body.direccion;
    if (req.body.activa !== undefined) updates.activa = req.body.activa;
    if (req.body.lat !== undefined) updates.lat = req.body.lat;
    if (req.body.lng !== undefined) updates.lng = req.body.lng;
    updates.updated_at = new Date().toISOString();

    const sb = getSupabase();
    const { data: dir, error } = await sb.from('direcciones').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, direccion: mapDireccion(dir) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/direcciones/:id (solo dueño) — cascada por FK.
 */
const deleteDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede eliminar.' });
    const sb = getSupabase();
    const { error } = await sb.from('direcciones').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Dirección eliminada.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones/:id/foto (solo dueño)
 */
const uploadFotoDireccion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede cambiar la foto.' });
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen.' });

    const sb = getSupabase();
    const { data: dir } = await sb.from('direcciones').select('foto').eq('id', req.params.id).maybeSingle();
    if (!dir) return res.status(404).json({ error: 'Dirección no encontrada.' });

    const fileUrl = await uploadImagen(req.file.buffer, req.file.mimetype);
    if (dir.foto) await borrarImagen(dir.foto);
    const { data: updated } = await sb.from('direcciones').update({ foto: fileUrl }).eq('id', req.params.id).select().single();
    res.json({ success: true, foto: fileUrl, direccion: mapDireccion(updated) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDirecciones, createDireccion, getDireccion, updateDireccion, deleteDireccion, uploadFotoDireccion,
};
