// ============================================================
// JWT UTILITY
// ============================================================
// JWT (JSON Web Token) is how we handle authentication.
// When a user logs in, we generate a token and send it back.
// The user sends this token with every future request.
// We verify the token to know WHO is making the request.
//
// A JWT looks like: xxxxx.yyyyy.zzzzz
//   - Header (algorithm info)
//   - Payload (user data like id)
//   - Signature (proves the token hasn't been tampered with)
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user.
 * @param {string} userId - The user's MongoDB _id
 * @returns {string} - A signed JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },          // payload — data stored inside the token
    process.env.JWT_SECRET,  // secret key used to sign the token
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // token expires in 1 hour
  );
};

/**
 * Verify a JWT token and return the decoded payload.
 * @param {string} token - The JWT token string
 * @returns {object} - Decoded payload (contains user id)
 */
const verifyToken = (token) => {
  // This throws an error if the token is invalid or expired.
  // We handle that error in our auth middleware.
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };