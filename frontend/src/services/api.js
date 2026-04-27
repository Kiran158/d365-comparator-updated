// frontend/src/services/api.js
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

// ── Session helpers ───────────────────────────────────────────────────────────
export const getSessionId = () => localStorage.getItem('d365-session-id');
export const setSessionId = (id) => localStorage.setItem('d365-session-id', id);
export const clearSessionId = () => localStorage.removeItem('d365-session-id');

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Attach session ID to every request automatically
api.interceptors.request.use((config) => {
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }
  return config;
});

// Unified error handling
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Unknown error';

    // Session expired — clear it so user is prompted to re-enter credentials
    if (status === 401) {
      clearSessionId();
    }

    return Promise.reject(new Error(message));
  }
);

// ── Config / Credentials ──────────────────────────────────────────────────────
export const saveCredentials = (payload) =>
  api.post('/config/save-credentials', payload);

export const checkCredentialsStatus = () =>
  api.get('/config/credentials-status');

export const clearCredentials = () =>
  api.post('/config/clear-credentials');

// ── Templates ─────────────────────────────────────────────────────────────────
export const fetchTemplates = () => api.get('/templates');
export const fetchTemplateEntities = (templateId) =>
  api.get(`/templates/${encodeURIComponent(templateId)}/entities`);

// ── Legal Entities ────────────────────────────────────────────────────────────
export const fetchLegalEntities = () => api.get('/legal-entities');

// ── Comparison ────────────────────────────────────────────────────────────────
export const runComparison = (payload) => api.post('/comparison/run', payload);

export const exportComparison = async (payload) => {
  const sessionId = getSessionId();
  const response = await axios.post(`${BASE}/api/comparison/export`, payload, {
    responseType: 'blob',
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
    },
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  const templateId = payload.templateId || 'export';
  const date = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `D365_Comparison_${templateId}_${date}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;