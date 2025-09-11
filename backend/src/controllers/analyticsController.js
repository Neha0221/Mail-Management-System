const { validationResult } = require('express-validator');
const Email = require('../models/Email');
const EmailAccount = require('../models/EmailAccount');
const emailAnalyticsService = require('../services/emailAnalyticsService');
const logger = require('../utils/logger');

/**
 * Analytics Controller
 * Handles email analytics operations including sender analysis, ESP detection, and security insights
 */
class AnalyticsController {
  /**
   * Get email analytics overview
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAnalyticsOverview(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo,
        groupBy = 'day'
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get analytics overview from database
      const overview = await AnalyticsController.getBasicAnalyticsOverview(filter);

      res.json({
        success: true,
        data: { overview }
      });
    } catch (error) {
      logger.error('Get analytics overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get analytics dashboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboardData(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get dashboard data using basic overview
      const dashboardData = await AnalyticsController.getBasicAnalyticsOverview(filter);

      res.json({
        success: true,
        data: { dashboardData }
      });
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get sender analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSenderAnalytics(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo,
        limit = 10
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get sender analytics
      const senderAnalytics = await Email.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$headers.from',
            count: { $sum: 1 },
            lastEmail: { $max: '$headers.date' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) },
        {
          $project: {
            sender: {
              email: '$_id',
              name: { $ifNull: ['$analytics.sender.name', null] }
            },
            count: 1,
            lastEmail: 1,
            percentage: { $multiply: [{ $divide: ['$count', { $sum: '$count' }] }, 100] }
          }
        }
      ]);

      res.json({
        success: true,
        data: { senderAnalytics }
      });
    } catch (error) {
      logger.error('Get sender analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get domain analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDomainAnalytics(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo,
        limit = 10
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get domain analytics
      const domainAnalytics = await Email.aggregate([
        { $match: filter },
        {
          $addFields: {
            domain: {
              $arrayElemAt: [
                { $split: ['$headers.from', '@'] },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 },
            lastEmail: { $max: '$headers.date' },
            esp: { $first: '$analytics.esp.provider' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) },
        {
          $project: {
            domain: '$_id',
            count: 1,
            lastEmail: 1,
            esp: { $ifNull: ['$esp', 'Unknown'] }
          }
        }
      ]);

      res.json({
        success: true,
        data: { domainAnalytics }
      });
    } catch (error) {
      logger.error('Get domain analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get ESP analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getESPAnalytics(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo,
        limit = 10
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Get ESP analytics
      const espAnalytics = await Email.aggregate([
        { $match: filter },
        {
          $addFields: {
            domain: {
              $arrayElemAt: [
                { $split: ['$headers.from', '@'] },
                1
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              $cond: {
                if: { $ne: ['$analytics.esp.provider', null] },
                then: '$analytics.esp.provider',
                else: {
                  $switch: {
                    branches: [
                      { case: { $regexMatch: { input: '$domain', regex: /gmail\.com$/i } }, then: 'Gmail' },
                      { case: { $regexMatch: { input: '$domain', regex: /outlook\.com|hotmail\.com|live\.com$/i } }, then: 'Outlook' },
                      { case: { $regexMatch: { input: '$domain', regex: /yahoo\.com$/i } }, then: 'Yahoo' },
                      { case: { $regexMatch: { input: '$domain', regex: /amazonaws\.com$/i } }, then: 'Amazon SES' },
                      { case: { $regexMatch: { input: '$domain', regex: /sendgrid\.net$/i } }, then: 'SendGrid' },
                      { case: { $regexMatch: { input: '$domain', regex: /mailchimp\.com$/i } }, then: 'Mailchimp' }
                    ],
                    default: 'Other'
                  }
                }
              }
            },
            count: { $sum: 1 },
            lastEmail: { $max: '$headers.date' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) },
        {
          $project: {
            esp: '$_id',
            count: 1,
            lastEmail: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: { espAnalytics }
      });
    } catch (error) {
      logger.error('Get ESP analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get time delta analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTimeDeltaAnalytics(req, res) {
    try {
      res.json({
        success: true,
        data: { timeDeltaAnalytics: [] }
      });
    } catch (error) {
      logger.error('Get time delta analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get security analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSecurityAnalytics(req, res) {
    try {
      res.json({
        success: true,
        data: { securityAnalytics: {} }
      });
    } catch (error) {
      logger.error('Get security analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email volume trends
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailVolumeTrends(req, res) {
    try {
      const {
        accountId,
        dateFrom,
        dateTo,
        period = 'day'
      } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.emailAccountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter['headers.date'] = {};
        if (dateFrom) filter['headers.date'].$gte = new Date(dateFrom);
        if (dateTo) filter['headers.date'].$lte = new Date(dateTo);
      }

      // Determine date grouping
      let dateGroup;
      switch (period) {
        case 'hour':
          dateGroup = {
            year: { $year: '$headers.date' },
            month: { $month: '$headers.date' },
            day: { $dayOfMonth: '$headers.date' },
            hour: { $hour: '$headers.date' }
          };
          break;
        case 'week':
          dateGroup = {
            year: { $year: '$headers.date' },
            week: { $week: '$headers.date' }
          };
          break;
        case 'month':
          dateGroup = {
            year: { $year: '$headers.date' },
            month: { $month: '$headers.date' }
          };
          break;
        default: // day
          dateGroup = {
            year: { $year: '$headers.date' },
            month: { $month: '$headers.date' },
            day: { $dayOfMonth: '$headers.date' }
          };
      }

      // Get volume trends
      const volumeTrends = await Email.aggregate([
        { $match: filter },
        {
          $group: {
            _id: dateGroup,
            count: { $sum: 1 },
            date: { $first: '$headers.date' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.week': 1 } },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
                hour: '$_id.hour'
              }
            },
            count: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: { volumeTrends }
      });
    } catch (error) {
      logger.error('Get email volume trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email size analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailSizeAnalytics(req, res) {
    try {
      res.json({
        success: true,
        data: { sizeAnalytics: {} }
      });
    } catch (error) {
      logger.error('Get email size analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get attachment analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAttachmentAnalytics(req, res) {
    try {
      res.json({
        success: true,
        data: { attachmentAnalytics: [] }
      });
    } catch (error) {
      logger.error('Get attachment analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email patterns analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailPatterns(req, res) {
    try {
      res.json({
        success: true,
        data: { patterns: [] }
      });
    } catch (error) {
      logger.error('Get email patterns error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Export analytics data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async exportAnalytics(req, res) {
    try {
      res.json({
        success: true,
        message: 'Export functionality not implemented yet'
      });
    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get basic analytics overview from database
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Object>} Analytics overview
   */
  static async getBasicAnalyticsOverview(filter) {
    try {
      // Get email counts
      const totalEmails = await Email.countDocuments(filter);
      
      // Get account counts
      const totalAccounts = await EmailAccount.countDocuments({ userId: filter.userId });
      const activeAccounts = await EmailAccount.countDocuments({ 
        userId: filter.userId, 
        status: 'active' 
      });

      // Get recent email counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      
      const thisMonth = new Date();
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      const emailsToday = await Email.countDocuments({
        ...filter,
        'headers.date': { $gte: today }
      });

      const emailsThisWeek = await Email.countDocuments({
        ...filter,
        'headers.date': { $gte: thisWeek }
      });

      const emailsThisMonth = await Email.countDocuments({
        ...filter,
        'headers.date': { $gte: thisMonth }
      });

      // Get last sync time
      const lastSyncAccount = await EmailAccount.findOne({
        userId: filter.userId,
        'syncConfig.lastSyncAt': { $exists: true }
      }).sort({ 'syncConfig.lastSyncAt': -1 });

      // Calculate storage used (approximate)
      const storageResult = await Email.aggregate([
        { $match: filter },
        { $group: { _id: null, totalSize: { $sum: '$content.totalSize' } } }
      ]);

      const storageUsed = storageResult.length > 0 ? storageResult[0].totalSize : 0;

      return {
        totalEmails,
        totalAccounts,
        activeAccounts,
        lastSync: lastSyncAccount?.syncConfig?.lastSyncAt || null,
        storageUsed: Math.round(storageUsed / 1024 / 1024), // Convert to MB
        emailsToday,
        emailsThisWeek,
        emailsThisMonth
      };
    } catch (error) {
      logger.error('Error getting basic analytics overview:', error);
      return {
        totalEmails: 0,
        totalAccounts: 0,
        activeAccounts: 0,
        lastSync: null,
        storageUsed: 0,
        emailsToday: 0,
        emailsThisWeek: 0,
        emailsThisMonth: 0
      };
    }
  }
}

module.exports = new AnalyticsController();