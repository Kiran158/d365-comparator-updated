// frontend/src/components/TemplateSidebar.jsx
import React, { useState } from 'react';
import { Search, FileCode2, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

const statusIcon = (status) => {
  if (!status) return null;
  if (status.toLowerCase() === 'validated') return <CheckCircle2 size={12} color="var(--success)" />;
  return <Clock size={12} color="var(--text-muted)" />;
};

export default function TemplateSidebar({ templates, selectedTemplate, onSelect, loading }) {
  const [filter, setFilter] = useState('');

  const filtered = (templates || []).filter(
    (t) =>
      t.TemplateId?.toLowerCase().includes(filter.toLowerCase()) ||
      t.Description?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <div style={styles.sidebarTitle}>
          <FileCode2 size={16} color="var(--accent)" />
          <span>Templates</span>
        </div>
        <div style={styles.searchWrap}>
          <Search size={13} color="var(--text-dim)" style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Filter templates..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.listWrap}>
        {loading ? (
          <div style={styles.center}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>No templates found</div>
        ) : (
          filtered.map((t) => {
            const active = selectedTemplate?.TemplateId === t.TemplateId;
            return (
              <button
                key={t.TemplateId}
                style={{ ...styles.templateItem, ...(active ? styles.templateActive : {}) }}
                onClick={() => onSelect(t)}
              >
                <div style={styles.templateMain}>
                  <div style={styles.templateId}>{t.TemplateId}</div>
                  {t.Description && (
                    <div style={styles.templateDesc}>{t.Description}</div>
                  )}
                  <div style={styles.templateMeta}>
                    {statusIcon(t.Status)}
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {t.Status || 'Draft'}
                    </span>
                  </div>
                </div>
                {active && <ChevronRight size={14} color="var(--accent)" />}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 260,
    minWidth: 220,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '16px 12px 12px',
    borderBottom: '1px solid var(--border)',
  },
  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 13,
    marginBottom: 10,
    color: 'var(--text)',
  },
  searchWrap: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 9,
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 8px 6px 28px',
    color: 'var(--text)',
    fontSize: 12,
    outline: 'none',
  },
  listWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  templateItem: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    transition: 'background 0.15s',
    borderLeft: '3px solid transparent',
  },
  templateActive: {
    background: 'var(--accent-glow)',
    borderLeft: '3px solid var(--accent)',
  },
  templateMain: { flex: 1, minWidth: 0 },
  templateId: {
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  templateDesc: {
    fontSize: 11,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  templateMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 40,
  },
  empty: {
    textAlign: 'center',
    color: 'var(--text-dim)',
    paddingTop: 40,
    fontSize: 12,
  },
};