import { lazy, Suspense, useEffect, useState } from 'react';
import { Organizer } from './components/Organizer';
import { PrintView } from './components/PrintView';
import { Visitor } from './components/Visitor';

const OpticalSender = lazy(() => import('./components/OpticalSender'));

type Mode = 'organizer' | 'visitor';
function route(): string { return location.hash.replace(/^#\/?/, '') || 'visitor'; }
const closeLegacyScanner = () => { location.hash = '/visitor'; };

export default function App() {
  const [page, setPage] = useState(route());
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => { const listener = () => setPage(route()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    const ready = () => setOfflineReady(true);
    window.addEventListener('waypoint:offline-ready', ready);
    if (navigator.serviceWorker?.controller) setOfflineReady(true);
    return () => window.removeEventListener('waypoint:offline-ready', ready);
  }, []);
  if (page === 'print') return <PrintView />;
  if (page === 'transfer/send') return <Suspense fallback={<main className="route-loading">Loading optical sender…</main>}><OpticalSender /></Suspense>;
  const mode: Mode = page === 'visitor' || page === 'transfer/receive' ? 'visitor' : 'organizer';
  return <div className="app-shell"><header className="app-header"><a className="brand" href="#/visitor" aria-label="DC34 NAV home"><img className="brand-icon" src="./brand/icon.svg" alt="" /><div><strong>DC34 NAV</strong><small>DEF CON 34 · LVCC</small></div></a><nav aria-label="Application modes"><a className={mode === 'organizer' ? 'active' : ''} href="#/organizer">Organizer</a><a className={mode === 'visitor' ? 'active' : ''} href="#/visitor">Visitor</a></nav><details className={`offline-badge ${offlineReady ? 'ready' : ''}`}><summary><span/> {offlineReady ? 'Offline-ready' : 'Preparing offline'}</summary><div className="readiness-panel"><strong>{offlineReady ? 'All transfer assets cached' : 'Waiting for service worker'}</strong>{['Navigation shell', 'Location QR sender', 'Location + checkpoint QR scanner', 'ZXing decoder + WASM'].map((item) => <p key={item}>{offlineReady ? '✓' : '○'} {item}</p>)}<small>Camera scanning requires HTTPS (localhost is allowed for development).</small></div></details></header>{mode === 'organizer' ? <Organizer /> : <Visitor initialScannerIntent={page === 'transfer/receive' ? 'location' : undefined} onLegacyScannerClose={page === 'transfer/receive' ? closeLegacyScanner : undefined} />}</div>;
}
