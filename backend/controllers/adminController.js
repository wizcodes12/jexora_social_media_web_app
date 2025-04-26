 
const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Story = require('../models/Story');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');

// @desc    Get all users (admin only)
// @route   GET /api/v1/admin/users
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Get all posts (admin only)
// @route   GET /api/v1/admin/posts
// @access  Private (admin only)
exports.getAllPosts = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    const posts = await Post.find()
      .populate('userId', 'username profilePic email')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// @desc    Get all groups (admin only)
// @route   GET /api/v1/admin/groups
// @access  Private (admin only)
exports.getAllGroups = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    const groups = await Group.find()
      .populate('createdBy', 'username email profilePic')
      .populate('admins', 'username')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: error.message
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (admin only)
exports.deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot delete their own account'
      });
    }

    // Delete user
    await user.remove();

    // Additional cleanup can be done here:
    // 1. Delete user's posts
    await Post.deleteMany({ userId: req.params.id });
    
    // 2. Delete user's stories
    await Story.deleteMany({ userId: req.params.id });
    
    // 3. Remove user from groups
    const groups = await Group.find({ members: req.params.id });
    for (let group of groups) {
      group.members = group.members.filter(id => id.toString() !== req.params.id);
      group.admins = group.admins.filter(id => id.toString() !== req.params.id);
      await group.save();
    }
    
    // 4. Delete friendships
    await Friendship.deleteMany({
      $or: [{ requester: req.params.id }, { recipient: req.params.id }]
    });
    
    // 5. Delete messages
    await Message.deleteMany({
      $or: [{ sender: req.params.id }, { receiver: req.params.id }]
    });

    res.status(200).json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// @desc    Delete post (admin only)
// @route   DELETE /api/v1/admin/posts/:id
// @access  Private (admin only)
exports.deletePost = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Delete post
    await post.remove();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// @desc    Send warning to user (admin only)
// @route   POST /api/v1/admin/users/:id/warn
// @access  Private (admin only)
exports.warnUser = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    const { warning } = req.body;
    
    if (!warning || warning.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Warning message is required'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add warning to user
    if (!user.warnings) {
      user.warnings = [];
    }
    
    user.warnings.push({
      message: warning,
      issuedBy: req.user.id,
      issuedAt: Date.now()
    });
    
    await user.save();

    // TODO: Send notification to user about the warning
    // This would be implemented with a notification system

    res.status(200).json({
      success: true,
      message: 'Warning issued successfully',
      data: user.warnings
    });
  } catch (error) {
    console.error('Warn user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to issue warning',
      error: error.message
    });
  }
};

// @desc    Get app stats (admin only)
// @route   GET /api/v1/admin/stats
// @access  Private (admin only)
exports.getStats = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access admin resources'
      });
    }

    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const groupCount = await Group.countDocuments();
    const storyCount = await Story.countDocuments();
    const messageCount = await Message.countDocuments();
    const friendshipCount = await Friendship.countDocuments({ status: 'accepted' });

    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const newPosts = await Post.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get user growth data (users per month for the last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const usersByMonth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Format user growth data for charts
    const userGrowthData = usersByMonth.map(item => ({
      month: `${item._id.year}-${item._id.month}`,
      users: item.count
    }));

    // Get post activity data (posts per month for the last 6 months)
    const postsByMonth = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Format post activity data for charts
    const postActivityData = postsByMonth.map(item => ({
      month: `${item._id.year}-${item._id.month}`,
      posts: item.count
    }));

    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: userCount,
          posts: postCount,
          groups: groupCount,
          stories: storyCount,
          messages: messageCount,
          friendships: friendshipCount,
          newUsers,
          newPosts
        },
        userGrowth: userGrowthData,
        postActivity: postActivityData
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};