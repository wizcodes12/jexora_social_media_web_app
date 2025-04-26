  
  // models/User.js
  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const crypto = require('crypto');

  const UserSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
      },
      email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
          /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
          'Please provide a valid email'
        ]
      },
      password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
      },
      profilePic: {
        type: String,
        default: 'default-profile.png'
      },
      bio: {
        type: String,
        default: ''
      },
      isAdmin: {
        type: Boolean,
        default: false
      },
      isVerified: {
        type: Boolean,
        default: false
      },
      resetPasswordToken: String,
      resetPasswordExpire: Date,
      verificationToken: String,
      verificationExpire: Date,
      otp: String,
      otpExpire: Date,
      lastActive: {
        type: Date,
        default: Date.now
      },
      followers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      following: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      warnings: [
        {
          message: String,
          date: {
            type: Date,
            default: Date.now
          },
          issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        }
      ],
      notifications: [
        {
          type: {
            type: String,
            enum: ['like', 'comment', 'follow', 'message', 'warning', 'system']
          },
          from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
          },
          message: String,
          read: {
            type: Boolean,
            default: false
          },
          createdAt: {
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

  // Encrypt password before saving
  UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  // Sign JWT and return
  UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
  };

  // Match user entered password to hashed password in database
  UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  // Generate and hash password token
  UserSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
  };

  // Generate OTP
  UserSchema.methods.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpire = Date.now() + parseInt(process.env.OTP_EXPIRE) * 60 * 1000; // OTP_EXPIRE in minutes
    return otp;
  };

  module.exports = mongoose.model('User', UserSchema);