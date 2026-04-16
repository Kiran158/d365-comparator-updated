// backend/services/entityMappingService.js
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const logger = require('./loggerService');

const DATA_FILE = path.join(__dirname, '../data/DataEntities.xlsx');
let entityMapping = null;
let lastLoadTime = null;

/**
 * Load and cache the entity mapping from DataEntities.xlsx
 * Maps Label -> PublicCollectionName
 */
async function loadEntityMapping() {
  try {
    // Check if file exists
    if (!fs.existsSync(DATA_FILE)) {
      logger.warn(`DataEntities.xlsx not found at ${DATA_FILE}`);
      return {};
    }

    // Read the Excel file
    const workbook = xlsx.readFile(DATA_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!worksheet) {
      logger.warn('No worksheets found in DataEntities.xlsx');
      return {};
    }

    // Convert to JSON
    const rows = xlsx.utils.sheet_to_json(worksheet);
    
    if (rows.length === 0) {
      logger.warn('DataEntities.xlsx is empty');
      return {};
    }

    // Build mapping: Label -> PublicCollectionName
    const mapping = {};
    for (const row of rows) {
      const label = row.Label?.trim();
      const publicCollectionName = row.PublicCollectionName?.trim();
      
      if (label && publicCollectionName) {
        mapping[label] = publicCollectionName;
      }
    }

    logger.info(`Loaded entity mapping with ${Object.keys(mapping).length} entries`);
    entityMapping = mapping;
    lastLoadTime = Date.now();
    
    return mapping;
  } catch (error) {
    logger.error(`Error loading entity mapping: ${error.message}`);
    return {};
  }
}

/**
 * Get the public collection name for a given entity label
 * @param {string} entityLabel - The entity label to look up
 * @returns {string} The public collection name, or the original label if not found
 */
async function getPublicCollectionName(entityLabel) {
  // Load mapping if not already loaded
  if (!entityMapping) {
    await loadEntityMapping();
  }

  // Return the mapped value or fall back to the original label
  const publicName = entityMapping[entityLabel];
  
  if (!publicName) {
    logger.warn(`Entity label not found in mapping: ${entityLabel}`);
    return entityLabel;
  }

  logger.debug(`Mapped entity ${entityLabel} to ${publicName}`);
  return publicName;
}

/**
 * Reloads the mapping (useful for testing or manual refresh)
 */
async function refreshMapping() {
  entityMapping = null;
  return loadEntityMapping();
}

module.exports = {
  loadEntityMapping,
  getPublicCollectionName,
  refreshMapping,
};
