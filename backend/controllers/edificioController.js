// controllers/edificioController.js
// Edificios / complejos / barrios cerrados: un timbre de entrada (directorio) y
// varias unidades (deptos/lotes), cada una con sus residentes. El edificio es
// una `direccion` (tipo 'Edificio'); las unidades son `direcciones` hijas
// (parent_id = edificio). El administrador es el 'dueño' de la fila-edificio.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/supabase');
const { mapEdificio, mapDireccion, mapTimbre, mapEvento } = require('../db/mappers');
const { generateQRDataURL } = require('../services/qrService');
const { getRol } = require('../utils/access');
const { esAdminPlataforma } = require('../config/admins');

// Roles con permiso de administración del edificio.
const ROLES_ADMIN = ['dueño', 'admin'];

// Devuelve el rol del usuario en el edificio si es una fila tipo 'Edificio'
// y el usuario es admin; si no, null.
const cargarEdificioAdmin = async (usuarioId, edificioId) => {
  const sb = getSupabase();
  const { data: edi } = await sb.from('direcciones').select('*').eq('id', edificioId).maybeSingle();
  if (!edi || edi.tipo !== 'Edificio') return { error: 404 };
  const rol = await getRol(usuarioId, edificioId);
  if (!rol || !ROLES_ADMIN.includes(rol)) return { error: 403 };
  return { edificio: edi, rol };
};

// Crea el timbre por defecto de una dirección (unidad o entrada) + su QR.
const crearTimbreConQR = async (sb, direccionId, { nombre, tipo }) => {
  const { data: timbre } = await sb.from('timbres')
    .insert({ direccion_id: direccionId, nombre, tipo }).select().single();
  const qr = await generateQRDataURL(timbre.qr_id);
  if (qr.success) {
    await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);
    timbre.qr_image = qr.dataURL;
  }
  return timbre;
};

/**
 * GET /api/edificios — edificios/complejos que administra el usuario.
 */
const listEdificios = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: ms, error } = await sb
      .from('memberships')
      .select('rol, direccion:direcciones(*)')
      .eq('usuario_id', req.usuario._id)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const admins = (ms || []).filter(
      (m) => m.direccion && m.direccion.tipo === 'Edificio' && ROLES_ADMIN.includes(m.rol)
    );

    const edificios = await Promise.all(admins.map(async (m) => {
      const { count: unidadesCount } = await sb
        .from('direcciones').select('id', { count: 'exact', head: true })
        .eq('parent_id', m.direccion.id);
      return mapEdificio(m.direccion, { rol: m.rol, unidadesCount: unidadesCount || 0 });
    }));

    res.json({ success: true, edificios });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/edificios — crea edificio + membership(dueño=admin) + timbre de
 * entrada (directorio).
 */
const createEdificio = async (req, res, next) => {
  try {
    // Solo el operador de plataforma crea edificios (para clientes que compran la app).
    if (!esAdminPlataforma(req.usuario.email)) {
      return res.status(403).json({ error: 'Solo un administrador de plataforma puede crear edificios.' });
    }

    const { nombre, categoria, direccion, codigoPostal } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre del cliente es requerido.' });

    // Código postal (no hay columna propia): se guarda formateado dentro de la
    // dirección para que salga ordenado en el entregable.
    const dirCompleta = [(direccion || '').trim(), codigoPostal ? `CP ${String(codigoPostal).trim()}` : '']
      .filter(Boolean).join(' · ');

    // Categoría del cliente (para agrupar en el cpanel). Se guarda en `unidad`
    // de la fila contenedora. La columna `tipo` sigue siendo 'Edificio' para
    // discriminar contenedor vs unidad.
    const CATS = ['Edificio', 'Complejo', 'Barrio', 'Casa'];
    const cat = CATS.indexOf(categoria) !== -1 ? categoria : 'Edificio';
    const esCasa = cat === 'Casa';

    const sb = getSupabase();
    const { data: edi, error } = await sb.from('direcciones')
      .insert({
        owner_id: req.usuario._id,
        nombre: nombre.trim(),
        tipo: 'Edificio',
        unidad: cat,
        direccion: dirCompleta,
      })
      .select().single();
    if (error) throw error;

    await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: edi.id, rol: 'dueño' });
    const timbre = await crearTimbreConQR(sb, edi.id, { nombre: 'Entrada principal', tipo: 'Directorio' });

    // Para un cliente "Casa" (un solo timbre con N usuarios) creamos ya la única
    // unidad-timbre, así el admin cae listo para cargarle los usuarios.
    let unidad = null;
    if (esCasa) {
      const { data: u } = await sb.from('direcciones')
        .insert({ owner_id: req.usuario._id, parent_id: edi.id, nombre: nombre.trim(), tipo: 'Unidad', direccion: dirCompleta })
        .select().single();
      await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: u.id, rol: 'dueño' });
      const tu = await crearTimbreConQR(sb, u.id, { nombre: 'Puerta', tipo: 'Timbre particular' });
      unidad = mapDireccion(u, { residentesCount: 1, timbre: mapTimbre(tu) });
    }

    res.status(201).json({
      success: true,
      edificio: mapEdificio(edi, { rol: 'dueño', unidadesCount: esCasa ? 1 : 0 }),
      entrada: mapTimbre(timbre),
      unidad,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/edificios/:id — detalle: info + timbre(s) de entrada + unidades.
 */
const getEdificio = async (req, res, next) => {
  try {
    const { edificio, rol, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const [{ data: entradas }, { data: unidadesRaw }] = await Promise.all([
      sb.from('timbres').select('*').eq('direccion_id', edificio.id).order('created_at', { ascending: true }),
      sb.from('direcciones').select('*').eq('parent_id', edificio.id).order('created_at', { ascending: true }),
    ]);

    const unidades = await Promise.all((unidadesRaw || []).map(async (u) => {
      const [{ count: residentesCount }, { data: timbres }] = await Promise.all([
        sb.from('memberships').select('id', { count: 'exact', head: true }).eq('direccion_id', u.id).eq('estado', 'activo'),
        sb.from('timbres').select('*').eq('direccion_id', u.id).order('created_at', { ascending: true }).limit(1),
      ]);
      const timbre = (timbres || [])[0] || null;
      return mapDireccion(u, {
        residentesCount: residentesCount || 0,
        timbre: timbre ? mapTimbre(timbre) : null,
      });
    }));

    res.json({
      success: true,
      rol,
      edificio: mapEdificio(edificio, { rol, unidadesCount: unidades.length }),
      entradas: (entradas || []).map(mapTimbre),
      unidades,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/edificios/:id (solo admin)
 */
const updateEdificio = async (req, res, next) => {
  try {
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const updates = { updated_at: new Date().toISOString() };
    if (req.body.nombre !== undefined) updates.nombre = req.body.nombre;
    if (req.body.categoria !== undefined) updates.unidad = req.body.categoria;
    if (req.body.direccion !== undefined) updates.direccion = req.body.direccion;
    if (req.body.activa !== undefined) updates.activa = req.body.activa;
    if (req.body.lat !== undefined) updates.lat = req.body.lat;
    if (req.body.lng !== undefined) updates.lng = req.body.lng;

    const sb = getSupabase();
    const { data: edi, error: uErr } = await sb.from('direcciones').update(updates).eq('id', edificio.id).select().single();
    if (uErr) throw uErr;
    res.json({ success: true, edificio: mapEdificio(edi) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/edificios/:id (solo admin) — borra edificio y unidades (cascada
 * por FK parent_id ON DELETE CASCADE).
 */
const deleteEdificio = async (req, res, next) => {
  try {
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const { error: dErr } = await sb.from('direcciones').delete().eq('id', edificio.id);
    if (dErr) throw dErr;
    res.json({ success: true, message: 'Edificio eliminado.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/edificios/:id/unidades (solo admin) — crea una unidad (depto/lote)
 * con su timbre/QR. Opcional: invita a un residente por email.
 */
const addUnidad = async (req, res, next) => {
  try {
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const { nombre, unidad, email } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre/etiqueta de la unidad es requerido.' });

    const sb = getSupabase();
    const { data: u, error: cErr } = await sb.from('direcciones')
      .insert({
        owner_id: req.usuario._id,
        parent_id: edificio.id,
        nombre: nombre.trim(),
        unidad: unidad ? String(unidad).trim() : null,
        tipo: 'Unidad',
        direccion: edificio.direccion || '',
      })
      .select().single();
    if (cErr) throw cErr;

    // El admin es dueño de la unidad → puede gestionarla con los endpoints de
    // /direcciones existentes (residentes, timbre, QR, foto...).
    await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: u.id, rol: 'dueño' });
    const timbre = await crearTimbreConQR(sb, u.id, { nombre: 'Puerta', tipo: 'Timbre particular' });

    // Invitación opcional al residente de la unidad.
    let inviteUrl = null;
    if (email && email.trim()) {
      const emailNorm = email.toLowerCase().trim();
      const { data: inv } = await sb.from('invitaciones')
        .insert({ direccion_id: u.id, invitado_por: req.usuario._id, email: emailNorm, rol: 'familiar' })
        .select().single();
      if (inv) {
        const originHeader = req.headers.origin
          || (req.headers.host ? `${req.protocol}://${req.headers.host}` : '');
        const base = process.env.APP_BASE_URL
          || (process.env.VISITOR_BASE_URL ? process.env.VISITOR_BASE_URL.replace('/visit', '') : '')
          || originHeader || '';
        inviteUrl = `${base}/invitacion/${inv.token}`;
      }
    }

    res.status(201).json({
      success: true,
      unidad: mapDireccion(u, { residentesCount: 1, timbre: mapTimbre(timbre) }),
      inviteUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/edificios/:id/unidades/:unidadId (solo admin)
 */
const removeUnidad = async (req, res, next) => {
  try {
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const { data: u } = await sb.from('direcciones').select('id, parent_id').eq('id', req.params.unidadId).maybeSingle();
    if (!u || u.parent_id !== edificio.id) return res.status(404).json({ error: 'Unidad no encontrada en este edificio.' });

    const { error: dErr } = await sb.from('direcciones').delete().eq('id', u.id);
    if (dErr) throw dErr;
    res.json({ success: true, message: 'Unidad eliminada.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/edificios/:id/historial (solo admin) — actividad de todas las
 * unidades del edificio (timbrazos, escaneos...).
 */
const historialEdificio = async (req, res, next) => {
  try {
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const { data: unidades } = await sb.from('direcciones').select('id').eq('parent_id', edificio.id);
    const ids = [edificio.id, ...((unidades || []).map((u) => u.id))];

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
    const { data: eventos, error: eErr } = await sb.from('eventos')
      .select('*, direccion:direcciones(id,nombre,unidad), timbre:timbres(id,nombre)')
      .in('direccion_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (eErr) throw eErr;

    res.json({ success: true, eventos: (eventos || []).map(mapEvento) });
  } catch (error) {
    next(error);
  }
};

// Genera una contraseña provisoria legible (para entregar al cliente; el
// usuario la cambia al primer login por `forzar_cambio_password`).
const passProvisoria = () => {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i += 1) s += abc[bytes[i] % abc.length];
  return s;
};

const slug = (s) => String(s || 'cliente').toLowerCase().normalize('NFD')
  .replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'cliente';

const visitorUrlDe = (qrId) => `${process.env.VISITOR_BASE_URL || ''}/${qrId}`;

// Crea (o reutiliza) un usuario provisorio y lo suma como miembro de la
// dirección dada. Devuelve credenciales para entregar (la pass en claro solo si
// se creó recién).
const altaUsuarioEnUnidad = async (sb, direccionId, { nombre, apellido, email, password, cslug, idx }) => {
  const generado = !email;
  const mail = (email || '').toLowerCase().trim()
    || `${cslug}-u${idx}-${crypto.randomBytes(2).toString('hex')}@sdoorbell.app`;

  const { data: existente } = await sb.from('usuarios').select('id').eq('email', mail).maybeSingle();
  if (existente) {
    const { data: yaM } = await sb.from('memberships').select('id')
      .eq('usuario_id', existente.id).eq('direccion_id', direccionId).maybeSingle();
    if (!yaM) await sb.from('memberships').insert({ usuario_id: existente.id, direccion_id: direccionId, rol: 'familiar' });
    return { nombre, email: mail, estado: yaM ? 'ya_miembro' : 'agregado' };
  }

  const pass = (password || '').trim() || passProvisoria();
  const hash = await bcrypt.hash(pass, 12);
  const { data: nuevo, error } = await sb.from('usuarios')
    .insert({ nombre, apellido: apellido || '', email: mail, password: hash, forzar_cambio_password: true })
    .select('id').single();
  if (error) return { nombre, email: mail, estado: 'error', detalle: error.message };
  await sb.from('memberships').insert({ usuario_id: nuevo.id, direccion_id: direccionId, rol: 'familiar' });
  return { nombre, email: mail, password: pass, emailGenerado: generado, estado: 'creado' };
};

/**
 * POST /api/edificios/:id/unidades-bulk (solo admin plataforma)
 * Crea varias unidades de golpe, cada una con su timbre/QR y (opcional) un
 * usuario provisorio. Modos:
 *   { modo:'auto', count:N, baseEtiqueta?, conUsuario? }
 *   { modo:'manual', unidades:[{ piso?, depto?, nombreFamilia?, email? }] }
 * Devuelve el ENTREGABLE ordenado (timbre + usuario + clave por unidad).
 */
const bulkCrearUnidades = async (req, res, next) => {
  try {
    if (!esAdminPlataforma(req.usuario.email)) {
      return res.status(403).json({ error: 'Solo un administrador de plataforma puede cargar unidades en masa.' });
    }
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const conUsuario = req.body.conUsuario !== false; // por defecto sí crea usuario
    const cslug = slug(edificio.nombre);

    // Normalizar la lista de unidades a crear.
    let defs = [];
    if (req.body.modo === 'manual' && Array.isArray(req.body.unidades)) {
      defs = req.body.unidades.map((u, i) => {
        const piso = (u.piso || '').toString().trim();
        const depto = (u.depto || '').toString().trim();
        const etiqueta = [piso, depto].filter(Boolean).join('') || `U${i + 1}`;
        const nombre = (u.nombreFamilia || '').trim() || (piso || depto ? `Piso ${piso} Depto ${depto}`.trim() : `Unidad ${i + 1}`);
        return { etiqueta, nombre, email: (u.email || '').trim() };
      });
    } else {
      const n = Math.min(Math.max(parseInt(req.body.count, 10) || 0, 1), 200);
      const base = (req.body.baseEtiqueta || 'Depto').trim();
      for (let i = 1; i <= n; i += 1) defs.push({ etiqueta: `${base} ${i}`, nombre: `${base} ${i}`, email: '' });
    }
    if (!defs.length) return res.status(400).json({ error: 'Indicá una cantidad o una lista de unidades.' });
    if (defs.length > 200) return res.status(400).json({ error: 'Máximo 200 unidades por lote.' });

    const entregable = [];
    for (let i = 0; i < defs.length; i += 1) {
      const d = defs[i];
      const { data: u } = await sb.from('direcciones')
        .insert({ owner_id: req.usuario._id, parent_id: edificio.id, nombre: d.nombre, unidad: d.etiqueta, tipo: 'Unidad', direccion: edificio.direccion || '' })
        .select().single();
      await sb.from('memberships').insert({ usuario_id: req.usuario._id, direccion_id: u.id, rol: 'dueño' });
      const timbre = await crearTimbreConQR(sb, u.id, { nombre: 'Puerta', tipo: 'Timbre particular' });

      let usuario = null;
      if (conUsuario) {
        usuario = await altaUsuarioEnUnidad(sb, u.id, { nombre: d.nombre, email: d.email, cslug, idx: i + 1 });
      }
      entregable.push({
        etiqueta: d.etiqueta,
        nombre: d.nombre,
        qrId: timbre.qr_id,
        visitorUrl: visitorUrlDe(timbre.qr_id),
        usuario,
      });
    }

    res.status(201).json({
      success: true,
      edificio: { nombre: edificio.nombre, direccion: edificio.direccion || '' },
      creadas: entregable.length,
      unidades: entregable,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/edificios/:id/unidades/:unidadId/usuarios-bulk (solo admin plataforma)
 * Alta masiva de usuarios sobre el timbre de una unidad. Acepta:
 *   { usuarios: [{ nombre, apellido?, email?, password? }, ...] }  ó
 *   { count: N, baseNombre? }  (genera N usuarios con credenciales provisorias)
 * Devuelve las credenciales creadas para entregar al cliente.
 */
const bulkCrearUsuarios = async (req, res, next) => {
  try {
    if (!esAdminPlataforma(req.usuario.email)) {
      return res.status(403).json({ error: 'Solo un administrador de plataforma puede dar de alta usuarios en masa.' });
    }
    const { edificio, error } = await cargarEdificioAdmin(req.usuario._id, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Edificio no encontrado.' });
    if (error === 403) return res.status(403).json({ error: 'No administrás este edificio.' });

    const sb = getSupabase();
    const { data: unidad } = await sb.from('direcciones').select('id, parent_id, nombre').eq('id', req.params.unidadId).maybeSingle();
    if (!unidad || unidad.parent_id !== edificio.id) {
      return res.status(404).json({ error: 'Unidad no encontrada en este edificio.' });
    }

    // Normalizar la lista de usuarios a crear.
    let lista = Array.isArray(req.body.usuarios) ? req.body.usuarios : [];
    if (!lista.length && req.body.count) {
      const n = Math.min(Math.max(parseInt(req.body.count, 10) || 0, 1), 100);
      const base = req.body.baseNombre || 'Usuario';
      for (let i = 1; i <= n; i += 1) lista.push({ nombre: `${base} ${i}` });
    }
    if (!lista.length) return res.status(400).json({ error: 'Enviá una lista de usuarios o un count.' });
    if (lista.length > 100) return res.status(400).json({ error: 'Máximo 100 usuarios por lote.' });

    const cslug = slug(edificio.nombre);
    const resultados = [];

    for (let i = 0; i < lista.length; i += 1) {
      const item = lista[i] || {};
      const nombre = (item.nombre || '').trim() || `Usuario ${i + 1}`;
      const apellido = (item.apellido || '').trim() || '';
      let email = (item.email || '').toLowerCase().trim();
      const generado = !email;
      if (!email) email = `${cslug}-u${i + 1}-${crypto.randomBytes(2).toString('hex')}@sdoorbell.app`;

      // ¿Ya existe el usuario? → solo lo sumamos como miembro (sin tocar su pass).
      const { data: existente } = await sb.from('usuarios').select('id').eq('email', email).maybeSingle();
      if (existente) {
        const { data: yaM } = await sb.from('memberships').select('id')
          .eq('usuario_id', existente.id).eq('direccion_id', unidad.id).maybeSingle();
        if (!yaM) await sb.from('memberships').insert({ usuario_id: existente.id, direccion_id: unidad.id, rol: 'familiar' });
        resultados.push({ nombre, email, estado: yaM ? 'ya_miembro' : 'agregado' });
        continue;
      }

      const password = (item.password || '').trim() || passProvisoria();
      const hash = await bcrypt.hash(password, 12);
      const { data: nuevo, error: cErr } = await sb.from('usuarios')
        .insert({ nombre, apellido, email, password: hash, forzar_cambio_password: true })
        .select('id').single();
      if (cErr) { resultados.push({ nombre, email, estado: 'error', detalle: cErr.message }); continue; }

      await sb.from('memberships').insert({ usuario_id: nuevo.id, direccion_id: unidad.id, rol: 'familiar' });
      // Devolvemos la pass EN CLARO una única vez (para entregar). `generado`
      // avisa que el email es de sistema (el usuario debería cambiarlo).
      resultados.push({ nombre, email, password, emailGenerado: generado, estado: 'creado' });
    }

    const { count: residentesCount } = await sb.from('memberships')
      .select('id', { count: 'exact', head: true }).eq('direccion_id', unidad.id).eq('estado', 'activo');

    res.status(201).json({
      success: true,
      creados: resultados.filter((r) => r.estado === 'creado').length,
      agregados: resultados.filter((r) => r.estado === 'agregado').length,
      total: resultados.length,
      residentesCount: residentesCount || 0,
      usuarios: resultados,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listEdificios, createEdificio, getEdificio, updateEdificio, deleteEdificio,
  addUnidad, removeUnidad, historialEdificio, bulkCrearUsuarios, bulkCrearUnidades,
};
