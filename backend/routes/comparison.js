// backend/routes/comparison.js
const express = require('express');
const router = express.Router();
const {
  getTemplateEntities,
  getEntityData,
  compareSourceToDestinations,
} = require('../services/d365Service');
const { buildComparisonExcel } = require('../services/exportService');
const { getPublicCollectionName } = require('../services/entityMappingService');
const logger = require('../services/loggerService');

/**
 * POST /api/comparison/run
 * Body: { templateId: string, sourceEntity: string, destinationEntities: string[], entities?: string[] }
 *
 * Runs a full comparison between source and destination legal entities
 * for the selected entities in the template.
 */
router.post('/run', async (req, res) => {
  const { templateId, sourceEntity, destinationEntities, entities: selectedEntities } = req.body;

  if (!templateId) {
    return res.status(400).json({ success: false, error: 'templateId is required' });
  }
  if (!sourceEntity) {
    return res.status(400).json({ success: false, error: 'sourceEntity is required' });
  }
  if (!destinationEntities || destinationEntities.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one destination entity is required for comparison',
    });
  }
  if (destinationEntities.includes(sourceEntity)) {
    return res.status(400).json({
      success: false,
      error: 'Source entity cannot be in the destination entities list',
    });
  }

  // Combine source and destination entities for comparison
  const legalEntities = [sourceEntity, ...destinationEntities];

  try {
    // Fetch template entities
    let templateEntities = await getTemplateEntities(templateId, req.sessionCredentials);

    // Filter to selected entities if provided
    if (selectedEntities && selectedEntities.length > 0) {
      templateEntities = templateEntities.filter((e) =>
        selectedEntities.includes(e.Entity)
      );
    }

    if (templateEntities.length === 0) {
      return res.status(400).json({ success: false, error: 'No entities found in template' });
    }

    logger.info(
      `Running comparison: template=${templateId}, source=${sourceEntity}, destinations=${destinationEntities.join(',')}, entities=${templateEntities.length}`
    );

    const results = {};

    // For each entity, fetch data from all legal entities in parallel
    for (const templateEntity of templateEntities) {
      const entityName = templateEntity.Entity;
      
      // Get the public collection name from the mapping
      const publicCollectionName = await getPublicCollectionName(entityName);

      const entityFetches = legalEntities.map((le) =>
        getEntityData(publicCollectionName, le, null, req.sessionCredentials)
      );
      const entityResults = await Promise.all(entityFetches);

      // Run one-directional comparison (source → destinations)
      const comparison = compareSourceToDestinations(entityResults);

      results[entityName] = {
        entityName,
        module: templateEntity.SysModule,
        category: templateEntity.EntityCategory,
        sequence: templateEntity.Sequence,
        tags: templateEntity.Tags,
        perLegalEntity: entityResults.map((r) => ({
          legalEntityId: r.legalEntityId,
          count: r.count,
          error: r.error,
        })),
        comparison,
      };
    }

    // Build overall summary
    const overallSummary = {
      templateId,
      sourceEntity,
      destinationEntities,
      entityCount: templateEntities.length,
      totalSourceRecords: Object.values(results).reduce(
        (acc, r) => acc + (r.comparison?.summary?.totalSourceRecords || 0),
        0
      ),
      foundInAllDestinations: Object.values(results).reduce(
        (acc, r) => acc + (r.comparison?.summary?.foundInAllDestinations || 0),
        0
      ),
      missingInAllDestinations: Object.values(results).reduce(
        (acc, r) => acc + (r.comparison?.summary?.missingInAllDestinations || 0),
        0
      ),
      missingInSomeDestinations: Object.values(results).reduce(
        (acc, r) => acc + (r.comparison?.summary?.missingInSomeDestinations || 0),
        0
      ),
      timestamp: new Date().toISOString(),
    };

    res.json({ success: true, summary: overallSummary, results });
  } catch (error) {
    logger.error('POST /comparison/run error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/comparison/export
 * Body: { comparisonData: object, sourceEntity: string, destinationEntities: string[], templateId: string }
 *
 * Exports comparison result to Excel
 */
router.post('/export', async (req, res) => {
  const { comparisonData, sourceEntity, destinationEntities, templateId } = req.body;

  if (!comparisonData || !sourceEntity || !destinationEntities) {
    return res.status(400).json({ success: false, error: 'comparisonData, sourceEntity, and destinationEntities are required' });
  }

  // Combine for export
  const legalEntities = [sourceEntity, ...destinationEntities];

  try {
    const buffer = buildComparisonExcel(comparisonData, legalEntities);
    const filename = `D365_Comparison_${templateId}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (error) {
    logger.error('POST /comparison/export error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
