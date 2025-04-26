 
// controllers/userController.js
const User = require('../models/User');
const Post = require('../models/Post');
const Friendship = require('../models/Friendship');
const sendEmail = require('../utils/sendEmail');
const emailTemplates = require('../utils/emailTemplates');

// @desc    Get all users (admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-notifications -warnings');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-notifications -warnings');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if there's a friendship between the logged in user and this user
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.id },
        { requester: req.params.id, recipient: req.user.id }
      ]
    });

    // Get user's posts
    const posts = await Post.find({ createdBy: req.params.id })
      .sort('-createdAt')
      .populate('createdBy', 'username profilePic');

    res.status(200).json({
      success: true,
      data: {
        user,
        friendship: friendship || null,
        posts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile picture
// @route   PUT /api/v1/users/profile-picture
// @access  Private
exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: req.file.filename },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user (admin or user)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin or User (own account)
exports.deleteUser = async (req, res) => {
  try {
    // Only admin can delete other users
    if (req.params.id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's posts
    await Post.deleteMany({ createdBy: req.params.id });

    // Delete user's friendships
    await Friendship.deleteMany({
      $or: [{ requester: req.params.id }, { recipient: req.params.id }]
    });

    // Delete the user
    await user.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user notifications
// @route   GET /api/v1/users/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('notifications')
      .populate({
        path: 'notifications.from',
        select: 'username profilePic'
      });

    res.status(200).json({
      success: true,
      data: user.notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/users/notifications/:id
// @access  Private
exports.markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Find the notification by ID
    const notification = user.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Mark as read
    notification.read = true;
    await user.save();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send warning to user (admin only)
// @route   POST /api/v1/users/:id/warn
// @access  Private/Admin
exports.warnUser = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a warning message'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add warning
    user.warnings.push({
      message,
      issuedBy: req.user.id
    });

    // Add notification
    user.notifications.push({
      type: 'warning',
      from: req.user.id,
      message: 'You have received a warning from an admin'
    });

    await user.save();

    // Send email notification
    try {
      await sendEmail({
        email: user.email,
        subject: 'Warning Notice - Jexora Social Media',
        message: emailTemplates.warningEmailTemplate(user.username, message)
      });
    } catch (err) {
      console.log('Email could not be sent', err);
    }

    res.status(200).json({
      success: true,
      data: {
        warning: user.warnings[user.warnings.length - 1]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search users
// @route   GET /api/v1/users/search
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username email profilePic');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user stats (admin only)
// @route   GET /api/v1/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();

    // New users in the last 30 days
    const newUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Active users in the last 7 days
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Count of admins
    const adminCount = await User.countDocuments({ isAdmin: true });

    // Get user registration stats by month
    const usersByMonth = await User.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newUsers,
        activeUsers,
        adminCount,
        usersByMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};