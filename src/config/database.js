// src/config/database.js
// ============================================================
// DATABASE CONFIGURATION
// ============================================================
// This file handles connecting to MongoDB using Mongoose.
// Mongoose is an ODM (Object Document Mapper) — it lets us
// interact with MongoDB using JavaScript objects instead of
// raw MongoDB queries.
// ============================================================

const mongoose = require('mongoose');

// connectDB is an async function because connecting to a
// database takes time (it's a network operation).
const connectDB = async (uri) => {
  try {
    // mongoose.connect() returns a promise, so we await it.
    // The URI tells Mongoose where to find our MongoDB database.
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and exit the process.
    // We exit because the app can't work without a database.
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;