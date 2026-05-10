// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// This middleware protects routes that require a logged-in user.
//
// How authentication works:
//   1. User logs in → gets a JWT token
//   2. User sends token in the "Authorization" header on every request:
//      Authorization: Bearer <token>
//   3. This middleware extracts and verifies that token
//   4. If valid, it attaches the user to req.user
//   5. The controller can then use req.user to know who is logged in
// ============================================================

const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { sendError } = require('../utils/response');

/**
 * protect — Requires the user to be logged in.
 * Attach this to any route that requires authentication.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Check if the Authorization header exists and starts with "Bearer"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'No token provided. Please log in.');
    }

    // 2. Extract the token part (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    // 3. Verify the token — this will throw if expired or invalid
    const decoded = verifyToken(token);

    // 4. Find the user from the ID stored in the token
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 401, 'The user belonging to this token no longer exists.');
    }

    // 5. Attach the user to the request so controllers can use it
    req.user = user;

    next(); // authentication passed — move to the controller
  } catch (error) {
    // Handle specific JWT errors with helpful messages
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token. Please log in again.');
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Your session has expired. Please log in again.');
    }
    return sendError(res, 500, 'Authentication failed.');
  }
};

/**
 * optionalAuth — Allows both logged-in and anonymous users.
 * If a valid token is provided, req.user is set.
 * If no token or invalid token, req.user stays null (no error).
 *
 * Use this on public routes where we want to provide
 * extra info to logged-in users (e.g., whether they liked a post).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    req.user = user || null;
  } catch {
    // If token is invalid/expired, just treat as anonymous
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth };