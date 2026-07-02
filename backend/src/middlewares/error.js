import config from '../config/env.js';

/**
 * Middleware to handle routes that are not found (404).
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global centralized error handler middleware.
 */
export const errorHandler = (err, req, res, next) => {
  // If headers have already been sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  const responseBody = {
    message: err.message || 'Internal Server Error',
    status: statusCode,
  };

  // Only include stack trace in development mode for security/privacy
  if (config.nodeEnv === 'development') {
    responseBody.stack = err.stack;
  }

  res.json(responseBody);
};
