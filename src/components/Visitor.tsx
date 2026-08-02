import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDemoPack } from '../demo';
import { parseNavPack } from '../lib/navpack';
import { parseQrPayload } from '../lib/qr';
import { shortestRoute } from '../lib/routing';
import { loadVisitor, saveVisitor, type VisitorState } from '../lib/storage';
import { MapCanvas } from './MapCanvas';
import { Scanner } from './Scanner';

export function Visitor() {
  const [state, setState] = useState<VisitorState | null | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    let current = true;
    void loadVisitor().then((saved) => { if (current) setState(saved); }).catch((error: unknown) => { if (current) { setState(null); setMessage(error instanceof Error ? error.message : 'Offline storage is unavailable.'); } });
    return () => { current = false; };
  }, []);
  const update = (next: VisitorState) => { setState(next); void saveVisitor(next).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Your navigation state could not be saved offline.')); };
  const checkpoint = state?.pack.checkpoints.find((item) => item.id === state.checkpointId);
  const destination = state?.pack.destinations.find((item) => item.id === state.destinationId);
  const route = useMemo(() => state && checkpoint && destination ? shortestRoute(state.pack, checkpoint.routeNodeId, destination.routeNodeId) : undefined, [state, checkpoint, destination]);
  const importFile = async (file?: File) => {
    if (!file) return; try { const pack = parseNavPack(await file.text()); const next = { pack }; update(next); setMessage(`${pack.event.name} imported and saved offline.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import that navpack.'); }
  };
  const onScan = useCallback((value: string) => {
    if (!state) return;
    try { const payload = parseQrPayload(value, state.pack.event.id); const found = state.pack.checkpoints.find((item) => item.shortCode === payload.checkpointCode || item.id === payload.checkpointCode); if (!found) throw new Error('This checkpoint is not included in the imported event.'); update({ ...state, checkpointId: found.id }); setMessage(`Current location set to ${found.label}.`); setScanning(false); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read that checkpoint.'); }
  }, [state]);
  if (state === undefined) return <main className="visitor-empty"><div className="welcome-card"><p>Loading offline event…</p></div></main>;
  if (!state) return <main className="visitor-empty"><div className="welcome-card"><div className="welcome-mark">W</div><p className="eyebrow">Visitor navigation</p><h1>Find your way — even offline.</h1><p>Receive an event from an organizer’s screen, or import its <strong>.navpack</strong>. Your map and latest location stay on this device.</p><button className="button accent large full" onClick={() => { location.hash = '/transfer/receive'; }}>Receive event with camera</button><label className="button primary large full"><input type="file" accept=".navpack,application/x-navpack,application/json" onChange={(event) => void importFile(event.target.files?.[0])} />Import event navpack</label><button className="button text-button" onClick={() => { const pack = createDemoPack(); update({ pack, checkpointId: 'c-registration', destinationId: 'd-booth8' }); }}>Try the demo event</button>{message ? <div className="notice error">{message}</div> : null}</div></main>;
  const filtered = state.pack.destinations.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="visitor-layout">
    <section className="visitor-map"><div className="mobile-event-title"><p className="eyebrow">Now navigating</p><h1>{state.pack.event.name}</h1></div><MapCanvas pack={state.pack} route={route?.points} />{checkpoint ? <div className="you-are-here"><span className="pulse-dot"/>You are here: <strong>{checkpoint.label}</strong></div> : null}</section>
    <aside className="visitor-controls"><div><p className="eyebrow">Now navigating</p><h1>{state.pack.event.name}</h1></div>{message ? <div className="notice">{message}</div> : null}
      <div className="visitor-step"><div className="step-number">1</div><div><h2>Where are you?</h2><p>Scan the nearest sign or choose it manually.</p></div></div><button className="button scan-button" onClick={() => setScanning(true)}>▣ Scan checkpoint QR</button><label className="field"><span>Manual checkpoint</span><select value={state.checkpointId ?? ''} onChange={(event) => update({ ...state, checkpointId: event.target.value || undefined })}><option value="">Choose your location…</option>{state.pack.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.shortCode}</option>)}</select></label>
      <div className="divider"/><div className="visitor-step"><div className="step-number">2</div><div><h2>Where are you going?</h2><p>Search by place or category.</p></div></div><label className="search-box"><span aria-hidden>⌕</span><input aria-label="Search destinations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booths, stage, toilets…" /></label><div className="destination-list">{filtered.map((item) => <button key={item.id} className={state.destinationId === item.id ? 'selected' : ''} onClick={() => update({ ...state, destinationId: item.id })}><span className={`category-icon category-${item.category.toLowerCase()}`}>{item.category.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.category}</small></span><b>›</b></button>)}</div>
      <div className={`visitor-route-card ${route ? 'active' : ''}`}>{checkpoint && destination ? route ? <><span className="route-icon">↗</span><div><small>Shortest route</small><strong>{route.distanceMeters === null ? 'Route ready' : `${route.distanceMeters.toFixed(1)} metres`}</strong><span>{route.distanceMeters === null ? 'Approximate distance' : `About ${Math.max(1, Math.ceil(route.distanceMeters / 70))} minute walk`}</span></div></> : <div><strong>No route available</strong><span>These points are not connected on the map.</span></div> : <span>Choose a checkpoint and destination to see your route.</span>}</div>
      <div className="visitor-footer"><button className="button small accent" onClick={() => { location.hash = '/transfer/receive'; }}>Receive event with camera</button><label className="button small"><input type="file" accept=".navpack,application/x-navpack,application/json" onChange={(event) => void importFile(event.target.files?.[0])}/>Import another map</label><button className="button small" onClick={() => { location.hash = '/print'; }}>Checkpoint signs</button></div>
    </aside>{scanning ? <Scanner onScan={onScan} onClose={() => setScanning(false)} /> : null}
  </main>;
}
