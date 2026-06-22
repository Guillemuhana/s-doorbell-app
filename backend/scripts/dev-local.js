// scripts/dev-local.js
// Levanta TODO el stack en local sin instalar nada: MongoDB en memoria + seed + API.
// Uso: npm run dev:local
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// IP LAN para que el celular alcance el backend y los QR apunten bien.
const LAN_IP = process.env.LAN_IP || '192.168.0.184';
const PORT = process.env.PORT || '5000';

(async () => {
  console.log('⏳ Iniciando MongoDB en memoria...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Definir env ANTES de requerir el server (dotenv no pisa lo ya seteado).
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'development';
  process.env.PORT = PORT;
  process.env.BASE_URL = `http://${LAN_IP}:${PORT}`;
  process.env.VISITOR_BASE_URL = `http://${LAN_IP}:${PORT}/visit`;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_local_secret_minimo_de_32_caracteres_ok';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  console.log(`✅ MongoDB en memoria: ${uri}`);

  // Conectar y sembrar
  await mongoose.connect(uri);
  const { seedDatabase } = require('./seed');
  await seedDatabase();

  // Arrancar el server (usa la misma conexión / env)
  require('../server');

  console.log('\n🚀 Stack local listo:');
  console.log(`   API:        http://localhost:${PORT}  (LAN: http://${LAN_IP}:${PORT})`);
  console.log(`   Health:     http://localhost:${PORT}/health`);
  console.log('   Login demo: juan@demo.com / demo1234');
  console.log('   (Ctrl+C para detener y limpiar la base en memoria)\n');

  const shutdown = async () => {
    console.log('\n🧹 Cerrando...');
    await mongoose.disconnect().catch(() => {});
    await mongod.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error('❌ dev:local falló:', err);
  process.exit(1);
});
