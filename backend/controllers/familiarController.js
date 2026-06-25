// controllers/familiarController.js
const { getSupabase } = require('../config/supabase');
const { mapInvitacion } = require('../db/mappers');
const { getRol } = require('../utils/access');

/**
 * GET /api/direcciones/:id/familiares (miembro)
 */
const listFamiliares = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (!rol) return res.status(403).json({ error: 'Sin acceso a esta dirección.' });

    const sb = getSupabase();
    const [{ data: ms }, { data: invs }] = await Promise.all([
      sb.from('memberships').select('id, rol, usuario:usuarios(id,nombre,apellido,email)').eq('direccion_id', req.params.id).eq('estado', 'activo'),
      sb.from('invitaciones').select('*').eq('direccion_id', req.params.id).eq('estado', 'pendiente'),
    ]);

    const familiares = (ms || []).filter((m) => m.usuario).map((m) => ({
      membershipId: m.id,
      usuario: { _id: m.usuario.id, nombre: m.usuario.nombre, apellido: m.usuario.apellido, email: m.usuario.email },
      rol: m.rol,
      nombreCompleto: `${m.usuario.nombre} ${m.usuario.apellido}`,
    }));

    res.json({ success: true, familiares, invitacionesPendientes: (invs || []).map(mapInvitacion) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/direcciones/:id/invitaciones (solo dueño)
 */
const crearInvitacion = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede invitar.' });

    const { email, rol: rolInvitado } = req.body;
    if (!email) return res.status(400).json({ error: 'El email del invitado es requerido.' });
    const emailNorm = email.toLowerCase().trim();
    const sb = getSupabase();

    const { data: usuarioExistente } = await sb.from('usuarios').select('id').eq('email', emailNorm).maybeSingle();
    if (usuarioExistente) {
      const { data: yaMiembro } = await sb.from('memberships').select('id')
        .eq('usuario_id', usuarioExistente.id).eq('direccion_id', req.params.id).maybeSingle();
      if (yaMiembro) return res.status(400).json({ error: 'Esa persona ya es parte de la dirección.' });
    }

    const { data: pendiente } = await sb.from('invitaciones').select('id')
      .eq('direccion_id', req.params.id).eq('email', emailNorm).eq('estado', 'pendiente').maybeSingle();
    if (pendiente) return res.status(400).json({ error: 'Ya existe una invitación pendiente para ese email.' });

    const { data: inv, error } = await sb.from('invitaciones')
      .insert({ direccion_id: req.params.id, invitado_por: req.usuario._id, email: emailNorm, rol: rolInvitado === 'colaborador' ? 'colaborador' : 'familiar' })
      .select().single();
    if (error) throw error;

    const base = process.env.VISITOR_BASE_URL?.replace('/visit', '') || '';
    res.status(201).json({
      success: true,
      invitacion: mapInvitacion(inv),
      inviteUrl: `${base}/invitacion/${inv.token}`,
      message: 'Invitación creada. Compartí el enlace con la persona.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitaciones/:token (público)
 */
const getInvitacion = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: inv } = await sb.from('invitaciones')
      .select('*, direccion:direcciones(id,nombre,tipo,direccion,foto), invitadoPor:usuarios!invitaciones_invitado_por_fkey(nombre,apellido)')
      .eq('token', req.params.token).maybeSingle();

    if (!inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (inv.estado !== 'pendiente') return res.status(410).json({ error: `La invitación ya fue ${inv.estado}.` });
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      await sb.from('invitaciones').update({ estado: 'expirada' }).eq('id', inv.id);
      return res.status(410).json({ error: 'La invitación expiró.' });
    }
    res.json({ success: true, invitacion: inv });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitaciones/:token/aceptar (auth)
 */
const aceptarInvitacion = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: inv } = await sb.from('invitaciones').select('*').eq('token', req.params.token).maybeSingle();
    if (!inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (inv.estado !== 'pendiente') return res.status(410).json({ error: `La invitación ya fue ${inv.estado}.` });
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      await sb.from('invitaciones').update({ estado: 'expirada' }).eq('id', inv.id);
      return res.status(410).json({ error: 'La invitación expiró.' });
    }

    const { data: yaMiembro } = await sb.from('memberships').select('id')
      .eq('usuario_id', req.usuario._id).eq('direccion_id', inv.direccion_id).maybeSingle();
    if (!yaMiembro) {
      await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: inv.direccion_id, rol: inv.rol });
    }
    await sb.from('invitaciones').update({ estado: 'aceptada' }).eq('id', inv.id);
    res.json({ success: true, message: 'Te uniste a la dirección.', direccionId: inv.direccion_id });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invitaciones/:token/rechazar
 */
const rechazarInvitacion = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: inv } = await sb.from('invitaciones').select('id, estado').eq('token', req.params.token).maybeSingle();
    if (!inv) return res.status(404).json({ error: 'Invitación no encontrada.' });
    if (inv.estado === 'pendiente') await sb.from('invitaciones').update({ estado: 'rechazada' }).eq('id', inv.id);
    res.json({ success: true, message: 'Invitación rechazada.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/direcciones/:id/familiares/:membershipId (solo dueño)
 */
const eliminarFamiliar = async (req, res, next) => {
  try {
    const rol = await getRol(req.usuario._id, req.params.id);
    if (rol !== 'dueño') return res.status(403).json({ error: 'Solo el dueño puede quitar familiares.' });

    const sb = getSupabase();
    const { data: m } = await sb.from('memberships').select('id, rol, direccion_id').eq('id', req.params.membershipId).maybeSingle();
    if (!m || m.direccion_id !== req.params.id) return res.status(404).json({ error: 'Familiar no encontrado.' });
    if (m.rol === 'dueño') return res.status(400).json({ error: 'No se puede quitar al dueño de la dirección.' });

    await sb.from('memberships').delete().eq('id', m.id);
    res.json({ success: true, message: 'Familiar eliminado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listFamiliares, crearInvitacion, getInvitacion, aceptarInvitacion, rechazarInvitacion, eliminarFamiliar };
