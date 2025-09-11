const express = require('express');
const { body, param } = require('express-validator');
const emailAccountController = require('../controllers/emailAccountController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules - Updated to match frontend form structure
const addAccountValidation = [
  body('name')
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ max: 100 })
    .withMessage('Account name cannot exceed 100 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  // IMAP Configuration validation
  body('imapConfig.host')
    .notEmpty()
    .withMessage('IMAP server is required')
    .isLength({ max: 255 })
    .withMessage('Server address cannot exceed 255 characters'),
  
  body('imapConfig.port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be a valid port number (1-65535)'),
  
  body('imapConfig.secure')
    .isBoolean()
    .withMessage('Secure must be a boolean value'),
  
  // Authentication validation
  body('authConfig.method')
    .isIn(['PLAIN', 'LOGIN', 'OAUTH2'])
    .withMessage('Auth method must be one of: PLAIN, LOGIN, OAUTH2'),
  
  body('authConfig.username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 255 })
    .withMessage('Username cannot exceed 255 characters'),
  
  body('authConfig.password')
    .custom((value, { req }) => {
      const authMethod = req.body.authConfig?.method;
      if ((authMethod === 'PLAIN' || authMethod === 'LOGIN') && !value) {
        throw new Error('Password is required for PLAIN and LOGIN authentication');
      }
      return true;
    }),
  
  body('authConfig.oauthToken')
    .custom((value, { req }) => {
      const authMethod = req.body.authConfig?.method;
      if (authMethod === 'OAUTH2' && !value) {
        throw new Error('OAuth token is required for OAUTH2 authentication');
      }
      return true;
    }),
  
  body('authConfig.oauthRefreshToken')
    .custom((value, { req }) => {
      const authMethod = req.body.authConfig?.method;
      if (authMethod === 'OAUTH2' && !value) {
        throw new Error('OAuth refresh token is required for OAUTH2 authentication');
      }
      return true;
    }),
  
  // Sync Configuration validation (optional)
  body('syncConfig')
    .optional()
    .isObject()
    .withMessage('Sync config must be an object'),
  
  body('syncConfig.enabled')
    .optional()
    .isBoolean()
    .withMessage('Sync enabled must be a boolean'),
  
  body('syncConfig.frequency')
    .optional()
    .isIn(['5min', '15min', '30min', '1hour', '6hours', '12hours', '1day'])
    .withMessage('Sync frequency must be a valid option'),
  
  body('syncConfig.batchSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Batch size must be between 1 and 1000'),
  
  body('syncConfig.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000'),
  
  body('syncConfig.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('syncConfig.preserveDates')
    .optional()
    .isBoolean()
    .withMessage('Preserve dates must be a boolean')
];

const updateAccountValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid account ID'),
  
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Account name cannot exceed 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('imapConfig.host')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Server address cannot exceed 255 characters'),
  
  body('imapConfig.port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be a valid port number (1-65535)'),
  
  body('imapConfig.secure')
    .optional()
    .isBoolean()
    .withMessage('Secure must be a boolean value'),
  
  body('authConfig.method')
    .optional()
    .isIn(['PLAIN', 'LOGIN', 'OAUTH2'])
    .withMessage('Auth method must be one of: PLAIN, LOGIN, OAUTH2'),
  
  body('authConfig.username')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Username cannot exceed 255 characters'),
  
  body('authConfig.password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  
  body('authConfig.oauthToken')
    .optional()
    .isLength({ min: 1 })
    .withMessage('OAuth token cannot be empty'),
  
  body('authConfig.oauthRefreshToken')
    .optional()
    .isLength({ min: 1 })
    .withMessage('OAuth refresh token cannot be empty'),
  
  body('syncConfig')
    .optional()
    .isObject()
    .withMessage('Sync config must be an object'),
  
  body('syncConfig.enabled')
    .optional()
    .isBoolean()
    .withMessage('Sync enabled must be a boolean'),
  
  body('syncConfig.frequency')
    .optional()
    .isIn(['5min', '15min', '30min', '1hour', '6hours', '12hours', '1day'])
    .withMessage('Sync frequency must be a valid option'),
  
  body('syncConfig.batchSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Batch size must be between 1 and 1000'),
  
  body('syncConfig.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000'),
  
  body('syncConfig.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('syncConfig.preserveDates')
    .optional()
    .isBoolean()
    .withMessage('Preserve dates must be a boolean')
];

const updateSyncSettingsValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid account ID'),
  
  body('syncConfig')
    .isObject()
    .withMessage('Sync config must be an object'),
  
  body('syncConfig.enabled')
    .optional()
    .isBoolean()
    .withMessage('Sync enabled must be a boolean'),
  
  body('syncConfig.frequency')
    .optional()
    .isIn(['5min', '15min', '30min', '1hour', '6hours', '12hours', '1day'])
    .withMessage('Sync frequency must be a valid option'),
  
  body('syncConfig.batchSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Batch size must be between 1 and 1000'),
  
  body('syncConfig.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000'),
  
  body('syncConfig.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('syncConfig.preserveDates')
    .optional()
    .isBoolean()
    .withMessage('Preserve dates must be a boolean')
];

const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid account ID')
];

// Routes
router.get('/', emailAccountController.getEmailAccounts);
router.get('/:id', paramValidation, emailAccountController.getEmailAccountById);
router.get('/:id/folders', paramValidation, emailAccountController.getAccountFolders);
router.get('/:id/stats', paramValidation, emailAccountController.getAccountStats);

router.post('/', addAccountValidation, emailAccountController.addEmailAccount);
router.post('/:id/test-connection', paramValidation, emailAccountController.testConnection);

router.put('/:id', updateAccountValidation, emailAccountController.updateEmailAccount);
router.put('/:id/sync-settings', updateSyncSettingsValidation, emailAccountController.updateSyncSettings);

router.delete('/:id', paramValidation, emailAccountController.deleteEmailAccount);

module.exports = router;

