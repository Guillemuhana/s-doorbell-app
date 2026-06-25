// api/index.js — entrypoint serverless para Vercel.
// Exporta la app Express como handler (server.js no llama listen cuando se importa).
module.exports = require('../server.js');
