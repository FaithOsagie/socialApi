// src/app.js
// ============================================================
// EXPRESS APP SETUP
// ============================================================

const express       = require('express');
const cors          = require('cors');
const path          = require('path');

require('dotenv').config();

const authRoutes      = require('./routes/authRoutes');
const postRoutes      = require('./routes/postRoutes');
const userRoutes      = require('./routes/userRoutes');
const errorHandler    = require('./middleware/errorHandler');
const requestLogger   = require('./middleware/requestLogger');

const app        = express();
const publicPath = path.join(__dirname, '..', 'public');

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(requestLogger);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the public frontend
app.use(express.static(publicPath));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth',  authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Nexly API is running 🚀' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use(errorHandler);

module.exports = app;