// src/server.js
// ============================================================
// SERVER ENTRY POINT
// ============================================================

require('dotenv').config();

const app       = require('./app');
const connectDB = require('./config/database');
const logger    = require('./utils/logger');

const PORT        = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexly';

const startServer = async () => {
  await connectDB(MONGODB_URI);

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

// Handle unexpected errors that were never caught anywhere else.
// Without this, the process would crash silently.
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

startServer();