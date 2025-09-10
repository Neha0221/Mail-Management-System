const { validationResult } = require('express-validator');
const SyncJob = require('../models/SyncJob');
const EmailAccount = require('../models/EmailAccount');
const emailSyncService = require('../services/emailSyncService');
const logger = require('../utils/logger');

/**
 * Sync Controller
 * Handles email synchronization operations including starting, stopping, and monitoring sync jobs
 */
class SyncController {
  /**
   * Get all sync jobs for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSyncJobs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        accountId,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (status) filter.status = status;
      if (accountId) filter.accountId = accountId;

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [jobs, totalCount] = await Promise.all([
        SyncJob.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('accountId', 'name email server')
          .lean(),
        SyncJob.countDocuments(filter)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get sync jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sync job by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSyncJobById(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      }).populate('accountId', 'name email server');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      res.json({
        success: true,
        data: { job }
      });
    } catch (error) {
      logger.error('Get sync job by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Start sync job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startSync(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        accountId,
        syncType = 'full',
        folders = [],
        options = {}
      } = req.body;

      // Verify account belongs to user
      const account = await EmailAccount.findOne({
        _id: accountId,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Check if account is connected
      if (account.connectionStatus !== 'connected') {
        return res.status(400).json({
          success: false,
          message: 'Email account is not connected. Please test connection first.'
        });
      }

      // Check for existing running sync job
      const existingJob = await SyncJob.findOne({
        accountId,
        userId: req.user._id,
        status: { $in: ['pending', 'running', 'paused'] }
      });

      if (existingJob) {
        return res.status(409).json({
          success: false,
          message: 'A sync job is already running for this account'
        });
      }

      // Create sync job
      const job = new SyncJob({
        userId: req.user._id,
        accountId,
        syncType,
        folders,
        options: {
          preserveFlags: options.preserveFlags !== false,
          preserveDates: options.preserveDates !== false,
          maxEmailsPerSync: options.maxEmailsPerSync || account.syncSettings.maxEmailsPerSync,
          ...options
        }
      });

      await job.save();

      // Start sync process
      try {
        await emailSyncService.startSync(job._id);
        
        logger.info(`Sync job started: ${job._id} for account: ${account.email}`);

        res.status(201).json({
          success: true,
          message: 'Sync job started successfully',
          data: {
            job: {
              id: job._id,
              accountId: job.accountId,
              syncType: job.syncType,
              status: job.status,
              progress: job.progress,
              folders: job.folders,
              options: job.options,
              createdAt: job.createdAt
            }
          }
        });
      } catch (error) {
        // Update job status to failed
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        await job.save();

        logger.error(`Sync job failed to start: ${job._id}`, error);

        res.status(500).json({
          success: false,
          message: 'Failed to start sync job',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    } catch (error) {
      logger.error('Start sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Pause sync job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async pauseSync(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      if (job.status !== 'running') {
        return res.status(400).json({
          success: false,
          message: 'Only running sync jobs can be paused'
        });
      }

      // Pause sync
      await emailSyncService.pauseSync(id);

      res.json({
        success: true,
        message: 'Sync job paused successfully'
      });
    } catch (error) {
      logger.error('Pause sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resume sync job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resumeSync(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      if (job.status !== 'paused') {
        return res.status(400).json({
          success: false,
          message: 'Only paused sync jobs can be resumed'
        });
      }

      // Resume sync
      await emailSyncService.resumeSync(id);

      res.json({
        success: true,
        message: 'Sync job resumed successfully'
      });
    } catch (error) {
      logger.error('Resume sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Stop sync job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async stopSync(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      if (!['running', 'paused'].includes(job.status)) {
        return res.status(400).json({
          success: false,
          message: 'Only running or paused sync jobs can be stopped'
        });
      }

      // Stop sync
      await emailSyncService.stopSync(id);

      res.json({
        success: true,
        message: 'Sync job stopped successfully'
      });
    } catch (error) {
      logger.error('Stop sync error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sync progress
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSyncProgress(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      res.json({
        success: true,
        data: {
          job: {
            id: job._id,
            status: job.status,
            progress: job.progress,
            currentFolder: job.currentFolder,
            processedEmails: job.processedEmails,
            totalEmails: job.totalEmails,
            errors: job.errors,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            estimatedTimeRemaining: job.estimatedTimeRemaining
          }
        }
      });
    } catch (error) {
      logger.error('Get sync progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sync statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSyncStats(req, res) {
    try {
      const { accountId, dateFrom, dateTo } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.accountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo);
      }

      // Get statistics
      const stats = await SyncJob.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            failedJobs: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            runningJobs: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
            pausedJobs: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
            totalEmailsProcessed: { $sum: '$processedEmails' },
            avgSyncTime: { $avg: { $subtract: ['$completedAt', '$startedAt'] } }
          }
        }
      ]);

      // Get recent sync jobs
      const recentJobs = await SyncJob.find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('accountId', 'name email')
        .select('status progress processedEmails totalEmails createdAt completedAt')
        .lean();

      res.json({
        success: true,
        data: {
          stats: stats[0] || {
            totalJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            runningJobs: 0,
            pausedJobs: 0,
            totalEmailsProcessed: 0,
            avgSyncTime: 0
          },
          recentJobs
        }
      });
    } catch (error) {
      logger.error('Get sync stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete sync job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteSyncJob(req, res) {
    try {
      const { id } = req.params;

      const job = await SyncJob.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Sync job not found'
        });
      }

      // Stop job if running
      if (['running', 'paused'].includes(job.status)) {
        await emailSyncService.stopSync(id);
      }

      // Delete job
      await SyncJob.findByIdAndDelete(id);

      logger.info(`Sync job deleted: ${id} by user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Sync job deleted successfully'
      });
    } catch (error) {
      logger.error('Delete sync job error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bulk delete sync jobs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkDeleteSyncJobs(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Job IDs array is required'
        });
      }

      // Get jobs to delete
      const jobs = await SyncJob.find({
        _id: { $in: jobIds },
        userId: req.user._id
      });

      // Stop running jobs
      const runningJobs = jobs.filter(job => ['running', 'paused'].includes(job.status));
      for (const job of runningJobs) {
        try {
          await emailSyncService.stopSync(job._id);
        } catch (error) {
          logger.warn(`Error stopping sync job ${job._id}:`, error.message);
        }
      }

      // Delete jobs
      const result = await SyncJob.deleteMany({
        _id: { $in: jobIds },
        userId: req.user._id
      });

      logger.info(`${result.deletedCount} sync jobs deleted by user: ${req.user.email}`);

      res.json({
        success: true,
        message: `${result.deletedCount} sync jobs deleted successfully`,
        data: {
          deletedCount: result.deletedCount
        }
      });
    } catch (error) {
      logger.error('Bulk delete sync jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new SyncController();

