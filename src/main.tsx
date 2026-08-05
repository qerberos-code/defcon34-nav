import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// In the native (Capacitor) shell the assets ship inside the app bundle; a service
// worker only serves stale caches there, so skip registration and drop any old one.
const isNativeShell = Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
if (isNativeShell) {
  // Native shell: keep the WebView below the status bar (iOS 26 reports zero
  // safe-area insets to CSS, so this must happen at the native layer).
  void import('@capacitor/status-bar').then(({ StatusBar, Style }) => Promise.all([StatusBar.setOverlaysWebView({ overlay: false }), StatusBar.setStyle({ style: Style.Dark })])).catch(() => undefined);
  if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))).then((unregistered) => { if (unregistered.some(Boolean)) location.reload(); });
  window.dispatchEvent(new Event('waypoint:offline-ready'));
}

if (!isNativeShell && import.meta.env.PROD && 'serviceWorker' in navigator) {
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
