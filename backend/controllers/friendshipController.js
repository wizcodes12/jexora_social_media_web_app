const Friendship = require('../models/Friendship');
const User = require('../models/User');

// @desc    Send friend request
// @route   POST /api/v1/friends/request/:userId
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const receiverId = req.params.userId;

    // Check if recipient exists
    const recipient = await User.findById(receiverId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent sending request to self
    if (req.user.id === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send friend request to yourself'
      });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: receiverId },
        { requester: receiverId, recipient: req.user.id }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({
        success: false,
        message: 'Friendship request already exists or users are already friends',
        status: existingFriendship.status,
        friendshipId: existingFriendship._id
      });
    }

    // Create new friendship request
    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: receiverId,
      status: 'pending'
    });

    // Update the friendship status
    await friendship.save();

    res.status(201).json({
      success: true,
      data: friendship
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request',
      error: error.message
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/v1/friends/accept/:friendshipId
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Check if user is the recipient of the request
    if (friendship.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this request'
      });
    }

    // Update friendship status
    friendship.status = 'accepted';
    await friendship.save();

    res.status(200).json({
      success: true,
      data: friendship
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request',
      error: error.message
    });
  }
};

// @desc    Decline friend request
// @route   PUT /api/v1/friends/decline/:friendshipId
// @access  Private
exports.declineFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Check if user is the recipient of the request
    if (friendship.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to decline this request'
      });
    }

    // Update friendship status
    friendship.status = 'declined';
    await friendship.save();

    res.status(200).json({
      success: true,
      data: friendship
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline friend request',
      error: error.message
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/v1/friends/:friendshipId
// @access  Private
exports.removeFriend = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }

    // Check if user is part of the friendship
    if (friendship.requester.toString() !== req.user.id && 
        friendship.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove this friendship'
      });
    }

    // Fixed: Using deleteOne() instead of remove()
    await Friendship.deleteOne({ _id: friendship._id });

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend',
      error: error.message
    });
  }
};

// @desc    Get all friend requests
// @route   GET /api/v1/friends/requests
// @access  Private
exports.getFriendRequests = async (req, res) => {
  try {
    // Find all requests where user is involved
    const pendingRequests = await Friendship.find({
      $or: [
        { recipient: req.user.id, status: 'pending' },
        { requester: req.user.id, status: 'pending' }
      ]
    }).populate('requester recipient', 'username email profilePic');
    
    // Add currentUser field to each request for frontend
    const requestsWithDirection = pendingRequests.map(request => {
      const requestObj = request.toObject();
      requestObj.currentUser = req.user.id;
      return requestObj;
    });

    res.status(200).json({
      success: true,
      count: requestsWithDirection.length,
      data: requestsWithDirection
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friend requests',
      error: error.message
    });
  }
};

// @desc    Get all friends
// @route   GET /api/v1/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    // Find all accepted friendships where user is either requester or recipient
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user.id, status: 'accepted' },
        { recipient: req.user.id, status: 'accepted' }
      ]
    }).populate('requester recipient', 'username email profilePic bio');

    // Process friendships to return the proper data
    const friends = friendships.map(friendship => {
      const friendshipObj = friendship.toObject();
      
      // Add currentUser field to identify which user is the friend
      friendshipObj.currentUser = req.user.id;
      
      // Determine which user is the friend (not the current user)
      let friend;
      if (friendshipObj.requester._id.toString() === req.user.id) {
        friend = friendshipObj.recipient;
      } else {
        friend = friendshipObj.requester;
      }
      
      // Add friendshipId and since data to the friend object
      friend.friendshipId = friendshipObj._id;
      friend.since = friendshipObj.createdAt;
      
      return friendshipObj;
    });

    res.status(200).json({
      success: true,
      count: friends.length,
      data: friends
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friends',
      error: error.message
    });
  }
};