const { validationResult } = require('express-validator');
const Email = require('../models/Email');
const EmailAccount = require('../models/EmailAccount');
const imapService = require('../services/imapService');
const emailSyncService = require('../services/emailSyncService');
const logger = require('../utils/logger');

/**
 * Email Controller
 * Handles email management operations including listing, viewing, and managing emails
 */
class EmailController {
  /**
   * Get emails with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmails(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        folder,
        accountId,
        search,
        from,
        to,
        subject,
        dateFrom,
        dateTo,
        hasAttachments,
        isRead,
        isFlagged,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { userId: req.user._id };

      if (folder) filter.folder = folder;
      if (accountId) filter.emailAccountId = accountId;
      if (from) filter['headers.from'] = { $regex: from, $options: 'i' };
      if (to) filter['headers.to'] = { $regex: to, $options: 'i' };
      if (subject) filter['headers.subject'] = { $regex: subject, $options: 'i' };
      if (hasAttachments !== undefined) filter['content.attachments'] = hasAttachments === 'true' ? { $exists: true, $ne: [] } : { $exists: false };
      if (isRead !== undefined) filter['flags.seen'] = isRead === 'true';
      if (isFlagged !== undefined) filter['flags.flagged'] = isFlagged === 'true';

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Text search
      if (search) {
        filter.$or = [
          { 'headers.subject': { $regex: search, $options: 'i' } },
          { 'headers.from': { $regex: search, $options: 'i' } },
          { 'headers.to': { $regex: search, $options: 'i' } },
          { 'content.text': { $regex: search, $options: 'i' } },
          { 'content.html': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort = {};
      if (sortBy === 'date') {
        sort['headers.date'] = sortOrder === 'desc' ? -1 : 1;
      } else {
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [emails, totalCount] = await Promise.all([
        Email.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('emailAccountId', 'name email server')
          .lean(),
        Email.countDocuments(filter)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          emails,
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
      logger.error('Get emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get email by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailById(req, res) {
    try {
      const { id } = req.params;

      const email = await Email.findOne({
        _id: id,
        userId: req.user._id
      }).populate('emailAccountId', 'name email server');

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      // Mark as read if not already
      if (!email.flags.seen) {
        email.flags.seen = true;
        await email.save();
      }

      res.json({
        success: true,
        data: { email }
      });
    } catch (error) {
      logger.error('Get email by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update email flags
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateEmailFlags(req, res) {
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

      const { id } = req.params;
      const { isRead, isFlagged, isDeleted, isAnswered, isDraft } = req.body;

      const email = await Email.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      // Update flags
      if (isRead !== undefined) {
        email.flags.seen = isRead;
      }
      if (isFlagged !== undefined) email.flags.flagged = isFlagged;
      if (isDeleted !== undefined) email.flags.deleted = isDeleted;
      if (isAnswered !== undefined) email.flags.answered = isAnswered;
      if (isDraft !== undefined) email.flags.draft = isDraft;

      await email.save();

      res.json({
        success: true,
        message: 'Email flags updated successfully',
        data: { email }
      });
    } catch (error) {
      logger.error('Update email flags error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteEmail(req, res) {
    try {
      const { id } = req.params;

      const email = await Email.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }

      // Soft delete
      email.flags.deleted = true;
      await email.save();

      logger.info(`Email deleted: ${email.headers.subject} by user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Email deleted successfully'
      });
    } catch (error) {
      logger.error('Delete email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bulk update emails
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkUpdateEmails(req, res) {
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

      const { emailIds, updates } = req.body;

      if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Email IDs array is required'
        });
      }

      // Build update object
      const updateData = {};
      if (updates.isRead !== undefined) {
        updateData['flags.seen'] = updates.isRead;
      }
      if (updates.isFlagged !== undefined) updateData['flags.flagged'] = updates.isFlagged;
      if (updates.isDeleted !== undefined) {
        updateData['flags.deleted'] = updates.isDeleted;
      }
      if (updates.isAnswered !== undefined) updateData['flags.answered'] = updates.isAnswered;
      if (updates.isDraft !== undefined) updateData['flags.draft'] = updates.isDraft;

      // Update emails
      const result = await Email.updateMany(
        {
          _id: { $in: emailIds },
          userId: req.user._id
        },
        updateData
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} emails updated successfully`,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      });
    } catch (error) {
      logger.error('Bulk update emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email folders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailFolders(req, res) {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          message: 'Account ID is required'
        });
      }

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

      // Get folders from IMAP service
      const folders = await imapService.getFolders(accountId);

      res.json({
        success: true,
        data: { folders }
      });
    } catch (error) {
      logger.error('Get email folders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailStats(req, res) {
    try {
      const { accountId, dateFrom, dateTo } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get statistics
      const stats = await Email.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEmails: { $sum: 1 },
            readEmails: { $sum: { $cond: ['$flags.seen', 1, 0] } },
            flaggedEmails: { $sum: { $cond: ['$flags.flagged', 1, 0] } },
            deletedEmails: { $sum: { $cond: ['$flags.deleted', 1, 0] } },
            emailsWithAttachments: { $sum: { $cond: [{ $gt: [{ $size: '$content.attachments' }, 0] }, 1, 0] } },
            avgSize: { $avg: '$size' }
          }
        }
      ]);

      // Get top senders
      const topSenders = await Email.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$headers.from',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get emails by date
      const emailsByDate = await Email.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$headers.date' },
              month: { $month: '$headers.date' },
              day: { $dayOfMonth: '$headers.date' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 }
      ]);

      res.json({
        success: true,
        data: {
          stats: stats[0] || {
            totalEmails: 0,
            readEmails: 0,
            flaggedEmails: 0,
            deletedEmails: 0,
            emailsWithAttachments: 0,
            avgSize: 0
          },
          topSenders,
          emailsByDate
        }
      });
    } catch (error) {
      logger.error('Get email stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Export emails
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportEmails(req, res) {
    try {
      const {
        format = 'json',
        accountId,
        folder,
        dateFrom,
        dateTo
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;
      if (folder) filter.folder = folder;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      const emails = await Email.find(filter)
        .populate('emailAccountId', 'name email server')
        .lean();

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=emails.json');
        res.json(emails);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(emails);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=emails.csv');
        res.send(csv);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported export format'
        });
      }
    } catch (error) {
      logger.error('Export emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Convert emails to CSV format
   * @param {Array} emails - Array of email objects
   * @returns {string} CSV string
   */
  convertToCSV(emails) {
    if (emails.length === 0) return '';

    const headers = [
      'Date',
      'From',
      'To',
      'Subject',
      'Folder',
      'Account',
      'Size',
      'Is Read',
      'Is Flagged',
      'Has Attachments'
    ];

    const rows = emails.map(email => [
      email.headers.date.toISOString(),
      email.headers.from,
      email.headers.to.join(', '),
      email.headers.subject,
      email.folder,
      email.emailAccountId?.name || '',
      email.content.totalSize,
      email.flags.seen ? 'Yes' : 'No',
      email.flags.flagged ? 'Yes' : 'No',
      email.content.attachments.length > 0 ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}

module.exports = new EmailController();

