// frontend/src/components/ComparisonTable.jsx
import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const STATUS_LABELS = {
  matched: { label: 'Matched', cls: 'badge-matched' },
  different: { label: 'Different', cls: 'badge-different' },
  partial: { label: 'Partial', cls: 'badge-partial' },
  missing: { label: 'Missing', cls: 'badge-missing' },
};

export default function ComparisonTable({ entityName, result, legalEntities }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedLegalEntity, setSelectedLegalEntity] = useState(null);

  const rows = result?.comparison?.rows || [];

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  // Collect all field names from first available record
  const fields = useMemo(() => {
    for (const row of rows) {
      const rec = Object.values(row.records)[0];
      if (rec) {
        return Object.keys(rec).filter(
          (f) => !['@odata.etag', 'dataAreaId'].includes(f)
        );
      }
    }
    return [];
  }, [rows]);

  const statusCounts = useMemo(() => {
    const counts = { matched: 0, different: 0, partial: 0, missing: 0 };
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [rows]);

  // Calculate legal entity wise total counts
  const legalEntityCounts = useMemo(() => {
    const counts = {};
    result.perLegalEntity?.forEach((item) => {
      counts[item.legalEntityId] = item.count;
    });
    return counts;
  }, [result]);

  if (!result) return null;

  return (
    <div style={styles.wrap}>
      {/* Entity header */}
      <div style={styles.entityHeader}>
        <div>
          <div style={styles.entityTitle}>{entityName}</div>
          <div style={styles.entityMeta}>
            {result.module && <span style={styles.metaPill}>{result.module}</span>}
            {result.category && <span style={styles.metaPill}>{result.category}</span>}
          </div>
        </div>
        <div style={styles.scoreBadge}>
          <span style={styles.scoreNum}>{result.comparison?.summary?.matchPercent ?? 0}%</span>
          <span style={styles.scoreLabel}>match</span>
        </div>
      </div>

      {/* Stat pills */}
      <div style={styles.statRow}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            style={{
              ...styles.statPill,
              ...(statusFilter === status ? styles.statPillActive : {}),
            }}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
          >
            <span className={`badge ${STATUS_LABELS[status].cls}`}>{STATUS_LABELS[status].label}</span>
            <span style={styles.statCount}>{count}</span>
          </button>
        ))}
        <button
          style={{ ...styles.statPill, ...(statusFilter === 'all' ? styles.statPillActive : {}) }}
          onClick={() => setStatusFilter('all')}
        >
          <Filter size={11} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All ({rows.length})</span>
        </button>

        {/* Legal Entity Counts Badges */}
        {legalEntities.map((le, idx) => {
          const colors = [
            { bg: 'var(--success-bg)', text: 'var(--success)' },
            { bg: 'var(--accent-glow)', text: 'var(--accent)' },
            { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
            { bg: 'var(--partial-bg)', text: 'var(--partial)' },
          ];
          const colorSet = colors[idx % colors.length];
          const isSelected = selectedLegalEntity === le;
          return (
            <button
              key={`le-${le}`}
              onClick={() => setSelectedLegalEntity(isSelected ? null : le)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--surface-2)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  background: colorSet.bg,
                  color: colorSet.text,
                }}
              >
                {le}
              </span>
              <span style={styles.statCount}>{legalEntityCounts[le] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {result.perLegalEntity?.some((r) => r.error) && (
        <div style={styles.errorBanner}>
          <AlertCircle size={13} />
          {result.perLegalEntity
            .filter((r) => r.error)
            .map((r) => `${r.legalEntityId}: ${r.error}`)
            .join(' | ')}
        </div>
      )}

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Record Key</th>
              {legalEntities.map((le) => (
                <th key={le} style={styles.th}>{le}</th>
              ))}
              <th style={styles.th}>Diff Fields</th>
              <th style={{ ...styles.th, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4 + legalEntities.length} style={styles.emptyCell}>
                  No records for this filter
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isExpanded = expandedRow === idx;
                return (
                  <React.Fragment key={idx}>
                    <tr
                      style={{
                        ...styles.tr,
                        ...(row.status === 'different' ? styles.trDiff : {}),
                        ...(row.status === 'partial' || row.status === 'missing' ? styles.trPartial : {}),
                      }}
                    >
                      <td style={styles.td}>
                        <span className={`badge ${STATUS_LABELS[row.status].cls}`}>
                          {STATUS_LABELS[row.status].label}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...styles.keyCell }}>{row.key}</td>
                      {legalEntities.map((le) => (
                        <td key={le} style={styles.td}>
                          {row.records[le] ? (
                            <span style={styles.presentDot}>✓</span>
                          ) : (
                            <span style={styles.missingDot}>✗</span>
                          )}
                        </td>
                      ))}
                      <td style={styles.td}>
                        {Object.keys(row.fieldDiffs).length > 0 ? (
                          <span style={styles.diffCount}>
                            {Object.keys(row.fieldDiffs).length} field{Object.keys(row.fieldDiffs).length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {(Object.keys(row.fieldDiffs).length > 0 || row.status !== 'matched') && (
                          <button
                            style={styles.expandBtn}
                            onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded diff detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={4 + legalEntities.length} style={styles.expandedCell}>
                          <div style={styles.diffDetail}>
                            {row.missingIn.length > 0 && (
                              <div style={styles.diffSection}>
                                <div style={styles.diffSectionTitle}>Missing in</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {row.missingIn.map((le) => (
                                    <span key={le} className="badge badge-missing">{le}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Object.keys(row.fieldDiffs).length > 0 && (
                              <div style={styles.diffSection}>
                                <div style={styles.diffSectionTitle}>Field differences</div>
                                <table style={styles.diffTable}>
                                  <thead>
                                    <tr>
                                      <th style={styles.diffTh}>Field</th>
                                      {row.presentIn.map((le) => (
                                        <th key={le} style={styles.diffTh}>{le}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(row.fieldDiffs).map(([field, vals]) => (
                                      <tr key={field}>
                                        <td style={{ ...styles.diffTd, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                                          {field}
                                        </td>
                                        {row.presentIn.map((le) => (
                                          <td key={le} style={styles.diffTd}>
                                            {String(vals[le] ?? '—')}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legal Entity Detail View */}
      {selectedLegalEntity && (
        <div style={styles.detailSection}>
          <div style={styles.detailHeader}>
            <div style={styles.detailTitle}>
              {selectedLegalEntity} Records ({legalEntityCounts[selectedLegalEntity] || 0})
            </div>
            <button
              style={styles.closeBtn}
              onClick={() => setSelectedLegalEntity(null)}
              title="Close"
            >
              ✕
            </button>
          </div>
          <div style={styles.detailContent}>
            <table style={styles.detailTable}>
              <thead>
                <tr>
                  <th style={styles.detailTh}>Record Key</th>
                  {fields.map((field) => (
                    <th key={field} style={styles.detailTh}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => row.records[selectedLegalEntity])
                  .map((row, idx) => {
                    const record = row.records[selectedLegalEntity];
                    return (
                      <tr key={idx} style={styles.detailTr}>
                        <td style={{ ...styles.detailTd, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {row.key}
                        </td>
                        {fields.map((field) => (
                          <td key={field} style={styles.detailTd}>
                            {String(record[field] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  entityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
  },
  entityTitle: { fontWeight: 700, fontSize: 14, color: 'var(--text)' },
  entityMeta: { display: 'flex', gap: 6, marginTop: 4 },
  metaPill: {
    fontSize: 10,
    background: 'var(--surface-3)',
    color: 'var(--text-muted)',
    borderRadius: 4,
    padding: '1px 7px',
  },
  scoreBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'var(--surface-3)',
    borderRadius: 8,
    padding: '6px 14px',
    minWidth: 60,
  },
  scoreNum: { fontSize: 20, fontWeight: 700, color: 'var(--success)', lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'var(--text-dim)', marginTop: 2 },
  statRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  statPillActive: { borderColor: 'var(--accent)' },
  statCount: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    padding: '8px 16px',
    fontSize: 12,
    borderBottom: '1px solid var(--border)',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    background: 'var(--surface-3)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  trDiff: { background: 'rgba(251,191,36,0.04)' },
  trPartial: { background: 'rgba(248,113,113,0.04)' },
  td: { padding: '8px 12px', color: 'var(--text)', verticalAlign: 'middle' },
  keyCell: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  presentDot: { color: 'var(--success)', fontSize: 13 },
  missingDot: { color: 'var(--danger)', fontSize: 13 },
  diffCount: { fontSize: 11, color: 'var(--warning)', background: 'var(--warning-bg)', borderRadius: 4, padding: '1px 7px' },
  expandBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '2px 4px',
  },
  expandedCell: { padding: 0, background: 'var(--surface-2)' },
  diffDetail: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
  diffSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  diffSectionTitle: { fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  diffTable: { borderCollapse: 'collapse', fontSize: 12 },
  diffTh: { padding: '5px 10px', background: 'var(--surface-3)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', border: '1px solid var(--border)' },
  diffTd: { padding: '5px 10px', color: 'var(--text)', border: '1px solid var(--border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' },
  emptyCell: { textAlign: 'center', color: 'var(--text-dim)', padding: 24 },
  detailSection: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderTop: 'none',
    borderBottomLeftRadius: 'var(--radius-lg)',
    borderBottomRightRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-3)',
  },
  detailTitle: { fontWeight: 600, fontSize: 13, color: 'var(--text)' },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    transition: 'color 0.15s',
  },
  detailContent: { overflowX: 'auto', maxHeight: 600 },
  detailTable: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  detailTh: {
    textAlign: 'left',
    padding: '8px 12px',
    background: 'var(--surface)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    borderRight: '1px solid var(--border)',
  },
  detailTr: { borderBottom: '1px solid var(--border)' },
  detailTd: { padding: '8px 12px', color: 'var(--text)', borderRight: '1px solid var(--border)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' },
};

