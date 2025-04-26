const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getAllPosts,
  getAllGroups,
  getStats,
  deleteUser,
  deletePost,
  warnUser
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin'); // Import from correct file

// @route   GET /api/v1/admin/users
// @desc    Get all users
// @access  Private (admin only)
router.get('/users', protect, adminOnly, getAllUsers);

// @route   GET /api/v1/admin/posts
// @desc    Get all posts
// @access  Private (admin only)
router.get('/posts', protect, adminOnly, getAllPosts);

// @route   GET /api/v1/admin/groups
// @desc    Get all groups
// @access  Private (admin only)
router.get('/groups', protect, adminOnly, getAllGroups);

// @route   GET /api/v1/admin/stats
// @desc    Get platform statistics
// @access  Private (admin only)
router.get('/stats', protect, adminOnly, getStats);

// @route   DELETE /api/v1/admin/users/:id
// @desc    Delete a user
// @access  Private (admin only)
router.delete('/users/:id', protect, adminOnly, deleteUser);

// @route   DELETE /api/v1/admin/posts/:id
// @desc    Delete a post
// @access  Private (admin only)
router.delete('/posts/:id', protect, adminOnly, deletePost);

// @route   POST /api/v1/admin/warning/:userId
// @desc    Send warning to user
// @access  Private (admin only)
router.post('/warning/:userId', protect, adminOnly, warnUser);

module.exports = router;