// controllers/eventoController.js
const { getSupabase } = require('../config/supabase');
const { mapEvento } = require('../db/mappers');

/**
 * GET /api/eventos/recientes?since=<ISO>
 * Timbrazos recientes de TODAS las direcciones del usuario (dueño o familiar).
 */
const getRecientes = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: ms } = await sb.from('memberships').select('direccion_id').eq('usuario_id', req.usuario._id).eq('estado', 'activo');
    const dirIds = (ms || []).map((m) => m.direccion_id);
    if (!dirIds.length) return res.json({ success: true, eventos: [] });

    let q = sb.from('eventos')
      .select('*, direccion:direcciones(id,nombre), timbre:timbres(id,nombre)')
      .in('direccion_id', dirIds).eq('tipo', 'timbrazo')
      .order('created_at', { ascending: false }).limit(20);
    if (req.query.since) {
      const since = new Date(req.query.since);
      if (!isNaN(since)) q = q.gt('created_at', since.toISOString());
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, eventos: (data || []).map(mapEvento) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/eventos/historial/:userId
 */
const getHistorial = async (req, res, next) => {
  try {
    if (req.usuario._id !== req.params.userId) return res.status(403).json({ error: 'Acceso denegado.' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const tipo = req.query.tipo || null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sb = getSupabase();
    let q = sb.from('eventos')
      .select('*, direccion:direcciones(id,nombre), timbre:timbres(id,nombre)', { count: 'exact' })
      .eq('user_id', req.params.userId).order('created_at', { ascending: false }).range(from, to);
    if (tipo) q = q.eq('tipo', tipo);

    const { data, count, error } = await q;
    if (error) throw error;
    const total = count || 0;
    res.json({
      success: true,
      eventos: (data || []).map(mapEvento),
      pagination: { total, page, limit, pages: Math.ceil(total / limit), hasNext: from + limit < total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/eventos/stats/:userId
 */
const getStats = async (req, res, next) => {
  try {
    if (req.usuario._id !== req.params.userId) return res.status(403).json({ error: 'Acceso denegado.' });
    const sb = getSupabase();
    const userId = req.params.userId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    const base = () => sb.from('eventos').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('tipo', 'timbrazo');
    const [{ count: totalTimbre }, { count: hoy }, { count: semana }, { data: ultimo }] = await Promise.all([
      base(),
      base().gte('created_at', today.toISOString()),
      base().gte('created_at', weekAgo.toISOString()),
      sb.from('eventos').select('created_at').eq('user_id', userId).eq('tipo', 'timbrazo').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    res.json({
      success: true,
      stats: { totalTimbre: totalTimbre || 0, hoy: hoy || 0, semana: semana || 0, ultimoTimbre: ultimo?.created_at || null },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/eventos/:id
 */
const deleteEvento = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: ev } = await sb.from('eventos').select('id, user_id').eq('id', req.params.id).maybeSingle();
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado.' });
    if (ev.user_id !== req.usuario._id) return res.status(403).json({ error: 'Sin permiso.' });
    await sb.from('eventos').delete().eq('id', ev.id);
    res.json({ success: true, message: 'Evento eliminado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getHistorial, getStats, deleteEvento, getRecientes };
