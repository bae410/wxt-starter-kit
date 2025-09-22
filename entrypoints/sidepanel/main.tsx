import React from 'react';
import { createRoot } from 'react-dom/client';

import { SidePanelApp } from '@/components/features/side-panel-app';
import '@assets/styles/globals.css';

const container =
  document.getElementById('root') ?? document.body.appendChild(document.createElement('div'));
container.id = container.id || 'root';

createRoot(container).render(
  <React.StrictMode>
    <SidePanelApp />
  </React.StrictMode>,
);
