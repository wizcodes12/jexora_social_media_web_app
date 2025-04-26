const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

const setupSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    if (socket.user && socket.user.id) {
      const userId = socket.user.id;
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId).add(socket.id);
      socket.join(`user:${userId}`);
      io.emit('userStatus', { userId, status: 'online' });
    }

    // Handle private messages
    socket.on('sendMessage', async (data) => {
      try {
        const { messageId, recipientId } = data; // Expect messageId from frontend
        const senderId = socket.user?.id;

        if (!senderId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Fetch the saved message instead of creating a new one
        const message = await Message.findById(messageId)
          .populate('sender', 'username profilePic')
          .populate('recipient', 'username profilePic');

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Emit to sender and recipient
        socket.emit('newMessage', message);
        io.to(`user:${recipientId}`).emit('newMessage', message);
      } catch (error) {
        console.error('Error broadcasting message:', error);
        socket.emit('error', { message: 'Failed to broadcast message' });
      }
    });

    socket.on('joinChat', ({ userId, recipientId }) => {
      if (userId && recipientId) {
        const chatRoom = [userId, recipientId].sort().join(':');
        socket.join(`chat:${chatRoom}`);
        socket.emit('joinedChat', { chatRoom });
      }
    });

    socket.on('leaveChat', ({ userId, recipientId }) => {
      if (userId && recipientId) {
        const chatRoom = [userId, recipientId].sort().join(':');
        socket.leave(`chat:${chatRoom}`);
      }
    });

    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      const senderId = socket.user?.id;
      if (senderId) {
        io.to(`user:${recipientId}`).emit('userTyping', { senderId, isTyping });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (socket.user && socket.user.id) {
        const userId = socket.user.id;
        if (connectedUsers.has(userId)) {
          const userSockets = connectedUsers.get(userId);
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);
            io.emit('userStatus', { userId, status: 'offline' });
          }
        }
      }
    });
  });
};

module.exports = setupSocketHandlers;