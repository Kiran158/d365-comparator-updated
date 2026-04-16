// backend/routes/comparison.js
const express = require('express');
const router = express.Router();
const {
  getTemplateEntities,
  getEntityData,
  compareEntityData,
} = require('../services/d365Service');
const { buildComparisonExcel } = require('../services/exportService');
const { getPublicCollectionName } = require('../services/entityMappingService');
const logger = require('../services/loggerService');

/**
 * POST /api/comparison/run
 * Body: { templateId: string, legalEntities: string[], entities?: string[] }
 *
 * Runs a full comparison across all entities in the template
 * for the selected legal entities.
 */
router.post('/run', async (req, res) => {
  const { templateId, legalEntities, entities: selectedEntities } = req.body;

  if (!templateId) {
    return res.status(400).json({ success: false, error: 'templateId is required' });
  }
  if (!legalEntities || legalEntities.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'At least 2 legal entities are required for comparison',
    });
  }

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
      `Running comparison: template=${templateId}, entities=${templateEntities.length}, legalEntities=${legalEntities.join(',')}`
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

      // Run comparison
      const comparison = compareEntityData(entityResults);

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
      legalEntities,
      entityCount: templateEntities.length,
      totalRecordsCompared: Object.values(results).reduce(
        (acc, r) => acc + (r.comparison?.summary?.totalUniqueKeys || 0),
        0
      ),
      fullyMatched: Object.values(results).filter(
        (r) => r.comparison?.summary?.matchPercent === 100
      ).length,
      hasIssues: Object.values(results).filter(
        (r) => (r.comparison?.summary?.matchPercent || 0) < 100
      ).length,
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
 * Body: { comparisonData: object, legalEntities: string[], templateId: string }
 *
 * Exports comparison result to Excel
 */
router.post('/export', async (req, res) => {
  const { comparisonData, legalEntities, templateId } = req.body;

  if (!comparisonData || !legalEntities) {
    return res.status(400).json({ success: false, error: 'comparisonData and legalEntities are required' });
  }

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
