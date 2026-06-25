// scripts/seed-supabase.js
// Siembra datos demo en Supabase. Uso: npm run seed:supabase
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/supabase');
const { generateQRDataURL } = require('../services/qrService');

const NIL = '00000000-0000-0000-0000-000000000000';

const seed = async () => {
  const sb = getSupabase();

  // Limpiar (hijos → padres). Los FK son on delete cascade, pero por las dudas en orden.
  for (const t of ['eventos', 'invitaciones', 'memberships', 'timbres', 'direcciones', 'usuarios']) {
    await sb.from(t).delete().neq('id', NIL);
  }
  console.log('🧹 Tablas limpiadas');

  const hash = (p) => bcrypt.hash(p, 12);

  // Usuarios
  const [juanH, mariaH, guiH] = await Promise.all([hash('demo1234'), hash('demo1234'), hash('Gmuhana6')]);
  const { data: juan } = await sb.from('usuarios').insert({ nombre: 'Juan', apellido: 'Pérez', email: 'juan@demo.com', password: juanH, telefono: '+54 9 11 1234-5678' }).select().single();
  const { data: maria } = await sb.from('usuarios').insert({ nombre: 'María', apellido: 'González', email: 'maria@demo.com', password: mariaH }).select().single();
  const { data: guillem } = await sb.from('usuarios').insert({ nombre: 'Guillem', apellido: 'Muhana', email: 'guillemuhana@gmail.com', password: guiH }).select().single();

  // Dirección de Juan + María como familiar
  const { data: balcarce } = await sb.from('direcciones').insert({ owner_id: juan.id, nombre: 'Balcarce 50', tipo: 'Casa', direccion: 'Balcarce 50, CABA' }).select().single();
  await sb.from('memberships').insert([
    { usuario_id: juan.id, direccion_id: balcarce.id, rol: 'dueño' },
    { usuario_id: maria.id, direccion_id: balcarce.id, rol: 'familiar' },
  ]);
  const { data: timbre } = await sb.from('timbres').insert({ direccion_id: balcarce.id, nombre: 'Puerta', tipo: 'Timbre particular' }).select().single();
  const qr = await generateQRDataURL(timbre.qr_id);
  if (qr.success) await sb.from('timbres').update({ qr_image: qr.dataURL }).eq('id', timbre.id);

  // Casa de Guillem
  const { data: casaG } = await sb.from('direcciones').insert({ owner_id: guillem.id, nombre: 'Mi casa', tipo: 'Casa' }).select().single();
  await sb.from('memberships').insert({ usuario_id: guillem.id, direccion_id: casaG.id, rol: 'dueño' });
  const { data: timbreG } = await sb.from('timbres').insert({ direccion_id: casaG.id, nombre: 'Puerta' }).select().single();
  const qrG = await generateQRDataURL(timbreG.qr_id);
  if (qrG.success) await sb.from('timbres').update({ qr_image: qrG.dataURL }).eq('id', timbreG.id);

  console.log('\n🌱 Seed Supabase completo:');
  console.log('   • juan@demo.com / demo1234  (dueño Balcarce 50)');
  console.log('   • maria@demo.com / demo1234 (familiar)');
  console.log('   • guillemuhana@gmail.com / Gmuhana6 (dueño Mi casa)');
  console.log(`   QR demo: ${timbre.qr_id}`);
  process.exit(0);
};

seed().catch((e) => { console.error('❌ Seed falló:', e.message || e); process.exit(1); });
