// Fix the router definition in messageRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendMessageToUser,
  getPrivateMessages,
  getConversations,
  deleteMessage,
  markMessageAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../utils/fileUpload');

// IMPORTANT: Place more specific routes before generic parameterized routes
// @route   GET /api/v1/messages/conversations
// @desc    Get all conversations
// @access  Private
router.get('/conversations', protect, getConversations);

// @route   POST /api/v1/messages/:userId
// @desc    Send message to user
// @access  Private
router.post('/:userId', protect, upload.single('attachment'), sendMessageToUser);

// @route   GET /api/v1/messages/:userId
// @desc    Get messages with a specific user
// @access  Private
router.get('/:userId', protect, getPrivateMessages);

// @route   DELETE /api/v1/messages/:messageId
// @desc    Delete a message
// @access  Private (only message sender)
router.delete('/:messageId', protect, deleteMessage);

// @route   PUT /api/v1/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put('/:messageId/read', protect, markMessageAsRead);

module.exports = router;