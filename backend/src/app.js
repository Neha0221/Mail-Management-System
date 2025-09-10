const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: process.env.CORS_CREDENTIALS === 'true'
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Mail Management App Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Mail Management App API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const emailAccountRoutes = require('./routes/emailAccounts');
const syncRoutes = require('./routes/sync');
const analyticsRoutes = require('./routes/analytics');
const searchRoutes = require('./routes/search');

// API routes
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Mail Management App API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      emails: '/api/emails',
      emailAccounts: '/api/email-accounts',
      sync: '/api/sync',
      analytics: '/api/analytics',
      search: '/api/search'
    }
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/email-accounts', emailAccountRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

module.exports = app;