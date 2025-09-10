const express = require('express');
const { body, param } = require('express-validator');
const emailAccountController = require('../controllers/emailAccountController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Validation rules
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
  
  body('server')
    .notEmpty()
    .withMessage('IMAP server is required')
    .isLength({ max: 255 })
    .withMessage('Server address cannot exceed 255 characters'),
  
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be a valid port number (1-65535)'),
  
  body('secure')
    .isBoolean()
    .withMessage('Secure must be a boolean value'),
  
  body('authMethod')
    .isIn(['PLAIN', 'LOGIN', 'OAUTH2'])
    .withMessage('Auth method must be one of: PLAIN, LOGIN, OAUTH2'),
  
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 255 })
    .withMessage('Username cannot exceed 255 characters'),
  
  body('password')
    .custom((value, { req }) => {
      if ((req.body.authMethod === 'PLAIN' || req.body.authMethod === 'LOGIN') && !value) {
        throw new Error('Password is required for PLAIN and LOGIN authentication');
      }
      return true;
    }),
  
  body('oauthToken')
    .custom((value, { req }) => {
      if (req.body.authMethod === 'OAUTH2' && !value) {
        throw new Error('OAuth token is required for OAUTH2 authentication');
      }
      return true;
    }),
  
  body('oauthRefreshToken')
    .custom((value, { req }) => {
      if (req.body.authMethod === 'OAUTH2' && !value) {
        throw new Error('OAuth refresh token is required for OAUTH2 authentication');
      }
      return true;
    }),
  
  body('syncSettings')
    .optional()
    .isObject()
    .withMessage('Sync settings must be an object'),
  
  body('syncSettings.enabled')
    .optional()
    .isBoolean()
    .withMessage('Sync enabled must be a boolean'),
  
  body('syncSettings.syncInterval')
    .optional()
    .isInt({ min: 60000 })
    .withMessage('Sync interval must be at least 60000ms (1 minute)'),
  
  body('syncSettings.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000'),
  
  body('syncSettings.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('syncSettings.preserveDates')
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
  
  body('server')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Server address cannot exceed 255 characters'),
  
  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be a valid port number (1-65535)'),
  
  body('secure')
    .optional()
    .isBoolean()
    .withMessage('Secure must be a boolean value'),
  
  body('authMethod')
    .optional()
    .isIn(['PLAIN', 'LOGIN', 'OAUTH2'])
    .withMessage('Auth method must be one of: PLAIN, LOGIN, OAUTH2'),
  
  body('username')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Username cannot exceed 255 characters'),
  
  body('password')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  
  body('oauthToken')
    .optional()
    .isLength({ min: 1 })
    .withMessage('OAuth token cannot be empty'),
  
  body('oauthRefreshToken')
    .optional()
    .isLength({ min: 1 })
    .withMessage('OAuth refresh token cannot be empty'),
  
  body('syncSettings')
    .optional()
    .isObject()
    .withMessage('Sync settings must be an object')
];

const updateSyncSettingsValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid account ID'),
  
  body('syncSettings')
    .isObject()
    .withMessage('Sync settings must be an object'),
  
  body('syncSettings.enabled')
    .optional()
    .isBoolean()
    .withMessage('Sync enabled must be a boolean'),
  
  body('syncSettings.syncInterval')
    .optional()
    .isInt({ min: 60000 })
    .withMessage('Sync interval must be at least 60000ms (1 minute)'),
  
  body('syncSettings.maxEmailsPerSync')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max emails per sync must be between 1 and 10000'),
  
  body('syncSettings.preserveFlags')
    .optional()
    .isBoolean()
    .withMessage('Preserve flags must be a boolean'),
  
  body('syncSettings.preserveDates')
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

