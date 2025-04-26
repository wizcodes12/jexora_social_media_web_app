const mongoose = require('mongoose');
const moment = require('moment');

const StorySchema = new mongoose.Schema(
  {
    mediaUrl: {
      type: String,
      required: true
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    caption: {
      type: String,
      trim: true
    },
    userId: {  // Changed from createdBy to userId to match controller
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        viewedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    expiresAt: {
      type: Date,
      default: function() {
        return moment().add(24, 'hours').toDate();
      }
    }
  },
  {
    timestamps: true
  }
);

// Create index to efficiently find and delete expired stories
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', StorySchema);