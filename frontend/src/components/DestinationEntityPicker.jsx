// frontend/src/components/DestinationEntityPicker.jsx
import React, { useState } from 'react';
import { Building2, X, Search } from 'lucide-react';

export default function DestinationEntityPicker({ 
  entities, 
  selected, 
  onChange, 
  loading,
  excludeEntity // The source entity to exclude
}) {
  const [filter, setFilter] = useState('');

  // Filter out the excluded entity and apply search filter
  const filtered = (entities || []).filter(
    (e) => {
      const isExcluded = excludeEntity && e.DataArea === excludeEntity;
      const matchesSearch = 
        e.DataArea?.toLowerCase().includes(filter.toLowerCase()) ||
        e.Name?.toLowerCase().includes(filter.toLowerCase());
      return !isExcluded && matchesSearch;
    }
  );

  const toggle = (dataArea) => {
    if (selected.includes(dataArea)) {
      onChange(selected.filter((id) => id !== dataArea));
    } else {
      onChange([...selected, dataArea]);
    }
  };

  const removeTag = (dataArea) => onChange(selected.filter((id) => id !== dataArea));

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <Building2 size={14} color="var(--accent)" />
        <span style={styles.title}>Destination Legal Entities</span>
        <span style={styles.hint}>(select 1 or more)</span>
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div style={styles.tags}>
          {selected.map((id) => {
            const entity = entities?.find((e) => e.DataArea === id);
            return (
              <span key={id} style={styles.tag}>
                <Building2 size={10} />
                {id}
                {entity?.Name && entity.Name !== id && (
                  <span style={{ color: 'var(--text-dim)', fontSize: 10 }}> · {entity.Name}</span>
                )}
                <button style={styles.tagRemove} onClick={() => removeTag(id)}>
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Info banner if source is selected */}
      {excludeEntity && (
        <div style={styles.infoBanner}>
          <span style={styles.infoText}>
            Source entity <strong>{excludeEntity}</strong> will be compared against selected destinations
          </span>
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
          <div style={styles.empty}>
            {excludeEntity ? 'All other entities already selected or no matches found' : 'No entities found'}
          </div>
        ) : (
          filtered.map((entity) => {
            const isSelected = selected.includes(entity.DataArea);
            return (
              <label key={entity.DataArea} style={styles.entityRow}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(entity.DataArea)}
                  style={styles.checkbox}
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
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  tag: {
    background: 'var(--accent-glow)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 'var(--radius-md)',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: 11,
    color: 'var(--accent)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  tagRemove: {
    background: 'transparent',
    border: 'none',
    padding: '0 2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--accent)',
    transition: 'opacity 0.2s',
  },
  infoBanner: {
    background: 'var(--border)',
    border: '1px solid var(--border-bright)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    marginBottom: '12px',
    fontSize: 11,
    color: 'var(--text-dim)',
  },
  infoText: {
    fontSize: 11,
    color: 'var(--text-dim)',
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
  checkbox: {
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
