import express from 'express';
import config from '../config/env.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * Route handler for GET /api/health
 * Returns status, uptime, env, database status and timestamp.
 */
router.get('/', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: config.nodeEnv,
    database: dbState,
  });
});

export default router;

