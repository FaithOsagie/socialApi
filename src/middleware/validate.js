// src/middleware/validate.js
// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================
// Validation checks that incoming request data is correct
// BEFORE it reaches our controllers. This keeps controllers
// clean and catches bad data early.
//
// We use the "joi" library which makes validation rules
// easy to read and write.
// ============================================================

const Joi = require('joi');
const { sendError } = require('../utils/response');

// ============================================================
// VALIDATION SCHEMAS
// ============================================================
// A schema defines the rules for valid data.
// For example: email must be a valid email, password min 6 chars.
// ============================================================

// Rules for signing up
const registerSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  username: Joi.string().alphanum().min(4).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Rules for signing in
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Rules for creating or updating a post
const postSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
  tags: Joi.array().items(Joi.string()).default([]),
});

// Rules for updating a post (all fields optional)
const updatePostSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  content: Joi.string().min(1),
  tags: Joi.array().items(Joi.string()),
});

// ============================================================
// VALIDATE MIDDLEWARE FACTORY
// ============================================================
// This is a "higher-order function" — a function that returns
// another function. We call it with a schema, and it gives
// back an Express middleware function.
//
// Usage: router.post('/register', validate(registerSchema), controller)
// ============================================================
const validate = (schema) => {
  return (req, res, next) => {
    // Joi validates req.body against our schema.
    // abortEarly: false means we return ALL errors at once, not just the first.
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Collect all error messages into a readable string.
      const message = error.details.map((d) => d.message).join(', ');
      return sendError(res, 400, message);
    }

    // If validation passes, replace req.body with the cleaned/validated value.
    // This removes any extra fields the user may have sent.
    req.body = value;
    next(); // move to the next middleware or controller
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  postSchema,
  updatePostSchema,
};