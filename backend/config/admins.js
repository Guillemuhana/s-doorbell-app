// config/admins.js
// Admins de PLATAFORMA (operadores que crean edificios/complejos para clientes
// que adquieren la app). Distinto del 'dueño'/'admin' de un edificio puntual.
// Se puede ampliar con la env PLATFORM_ADMIN_EMAILS (coma-separada) sin tocar código.
const RAW = process.env.PLATFORM_ADMIN_EMAILS || 'guillemuhana@gmail.com';

const ADMINS = RAW.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

const esAdminPlataforma = (email) =>
  !!email && ADMINS.indexOf(String(email).toLowerCase().trim()) !== -1;

module.exports = { esAdminPlataforma, ADMINS };
