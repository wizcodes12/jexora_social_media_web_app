 
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const Friendship = require('../models/Friendship');

// @desc    Send message to user
// @route   POST /api/v1/messages/user/:userId
// @access  Private
exports.sendMessageToUser = async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const { content } = req.body;

    // Check if recipient exists
    const recipient = await User.findById(receiverId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create message - Fixed field name to match the model
    const message = await Message.create({
      sender: req.user.id,
      recipient: receiverId, // Changed from receiver to recipient to match model
      content,
      mediaType: req.file ? determineMediaType(req.file.mimetype) : 'none',
      mediaURL: req.file ? `/uploads/${req.file.filename}` : null
    });

    // Populate sender details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePic');

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};


// @desc    Send message to group
// @route   POST /api/v1/messages/group/:groupId
// @access  Private (group members only)
exports.sendMessageToGroup = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const { content } = req.body;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of the group to send messages'
      });
    }

    // Create message
    const message = await Message.create({
      sender: req.user.id,
      group: groupId,
      content,
      messageType: 'group'
    });

    // Populate sender details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profilePic');

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send group message',
      error: error.message
    });
  }
};

// @desc    Get private messages between two users
// @route   GET /api/v1/messages/user/:userId
// @access  Private
exports.getPrivateMessages = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get messages between current user and other user - Fixed field names
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ]
    }).sort('createdAt')
      .populate('sender', 'username profilePic');

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Get private messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

// Helper function to determine media type
function determineMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('application/')) return 'document';
  return 'none';
}

// @desc    Get group messages
// @route   GET /api/v1/messages/group/:groupId
// @access  Private (group members only)
exports.getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member of the group
    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of the group to view messages'
      });
    }

    // Get group messages
    const messages = await Message.find({
      group: groupId,
      messageType: 'group'
    }).sort('createdAt')
      .populate('sender', 'username profilePic');

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch group messages',
      error: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/v1/messages/:id
// @access  Private (message sender only)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is message sender or admin
    if (message.sender.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await message.remove();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
};

// @desc    Get conversation list for user
// @route   GET /api/v1/messages/conversations
// @access  Private
// @desc    Get conversation list for user
// @route   GET /api/v1/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // Find private messages where user is either sender or recipient (not receiver)
    const messages = await Message.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id } // Updated from receiver to recipient
      ]
    }).sort('-createdAt')
      .populate('sender recipient', 'username profilePic'); // Updated from receiver to recipient
    
    // Group messages by conversation
    const conversations = {};
    
    messages.forEach(msg => {
      // Determine the other user in the conversation
      const otherUserId = msg.sender._id.toString() === req.user.id 
        ? msg.recipient._id.toString()  // Updated from receiver to recipient
        : msg.sender._id.toString();
      
      // Get other user details
      const otherUser = msg.sender._id.toString() === req.user.id 
        ? msg.recipient  // Updated from receiver to recipient
        : msg.sender;
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            profilePic: otherUser.profilePic
          },
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            isRead: msg.read // Updated from isRead to read to match model
          },
          unreadCount: msg.recipient._id.toString() === req.user.id && !msg.read ? 1 : 0  // Updated fields
        };
      } else if (msg.createdAt > conversations[otherUserId].lastMessage.createdAt) {
        // Update last message if this one is newer
        conversations[otherUserId].lastMessage = {
          content: msg.content,
          createdAt: msg.createdAt,
          isRead: msg.read  // Updated from isRead to read
        };
        
        // Increment unread count if needed
        if (msg.recipient._id.toString() === req.user.id && !msg.read) {  // Updated fields
          conversations[otherUserId].unreadCount++;
        }
      } else if (msg.recipient._id.toString() === req.user.id && !msg.read) {  // Updated fields
        // Still count other unread messages
        conversations[otherUserId].unreadCount++;
      }
    });
    
    // Convert to array and sort by most recent message
    const sortedConversations = Object.values(conversations).sort((a, b) => 
      b.lastMessage.createdAt - a.lastMessage.createdAt
    );

    res.status(200).json({
      success: true,
      count: sortedConversations.length,
      data: sortedConversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/v1/messages/:id/read
// @access  Private (message receiver only)
exports.markMessageAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is message receiver
    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read'
      });
    }

    message.isRead = true;
    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
};