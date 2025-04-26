const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    content: {
      type: String,
      required: true
    },
    mediaURL: String,
    mediaType: {
      type: String,
      enum: ['image', 'video', 'document', 'none'],
      default: 'none'
    },
    read: {
      type: Boolean,
      default: false
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes for efficient querying
MessageSchema.index({ recipient: 1, sender: 1 });
MessageSchema.index({ group: 1 });
MessageSchema.index({ createdAt: -1 }); // Added for sorting by time

module.exports = mongoose.model('Message', MessageSchema);