// services/geocodeService.js
// Geocodificación de direcciones (texto → lat/lng) usando Nominatim (OpenStreetMap).
// Gratis y sin API key. Política de uso: 1 req/seg y User-Agent identificable.
// Se usa para fijar el punto de referencia del geofence a partir de la dirección
// que escribe el dueño (así no necesita ir físicamente a la puerta).
const logger = require('../config/logger');

const geocodeDireccion = async (texto) => {
  const q = (texto || '').trim();
  if (!q) return null;

  const url = 'https://nominatim.openstreetmap.org/search'
    + `?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;

  // Timeout defensivo: no colgar la request del usuario si Nominatim tarda.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'S-Doorbell/1.0 (soporte@s-doorbell.app)',
        'Accept-Language': 'es',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const r = data[0];
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng, display: r.display_name || q };
  } catch (e) {
    clearTimeout(timer);
    logger.warn('Geocodificación fallida: ' + (e && e.message));
    return null;
  }
};

module.exports = { geocodeDireccion };
