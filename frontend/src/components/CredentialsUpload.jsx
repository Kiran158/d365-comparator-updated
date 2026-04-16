// frontend/src/components/CredentialsUpload.jsx
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function CredentialsUpload({ onCredentialsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    tenantId: '',
    clientSecret: '',
    baseUrl: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value.trim(),
    }));
    setLastError(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate required fields
    if (!formData.clientId || !formData.tenantId || !formData.clientSecret || !formData.baseUrl) {
      const msg = 'All fields are required';
      setLastError(msg);
      toast.error(msg);
      return;
    }

    // Validate URL format
    try {
      new URL(formData.baseUrl);
    } catch {
      const msg = 'Invalid Base URL format';
      setLastError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      console.log('[CredentialsUpload] Submitting credentials');

      const response = await fetch('/api/config/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          AZURE_CLIENT_ID: formData.clientId,
          AZURE_TENANT_ID: formData.tenantId,
          AZURE_CLIENT_SECRET: formData.clientSecret,
          D365_BASE_URL: formData.baseUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newSessionId = data.sessionId;
        localStorage.setItem('d365-session-id', newSessionId);

        console.log('[CredentialsUpload] Save successful. SessionId:', newSessionId);

        toast.success('✓ Credentials saved successfully!');
        setLastError(null);
        setFormData({
          clientId: '',
          tenantId: '',
          clientSecret: '',
          baseUrl: '',
        });

        // Notify parent component
        if (onCredentialsUpdated) {
          onCredentialsUpdated(newSessionId);
        }
      } else {
        const errorMsg = data.error || 'Failed to save credentials';
        console.error('[CredentialsUpload] Save failed:', errorMsg);
        setLastError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('[CredentialsUpload] Error:', error);
      const errorMsg = error.message || 'Failed to save credentials';
      setLastError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
          <Lock size={24} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Azure Credentials</h2>
        </div>

        {lastError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {lastError}
          </div>
        )}

        <div>
          <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            id="clientId"
            name="clientId"
            value={formData.clientId}
            onChange={handleInputChange}
            placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
            Tenant ID
          </label>
          <input
            type="text"
            id="tenantId"
            name="tenantId"
            value={formData.tenantId}
            onChange={handleInputChange}
            placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              id="clientSecret"
              name="clientSecret"
              value={formData.clientSecret}
              onChange={handleInputChange}
              placeholder="Enter your client secret"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Base URL
          </label>
          <input
            type="url"
            id="baseUrl"
            name="baseUrl"
            value={formData.baseUrl}
            onChange={handleInputChange}
            placeholder="e.g., https://yourorg.crm.dynamics.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {loading ? 'Saving...' : 'Save Credentials'}
        </button>
      </form>
    </>
  );
}
