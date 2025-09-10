const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Handles user authentication, preferences, and account management
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  
  // Profile Information
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerificationToken: {
    type: String,
    default: null
  },
  
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    default: null
  },
  
  passwordResetExpires: {
    type: Date,
    default: null
  },
  
  // Authentication
  lastLogin: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  },
  
  // User Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
    },
    
    timezone: {
      type: String,
      default: 'UTC'
    },
    
    emailNotifications: {
      type: Boolean,
      default: true
    },
    
    pushNotifications: {
      type: Boolean,
      default: true
    },
    
    syncFrequency: {
      type: String,
      enum: ['realtime', '5min', '15min', '30min', '1hour', 'manual'],
      default: '15min'
    },
    
    defaultPageSize: {
      type: Number,
      default: 20,
      min: 10,
      max: 100
    },
    
    autoArchive: {
      type: Boolean,
      default: false
    },
    
    autoDelete: {
      type: Boolean,
      default: false
    },
    
    deleteAfterDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    }
  },
  
  // Analytics Settings
  analyticsSettings: {
    enableAnalytics: {
      type: Boolean,
      default: true
    },
    
    enableRealTimeProcessing: {
      type: Boolean,
      default: true
    },
    
    enableAdvancedSearch: {
      type: Boolean,
      default: true
    },
    
    enableEmailPreview: {
      type: Boolean,
      default: true
    },
    
    dataRetentionDays: {
      type: Number,
      default: 90,
      min: 1,
      max: 365
    }
  },
  
  // Subscription & Limits
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    
    maxEmailAccounts: {
      type: Number,
      default: 3
    },
    
    maxEmailsPerMonth: {
      type: Number,
      default: 1000
    },
    
    maxStorageGB: {
      type: Number,
      default: 1
    },
    
    features: [{
      type: String,
      enum: ['basic_sync', 'advanced_sync', 'analytics', 'search', 'api_access', 'priority_support']
    }],
    
    expiresAt: {
      type: Date,
      default: null
    }
  },
  
  // Usage Statistics
  usage: {
    emailAccountsCount: {
      type: Number,
      default: 0
    },
    
    emailsProcessed: {
      type: Number,
      default: 0
    },
    
    storageUsedMB: {
      type: Number,
      default: 0
    },
    
    lastSyncAt: {
      type: Date,
      default: null
    },
    
    syncJobsCount: {
      type: Number,
      default: 0
    }
  },
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  
  apiKeys: [{
    name: String,
    key: String,
    permissions: [String],
    lastUsed: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for subscription status
userSchema.virtual('isSubscriptionActive').get(function() {
  if (this.subscription.plan === 'free') return true;
  return this.subscription.expiresAt && this.subscription.expiresAt > Date.now();
});

// Indexes for performance (removed duplicates)
userSchema.index({ 'subscription.plan': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.lastModifiedBy = this._id;
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to check if user can perform action
userSchema.methods.canPerformAction = function(action) {
  if (!this.isActive) return false;
  if (this.isLocked) return false;
  if (!this.isSubscriptionActive) return false;
  
  // Check subscription limits
  switch (action) {
    case 'create_email_account':
      return this.usage.emailAccountsCount < this.subscription.maxEmailAccounts;
    case 'process_email':
      return this.usage.emailsProcessed < this.subscription.maxEmailsPerMonth;
    default:
      return true;
  }
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

// Static method to find users by subscription plan
userSchema.statics.findBySubscriptionPlan = function(plan) {
  return this.find({ 'subscription.plan': plan });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
        },
        freeUsers: {
          $sum: { $cond: [{ $eq: ['$subscription.plan', 'free'] }, 1, 0] }
        },
        premiumUsers: {
          $sum: { $cond: [{ $eq: ['$subscription.plan', 'premium'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    freeUsers: 0,
    premiumUsers: 0
  };
};

// Export the model
const User = mongoose.model('User', userSchema);

module.exports = User;