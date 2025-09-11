const express = require('express');
const { body, query, param } = require('express-validator');
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules
const searchValidation = [
  body('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('filters.accountId')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return require('mongoose').Types.ObjectId.isValid(value);
    })
    .withMessage('Account ID must be a valid MongoDB ObjectId'),
  
  body('filters.folder')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string';
    })
    .withMessage('Folder must be a string'),
  
  body('filters.from')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string';
    })
    .withMessage('From must be a string'),
  
  body('filters.to')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string';
    })
    .withMessage('To must be a string'),
  
  body('filters.subject')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return typeof value === 'string';
    })
    .withMessage('Subject must be a string'),
  
  body('filters.dateFrom')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return new Date(value).toString() !== 'Invalid Date';
    })
    .withMessage('Date from must be a valid ISO 8601 date'),
  
  body('filters.dateTo')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Allow null, undefined, or empty string
      }
      return new Date(value).toString() !== 'Invalid Date';
    })
    .withMessage('Date to must be a valid ISO 8601 date'),
  
  body('filters.hasAttachments')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true; // Allow null or undefined
      }
      return typeof value === 'boolean';
    })
    .withMessage('Has attachments must be a boolean'),
  
  body('filters.isRead')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true; // Allow null or undefined
      }
      return typeof value === 'boolean';
    })
    .withMessage('Is read must be a boolean'),
  
  body('filters.isFlagged')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true; // Allow null or undefined
      }
      return typeof value === 'boolean';
    })
    .withMessage('Is flagged must be a boolean'),
  
  body('sortBy')
    .optional()
    .isIn(['relevance', 'date', 'subject', 'from', 'to', 'size'])
    .withMessage('Sort by must be one of: relevance, date, subject, from, to, size'),
  
  body('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  body('highlight')
    .optional()
    .isBoolean()
    .withMessage('Highlight must be a boolean')
];

const advancedSearchValidation = [
  body('criteria')
    .isObject()
    .withMessage('Criteria must be an object'),
  
  body('criteria.text')
    .optional()
    .isString()
    .withMessage('Text criteria must be a string'),
  
  body('criteria.sender')
    .optional()
    .isString()
    .withMessage('Sender criteria must be a string'),
  
  body('criteria.recipient')
    .optional()
    .isString()
    .withMessage('Recipient criteria must be a string'),
  
  body('criteria.subject')
    .optional()
    .isString()
    .withMessage('Subject criteria must be a string'),
  
  body('criteria.body')
    .optional()
    .isString()
    .withMessage('Body criteria must be a string'),
  
  body('criteria.attachments')
    .optional()
    .isObject()
    .withMessage('Attachments criteria must be an object'),
  
  body('criteria.attachments.hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('Has attachments must be a boolean'),
  
  body('criteria.attachments.fileTypes')
    .optional()
    .isArray()
    .withMessage('File types must be an array'),
  
  body('criteria.attachments.fileTypes.*')
    .optional()
    .isString()
    .withMessage('Each file type must be a string'),
  
  body('criteria.dateRange')
    .optional()
    .isObject()
    .withMessage('Date range must be an object'),
  
  body('criteria.dateRange.from')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  
  body('criteria.dateRange.to')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),
  
  body('criteria.flags')
    .optional()
    .isObject()
    .withMessage('Flags must be an object'),
  
  body('criteria.flags.isRead')
    .optional()
    .isBoolean()
    .withMessage('Is read must be a boolean'),
  
  body('criteria.flags.isFlagged')
    .optional()
    .isBoolean()
    .withMessage('Is flagged must be a boolean'),
  
  body('criteria.flags.isDeleted')
    .optional()
    .isBoolean()
    .withMessage('Is deleted must be a boolean'),
  
  body('criteria.sizeRange')
    .optional()
    .isObject()
    .withMessage('Size range must be an object'),
  
  body('criteria.sizeRange.min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min size must be a non-negative integer'),
  
  body('criteria.sizeRange.max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max size must be a non-negative integer'),
  
  body('sortBy')
    .optional()
    .isIn(['date', 'subject', 'from', 'to', 'size', 'relevance'])
    .withMessage('Sort by must be one of: date, subject, from, to, size, relevance'),
  
  body('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const saveSearchValidation = [
  body('query')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Search query must be between 1 and 500 characters'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search name cannot exceed 100 characters')
];

const queryValidation = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters'),
  
  query('type')
    .optional()
    .isIn(['all', 'sender', 'subject', 'content'])
    .withMessage('Type must be one of: all, sender, subject, content'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('period')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', '1y'])
    .withMessage('Period must be one of: 1d, 7d, 30d, 90d, 1y'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('accountId')
    .optional()
    .isMongoId()
    .withMessage('Account ID must be a valid MongoDB ObjectId'),
  
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date')
];

const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID')
];

// Routes
router.get('/suggestions', queryValidation, searchController.getSearchSuggestions);
router.get('/popular', queryValidation, searchController.getPopularSearches);
router.get('/filters', queryValidation, searchController.getSearchFilters);
router.get('/saved', queryValidation, searchController.getSavedSearches);
router.get('/stats', queryValidation, searchController.getSearchStats);
router.get('/index-status', searchController.getSearchIndexStatus);
router.get('/saved/:id', paramValidation, searchController.getSavedSearches);

router.post('/search', searchValidation, searchController.searchEmails);
router.post('/advanced', advancedSearchValidation, searchController.advancedSearch);
router.post('/save', saveSearchValidation, searchController.saveSearchQuery);
router.post('/rebuild-index', searchController.rebuildSearchIndex);

router.delete('/cache', searchController.clearSearchCache);
router.delete('/saved/:id', paramValidation, searchController.deleteSavedSearch);

module.exports = router;

