// controllers/timbreController.js
const { getSupabase } = require('../config/supabase');
const { mapTimbre } = require('../db/mappers');
const { generateQRDataURL } = require('../services/qrService');
const { getRol } = require('../utils/access');

// Carga el timbre + rol del usuario en su dirección.
const loadTimbreConRol = async (usuarioId, timbreId) => {
  const sb = getSupabase();
  const { data: timbre } = await sb.from('timbres').select('*').eq('id', timbreId).maybeSingle();
  if (!timbre) return { error: 404 };
  const rol = await getRol(usuarioId, timbre.direccion_id);
  if (!rol) return { error: 403 };
  return { timbre, rol };
};

/**
 * POST /api/direcciones/:id/timbres (solo dueño)
 */
const crearTimbre = async (req, res, next) => {
  try {
    const direccionId = req.params.id;
    const rol = await getRol(req.usuario._id, direccionId);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede agregar timbres.' });

    const sb = getSupabase();
    const { data: timbre, error } = await sb.from('timbres')
      .insert({ direccion_id: direccionId, nombre: req.body.nombre || 'Puerta', tipo: req.body.tipo || 'Timbre particular' })
      .select().single();
    if (error) throw error;

    const qr = await generateQRDataURL(timbre.qr_id);
    if (qr.success) {
      await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);
      timbre.qr_image = qr.dataURL;
    }
    res.status(201).json({ success: true, timbre: mapTimbre(timbre) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timbres/:id (miembro)
 */
const getTimbre = async (req, res, next) => {
  try {
    const { timbre, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    res.json({ success: true, timbre: mapTimbre(timbre) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/timbres/:id/qr (miembro)
 */
const getQR = async (req, res, next) => {
  try {
    const { timbre, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });

    // El PNG guardado tiene la URL del visitante HORNEADA adentro, y esa URL sale
    // de VISITOR_BASE_URL. Si el entorno cambia (dev → deploy, o la IP de la LAN),
    // el guardado queda apuntando a un servidor que ya no existe y el visitante
    // ve el navegador colgado hasta el timeout. Por eso se regenera siempre y se
    // refresca el guardado cuando difiere, en vez de cachearlo para siempre.
    const sb = getSupabase();
    const qr = await generateQRDataURL(timbre.qr_id);
    if (qr.success && qr.dataURL !== timbre.qr_image) {
      await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);
      timbre.qr_image = qr.dataURL;
    }
    res.json({
      success: true,
      qrId: timbre.qr_id,
      qrImage: timbre.qr_image,
      visitorUrl: `${process.env.VISITOR_BASE_URL}/${timbre.qr_id}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/timbres/:id (solo dueño) — incluye modoGeo
 */
const updateTimbre = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede editar.' });

    const updates = { updated_at: new Date().toISOString() };
    if (req.body.nombre !== undefined) updates.nombre = req.body.nombre;
    if (req.body.tipo !== undefined) updates.tipo = req.body.tipo;
    if (req.body.activo !== undefined) updates.activo = req.body.activo;
    if (req.body.modoGeo !== undefined) updates.modo_geo = req.body.modoGeo;

    const sb = getSupabase();
    const { data: updated, error: uErr } = await sb.from('timbres').update(updates).eq('id', timbre.id).select().single();
    if (uErr) throw uErr;
    res.json({ success: true, timbre: mapTimbre(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/timbres/:id (solo dueño)
 */
const deleteTimbre = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede eliminar.' });

    const sb = getSupabase();
    await sb.from('timbres').delete().eq('id', timbre.id);
    res.json({ success: true, message: 'Timbre eliminado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/timbres/:id/regenerar-qr (solo dueño)
 */
const regenerarQR = async (req, res, next) => {
  try {
    const { timbre, rol, error } = await loadTimbreConRol(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Timbre no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'Sin acceso.' });
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede regenerar.' });

    const { randomUUID } = require('crypto');
    const nuevoQrId = randomUUID();
    const qr = await generateQRDataURL(nuevoQrId);
    if (!qr.success) return res.status(500).json({ error: 'Error generando QR.' });

    const sb = getSupabase();
    const { data: updated } = await sb.from('timbres')
      .update({ qr_id: nuevoQrId, qr_image: qr.dataURL, updated_at: new Date().toISOString() })
      .eq('id', timbre.id).select().single();

    res.json({
      success: true,
      qrId: updated.qr_id,
      qrImage: updated.qr_image,
      visitorUrl: `${process.env.VISITOR_BASE_URL}/${updated.qr_id}`,
      timbre: mapTimbre(updated),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { crearTimbre, getTimbre, getQR, updateTimbre, deleteTimbre, regenerarQR };
