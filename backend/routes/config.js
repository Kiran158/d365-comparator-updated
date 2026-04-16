// backend/routes/config.js
const express = require('express');
const router = express.Router();
const logger = require('../services/loggerService');
const { credentialsStore } = require('../middleware/credentialsManager');

// ── Upload Credentials from .env file ────────────────────────────────────────
router.post('/upload-credentials', express.text({ type: 'text/plain' }), (req, res) => {
  try {
    let envContent = req.body;

    if (!envContent || typeof envContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid file content.',
      });
    }

    // Normalize line endings (handle both CRLF and LF)
    envContent = envContent.replace(/\r\n/g, '\n');

    // Parse .env file
    const credentials = parseEnvFile(envContent);

    logger.info('Parsed credentials from upload:', {
      keys: Object.keys(credentials),
      d365BaseUrl: credentials.D365_BASE_URL,
      azureTenantId: maskSensitive(credentials.AZURE_TENANT_ID),
      azureClientId: maskSensitive(credentials.AZURE_CLIENT_ID),
    });

    // Validate required fields
    const required = ['D365_BASE_URL', 'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'];
    const missing = required.filter((key) => !credentials[key]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required credentials: ${missing.join(', ')}`,
      });
    }

    // Validate that URLs are valid
    try {
      new URL(credentials.D365_BASE_URL);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: `Invalid D365_BASE_URL: ${credentials.D365_BASE_URL}`,
      });
    }

    // Store credentials in session
    const sessionId = generateSessionId();
    const storedCreds = {
      D365_BASE_URL: credentials.D365_BASE_URL,
      AZURE_TENANT_ID: credentials.AZURE_TENANT_ID,
      AZURE_CLIENT_ID: credentials.AZURE_CLIENT_ID,
      AZURE_CLIENT_SECRET: credentials.AZURE_CLIENT_SECRET,
      D365_RESOURCE: credentials.D365_RESOURCE || credentials.D365_BASE_URL,
      timestamp: Date.now(),
    };

    credentialsStore.set(sessionId, storedCreds);

    logger.info(`Credentials uploaded and stored for session: ${sessionId}`);

    // Set in response headers and return sessionId
    res.json({
      success: true,
      message: 'Credentials uploaded successfully',
      sessionId,
      credentials: {
        D365_BASE_URL: credentials.D365_BASE_URL,
        AZURE_TENANT_ID: maskSensitive(credentials.AZURE_TENANT_ID),
        AZURE_CLIENT_ID: maskSensitive(credentials.AZURE_CLIENT_ID),
      },
    });
  } catch (error) {
    logger.error('Credentials upload error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process credentials file: ' + error.message,
    });
  }
});

// ── Save Credentials from Form ───────────────────────────────────────────────
router.post('/save-credentials', express.json(), (req, res) => {
  try {
    const { AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET, D365_BASE_URL } = req.body;

    // Validate required fields
    const required = {
      AZURE_CLIENT_ID,
      AZURE_TENANT_ID,
      AZURE_CLIENT_SECRET,
      D365_BASE_URL,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required credentials: ${missing.join(', ')}`,
      });
    }

    // Validate that D365_BASE_URL is a valid URL
    try {
      new URL(D365_BASE_URL);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: `Invalid D365_BASE_URL: ${D365_BASE_URL}`,
      });
    }

    logger.info('Parsed credentials from form:', {
      d365BaseUrl: D365_BASE_URL,
      azureTenantId: maskSensitive(AZURE_TENANT_ID),
      azureClientId: maskSensitive(AZURE_CLIENT_ID),
    });

    // Store credentials in session
    const sessionId = generateSessionId();
    const storedCreds = {
      AZURE_CLIENT_ID,
      AZURE_TENANT_ID,
      AZURE_CLIENT_SECRET,
      D365_BASE_URL,
      D365_RESOURCE: D365_BASE_URL,
      timestamp: Date.now(),
    };

    credentialsStore.set(sessionId, storedCreds);

    logger.info(`Credentials saved from form for session: ${sessionId}`);

    res.json({
      success: true,
      message: 'Credentials saved successfully',
      sessionId,
      credentials: {
        D365_BASE_URL,
        AZURE_TENANT_ID: maskSensitive(AZURE_TENANT_ID),
        AZURE_CLIENT_ID: maskSensitive(AZURE_CLIENT_ID),
      },
    });
  } catch (error) {
    logger.error('Credentials save error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save credentials: ' + error.message,
    });
  }
});

// ── Get Current Credentials Status ───────────────────────────────────────────
router.get('/credentials-status', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (!sessionId || !credentialsStore.has(sessionId)) {
    return res.json({
      success: true,
      hasCustomCredentials: false,
      message: 'Using default credentials from .env',
    });
  }

  const creds = credentialsStore.get(sessionId);
  res.json({
    success: true,
    hasCustomCredentials: true,
    credentials: {
      D365_BASE_URL: creds.D365_BASE_URL,
      AZURE_TENANT_ID: maskSensitive(creds.AZURE_TENANT_ID),
      AZURE_CLIENT_ID: maskSensitive(creds.AZURE_CLIENT_ID),
      uploadedAt: new Date(creds.timestamp).toLocaleString(),
    },
  });
});

// ── Clear Session Credentials ────────────────────────────────────────────────
router.post('/clear-credentials', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (sessionId && credentialsStore.has(sessionId)) {
    credentialsStore.delete(sessionId);
    logger.info(`Credentials cleared for session: ${sessionId}`);
  }

  res.json({
    success: true,
    message: 'Credentials cleared. Using default credentials.',
  });
});

// ── Helper Functions ─────────────────────────────────────────────────────────

function parseEnvFile(content) {
  const credentials = {};
  const lines = content.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const [key, ...parts] = trimmed.split('=');
    const value = parts.join('=').trim();

    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');

    if (key && cleanValue) {
      credentials[key.trim()] = cleanValue;
    }
  });

  return credentials;
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function maskSensitive(value) {
  if (!value || value.length <= 4) return '****';
  return value.substring(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.substring(value.length - 4);
}

module.exports = router;
