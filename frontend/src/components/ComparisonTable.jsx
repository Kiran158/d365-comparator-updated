// frontend/src/components/ComparisonTable.jsx
import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, AlertCircle, Copy, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  present_all: { label: 'In All Destinations', cls: 'badge-matched' },
  missing_some: { label: 'Missing in Some', cls: 'badge-partial' },
  missing_all: { label: 'Missing in All', cls: 'badge-missing' },
};

export default function ComparisonTable({ entityName, result, legalEntities }) {
  // Filter & View State
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedLegalEntity, setSelectedLegalEntity] = useState(null);
  
  // Edit & Selection State
  const [editableMode, setEditableMode] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState(new Set());
  const [editingData, setEditingData] = useState({});
  
  // Modal & Feedback State
  const [createModal, setCreateModal] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [bulkCopyMode, setBulkCopyMode] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [showRecordSelector, setShowRecordSelector] = useState(false);

  const rows = result?.comparison?.rows || [];

  // Apply filters: status filter + missing-only toggle
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    
    // Apply missing-only filter
    if (showMissingOnly) {
      filtered = filtered.filter((r) => r.status === 'missing_some' || r.status === 'missing_all');
    }
    
    return filtered;
  }, [rows, statusFilter, showMissingOnly]);

  // Collect all field names from first available source record
  const fields = useMemo(() => {
    for (const row of rows) {
      const rec = row.sourceRecord;
      if (rec) {
        return Object.keys(rec).filter(
          (f) => !['@odata.etag', 'dataAreaId'].includes(f)
        );
      }
    }
    return [];
  }, [rows]);

  const statusCounts = useMemo(() => {
    const counts = { present_all: 0, missing_some: 0, missing_all: 0 };
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

  // Collect all field names from first available source record
  const sourceFields = useMemo(() => {
    for (const row of rows) {
      const rec = row.sourceRecord;
      if (rec) {
        return Object.keys(rec).filter(
          (f) => !['@odata.etag', 'dataAreaId'].includes(f)
        );
      }
    }
    return [];
  }, [rows]);

  // Get records with missing destinations (for selection)
  const recordsWithMissing = useMemo(() => {
    return filteredRows.filter((row) => 
      row.status === 'missing_some' || row.status === 'missing_all'
    );
  }, [filteredRows]);

  // Get possible destinations for selected records
  const possibleDestinations = useMemo(() => {
    const destinations = new Set();
    selectedRecords.forEach((idx) => {
      const row = filteredRows[idx];
      if (row.missingInDestinations) {
        row.missingInDestinations.forEach(le => destinations.add(le));
      }
    });
    return Array.from(destinations).sort();
  }, [selectedRecords, filteredRows]);

  // Toggle record selection
  const toggleRecordSelection = (rowIndex) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRecords(newSelected);
  };

  // Select all missing records in current view
  const toggleSelectAll = () => {
    if (selectedRecords.size === recordsWithMissing.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(recordsWithMissing.map((_, idx) => idx)));
    }
  };

  // Toggle destination selection for copy
  const toggleDestinationSelection = (destination) => {
    const newSelected = new Set(selectedDestinations);
    if (newSelected.has(destination)) {
      newSelected.delete(destination);
    } else {
      newSelected.add(destination);
    }
    setSelectedDestinations(newSelected);
  };

  // Open create modal for a record and destination
  const openCreateModal = (rowIndex, destination) => {
    const row = filteredRows[rowIndex];
    const initialData = { ...row.sourceRecord };
    setEditingData(prev => ({ ...prev, [rowIndex]: initialData }));
    setCreateModal({ rowIndex, destination, recordKey: row.key });
  };

  // Open record selector panel
  const openRecordSelector = () => {
    setShowRecordSelector(!showRecordSelector);
  };

  // Handle field value change
  const handleFieldChange = (field, value, rowIndex = null) => {
    if (rowIndex !== null && editableMode) {
      // Edit in table mode
      setEditingData(prev => ({
        ...prev,
        [rowIndex]: { ...prev[rowIndex], [field]: value }
      }));
    } else if (createModal) {
      // Edit in modal mode
      setEditingData(prev => ({
        ...prev,
        [createModal.rowIndex]: { ...prev[createModal.rowIndex], [field]: value }
      }));
    }
  };

  // Copy selected records to selected destinations - Opens bulk copy interface
  const handleBulkCopy = () => {
    if (selectedRecords.size === 0 || selectedDestinations.size === 0) {
      toast.error('Please select records and destinations');
      return;
    }

    // Initialize bulk edit data with source record data
    const initialBulkData = {};
    Array.from(selectedRecords).forEach((idx) => {
      const row = filteredRows[idx];
      initialBulkData[`${row.key}_source`] = { ...row.sourceRecord };
      Array.from(selectedDestinations).forEach((dest) => {
        initialBulkData[`${row.key}_${dest}`] = { ...row.sourceRecord };
      });
    });
    
    setBulkEditData(initialBulkData);
    setBulkCopyMode(true);
  };

  // Update field in bulk copy mode
  const handleBulkFieldChange = (recordKey, destination, field, value) => {
    const key = destination === 'source' ? `${recordKey}_source` : `${recordKey}_${destination}`;
    setBulkEditData(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  // Create record for a specific destination
  const handleCreateRecordBulk = async (recordKey, destination) => {
    setIsCopying(true);
    try {
      const row = Array.from(selectedRecords)
        .map(idx => filteredRows[idx])
        .find(r => r.key === recordKey);
      
      if (!row) {
        toast.error('Record not found');
        return;
      }

      const recordData = bulkEditData[`${recordKey}_${destination}`] || row.sourceRecord;

      const response = await fetch('/api/comparison/copy-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('d365-session-id'),
        },
        body: JSON.stringify({
          entity: entityName,
          sourceEntity: legalEntities[0],
          destinations: [destination],
          records: [{
            key: recordKey,
            data: recordData,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Record "${recordKey}" created in ${destination}`);
      } else {
        toast.error(result.error || 'Failed to create record');
      }
    } catch (error) {
      console.error('Error creating record:', error);
      toast.error(`Failed to create record: ${error.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  // Create record in destination
  const handleCreateRecord = async () => {
    if (!createModal) return;
    
    setIsCopying(true);
    try {
      const row = filteredRows[createModal.rowIndex];
      const recordData = editingData[createModal.rowIndex] || row.sourceRecord;

      const response = await fetch('/api/comparison/copy-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': localStorage.getItem('d365-session-id'),
        },
        body: JSON.stringify({
          entity: entityName,
          sourceEntity: legalEntities[0],
          destinations: [createModal.destination],
          records: [{
            key: row.key,
            data: recordData,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Record created in ${createModal.destination}`);
        setCreateModal(null);
        setEditingData(prev => {
          const updated = { ...prev };
          delete updated[createModal.rowIndex];
          return updated;
        });
      } else {
        toast.error(result.error || 'Failed to create record');
      }
    } catch (error) {
      console.error('Error creating record:', error);
      toast.error(`Failed to create record: ${error.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  if (!result) return null;

  // Calculate coverage: how many source records are found in at least some destination
  const totalSourceRecords = result.comparison?.summary?.totalSourceRecords || 0;
  const missingInAll = result.comparison?.summary?.missingInAllDestinations || 0;
  const coveragePercent =
    totalSourceRecords > 0
      ? Math.round(((totalSourceRecords - missingInAll) / totalSourceRecords) * 100)
      : 100;

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
          <span style={styles.scoreNum}>{coveragePercent}%</span>
          <span style={styles.scoreLabel}>coverage</span>
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



      {/* Bulk actions bar - show when there are records with missing destinations */}
      {recordsWithMissing.length > 0 && (
        <div style={styles.actionsBar}>
          {selectedRecords.size > 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
              {/* Destination Selection */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                  Copy to:
                </span>
                {possibleDestinations.map((dest) => (
                  <label key={dest} style={styles.destCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedDestinations.has(dest)}
                      onChange={() => toggleDestinationSelection(dest)}
                      style={styles.checkbox}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text)' }}>{dest}</span>
                  </label>
                ))}
              </div>
              
              {/* Copy Button */}
              {selectedDestinations.size > 0 && (
                <button
                  style={{
                    ...styles.btnCreateRecords,
                    ...(isCopying ? { opacity: 0.6 } : {}),
                  }}
                  onClick={handleBulkCopy}
                  disabled={isCopying}
                >
                  {isCopying ? <div className="spinner" /> : <Copy size={13} />}
                  {isCopying ? 'Copying...' : 'Copy Records'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Copy Feedback Banner */}
      {copyFeedback && (
        <div style={{
          ...styles.feedbackBanner,
          ...(copyFeedback.success ? styles.feedbackSuccess : styles.feedbackError),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {copyFeedback.success ? <Check size={16} /> : <AlertCircle size={16} />}
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {copyFeedback.success 
                  ? `✓ Successfully copied ${copyFeedback.successCount} record${copyFeedback.successCount !== 1 ? 's' : ''}`
                  : `✗ Copy failed: ${copyFeedback.error || 'Unknown error'}`}
              </div>
              {copyFeedback.failedCount > 0 && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {copyFeedback.failedCount} record{copyFeedback.failedCount !== 1 ? 's' : ''} failed
                  {copyFeedback.failures && copyFeedback.failures.length > 0 && (
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 10 }}>Show failures</summary>
                      <ul style={{ margin: '6px 0 0 0', paddingLeft: 16, fontSize: 10 }}>
                        {copyFeedback.failures.map((f, i) => (
                          <li key={i}>{f.key}: {f.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 16,
              padding: 0,
            }}
            onClick={() => setCopyFeedback(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Bulk Copy Interface */}
      {bulkCopyMode && (
        <div style={styles.bulkCopySection}>
          <div style={styles.bulkCopyHeader}>
            <h3 style={styles.bulkCopyTitle}>Copy Records to Multiple Destinations</h3>
            <button
              style={styles.bulkCopyCloseBtn}
              onClick={() => setBulkCopyMode(false)}
              title="Close bulk copy"
            >
              <X size={18} />
            </button>
          </div>

          <div style={styles.bulkCopyContainer}>
            {/* Source Column */}
            <div style={styles.bulkCopyColumn}>
              <div style={styles.bulkCopyColumnHeader}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {legalEntities[0]} (Source)
                </span>
              </div>
              <div style={styles.bulkCopyColumnContent}>
                {Array.from(selectedRecords).map((idx) => {
                  const row = filteredRows[idx];
                  return (
                    <div key={`source-${row.key}`} style={styles.bulkCopyRecord}>
                      <div style={styles.bulkCopyRecordHeader}>
                        <span style={styles.bulkCopyRecordKey}>{row.key}</span>
                      </div>
                      <div style={styles.bulkCopyRecordFields}>
                        {sourceFields.map((field) => (
                          <div key={field} style={styles.bulkFieldRow}>
                            <span style={styles.bulkFieldLabel}>{field}</span>
                            <span style={styles.bulkFieldValue}>
                              {String(row.sourceRecord[field] ?? '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Destination Columns */}
            {Array.from(selectedDestinations).map((destination) => (
              <div key={`dest-${destination}`} style={styles.bulkCopyColumn}>
                <div style={styles.bulkCopyColumnHeader}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {destination} (Destination)
                  </span>
                </div>
                <div style={styles.bulkCopyColumnContent}>
                  {Array.from(selectedRecords).map((idx) => {
                    const row = filteredRows[idx];
                    return (
                      <div key={`${destination}-${row.key}`} style={styles.bulkCopyRecord}>
                        <div style={styles.bulkCopyRecordHeader}>
                          <span style={styles.bulkCopyRecordKey}>{row.key}</span>
                        </div>
                        <div style={styles.bulkCopyRecordFields}>
                          {sourceFields.map((field) => (
                            <div key={field} style={styles.bulkFieldRow}>
                              <span style={styles.bulkFieldLabel}>{field}</span>
                              <input
                                type="text"
                                value={bulkEditData[`${row.key}_${destination}`]?.[field] ?? ''}
                                onChange={(e) => handleBulkFieldChange(row.key, destination, field, e.target.value)}
                                style={styles.bulkFieldInput}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          style={{
                            ...styles.bulkCreateBtn,
                            ...(isCopying ? { opacity: 0.6 } : {}),
                          }}
                          onClick={() => handleCreateRecordBulk(row.key, destination)}
                          disabled={isCopying}
                        >
                          {isCopying ? <div className="spinner" /> : <Copy size={12} />}
                          Create
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                const isSelected = selectedRecords.has(idx);
                const isMissing = row.status === 'missing_some' || row.status === 'missing_all';
                return (
                  <React.Fragment key={idx}>
                    <tr
                      style={{
                        ...styles.tr,
                        ...(row.status === 'missing_some' ? styles.trPartial : {}),
                        ...(row.status === 'missing_all' ? styles.trPartial : {}),
                        ...(isSelected ? styles.trSelected : {}),
                      }}
                    >
                      <td style={styles.td}>
                        <span className={`badge ${STATUS_LABELS[row.status].cls}`}>
                          {STATUS_LABELS[row.status].label}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...styles.keyCell }}>{row.key}</td>
                      {legalEntities.map((le, leIdx) => {
                        const isSource = leIdx === 0;
                        if (isSource) {
                          // Source column - always shows ✓
                          return (
                            <td key={le} style={styles.td}>
                              <span style={styles.presentDot}>✓</span>
                            </td>
                          );
                        }
                        // Destination columns - show if found or missing
                        const isFound = row.foundInDestinations?.includes(le);
                        return (
                          <td key={le} style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isFound ? (
                                <span style={styles.presentDot}>✓</span>
                              ) : (
                                <span style={styles.missingDot}>✗</span>
                              )}
                              {!isFound && isMissing && (
                                <button
                                  style={styles.copyBtn}
                                  onClick={() => openCreateModal(idx, le)}
                                  title={`Create in ${le}`}
                                >
                                  ⧉
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td style={styles.td}>
                        {Object.keys(row.fieldDiffs || {}).length > 0 ? (
                          <span style={styles.diffCount}>
                            {Object.keys(row.fieldDiffs).length} field{Object.keys(row.fieldDiffs).length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {(Object.keys(row.fieldDiffs || {}).length > 0 || row.status !== 'present_all') && (
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
                            {row.missingInDestinations && row.missingInDestinations.length > 0 && (
                              <div style={styles.diffSection}>
                                <div style={styles.diffSectionTitle}>Missing in destinations</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {row.missingInDestinations.map((le) => (
                                    <span key={le} className="badge badge-missing">{le}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {Object.keys(row.fieldDiffs || {}).length > 0 && (
                              <div style={styles.diffSection}>
                                <div style={styles.diffSectionTitle}>Field differences in destinations</div>
                                <table style={styles.diffTable}>
                                  <thead>
                                    <tr>
                                      <th style={styles.diffTh}>Field</th>
                                      <th style={styles.diffTh}>{legalEntities[0]} (Source)</th>
                                      {legalEntities.slice(1).map((le) => (
                                        <th key={le} style={styles.diffTh}>{le}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(row.fieldDiffs || {}).map(([field, vals]) => (
                                      <tr key={field}>
                                        <td style={{ ...styles.diffTd, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                                          {field}
                                        </td>
                                        <td style={styles.diffTd}>
                                          {String(row.sourceRecord?.[field] ?? '—')}
                                        </td>
                                        {legalEntities.slice(1).map((le) => (
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
                  {sourceFields.map((field) => (
                    <th key={field} style={styles.detailTh}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const isSource = selectedLegalEntity === legalEntities[0];
                  const displayRows = isSource
                    ? rows
                    : rows.filter((row) => row.foundInDestinations?.includes(selectedLegalEntity));
                  
                  if (displayRows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={sourceFields.length + 1} style={styles.detailEmpty}>
                          No records found for {selectedLegalEntity}
                        </td>
                      </tr>
                    );
                  }

                  return displayRows.map((row, idx) => {
                    let record;
                    if (isSource) {
                      record = row.sourceRecord;
                    } else {
                      record = row.records?.[selectedLegalEntity] || {};
                    }

                    return (
                      <tr key={idx} style={styles.detailTr}>
                        <td style={{ ...styles.detailTd, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {row.key}
                        </td>
                        {sourceFields.map((field) => (
                          <td key={field} style={styles.detailTd}>
                            {String(record?.[field] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Record Modal */}
      {createModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Create Record in {createModal.destination}
              </h3>
              <button
                style={styles.modalCloseBtn}
                onClick={() => {
                  setCreateModal(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalInfo}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>
                  <strong>Entity:</strong> {entityName}
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                  <strong>Record Key:</strong> {createModal.recordKey}
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                  <strong>Destination:</strong> {createModal.destination}
                </p>
              </div>

              <div style={styles.modalFormSection}>
                <label style={styles.formLabel}>Edit field values before creating:</label>
                <div style={styles.formFields}>
                  {sourceFields.map((field) => (
                    <div key={field} style={styles.formGroup}>
                      <label style={styles.fieldLabel}>{field}</label>
                      <input
                        type="text"
                        value={editingData[createModal.rowIndex]?.[field] ?? ''}
                        onChange={(e) => handleFieldChange(field, e.target.value, createModal.rowIndex)}
                        style={styles.formInput}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnCancel}
                onClick={() => {
                  setCreateModal(null);
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.btnCreate,
                  ...(isCopying ? { opacity: 0.6 } : {}),
                }}
                onClick={handleCreateRecord}
                disabled={isCopying}
              >
                {isCopying ? <div className="spinner" /> : <Copy size={13} />}
                {isCopying ? 'Creating...' : 'Create Record'}
              </button>
            </div>
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
  actionsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    borderTop: '1px solid var(--border)',
    gap: 12,
    flexWrap: 'wrap',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: 'var(--accent)',
    verticalAlign: 'middle',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
  },
  btnCreateRecords: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
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
  thCheckbox: {
    textAlign: 'center',
    padding: '8px 8px',
    background: 'var(--surface-3)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 11,
    borderBottom: '1px solid var(--border)',
    width: 40,
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  trDiff: { background: 'rgba(251,191,36,0.04)' },
  trPartial: { background: 'rgba(248,113,113,0.04)' },
  trSelected: { background: 'rgba(59, 130, 246, 0.08)' },
  td: { padding: '8px 12px', color: 'var(--text)', verticalAlign: 'middle' },
  tdCheckbox: {
    padding: '8px',
    textAlign: 'center',
    color: 'var(--text)',
    verticalAlign: 'middle',
    width: 40,
  },
  keyCell: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  presentDot: { color: 'var(--success)', fontSize: 13 },
  missingDot: { color: 'var(--danger)', fontSize: 13 },
  copyBtn: {
    background: 'var(--accent-glow)',
    border: '1px solid var(--accent-dim)',
    color: 'var(--accent)',
    borderRadius: 4,
    padding: '2px 4px',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
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
  detailEmpty: { padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    maxWidth: 600,
    width: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  modalTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  modalBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalInfo: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
  },
  modalFormSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 4,
  },
  formFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    maxHeight: '40vh',
    overflowY: 'auto',
    paddingRight: 8,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-dim)',
  },
  formInput: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  modalFooter: {
    display: 'flex',
    gap: 10,
    padding: '16px 20px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface-2)',
    justifyContent: 'flex-end',
  },
  btnCancel: {
    background: 'var(--surface-3)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnCreate: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  // New styles for enhanced features
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: 12,
    color: 'var(--text)',
    fontWeight: 500,
  },
  destCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none',
    padding: '4px 8px',
    borderRadius: 4,
    background: 'var(--surface-3)',
    border: '1px solid var(--border)',
    transition: 'border-color 0.15s',
  },
  feedbackBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
  },
  feedbackSuccess: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: 'var(--success)',
  },
  feedbackError: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
  },
  // Bulk copy styles
  bulkCopySection: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  bulkCopyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
  },
  bulkCopyTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
  },
  bulkCopyCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  bulkCopyContainer: {
    display: 'flex',
    gap: 0,
    overflowX: 'auto',
    minHeight: 400,
    background: 'var(--surface)',
  },
  bulkCopyColumn: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
    minWidth: 300,
    flex: '0 0 auto',
  },
  bulkCopyColumnHeader: {
    padding: '12px 16px',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: 13,
  },
  bulkCopyColumnContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bulkCopyRecord: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  bulkCopyRecordHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bulkCopyRecordKey: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--accent)',
    fontFamily: 'var(--mono)',
  },
  bulkCopyRecordFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  bulkFieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  bulkFieldLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  bulkFieldValue: {
    fontSize: 11,
    color: 'var(--text)',
    wordBreak: 'break-word',
  },
  bulkFieldInput: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '6px 8px',
    fontSize: 11,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  bulkCreateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'opacity 0.15s',
  },
  // Record Selector Styles
  recordSelectorToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  },
  recordSelectorPanel: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: 280,
    maxWidth: 320,
    maxHeight: 400,
    display: 'flex',
    flexDirection: 'column',
  },
  recordSelectorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  recordSelectorClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  recordSelectorContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  recordSelectorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    ':hover': {
      background: 'var(--surface-2)',
    },
  },
  recordSelectorConfirm: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 0,
    borderTop: '1px solid var(--border)',
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};


