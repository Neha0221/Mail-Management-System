const express = require('express');
const { query } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules
const analyticsQueryValidation = [
  query('accountId')
    .optional()
    .isMongoId()
    .withMessage('accountId must be a valid MongoDB ObjectId'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be between 1 and 1000'),
  
  query('sortBy')
    .optional()
    .isIn(['count', 'percentage', 'avgSize', 'lastEmailDate'])
    .withMessage('sortBy must be one of: count, percentage, avgSize, lastEmailDate'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
  
  query('groupBy')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('groupBy must be one of: hour, day, week, month'),
  
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('period must be one of: 7d, 30d, 90d, 1y'),
  
  query('patternType')
    .optional()
    .isIn(['all', 'spam', 'newsletter', 'transactional', 'promotional'])
    .withMessage('patternType must be one of: all, spam, newsletter, transactional, promotional')
];

const exportValidation = [
  query('type')
    .isIn(['senders', 'domains', 'esp', 'security'])
    .withMessage('type must be one of: senders, domains, esp, security'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('format must be json or csv'),
  
  query('accountId')
    .optional()
    .isMongoId()
    .withMessage('accountId must be a valid MongoDB ObjectId'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date')
];

// Routes
router.get('/overview', analyticsQueryValidation, analyticsController.getAnalyticsOverview);
router.get('/dashboard', analyticsQueryValidation, analyticsController.getDashboardData);
router.get('/senders', analyticsQueryValidation, analyticsController.getSenderAnalytics);
router.get('/domains', analyticsQueryValidation, analyticsController.getDomainAnalytics);
router.get('/esp', analyticsQueryValidation, analyticsController.getESPAnalytics);
router.get('/time-delta', analyticsQueryValidation, analyticsController.getTimeDeltaAnalytics);
router.get('/security', analyticsQueryValidation, analyticsController.getSecurityAnalytics);
router.get('/volume-trends', analyticsQueryValidation, analyticsController.getEmailVolumeTrends);
router.get('/size-analytics', analyticsQueryValidation, analyticsController.getEmailSizeAnalytics);
router.get('/attachments', analyticsQueryValidation, analyticsController.getAttachmentAnalytics);
router.get('/patterns', analyticsQueryValidation, analyticsController.getEmailPatterns);
router.get('/export', exportValidation, analyticsController.exportAnalytics);

module.exports = router;

