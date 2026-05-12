// src/middleware/errorHandler.js
// ============================================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================================
// Catches any error passed to next(error) from any route.
// Now uses Winston to log errors so they are recorded properly
// in production instead of just printing to console.
// ============================================================

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the full error — Winston writes this to error.log in production
  logger.error(`${err.message} | ${req.method} ${req.originalUrl}`, {
    stack:      err.stack,
    statusCode: err.statusCode || 500,
  });

  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Internal Server Error';

  // Mongoose duplicate field (e.g. email or username already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message    = `${field} already exists. Please use a different value.`;
    statusCode = 409;
  }

  // Mongoose validation error (e.g. required field missing)
  if (err.name === 'ValidationError') {
    message    = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 400;
  }

  // Mongoose CastError (e.g. invalid ObjectId in URL)
  if (err.name === 'CastError') {
    message    = `Invalid value for field: ${err.path}`;
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;