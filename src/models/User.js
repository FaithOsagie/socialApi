// ============================================================
// USER MODEL
// ============================================================
// A Mongoose model defines the shape (schema) of documents
// stored in a MongoDB collection.
// Think of a schema like a blueprint for your data.
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- Define the Schema ---
// A schema describes the fields and their rules.
const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, 'First name is required'],
      trim: true, // removes leading/trailing whitespace
    },

    last_name: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true, // no two users can have the same username
      trim: true,
      lowercase: true, // always stored in lowercase
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      // select: false means password won't be returned in queries by default.
      // This is a security measure — we don't want to expose hashed passwords.
      select: false,
    },

    // "following" stores the IDs of users this person follows.
    // It's an array of references to other User documents.
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // "followers" stores the IDs of users who follow this person.
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields.
    timestamps: true,
  }
);

// ============================================================
// PRE-SAVE HOOK — Hash the password before saving
// ============================================================
// This middleware runs automatically BEFORE a user is saved.
// We hash the password here so we never store plain text passwords.
// Hashing is one-way — you can't reverse it to get the original password.
// ============================================================
userSchema.pre('save', async function (next) {
  // Only hash the password if it was changed (or is new).
  // This prevents re-hashing on every save (e.g., when updating email).
  if (!this.isModified('password')) return next();

  // bcrypt adds a "salt" (random data) before hashing.
  // The number 12 is the "salt rounds" — higher = more secure but slower.
  // 12 is a good balance for production.
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ============================================================
// INSTANCE METHOD — Compare passwords
// ============================================================
// We add a custom method to every User document.
// This lets us do: user.comparePassword('plaintext') → true/false
// ============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare hashes the candidate and compares it to the stored hash.
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================
// INSTANCE METHOD — Convert to safe public object
// ============================================================
// This removes the password and sensitive fields before sending to client.
// We call this when building API responses.
// ============================================================
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    first_name: this.first_name,
    last_name: this.last_name,
    username: this.username,
    email: this.email,
    following_count: this.following.length,
    followers_count: this.followers.length,
    createdAt: this.createdAt,
  };
};

// Create and export the model.
// 'User' is the model name — Mongoose will create a 'users' collection.
const User = mongoose.model('User', userSchema);

module.exports = User;