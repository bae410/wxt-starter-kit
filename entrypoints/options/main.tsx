import React from 'react';
import { createRoot } from 'react-dom/client';

import { OptionsApp } from '@/components/features/options-app';
import '@assets/styles/globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Options root element not found');
}

createRoot(container).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
