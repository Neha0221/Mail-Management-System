const mongoose = require('mongoose');

/**
 * SyncJob Model
 * Handles email synchronization job tracking, progress, and error management
 */
const syncJobSchema = new mongoose.Schema({
  // User and Account References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: [true, 'Account ID is required'],
    index: true
  },
  
  // Job Identification
  jobId: {
    type: String,
    required: [true, 'Job ID is required'],
    unique: true
  },
  
  name: {
    type: String,
    required: [true, 'Job name is required'],
    trim: true,
    maxlength: [200, 'Job name cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Job Configuration
  syncType: {
    type: String,
    enum: ['full', 'incremental', 'folder'],
    default: 'incremental'
  },
  
  folders: [{
    type: String,
    trim: true
  }],
  
  options: {
    preserveFlags: {
      type: Boolean,
      default: true
    },
    
    preserveDates: {
      type: Boolean,
      default: true
    },
    
    maxEmailsPerSync: {
      type: Number,
      default: 1000,
      min: 1,
      max: 10000
    },
    
    batchSize: {
      type: Number,
      default: 50,
      min: 1,
      max: 500
    },
    
    retryAttempts: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    
    retryDelay: {
      type: Number,
      default: 5000,
      min: 1000,
      max: 60000
    }
  },
  
  // Job Status
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  progress: {
    totalEmails: {
      type: Number,
      default: 0
    },
    
    processedEmails: {
      type: Number,
      default: 0
    },
    
    successfulEmails: {
      type: Number,
      default: 0
    },
    
    failedEmails: {
      type: Number,
      default: 0
    },
    
    skippedEmails: {
      type: Number,
      default: 0
    },
    
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Timing Information
  timing: {
    startedAt: {
      type: Date,
      default: null
    },
    
    completedAt: {
      type: Date,
      default: null
    },
    
    nextRunTime: {
      type: Date,
      default: null,
      index: true
    },
    
    estimatedCompletion: {
      type: Date,
      default: null
    },
    
    duration: {
      type: Number,
      default: 0
    }
  },
  
  // Error Handling
  error: {
    message: {
      type: String
    },
    
    code: {
      type: String
    },
    
    stack: {
      type: String
    },
    
    timestamp: {
      type: Date,
      default: Date.now
    },
    
    retryCount: {
      type: Number,
      default: 0
    }
  },
  
  // Job Results
  results: {
    emailsSynced: {
      type: Number,
      default: 0
    },
    
    emailsSkipped: {
      type: Number,
      default: 0
    },
    
    emailsFailed: {
      type: Number,
      default: 0
    },
    
    foldersProcessed: [{
      name: String,
      emailsCount: Number,
      status: String
    }],
    
    statistics: {
      averageProcessingTime: {
        type: Number,
        default: 0
      },
      
      totalDataTransferred: {
        type: Number,
        default: 0
      },
      
      compressionRatio: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Job Metadata
  metadata: {
    source: {
      type: String,
      default: 'manual'
    },
    
    trigger: {
      type: String,
      enum: ['manual', 'scheduled', 'api', 'webhook'],
      default: 'manual'
    },
    
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    
    tags: [{
      type: String,
      trim: true
    }],
    
    notes: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
syncJobSchema.index({ userId: 1, status: 1 });
syncJobSchema.index({ userId: 1, accountId: 1 });
syncJobSchema.index({ userId: 1, createdAt: -1 });
syncJobSchema.index({ status: 1, 'timing.nextRunTime': 1 });

// Virtual for job duration
syncJobSchema.virtual('duration').get(function() {
  if (this.timing.startedAt && this.timing.completedAt) {
    return this.timing.completedAt.getTime() - this.timing.startedAt.getTime();
  }
  return 0;
});

// Virtual for job status
syncJobSchema.virtual('isRunning').get(function() {
  return this.status === 'running';
});

// Virtual for job completion
syncJobSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for job failure
syncJobSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

// Pre-save middleware to update progress percentage
syncJobSchema.pre('save', function(next) {
  if (this.progress.totalEmails > 0) {
    this.progress.percentage = Math.round(
      (this.progress.processedEmails / this.progress.totalEmails) * 100
    );
  }
  next();
});

// Instance method to start job
syncJobSchema.methods.start = function() {
  this.status = 'running';
  this.timing.startedAt = new Date();
  return this.save();
};

// Instance method to complete job
syncJobSchema.methods.complete = function() {
  this.status = 'completed';
  this.timing.completedAt = new Date();
  this.progress.percentage = 100;
  return this.save();
};

// Instance method to fail job
syncJobSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.timing.completedAt = new Date();
  this.error = {
    message: error.message,
    code: error.code,
    stack: error.stack,
    timestamp: new Date()
  };
  return this.save();
};

// Instance method to pause job
syncJobSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// Instance method to resume job
syncJobSchema.methods.resume = function() {
  this.status = 'running';
  return this.save();
};

// Instance method to cancel job
syncJobSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.timing.completedAt = new Date();
  return this.save();
};

// Instance method to update progress
syncJobSchema.methods.updateProgress = function(progress) {
  Object.assign(this.progress, progress);
  return this.save();
};

// Static method to find jobs by user
syncJobSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.accountId) {
    query.accountId = options.accountId;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to find running jobs
syncJobSchema.statics.findRunningJobs = function() {
  return this.find({ status: 'running' });
};

// Static method to find pending jobs
syncJobSchema.statics.findPendingJobs = function() {
  return this.find({ 
    status: 'pending',
    'timing.nextRunTime': { $lte: new Date() }
  });
};

// Static method to get job statistics
syncJobSchema.statics.getJobStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        runningJobs: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failedJobs: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalEmailsSynced: { $sum: '$results.emailsSynced' },
        averageSyncTime: { $avg: '$timing.duration' }
      }
    }
  ]);
  
  return stats[0] || {
    totalJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalEmailsSynced: 0,
    averageSyncTime: 0
  };
};

// Export the model
const SyncJob = mongoose.model('SyncJob', syncJobSchema);

module.exports = SyncJob;