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

const connectDB = require('./config/database');
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

const app = express();

// ─── Connect Database ────────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.VISITOR_BASE_URL, process.env.BASE_URL]
    : '*',
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
});

const ringLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: { error: 'Límite de timbrazos alcanzado, espera un minuto.' },
});

app.use(globalLimiter);

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/visit', express.static(path.join(__dirname, '../visitor-web')));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/direcciones', direccionRoutes);
app.use('/api/timbres', timbreRoutes);
app.use('/api/invitaciones', invitacionRoutes);
app.use('/api/visitor', ringLimiter, visitorRoutes);

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
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 S-Doorbell API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = app;
