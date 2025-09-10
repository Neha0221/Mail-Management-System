const { validationResult } = require('express-validator');
const EmailAccount = require('../models/EmailAccount');
const imapService = require('../services/imapService');
const logger = require('../utils/logger');

/**
 * Email Account Controller
 * Handles email account management including adding, updating, and testing IMAP connections
 */
class EmailAccountController {
  /**
   * Get all email accounts for user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailAccounts(req, res) {
    try {
      const accounts = await EmailAccount.find({ userId: req.user._id })
        .select('-password -oauthToken -oauthRefreshToken')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: { accounts }
      });
    } catch (error) {
      logger.error('Get email accounts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get email account by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getEmailAccountById(req, res) {
    try {
      const { id } = req.params;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      }).select('-password -oauthToken -oauthRefreshToken');

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      res.json({
        success: true,
        data: { account }
      });
    } catch (error) {
      logger.error('Get email account by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Add new email account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addEmailAccount(req, res) {
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
        name,
        email,
        imapConfig,
        authConfig,
        syncConfig
      } = req.body;

      // Check if account already exists
      const existingAccount = await EmailAccount.findOne({
        email,
        userId: req.user._id
      });

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          message: 'Email account already exists'
        });
      }

      // Create new email account
      const account = new EmailAccount({
        userId: req.user._id,
        name,
        email,
        imapConfig: imapConfig || {
          host: 'imap.gmail.com',
          port: 993,
          secure: true
        },
        authConfig: authConfig || {
          method: 'PLAIN',
          username: email,
          password: 'default-password'
        },
        syncConfig: syncConfig || {
          enabled: true,
          frequency: '15min',
          preserveFlags: true,
          preserveDates: true,
          batchSize: 50,
          maxEmailsPerSync: 1000
        }
      });

      await account.save();

      // Test connection
      try {
        const connectionTest = await imapService.testConnection(account._id);
        account.connectionStatus = connectionTest.success ? 'connected' : 'failed';
        account.lastConnectionTest = new Date();
        await account.save();
      } catch (error) {
        logger.warn(`Connection test failed for account ${account.email}:`, error.message);
        account.connectionStatus = 'failed';
        account.lastConnectionTest = new Date();
        await account.save();
      }

      logger.info(`New email account added: ${account.email} by user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Email account added successfully',
        data: {
          account: {
            id: account._id,
            name: account.name,
            email: account.email,
            imapConfig: {
              host: account.imapConfig.host,
              port: account.imapConfig.port,
              secure: account.imapConfig.secure
            },
            authConfig: {
              method: account.authConfig.method,
              username: account.authConfig.username
            },
            status: account.status,
            isEnabled: account.isEnabled,
            syncConfig: account.syncConfig,
            createdAt: account.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Add email account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update email account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateEmailAccount(req, res) {
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
      const updateData = req.body;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Update account fields
      const allowedFields = [
        'name', 'server', 'port', 'secure', 'authMethod',
        'username', 'password', 'oauthToken', 'oauthRefreshToken', 'syncSettings'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          account[field] = updateData[field];
        }
      });

      await account.save();

      // Test connection if server details changed
      if (updateData.server || updateData.port || updateData.secure || updateData.authMethod) {
        try {
          const connectionTest = await imapService.testConnection(account._id);
          account.connectionStatus = connectionTest.success ? 'connected' : 'failed';
          account.lastConnectionTest = new Date();
          await account.save();
        } catch (error) {
          logger.warn(`Connection test failed for account ${account.email}:`, error.message);
          account.connectionStatus = 'failed';
          account.lastConnectionTest = new Date();
          await account.save();
        }
      }

      res.json({
        success: true,
        message: 'Email account updated successfully',
        data: {
          account: {
            id: account._id,
            name: account.name,
            email: account.email,
            server: account.server,
            port: account.port,
            secure: account.secure,
            authMethod: account.authMethod,
            connectionStatus: account.connectionStatus,
            lastConnectionTest: account.lastConnectionTest,
            syncSettings: account.syncSettings,
            updatedAt: account.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Update email account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete email account
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteEmailAccount(req, res) {
    try {
      const { id } = req.params;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Close IMAP connection if active
      try {
        await imapService.closeConnection(id);
      } catch (error) {
        logger.warn(`Error closing IMAP connection for account ${id}:`, error.message);
      }

      // Delete account
      await EmailAccount.findByIdAndDelete(id);

      logger.info(`Email account deleted: ${account.email} by user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Email account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete email account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Test email account connection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async testConnection(req, res) {
    try {
      const { id } = req.params;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Test connection
      const connectionTest = await imapService.testConnection(id);

      // Update account status
      account.connectionStatus = connectionTest.success ? 'connected' : 'failed';
      account.lastConnectionTest = new Date();
      if (connectionTest.error) {
        account.lastError = connectionTest.error;
      }
      await account.save();

      res.json({
        success: true,
        message: connectionTest.success ? 'Connection test successful' : 'Connection test failed',
        data: {
          connectionTest,
          account: {
            id: account._id,
            connectionStatus: account.connectionStatus,
            lastConnectionTest: account.lastConnectionTest,
            lastError: account.lastError
          }
        }
      });
    } catch (error) {
      logger.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get account folders
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAccountFolders(req, res) {
    try {
      const { id } = req.params;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Get folders from IMAP service
      const folders = await imapService.getFolders(id);

      res.json({
        success: true,
        data: { folders }
      });
    } catch (error) {
      logger.error('Get account folders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update sync settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateSyncSettings(req, res) {
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
      const { syncSettings } = req.body;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Update sync settings
      account.syncSettings = { ...account.syncSettings, ...syncSettings };
      await account.save();

      res.json({
        success: true,
        message: 'Sync settings updated successfully',
        data: {
          account: {
            id: account._id,
            syncSettings: account.syncSettings
          }
        }
      });
    } catch (error) {
      logger.error('Update sync settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get account statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAccountStats(req, res) {
    try {
      const { id } = req.params;

      const account = await EmailAccount.findOne({
        _id: id,
        userId: req.user._id
      });

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Email account not found'
        });
      }

      // Get account statistics
      const stats = await EmailAccount.getAccountStats(id);

      res.json({
        success: true,
        data: {
          account: {
            id: account._id,
            name: account.name,
            email: account.email,
            connectionStatus: account.connectionStatus,
            lastConnectionTest: account.lastConnectionTest,
            lastSync: account.lastSync,
            syncSettings: account.syncSettings
          },
          stats
        }
      });
    } catch (error) {
      logger.error('Get account stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new EmailAccountController();

