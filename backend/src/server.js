const app = require('./app');
const { connectDB } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('🔄 Shutting down gracefully...');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start the server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`�� Health check: http://${HOST}:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();