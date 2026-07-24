// controllers/referidoController.js
// Referidos: cada usuario tiene un código/link único para regalar 30% de
// descuento a UN amigo (1 solo canje total). El amigo entra al link público,
// deja nombre+email y queda registrado el cupón; el dueño lo ve en la app y lo
// aplica a mano (no hay checkout todavía).
const crypto = require('crypto');
const { getSupabase } = require('../config/supabase');
const { mapReferido } = require('../db/mappers');
const { sendGenericNotification } = require('../services/pushNotificationService');
const { sendWebPush, isWebPushSubscription } = require('../services/webPushService');
const logger = require('../config/logger');

const DESCUENTO = 30;

// Genera un código legible tipo "SD-7KQ2FX" (sin caracteres ambiguos).
const generarCodigo = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O/0/I/1
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) s += abc[bytes[i] % abc.length];
  return `SD-${s}`;
};

// Base pública donde se sirve la página de canje (la sirve el backend en
// /referido/:code, junto a /visit).
const baseCanje = (req) => {
  const originHeader = req.headers.origin
    || (req.headers.host ? `${req.protocol}://${req.headers.host}` : '');
  return (process.env.VISITOR_BASE_URL ? process.env.VISITOR_BASE_URL.replace('/visit', '') : '')
    || process.env.BASE_URL
    || originHeader
    || '';
};

// Asegura que el usuario tenga referral_code, generándolo si falta (con reintento
// ante colisión del unique).
const asegurarCodigo = async (sb, usuario) => {
  if (usuario.referral_code) return usuario.referral_code;
  for (let intento = 0; intento < 5; intento += 1) {
    const code = generarCodigo();
    const { data, error } = await sb.from('usuarios')
      .update({ referral_code: code }).eq('id', usuario._id).is('referral_code', null)
      .select('referral_code').maybeSingle();
    if (!error && data && data.referral_code) return data.referral_code;
    // Releer por si otro request lo seteó primero.
    const { data: fresh } = await sb.from('usuarios').select('referral_code').eq('id', usuario._id).maybeSingle();
    if (fresh && fresh.referral_code) return fresh.referral_code;
  }
  throw new Error('No se pudo generar el código de referido.');
};

/**
 * GET /api/referidos/mi-codigo (auth) — código, link y estado del canje.
 */
const getMiCodigo = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const code = await asegurarCodigo(sb, req.usuario);
    const { data: canje } = await sb.from('referidos').select('*').eq('referrer_id', req.usuario._id).maybeSingle();

    res.json({
      success: true,
      code,
      url: `${baseCanje(req)}/referido/${code}`,
      descuento: DESCUENTO,
      // null = todavía disponible para regalar; si existe, ya fue canjeado.
      canje: canje ? mapReferido(canje) : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/referidos/:code (público) — datos para la página de canje.
 */
const getReferidoPublico = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: owner } = await sb.from('usuarios')
      .select('id,nombre,apellido').eq('referral_code', req.params.code).maybeSingle();
    if (!owner) return res.status(404).json({ error: 'Código no válido.' });

    const { data: canje } = await sb.from('referidos').select('id,estado').eq('referrer_id', owner.id).maybeSingle();

    res.json({
      success: true,
      referente: `${owner.nombre} ${owner.apellido}`.trim(),
      descuento: DESCUENTO,
      disponible: !canje,               // false si ya fue canjeado por alguien
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/referidos/:code/canjear (público) — el amigo reclama el 30%.
 */
const canjear = async (req, res, next) => {
  try {
    const { nombre, email } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Ingresá tu nombre.' });
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) return res.status(400).json({ error: 'Ingresá un email válido.' });

    const sb = getSupabase();
    const { data: owner } = await sb.from('usuarios')
      .select('id,nombre,apellido,push_token,referral_code').eq('referral_code', req.params.code).maybeSingle();
    if (!owner) return res.status(404).json({ error: 'Código no válido.' });

    // Insertar el canje. El unique(referrer_id) garantiza 1 solo canje total:
    // si ya existe, la inserción falla con 23505 y devolvemos "ya canjeado".
    const { data: canje, error } = await sb.from('referidos')
      .insert({
        referrer_id: owner.id,
        code: owner.referral_code,
        amigo_nombre: nombre.trim(),
        amigo_email: email.toLowerCase().trim(),
        descuento: DESCUENTO,
        estado: 'canjeado',
      })
      .select().single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Este descuento ya fue canjeado.', yaCanjeado: true });
      }
      throw error;
    }

    // Avisar al dueño del código que su amigo canjeó el 30%.
    if (owner.push_token) {
      const title = '🎁 ¡Canjearon tu descuento!';
      const body = `${nombre.trim()} usó tu link y tiene 30% de descuento.`;
      const data = { type: 'REFERRAL_REDEEMED', amigo: nombre.trim() };
      try {
        if (isWebPushSubscription(owner.push_token)) {
          const r = await sendWebPush(owner.push_token, { title, body, data });
          if (r.gone) await sb.from('usuarios').update({ push_token: null }).eq('id', owner.id);
        } else {
          await sendGenericNotification({ pushToken: owner.push_token, title, body, data });
        }
      } catch (e) {
        logger.warn('No se pudo notificar el canje de referido: ' + (e && e.message));
      }
    }

    res.status(201).json({
      success: true,
      message: '¡Listo! Tu 30% de descuento quedó registrado.',
      descuento: DESCUENTO,
      canje: mapReferido(canje),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/referidos/mi-canje/aplicar (auth) — el dueño marca el canje como
 * aplicado (ya le dio el descuento al amigo).
 */
const marcarAplicado = async (req, res, next) => {
  try {
    const sb = getSupabase();
    const { data: canje } = await sb.from('referidos').select('*').eq('referrer_id', req.usuario._id).maybeSingle();
    if (!canje) return res.status(404).json({ error: 'Todavía nadie canjeó tu descuento.' });

    const { data: updated, error } = await sb.from('referidos')
      .update({ estado: 'aplicado', applied_at: new Date().toISOString() })
      .eq('id', canje.id).select().single();
    if (error) throw error;
    res.json({ success: true, canje: mapReferido(updated) });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMiCodigo, getReferidoPublico, canjear, marcarAplicado };
