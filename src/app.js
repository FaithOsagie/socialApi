// ============================================================
// EXPRESS APP SETUP
// ============================================================
// This is the heart of the application.
// It sets up Express, registers middleware, and mounts routes.
// We export the app separately so tests can use app.js
// without starting the actual server.
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Load environment variables from .env file into process.env.
// This must be done before importing anything that uses process.env.
require('dotenv').config();

const authRoutes  = require('./routes/authRoutes');
const postRoutes  = require('./routes/postRoutes');
const userRoutes  = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

// Create the Express application
const app = express();

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

// Enable CORS so the frontend can call the API from any origin.
// In production, replace '*' with your actual domain.
app.use(cors());

// Parse incoming JSON request bodies (e.g., req.body)
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Serve the public frontend from the /public folder.
// Opening http://localhost:3000 loads the Nexly UI.
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth',  authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Root health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Nexly API is running 🚀' });
});

// 404 handler — runs when no route matched
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ============================================================
// GLOBAL ERROR HANDLER — must be last
// ============================================================
app.use(errorHandler);

module.exports = app;