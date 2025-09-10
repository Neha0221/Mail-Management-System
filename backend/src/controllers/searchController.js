const { validationResult } = require('express-validator');
const searchService = require('../services/searchService');
const logger = require('../utils/logger');

/**
 * Search Controller
 * Handles email search operations including full-text search, advanced filtering, and search suggestions
 */
class SearchController {
  /**
   * Perform full-text search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchEmails(req, res) {
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
        query,
        filters = {},
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        highlight = true
      } = req.body;

      // Build search options
      const searchOptions = {
        userId: req.user._id,
        query,
        filters,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit),
        highlight
      };

      // Perform search
      const searchResults = await searchService.searchEmails(
        searchOptions.userId,
        searchOptions.query,
        {
          filters: searchOptions.filters,
          sortBy: searchOptions.sortBy,
          sortOrder: searchOptions.sortOrder,
          page: searchOptions.page,
          limit: searchOptions.limit,
          highlight: searchOptions.highlight
        }
      );

      res.json({
        success: true,
        data: {
          results: searchResults.results,
          totalCount: searchResults.totalCount,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(searchResults.totalCount / parseInt(limit)),
            hasNextPage: parseInt(page) < Math.ceil(searchResults.totalCount / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit)
          },
          searchTime: searchResults.searchTime,
          suggestions: searchResults.suggestions
        }
      });
    } catch (error) {
      logger.error('Search emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get search suggestions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchSuggestions(req, res) {
    try {
      const { q, type = 'all', limit = 10 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: { suggestions: [] }
        });
      }

      const suggestions = await searchService.getSearchSuggestions(
        req.user._id,
        q.trim(),
        type,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      logger.error('Get search suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get popular searches
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPopularSearches(req, res) {
    try {
      const { limit = 10, period = '7d' } = req.query;

      const popularSearches = await searchService.getPopularSearches(
        req.user._id,
        parseInt(limit),
        period
      );

      res.json({
        success: true,
        data: { popularSearches }
      });
    } catch (error) {
      logger.error('Get popular searches error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get search filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchFilters(req, res) {
    try {
      const { accountId, dateFrom, dateTo } = req.query;

      // Build filter
      const filter = { userId: req.user._id };
      if (accountId) filter.accountId = accountId;

      // Date range filter
      if (dateFrom || dateTo) {
        filter.date = {};
        if (dateFrom) filter.date.$gte = new Date(dateFrom);
        if (dateTo) filter.date.$lte = new Date(dateTo);
      }

      const searchFilters = await searchService.getSearchFilters(filter);

      res.json({
        success: true,
        data: { searchFilters }
      });
    } catch (error) {
      logger.error('Get search filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Save search query
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveSearchQuery(req, res) {
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

      const { query, filters = {}, name } = req.body;

      const savedSearch = await searchService.saveSearchQuery(
        req.user._id,
        query,
        filters,
        name
      );

      res.status(201).json({
        success: true,
        message: 'Search query saved successfully',
        data: { savedSearch }
      });
    } catch (error) {
      logger.error('Save search query error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get saved searches
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSavedSearches(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const savedSearches = await searchService.getSavedSearches(
        req.user._id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: { savedSearches }
      });
    } catch (error) {
      logger.error('Get saved searches error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Delete saved search
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteSavedSearch(req, res) {
    try {
      const { id } = req.params;

      await searchService.deleteSavedSearch(req.user._id, id);

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      logger.error('Delete saved search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get search statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchStats(req, res) {
    try {
      const { period = '30d' } = req.query;

      const searchStats = await searchService.getSearchStats(
        req.user._id,
        period
      );

      res.json({
        success: true,
        data: { searchStats }
      });
    } catch (error) {
      logger.error('Get search stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Clear search cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearSearchCache(req, res) {
    try {
      await searchService.clearSearchCache(req.user._id);

      res.json({
        success: true,
        message: 'Search cache cleared successfully'
      });
    } catch (error) {
      logger.error('Clear search cache error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Rebuild search index
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async rebuildSearchIndex(req, res) {
    try {
      const { accountId } = req.body;

      // Check if user has permission to rebuild index
      if (req.user.subscription.plan !== 'premium' && req.user.subscription.plan !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Premium subscription required to rebuild search index'
        });
      }

      await searchService.rebuildSearchIndex(req.user._id, accountId);

      res.json({
        success: true,
        message: 'Search index rebuild started successfully'
      });
    } catch (error) {
      logger.error('Rebuild search index error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get search index status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSearchIndexStatus(req, res) {
    try {
      const indexStatus = await searchService.getSearchIndexStatus(req.user._id);

      res.json({
        success: true,
        data: { indexStatus }
      });
    } catch (error) {
      logger.error('Get search index status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Advanced search with multiple criteria
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async advancedSearch(req, res) {
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
        criteria = {},
        sortBy = 'date',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.body;

      // Build search options
      const searchOptions = {
        userId: req.user._id,
        criteria,
        sortBy,
        sortOrder,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      // Perform advanced search using regular search method
      const searchResults = await searchService.searchEmails(
        searchOptions.userId,
        searchOptions.criteria.text || '',
        {
          filters: searchOptions.criteria,
          sortBy: searchOptions.sortBy,
          sortOrder: searchOptions.sortOrder,
          page: searchOptions.page,
          limit: searchOptions.limit
        }
      );

      res.json({
        success: true,
        data: {
          results: searchResults.results,
          totalCount: searchResults.totalCount,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(searchResults.totalCount / parseInt(limit)),
            hasNextPage: parseInt(page) < Math.ceil(searchResults.totalCount / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit)
          },
          searchTime: searchResults.searchTime
        }
      });
    } catch (error) {
      logger.error('Advanced search error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new SearchController();

