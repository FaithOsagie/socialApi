// ============================================================
// POST MODEL
// ============================================================
// This defines what a "post" looks like in our database.
// Posts can be in 'draft' or 'published' state.
// Posts also track likes (to prevent double-liking).
// ============================================================

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
    },

    // The author field is a reference to a User document.
    // This is called a "foreign key" in relational databases.
    // We can use .populate('author') to get the full user object.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Tags help with searching and filtering.
    // E.g., ['javascript', 'nodejs', 'tutorial']
    tags: {
      type: [String],
      default: [],
    },

    // Posts start as 'draft' by default.
    // Only the post owner can change it to 'published'.
    state: {
      type: String,
      enum: ['draft', 'published'], // only these two values are allowed
      default: 'draft',
    },

    // We store likes as an array of User IDs.
    // This lets us:
    //   1. Count likes easily (likes.length)
    //   2. Check if a user already liked a post (prevent duplicates)
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // like_count and comment_count are virtual-like fields
    // but we store them directly for easy sorting.
    // We update them whenever likes/comments change.
    like_count: {
      type: Number,
      default: 0,
    },

    comment_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ============================================================
// INDEXES
// ============================================================
// Indexes speed up database queries.
// We index the fields we search and sort by most often.
// ============================================================
postSchema.index({ state: 1 });
postSchema.index({ author: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ like_count: -1 });
postSchema.index({ comment_count: -1 });
postSchema.index({ createdAt: -1 });

// Text index allows full-text search on title and tags.
// This powers the "search by title/tags" feature.
postSchema.index({ title: 'text', tags: 'text' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;