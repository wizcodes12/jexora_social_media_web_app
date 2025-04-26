 
const express = require('express');
const router = express.Router();
const { 
  createStory,
  getStories,
  getStoryById,
  deleteStory
} = require('../controllers/storyController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// @route   POST /api/v1/stories
// @desc    Create a new story
// @access  Private
router.post('/', protect, upload.single('media'), createStory);

// @route   GET /api/v1/stories
// @desc    Get all stories from friends and self
// @access  Private
router.get('/', protect, getStories);

// @route   GET /api/v1/stories/:id
// @desc    Get a single story
// @access  Private
router.get('/:id', protect, getStoryById);

// @route   DELETE /api/v1/stories/:id
// @desc    Delete a story
// @access  Private (only story owner or admin)
router.delete('/:id', protect, deleteStory);

module.exports = router;