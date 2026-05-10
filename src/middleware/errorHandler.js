// ============================================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================================
// In Express, if any route or middleware throws an error or
// calls next(error), it ends up here.
//
// This is a "catch-all" — it handles errors we didn't anticipate
// and gives a consistent error response format.
//
// To use it, it MUST be registered LAST in app.js (after all routes).
// It's recognized as an error handler because it has 4 parameters:
//   (err, req, res, next)
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Log the full error in development so we can debug it
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Error:', err.message);
  }

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // --- Handle specific Mongoose/MongoDB errors ---

  // Duplicate field (e.g., username or email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists. Please use a different value.`;
    statusCode = 409; // 409 Conflict
  }

  // Mongoose validation error (e.g., required field missing)
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    statusCode = 400;
  }

  // Mongoose CastError (e.g., invalid MongoDB ObjectId in URL)
  if (err.name === 'CastError') {
    message = `Invalid value for field: ${err.path}`;
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    // Only show the full error stack in development — never in production
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;