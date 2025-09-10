const express = require('express');
const { body, query } = require('express-validator');
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules
const updateFlagsValidation = [
  body('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
  
  body('isFlagged')
    .optional()
    .isBoolean()
    .withMessage('isFlagged must be a boolean'),
  
  body('isDeleted')
    .optional()
    .isBoolean()
    .withMessage('isDeleted must be a boolean'),
  
  body('isAnswered')
    .optional()
    .isBoolean()
    .withMessage('isAnswered must be a boolean'),
  
  body('isDraft')
    .optional()
    .isBoolean()
    .withMessage('isDraft must be a boolean')
];

const bulkUpdateValidation = [
  body('emailIds')
    .isArray({ min: 1 })
    .withMessage('emailIds must be a non-empty array'),
  
  body('emailIds.*')
    .isMongoId()
    .withMessage('Each email ID must be a valid MongoDB ObjectId'),
  
  body('updates')
    .isObject()
    .withMessage('updates must be an object'),
  
  body('updates.isRead')
    .optional()
    .isBoolean()
    .withMessage('updates.isRead must be a boolean'),
  
  body('updates.isFlagged')
    .optional()
    .isBoolean()
    .withMessage('updates.isFlagged must be a boolean'),
  
  body('updates.isDeleted')
    .optional()
    .isBoolean()
    .withMessage('updates.isDeleted must be a boolean'),
  
  body('updates.isAnswered')
    .optional()
    .isBoolean()
    .withMessage('updates.isAnswered must be a boolean'),
  
  body('updates.isDraft')
    .optional()
    .isBoolean()
    .withMessage('updates.isDraft must be a boolean')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['date', 'subject', 'from', 'to', 'size'])
    .withMessage('sortBy must be one of: date, subject, from, to, size'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date'),
  
  query('hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('hasAttachments must be a boolean'),
  
  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
  
  query('isFlagged')
    .optional()
    .isBoolean()
    .withMessage('isFlagged must be a boolean'),
  
  query('accountId')
    .optional()
    .isMongoId()
    .withMessage('accountId must be a valid MongoDB ObjectId')
];

// Routes
router.get('/', queryValidation, emailController.getEmails);
router.get('/stats', queryValidation, emailController.getEmailStats);
router.get('/folders', emailController.getEmailFolders);
router.get('/export', queryValidation, emailController.exportEmails);
router.get('/:id', emailController.getEmailById);

router.put('/:id/flags', updateFlagsValidation, emailController.updateEmailFlags);
router.put('/bulk-update', bulkUpdateValidation, emailController.bulkUpdateEmails);

router.delete('/:id', emailController.deleteEmail);

module.exports = router;

