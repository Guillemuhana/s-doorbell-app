// utils/access.js
// Helpers de control de acceso basados en Membership.
const Membership = require('../models/Membership');

/**
 * Devuelve el rol del usuario en la dirección, o null si no es miembro activo.
 */
const getRol = async (usuarioId, direccionId) => {
  const m = await Membership.findOne({
    usuario: usuarioId,
    direccion: direccionId,
    estado: 'activo',
  }).lean();
  return m ? m.rol : null;
};

/**
 * true si el usuario es miembro activo (cualquier rol) de la dirección.
 */
const esMiembro = async (usuarioId, direccionId) => {
  return (await getRol(usuarioId, direccionId)) !== null;
};

/**
 * true si el usuario es dueño de la dirección.
 */
const esDueno = async (usuarioId, direccionId) => {
  return (await getRol(usuarioId, direccionId)) === 'dueño';
};

module.exports = { getRol, esMiembro, esDueno };
