// backend/config/authConfig.js
require('dotenv').config();

// Get credentials from session or fallback to env variables
function getAuthConfig(sessionCredentials = null) {
  const creds = sessionCredentials || {};

  const clientId = creds.AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID;
  const clientSecret = creds.AZURE_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET;
  const tenantId = creds.AZURE_TENANT_ID || process.env.AZURE_TENANT_ID;
  const baseUrl = creds.D365_BASE_URL || process.env.D365_BASE_URL;
  const resource = creds.D365_RESOURCE || process.env.D365_RESOURCE;

  return {
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    d365: {
      baseUrl,
      resource,
      dataPath: '/data',
    },
  };
}

// Export default config (from env)
module.exports = getAuthConfig();

// Export function for dynamic config
module.exports.getAuthConfig = getAuthConfig;
