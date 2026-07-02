import mongoose from 'mongoose';
import config from './env.js';

/**
 * Connect to MongoDB using the URI specified in configuration.
 * Exits the process if the connection fails.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`[Database]: MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error]: Connection failed: ${error.message}`);
    process.exit(1);
  }
};
