const { EventEmitter } = require('events');
const dns = require('dns').promises;
const tls = require('tls');
const net = require('net');
const logger = require('../utils/logger');

/**
 * Email Analytics Service
 * Processes emails in real-time to generate analytics about senders, domains, 
 * ESPs, time deltas, open relay detection, and TLS certificate validation
 */
class EmailAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.analyticsCache = new Map(); // Cache for analytics data
    this.processingQueue = new Map(); // Processing queue for each email
    this.batchSize = parseInt(process.env.ANALYTICS_BATCH_SIZE) || 100;
    this.processingInterval = parseInt(process.env.ANALYTICS_PROCESSING_INTERVAL) || 60000; // 1 minute
    this.espProviders = new Map(); // ESP provider database
    this.domainCache = new Map(); // Domain analysis cache
    this.initializeESPProviders();
  }

  /**
   * Initialize ESP (Email Service Provider) database
   */
  initializeESPProviders() {
    // Common ESP providers and their identifying characteristics
    this.espProviders.set('gmail', {
      domains: ['gmail.com', 'googlemail.com'],
      mxRecords: ['gmail-smtp-in.l.google.com', 'alt1.gmail-smtp-in.l.google.com'],
      spfRecords: ['v=spf1 include:_spf.google.com ~all'],
      dkimSelectors: ['google', 'google2013', 'google2014', 'google2015']
    });

    this.espProviders.set('outlook', {
      domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'],
      mxRecords: ['outlook-com.olc.protection.outlook.com'],
      spfRecords: ['v=spf1 include:spf.protection.outlook.com -all'],
      dkimSelectors: ['selector1', 'selector2']
    });

    this.espProviders.set('yahoo', {
      domains: ['yahoo.com', 'yahoo.co.uk', 'yahoo.ca'],
      mxRecords: ['mta.am0.yahoodns.net', 'mta1.am0.yahoodns.net'],
      spfRecords: ['v=spf1 include:spf.mail.yahoo.com ~all'],
      dkimSelectors: ['yahoo']
    });

    this.espProviders.set('sendgrid', {
      domains: [],
      mxRecords: ['mx.sendgrid.net'],
      spfRecords: ['v=spf1 include:sendgrid.net ~all'],
      dkimSelectors: ['s1', 's2']
    });

    this.espProviders.set('mailchimp', {
      domains: [],
      mxRecords: ['mail.mcsv.net'],
      spfRecords: ['v=spf1 include:servers.mcsv.net ~all'],
      dkimSelectors: ['k1', 'k2']
    });

    this.espProviders.set('amazon-ses', {
      domains: [],
      mxRecords: ['inbound-smtp.us-east-1.amazonaws.com'],
      spfRecords: ['v=spf1 include:amazonses.com ~all'],
      dkimSelectors: ['amazonses']
    });
  }

  /**
   * Process email for analytics
   * @param {Object} email - Email object with headers and metadata
   * @returns {Promise<Object>} Analytics data
   */
  async processEmail(email) {
    try {
      const analytics = {
        emailId: email.id || email.messageId,
        processedAt: new Date(),
        sender: {},
        domain: {},
        esp: {},
        timing: {},
        security: {},
        metadata: {}
      };

      // Extract sender information
      analytics.sender = await this.analyzeSender(email);
      
      // Analyze sending domain
      analytics.domain = await this.analyzeDomain(analytics.sender.domain);
      
      // Detect ESP (Email Service Provider)
      analytics.esp = await this.detectESP(analytics.sender.domain, analytics.domain);
      
      // Calculate time deltas
      analytics.timing = this.calculateTimeDeltas(email);
      
      // Security analysis
      analytics.security = await this.analyzeSecurity(analytics.sender.domain, email);
      
      // Additional metadata
      analytics.metadata = this.extractMetadata(email);

      // Cache the analytics
      this.analyticsCache.set(analytics.emailId, analytics);
      
      // Emit analytics event
      this.emit('analyticsProcessed', analytics);
      
      return analytics;
    } catch (error) {
      logger.error('Error processing email analytics:', error);
      throw error;
    }
  }

  /**
   * Analyze sender information
   * @param {Object} email - Email object
   * @returns {Promise<Object>} Sender analysis
   */
  async analyzeSender(email) {
    const sender = {
      email: null,
      name: null,
      domain: null,
      localPart: null,
      isValid: false,
      isDisposable: false,
      isRoleBased: false
    };

    try {
      // Extract sender email from headers
      const fromHeader = email.headers.from || email.headers.From;
      if (fromHeader) {
        const emailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
        if (emailMatch) {
          sender.email = emailMatch[1].toLowerCase();
          sender.domain = sender.email.split('@')[1];
          sender.localPart = sender.email.split('@')[0];
          sender.isValid = this.isValidEmail(sender.email);
        }

        // Extract sender name
        const nameMatch = fromHeader.match(/^([^<]+)</);
        if (nameMatch) {
          sender.name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        }
      }

      // Check if it's a role-based email
      sender.isRoleBased = this.isRoleBasedEmail(sender.localPart);
      
      // Check if it's a disposable email
      sender.isDisposable = await this.isDisposableEmail(sender.domain);

    } catch (error) {
      logger.error('Error analyzing sender:', error);
    }

    return sender;
  }

  /**
   * Analyze sending domain
   * @param {string} domain - Domain to analyze
   * @returns {Promise<Object>} Domain analysis
   */
  async analyzeDomain(domain) {
    if (!domain) {
      return { domain: null, isValid: false };
    }

    const domainAnalysis = {
      domain: domain,
      isValid: false,
      hasMX: false,
      hasSPF: false,
      hasDKIM: false,
      hasDMARC: false,
      mxRecords: [],
      spfRecord: null,
      dkimSelectors: [],
      dmarcRecord: null,
      reputation: 'unknown',
      isCorporate: false,
      isPersonal: false
    };

    try {
      // Check if domain is valid
      domainAnalysis.isValid = await this.isValidDomain(domain);
      
      if (domainAnalysis.isValid) {
        // Get MX records
        domainAnalysis.mxRecords = await this.getMXRecords(domain);
        domainAnalysis.hasMX = domainAnalysis.mxRecords.length > 0;
        
        // Get SPF record
        domainAnalysis.spfRecord = await this.getSPFRecord(domain);
        domainAnalysis.hasSPF = !!domainAnalysis.spfRecord;
        
        // Get DKIM selectors
        domainAnalysis.dkimSelectors = await this.getDKIMSelectors(domain);
        domainAnalysis.hasDKIM = domainAnalysis.dkimSelectors.length > 0;
        
        // Get DMARC record
        domainAnalysis.dmarcRecord = await this.getDMARCRecord(domain);
        domainAnalysis.hasDMARC = !!domainAnalysis.dmarcRecord;
        
        // Determine domain type
        domainAnalysis.isCorporate = this.isCorporateDomain(domain);
        domainAnalysis.isPersonal = this.isPersonalDomain(domain);
        
        // Calculate reputation score
        domainAnalysis.reputation = this.calculateDomainReputation(domainAnalysis);
      }

    } catch (error) {
      logger.error(`Error analyzing domain ${domain}:`, error);
    }

    return domainAnalysis;
  }

  /**
   * Detect Email Service Provider (ESP)
   * @param {string} domain - Sender domain
   * @param {Object} domainAnalysis - Domain analysis results
   * @returns {Promise<Object>} ESP detection results
   */
  async detectESP(domain, domainAnalysis) {
    const esp = {
      provider: 'unknown',
      confidence: 0,
      isKnownESP: false,
      category: 'unknown',
      features: []
    };

    try {
      // Check direct domain match
      for (const [provider, config] of this.espProviders) {
        if (config.domains.includes(domain)) {
          esp.provider = provider;
          esp.confidence = 100;
          esp.isKnownESP = true;
          esp.category = this.getESPCategory(provider);
          esp.features = this.getESPFeatures(provider);
          break;
        }
      }

      // If no direct match, check MX records
      if (esp.provider === 'unknown' && domainAnalysis.mxRecords) {
        for (const [provider, config] of this.espProviders) {
          for (const mxRecord of domainAnalysis.mxRecords) {
            if (config.mxRecords.some(espMx => mxRecord.includes(espMx))) {
              esp.provider = provider;
              esp.confidence = 80;
              esp.isKnownESP = true;
              esp.category = this.getESPCategory(provider);
              esp.features = this.getESPFeatures(provider);
              break;
            }
          }
          if (esp.provider !== 'unknown') break;
        }
      }

      // Check SPF records for ESP indicators
      if (esp.provider === 'unknown' && domainAnalysis.spfRecord) {
        for (const [provider, config] of this.espProviders) {
          if (config.spfRecords.some(spf => domainAnalysis.spfRecord.includes(spf))) {
            esp.provider = provider;
            esp.confidence = 70;
            esp.isKnownESP = true;
            esp.category = this.getESPCategory(provider);
            esp.features = this.getESPFeatures(provider);
            break;
          }
        }
      }

    } catch (error) {
      logger.error('Error detecting ESP:', error);
    }

    return esp;
  }

  /**
   * Calculate time deltas between sent and received times
   * @param {Object} email - Email object
   * @returns {Object} Timing analysis
   */
  calculateTimeDeltas(email) {
    const timing = {
      sentTime: null,
      receivedTime: null,
      deltaSeconds: null,
      deltaMinutes: null,
      deltaHours: null,
      isDelayed: false,
      delayCategory: 'normal'
    };

    try {
      // Extract sent time from Date header
      const dateHeader = email.headers.date || email.headers.Date;
      if (dateHeader) {
        timing.sentTime = new Date(dateHeader);
      }

      // Extract received time from Received headers
      const receivedHeaders = email.headers.received || email.headers.Received;
      if (receivedHeaders) {
        // Get the last received header (closest to recipient)
        const receivedArray = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];
        const lastReceived = receivedArray[receivedArray.length - 1];
        
        // Extract timestamp from received header
        const timestampMatch = lastReceived.match(/\d{1,2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}:\d{2}/);
        if (timestampMatch) {
          timing.receivedTime = new Date(timestampMatch[0]);
        }
      }

      // Calculate delta if both times are available
      if (timing.sentTime && timing.receivedTime) {
        const deltaMs = timing.receivedTime.getTime() - timing.sentTime.getTime();
        timing.deltaSeconds = Math.floor(deltaMs / 1000);
        timing.deltaMinutes = Math.floor(timing.deltaSeconds / 60);
        timing.deltaHours = Math.floor(timing.deltaMinutes / 60);
        
        // Determine if email is delayed
        timing.isDelayed = timing.deltaMinutes > 5; // More than 5 minutes is considered delayed
        
        // Categorize delay
        if (timing.deltaMinutes < 1) {
          timing.delayCategory = 'instant';
        } else if (timing.deltaMinutes < 5) {
          timing.delayCategory = 'fast';
        } else if (timing.deltaMinutes < 30) {
          timing.delayCategory = 'normal';
        } else if (timing.deltaMinutes < 120) {
          timing.delayCategory = 'slow';
        } else {
          timing.delayCategory = 'very_slow';
        }
      }

    } catch (error) {
      logger.error('Error calculating time deltas:', error);
    }

    return timing;
  }

  /**
   * Analyze security aspects of the email
   * @param {string} domain - Sender domain
   * @param {Object} email - Email object
   * @returns {Promise<Object>} Security analysis
   */
  async analyzeSecurity(domain, email) {
    const security = {
      isOpenRelay: false,
      supportsTLS: false,
      hasValidCertificate: false,
      certificateInfo: null,
      spfPass: false,
      dkimPass: false,
      dmarcPass: false,
      securityScore: 0
    };

    try {
      // Check for open relay
      security.isOpenRelay = await this.checkOpenRelay(domain);
      
      // Check TLS support and certificate
      const tlsInfo = await this.checkTLSSupport(domain);
      security.supportsTLS = tlsInfo.supportsTLS;
      security.hasValidCertificate = tlsInfo.hasValidCertificate;
      security.certificateInfo = tlsInfo.certificateInfo;
      
      // Check email authentication (SPF, DKIM, DMARC)
      // Note: These would typically be checked during email processing
      // For now, we'll mark them as unknown
      security.spfPass = 'unknown';
      security.dkimPass = 'unknown';
      security.dmarcPass = 'unknown';
      
      // Calculate security score
      security.securityScore = this.calculateSecurityScore(security);

    } catch (error) {
      logger.error('Error analyzing security:', error);
    }

    return security;
  }

  /**
   * Check if domain is an open relay
   * @param {string} domain - Domain to check
   * @returns {Promise<boolean>} True if open relay
   */
  async checkOpenRelay(domain) {
    try {
      const mxRecords = await this.getMXRecords(domain);
      if (mxRecords.length === 0) return false;

      // Test the first MX record for open relay
      const mxHost = mxRecords[0];
      return await this.testOpenRelay(mxHost);
    } catch (error) {
      logger.error(`Error checking open relay for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Test if a mail server is an open relay
   * @param {string} host - Mail server host
   * @returns {Promise<boolean>} True if open relay
   */
  async testOpenRelay(host) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 5000; // 5 second timeout
      
      socket.setTimeout(timeout);
      
      socket.connect(25, host, () => {
        let response = '';
        
        socket.on('data', (data) => {
          response += data.toString();
          
          // Check for open relay indicators
          if (response.includes('220') && response.includes('ready')) {
            // Send EHLO command
            socket.write('EHLO test.com\r\n');
          } else if (response.includes('250') && response.includes('EHLO')) {
            // Try to send mail without authentication
            socket.write('MAIL FROM: <test@example.com>\r\n');
          } else if (response.includes('250') && response.includes('MAIL FROM')) {
            // If it accepts MAIL FROM without authentication, it might be an open relay
            socket.write('RCPT TO: <test@example.com>\r\n');
          } else if (response.includes('250') && response.includes('RCPT TO')) {
            // Definitely an open relay
            socket.end();
            resolve(true);
          }
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        
        socket.on('error', () => {
          resolve(false);
        });
      });
      
      socket.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check TLS support and certificate validity
   * @param {string} domain - Domain to check
   * @returns {Promise<Object>} TLS information
   */
  async checkTLSSupport(domain) {
    const tlsInfo = {
      supportsTLS: false,
      hasValidCertificate: false,
      certificateInfo: null
    };

    try {
      const mxRecords = await this.getMXRecords(domain);
      if (mxRecords.length === 0) return tlsInfo;

      const mxHost = mxRecords[0];
      
      // Test TLS connection on port 587 (submission port)
      const socket = new net.Socket();
      
      socket.connect(587, mxHost, () => {
        const tlsSocket = tls.connect({
          socket: socket,
          servername: domain,
          rejectUnauthorized: false
        }, () => {
          tlsInfo.supportsTLS = true;
          tlsInfo.hasValidCertificate = tlsSocket.authorized;
          
          if (tlsSocket.getPeerCertificate) {
            const cert = tlsSocket.getPeerCertificate();
            tlsInfo.certificateInfo = {
              subject: cert.subject,
              issuer: cert.issuer,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              fingerprint: cert.fingerprint
            };
          }
          
          tlsSocket.end();
        });
        
        tlsSocket.on('error', () => {
          tlsInfo.supportsTLS = false;
        });
      });
      
      socket.on('error', () => {
        // TLS not supported
      });

    } catch (error) {
      logger.error(`Error checking TLS support for ${domain}:`, error);
    }

    return tlsInfo;
  }

  /**
   * Extract additional metadata from email
   * @param {Object} email - Email object
   * @returns {Object} Metadata
   */
  extractMetadata(email) {
    return {
      messageId: email.headers['message-id'] || email.headers['Message-ID'],
      subject: email.headers.subject || email.headers.Subject,
      contentType: email.headers['content-type'] || email.headers['Content-Type'],
      contentLength: email.body ? email.body.length : 0,
      hasAttachments: this.hasAttachments(email),
      priority: email.headers['x-priority'] || email.headers['X-Priority'] || 'normal',
      isAutoReply: this.isAutoReply(email),
      isBulk: this.isBulkEmail(email),
      language: this.detectLanguage(email),
      sentiment: this.analyzeSentiment(email)
    };
  }

  /**
   * Process multiple emails in batch
   * @param {Array} emails - Array of email objects
   * @returns {Promise<Array>} Array of analytics results
   */
  async processBatch(emails) {
    const results = [];
    
    for (let i = 0; i < emails.length; i += this.batchSize) {
      const batch = emails.slice(i, i + this.batchSize);
      const batchPromises = batch.map(email => this.processEmail(email));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Emit batch processed event
        this.emit('batchProcessed', {
          batchSize: batch.length,
          totalProcessed: results.length,
          timestamp: new Date()
        });
        
      } catch (error) {
        logger.error('Error processing batch:', error);
        // Continue with next batch
      }
    }
    
    return results;
  }

  /**
   * Get analytics for a specific email
   * @param {string} emailId - Email ID
   * @returns {Object} Analytics data
   */
  getAnalytics(emailId) {
    return this.analyticsCache.get(emailId) || null;
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics summary
   */
  getAnalyticsSummary() {
    const analytics = Array.from(this.analyticsCache.values());
    
    return {
      totalEmails: analytics.length,
      espDistribution: this.getESPDistribution(analytics),
      domainDistribution: this.getDomainDistribution(analytics),
      timingStats: this.getTimingStats(analytics),
      securityStats: this.getSecurityStats(analytics),
      processedAt: new Date()
    };
  }

  // Helper methods
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
  }

  isRoleBasedEmail(localPart) {
    const roleBasedPatterns = [
      'admin', 'administrator', 'postmaster', 'webmaster', 'noreply', 'no-reply',
      'support', 'help', 'info', 'contact', 'sales', 'marketing', 'hr', 'jobs'
    ];
    return roleBasedPatterns.some(pattern => 
      localPart.toLowerCase().includes(pattern)
    );
  }

  async isDisposableEmail(domain) {
    // This would typically check against a disposable email database
    // For now, return false
    return false;
  }

  async getMXRecords(domain) {
    try {
      const records = await dns.resolveMx(domain);
      return records.map(record => record.exchange).sort((a, b) => a.priority - b.priority);
    } catch (error) {
      return [];
    }
  }

  async getSPFRecord(domain) {
    try {
      const records = await dns.resolveTxt(domain);
      const spfRecord = records.find(record => 
        record.some(txt => txt.startsWith('v=spf1'))
      );
      return spfRecord ? spfRecord.join('') : null;
    } catch (error) {
      return null;
    }
  }

  async getDKIMSelectors(domain) {
    // This would typically check common DKIM selectors
    // For now, return empty array
    return [];
  }

  async getDMARCRecord(domain) {
    try {
      const records = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = records.find(record => 
        record.some(txt => txt.startsWith('v=DMARC1'))
      );
      return dmarcRecord ? dmarcRecord.join('') : null;
    } catch (error) {
      return null;
    }
  }

  isCorporateDomain(domain) {
    const corporateIndicators = ['corp', 'inc', 'llc', 'ltd', 'company', 'enterprise'];
    return corporateIndicators.some(indicator => 
      domain.toLowerCase().includes(indicator)
    );
  }

  isPersonalDomain(domain) {
    const personalProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    return personalProviders.includes(domain.toLowerCase());
  }

  calculateDomainReputation(domainAnalysis) {
    let score = 0;
    
    if (domainAnalysis.hasMX) score += 20;
    if (domainAnalysis.hasSPF) score += 20;
    if (domainAnalysis.hasDKIM) score += 20;
    if (domainAnalysis.hasDMARC) score += 20;
    if (domainAnalysis.isCorporate) score += 10;
    if (domainAnalysis.isPersonal) score += 5;
    
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very_poor';
  }

  getESPCategory(provider) {
    const categories = {
      'gmail': 'personal',
      'outlook': 'personal',
      'yahoo': 'personal',
      'sendgrid': 'transactional',
      'mailchimp': 'marketing',
      'amazon-ses': 'transactional'
    };
    return categories[provider] || 'unknown';
  }

  getESPFeatures(provider) {
    const features = {
      'gmail': ['large_storage', 'search', 'labels'],
      'outlook': ['calendar', 'contacts', 'onedrive'],
      'yahoo': ['news', 'finance', 'sports'],
      'sendgrid': ['api', 'analytics', 'templates'],
      'mailchimp': ['campaigns', 'automation', 'segmentation'],
      'amazon-ses': ['api', 'scalability', 'reputation']
    };
    return features[provider] || [];
  }

  calculateSecurityScore(security) {
    let score = 0;
    
    if (!security.isOpenRelay) score += 30;
    if (security.supportsTLS) score += 25;
    if (security.hasValidCertificate) score += 25;
    if (security.spfPass === true) score += 10;
    if (security.dkimPass === true) score += 10;
    
    return score;
  }

  hasAttachments(email) {
    const contentType = email.headers['content-type'] || email.headers['Content-Type'];
    return contentType && contentType.includes('multipart/mixed');
  }

  isAutoReply(email) {
    const autoReplyHeaders = [
      'auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence'
    ];
    return autoReplyHeaders.some(header => 
      email.headers[header] || email.headers[header.charAt(0).toUpperCase() + header.slice(1)]
    );
  }

  isBulkEmail(email) {
    const bulkHeaders = [
      'x-bulk', 'x-mailer', 'list-unsubscribe', 'precedence'
    ];
    return bulkHeaders.some(header => 
      email.headers[header] || email.headers[header.charAt(0).toUpperCase() + header.slice(1)]
    );
  }

  detectLanguage(email) {
    // Simple language detection based on content
    // This would typically use a proper language detection library
    return 'en'; // Default to English
  }

  analyzeSentiment(email) {
    // Simple sentiment analysis
    // This would typically use a proper sentiment analysis library
    return 'neutral'; // Default to neutral
  }

  getESPDistribution(analytics) {
    const distribution = {};
    analytics.forEach(analytic => {
      const esp = analytic.esp.provider;
      distribution[esp] = (distribution[esp] || 0) + 1;
    });
    return distribution;
  }

  getDomainDistribution(analytics) {
    const distribution = {};
    analytics.forEach(analytic => {
      const domain = analytic.sender.domain;
      if (domain) {
        distribution[domain] = (distribution[domain] || 0) + 1;
      }
    });
    return distribution;
  }

  getTimingStats(analytics) {
    const timings = analytics
      .filter(analytic => analytic.timing.deltaMinutes !== null)
      .map(analytic => analytic.timing.deltaMinutes);
    
    if (timings.length === 0) return null;
    
    return {
      average: timings.reduce((a, b) => a + b, 0) / timings.length,
      min: Math.min(...timings),
      max: Math.max(...timings),
      median: timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)]
    };
  }

  getSecurityStats(analytics) {
    const security = {
      openRelays: 0,
      tlsSupported: 0,
      validCertificates: 0,
      total: analytics.length
    };
    
    analytics.forEach(analytic => {
      if (analytic.security.isOpenRelay) security.openRelays++;
      if (analytic.security.supportsTLS) security.tlsSupported++;
      if (analytic.security.hasValidCertificate) security.validCertificates++;
    });
    
    return security;
  }
}

// Create singleton instance
const emailAnalyticsService = new EmailAnalyticsService();

module.exports = emailAnalyticsService;
