import React from 'react';
import { createRoot } from 'react-dom/client';

import { DevtoolsApp } from '@/components/features/dev-tools-app';
import '@assets/styles/globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('DevTools root element not found');
}

createRoot(container).render(
  <React.StrictMode>
    <DevtoolsApp />
  </React.StrictMode>,
);
