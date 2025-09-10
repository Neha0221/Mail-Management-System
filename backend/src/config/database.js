const mongoose = require('mongoose');

// Database configuration options
const dbOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
};

// Connection event handlers
const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔄 MongoDB connection closed through app termination');
    process.exit(0);
  });
};

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, dbOptions);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    setupConnectionHandlers();
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Disconnect from database
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
