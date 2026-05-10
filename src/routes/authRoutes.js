// ============================================================
// AUTH ROUTES
// ============================================================
// These routes handle user registration and login.
// No authentication required — these are public endpoints.
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');

// POST /api/auth/register
// Validate the request body first, then call the register controller.
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), login);

module.exports = router;