import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDemoPack } from '../demo';
import { parseNavPack } from '../lib/navpack';
import { parseQrPayload } from '../lib/qr';
import { analyzeNavPackReadiness } from '../lib/readiness';
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
  const targetCheckpoint = state?.pack.checkpoints.find((item) => item.id === state.targetCheckpointId && item.id !== state.checkpointId);
  const route = useMemo(() => state && checkpoint && targetCheckpoint ? shortestRoute(state.pack, checkpoint.routeNodeId, targetCheckpoint.routeNodeId) : undefined, [state, checkpoint, targetCheckpoint]);
  const readiness = useMemo(() => state ? analyzeNavPackReadiness(state.pack) : undefined, [state]);
  const importFile = async (file?: File) => {
    if (!file) return;
    try { const pack = parseNavPack(await file.text()); update({ pack }); setSearch(''); setMessage(`${pack.event.name} imported and saved offline.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import that navpack.'); }
  };
  const onScan = useCallback((value: string) => {
    if (!state) return;
    try {
      const payload = parseQrPayload(value, state.pack.event.id);
      const found = state.pack.checkpoints.find((item) => item.shortCode === payload.checkpointCode || item.id === payload.checkpointCode);
      if (!found) throw new Error('This checkpoint is not included in the imported event.');
      update({ ...state, checkpointId: found.id, targetCheckpointId: state.targetCheckpointId === found.id ? undefined : state.targetCheckpointId });
      setMessage(`Current location set to ${found.label}.`); setScanning(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read that checkpoint.'); }
  }, [state]);
  if (state === undefined) return <main className="visitor-empty"><div className="welcome-card"><p>Loading offline event…</p></div></main>;
  if (!state) return <main className="visitor-empty"><div className="welcome-card"><div className="welcome-mark">W</div><p className="eyebrow">Visitor navigation</p><h1>Find your way — even offline.</h1><p>Receive an event from an organizer's screen, or import its <strong>.navpack</strong>. Your map and latest location stay on this device.</p><button className="button accent large full" onClick={() => { location.hash = '/transfer/receive'; }}>Receive event with camera</button><label className="button primary large full"><input type="file" accept=".navpack,application/x-navpack,application/json" onChange={(event) => void importFile(event.target.files?.[0])} />Import event navpack</label><button className="button text-button" onClick={() => { const pack = createDemoPack(); update({ pack, checkpointId: 'c-registration', targetCheckpointId: 'c-booth8' }); }}>Try the demo event</button>{message ? <div className="notice error">{message}</div> : null}</div></main>;

  const filtered = state.pack.checkpoints.filter((item) => item.id !== state.checkpointId && `${item.label} ${item.shortCode}`.toLowerCase().includes(search.toLowerCase()));
  const hasCheckpoints = state.pack.checkpoints.length > 0;
  const canChooseTarget = state.pack.checkpoints.length > 1;
  const mapSelection = targetCheckpoint ? { type: 'checkpoint' as const, id: targetCheckpoint.id } : checkpoint ? { type: 'checkpoint' as const, id: checkpoint.id } : undefined;
  return <main className="visitor-layout">
    <section className="visitor-map"><div className="mobile-event-title"><p className="eyebrow">{readiness?.mode === 'map-only' ? 'Map view' : 'Checkpoint navigation'}</p><h1>{state.pack.event.name}</h1></div><MapCanvas pack={state.pack} route={route?.points} selection={mapSelection} currentCheckpointId={checkpoint?.id} targetCheckpointId={targetCheckpoint?.id} />{checkpoint ? <div className="you-are-here"><span className="pulse-dot"/>You are here: <strong>{checkpoint.label}</strong></div> : null}</section>
    <aside className="visitor-controls"><div><p className="eyebrow">{readiness?.mode === 'map-only' ? 'Map view' : 'Checkpoint navigation'}</p><h1>{state.pack.event.name}</h1></div>{message ? <div className="notice">{message}</div> : null}
      {readiness?.mode === 'map-only' ? <div className="visitor-capability-card"><p className="eyebrow">Map only</p><h2>Visual map guidance</h2><p>This package contains the floor plan without checkpoint positioning or calculated routes.</p></div> : readiness?.mode === 'partial-navigation' ? <div className="notice warning">Some checkpoints or routes are unavailable. The floor plan and available checkpoint markers can still be used for visual guidance.</div> : null}
      {hasCheckpoints ? <><div className="visitor-step"><div className="step-number">1</div><div><h2>Where are you?</h2><p>Scan the nearest checkpoint sign or choose it manually.</p></div></div><button className="button scan-button" onClick={() => setScanning(true)}>▣ Scan checkpoint QR</button><label className="field"><span>Current checkpoint</span><select value={state.checkpointId ?? ''} onChange={(event) => { const checkpointId = event.target.value || undefined; update({ ...state, checkpointId, targetCheckpointId: state.targetCheckpointId === checkpointId ? undefined : state.targetCheckpointId }); }}><option value="">Choose your location…</option>{state.pack.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.shortCode}</option>)}</select></label></> : <div className="visitor-capability-card"><p className="eyebrow">No checkpoint nodes</p><h2>Visual map guidance only</h2><p>The organizer did not include selectable checkpoint locations in this package.</p></div>}
      {canChooseTarget ? <><div className="divider"/><div className="visitor-step"><div className="step-number">2</div><div><h2>Where are you going?</h2><p>Choose another labeled checkpoint as your destination.</p></div></div><label className="search-box"><span aria-hidden>⌕</span><input aria-label="Search destination checkpoints" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search checkpoint name or code…" /></label><div className="checkpoint-list">{filtered.map((item) => <button key={item.id} className={state.targetCheckpointId === item.id ? 'selected' : ''} onClick={() => update({ ...state, targetCheckpointId: item.id })}><span className="checkpoint-list-icon">C</span><span><strong>{item.label}</strong><small>Checkpoint {item.shortCode}</small></span><b>›</b></button>)}</div><div className={`visitor-route-card ${route ? 'active' : ''}`}>{checkpoint && targetCheckpoint ? route ? <><span className="route-icon">↗</span><div><small>Shortest route to {targetCheckpoint.label}</small><strong>{route.distanceMeters === null ? 'Route ready' : `${route.distanceMeters.toFixed(1)} metres`}</strong><span>{route.distanceMeters === null ? 'Approximate distance' : `About ${Math.max(1, Math.ceil(route.distanceMeters / 70))} minute walk`}</span></div></> : <div><strong>No calculated route</strong><span>{checkpoint.label} and {targetCheckpoint.label} are in disconnected route groups. Use their markers and the floor plan for visual guidance.</span></div> : <span>Choose your current checkpoint and a destination checkpoint to see a route.</span>}</div></> : hasCheckpoints ? <div className="visitor-capability-card single-checkpoint"><p className="eyebrow">One checkpoint available</p><h2>No route target yet</h2><p>This map can establish your location, but it needs at least two checkpoints for calculated navigation.</p></div> : null}
      <div className="visitor-footer"><button className="button small accent" onClick={() => { location.hash = '/transfer/receive'; }}>Receive event with camera</button><label className="button small"><input type="file" accept=".navpack,application/x-navpack,application/json" onChange={(event) => void importFile(event.target.files?.[0])}/>Import another map</label>{hasCheckpoints ? <button className="button small" onClick={() => { location.hash = '/print'; }}>Checkpoint signs</button> : null}</div>
    </aside>{scanning ? <Scanner onScan={onScan} onClose={() => setScanning(false)} /> : null}
  </main>;
}
