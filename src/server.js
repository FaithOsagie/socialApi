// src/server.js
// ============================================================
// SERVER ENTRY POINT
// ============================================================
// This file connects to the database and starts the HTTP server.
// We keep this separate from app.js so tests can use app.js
// without starting a real server.
// ============================================================

require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social_media_api';

// Connect to MongoDB first, then start the server.
// We don't want the server accepting requests before the DB is ready.
const startServer = async () => {
  await connectDB(MONGODB_URI);

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();