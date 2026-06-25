// utils/geo.js
// Distancia entre dos coordenadas (fórmula de Haversine), en metros.
const distanciaMetros = (lat1, lng1, lat2, lng2) => {
  if ([lat1, lng1, lat2, lng2].some((v) => typeof v !== 'number' || isNaN(v))) return null;
  const R = 6371000; // radio de la Tierra en metros
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Umbral (metros) para considerar al visitante "en la puerta".
const UMBRAL_VERIFICADO = 150;

module.exports = { distanciaMetros, UMBRAL_VERIFICADO };
