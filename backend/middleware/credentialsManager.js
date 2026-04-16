// backend/middleware/credentialsManager.js
const logger = require('../services/loggerService');

// In-memory store for session credentials (cleaned up automatically)
const credentialsStore = new Map();

// Cleanup credentials after 24 hours of inactivity
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, data] of credentialsStore.entries()) {
    if (now - data.timestamp > CLEANUP_INTERVAL) {
      credentialsStore.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired credential sessions`);
  }
}, 60 * 60 * 1000); // Check every hour

// Middleware to attach current session credentials to request
function credentialsMiddleware(req, res, next) {
  const sessionId = req.headers['x-session-id'];

  if (sessionId && credentialsStore.has(sessionId)) {
    req.sessionCredentials = credentialsStore.get(sessionId);
    req.sessionId = sessionId;
  }

  next();
}

module.exports = {
  credentialsStore,
  credentialsMiddleware,
  parseEnvContent: (content) => {
    const credentials = {};
    const lines = content.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const [key, ...parts] = trimmed.split('=');
      const value = parts.join('=').trim();
      const cleanValue = value.replace(/^["']|["']$/g, '');

      if (key && cleanValue) {
        credentials[key.trim()] = cleanValue;
      }
    });

    return credentials;
  },
};
