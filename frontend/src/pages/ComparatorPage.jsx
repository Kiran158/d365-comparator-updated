// frontend/src/pages/ComparatorPage.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  GitCompare,
  Download,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

import TemplateSidebar from '../components/TemplateSidebar';
import SourceEntityPicker from '../components/SourceEntityPicker';
import DestinationEntityPicker from '../components/DestinationEntityPicker';
import EntityList from '../components/EntityList';
import ComparisonTable from '../components/ComparisonTable';
import SummaryCards from '../components/SummaryCards';
import CredentialsUpload from '../components/CredentialsUpload';

import {
  fetchTemplates,
  fetchTemplateEntities,
  fetchLegalEntities,
  runComparison,
  exportComparison,
  checkCredentialsStatus,
  clearSessionId,
} from '../services/api';

export default function ComparatorPage() {
  // Data state
  const [templates, setTemplates] = useState([]);
  const [legalEntities, setLegalEntities] = useState([]);
  const [templateEntities, setTemplateEntities] = useState([]);

  // Credentials state
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  // Selection state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSourceEntity, setSelectedSourceEntity] = useState(null);
  const [selectedDestinationEntities, setSelectedDestinationEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);

  // UI state
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingLegalEntities, setLoadingLegalEntities] = useState(false);
  const [loadingTemplateEntities, setLoadingTemplateEntities] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);

  // Results
  const [comparisonSummary, setComparisonSummary] = useState(null);
  const [comparisonResults, setComparisonResults] = useState(null);

  // ── Check credentials on mount ─────────────────────────────────────────────
  useEffect(() => {
    checkCredentials();
  }, []);

  // ── Load data only after credentials are verified ──────────────────────────
  useEffect(() => {
    if (hasCustomCredentials && credentialsLoaded) {
      loadTemplates();
      loadLegalEntities();
    }
  }, [hasCustomCredentials, credentialsLoaded]);

  async function checkCredentials() {
    try {
      const sessionId = localStorage.getItem('d365-session-id');
      if (!sessionId) {
        setHasCustomCredentials(false);
        setCredentialsLoaded(true);
        return;
      }

      const data = await checkCredentialsStatus();
      if (data.hasCustomCredentials) {
        setHasCustomCredentials(true);
      } else {
        clearSessionId();
        setHasCustomCredentials(false);
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
      clearSessionId();
      setHasCustomCredentials(false);
    } finally {
      setCredentialsLoaded(true);
    }
  }

  async function loadTemplates() {
    setLoadingTemplates(true);
    try {
      const res = await fetchTemplates();
      setTemplates(res.data || []);
    } catch (e) {
      const errorMsg = e.message || 'Unknown error';
      console.error('Failed to load templates:', errorMsg);
      toast.error(`Failed to load templates: ${errorMsg}`, { duration: 5000 });
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadLegalEntities() {
    setLoadingLegalEntities(true);
    try {
      const res = await fetchLegalEntities();
      setLegalEntities(res.data || []);
    } catch (e) {
      const errorMsg = e.message || 'Unknown error';
      console.error('Failed to load legal entities:', errorMsg);
      toast.error(`Failed to load legal entities: ${errorMsg}`, { duration: 5000 });
    } finally {
      setLoadingLegalEntities(false);
    }
  }

  async function handleTemplateSelect(template) {
    setSelectedTemplate(template);
    setTemplateEntities([]);
    setSelectedEntities([]);
    setComparisonResults(null);
    setComparisonSummary(null);

    setLoadingTemplateEntities(true);
    try {
      const res = await fetchTemplateEntities(template.TemplateId);
      const entities = res.data || [];
      setTemplateEntities(entities);
      setSelectedEntities(entities.map((e) => e.Entity));
    } catch (e) {
      toast.error(`Failed to load entities: ${e.message}`);
    } finally {
      setLoadingTemplateEntities(false);
    }
  }

  async function handleRunComparison() {
    if (!selectedTemplate) return toast.error('Please select a template');
    if (!selectedSourceEntity) return toast.error('Please select a source legal entity');
    if (selectedDestinationEntities.length === 0)
      return toast.error('Please select at least one destination legal entity');
    if (selectedEntities.length === 0)
      return toast.error('Please select at least one entity to compare');

    setRunning(true);
    setComparisonResults(null);
    setComparisonSummary(null);
    setConfigOpen(false);

    try {
      const res = await runComparison({
        templateId: selectedTemplate.TemplateId,
        sourceEntity: selectedSourceEntity,
        destinationEntities: selectedDestinationEntities,
        entities: selectedEntities,
      });
      setComparisonSummary(res.summary);
      setComparisonResults(res.results);
      const missingCount = res.summary.missingInAllDestinations || 0;
      const coverageMsg = missingCount > 0 
        ? `Found ${missingCount} records from source missing in all destinations`
        : 'All source records found in destinations';
      toast.success(`Comparison complete — ${res.summary.entityCount} entities analysed · ${coverageMsg}`);
    } catch (e) {
      toast.error(`Comparison failed: ${e.message}`);
      setConfigOpen(true);
    } finally {
      setRunning(false);
    }
  }

  async function handleExport() {
    if (!comparisonResults) return;
    setExporting(true);
    try {
      await exportComparison({
        comparisonData: comparisonResults,
        sourceEntity: selectedSourceEntity,
        destinationEntities: selectedDestinationEntities,
        templateId: selectedTemplate?.TemplateId,
      });
      toast.success('Export downloaded');
    } catch (e) {
      toast.error(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  const canRun =
    selectedTemplate &&
    selectedSourceEntity &&
    selectedDestinationEntities.length > 0 &&
    selectedEntities.length > 0 &&
    !running;

  // Show blocking screen if credentials not loaded
  if (!credentialsLoaded) {
    return (
      <div style={styles.shell}>
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <div style={styles.logoMark}>
              <GitCompare size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={styles.appName}>D365 Entity Comparator</div>
              <div style={styles.appSub}>Finance & Operations · Data Management</div>
            </div>
          </div>
        </header>
        <div style={{ ...styles.body, justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" style={{ transform: 'scale(1.5)' }} />
        </div>
      </div>
    );
  }

  // Show credentials required screen if no custom credentials uploaded
  if (!hasCustomCredentials) {
    return (
      <div style={styles.shell}>
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <div style={styles.logoMark}>
              <GitCompare size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={styles.appName}>D365 Entity Comparator</div>
              <div style={styles.appSub}>Finance & Operations · Data Management</div>
            </div>
          </div>
        </header>
        <div style={{ ...styles.body, justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              textAlign: 'center',
              maxWidth: 500,
              padding: 40,
              background: 'var(--surface)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 20 }}>📋</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
              Upload Your D365 Credentials
            </h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30, fontSize: 14 }}>
              To get started, please upload your .env file containing D365 and Azure AD credentials.
              This is required before you can access templates and entities.
            </p>
            <div
              style={{
                background: 'var(--accent-glow)',
                border: '1px solid var(--accent-dim)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontWeight: 600 }}>
                ✓ Required fields in your .env file:
              </p>
              <ul
                style={{
                  textAlign: 'left',
                  fontSize: 13,
                  marginTop: 8,
                  paddingLeft: 20,
                  color: 'var(--text)',
                  margin: '8px 0 0 0',
                }}
              >
                <li>D365_BASE_URL</li>
                <li>AZURE_TENANT_ID</li>
                <li>AZURE_CLIENT_ID</li>
                <li>AZURE_CLIENT_SECRET</li>
                <li style={{ color: 'var(--text-dim)' }}>(Optional) D365_RESOURCE</li>
              </ul>
            </div>

            <CredentialsUpload
              onCredentialsUpdated={(sessionId) => {
                if (sessionId) {
                  // Credentials updated, component will reload via effect
                  checkCredentials();
                }
              }}
            />

            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                textAlign: 'left',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 12px 0', color: '#666' }}>
                💡 Troubleshooting
              </p>
              <div style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Getting a 401 error?</strong> Verify:
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li>Credentials are correct for your D365 instance</li>
                  <li>Azure AD app registration has correct permissions</li>
                  <li>D365_BASE_URL matches your instance URL</li>
                </ul>
                <p style={{ margin: '8px 0 0 0' }}>
                  <strong>File format issue?</strong> Ensure your .env file:
                </p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li>Is in plain text UTF-8 format</li>
                  <li>Has KEY=VALUE lines (no spaces around =)</li>
                  <li>Doesn't have comments inside credential values</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      {/* Top nav bar */}
      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <div style={styles.logoMark}>
            <GitCompare size={18} color="var(--accent)" />
          </div>
          <div>
            <div style={styles.appName}>D365 Entity Comparator</div>
            <div style={styles.appSub}>Finance & Operations · Data Management</div>
          </div>
        </div>
        <div style={styles.topBarRight}>
          {comparisonResults && (
            <button
              style={styles.btnSecondary}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <div className="spinner" /> : <Download size={14} />}
              Export Excel
            </button>
          )}
          <button
            style={{ ...styles.btnPrimary, ...(canRun ? {} : styles.btnDisabled) }}
            onClick={handleRunComparison}
            disabled={!canRun}
          >
            {running ? <div className="spinner" /> : <Play size={14} />}
            {running ? 'Running…' : 'Run Comparison'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={styles.body}>
        {/* Left: template sidebar */}
        <TemplateSidebar
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={handleTemplateSelect}
          loading={loadingTemplates}
        />

        {/* Main area */}
        <main style={styles.main}>
          {/* Credentials Upload */}
          <div style={{ padding: '12px 20px' }}>
            <CredentialsUpload
              onCredentialsUpdated={(sessionId) => {
                // Reload data when credentials are updated
                if (sessionId) {
                  loadTemplates();
                  loadLegalEntities();
                  toast.success('Credentials updated. Reloading data...');
                }
              }}
            />
          </div>

          {/* Config panel (collapsible) */}
          <div style={styles.configPanel}>
            <button
              style={styles.configToggle}
              onClick={() => setConfigOpen((o) => !o)}
            >
              <span style={styles.configToggleLabel}>
                {selectedTemplate ? (
                  <>
                    <span style={{ color: 'var(--accent)' }}>
                      {selectedTemplate.TemplateId}
                    </span>
                    {selectedSourceEntity && selectedDestinationEntities.length > 0 &&
                      ` · ${selectedSourceEntity} → ${selectedDestinationEntities.join(', ')}`}
                    {selectedEntities.length > 0 &&
                      ` · ${selectedEntities.length} entities`}
                  </>
                ) : (
                  'Configuration'
                )}
              </span>
              {configOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {configOpen && (
              <div style={styles.configBody} className="fade-in">
                {!selectedTemplate && (
                  <div style={styles.noTemplateBanner}>
                    <Info size={14} color="var(--accent)" />
                    <span>Select a template from the left sidebar to begin</span>
                  </div>
                )}

                <div style={styles.configGrid}>
                  <SourceEntityPicker
                    entities={legalEntities}
                    selected={selectedSourceEntity}
                    onChange={setSelectedSourceEntity}
                    loading={loadingLegalEntities}
                  />

                  <DestinationEntityPicker
                    entities={legalEntities}
                    selected={selectedDestinationEntities}
                    onChange={setSelectedDestinationEntities}
                    loading={loadingLegalEntities}
                    excludeEntity={selectedSourceEntity}
                  />

                  {selectedTemplate && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <EntityList
                        entities={templateEntities}
                        selectedEntities={selectedEntities}
                        onToggle={setSelectedEntities}
                        loading={loadingTemplateEntities}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results area */}
          {running && (
            <div style={styles.runningBanner}>
              <div className="spinner" />
              <span>
                Comparing <strong>{selectedSourceEntity}</strong> against{' '}
                <strong>{selectedDestinationEntities.join(', ')}</strong> for{' '}
                <strong>{selectedEntities.length}</strong> entities…
              </span>
            </div>
          )}

          {comparisonSummary && comparisonResults && !running && (
            <div className="fade-in">
              <SummaryCards summary={comparisonSummary} results={comparisonResults} />

              <div style={styles.resultsHeader}>
                <span style={styles.resultsTitle}>Entity Results</span>
                <button
                  style={styles.btnIcon}
                  onClick={handleRunComparison}
                  title="Re-run comparison"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              {Object.entries(comparisonResults).map(([entityName, result]) => (
                <ComparisonTable
                  key={entityName}
                  entityName={entityName}
                  result={result}
                  legalEntities={[selectedSourceEntity, ...selectedDestinationEntities]}
                />
              ))}
            </div>
          )}

          {!running && !comparisonResults && (
            <div style={styles.emptyState}>
              <GitCompare size={48} color="var(--border-bright)" strokeWidth={1.2} />
              <div style={styles.emptyTitle}>No comparison run yet</div>
              <div style={styles.emptyDesc}>
                Select a template, choose legal entities, and click{' '}
                <strong style={{ color: 'var(--accent)' }}>Run Comparison</strong>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  topBar: {
    height: 56,
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    gap: 16,
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 36,
    height: 36,
    background: 'var(--accent-glow)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontWeight: 700, fontSize: 14, color: 'var(--text)' },
  appSub: { fontSize: 11, color: 'var(--text-dim)' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '8px 16px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 7,
    padding: '8px 14px',
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  btnIcon: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    padding: '5px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  configPanel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  configToggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--surface-2)',
    border: 'none',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    borderBottom: '1px solid var(--border)',
  },
  configToggleLabel: { display: 'flex', alignItems: 'center', gap: 6 },
  configBody: { padding: 16 },
  configGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, gridAutoFlow: 'row' },
  noTemplateBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--accent-glow)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 7,
    padding: '10px 14px',
    color: 'var(--accent)',
    fontSize: 13,
    marginBottom: 14,
  },
  runningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--surface)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 10,
    padding: '14px 18px',
    color: 'var(--text-muted)',
    fontSize: 13,
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  resultsTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)', flex: 1 },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: '80px 0',
    color: 'var(--text-dim)',
  },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-muted)' },
  emptyDesc: { fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', maxWidth: 360, lineHeight: 1.7 },
};