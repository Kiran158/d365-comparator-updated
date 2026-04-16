// backend/routes/templates.js
const express = require('express');
const router = express.Router();
const { getTemplates, getTemplateById, getTemplateEntities } = require('../services/d365Service');
const logger = require('../services/loggerService');

// GET /api/templates - List all data management templates
router.get('/', async (req, res) => {
  try {
    const templates = await getTemplates(req.sessionCredentials);
    res.json({ success: true, data: templates, count: templates.length });
  } catch (error) {
    logger.error('GET /templates error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
    const template = await getTemplateById(req.params.id, req.sessionCredentials);
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error(`GET /templates/${req.params.id} error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/templates/:id/entities - Get entities in a template
router.get('/:id/entities', async (req, res) => {
  try {
    const entities = await getTemplateEntities(req.params.id, req.sessionCredentials);
    res.json({ success: true, data: entities, count: entities.length });
  } catch (error) {
    logger.error(`GET /templates/${req.params.id}/entities error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
