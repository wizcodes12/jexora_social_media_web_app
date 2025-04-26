const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { 
  register, 
  login, 
  logout, 
  getMe, 
  forgotPassword, 
  resetPassword,
  updateDetails,
  updatePassword,
  adminLogin 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// @route   POST /api/v1/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  register
);

// @route   POST /api/v1/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

// @route   POST /api/v1/auth/admin-login
// @desc    Admin login
// @access  Public
router.post(
  '/admin-login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  adminLogin
);

// @route   GET /api/v1/auth/logout
// @desc    Logout user / clear cookie
// @access  Private
router.get('/logout', protect, logout);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/v1/auth/forgot-password
// @desc    Forgot password - send OTP
// @access  Public
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email').isEmail()
  ],
  forgotPassword
);

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post(
  '/reset-password',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  resetPassword
);

// @route   PUT /api/v1/auth/updatedetails
// @desc    Update user details
// @access  Private
router.put('/updatedetails', protect, updateDetails);

// @route   PUT /api/v1/auth/updatepassword
// @desc    Update password
// @access  Private
router.put('/updatepassword', protect, updatePassword);

module.exports = router;