// frontend/src/App.jsx
import React from 'react';
import { Toaster } from 'react-hot-toast';
import ComparatorPage from './pages/ComparatorPage';
import './index.css';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontSize: '13px',
            fontFamily: 'var(--font)',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--surface-2)' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface-2)' } },
        }}
      />
      <ComparatorPage />
    </>
  );
}
