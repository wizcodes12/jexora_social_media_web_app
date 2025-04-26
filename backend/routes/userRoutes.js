const express = require('express');
const router = express.Router();
const { 
  getUsers,
  getUser,
  updateProfilePicture,
  deleteUser,
  getNotifications,
  markNotificationRead,
  warnUser,
  searchUsers,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../utils/fileUpload');


// Admin routes
// @route   GET /api/v1/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), getUsers);

// @route   GET /api/v1/users/stats
// @desc    Get user stats (admin only)
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), getUserStats);

// @route   POST /api/v1/users/:id/warn
// @desc    Send warning to user (admin only)
// @access  Private/Admin
router.post('/:id/warn', protect, authorize('admin'), warnUser);

// Regular user routes
// @route   GET /api/v1/users/search
// @desc    Search users
// @access  Private
router.get('/search', protect, searchUsers);

// @route   GET /api/v1/users/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', protect, getNotifications);

// @route   PUT /api/v1/users/notifications/:id
// @desc    Mark notification as read
// @access  Private
router.put('/notifications/:id', protect, markNotificationRead);

// @route   PUT /api/v1/users/profile-picture
// @desc    Update user profile picture
// @access  Private
router.put('/profile-picture', protect, upload.single('profilePic'), updateProfilePicture);

// @route   GET /api/v1/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, getUser);

// @route   DELETE /api/v1/users/:id
// @desc    Delete user (admin or user)
// @access  Private
router.delete('/:id', protect, deleteUser);

module.exports = router;
