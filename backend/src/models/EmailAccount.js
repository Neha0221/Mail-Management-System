const mongoose = require('mongoose');

/**
 * EmailAccount Model
 * Handles IMAP server configurations and email account management
 */
const emailAccountSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Account Information
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  
  // IMAP Server Configuration
  imapConfig: {
    host: {
      type: String,
      required: [true, 'IMAP host is required'],
      trim: true
    },
    
    port: {
      type: Number,
      required: [true, 'IMAP port is required'],
      min: [1, 'Port must be between 1 and 65535'],
      max: [65535, 'Port must be between 1 and 65535']
    },
    
    secure: {
      type: Boolean,
      default: true
    },
    
    tlsOptions: {
      rejectUnauthorized: {
        type: Boolean,
        default: false
      },
      
      ciphers: {
        type: String,
        default: null
      },
      
      minVersion: {
        type: String,
        default: 'TLSv1.2'
      }
    }
  },
  
  // Authentication Configuration
  authConfig: {
    method: {
      type: String,
      enum: ['PLAIN', 'LOGIN', 'OAUTH2', 'XOAUTH2'],
      default: 'PLAIN',
      required: true
    },
    
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true
    },
    
    password: {
      type: String,
      required: function() {
        return this.authConfig.method === 'PLAIN' || this.authConfig.method === 'LOGIN';
      },
      select: false // Don't include password in queries by default
    },
    
    oauth2Config: {
      clientId: {
        type: String,
        required: function() {
          return this.authConfig.method === 'OAUTH2' || this.authConfig.method === 'XOAUTH2';
        }
      },
      
      clientSecret: {
        type: String,
        required: function() {
          return this.authConfig.method === 'OAUTH2' || this.authConfig.method === 'XOAUTH2';
        },
        select: false
      },
      
      refreshToken: {
        type: String,
        required: function() {
          return this.authConfig.method === 'OAUTH2' || this.authConfig.method === 'XOAUTH2';
        },
        select: false
      },
      
      accessToken: {
        type: String,
        select: false
      },
      
      tokenExpiry: {
        type: Date,
        default: null
      }
    }
  },
  
  // Connection Settings
  connectionSettings: {
    timeout: {
      type: Number,
      default: 30000, // 30 seconds
      min: [5000, 'Timeout must be at least 5 seconds'],
      max: [300000, 'Timeout cannot exceed 5 minutes']
    },
    
    keepalive: {
      interval: {
        type: Number,
        default: 10000 // 10 seconds
      },
      
      idleInterval: {
        type: Number,
        default: 300000 // 5 minutes
      },
      
      forceNoop: {
        type: Boolean,
        default: true
      }
    },
    
    maxRetries: {
      type: Number,
      default: 3,
      min: [1, 'Max retries must be at least 1'],
      max: [10, 'Max retries cannot exceed 10']
    },
    
    retryDelay: {
      type: Number,
      default: 5000, // 5 seconds
      min: [1000, 'Retry delay must be at least 1 second'],
      max: [60000, 'Retry delay cannot exceed 1 minute']
    }
  },
  
  // Account Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'connecting', 'disconnected'],
    default: 'inactive'
  },
  
  isEnabled: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Connection Information
  connectionInfo: {
    lastConnected: {
      type: Date,
      default: null
    },
    
    lastDisconnected: {
      type: Date,
      default: null
    },
    
    connectionCount: {
      type: Number,
      default: 0
    },
    
    totalConnectionTime: {
      type: Number,
      default: 0 // in milliseconds
    },
    
    averageConnectionTime: {
      type: Number,
      default: 0 // in milliseconds
    },
    
    lastError: {
      message: String,
      code: String,
      timestamp: Date
    },
    
    errorCount: {
      type: Number,
      default: 0
    }
  },
  
  // Sync Configuration
  syncConfig: {
    enabled: {
      type: Boolean,
      default: true
    },
    
    frequency: {
      type: String,
      enum: ['realtime', '5min', '15min', '30min', '1hour', '6hours', '12hours', '24hours', 'manual'],
      default: '15min'
    },
    
    lastSyncAt: {
      type: Date,
      default: null
    },
    
    nextSyncAt: {
      type: Date,
      default: null
    },
    
    syncFolders: {
      type: [String],
      default: ['INBOX', 'Sent', 'Drafts', 'Trash']
    },
    
    excludeFolders: {
      type: [String],
      default: []
    },
    
    preserveFlags: {
      type: Boolean,
      default: true
    },
    
    preserveDates: {
      type: Boolean,
      default: true
    },
    
    batchSize: {
      type: Number,
      default: 50,
      min: [1, 'Batch size must be at least 1'],
      max: [1000, 'Batch size cannot exceed 1000']
    },
    
    maxEmailsPerSync: {
      type: Number,
      default: 1000,
      min: [1, 'Max emails per sync must be at least 1'],
      max: [10000, 'Max emails per sync cannot exceed 10000']
    }
  },
  
  // Statistics
  statistics: {
    totalEmails: {
      type: Number,
      default: 0
    },
    
    emailsSynced: {
      type: Number,
      default: 0
    },
    
    emailsProcessed: {
      type: Number,
      default: 0
    },
    
    foldersCount: {
      type: Number,
      default: 0
    },
    
    lastEmailDate: {
      type: Date,
      default: null
    },
    
    oldestEmailDate: {
      type: Date,
      default: null
    },
    
    storageUsedMB: {
      type: Number,
      default: 0
    },
    
    averageEmailSize: {
      type: Number,
      default: 0
    }
  },
  
  // Provider Information
  provider: {
    name: {
      type: String,
      enum: ['gmail', 'outlook', 'yahoo', 'icloud', 'custom'],
      default: 'custom'
    },
    
    displayName: {
      type: String,
      default: null
    },
    
    features: [{
      type: String,
      enum: ['imap', 'smtp', 'pop3', 'oauth2', 'labels', 'folders', 'search', 'threading']
    }],
    
    limits: {
      maxConnections: {
        type: Number,
        default: 10
      },
      
      maxEmailsPerRequest: {
        type: Number,
        default: 100
      },
      
      rateLimitPerMinute: {
        type: Number,
        default: 60
      }
    }
  },
  
  // Security
  security: {
    isSecure: {
      type: Boolean,
      default: true
    },
    
    supportsTLS: {
      type: Boolean,
      default: true
    },
    
    certificateValid: {
      type: Boolean,
      default: null
    },
    
    lastSecurityCheck: {
      type: Date,
      default: null
    },
    
    securityScore: {
      type: Number,
      default: 0,
      min: [0, 'Security score cannot be negative'],
      max: [100, 'Security score cannot exceed 100']
    }
  },
  
  // Metadata
  metadata: {
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    
    priority: {
      type: Number,
      default: 1,
      min: [1, 'Priority must be at least 1'],
      max: [10, 'Priority cannot exceed 10']
    },
    
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  
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

// Virtual for connection status
emailAccountSchema.virtual('isConnected').get(function() {
  return this.status === 'active' && this.connectionInfo.lastConnected;
});

// Virtual for sync status
emailAccountSchema.virtual('isSyncEnabled').get(function() {
  return this.syncConfig.enabled && this.isEnabled;
});

// Virtual for next sync time
emailAccountSchema.virtual('timeUntilNextSync').get(function() {
  if (!this.syncConfig.nextSyncAt) return null;
  return Math.max(0, this.syncConfig.nextSyncAt.getTime() - Date.now());
});

// Indexes for performance
emailAccountSchema.index({ userId: 1, email: 1 });
emailAccountSchema.index({ userId: 1, status: 1 });
emailAccountSchema.index({ 'imapConfig.host': 1, 'imapConfig.port': 1 });
emailAccountSchema.index({ 'syncConfig.nextSyncAt': 1 });
emailAccountSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
emailAccountSchema.pre('save', function(next) {
  this.lastModifiedBy = this.userId;
  next();
});

// Pre-save middleware to calculate next sync time
emailAccountSchema.pre('save', function(next) {
  if (this.isModified('syncConfig.frequency') && this.syncConfig.enabled) {
    this.calculateNextSyncTime();
  }
  next();
});

// Instance method to test connection
emailAccountSchema.methods.testConnection = async function() {
  const imapService = require('../services/imapService');
  
  try {
    const config = {
      host: this.imapConfig.host,
      port: this.imapConfig.port,
      secure: this.imapConfig.secure,
      username: this.authConfig.username,
      password: this.authConfig.password,
      authMethod: this.authConfig.method,
      tlsOptions: this.imapConfig.tlsOptions
    };
    
    const isConnected = await imapService.testConnection(config);
    
    if (isConnected) {
      this.status = 'active';
      this.connectionInfo.lastConnected = new Date();
      this.connectionInfo.connectionCount += 1;
      this.connectionInfo.errorCount = 0;
      this.connectionInfo.lastError = null;
    } else {
      this.status = 'error';
      this.connectionInfo.errorCount += 1;
      this.connectionInfo.lastError = {
        message: 'Connection test failed',
        code: 'CONNECTION_FAILED',
        timestamp: new Date()
      };
    }
    
    await this.save();
    return isConnected;
  } catch (error) {
    this.status = 'error';
    this.connectionInfo.errorCount += 1;
    this.connectionInfo.lastError = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date()
    };
    
    await this.save();
    throw error;
  }
};

// Instance method to calculate next sync time
emailAccountSchema.methods.calculateNextSyncTime = function() {
  if (!this.syncConfig.enabled) {
    this.syncConfig.nextSyncAt = null;
    return;
  }
  
  const now = new Date();
  const frequency = this.syncConfig.frequency;
  
  let nextSyncTime;
  
  switch (frequency) {
    case 'realtime':
      nextSyncTime = new Date(now.getTime() + 60000); // 1 minute
      break;
    case '5min':
      nextSyncTime = new Date(now.getTime() + 5 * 60000);
      break;
    case '15min':
      nextSyncTime = new Date(now.getTime() + 15 * 60000);
      break;
    case '30min':
      nextSyncTime = new Date(now.getTime() + 30 * 60000);
      break;
    case '1hour':
      nextSyncTime = new Date(now.getTime() + 60 * 60000);
      break;
    case '6hours':
      nextSyncTime = new Date(now.getTime() + 6 * 60 * 60000);
      break;
    case '12hours':
      nextSyncTime = new Date(now.getTime() + 12 * 60 * 60000);
      break;
    case '24hours':
      nextSyncTime = new Date(now.getTime() + 24 * 60 * 60000);
      break;
    case 'manual':
      nextSyncTime = null;
      break;
    default:
      nextSyncTime = new Date(now.getTime() + 15 * 60000);
  }
  
  this.syncConfig.nextSyncAt = nextSyncTime;
};

// Instance method to update statistics
emailAccountSchema.methods.updateStatistics = function(stats) {
  if (stats.totalEmails !== undefined) {
    this.statistics.totalEmails = stats.totalEmails;
  }
  if (stats.emailsSynced !== undefined) {
    this.statistics.emailsSynced += stats.emailsSynced;
  }
  if (stats.emailsProcessed !== undefined) {
    this.statistics.emailsProcessed += stats.emailsProcessed;
  }
  if (stats.foldersCount !== undefined) {
    this.statistics.foldersCount = stats.foldersCount;
  }
  if (stats.storageUsedMB !== undefined) {
    this.statistics.storageUsedMB = stats.storageUsedMB;
  }
  
  this.syncConfig.lastSyncAt = new Date();
  this.calculateNextSyncTime();
};

// Instance method to check if account needs sync
emailAccountSchema.methods.needsSync = function() {
  if (!this.syncConfig.enabled || !this.isEnabled) return false;
  if (this.syncConfig.frequency === 'manual') return false;
  if (!this.syncConfig.nextSyncAt) return true;
  return this.syncConfig.nextSyncAt <= new Date();
};

// Static method to find accounts that need sync
emailAccountSchema.statics.findAccountsNeedingSync = function() {
  return this.find({
    isEnabled: true,
    'syncConfig.enabled': true,
    'syncConfig.nextSyncAt': { $lte: new Date() },
    status: { $in: ['active', 'inactive'] }
  });
};

// Static method to find accounts by user
emailAccountSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ 'metadata.priority': -1, createdAt: -1 });
};

// Static method to find active accounts
emailAccountSchema.statics.findActiveAccounts = function() {
  return this.find({ status: 'active', isEnabled: true });
};

// Static method to get account statistics
emailAccountSchema.statics.getAccountStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalAccounts: { $sum: 1 },
        activeAccounts: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        enabledAccounts: {
          $sum: { $cond: [{ $eq: ['$isEnabled', true] }, 1, 0] }
        },
        totalEmails: { $sum: '$statistics.totalEmails' },
        totalEmailsSynced: { $sum: '$statistics.emailsSynced' },
        totalStorageUsed: { $sum: '$statistics.storageUsedMB' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAccounts: 0,
    activeAccounts: 0,
    enabledAccounts: 0,
    totalEmails: 0,
    totalEmailsSynced: 0,
    totalStorageUsed: 0
  };
};

// Export the model
const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);

module.exports = EmailAccount;
