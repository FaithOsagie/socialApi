// ============================================================
// TEST DATABASE SETUP
// ============================================================
// Uses mongodb-memory-server to spin up a real MongoDB instance
// in memory — no external MongoDB needed to run tests.
// ============================================================

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

let mongoServer;

/**
 * Start the in-memory MongoDB server and connect Mongoose.
 * Called in beforeAll() in each test file.
 */
const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Clear all collections between tests.
 * Called in beforeEach() to ensure test isolation.
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnect and stop the in-memory server.
 * Called in afterAll() in each test file.
 */
const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = { connectTestDB, clearTestDB, disconnectTestDB };