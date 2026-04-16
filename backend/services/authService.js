// backend/services/authService.js
const msal = require('@azure/msal-node');
const { getAuthConfig } = require('../config/authConfig');
const logger = require('./loggerService');

// Token cache per session
const tokenCache = new Map();

// Get or create MSAL client for credentials
function getMsalClient(authConfig) {
  return new msal.ConfidentialClientApplication({
    auth: authConfig.auth,
  });
}

async function getAccessToken(sessionCredentials = null) {
  try {
    // Get config based on session credentials or defaults
    const authConfig = sessionCredentials
      ? getAuthConfig(sessionCredentials)
      : getAuthConfig();

    const msalClient = getMsalClient(authConfig);

    logger.debug('Acquiring token for client:', {
      clientId: authConfig.auth.clientId,
      resource: authConfig.d365.resource,
      usingSessionCredentials: !!sessionCredentials,
    });

    const result = await msalClient.acquireTokenByClientCredential({
      scopes: [`${authConfig.d365.resource}/.default`],
    });

    if (!result || !result.accessToken) {
      throw new Error('Failed to acquire access token from Azure AD - no token in response');
    }

    // Cache the token
    const cacheKey = `${authConfig.auth.clientId}`;
    tokenCache.set(cacheKey, {
      token: result.accessToken,
      expiry: result.expiresOn ? result.expiresOn.getTime() : Date.now() + 3600000,
    });

    logger.info('Access token acquired successfully');
    return result.accessToken;
  } catch (error) {
    logger.error('Auth error - Failed to get access token:', {
      message: error.message,
      code: error.code,
      usingSessionCredentials: !!sessionCredentials,
    });
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Clear token cache for a specific client
function clearTokenCache(clientId) {
  tokenCache.delete(clientId);
  logger.debug(`Token cache cleared for client: ${clientId}`);
}

module.exports = {
  getAccessToken,
  clearTokenCache,
};
