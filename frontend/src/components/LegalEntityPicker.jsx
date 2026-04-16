// frontend/src/components/LegalEntityPicker.jsx
import React, { useState } from 'react';
import { Building2, X, Search } from 'lucide-react';

export default function LegalEntityPicker({ entities, selected, onChange, loading }) {
  const [filter, setFilter] = useState('');

  const filtered = (entities || []).filter(
    (e) =>
      e.DataArea?.toLowerCase().includes(filter.toLowerCase()) ||
      e.Name?.toLowerCase().includes(filter.toLowerCase())
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
        <span style={styles.title}>Legal Entities</span>
        <span style={styles.hint}>(select 2 or more)</span>
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
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontWeight: 600, fontSize: 13, color: 'var(--text)' },
  hint: { fontSize: 11, color: 'var(--text-dim)', marginLeft: 2 },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    borderRadius: 999,
    padding: '3px 8px 3px 7px',
    fontSize: 12,
    fontWeight: 500,
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    marginLeft: 2,
    opacity: 0.7,
  },
  searchWrap: { position: 'relative' },
  searchIcon: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 8px 6px 26px',
    color: 'var(--text)',
    fontSize: 12,
    outline: 'none',
  },
  listWrap: {
    maxHeight: 200,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  entityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  checkbox: { accentColor: 'var(--accent)', cursor: 'pointer' },
  entityCode: { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', fontWeight: 500 },
  entityName: { fontSize: 12, color: 'var(--text-muted)', flex: 1 },
  entityCountry: { fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 4 },
  center: { display: 'flex', justifyContent: 'center', padding: 20 },
  empty: { textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, padding: 16 },
};