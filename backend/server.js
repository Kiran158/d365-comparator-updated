// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./services/loggerService');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { credentialsMiddleware } = require('./middleware/credentialsManager');
const { loadEntityMapping } = require('./services/entityMappingService');

const configRouter = require('./routes/config');
const templatesRouter = require('./routes/templates');
const legalEntitiesRouter = require('./routes/legalEntities');
const comparisonRouter = require('./routes/comparison');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    exposedHeaders: ['Content-Disposition'],
  })
);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Credentials Middleware ────────────────────────────────────────────────────
app.use(credentialsMiddleware);

// ── Request Logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/config', configRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/legal-entities', legalEntitiesRouter);
app.use('/api/comparison', comparisonRouter);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  logger.info(`🚀 D365 Comparator API running on port ${PORT}`);
  logger.info(`   Environment: ${process.env.NODE_ENV}`);
  logger.info(`   D365 Instance: ${process.env.D365_BASE_URL}`);
  
  // Load entity mapping from DataEntities.xlsx
  try {
    await loadEntityMapping();
    logger.info('✓ Entity mapping loaded successfully');
  } catch (error) {
    logger.warn(`⚠ Entity mapping loading failed: ${error.message}`);
  }
});

module.exports = app;
