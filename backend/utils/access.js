// utils/access.js
// Helpers de control de acceso basados en memberships (Supabase).
const { getSupabase } = require('../config/supabase');

/**
 * Devuelve el rol del usuario en la dirección, o null si no es miembro activo.
 */
const getRol = async (usuarioId, direccionId) => {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('memberships')
    .select('rol')
    .eq('usuario_id', usuarioId)
    .eq('direccion_id', direccionId)
    .eq('estado', 'activo')
    .maybeSingle();
  if (error || !data) return null;
  return data.rol;
};

const esMiembro = async (usuarioId, direccionId) => (await getRol(usuarioId, direccionId)) !== null;
const esDueno = async (usuarioId, direccionId) => (await getRol(usuarioId, direccionId)) === 'dueño';

module.exports = { getRol, esMiembro, esDueno };
