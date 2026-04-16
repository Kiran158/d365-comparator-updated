// backend/routes/legalEntities.js
const express = require('express');
const router = express.Router();
const { getLegalEntities } = require('../services/d365Service');
const logger = require('../services/loggerService');

// GET /api/legal-entities - List all legal entities
router.get('/', async (req, res) => {
  try {
    const entities = await getLegalEntities(req.sessionCredentials);
    res.json({ success: true, data: entities, count: entities.length });
  } catch (error) {
    logger.error('GET /legal-entities error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
