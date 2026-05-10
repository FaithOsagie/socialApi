// ============================================================
// AUTHENTICATION CONTROLLER
// ============================================================
// Controllers handle the business logic for each route.
// They receive data from the route, process it, interact with
// the database, and send back a response.
//
// This controller handles: register and login.
// ============================================================

const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * POST /api/auth/register
 * Create a new user account.
 */
const register = async (req, res) => {
  try {
    const { first_name, last_name, username, email, password } = req.body;

    // Check if email or username is already taken.
    // We check BEFORE creating the user to give a clear error message.
    const existingUser = await User.findOne({
      $or: [{ email }, { username }], // $or = either condition matches
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return sendError(res, 409, 'Email is already registered.');
      }
      return sendError(res, 409, 'Username is already taken.');
    }

    // Create the new user.
    // The password will be hashed automatically by our pre-save hook
    // (defined in the User model).
    const user = await User.create({
      first_name,
      last_name,
      username,
      email,
      password,
    });

    // Generate a JWT token for the newly registered user.
    // This lets them start using the API right away without logging in separately.
    const token = generateToken(user._id);

    return sendSuccess(res, 201, 'Account created successfully.', {
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    // Pass unexpected errors to our global error handler middleware
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/login
 * Log in with email and password.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email.
    // We add .select('+password') because password has select: false in the model.
    // (We excluded it by default for security, but here we NEED it to compare.)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Use a vague error message so attackers can't find valid emails
      return sendError(res, 401, 'Invalid email or password.');
    }

    // Compare the provided password with the stored hashed password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    // Generate a JWT token for the authenticated user
    const token = generateToken(user._id);

    return sendSuccess(res, 200, 'Logged in successfully.', {
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login };