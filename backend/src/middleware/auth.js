const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */
class AuthMiddleware {
  /**
   * Authenticate user with JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async authenticate(req, res, next) {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Check if user is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      }

      logger.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Require specific role
   * @param {string} role - Required role
   * @returns {Function} Middleware function
   */
  requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user has required role
      if (req.user.subscription.plan !== role && req.user.subscription.plan !== 'admin') {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${role} role required`
        });
      }

      next();
    };
  }

  /**
   * Require email verification
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  requireEmailVerification(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required'
      });
    }

    next();
  }

  /**
   * Optional authentication (doesn't fail if no token)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : null;

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      }

      next();
    } catch (error) {
      // Ignore token errors for optional auth
      next();
    }
  }

  /**
   * Rate limiting middleware
   * @param {Object} options - Rate limiting options
   * @returns {Function} Middleware function
   */
  rateLimit(options = {}) {
    const requests = new Map();
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const maxRequests = options.maxRequests || 100;

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      // Clean up old entries
      for (const [ip, data] of requests.entries()) {
        if (now - data.firstRequest > windowMs) {
          requests.delete(ip);
        }
      }

      const userRequests = requests.get(key);
      
      if (!userRequests) {
        requests.set(key, {
          count: 1,
          firstRequest: now
        });
        return next();
      }

      if (now - userRequests.firstRequest > windowMs) {
        // Reset window
        requests.set(key, {
          count: 1,
          firstRequest: now
        });
        return next();
      }

      if (userRequests.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      }

      userRequests.count++;
      next();
    };
  }

  /**
   * Check if user can perform action
   * @param {string} action - Action to check
   * @returns {Function} Middleware function
   */
  canPerformAction(action) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.user.canPerformAction(action)) {
        return res.status(403).json({
          success: false,
          message: `Action '${action}' not allowed with current subscription`
        });
      }

      next();
    };
  }
}

module.exports = new AuthMiddleware();
