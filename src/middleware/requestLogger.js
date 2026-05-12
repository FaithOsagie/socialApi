// src/middleware/requestLogger.js
// ============================================================
// MORGAN HTTP REQUEST LOGGER
// ============================================================
// ============================================================

const morgan = require('morgan');
const logger = require('../utils/logger');

// Create a stream object that Morgan writes into.
// Instead of going to stdout directly, each line is handed
// to Winston's http level so everything stays together.
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

// Skip logging in test environment — keeps test output clean
const skip = () => process.env.NODE_ENV === 'test';

const requestLogger = morgan(format, { stream, skip });

module.exports = requestLogger;