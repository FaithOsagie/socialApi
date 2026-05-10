// ============================================================
// PAGINATION HELPER
// ============================================================
// Pagination splits large datasets into smaller "pages".
// Without pagination, fetching all posts could be very slow.
//
// How it works:
//   - Client sends: ?page=2&limit=10
//   - We calculate: skip = (2 - 1) * 10 = 10
//   - MongoDB query: .skip(10).limit(10)
//   - This returns posts 11–20 (the second page of 10)
// ============================================================

/**
 * Parse pagination parameters from request query string.
 * @param {object} query - req.query from Express
 * @param {number} defaultLimit - fallback limit (default: 20)
 * @returns {{ page, limit, skip }}
 */
const getPagination = (query, defaultLimit = 20) => {
  // parseInt converts strings to numbers.
  // The '|| default' handles cases where the value is missing or invalid.
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build the pagination metadata object to include in responses.
 * @param {number} total - total number of documents matching the query
 * @param {number} page - current page
 * @param {number} limit - items per page
 * @returns {object} pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    total_pages: totalPages,
    has_next_page: page < totalPages,
    has_prev_page: page > 1,
  };
};

module.exports = { getPagination, buildPaginationMeta };