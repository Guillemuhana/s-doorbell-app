// ============================================
// S-DOORBELL - Server Entry Point
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { checkSupabase } = require('./config/supabase');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuarios');
const eventoRoutes = require('./routes/eventos');
const notificacionRoutes = require('./routes/notificaciones');
const visitorRoutes = require('./routes/visitor');
const direccionRoutes = require('./routes/direcciones');
const timbreRoutes = require('./routes/timbres');
const invitacionRoutes = require('./routes/invitaciones');
const callRoutes = require('./routes/calls');
const pushRoutes = require('./routes/push');

const app = express();

// ─── Verificar conexión a Supabase ───────────────────────────────────────────
checkSupabase()
  .then(() => logger.info('✅ Supabase conectado'))
  .catch((e) => logger.error('❌ Supabase no disponible:', e.message));

// ─── Security Middleware ──────────────────────────────────────────────────────
// La CSP por defecto de helmet es `script-src 'self'`, que BLOQUEA todo script
// escrito dentro del HTML. La página del visitante (visitor-web/index.html) es
// justamente scripts inline + manejadores onclick, así que con la CSP por
// defecto Safari no ejecuta NADA y la página queda clavada en "Cargando timbre".
// (Ojo: curl y los simuladores no aplican CSP, sólo un navegador real → el bug
// sólo se ve en el teléfono.) Además la foto de la casa vive en Supabase Storage,
// que `img-src 'self'` también bloquea.
// Este backend sólo sirve esa página estática + JSON, así que relajar script-src
// a inline es de alcance acotado; el escape de datos (escapeHtml) sigue siendo la
// defensa real contra XSS.
const cspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...cspDefaults,
      'script-src': ["'self'", "'unsafe-inline'"],
      'script-src-attr': ["'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https:'],
      'media-src': ["'self'", 'https:', 'data:'],
    },
  },
}));

// APP_BASE_URL = origen del PWA (la app del residente, servida aparte).
// Se filtran los vacíos: un undefined en la lista hace que `cors` rechace todo.
const allowedOrigins = [
  process.env.VISITOR_BASE_URL,
  process.env.BASE_URL,
  process.env.APP_BASE_URL,
].filter(Boolean);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  // El signaling de videollamada hace polling frecuente: tiene su propio limiter.
  skip: (req) => req.path.startsWith('/api/calls'),
});

const ringLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: { error: 'Límite de timbrazos alcanzado, espera un minuto.' },
});

// Polling de signaling: límite alto (cada lado consulta cada ~1.5s).
const callLimiter = rateLimit({
  windowMs: 60000,
  max: 240,
  message: { error: 'Demasiadas solicitudes de llamada.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Iniciar videollamada: límite estricto (genera push a los residentes).
const callStartLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: { error: 'Límite de llamadas alcanzado, espera un minuto.' },
});

app.use(globalLimiter);

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ─────────────────────────────────────────────────────────────
// (Las imágenes ahora viven en Supabase Storage; no se sirve /uploads.)
// visitor-web puede estar dentro de backend (deploy) o como hermano (local).
const fs = require('fs');
const VISITOR_DIR = fs.existsSync(path.join(__dirname, 'visitor-web'))
  ? path.join(__dirname, 'visitor-web')
  : path.join(__dirname, '../visitor-web');
app.use('/visit', express.static(VISITOR_DIR));
// SPA fallback: cualquier /visit/:qrId sirve la página del visitante
app.get('/visit/:qrId', (req, res) => {
  res.sendFile(path.join(VISITOR_DIR, 'index.html'));
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/timbres', timbreRoutes);
app.use('/api/invitaciones', invitacionRoutes);
app.use('/api/visitor', ringLimiter, visitorRoutes);
app.use('/api/calls/start', callStartLimiter);
app.use('/api/calls', callLimiter, callRoutes);
app.use('/api/push', pushRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'S-Doorbell API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
// En Vercel (serverless) NO se llama listen: se exporta la app como handler.
// En local / Render (servidor persistente) sí se levanta el puerto.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    logger.info(`🚀 S-Doorbell API running on port ${PORT} [${process.env.NODE_ENV}]`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => { logger.info('Server closed.'); process.exit(0); });
  });
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
