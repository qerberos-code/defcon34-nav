import { lazy, Suspense, useEffect, useState } from 'react';
import { Organizer } from './components/Organizer';
import { PrintView } from './components/PrintView';
import { Visitor } from './components/Visitor';

const OpticalSender = lazy(() => import('./components/OpticalSender'));
const OpticalReceiver = lazy(() => import('./components/OpticalReceiver'));

type Mode = 'organizer' | 'visitor';
function route(): string { return location.hash.replace(/^#\/?/, '') || 'organizer'; }

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
  if (page === 'transfer/receive') return <Suspense fallback={<main className="route-loading">Loading camera decoder…</main>}><OpticalReceiver /></Suspense>;
  const mode: Mode = page === 'visitor' ? 'visitor' : 'organizer';
  return <div className="app-shell"><header className="app-header"><a className="brand" href="#/organizer" aria-label="Waypoint home"><span>W</span><div><strong>WAYPOINT</strong><small>Offline event navigation</small></div></a><nav aria-label="Application modes"><a className={mode === 'organizer' ? 'active' : ''} href="#/organizer">Organizer</a><a className={mode === 'visitor' ? 'active' : ''} href="#/visitor">Visitor</a></nav><details className={`offline-badge ${offlineReady ? 'ready' : ''}`}><summary><span/> {offlineReady ? 'Offline-ready' : 'Preparing offline'}</summary><div className="readiness-panel"><strong>{offlineReady ? 'All transfer assets cached' : 'Waiting for service worker'}</strong>{['Navigation shell', 'Optical sender', 'Optical receiver', 'ZXing decoder + WASM'].map((item) => <p key={item}>{offlineReady ? '✓' : '○'} {item}</p>)}<small>Camera reception requires HTTPS (localhost is allowed for development).</small></div></details></header>{mode === 'organizer' ? <Organizer /> : <Visitor />}</div>;
}
