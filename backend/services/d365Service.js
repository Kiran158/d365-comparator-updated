// backend/services/d365Service.js
const axios = require('axios');
const { getAccessToken } = require('./authService');
const { getAuthConfig } = require('../config/authConfig');
const logger = require('./loggerService');

// Helper to build base URL from credentials
function getBaseDataUrl(sessionCredentials = null) {
  const authConfig = sessionCredentials
    ? getAuthConfig(sessionCredentials)
    : getAuthConfig();
  return `${authConfig.d365.baseUrl}${authConfig.d365.dataPath}`;
}

async function d365Get(endpoint, params = {}, sessionCredentials = null) {
  const token = await getAccessToken(sessionCredentials);
  const baseUrl = getBaseDataUrl(sessionCredentials);
  const url = `${baseUrl}/${endpoint}`;

  logger.debug(`D365 GET: ${url}`, { params, hasToken: !!token, usingSessionCreds: !!sessionCredentials });

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Prefer: 'odata.maxpagesize=1000',
      },
      params: {
        $format: 'json',
        ...params,
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.response?.data?.error || error.message;
    
    logger.error(`D365 API Error [${status}]:`, {
      status,
      message,
      url,
      errorData: error.response?.data,
      usingSessionCreds: !!sessionCredentials,
    });

    // Provide more helpful error message
    if (status === 401) {
      throw new Error('Unauthorized: Check if credentials and D365 instance are correct');
    } else if (status === 403) {
      throw new Error('Forbidden: User may not have permission');
    } else if (status === 404) {
      throw new Error('Not Found: Check D365 instance URL');
    }
    
    throw new Error(`D365 API Error [${status}]: ${message}`);
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────

async function getTemplates(sessionCredentials = null) {
  const data = await d365Get(
    'DefinitionGroupTemplateHeaders',
    {
      $select: 'TemplateId,Description,Status,ValidatedDateTime',
      $orderby: 'TemplateId',
    },
    sessionCredentials
  );
  return data.value || [];
}

async function getTemplateById(templateId, sessionCredentials = null) {
  const data = await d365Get(
    `DefinitionGroupTemplateHeaders('${encodeURIComponent(templateId)}')`,
    {
      $select: 'TemplateId,Description,Status,ValidatedDateTime',
    },
    sessionCredentials
  );
  return data;
}

// ─── Template Entities ───────────────────────────────────────────────────────

async function getTemplateEntities(templateId, sessionCredentials = null) {
  // Escape single quotes in templateId for OData filter
  const escapedTemplateId = templateId.replace(/'/g, "''");
  const data = await d365Get(
    'DefinitionGroupTemplateLines',
    {
      $filter: `TemplateId eq '${escapedTemplateId}'`,
      $select:
        'TemplateId,Entity,Sequence,ValidationStatus,ExecutionUnit,LevelInExecutionUnit,FailLevelOnError,FailExecutionUnitOnError,SysModule,Tags,EntityCategory',
      $orderby: 'Sequence',
    },
    sessionCredentials
  );
  return data.value || [];
}

// ─── Legal Entities ──────────────────────────────────────────────────────────

async function getLegalEntities(sessionCredentials = null) {
  const data = await d365Get(
    'Companies',
    {
      $select: 'DataArea,Name,LanguageId,KnownAs',
      $orderby: 'DataArea',
    },
    sessionCredentials
  );
  return data.value || [];
}

// ─── Entity Data Per Legal Entity ────────────────────────────────────────────

async function getEntityData(entityName, legalEntityId, select = null, sessionCredentials = null) {
  // Escape single quotes in legalEntityId for OData filter
  const escapedLegalEntityId = legalEntityId.replace(/'/g, "''");
  const params = {
    "cross-company": true,
    $filter: `dataAreaId eq '${escapedLegalEntityId}'`,
    $top: 5000,
  };

  if (select && select.length > 0) {
    params.$select = select.join(',');
  }

  try {
    const data = await d365Get(entityName, params, sessionCredentials);
    return {
      legalEntityId,
      entityName,
      records: data.value || [],
      count: (data.value || []).length,
      error: null,
    };
  } catch (error) {
    logger.warn(`Could not fetch ${entityName} for ${legalEntityId}: ${error.message}`);
    return {
      legalEntityId,
      entityName,
      records: [],
      count: 0,
      error: error.message,
    };
  }
}

// ─── Comparison Logic ────────────────────────────────────────────────────────

/**
 * Normalize a value for comparison: trim and convert to lowercase
 * @param {*} value - The value to normalize
 * @returns {string} - Normalized value
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function compareEntityData(entityResults, keyField = null) {
  // entityResults = [ { legalEntityId, records: [...] }, ... ]
  const legalEntities = entityResults.map((r) => r.legalEntityId);

  // Build maps: record key → { legalEntityId → record }
  const recordMap = {};

  for (const result of entityResults) {
    for (const record of result.records) {
      // Auto-detect key if not provided
      const key = keyField
        ? record[keyField]
        : Object.entries(record)
            .filter(
              ([k]) =>
                !['dataAreaId', '@odata.etag', 'modifiedDateTime', 'createdDateTime'].includes(k)
            )
            .slice(0, 3)
            .map(([, v]) => v)
            .join('|');

      if (!recordMap[key]) {
        recordMap[key] = {};
      }
      recordMap[key][result.legalEntityId] = record;
    }
  }

  const comparison = {
    summary: {
      totalUniqueKeys: 0,
      matched: 0,
      partialMatch: 0,
      missingInSome: 0,
      hasDifferences: 0,
    },
    rows: [],
  };

  for (const [key, entityMap] of Object.entries(recordMap)) {
    const presentIn = legalEntities.filter((le) => entityMap[le] !== undefined);
    const missingIn = legalEntities.filter((le) => entityMap[le] === undefined);

    // Field-level diff for rows present in all entities
    // Use case-insensitive, trimmed comparison
    let fieldDiffs = {};
    if (presentIn.length > 1) {
      const firstRecord = entityMap[presentIn[0]];
      for (const field of Object.keys(firstRecord)) {
        if (['dataAreaId', '@odata.etag'].includes(field)) continue;
        const values = presentIn.map((le) => entityMap[le]?.[field]);
        const normalizedValues = values.map(normalizeValue);
        const allSame = normalizedValues.every((v) => v === normalizedValues[0]);
        if (!allSame) {
          fieldDiffs[field] = Object.fromEntries(
            presentIn.map((le, i) => [le, values[i]])
          );
        }
      }
    }

    let status = 'matched';
    if (missingIn.length === legalEntities.length) {
      status = 'missing';
    } else if (missingIn.length > 0) {
      status = 'partial';
    } else if (Object.keys(fieldDiffs).length > 0) {
      status = 'different';
    }

    comparison.rows.push({
      key,
      status,
      presentIn,
      missingIn,
      records: entityMap,
      fieldDiffs,
    });

    comparison.summary.totalUniqueKeys++;
    if (status === 'matched') comparison.summary.matched++;
    if (status === 'partial') comparison.summary.partialMatch++;
    if (status === 'missing') comparison.summary.missingInSome++;
    if (status === 'different') comparison.summary.hasDifferences++;
  }

  comparison.summary.matchPercent =
    comparison.summary.totalUniqueKeys > 0
      ? Math.round((comparison.summary.matched / comparison.summary.totalUniqueKeys) * 100)
      : 100;

  return comparison;
}

module.exports = {
  getTemplates,
  getTemplateById,
  getTemplateEntities,
  getLegalEntities,
  getEntityData,
  compareEntityData,
};