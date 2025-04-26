const Story = require('../models/Story');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const fs = require('fs');
const path = require('path');

// @desc    Create new story
// @route   POST /api/v1/stories
// @access  Private
// @desc    Create new story
// @route   POST /api/v1/stories
// @access  Private
// @desc    Create new story
// @route   POST /api/v1/stories
// @access  Private
exports.createStory = async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image or video for your story'
      });
    }

    // Determine media type
    let mediaType = 'image';
    if (req.file.mimetype.startsWith('video')) {
      mediaType = 'video';
    }

    // Extract just the filename without any path
    const filename = req.file.filename || path.basename(req.file.path);

    // Create story with 24-hour expiry time
    const story = await Story.create({
      userId: req.user.id,
      mediaUrl: filename, // Store just the filename, no path
      mediaType,
      caption,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });

    res.status(201).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create story',
      error: error.message
    });
  }
};
// @desc    Get all stories from friends and self that haven't expired
// @route   GET /api/v1/stories
// @access  Private
exports.getStories = async (req, res) => {
  try {
    // Find current user's friends
    const currentUser = await User.findById(req.user.id).select('_id');
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user.id, status: 'accepted' },
        { recipient: req.user.id, status: 'accepted' }
      ]
    });

    // Extract friend IDs
    const friendIds = friendships.map(friendship => 
      friendship.requester.toString() === req.user.id.toString()
        ? friendship.recipient
        : friendship.requester
    );

    // Include user's own ID to see their own stories
    friendIds.push(req.user.id);

    // Find all stories from friends and self that haven't expired
    const stories = await Story.find({
      userId: { $in: friendIds },
      expiresAt: { $gt: new Date() } // Only get non-expired stories
    }).populate('userId', 'username profilePic');

    // Group stories by user
    const groupedStories = {};
    stories.forEach(story => {
      const userId = story.userId._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: {
            id: story.userId._id,
            username: story.userId.username,
            profilePic: story.userId.profilePic
          },
          stories: []
        };
      }
      groupedStories[userId].stories.push(story);
    });

    res.status(200).json({
      success: true,
      data: Object.values(groupedStories)
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stories',
      error: error.message
    });
  }
};

// @desc    Get a single story
// @route   GET /api/v1/stories/:id
// @access  Private
exports.getStoryById = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('userId', 'username profilePic');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if story has expired
    if (story.expiresAt < new Date()) {
      return res.status(404).json({
        success: false,
        message: 'Story has expired'
      });
    }

    res.status(200).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch story',
      error: error.message
    });
  }
};

// @desc    Delete story
// @route   DELETE /api/v1/stories/:id
// @access  Private
// @desc    Delete story
// @route   DELETE /api/v1/stories/:id
// @access  Private
// @desc    Delete story
// @route   DELETE /api/v1/stories/:id
// @access  Private
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if user owns the story or is admin
    if (story.userId.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this story'
      });
    }

    // Delete the file from the server
    try {
      // Use the filename directly since we're storing just the filename
      const filePath = path.join(__dirname, '..', 'uploads', story.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error deleting story file:', err);
      // Continue with story deletion even if file deletion fails
    }

    await Story.findByIdAndDelete(story._id);

    res.status(200).json({
      success: true,
      message: 'Story removed successfully'
    });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete story',
      error: error.message
    });
  }
};