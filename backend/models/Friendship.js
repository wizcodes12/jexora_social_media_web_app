// models/Friendship.js
const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create compound index to ensure uniqueness of friendship
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Add virtual field to identify friendship direction related to current user
FriendshipSchema.virtual('direction').get(function() {
  // This needs to be populated during API response
  if (this._currentUserId) {
    if (this.requester.toString() === this._currentUserId) {
      return 'outgoing';
    } else if (this.recipient.toString() === this._currentUserId) {
      return 'incoming';
    }
  }
  return null;
});

module.exports = mongoose.model('Friendship', FriendshipSchema);