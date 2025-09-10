const { EventEmitter } = require('events');
const imapService = require('./imapService');
const logger = require('../utils/logger');

/**
 * Email Sync Service
 * Handles email synchronization between IMAP servers with folder hierarchy, 
 * message flags preservation, and pause/resume capabilities
 */
class EmailSyncService extends EventEmitter {
  constructor() {
    super();
    this.syncJobs = new Map(); // Active sync jobs
    this.syncQueue = new Map(); // Sync queue for each connection
    this.pausedJobs = new Set(); // Paused job IDs
    this.syncStats = new Map(); // Sync statistics
    this.batchSize = parseInt(process.env.SYNC_BATCH_SIZE) || 50;
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL) || 300000; // 5 minutes
    this.syncTimeout = parseInt(process.env.SYNC_TIMEOUT) || 300000; // 5 minutes
  }

  /**
   * Start email synchronization between source and destination
   * @param {string} jobId - Unique job identifier
   * @param {Object} sourceConfig - Source IMAP configuration
   * @param {Object} destinationConfig - Destination IMAP configuration
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync job object
   */
  async startSync(jobId, sourceConfig, destinationConfig, options = {}) {
    try {
      logger.info(`Starting sync job: ${jobId}`);

      const syncJob = {
        id: jobId,
        sourceConfig,
        destinationConfig,
        options: {
          syncFolders: options.syncFolders || true,
          preserveFlags: options.preserveFlags || true,
          preserveDates: options.preserveDates || true,
          batchSize: options.batchSize || this.batchSize,
          ...options
        },
        status: 'starting',
        startTime: new Date(),
        endTime: null,
        progress: {
          totalFolders: 0,
          processedFolders: 0,
          totalEmails: 0,
          processedEmails: 0,
          errors: 0
        },
        stats: {
          emailsSynced: 0,
          emailsSkipped: 0,
          emailsFailed: 0,
          foldersCreated: 0,
          foldersSkipped: 0
        }
      };

      this.syncJobs.set(jobId, syncJob);
      this.emit('syncStarted', syncJob);

      // Get connections to both servers
      const sourceConnection = await imapService.getConnection(`${jobId}_source`, sourceConfig);
      const destinationConnection = await imapService.getConnection(`${jobId}_destination`, destinationConfig);

      syncJob.status = 'running';
      this.emit('syncRunning', syncJob);

      // Start the sync process
      await this.performSync(syncJob, sourceConnection, destinationConnection);

      syncJob.status = 'completed';
      syncJob.endTime = new Date();
      this.emit('syncCompleted', syncJob);

      return syncJob;
    } catch (error) {
      logger.error(`Sync job ${jobId} failed:`, error);
      
      const syncJob = this.syncJobs.get(jobId);
      if (syncJob) {
        syncJob.status = 'failed';
        syncJob.endTime = new Date();
        syncJob.error = error.message;
        this.emit('syncFailed', syncJob);
      }
      
      throw error;
    }
  }

  /**
   * Perform the actual email synchronization
   * @param {Object} syncJob - Sync job object
   * @param {Object} sourceConnection - Source IMAP connection
   * @param {Object} destinationConnection - Destination IMAP connection
   */
  async performSync(syncJob, sourceConnection, destinationConnection) {
    try {
      // Step 1: Get folder hierarchy from source
      const sourceFolders = await this.getFolderHierarchy(sourceConnection.imap);
      syncJob.progress.totalFolders = sourceFolders.length;
      this.emit('foldersDiscovered', { jobId: syncJob.id, folders: sourceFolders });

      // Step 2: Create folder hierarchy in destination
      await this.createFolderHierarchy(destinationConnection.imap, sourceFolders, syncJob);

      // Step 3: Sync emails from each folder
      for (const folder of sourceFolders) {
        if (this.pausedJobs.has(syncJob.id)) {
          syncJob.status = 'paused';
          this.emit('syncPaused', syncJob);
          return;
        }

        await this.syncFolderEmails(syncJob, sourceConnection.imap, destinationConnection.imap, folder);
        syncJob.progress.processedFolders++;
        this.emit('folderCompleted', { jobId: syncJob.id, folder, progress: syncJob.progress });
      }

    } catch (error) {
      logger.error(`Sync process failed for job ${syncJob.id}:`, error);
      throw error;
    }
  }

  /**
   * Get folder hierarchy from IMAP server
   * @param {Object} imap - IMAP connection
   * @returns {Promise<Array>} Array of folder objects
   */
  async getFolderHierarchy(imap) {
    return new Promise((resolve, reject) => {
      const folders = [];
      
      imap.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }

        // Recursively process folder hierarchy
        const processBoxes = (boxList, parentPath = '') => {
          for (const [name, box] of Object.entries(boxList)) {
            const folderPath = parentPath ? `${parentPath}/${name}` : name;
            
            folders.push({
              name: name,
              path: folderPath,
              delimiter: box.delimiter,
              attributes: box.attribs,
              children: box.children || {}
            });

            // Process child folders
            if (box.children && Object.keys(box.children).length > 0) {
              processBoxes(box.children, folderPath);
            }
          }
        };

        processBoxes(boxes);
        resolve(folders);
      });
    });
  }

  /**
   * Create folder hierarchy in destination server
   * @param {Object} imap - Destination IMAP connection
   * @param {Array} folders - Array of folder objects
   * @param {Object} syncJob - Sync job object
   */
  async createFolderHierarchy(imap, folders, syncJob) {
    for (const folder of folders) {
      try {
        await this.createFolder(imap, folder.path, folder.attributes);
        syncJob.stats.foldersCreated++;
        logger.info(`Created folder: ${folder.path}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          syncJob.stats.foldersSkipped++;
          logger.info(`Folder already exists: ${folder.path}`);
        } else {
          logger.error(`Failed to create folder ${folder.path}:`, error);
          syncJob.progress.errors++;
        }
      }
    }
  }

  /**
   * Create a single folder
   * @param {Object} imap - IMAP connection
   * @param {string} folderPath - Folder path
   * @param {Array} attributes - Folder attributes
   */
  async createFolder(imap, folderPath, attributes = []) {
    return new Promise((resolve, reject) => {
      imap.addBoxes(folderPath, attributes, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Sync emails from a specific folder
   * @param {Object} syncJob - Sync job object
   * @param {Object} sourceImap - Source IMAP connection
   * @param {Object} destinationImap - Destination IMAP connection
   * @param {Object} folder - Folder object
   */
  async syncFolderEmails(syncJob, sourceImap, destinationImap, folder) {
    return new Promise((resolve, reject) => {
      sourceImap.openBox(folder.path, true, (err, box) => {
        if (err) {
          logger.error(`Failed to open source folder ${folder.path}:`, err);
          reject(err);
          return;
        }

        syncJob.progress.totalEmails += box.messages.total;
        this.emit('emailsDiscovered', { 
          jobId: syncJob.id, 
          folder: folder.path, 
          count: box.messages.total 
        });

        // Process emails in batches
        this.processEmailBatches(syncJob, sourceImap, destinationImap, folder, box.messages.total)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Process emails in batches
   * @param {Object} syncJob - Sync job object
   * @param {Object} sourceImap - Source IMAP connection
   * @param {Object} destinationImap - Destination IMAP connection
   * @param {Object} folder - Folder object
   * @param {number} totalEmails - Total number of emails
   */
  async processEmailBatches(syncJob, sourceImap, destinationImap, folder, totalEmails) {
    const batchSize = syncJob.options.batchSize;
    
    for (let start = 1; start <= totalEmails; start += batchSize) {
      if (this.pausedJobs.has(syncJob.id)) {
        throw new Error('Sync job paused');
      }

      const end = Math.min(start + batchSize - 1, totalEmails);
      await this.processEmailBatch(syncJob, sourceImap, destinationImap, folder, start, end);
      
      // Update progress
      syncJob.progress.processedEmails = end;
      this.emit('batchCompleted', { 
        jobId: syncJob.id, 
        folder: folder.path, 
        processed: end, 
        total: totalEmails 
      });
    }
  }

  /**
   * Process a batch of emails
   * @param {Object} syncJob - Sync job object
   * @param {Object} sourceImap - Source IMAP connection
   * @param {Object} destinationImap - Destination IMAP connection
   * @param {Object} folder - Folder object
   * @param {number} start - Start sequence number
   * @param {number} end - End sequence number
   */
  async processEmailBatch(syncJob, sourceImap, destinationImap, folder, start, end) {
    return new Promise((resolve, reject) => {
      const fetch = sourceImap.seq.fetch(`${start}:${end}`, {
        bodies: '',
        struct: true,
        markSeen: false
      });

      const emails = [];

      fetch.on('message', (msg) => {
        let emailData = {
          headers: {},
          body: '',
          flags: [],
          date: null,
          uid: null
        };

        msg.on('body', (stream) => {
          let buffer = '';
          stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
          });
          stream.on('end', () => {
            emailData.body = buffer;
          });
        });

        msg.on('attributes', (attrs) => {
          emailData.flags = attrs.flags;
          emailData.date = attrs.date;
          emailData.uid = attrs.uid;
        });

        msg.on('headers', (headers) => {
          emailData.headers = headers;
        });

        msg.once('end', () => {
          emails.push(emailData);
        });
      });

      fetch.once('error', (err) => {
        logger.error(`Error fetching emails from ${folder.path}:`, err);
        reject(err);
      });

      fetch.once('end', async () => {
        try {
          // Process each email in the batch
          for (const email of emails) {
            await this.syncEmail(syncJob, destinationImap, folder, email);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Sync a single email to destination
   * @param {Object} syncJob - Sync job object
   * @param {Object} destinationImap - Destination IMAP connection
   * @param {Object} folder - Folder object
   * @param {Object} email - Email data
   */
  async syncEmail(syncJob, destinationImap, folder, email) {
    try {
      // Check if email already exists (by message-id or other criteria)
      const exists = await this.emailExists(destinationImap, folder.path, email);
      
      if (exists) {
        syncJob.stats.emailsSkipped++;
        return;
      }

      // Append email to destination folder
      await this.appendEmail(destinationImap, folder.path, email, syncJob.options);
      syncJob.stats.emailsSynced++;
      
    } catch (error) {
      logger.error(`Failed to sync email:`, error);
      syncJob.stats.emailsFailed++;
      syncJob.progress.errors++;
    }
  }

  /**
   * Check if email already exists in destination
   * @param {Object} imap - IMAP connection
   * @param {string} folderPath - Folder path
   * @param {Object} email - Email data
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(imap, folderPath, email) {
    return new Promise((resolve, reject) => {
      imap.openBox(folderPath, false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for email by Message-ID header
        const messageId = email.headers['message-id'];
        if (!messageId) {
          resolve(false);
          return;
        }

        imap.search(['HEADER', 'Message-ID', messageId], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results.length > 0);
          }
        });
      });
    });
  }

  /**
   * Append email to destination folder
   * @param {Object} imap - IMAP connection
   * @param {string} folderPath - Folder path
   * @param {Object} email - Email data
   * @param {Object} options - Sync options
   */
  async appendEmail(imap, folderPath, email, options) {
    return new Promise((resolve, reject) => {
      const flags = options.preserveFlags ? email.flags : [];
      const date = options.preserveDates ? email.date : new Date();

      imap.append(email.body, { 
        mailbox: folderPath, 
        flags: flags, 
        date: date 
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Pause a sync job
   * @param {string} jobId - Job identifier
   */
  pauseSync(jobId) {
    if (this.syncJobs.has(jobId)) {
      this.pausedJobs.add(jobId);
      const syncJob = this.syncJobs.get(jobId);
      syncJob.status = 'paused';
      this.emit('syncPaused', syncJob);
      logger.info(`Sync job ${jobId} paused`);
    }
  }

  /**
   * Resume a paused sync job
   * @param {string} jobId - Job identifier
   */
  resumeSync(jobId) {
    if (this.pausedJobs.has(jobId)) {
      this.pausedJobs.delete(jobId);
      const syncJob = this.syncJobs.get(jobId);
      syncJob.status = 'running';
      this.emit('syncResumed', syncJob);
      logger.info(`Sync job ${jobId} resumed`);
    }
  }

  /**
   * Stop a sync job
   * @param {string} jobId - Job identifier
   */
  stopSync(jobId) {
    if (this.syncJobs.has(jobId)) {
      this.pausedJobs.delete(jobId);
      const syncJob = this.syncJobs.get(jobId);
      syncJob.status = 'stopped';
      syncJob.endTime = new Date();
      this.emit('syncStopped', syncJob);
      logger.info(`Sync job ${jobId} stopped`);
    }
  }

  /**
   * Get sync job status
   * @param {string} jobId - Job identifier
   * @returns {Object} Job status
   */
  getSyncStatus(jobId) {
    const syncJob = this.syncJobs.get(jobId);
    if (!syncJob) {
      return { status: 'not_found' };
    }

    return {
      id: syncJob.id,
      status: syncJob.status,
      startTime: syncJob.startTime,
      endTime: syncJob.endTime,
      progress: syncJob.progress,
      stats: syncJob.stats,
      error: syncJob.error
    };
  }

  /**
   * Get all sync jobs status
   * @returns {Array} Array of job statuses
   */
  getAllSyncStatus() {
    const statuses = [];
    for (const [jobId] of this.syncJobs) {
      statuses.push(this.getSyncStatus(jobId));
    }
    return statuses;
  }

  /**
   * Clean up completed sync jobs
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupCompletedJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = new Date();
    
    for (const [jobId, syncJob] of this.syncJobs) {
      if (syncJob.endTime && (now - syncJob.endTime) > maxAge) {
        this.syncJobs.delete(jobId);
        this.pausedJobs.delete(jobId);
        logger.info(`Cleaned up completed sync job: ${jobId}`);
      }
    }
  }
}

// Create singleton instance
const emailSyncService = new EmailSyncService();

module.exports = emailSyncService;
