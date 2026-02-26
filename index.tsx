import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SettingsProvider } from './context/SettingsContext';
import { StudentProvider } from './context/StudentContext';
import { IncidentProvider } from './context/IncidentContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <StudentProvider>
        <IncidentProvider>
          <App />
        </IncidentProvider>
      </StudentProvider>
    </SettingsProvider>
  </React.StrictMode>
);