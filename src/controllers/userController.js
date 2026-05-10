// ============================================================
// USER CONTROLLER
// ============================================================
// Handles user-related operations:
//   - Follow/unfollow users
//   - Get followers
//   - Get following
//   - Get user profile
// ============================================================

const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// ============================================================
// GET /api/users/:username — Get a user's public profile
// ============================================================
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) return sendError(res, 404, 'User not found.');

    return sendSuccess(res, 200, 'User profile retrieved.', user.toPublicJSON());
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// POST /api/users/:userId/follow — Follow a user
// ============================================================
const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id.toString();

    // Prevent following yourself
    if (targetUserId === currentUserId) {
      return sendError(res, 400, 'You cannot follow yourself.');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return sendError(res, 404, 'User not found.');

    // Prevent following the same user twice
    if (req.user.following.some((id) => id.toString() === targetUserId)) {
      return sendError(res, 409, 'You are already following this user.');
    }

    // Update both users atomically:
    // - Add targetUser to current user's "following" list
    // - Add current user to targetUser's "followers" list
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $push: { following: targetUserId } }),
      User.findByIdAndUpdate(targetUserId, { $push: { followers: currentUserId } }),
    ]);

    return sendSuccess(res, 200, `You are now following ${targetUser.username}.`);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid user ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// DELETE /api/users/:userId/follow — Unfollow a user
// ============================================================
const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id.toString();

    if (targetUserId === currentUserId) {
      return sendError(res, 400, 'You cannot unfollow yourself.');
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return sendError(res, 404, 'User not found.');

    // Check that the user is actually being followed
    if (!req.user.following.some((id) => id.toString() === targetUserId)) {
      return sendError(res, 409, 'You are not following this user.');
    }

    // Remove from both lists
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }),
      User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } }),
    ]);

    return sendSuccess(res, 200, `You have unfollowed ${targetUser.username}.`);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid user ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// GET /api/users/:userId/following — Users this person follows
// ============================================================
const getFollowing = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20);

    const user = await User.findById(req.params.userId).populate(
      'following',
      'first_name last_name username createdAt'
    );

    if (!user) return sendError(res, 404, 'User not found.');

    // Manual pagination on the populated array
    const total = user.following.length;
    const paginated = user.following.slice(skip, skip + limit);

    return sendPaginated(
      res,
      200,
      'Following list retrieved.',
      paginated,
      buildPaginationMeta(total, page, limit)
    );
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid user ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// GET /api/users/:userId/followers — Users who follow this person
// ============================================================
const getFollowers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20);

    const user = await User.findById(req.params.userId).populate(
      'followers',
      'first_name last_name username createdAt'
    );

    if (!user) return sendError(res, 404, 'User not found.');

    const total = user.followers.length;
    const paginated = user.followers.slice(skip, skip + limit);

    return sendPaginated(
      res,
      200,
      'Followers list retrieved.',
      paginated,
      buildPaginationMeta(total, page, limit)
    );
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid user ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
};