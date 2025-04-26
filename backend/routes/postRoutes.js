const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPost,  // This is named 'getPost' in your controller, not 'getPostById'
  updatePost,
  deletePost,
  likePost,  // This function handles both like/unlike in your controller
  addComment,
  deleteComment,
  searchPosts,
  getPostStats
} = require('../controllers/postController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// Create a post
router.post('/', protect, upload.single('media'), createPost);

// Get all posts (feed)
router.get('/', protect, getPosts);

// Get single post
router.get('/:id', protect, getPost);  // Use getPost instead of getPostById

// Update post
router.put('/:id', protect, upload.single('media'), updatePost);

// Delete post
router.delete('/:id', protect, deletePost);

// Like/unlike post
router.put('/:id/like', protect, likePost);  // This handles both like/unlike

// Add comment
router.post('/:id/comments', protect, addComment);

// Delete comment
router.delete('/:id/comments/:commentId', protect, deleteComment);

// Search posts
router.get('/search', protect, searchPosts);

// Get post stats (admin only)
router.get('/stats', protect, authorize('admin'), getPostStats);

module.exports = router;