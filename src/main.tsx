import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onOfflineReady: () => window.dispatchEvent(new Event('waypoint:offline-ready')),
      onRegisteredSW: () => {
        if (navigator.serviceWorker.controller) window.dispatchEvent(new Event('waypoint:offline-ready'));
      },
    });
  });
}
