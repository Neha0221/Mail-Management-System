const mongoose = require('mongoose');

/**
 * Email Model
 * Handles email message storage with full-text search and analytics
 */
const emailSchema = new mongoose.Schema({
  // User and Account References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: [true, 'Email Account ID is required'],
    index: true
  },
  
  // Email Identification
  messageId: {
    type: String,
    required: [true, 'Message ID is required'],
    unique: true
  },
  
  uid: {
    type: Number,
    required: [true, 'UID is required'],
    index: true
  },
  
  // Email Headers
  headers: {
    from: {
      type: String,
      required: [true, 'From header is required'],
      index: true
    },
    
    to: [{
      type: String,
      required: true
    }],
    
    cc: [{
      type: String
    }],
    
    bcc: [{
      type: String
    }],
    
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      index: true
    },
    
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true
    },
    
    replyTo: {
      type: String
    },
    
    inReplyTo: {
      type: String
    },
    
    references: [{
      type: String
    }],
    
    messageId: {
      type: String,
      index: true
    },
    
    threadId: {
      type: String,
      index: true
    }
  },
  
  // Email Content
  content: {
    text: {
      type: String
    },
    
    html: {
      type: String
    },
    
    attachments: [{
      filename: String,
      contentType: String,
      size: Number,
      contentId: String,
      disposition: String,
      data: Buffer
    }],
    
    totalSize: {
      type: Number,
      default: 0
    }
  },
  
  // Email Flags and Status
  flags: {
    seen: {
      type: Boolean,
      default: false
    },
    
    answered: {
      type: Boolean,
      default: false
    },
    
    flagged: {
      type: Boolean,
      default: false
    },
    
    deleted: {
      type: Boolean,
      default: false
    },
    
    draft: {
      type: Boolean,
      default: false
    },
    
    recent: {
      type: Boolean,
      default: false
    }
  },
  
  // Folder Information
  folder: {
    type: String,
    required: [true, 'Folder is required'],
    index: true
  },
  
  // Email Processing Status
  processing: {
    isProcessed: {
      type: Boolean,
      default: false
    },
    
    isIndexed: {
      type: Boolean,
      default: false
    },
    
    processedAt: {
      type: Date,
      default: null
    },
    
    indexedAt: {
      type: Date,
      default: null
    }
  },
  
  // Analytics Data
  analytics: {
    sender: {
      email: {
        type: String,
        index: true
      },
      
      domain: {
        type: String,
        index: true
      },
      
      name: String
    },
    
    recipients: [{
      email: String,
      domain: String,
      name: String
    }],
    
    esp: {
      type: String,
      index: true
    },
    
    size: {
      type: Number,
      default: 0
    },
    
    hasAttachments: {
      type: Boolean,
      default: false
    },
    
    attachmentCount: {
      type: Number,
      default: 0
    },
    
    totalAttachmentSize: {
      type: Number,
      default: 0
    }
  },
  
  // Security Analysis
  security: {
    isSpam: {
      type: Boolean,
      default: false
    },
    
    spamScore: {
      type: Number,
      default: 0
    },
    
    isPhishing: {
      type: Boolean,
      default: false
    },
    
    hasMaliciousLinks: {
      type: Boolean,
      default: false
    },
    
    hasSuspiciousAttachments: {
      type: Boolean,
      default: false
    }
  },
  
  // Email Patterns
  patterns: {
    isNewsletter: {
      type: Boolean,
      default: false
    },
    
    isTransactional: {
      type: Boolean,
      default: false
    },
    
    isPromotional: {
      type: Boolean,
      default: false
    },
    
    isSocial: {
      type: Boolean,
      default: false
    },
    
    isNotification: {
      type: Boolean,
      default: false
    }
  },
  
  // Timing Information
  timing: {
    receivedAt: {
      type: Date,
      default: Date.now
    },
    
    processedAt: {
      type: Date,
      default: null
    },
    
    deltaMinutes: {
      type: Number,
      default: null
    }
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'imap'
    },
    
    version: {
      type: String,
      default: '1.0'
    },
    
    tags: [{
      type: String
    }],
    
    notes: {
      type: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text index for full-text search
emailSchema.index({
  'headers.subject': 'text',
  'headers.from': 'text',
  'content.text': 'text',
  'content.html': 'text'
});

// Compound indexes for performance
emailSchema.index({ userId: 1, emailAccountId: 1 });
emailSchema.index({ userId: 1, 'headers.date': -1 });
emailSchema.index({ userId: 1, folder: 1, 'headers.date': -1 });
emailSchema.index({ userId: 1, 'analytics.sender.domain': 1 });
emailSchema.index({ userId: 1, 'analytics.esp': 1 });
emailSchema.index({ userId: 1, 'flags.seen': 1 });
emailSchema.index({ userId: 1, 'flags.flagged': 1 });
emailSchema.index({ userId: 1, 'patterns.isNewsletter': 1 });
emailSchema.index({ userId: 1, 'security.isSpam': 1 });

// Virtual for email summary
emailSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    subject: this.headers.subject,
    from: this.headers.from,
    date: this.headers.date,
    hasAttachments: this.content.attachments.length > 0,
    isRead: this.flags.seen,
    isFlagged: this.flags.flagged
  };
});

// Virtual for email preview
emailSchema.virtual('preview').get(function() {
  const text = this.content.text || '';
  const html = this.content.html || '';
  const preview = text || html.replace(/<[^>]*>/g, '');
  return preview.substring(0, 200) + (preview.length > 200 ? '...' : '');
});

// Pre-save middleware to update processing status
emailSchema.pre('save', function(next) {
  if (this.isNew) {
    this.processing.isProcessed = false;
    this.processing.isIndexed = false;
  }
  next();
});

// Instance method to mark as processed
emailSchema.methods.markAsProcessed = function() {
  this.processing.isProcessed = true;
  this.processing.processedAt = new Date();
  return this.save();
};

// Instance method to mark as indexed
emailSchema.methods.markAsIndexed = function() {
  this.processing.isIndexed = true;
  this.processing.indexedAt = new Date();
  return this.save();
};

// Instance method to update flags
emailSchema.methods.updateFlags = function(flags) {
  Object.assign(this.flags, flags);
  return this.save();
};

// Static method to find emails by user
emailSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.folder) {
    query.folder = options.folder;
  }
  
  if (options.unreadOnly) {
    query['flags.seen'] = false;
  }
  
  if (options.flaggedOnly) {
    query['flags.flagged'] = true;
  }
  
  return this.find(query)
    .sort({ 'headers.date': -1 })
    .limit(options.limit || 50);
};

// Static method to search emails
emailSchema.statics.searchEmails = function(userId, searchQuery, options = {}) {
  const query = {
    userId,
    $text: { $search: searchQuery }
  };
  
  if (options.folder) {
    query.folder = options.folder;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 50);
};

// Static method to get email statistics
emailSchema.statics.getEmailStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalEmails: { $sum: 1 },
        unreadEmails: { $sum: { $cond: [{ $eq: ['$flags.seen', false] }, 1, 0] } },
        flaggedEmails: { $sum: { $cond: [{ $eq: ['$flags.flagged', true] }, 1, 0] } },
        emailsWithAttachments: { $sum: { $cond: [{ $gt: [{ $size: '$content.attachments' }, 0] }, 1, 0] } },
        totalSize: { $sum: '$content.totalSize' },
        spamEmails: { $sum: { $cond: [{ $eq: ['$security.isSpam', true] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalEmails: 0,
    unreadEmails: 0,
    flaggedEmails: 0,
    emailsWithAttachments: 0,
    totalSize: 0,
    spamEmails: 0
  };
};

// Export the model
const Email = mongoose.model('Email', emailSchema);

module.exports = Email;