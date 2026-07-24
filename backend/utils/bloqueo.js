// utils/bloqueo.js
// ¿Este visitante está bloqueado en esta dirección? Se identifica por el id de
// su navegador (visitorId) y/o IP. Tolerante a que la tabla `bloqueos` no exista
// todavía (devuelve false y no rompe).
const logger = require('../config/logger');

const estaBloqueado = async (sb, direccionId, { visitorId, visitorIp } = {}) => {
  const vid = (visitorId || '').toString().trim() || null;
  const ip = (visitorIp || '').toString().trim() || null;
  if (!vid && !ip) return false;
  try {
    let q = sb.from('bloqueos').select('id').eq('direccion_id', direccionId);
    if (vid && ip) q = q.or(`visitor_id.eq.${vid},visitor_ip.eq.${ip}`);
    else if (vid) q = q.eq('visitor_id', vid);
    else q = q.eq('visitor_ip', ip);
    const { data } = await q.limit(1);
    return !!(data && data.length);
  } catch (e) {
    logger.warn('Chequeo de bloqueo omitido: ' + (e && e.message));
    return false;
  }
};

module.exports = { estaBloqueado };
