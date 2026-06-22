// scripts/seed.js
// Datos demo para desarrollo local. Uso: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');

const Usuario = require('../models/Usuario');
const Direccion = require('../models/Direccion');
const Membership = require('../models/Membership');
const Timbre = require('../models/Timbre');
const Invitacion = require('../models/Invitacion');
const Evento = require('../models/Evento');
const { generateQRDataURL } = require('../services/qrService');

// Siembra los datos demo. Asume que mongoose YA está conectado.
const seedDatabase = async () => {
  // Limpiar
  await Promise.all([
    Usuario.deleteMany({}),
    Direccion.deleteMany({}),
    Membership.deleteMany({}),
    Timbre.deleteMany({}),
    Invitacion.deleteMany({}),
    Evento.deleteMany({}),
  ]);
  console.log('🧹 Colecciones limpiadas');

  // Usuarios (el hash de password lo hace el pre-save hook)
  const juan = await Usuario.create({
    nombre: 'Juan', apellido: 'Pérez', email: 'juan@demo.com',
    password: 'demo1234', telefono: '+54 9 11 1234-5678',
  });
  const maria = await Usuario.create({
    nombre: 'María', apellido: 'González', email: 'maria@demo.com',
    password: 'demo1234', telefono: '+54 9 11 8765-4321',
  });

  // Dirección de Juan
  const balcarce = await Direccion.create({
    owner: juan._id, nombre: 'Balcarce 50', tipo: 'Casa',
    direccion: 'Balcarce 50, CABA', activa: true,
  });

  // Memberships: Juan dueño, María familiar
  await Membership.create({ usuario: juan._id, direccion: balcarce._id, rol: 'dueño' });
  await Membership.create({ usuario: maria._id, direccion: balcarce._id, rol: 'familiar' });

  // Timbre con QR
  const timbre = await Timbre.create({
    direccion: balcarce._id, nombre: 'Puerta', tipo: 'Timbre particular',
  });
  const qr = await generateQRDataURL(timbre.qrId);
  if (qr.success) { timbre.qrImage = qr.dataURL; await timbre.save(); }

  // Una segunda dirección solo de Juan
  const oficina = await Direccion.create({
    owner: juan._id, nombre: 'Oficina Centro', tipo: 'Oficina',
    direccion: 'Av. Corrientes 1234, CABA', activa: true,
  });
  await Membership.create({ usuario: juan._id, direccion: oficina._id, rol: 'dueño' });
  const timbreOf = await Timbre.create({ direccion: oficina._id, nombre: 'Recepción' });
  const qr2 = await generateQRDataURL(timbreOf.qrId);
  if (qr2.success) { timbreOf.qrImage = qr2.dataURL; await timbreOf.save(); }

  // Invitación pendiente
  await Invitacion.create({
    direccion: balcarce._id, invitadoPor: juan._id,
    email: 'tio@demo.com', rol: 'familiar',
  });

  // Algunos eventos de timbrazo
  await Evento.create([
    { userId: juan._id, direccionId: balcarce._id, timbreId: timbre._id, tipo: 'timbrazo', visitorName: 'Cartero', notificationSent: true },
    { userId: juan._id, direccionId: balcarce._id, timbreId: timbre._id, tipo: 'timbrazo', visitorName: 'Pedido Ya', notificationSent: true },
  ]);

  console.log('\n🌱 Seed completo:');
  console.log('   Usuarios:');
  console.log('     • juan@demo.com  / demo1234  (dueño de 2 direcciones)');
  console.log('     • maria@demo.com / demo1234  (familiar en Balcarce 50)');
  console.log(`   Dirección demo: "Balcarce 50" con timbre "Puerta"`);
  console.log(`   QR de prueba (qrId): ${timbre.qrId}`);
  console.log(`   Visitor URL: ${process.env.VISITOR_BASE_URL}/${timbre.qrId}\n`);

  return { qrId: timbre.qrId };
};

module.exports = { seedDatabase };

// CLI: npm run seed → conecta a MONGODB_URI, siembra y desconecta.
if (require.main === module) {
  (async () => {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Falta MONGODB_URI en .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Conectado a MongoDB');
    await seedDatabase();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error('❌ Seed falló:', err);
    process.exit(1);
  });
}
