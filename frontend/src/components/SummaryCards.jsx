// frontend/src/components/SummaryCards.jsx
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, GitCompare, Layers } from 'lucide-react';

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${color}` }}>
      <div style={{ color }}>{icon}</div>
      <div style={styles.cardValue}>{value}</div>
      <div style={styles.cardLabel}>{label}</div>
    </div>
  );
}

export default function SummaryCards({ summary, results }) {
  if (!summary) return null;

  const entityResults = Object.values(results || {});
  
  // Calculate coverage: how many source records are found in at least some destination
  const totalSourceRecords = entityResults.reduce(
    (acc, r) => acc + (r.comparison?.summary?.totalSourceRecords || 0),
    0
  );
  const foundInAllDests = entityResults.reduce(
    (acc, r) => acc + (r.comparison?.summary?.foundInAllDestinations || 0),
    0
  );
  const missingInAllDests = entityResults.reduce(
    (acc, r) => acc + (r.comparison?.summary?.missingInAllDestinations || 0),
    0
  );
  const missingInSomeDests = entityResults.reduce(
    (acc, r) => acc + (r.comparison?.summary?.missingInSomeDestinations || 0),
    0
  );

  const coveragePercent =
    totalSourceRecords > 0
      ? Math.round(((totalSourceRecords - missingInAllDests) / totalSourceRecords) * 100)
      : 100;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <GitCompare size={16} color="var(--accent)" />
        <span style={styles.title}>Comparison Summary</span>
        <span style={styles.meta}>
          {summary.sourceEntity} → {summary.destinationEntities?.join(', ')} · {new Date(summary.timestamp).toLocaleString()}
        </span>
      </div>

      <div style={styles.grid}>
        <StatCard
          icon={<Layers size={22} />}
          label="Entities Compared"
          value={summary.entityCount}
          color="var(--accent)"
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          label="Source Records in All Destinations"
          value={foundInAllDests.toLocaleString()}
          color="var(--success)"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Missing in Some Destinations"
          value={missingInSomeDests.toLocaleString()}
          color="var(--warning)"
        />
        <StatCard
          icon={<XCircle size={22} />}
          label="Missing in All Destinations"
          value={missingInAllDests.toLocaleString()}
          color="var(--danger)"
        />
        <StatCard
          icon={
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)' }}>
              {coveragePercent}%
            </span>
          }
          label="Data Coverage"
          value=""
          color={coveragePercent >= 90 ? 'var(--success)' : coveragePercent >= 70 ? 'var(--warning)' : 'var(--danger)'}
        />
      </div>

      {/* Per-entity summary */}
      <div style={styles.entityGrid}>
        {entityResults.map((r) => {
          const total = r.comparison?.summary?.totalSourceRecords || 0;
          const found = r.comparison?.summary?.foundInAllDestinations || 0;
          const pct = total > 0 ? Math.round((found / total) * 100) : 100;
          const color =
            pct === 100 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
          return (
            <div key={r.entityName} style={styles.entityCard}>
              <div style={styles.entityCardTop}>
                <span style={styles.entityCardName}>{r.entityName}</span>
                <span style={{ ...styles.entityPct, color }}>{pct}%</span>
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${pct}%`,
                    background: color,
                  }}
                />
              </div>
              <div style={styles.entityCardMeta}>
                {r.perLegalEntity?.map((le) => (
                  <span key={le.legalEntityId} style={styles.leCount}>
                    {le.legalEntityId}: {le.count?.toLocaleString() ?? '—'}
                    {le.error && ' ⚠'}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  title: { fontWeight: 700, fontSize: 14, color: 'var(--text)' },
  meta: { fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 1,
    background: 'var(--border)',
    borderBottom: '1px solid var(--border)',
  },
  card: {
    background: 'var(--surface)',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardValue: { fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  cardLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  entityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 12,
    padding: 16,
  },
  entityCard: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  entityCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  entityCardName: { fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, marginRight: 8, wordBreak: 'break-all' },
  entityPct: { fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0 },
  progressTrack: { height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 2, transition: 'width 0.5s ease' },
  entityCardMeta: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  leCount: { fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-dim)', background: 'var(--surface-3)', borderRadius: 4, padding: '2px 6px' },
};
