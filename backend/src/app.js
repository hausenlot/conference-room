import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import linkRouter from './routes/link.routes.js';
import roomRouter from './routes/room.routes.js';
import adminRouter from './routes/admin.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import agentRouter from './routes/agent.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/error.js';

const app = express();

// Enable CORS for public access
app.use(cors({
  origin: '*', // Allows all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mount webhook router BEFORE body parsers so it can access raw body
app.use('/api/webhooks', webhookRouter);

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mounting routes
app.use('/api/health', healthRouter);
app.use('/api/links', linkRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/admin', adminRouter);
app.use('/api', agentRouter);


// Fallback middlewares for error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
