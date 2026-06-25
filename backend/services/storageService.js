// services/storageService.js
// Sube/borra imágenes en Supabase Storage (bucket "fotos"). Sirve en serverless (Vercel).
const { randomUUID } = require('crypto');
const { getSupabase } = require('../config/supabase');

const BUCKET = 'fotos';

const extFromMime = (mime) =>
  mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

/**
 * Sube un buffer de imagen y devuelve la URL pública.
 */
const uploadImagen = async (buffer, mimetype) => {
  const sb = getSupabase();
  const filePath = `${randomUUID()}.${extFromMime(mimetype)}`;
  const { error } = await sb.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: mimetype || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Borra una imagen por su URL pública (best-effort).
 */
const borrarImagen = async (url) => {
  if (!url) return;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const filePath = url.slice(idx + marker.length).split('?')[0];
  try {
    await getSupabase().storage.from(BUCKET).remove([filePath]);
  } catch (_) { /* best-effort */ }
};

module.exports = { uploadImagen, borrarImagen };
