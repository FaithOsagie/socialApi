// src/routes/postRoutes.js
// ============================================================
// POST ROUTES
// ============================================================
// Route definitions for all post-related endpoints.
//
// PUBLIC (no token needed):
//   GET  /api/posts        — all published posts
//   GET  /api/posts/:id    — single published post
//
// PRIVATE (token required):
//   GET    /api/posts/me         — owner's own posts
//   POST   /api/posts            — create post (draft)
//   PATCH  /api/posts/:id/publish — publish a post
//   PUT    /api/posts/:id        — update post
//   DELETE /api/posts/:id        — delete post
//   POST   /api/posts/:id/like   — like a post
//   DELETE /api/posts/:id/like   — unlike a post
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getPublishedPosts,
  getPostById,
  getMyPosts,
  createPost,
  publishPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} = require('../controllers/postController');

const { protect } = require('../middleware/auth');
const { validate, postSchema, updatePostSchema } = require('../middleware/validate');

// IMPORTANT: /me must come BEFORE /:id
// Express matches routes top-to-bottom.
// If /:id came first, "me" would be treated as an ID.
router.get('/me', protect, getMyPosts);

// Public routes
router.get('/', getPublishedPosts);
router.get('/:id', getPostById);

// Protected routes — require authentication
router.post('/', protect, validate(postSchema), createPost);
router.patch('/:id/publish', protect, publishPost);
router.put('/:id', protect, validate(updatePostSchema), updatePost);
router.delete('/:id', protect, deletePost);

// Like/unlike
router.post('/:id/like', protect, likePost);
router.delete('/:id/like', protect, unlikePost);

module.exports = router;