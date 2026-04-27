// frontend/src/components/SourceEntityPicker.jsx
import React, { useState } from 'react';
import { Building2, Search, X } from 'lucide-react';

export default function SourceEntityPicker({ entities, selected, onChange, loading }) {
  const [filter, setFilter] = useState('');

  const filtered = (entities || []).filter(
    (e) =>
      e.DataArea?.toLowerCase().includes(filter.toLowerCase()) ||
      e.Name?.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelect = (dataArea) => {
    onChange(dataArea === selected ? null : dataArea);
  };

  const handleClear = () => {
    onChange(null);
    setFilter('');
  };

  const selectedEntity = entities?.find((e) => e.DataArea === selected);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <Building2 size={14} color="var(--accent)" />
        <span style={styles.title}>Source Legal Entity</span>
        <span style={styles.hint}>(required)</span>
      </div>

      {/* Selected entity */}
      {selected && (
        <div style={styles.selectedBanner}>
          <div style={styles.selectedContent}>
            <Building2 size={12} />
            <div style={styles.selectedInfo}>
              <div style={styles.selectedCode}>{selected}</div>
              {selectedEntity?.Name && selectedEntity.Name !== selected && (
                <div style={styles.selectedName}>{selectedEntity.Name}</div>
              )}
            </div>
          </div>
          <button style={styles.clearBtn} onClick={handleClear} title="Clear selection">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search + list */}
      <div style={styles.searchWrap}>
        <Search size={12} color="var(--text-dim)" style={styles.searchIcon} />
        <input
          style={styles.searchInput}
          placeholder="Search legal entities..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div style={styles.listWrap}>
        {loading ? (
          <div style={styles.center}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>No entities found</div>
        ) : (
          filtered.map((entity) => {
            const isSelected = selected === entity.DataArea;
            return (
              <label key={entity.DataArea} style={styles.entityRow}>
                <input
                  type="radio"
                  name="source-entity"
                  checked={isSelected}
                  onChange={() => handleSelect(entity.DataArea)}
                  style={styles.radio}
                />
                <span style={styles.entityCode}>{entity.DataArea}</span>
                {entity.Name && (
                  <span style={styles.entityName}>{entity.Name}</span>
                )}
                {entity.KnownAs && (
                  <span style={styles.entityCountry}>{entity.KnownAs}</span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    flex: 1,
    minWidth: 300,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
  },
  hint: {
    fontSize: 11,
    color: 'var(--text-dim)',
    fontWeight: 400,
  },
  selectedBanner: {
    background: 'var(--accent-glow)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  selectedContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  selectedInfo: {
    minWidth: 0,
    flex: 1,
  },
  selectedCode: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  selectedName: {
    fontSize: 11,
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-dim)',
    transition: 'color 0.2s',
  },
  searchWrap: {
    position: 'relative',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 10px 8px 28px',
    fontSize: 12,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
  },
  listWrap: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px',
    background: 'var(--bg)',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  empty: {
    textAlign: 'center',
    padding: '20px 16px',
    color: 'var(--text-dim)',
    fontSize: 12,
  },
  entityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 8px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontSize: 12,
    minHeight: 32,
    userSelect: 'none',
  },
  radio: {
    width: 16,
    height: 16,
    minWidth: 16,
    cursor: 'pointer',
    margin: 0,
  },
  entityCode: {
    fontWeight: 600,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    minWidth: 60,
  },
  entityName: {
    color: 'var(--text-dim)',
    fontSize: 11,
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  entityCountry: {
    fontSize: 10,
    color: 'var(--border-bright)',
    background: 'var(--accent-glow)',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
  },
};
