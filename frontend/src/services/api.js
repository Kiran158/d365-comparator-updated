// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Interceptors ──────────────────────────────────────────────────────────────
// Add session ID to requests
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('d365-session-id');
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

// ── Templates ─────────────────────────────────────────────────────────────────
export const fetchTemplates = () => api.get('/templates');
export const fetchTemplateEntities = (templateId) => api.get(`/templates/${encodeURIComponent(templateId)}/entities`);

// ── Legal Entities ────────────────────────────────────────────────────────────
export const fetchLegalEntities = () => api.get('/legal-entities');

// ── Comparison ────────────────────────────────────────────────────────────────
export const runComparison = (payload) => api.post('/comparison/run', payload);

export const exportComparison = async (payload) => {
  const sessionId = localStorage.getItem('d365-session-id');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  const response = await axios.post('/api/comparison/export', payload, {
    responseType: 'blob',
    headers,
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
