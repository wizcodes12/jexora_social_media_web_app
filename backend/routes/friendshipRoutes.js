 
const express = require('express');
const router = express.Router();
const { 
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendRequests,
  getFriends
} = require('../controllers/friendshipController');
const { protect } = require('../middleware/auth');

// @route   POST /api/v1/friends/request/:userId
// @desc    Send friend request
// @access  Private
router.post('/request/:userId', protect, sendFriendRequest);

// @route   PUT /api/v1/friends/accept/:friendshipId
// @desc    Accept friend request
// @access  Private
router.put('/accept/:friendshipId', protect, acceptFriendRequest);

// @route   PUT /api/v1/friends/decline/:friendshipId
// @desc    Decline friend request
// @access  Private
router.put('/decline/:friendshipId', protect, declineFriendRequest);

// @route   DELETE /api/v1/friends/:friendshipId
// @desc    Remove friend
// @access  Private
router.delete('/:friendshipId', protect, removeFriend);

// @route   GET /api/v1/friends/requests
// @route   GET /api/v1/friends/requests
// @desc    Get all friend requests
// @access  Private
router.get('/requests', protect, getFriendRequests);

// @route   GET /api/v1/friends
// @desc    Get all friends
// @access  Private
router.get('/', protect, getFriends);

module.exports = router;