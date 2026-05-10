// ============================================================
// POST CONTROLLER
// ============================================================
// Handles all CRUD operations for posts:
//   - Creating posts (draft by default)
//   - Publishing posts
//   - Editing posts
//   - Deleting posts
//   - Getting all published posts (public)
//   - Getting a single post (public)
//   - Getting own posts (private, owner only)
//   - Liking/unliking posts
// ============================================================

const Post = require('../models/Post');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// ============================================================
// HELPER — Build the query filter for posts
// ============================================================
// Centralizes the logic for filtering, searching, and sorting.
// Called by getPublishedPosts and getMyPosts.
// ============================================================
const buildPostQuery = (queryParams, baseFilter = {}) => {
  const filter = { ...baseFilter };

  // --- Filtering by state ---
  // ?state=published or ?state=draft
  if (queryParams.state && ['draft', 'published'].includes(queryParams.state)) {
    filter.state = queryParams.state;
  }

  // --- Searching ---
  // ?search=nodejs
  // MongoDB's $text search works on fields with a text index (title, tags).
  // ?author=username requires a separate lookup (handled in the controller).
  if (queryParams.search) {
    filter.$text = { $search: queryParams.search };
  }

  // --- Sorting ---
  // ?sort=like_count or ?sort=comment_count or ?sort=timestamp (default)
  let sortBy = { createdAt: -1 }; // default: newest first

  if (queryParams.sort === 'like_count') {
    sortBy = { like_count: -1 };
  } else if (queryParams.sort === 'comment_count') {
    sortBy = { comment_count: -1 };
  } else if (queryParams.sort === 'timestamp') {
    sortBy = { createdAt: -1 };
  }

  return { filter, sortBy };
};

// ============================================================
// GET /api/posts — All published posts (public)
// ============================================================
const getPublishedPosts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20); // default 20 per page
    let { filter, sortBy } = buildPostQuery(req.query, { state: 'published' });

    // --- Search by author username ---
    // ?author=john
    // This requires finding the user first, then filtering by their ID.
    if (req.query.author) {
      const author = await User.findOne({
        username: { $regex: req.query.author, $options: 'i' }, // case-insensitive
      });
      if (author) {
        filter.author = author._id;
      } else {
        // No matching author found — return empty results
        return sendPaginated(res, 200, 'Posts retrieved.', [], buildPaginationMeta(0, page, limit));
      }
    }

    // Run the count and find queries in parallel (faster than sequential)
    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter)
        .populate('author', 'first_name last_name username') // get author details
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .select('-likes'), // don't send the full likes array (just like_count)
    ]);

    return sendPaginated(
      res,
      200,
      'Posts retrieved successfully.',
      posts,
      buildPaginationMeta(total, page, limit)
    );
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// GET /api/posts/:id — Single published post (public)
// ============================================================
const getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      state: 'published',
    }).populate('author', 'first_name last_name username email createdAt');

    if (!post) {
      return sendError(res, 404, 'Post not found.');
    }

    return sendSuccess(res, 200, 'Post retrieved successfully.', post);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// GET /api/posts/me — Own posts (logged in owner only)
// ============================================================
const getMyPosts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20);
    // Build filter with current user as author
    const { filter, sortBy } = buildPostQuery(req.query, { author: req.user._id });

    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter).sort(sortBy).skip(skip).limit(limit).select('-likes'),
    ]);

    return sendPaginated(
      res,
      200,
      'Your posts retrieved successfully.',
      posts,
      buildPaginationMeta(total, page, limit)
    );
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// POST /api/posts — Create a new post
// ============================================================
// New posts always start as 'draft' — this is enforced in the model default.
const createPost = async (req, res) => {
  try {
    const { title, content, tags } = req.body;

    const post = await Post.create({
      title,
      content,
      tags,
      author: req.user._id, // set author to the logged-in user
      // 'state' defaults to 'draft' automatically (see model)
    });

    return sendSuccess(res, 201, 'Post created as draft.', post);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// PATCH /api/posts/:id/publish — Publish a draft post
// ============================================================
const publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return sendError(res, 404, 'Post not found.');

    // Only the post owner can publish it
    if (post.author.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'You can only publish your own posts.');
    }

    post.state = 'published';
    await post.save();

    return sendSuccess(res, 200, 'Post published successfully.', post);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// PUT /api/posts/:id — Update a post (draft or published)
// ============================================================
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return sendError(res, 404, 'Post not found.');

    // Only the post owner can edit it
    if (post.author.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'You can only edit your own posts.');
    }

    // Update only the fields that were provided
    const { title, content, tags } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags;

    await post.save();

    return sendSuccess(res, 200, 'Post updated successfully.', post);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// DELETE /api/posts/:id — Delete a post (draft or published)
// ============================================================
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return sendError(res, 404, 'Post not found.');

    // Only the post owner can delete it
    if (post.author.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'You can only delete your own posts.');
    }

    await post.deleteOne();

    return sendSuccess(res, 200, 'Post deleted successfully.');
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// POST /api/posts/:id/like — Like a post
// ============================================================
const likePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, state: 'published' });

    if (!post) return sendError(res, 404, 'Post not found.');

    // Check if user already liked this post.
    // post.likes is an array of user IDs.
    const alreadyLiked = post.likes.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyLiked) {
      return sendError(res, 409, 'You have already liked this post.');
    }

    // Add user to likes array and update the count
    post.likes.push(req.user._id);
    post.like_count = post.likes.length;
    await post.save();

    return sendSuccess(res, 200, 'Post liked.', { like_count: post.like_count });
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// DELETE /api/posts/:id/like — Unlike a post
// ============================================================
const unlikePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, state: 'published' });

    if (!post) return sendError(res, 404, 'Post not found.');

    const liked = post.likes.some((id) => id.toString() === req.user._id.toString());

    if (!liked) {
      return sendError(res, 409, 'You have not liked this post.');
    }

    // Remove user from likes array
    post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    post.like_count = post.likes.length;
    await post.save();

    return sendSuccess(res, 200, 'Post unliked.', { like_count: post.like_count });
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid post ID.');
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublishedPosts,
  getPostById,
  getMyPosts,
  createPost,
  publishPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
};