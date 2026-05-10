// ============================================================
// USER ROUTES
// ============================================================
// Route definitions for user-related endpoints.
//
// PUBLIC:
//   GET  /api/users/:username           — view public profile
//   GET  /api/users/:userId/following   — users they follow
//   GET  /api/users/:userId/followers   — users following them
//
// PRIVATE (token required):
//   POST   /api/users/:userId/follow    — follow a user
//   DELETE /api/users/:userId/follow    — unfollow a user
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');

// Public routes
router.get('/:username', getUserProfile);
router.get('/:userId/following', getFollowing);
router.get('/:userId/followers', getFollowers);

// Protected routes
router.post('/:userId/follow', protect, followUser);
router.delete('/:userId/follow', protect, unfollowUser);

module.exports = router;