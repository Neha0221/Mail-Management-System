const { EventEmitter } = require('events');
const Email = require('../models/Email');
const User = require('../models/User');
const EmailAccount = require('../models/EmailAccount');
const logger = require('../utils/logger');

/**
 * Search Service
 * Provides comprehensive full-text search, advanced filtering, and search optimization
 * for emails, users, and email accounts
 */
class SearchService extends EventEmitter {
  constructor() {
    super();
    this.searchCache = new Map(); // Cache for search results
    this.searchHistory = new Map(); // Search history per user
    this.searchStats = new Map(); // Search statistics
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
    this.maxCacheSize = 1000; // Maximum cached searches per user
    this.maxSearchHistory = 100; // Maximum search history per user
    this.searchTimeout = 30000; // 30 seconds search timeout
    this.maxResults = 1000; // Maximum results per search
    this.defaultPageSize = 20; // Default page size
  }

  /**
   * Perform full-text search on emails
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchEmails(userId, query, options = {}) {
    try {
      const startTime = Date.now();
      
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!query || query.trim() === '') {
        // Return empty results for empty query
        return {
          query: query || '',
          totalResults: 0,
          results: [],
          facets: {},
          suggestions: [],
          searchTime: Date.now() - startTime,
          cached: false,
          timestamp: new Date()
        };
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(userId, query, options);
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        logger.info(`Search cache hit for user ${userId}`);
        return cachedResult;
      }

      // Build search query
      const searchQuery = this.buildEmailSearchQuery(userId, query, options);
      logger.info(`Search query built for user ${userId}:`, JSON.stringify(searchQuery, null, 2));
      
      // Execute search
      const results = await this.executeEmailSearch(searchQuery, options);
      logger.info(`Search executed for user ${userId}: ${results.totalCount} results found`);
      
      // Process results
      const processedResults = await this.processSearchResults(results, options);
      
      // Build response
      const searchResult = {
        query: query,
        totalResults: results.totalCount,
        results: processedResults.results,
        facets: processedResults.facets,
        suggestions: processedResults.suggestions,
        searchTime: Date.now() - startTime,
        cached: false,
        timestamp: new Date()
      };

      // Cache results
      this.cacheResult(cacheKey, searchResult);
      
      // Update search history
      this.updateSearchHistory(userId, query, searchResult);
      
      // Update search statistics
      this.updateSearchStats(userId, searchResult);
      
      // Emit search event
      this.emit('searchPerformed', {
        userId,
        query,
        resultCount: searchResult.totalResults,
        searchTime: searchResult.searchTime
      });

      logger.info(`Email search completed for user ${userId}: ${searchResult.totalResults} results in ${searchResult.searchTime}ms`);
      
      return searchResult;
    } catch (error) {
      logger.error('Email search failed:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB search query for emails
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} MongoDB query
   */
  buildEmailSearchQuery(userId, query, options) {
    const baseQuery = { userId };
    
    // Text search
    if (query && query.trim()) {
      baseQuery.$text = { $search: query };
    }
    
    // Account ID filter
    if (options.accountId) {
      baseQuery.emailAccountId = options.accountId;
    }
    
    // Date filters
    if (options.dateFrom || options.dateTo) {
      baseQuery['headers.date'] = {};
      if (options.dateFrom) {
        baseQuery['headers.date'].$gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        baseQuery['headers.date'].$lte = new Date(options.dateTo);
      }
    }
    
    // Folder filters
    if (options.folders && options.folders.length > 0) {
      baseQuery['folder.path'] = { $in: options.folders };
    }
    
    // Status filters
    if (options.isRead !== undefined) {
      baseQuery['status.isRead'] = options.isRead;
    }
    
    if (options.isFlagged !== undefined) {
      baseQuery['status.isFlagged'] = options.isFlagged;
    }
    
    if (options.isSpam !== undefined) {
      baseQuery['status.isSpam'] = options.isSpam;
    }
    
    if (options.isImportant !== undefined) {
      baseQuery['status.isImportant'] = options.isImportant;
    }
    
    if (options.hasAttachments !== undefined) {
      if (options.hasAttachments) {
        baseQuery['attachments.0'] = { $exists: true };
      } else {
        baseQuery['attachments.0'] = { $exists: false };
      }
    }
    
    // Sender filters
    if (options.senders && options.senders.length > 0) {
      baseQuery['analytics.sender.domain'] = { $in: options.senders };
    }
    
    if (options.senderEmail) {
      baseQuery['analytics.sender.email'] = new RegExp(options.senderEmail, 'i');
    }
    
    // ESP filters
    if (options.esps && options.esps.length > 0) {
      baseQuery['analytics.esp.provider'] = { $in: options.esps };
    }
    
    // Priority filters
    if (options.priority) {
      baseQuery['headers.priority'] = options.priority;
    }
    
    // Size filters
    if (options.minSize || options.maxSize) {
      baseQuery['content.totalSize'] = {};
      if (options.minSize) {
        baseQuery['content.totalSize'].$gte = options.minSize;
      }
      if (options.maxSize) {
        baseQuery['content.totalSize'].$lte = options.maxSize;
      }
    }
    
    // Tag filters
    if (options.tags && options.tags.length > 0) {
      baseQuery.tags = { $in: options.tags };
    }
    
    // Label filters
    if (options.labels && options.labels.length > 0) {
      baseQuery.labels = { $in: options.labels };
    }
    
    // Security filters
    if (options.minSecurityScore !== undefined) {
      baseQuery['analytics.security.securityScore'] = { $gte: options.minSecurityScore };
    }
    
    if (options.isOpenRelay !== undefined) {
      baseQuery['analytics.security.isOpenRelay'] = options.isOpenRelay;
    }
    
    // Processing filters
    if (options.isProcessed !== undefined) {
      baseQuery['processing.isProcessed'] = options.isProcessed;
    }
    
    if (options.isIndexed !== undefined) {
      baseQuery['processing.isIndexed'] = options.isIndexed;
    }
    
    return baseQuery;
  }

  /**
   * Execute email search with MongoDB
   * @param {Object} query - MongoDB query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async executeEmailSearch(query, options) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || this.defaultPageSize, this.maxResults);
    const skip = (page - 1) * limit;
    
    // Build sort criteria
    let sort = {};
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'date':
          sort = { 'headers.date': options.sortOrder === 'asc' ? 1 : -1 };
          break;
        case 'subject':
          sort = { 'headers.subject': options.sortOrder === 'asc' ? 1 : -1 };
          break;
        case 'sender':
          sort = { 'analytics.sender.email': options.sortOrder === 'asc' ? 1 : -1 };
          break;
        case 'size':
          sort = { 'content.totalSize': options.sortOrder === 'asc' ? 1 : -1 };
          break;
        case 'relevance':
          sort = { score: { $meta: 'textScore' } };
          break;
        default:
          sort = { 'headers.date': -1 };
      }
    } else {
      // Default sort by relevance if text search, otherwise by date
      if (query.$text) {
        sort = { score: { $meta: 'textScore' } };
      } else {
        sort = { 'headers.date': -1 };
      }
    }
    
    // Execute search with projection
    const projection = {
      'headers.from': 1,
      'headers.to': 1,
      'headers.subject': 1,
      'headers.date': 1,
      'headers.priority': 1,
      'status.isRead': 1,
      'status.isFlagged': 1,
      'status.isSpam': 1,
      'status.isImportant': 1,
      'folder.name': 1,
      'folder.path': 1,
      'content.totalSize': 1,
      'attachments': 1,
      'analytics.sender.domain': 1,
      'analytics.esp.provider': 1,
      'analytics.security.securityScore': 1,
      'tags': 1,
      'labels': 1,
      'processing.isProcessed': 1,
      'processing.isIndexed': 1
    };
    
    // Add score projection for text search
    if (query.$text) {
      projection.score = { $meta: 'textScore' };
    }
    
    // Execute search
    const [results, totalCount] = await Promise.all([
      Email.find(query, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Email.countDocuments(query)
    ]);
    
    return {
      results,
      totalCount,
      page,
      limit,
      skip
    };
  }

  /**
   * Process search results and generate facets
   * @param {Object} results - Raw search results
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Processed results
   */
  async processSearchResults(results, options) {
    const processedResults = results.results.map(email => ({
      id: email._id,
      messageId: email.messageId,
      from: email.headers.from,
      to: email.headers.to,
      subject: email.headers.subject,
      date: email.headers.date,
      priority: email.headers.priority,
      isRead: email.status.isRead,
      isFlagged: email.status.isFlagged,
      isSpam: email.status.isSpam,
      isImportant: email.status.isImportant,
      folder: email.folder,
      size: email.content.totalSize,
      hasAttachments: email.attachments && email.attachments.length > 0,
      attachmentCount: email.attachments ? email.attachments.length : 0,
      senderDomain: email.analytics.sender.domain,
      espProvider: email.analytics.esp.provider,
      securityScore: email.analytics.security.securityScore,
      tags: email.tags || [],
      labels: email.labels || [],
      isProcessed: email.processing.isProcessed,
      isIndexed: email.processing.isIndexed,
      score: email.score || 0
    }));
    
    // Generate facets
    const facets = await this.generateFacets(results.results, options);
    
    // Generate suggestions
    const suggestions = await this.generateSuggestions(results.results, options);
    
    return {
      results: processedResults,
      facets,
      suggestions
    };
  }

  /**
   * Generate search facets
   * @param {Array} results - Search results
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Facets
   */
  async generateFacets(results, options) {
    const facets = {
      folders: {},
      senders: {},
      esps: {},
      tags: {},
      labels: {},
      priorities: {},
      dateRanges: {},
      sizeRanges: {}
    };
    
    // Count facets from results
    results.forEach(email => {
      // Folder facets
      if (email.folder && email.folder.name) {
        facets.folders[email.folder.name] = (facets.folders[email.folder.name] || 0) + 1;
      }
      
      // Sender facets
      if (email.analytics && email.analytics.sender && email.analytics.sender.domain) {
        facets.senders[email.analytics.sender.domain] = (facets.senders[email.analytics.sender.domain] || 0) + 1;
      }
      
      // ESP facets
      if (email.analytics && email.analytics.esp && email.analytics.esp.provider) {
        facets.esps[email.analytics.esp.provider] = (facets.esps[email.analytics.esp.provider] || 0) + 1;
      }
      
      // Tag facets
      if (email.tags) {
        email.tags.forEach(tag => {
          facets.tags[tag] = (facets.tags[tag] || 0) + 1;
        });
      }
      
      // Label facets
      if (email.labels) {
        email.labels.forEach(label => {
          facets.labels[label] = (facets.labels[label] || 0) + 1;
        });
      }
      
      // Priority facets
      if (email.headers && email.headers.priority) {
        facets.priorities[email.headers.priority] = (facets.priorities[email.headers.priority] || 0) + 1;
      }
      
      // Date range facets
      if (email.headers && email.headers.date) {
        const date = new Date(email.headers.date);
        const dateRange = this.getDateRange(date);
        facets.dateRanges[dateRange] = (facets.dateRanges[dateRange] || 0) + 1;
      }
      
      // Size range facets
      if (email.content && email.content.totalSize) {
        const sizeRange = this.getSizeRange(email.content.totalSize);
        facets.sizeRanges[sizeRange] = (facets.sizeRanges[sizeRange] || 0) + 1;
      }
    });
    
    return facets;
  }

  /**
   * Generate search suggestions
   * @param {Array} results - Search results
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Suggestions
   */
  async generateSuggestions(results, options) {
    const suggestions = [];
    
    // Extract common terms from results
    const terms = new Set();
    results.forEach(email => {
      if (email.headers && email.headers.subject) {
        const words = email.headers.subject.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3) {
            terms.add(word);
          }
        });
      }
    });
    
    // Convert to array and sort by frequency
    const termArray = Array.from(terms);
    const termCounts = {};
    termArray.forEach(term => {
      termCounts[term] = (termCounts[term] || 0) + 1;
    });
    
    const sortedTerms = termArray.sort((a, b) => termCounts[b] - termCounts[a]);
    
    // Return top 10 suggestions
    return sortedTerms.slice(0, 10).map(term => ({
      type: 'term',
      value: term,
      count: termCounts[term]
    }));
  }

  /**
   * Get date range for facet
   * @param {Date} date - Date to categorize
   * @returns {string} Date range
   */
  getDateRange(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days <= 7) return 'This Week';
    if (days <= 30) return 'This Month';
    if (days <= 90) return 'Last 3 Months';
    if (days <= 365) return 'This Year';
    return 'Older';
  }

  /**
   * Get size range for facet
   * @param {number} size - Size in bytes
   * @returns {string} Size range
   */
  getSizeRange(size) {
    if (size < 1024) return '< 1 KB';
    if (size < 1024 * 1024) return '1 KB - 1 MB';
    if (size < 10 * 1024 * 1024) return '1 MB - 10 MB';
    if (size < 100 * 1024 * 1024) return '10 MB - 100 MB';
    return '> 100 MB';
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchUsers(query, options = {}) {
    try {
      const searchQuery = {};
      
      if (query && query.trim()) {
        searchQuery.$or = [
          { username: new RegExp(query, 'i') },
          { email: new RegExp(query, 'i') },
          { firstName: new RegExp(query, 'i') },
          { lastName: new RegExp(query, 'i') }
        ];
      }
      
      const results = await User.find(searchQuery, {
        username: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        isActive: 1,
        'subscription.plan': 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .lean();
      
      return {
        query,
        totalResults: results.length,
        results: results.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          isActive: user.isActive,
          subscriptionPlan: user.subscription.plan,
          createdAt: user.createdAt
        })),
        searchTime: 0,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('User search failed:', error);
      throw error;
    }
  }

  /**
   * Search email accounts
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchEmailAccounts(userId, query, options = {}) {
    try {
      const searchQuery = { userId };
      
      if (query && query.trim()) {
        searchQuery.$or = [
          { name: new RegExp(query, 'i') },
          { email: new RegExp(query, 'i') },
          { 'imapConfig.host': new RegExp(query, 'i') }
        ];
      }
      
      const results = await EmailAccount.find(searchQuery, {
        name: 1,
        email: 1,
        'imapConfig.host': 1,
        'imapConfig.port': 1,
        status: 1,
        isEnabled: 1,
        'provider.name': 1,
        'syncConfig.enabled': 1,
        'statistics.totalEmails': 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .lean();
      
      return {
        query,
        totalResults: results.length,
        results: results.map(account => ({
          id: account._id,
          name: account.name,
          email: account.email,
          host: account.imapConfig.host,
          port: account.imapConfig.port,
          status: account.status,
          isEnabled: account.isEnabled,
          provider: account.provider.name,
          syncEnabled: account.syncConfig.enabled,
          totalEmails: account.statistics.totalEmails,
          createdAt: account.createdAt
        })),
        searchTime: 0,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Email account search failed:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   * @param {string} userId - User ID
   * @param {string} partialQuery - Partial search query
   * @returns {Promise<Array>} Suggestions
   */
  async getSearchSuggestions(userId, partialQuery) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }
      
      const suggestions = [];
      
      // Get suggestions from search history
      const history = this.searchHistory.get(userId) || [];
      const historySuggestions = history
        .filter(item => item.query.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, 5)
        .map(item => ({
          type: 'history',
          value: item.query,
          count: item.resultCount
        }));
      
      suggestions.push(...historySuggestions);
      
      // Get suggestions from email subjects
      const emailSuggestions = await Email.aggregate([
        { $match: { userId, 'headers.subject': new RegExp(partialQuery, 'i') } },
        { $group: { _id: '$headers.subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      emailSuggestions.forEach(item => {
        suggestions.push({
          type: 'subject',
          value: item._id,
          count: item.count
        });
      });
      
      // Get suggestions from sender domains
      const senderSuggestions = await Email.aggregate([
        { $match: { userId, 'analytics.sender.domain': new RegExp(partialQuery, 'i') } },
        { $group: { _id: '$analytics.sender.domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      senderSuggestions.forEach(item => {
        suggestions.push({
          type: 'sender',
          value: item._id,
          count: item.count
        });
      });
      
      return suggestions.slice(0, 10);
    } catch (error) {
      logger.error('Search suggestions failed:', error);
      return [];
    }
  }

  /**
   * Get search history for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of history items
   * @returns {Array} Search history
   */
  getSearchHistory(userId, limit = 20) {
    const history = this.searchHistory.get(userId) || [];
    return history.slice(0, limit);
  }

  /**
   * Clear search history for user
   * @param {string} userId - User ID
   */
  clearSearchHistory(userId) {
    this.searchHistory.delete(userId);
  }

  /**
   * Get search statistics
   * @param {string} userId - User ID
   * @returns {Object} Search statistics
   */
  getSearchStats(userId) {
    return this.searchStats.get(userId) || {
      totalSearches: 0,
      averageSearchTime: 0,
      totalResults: 0,
      averageResults: 0,
      lastSearch: null
    };
  }

  /**
   * Generate cache key
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {string} Cache key
   */
  generateCacheKey(userId, query, options) {
    const optionsStr = JSON.stringify(options);
    return `${userId}:${query}:${optionsStr}`;
  }

  /**
   * Get cached result
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result
   */
  getCachedResult(cacheKey) {
    const cached = this.searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return { ...cached, cached: true };
    }
    return null;
  }

  /**
   * Cache search result
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Search result
   */
  cacheResult(cacheKey, result) {
    // Clean up old cache entries if needed
    if (this.searchCache.size >= this.maxCacheSize) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
    
    this.searchCache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    });
  }

  /**
   * Update search history
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} result - Search result
   */
  updateSearchHistory(userId, query, result) {
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, []);
    }
    
    const history = this.searchHistory.get(userId);
    
    // Remove existing entry if it exists
    const existingIndex = history.findIndex(item => item.query === query);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    
    // Add new entry at the beginning
    history.unshift({
      query,
      resultCount: result.totalResults,
      searchTime: result.searchTime,
      timestamp: new Date()
    });
    
    // Limit history size
    if (history.length > this.maxSearchHistory) {
      history.splice(this.maxSearchHistory);
    }
    
    this.searchHistory.set(userId, history);
  }

  /**
   * Update search statistics
   * @param {string} userId - User ID
   * @param {Object} result - Search result
   */
  updateSearchStats(userId, result) {
    if (!this.searchStats.has(userId)) {
      this.searchStats.set(userId, {
        totalSearches: 0,
        totalSearchTime: 0,
        totalResults: 0,
        lastSearch: null
      });
    }
    
    const stats = this.searchStats.get(userId);
    stats.totalSearches += 1;
    stats.totalSearchTime += result.searchTime;
    stats.totalResults += result.totalResults;
    stats.lastSearch = new Date();
    
    this.searchStats.set(userId, stats);
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.searchCache.clear();
    this.searchHistory.clear();
    this.searchStats.clear();
    logger.info('All search caches cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.searchCache.size,
      historySize: this.searchHistory.size,
      statsSize: this.searchStats.size,
      maxCacheSize: this.maxCacheSize,
      maxSearchHistory: this.maxSearchHistory,
      cacheTimeout: this.cacheTimeout
    };
  }

  /**
   * Get saved searches for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Saved searches
   */
  async getSavedSearches(userId, options = {}) {
    try {
      const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      // For now, return saved searches from user's search history
      // In a real implementation, you'd have a SavedSearch model
      const userHistory = this.searchHistory.get(userId) || [];
      
      // Sort by frequency and recency
      const savedSearches = userHistory
        .filter(search => search.saved) // Only return saved searches
        .sort((a, b) => {
          if (sortBy === 'createdAt') {
            return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
          }
          return 0;
        })
        .slice((page - 1) * limit, page * limit)
        .map(search => ({
          id: search.id || search.query,
          name: search.name || search.query,
          query: search.query,
          filters: search.filters || {},
          createdAt: search.timestamp,
          lastUsed: search.lastUsed || search.timestamp,
          useCount: search.count || 1
        }));

      return {
        searches: savedSearches,
        total: userHistory.filter(s => s.saved).length,
        page,
        limit
      };
    } catch (error) {
      logger.error('Get saved searches error:', error);
      throw error;
    }
  }

  /**
   * Save a search query
   * @param {string} userId - User ID
   * @param {Object} searchData - Search data to save
   * @returns {Promise<Object>} Saved search
   */
  async saveSearchQuery(userId, searchData) {
    try {
      const { query, filters = {}, name } = searchData;
      
      if (!query) {
        throw new Error('Search query is required');
      }

      const savedSearch = {
        id: `${userId}_${Date.now()}`,
        name: name || query,
        query,
        filters,
        saved: true,
        timestamp: new Date(),
        lastUsed: new Date(),
        count: 1
      };

      // Add to user's search history
      const userHistory = this.searchHistory.get(userId) || [];
      userHistory.unshift(savedSearch);
      
      // Keep only the latest entries
      if (userHistory.length > this.maxSearchHistory) {
        userHistory.splice(this.maxSearchHistory);
      }
      
      this.searchHistory.set(userId, userHistory);

      logger.info(`Saved search query for user ${userId}: ${query}`);
      return savedSearch;
    } catch (error) {
      logger.error('Save search query error:', error);
      throw error;
    }
  }

  /**
   * Delete a saved search
   * @param {string} userId - User ID
   * @param {string} searchId - Search ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteSavedSearch(userId, searchId) {
    try {
      const userHistory = this.searchHistory.get(userId) || [];
      const initialLength = userHistory.length;
      
      const updatedHistory = userHistory.filter(search => 
        search.id !== searchId && search.query !== searchId
      );
      
      this.searchHistory.set(userId, updatedHistory);
      
      const deleted = updatedHistory.length < initialLength;
      if (deleted) {
        logger.info(`Deleted saved search ${searchId} for user ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error('Delete saved search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   * @param {string} userId - User ID
   * @param {string} query - Partial query
   * @param {Object} options - Options
   * @returns {Promise<Array>} Search suggestions
   */
  async getSearchSuggestions(userId, query, options = {}) {
    try {
      const { limit = 10, type = 'all' } = options;
      const suggestions = [];

      // Get suggestions from user's search history
      const userHistory = this.searchHistory.get(userId) || [];
      const historySuggestions = userHistory
        .filter(search => search.query.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map(search => ({
          text: search.query,
          type: 'history',
          count: search.count || 1
        }));

      suggestions.push(...historySuggestions);

      // Add common email search terms if needed
      if (suggestions.length < limit && (type === 'all' || type === 'common')) {
        const commonTerms = [
          'from:', 'to:', 'subject:', 'body:', 'attachment:', 'date:',
          'has:attachment', 'is:unread', 'is:read', 'is:flagged'
        ].filter(term => term.includes(query.toLowerCase()));

        commonTerms.forEach(term => {
          if (suggestions.length < limit) {
            suggestions.push({
              text: term,
              type: 'common',
              count: 0
            });
          }
        });
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error('Get search suggestions error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const searchService = new SearchService();

module.exports = searchService;
