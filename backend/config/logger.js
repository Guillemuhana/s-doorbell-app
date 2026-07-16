// config/logger.js
const winston = require('winston');
const path = require('path');

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// En serverless (Vercel/Lambda) el filesystem es de solo lectura salvo /tmp, y
// winston crea la carpeta al instanciar un transporte de archivo → la función
// crashea al arrancar (ENOENT mkdir '/var/task/backend/logs'). Ahí el log tiene
// que ir a stdout, que es lo que la plataforma recolecta.
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isProduction = process.env.NODE_ENV === 'production';

const transports = [];

if (isServerless) {
  transports.push(new winston.transports.Console());
} else {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  if (!isProduction) {
    transports.push(new winston.transports.Console({
      format: combine(colorize(), simple()),
    }));
  }
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  transports,
});

module.exports = logger;
