// frontend/src/components/EntityList.jsx
import React from 'react';
import { Layers, Tag } from 'lucide-react';

export default function EntityList({ entities, selectedEntities, onToggle, loading }) {
  const allSelected = entities?.length > 0 && selectedEntities.length === entities.length;

  const toggleAll = () => {
    if (allSelected) {
      onToggle([]);
    } else {
      onToggle(entities.map((e) => e.Entity));
    }
  };

  const toggle = (name) => {
    if (selectedEntities.includes(name)) {
      onToggle(selectedEntities.filter((n) => n !== name));
    } else {
      onToggle([...selectedEntities, name]);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <Layers size={14} color="var(--accent)" />
        <span style={styles.title}>Template Entities</span>
        {entities?.length > 0 && (
          <button style={styles.selectAll} onClick={toggleAll}>
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      <div style={styles.listWrap}>
        {loading ? (
          <div style={styles.center}><div className="spinner" /></div>
        ) : !entities?.length ? (
          <div style={styles.empty}>Select a template to see entities</div>
        ) : (
          entities.map((e) => {
            const isSelected = selectedEntities.includes(e.Entity);
            return (
              <label key={e.Entity} style={{ ...styles.row, ...(isSelected ? styles.rowActive : {}) }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(e.Entity)}
                  style={styles.checkbox}
                />
                <div style={styles.entityInfo}>
                  <div style={styles.entityName}>{e.Entity}</div>
                  <div style={styles.meta}>
                    <span style={styles.metaItem}>
                      <Tag size={9} /> {e.SysModule || '—'}
                    </span>
                    <span style={styles.metaItem}>Seq: {e.Sequence}</span>
                    {e.Tags && (
                      <span style={styles.tag}>{e.Tags}</span>
                    )}
                  </div>
                </div>
                <span style={styles.category}>{e.EntityCategory}</span>
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
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  title: { fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 },
  selectAll: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  listWrap: { maxHeight: 260, overflowY: 'auto' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.1s',
  },
  rowActive: { background: 'var(--accent-glow)' },
  checkbox: { accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 },
  entityInfo: { flex: 1, minWidth: 0 },
  entityName: { fontSize: 13, color: 'var(--text)', fontWeight: 500 },
  meta: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 11,
    color: 'var(--text-dim)',
  },
  tag: {
    fontSize: 10,
    background: 'var(--surface-3)',
    color: 'var(--text-muted)',
    borderRadius: 4,
    padding: '1px 6px',
  },
  category: {
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'var(--surface-3)',
    borderRadius: 4,
    padding: '2px 6px',
    whiteSpace: 'nowrap',
  },
  center: { display: 'flex', justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', color: 'var(--text-dim)', padding: 24, fontSize: 12 },
};