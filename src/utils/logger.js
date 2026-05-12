// ============================================================
// WINSTON LOGGER
// ============================================================

const winston = require('winston');
const path    = require('path');

// Decide what level to log based on environment.
// In production we skip 'debug' and 'http' to keep logs clean.
const level = () => {
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
};

// ── Colours for console output in development ──
const colours = {
  error: 'red',
  warn:  'yellow',
  info:  'green',
  http:  'magenta',
  debug: 'cyan',
};
winston.addColors(colours);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp}  ${level}  ${message}`;
  })
);

// ── Format for log files (production) ──
// JSON format — easier to parse and search
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // include stack trace on errors
  winston.format.json()
);

const transports = [];

transports.push(
  new winston.transports.Console({ format: consoleFormat })
);

if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(process.cwd(), 'logs');

  transports.push(
    // Errors only
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      format:   fileFormat,
    }),
    // Everything
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format:   fileFormat,
    })
  );
}

// ── Create and export the logger ──
const logger = winston.createLogger({
  level:      level(),
  transports,
  exitOnError: false,
});

module.exports = logger;