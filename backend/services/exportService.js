// backend/services/exportService.js
const XLSX = require('xlsx');
const logger = require('./loggerService');

/**
 * Build an Excel workbook from comparison results
 * @param {Object} comparisonData - Full comparison result keyed by entity name
 * @param {string[]} legalEntities - Array of legal entity IDs
 * @returns {Buffer} Excel file buffer
 */
function buildComparisonExcel(comparisonData, legalEntities) {
  const wb = XLSX.utils.book_new();

  // ── Summary Sheet ─────────────────────────────────────────────
  const summaryRows = [
    ['Entity', 'Total Records', 'Matched', 'Partial Match', 'Differences', 'Missing', 'Match %'],
  ];

  for (const [entityName, result] of Object.entries(comparisonData)) {
    const s = result.comparison?.summary || {};
    summaryRows.push([
      entityName,
      s.totalUniqueKeys || 0,
      s.matched || 0,
      s.partialMatch || 0,
      s.hasDifferences || 0,
      s.missingInSome || 0,
      `${s.matchPercent || 0}%`,
    ]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // ── Per-Entity Sheets ─────────────────────────────────────────
  for (const [entityName, result] of Object.entries(comparisonData)) {
    if (!result.comparison || !result.comparison.rows.length) continue;

    const rows = result.comparison.rows;
    const firstRecord = Object.values(rows[0].records)[0] || {};
    const fields = Object.keys(firstRecord).filter(
      (f) => !['@odata.etag', 'dataAreaId'].includes(f)
    );

    // Header row
    const header = ['Key', 'Status', ...legalEntities.flatMap((le) => fields.map((f) => `${le}:${f}`))];
    const dataRows = [header];

    for (const row of rows) {
      const dataRow = [
        row.key,
        row.status,
        ...legalEntities.flatMap((le) =>
          fields.map((f) => {
            const val = row.records[le]?.[f];
            return val !== undefined ? String(val) : '—';
          })
        ),
      ];
      dataRows.push(dataRow);
    }

    const sheet = XLSX.utils.aoa_to_sheet(dataRows);
    // Truncate entity name to 31 chars (Excel limit)
    const sheetName = entityName.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);

    logger.debug(`Added sheet: ${sheetName} with ${dataRows.length - 1} rows`);
  }

  // ── Differences-Only Sheet ─────────────────────────────────────
  const diffRows = [['Entity', 'Key', 'Status', 'Present In', 'Missing In', 'Fields With Differences']];

  for (const [entityName, result] of Object.entries(comparisonData)) {
    if (!result.comparison) continue;
    const nonMatched = result.comparison.rows.filter((r) => r.status !== 'matched');
    for (const row of nonMatched) {
      diffRows.push([
        entityName,
        row.key,
        row.status,
        row.presentIn.join(', '),
        row.missingIn.join(', '),
        Object.keys(row.fieldDiffs).join(', '),
      ]);
    }
  }

  const diffSheet = XLSX.utils.aoa_to_sheet(diffRows);
  diffSheet['!cols'] = [
    { wch: 30 }, { wch: 40 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, diffSheet, 'Differences Only');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { buildComparisonExcel };
