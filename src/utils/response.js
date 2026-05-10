// ============================================================
// RESPONSE HELPERS
// ============================================================
// These functions create consistent JSON response shapes.
// Every API response will look the same, which makes it easier
// for frontend developers to work with our API.
//
// Success shape:  { success: true,  data: {...},    message: '...' }
// Error shape:    { success: false, error: '...',   message: '...' }
// ============================================================

/**
 * Send a success response.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (e.g., 200, 201)
 * @param {string} message - Human-readable message
 * @param {object|array} data - The actual response data
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Send an error response.
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
 * @param {string} message - Human-readable error message
 */
const sendError = (res, statusCode = 500, message = 'Something went wrong') => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Build a paginated response object.
 * This attaches pagination metadata so clients know
 * how many pages exist, what page they're on, etc.
 */
const sendPaginated = (res, statusCode = 200, message = 'Success', data, pagination) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };