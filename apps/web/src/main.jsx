import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import './index.css';

// Unregister zombie Service Workers from previous applications running on port 3000 (such as Open WebUI)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Clean up stale /error route from browser URL history if present
if (typeof window !== 'undefined' && (window.location.pathname === '/error' || window.location.pathname.startsWith('/error'))) {
  window.history.replaceState({}, document.title, '/');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
