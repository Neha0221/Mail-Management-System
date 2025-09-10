const express = require('express');
const { body, param, query } = require('express-validator');
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules
const startSyncValidation = [
  body('accountId')
    .isMongoId()
    .withMessage('Account ID must be a valid MongoDB ObjectId'),
  
  body('syncType')
    .optional()
    .isIn(['full', 'incremental', 'folder'])
    .withMessage('Sync type must be one of: full, incremental, folder'),
  
  body('folders')
    .optional()
    .isArray()
    .withMessage('Folders must be an array'),
  
  body('folders.*')
    .optional()
    .isString()
    .withMessage('Each folder must be a string'),
  
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  
  body('options.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('options.preserveDates')
    .optional()
    .isBoolean()
    .withMessage('Preserve dates must be a boolean'),
  
  body('options.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000')
];

const bulkDeleteValidation = [
  body('jobIds')
    .isArray({ min: 1 })
    .withMessage('Job IDs must be a non-empty array'),
  
  body('jobIds.*')
    .isMongoId()
    .withMessage('Each job ID must be a valid MongoDB ObjectId')
];

const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid job ID')
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
  
  query('status')
    .optional()
    .isIn(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'])
    .withMessage('status must be one of: pending, running, paused, completed, failed, cancelled'),
  
  query('accountId')
    .optional()
    .isMongoId()
    .withMessage('accountId must be a valid MongoDB ObjectId'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'startedAt', 'completedAt', 'status', 'progress'])
    .withMessage('sortBy must be one of: createdAt, startedAt, completedAt, status, progress'),
  
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
    .withMessage('dateTo must be a valid ISO 8601 date')
];

// Routes
router.get('/', queryValidation, syncController.getSyncJobs);
router.get('/stats', queryValidation, syncController.getSyncStats);
router.get('/:id', paramValidation, syncController.getSyncJobById);
router.get('/:id/progress', paramValidation, syncController.getSyncProgress);

router.post('/start', startSyncValidation, syncController.startSync);
router.post('/bulk-delete', bulkDeleteValidation, syncController.bulkDeleteSyncJobs);

router.put('/:id/pause', paramValidation, syncController.pauseSync);
router.put('/:id/resume', paramValidation, syncController.resumeSync);
router.put('/:id/stop', paramValidation, syncController.stopSync);

router.delete('/:id', paramValidation, syncController.deleteSyncJob);

module.exports = router;

