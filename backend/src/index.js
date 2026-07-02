import app from './app.js';
import config, { validateConfig } from './config/env.js';
import { connectDB } from './config/database.js';
import mongoose from 'mongoose';
import { setupCronJobs } from './services/cleanup.service.js';

// Validate configurations (warn on missing environment variables)
validateConfig();

let server;

// Connect to database and then listen for connections
const startServer = async () => {
  await connectDB();
  setupCronJobs();
  
  server = app.listen(config.port, () => {
    console.log(`[Server]: Server is running in ${config.nodeEnv} mode on port ${config.port}`);
  });
};

startServer().catch((err) => {
  console.error('[Critical Error] Server startup failed:', err.message || err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Critical Error] Unhandled Promise Rejection:', err.message || err);
  if (config.nodeEnv !== 'production') {
    console.error(err);
  }
  // Gracefully close the server, then exit
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Critical Error] Uncaught Exception:', err.message || err);
  if (config.nodeEnv !== 'production') {
    console.error(err.stack);
  }
  gracefulShutdown();
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('[Server]: Shutting down gracefully...');
  
  const closeDB = async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('[Database]: Mongoose connection closed.');
      }
    } catch (err) {
      console.error('[Database Error]: Error closing Mongoose connection:', err.message || err);
    }
  };

  if (server) {
    server.close(async () => {
      console.log('[Server]: Closed all out-standing connections.');
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }

  // Force shutdown if connections are not closed within 10 seconds
  setTimeout(() => {
    console.error('[Server]: Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => {
  console.log('[Server]: SIGTERM received.');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('[Server]: SIGINT received.');
  gracefulShutdown();
});

