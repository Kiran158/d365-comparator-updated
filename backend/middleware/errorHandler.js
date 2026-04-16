// backend/middleware/errorHandler.js
const logger = require('../services/loggerService');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
}

module.exports = { errorHandler, notFound };
