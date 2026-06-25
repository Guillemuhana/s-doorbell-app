// Túnel público para el backend local (puerto 5000) usando @expo/ngrok.
// Uso: node ngrok-backend.js  → imprime la URL pública y la mantiene viva.
const ngrok = require('@expo/ngrok');

(async () => {
  try {
    const url = await ngrok.connect({ addr: 5000, proto: 'http' });
    console.log('BACKEND_TUNNEL_URL=' + url);
    console.log('(dejá este proceso corriendo)');
  } catch (e) {
    console.error('NGROK_ERROR=' + (e && e.message ? e.message : e));
    process.exit(1);
  }
})();
