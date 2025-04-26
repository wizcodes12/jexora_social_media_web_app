 
// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true
    },
    mediaURL: {
      type: String
    },  
    mediaType: {
      type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        text: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    tags: [String],
    location: String,
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Create index for search
PostSchema.index({ caption: 'text', tags: 'text' });

module.exports = mongoose.model('Post', PostSchema);