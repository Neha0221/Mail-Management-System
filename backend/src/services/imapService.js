const Imap = require('imap');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

/**
 * IMAP Connection Service
 * Manages multiple IMAP connections with pooling, authentication, and reconnection logic
 */
class ImapConnectionService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // Store active connections
    this.connectionPool = new Map(); // Connection pool for each server
    this.reconnectAttempts = new Map(); // Track reconnection attempts
    this.maxReconnectAttempts = parseInt(process.env.IMAP_RECONNECT_ATTEMPTS) || 3;
    this.reconnectDelay = parseInt(process.env.IMAP_RECONNECT_DELAY) || 5000;
    this.connectionTimeout = parseInt(process.env.IMAP_TIMEOUT) || 30000;
    this.maxPoolSize = parseInt(process.env.IMAP_CONNECTION_POOL_SIZE) || 10;
  }

  /**
   * Create IMAP connection configuration
   * @param {Object} config - IMAP server configuration
   * @returns {Object} IMAP connection options
   */
  createImapConfig(config) {
    const {
      host,
      port,
      secure,
      username,
      password,
      authMethod = 'PLAIN',
      tlsOptions = {}
    } = config;

    const imapConfig = {
      user: username,
      password: password,
      host: host,
      port: port || (secure ? 993 : 143),
      tls: secure,
      tlsOptions: {
        rejectUnauthorized: false,
        ...tlsOptions
      },
      connTimeout: this.connectionTimeout,
      authTimeout: this.connectionTimeout,
      keepalive: {
        interval: 10000,
        idleInterval: 300000,
        forceNoop: true
      }
    };

    // Handle different authentication methods
    switch (authMethod.toUpperCase()) {
      case 'OAUTH2':
        imapConfig.xoauth2 = password; // OAuth2 token
        delete imapConfig.password;
        break;
      case 'LOGIN':
        imapConfig.authMethod = 'LOGIN';
        break;
      case 'PLAIN':
      default:
        imapConfig.authMethod = 'PLAIN';
        break;
    }

    return imapConfig;
  }

  /**
   * Create and establish IMAP connection
   * @param {string} connectionId - Unique identifier for the connection
   * @param {Object} config - IMAP server configuration
   * @returns {Promise<Object>} Connection object
   */
  async createConnection(connectionId, config) {
    try {
      const imapConfig = this.createImapConfig(config);
      const imap = new Imap(imapConfig);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${connectionId}`));
        }, this.connectionTimeout);

        imap.once('ready', () => {
          clearTimeout(timeout);
          logger.info(`IMAP connection established: ${connectionId}`);
          
          const connection = {
            id: connectionId,
            imap: imap,
            config: config,
            status: 'connected',
            connectedAt: new Date(),
            lastActivity: new Date()
          };

          this.connections.set(connectionId, connection);
          this.emit('connected', connection);
          resolve(connection);
        });

        imap.once('error', (err) => {
          clearTimeout(timeout);
          logger.error(`IMAP connection error for ${connectionId}:`, err);
          this.emit('error', { connectionId, error: err });
          reject(err);
        });

        // Handle unhandled errors to prevent crashes
        imap.on('error', (err) => {
          logger.error(`Unhandled IMAP error for ${connectionId}:`, err);
        });

        imap.once('end', () => {
          logger.info(`IMAP connection ended: ${connectionId}`);
          this.connections.delete(connectionId);
          this.emit('disconnected', { connectionId });
        });

        imap.connect();
      });
    } catch (error) {
      logger.error(`Failed to create IMAP connection ${connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection from pool or create new one
   * @param {string} connectionId - Connection identifier
   * @param {Object} config - IMAP configuration
   * @returns {Promise<Object>} Connection object
   */
  async getConnection(connectionId, config) {
    // Check if connection already exists and is active
    const existingConnection = this.connections.get(connectionId);
    if (existingConnection && existingConnection.status === 'connected') {
      existingConnection.lastActivity = new Date();
      return existingConnection;
    }

    // Check connection pool
    const poolKey = `${config.host}:${config.port}:${config.username}`;
    const pool = this.connectionPool.get(poolKey) || [];
    
    if (pool.length > 0) {
      const connection = pool.pop();
      connection.id = connectionId;
      connection.lastActivity = new Date();
      this.connections.set(connectionId, connection);
      return connection;
    }

    // Create new connection
    return await this.createConnection(connectionId, config);
  }

  /**
   * Return connection to pool
   * @param {string} connectionId - Connection identifier
   */
  returnConnectionToPool(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const poolKey = `${connection.config.host}:${connection.config.port}:${connection.config.username}`;
    
    if (!this.connectionPool.has(poolKey)) {
      this.connectionPool.set(poolKey, []);
    }

    const pool = this.connectionPool.get(poolKey);
    
    // Only add to pool if pool is not full
    if (pool.length < this.maxPoolSize) {
      connection.status = 'pooled';
      pool.push(connection);
      this.connections.delete(connectionId);
      logger.info(`Connection ${connectionId} returned to pool`);
    } else {
      // Close connection if pool is full
      this.closeConnection(connectionId);
    }
  }

  /**
   * Close specific connection
   * @param {string} connectionId - Connection identifier
   */
  closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.imap.end();
        this.connections.delete(connectionId);
        logger.info(`Connection ${connectionId} closed`);
      } catch (error) {
        logger.error(`Error closing connection ${connectionId}:`, error);
      }
    }
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    logger.info('Closing all IMAP connections...');
    
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.imap.end();
      } catch (error) {
        logger.error(`Error closing connection ${connectionId}:`, error);
      }
    }
    
    this.connections.clear();
    this.connectionPool.clear();
    this.reconnectAttempts.clear();
  }

  /**
   * Handle connection reconnection with exponential backoff
   * @param {string} connectionId - Connection identifier
   * @param {Object} config - IMAP configuration
   */
  async handleReconnection(connectionId, config) {
    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts reached for ${connectionId}`);
      this.emit('maxReconnectAttemptsReached', { connectionId, attempts });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts);
    this.reconnectAttempts.set(connectionId, attempts + 1);

    logger.info(`Reconnecting ${connectionId} in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(async () => {
      try {
        await this.createConnection(connectionId, config);
        this.reconnectAttempts.delete(connectionId);
        this.emit('reconnected', { connectionId });
      } catch (error) {
        logger.error(`Reconnection failed for ${connectionId}:`, error);
        await this.handleReconnection(connectionId, config);
      }
    }, delay);
  }

  /**
   * Get connection status
   * @param {string} connectionId - Connection identifier
   * @returns {Object} Connection status
   */
  getConnectionStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { status: 'not_found' };
    }

    return {
      id: connectionId,
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
      config: {
        host: connection.config.host,
        port: connection.config.port,
        username: connection.config.username
      }
    };
  }

  /**
   * Get all connections status
   * @returns {Array} Array of connection statuses
   */
  getAllConnectionsStatus() {
    const statuses = [];
    for (const [connectionId] of this.connections) {
      statuses.push(this.getConnectionStatus(connectionId));
    }
    return statuses;
  }

  /**
   * Test IMAP connection without storing it
   * @param {Object} config - IMAP configuration
   * @returns {Promise<boolean>} Connection test result
   */
  async testConnection(config) {
    try {
      const imapConfig = this.createImapConfig(config);
      const imap = new Imap(imapConfig);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          imap.end();
          resolve(false);
        }, this.connectionTimeout);

        imap.once('ready', () => {
          clearTimeout(timeout);
          imap.end();
          resolve(true);
        });

        imap.once('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        imap.connect();
      });
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const imapService = new ImapConnectionService();

module.exports = imapService;
