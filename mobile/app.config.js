// Envuelve app.json para que la URL de la API sea configurable por entorno.
//
// En el deploy (Vercel) se define EXPO_PUBLIC_API_BASE_URL; en desarrollo nativo
// cae al valor de app.json (la IP de la LAN). Ojo: el PWA se sirve por HTTPS, así
// que la API TAMBIÉN debe ser HTTPS o el navegador bloquea todo por mixed content.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || config.extra.API_BASE_URL,
  },
});
