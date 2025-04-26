 
// controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User');
const notificationController = require('./notificationController');


// @desc    Create new post
// @route   POST /api/v1/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { caption, tags, location, isPublic } = req.body;

    // Check if media file was uploaded
    let mediaURL = null;
    let mediaType = 'none';

    if (req.file) {
      mediaURL = req.file.filename;
      // Determine media type from file mimetype
      if (req.file.mimetype.startsWith('image')) {
        mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video')) {
        mediaType = 'video';
      }
    }

    // Create post
    const post = await Post.create({
      caption,
      mediaURL,
      mediaType,
      createdBy: req.user.id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      location,
      isPublic: isPublic === undefined ? true : isPublic
    });

    const populatedPost = await Post.findById(post._id).populate('createdBy', 'username profilePic');

    res.status(201).json({
      success: true,
      data: populatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all posts (feed)
// @route   GET /api/v1/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const user = await User.findById(req.user.id);
    
    // Get posts from user and people they follow
    const posts = await Post.find({
      $or: [
        { createdBy: { $in: [...user.following, req.user.id] } },
        { isPublic: true }
      ]
    })
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'username profilePic')
      .populate({
        path: 'comments.user',
        select: 'username profilePic'
      });

    // Get total count for pagination
    const total = await Post.countDocuments({
      $or: [
        { createdBy: { $in: [...user.following, req.user.id] } },
        { isPublic: true }
      ]
    });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination,
      total,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single post
// @route   GET /api/v1/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('createdBy', 'username profilePic')
      .populate({
        path: 'comments.user',
        select: 'username profilePic'
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is private and if user has permission to view
    if (!post.isPublic && post.createdBy._id.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this post'
      });
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update post
// @route   PUT /api/v1/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Make sure user is post owner
    if (post.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { caption, tags, location, isPublic } = req.body;

    // Update fields
    if (caption !== undefined) post.caption = caption;
    if (tags !== undefined) post.tags = tags.split(',').map(tag => tag.trim());
    if (location !== undefined) post.location = location;
    if (isPublic !== undefined) post.isPublic = isPublic;

    // If new media is uploaded
    if (req.file) {
      post.mediaURL = req.file.filename;
      if (req.file.mimetype.startsWith('image')) {
        post.mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video')) {
        post.mediaType = 'video';
      }
    }

    await post.save();

    post = await Post.findById(post._id)
      .populate('createdBy', 'username profilePic')
      .populate({
        path: 'comments.user',
        select: 'username profilePic'
      });

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private
// Update the deletePost function in controllers/postController.js
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Make sure user is post owner or admin
    if (post.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Use deleteOne instead of remove (which is deprecated)
    await Post.deleteOne({ _id: post._id });

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

// @desc    Like/unlike post
// @route   PUT /api/v1/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is already liked
    const alreadyLiked = post.likes.includes(req.user.id);

    if (alreadyLiked) {
      // Unlike post
      post.likes = post.likes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      // Like post
      post.likes.push(req.user.id);

      // Create notification for post like if not the user's own post
      if (post.createdBy.toString() !== req.user.id) {
        await notificationController.createNotification(
          req.user.id,             // sender
          post.createdBy,          // recipient
          'like',                  // type
          `liked your post`,       // content
          post._id                 // refId (reference to the post)
        );
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: {
        likes: post.likes,
        alreadyLiked: !alreadyLiked
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// @desc    Add comment to post
// @route   POST /api/v1/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Please provide comment text'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Add comment
    const comment = {
      user: req.user.id,
      text
    };

    post.comments.push(comment);
    await post.save();

    // Get newly added comment with populated user
    const updatedPost = await Post.findById(post._id)
      .populate('createdBy', 'username profilePic')
      .populate({
        path: 'comments.user',
        select: 'username profilePic'
      });

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    // Create notification for comment if not the user's own post
    if (post.createdBy.toString() !== req.user.id) {
      await notificationController.createNotification(
        req.user.id,             // sender
        post.createdBy,          // recipient
        'comment',               // type
        `commented on your post: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`, // content
        post._id                 // refId (reference to the post)
      );
    }

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete comment from post
// @route   DELETE /api/v1/posts/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Make sure user is comment owner, post owner, or admin
    if (
      comment.user.toString() !== req.user.id &&
      post.createdBy.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Remove comment
    comment.remove();
    await post.save();

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

// @desc    Search posts
// @route   GET /api/v1/posts/search
// @access  Private
exports.searchPosts = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query'
      });
    }

    const posts = await Post.find({
      $or: [
        { caption: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { location: { $regex: query, $options: 'i' } }
      ],
      $and: [
        {
          $or: [
            { isPublic: true },
            { createdBy: req.user.id }
          ]
        }
      ]
    })
      .sort('-createdAt')
      .populate('createdBy', 'username profilePic');

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get post stats (admin only)
// @route   GET /api/v1/posts/stats
// @access  Private/Admin
exports.getPostStats = async (req, res) => {
  try {
    // Total posts
    const totalPosts = await Post.countDocuments();

    // Posts in the last 30 days
    const newPosts = await Post.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Post with most likes
    const mostLikedPost = await Post.findOne()
      .sort('-likes.length')
      .populate('createdBy', 'username');

    // Post with most comments
    const mostCommentedPost = await Post.findOne()
      .sort('-comments.length')
      .populate('createdBy', 'username');

    // Posts by media type
    const mediaTypeCounts = await Post.aggregate([
      {
        $group: {
          _id: '$mediaType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Posts by month
    const postsByMonth = await Post.aggregate([
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
        totalPosts,
        newPosts,
        mostLikedPost: mostLikedPost ? {
          id: mostLikedPost._id,
          caption: mostLikedPost.caption,
          likeCount: mostLikedPost.likes.length,
          createdBy: mostLikedPost.createdBy ? mostLikedPost.createdBy.username : 'Unknown'
        } : null,
        mostCommentedPost: mostCommentedPost ? {
          id: mostCommentedPost._id,
          caption: mostCommentedPost.caption,
          commentCount: mostCommentedPost.comments.length,
          createdBy: mostCommentedPost.createdBy ? mostCommentedPost.createdBy.username : 'Unknown'
        } : null,
        mediaTypeCounts,
        postsByMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};