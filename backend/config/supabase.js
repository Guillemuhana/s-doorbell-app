// config/supabase.js
// Cliente Supabase del backend (usa la SERVICE ROLE KEY → acceso total, sin RLS).
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase = null;

const getSupabase = () => {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el .env');
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  logger.info('✅ Supabase client inicializado');
  return supabase;
};

// Verifica conexión haciendo un conteo trivial.
const checkSupabase = async () => {
  const sb = getSupabase();
  const { error } = await sb.from('usuarios').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return true;
};

module.exports = { getSupabase, checkSupabase };
