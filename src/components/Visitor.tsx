import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { buildDefconPack } from '../defcon/pack';
import { createDemoPack } from '../demo';
import { parseNavPack } from '../lib/navpack';
import { analyzeNavPackReadiness } from '../lib/readiness';
import { shortestRoute } from '../lib/routing';
import type { ScannerIntent } from '../lib/scanned-qr';
import { clearVisitor, loadVisitor, saveVisitor, type VisitorState } from '../lib/storage';
import { destinationCheckpointOptions, selectCurrentCheckpoint } from '../lib/visitor-navigation';
import { MapCanvas } from './MapCanvas';

const WaypointScanner = lazy(() => import('./WaypointScanner'));

interface Props { initialScannerIntent?: ScannerIntent; onLegacyScannerClose?: () => void }

export function Visitor({ initialScannerIntent, onLegacyScannerClose }: Props) {
  const [state, setState] = useState<VisitorState | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [scannerIntent, setScannerIntent] = useState<ScannerIntent | null>(() => initialScannerIntent ?? null);
  const [defconLoading, setDefconLoading] = useState(false);
  useEffect(() => {
    let current = true;
    void loadVisitor().then((saved) => { if (current) setState(saved); }).catch((error: unknown) => { if (current) { setState(null); setMessage(error instanceof Error ? error.message : 'Offline storage is unavailable.'); } });
    return () => { current = false; };
  }, []);
  useEffect(() => { if (initialScannerIntent) setScannerIntent(initialScannerIntent); }, [initialScannerIntent]);

  const applyVisitorState = useCallback(async (next: VisitorState, nextMessage: string) => {
    await saveVisitor(next); setState(next); setMessage(nextMessage);
  }, []);
  const closeScanner = useCallback(() => { setScannerIntent(null); onLegacyScannerClose?.(); }, [onLegacyScannerClose]);
  const loadDefconMap = async () => {
    setDefconLoading(true);
    try { const pack = await buildDefconPack(); await applyVisitorState({ pack }, 'DEF CON 34 map loaded — pick where you are.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load the DEF CON 34 map.'); }
    finally { setDefconLoading(false); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try { const pack = parseNavPack(await file.text()); await applyVisitorState({ pack }, `${pack.event.name} imported and saved offline.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not import that navpack.'); }
  };
  const exitLocation = async () => {
    if (!confirm('Exit this location? The imported map and visitor navigation selections will be removed from this device. The cached Waypoint app will remain available.')) return;
    try { await clearVisitor(); setState(null); setMessage('Location removed from this device.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The saved visitor location could not be removed.'); }
  };

  const checkpoint = state?.pack.checkpoints.find((item) => item.id === state.checkpointId);
  const targetCheckpoint = state?.pack.checkpoints.find((item) => item.id === state.targetCheckpointId && item.id !== state.checkpointId);
  const route = useMemo(() => state && checkpoint && targetCheckpoint ? shortestRoute(state.pack, checkpoint.routeNodeId, targetCheckpoint.routeNodeId) : undefined, [state, checkpoint, targetCheckpoint]);
  const readiness = useMemo(() => state ? analyzeNavPackReadiness(state.pack) : undefined, [state]);
  const scanner = scannerIntent ? <Suspense fallback={<div className="modal-backdrop"><div className="scanner-card"><p>Loading offline QR decoder…</p></div></div>}><WaypointScanner intent={scannerIntent} visitorState={state ?? null} onApply={applyVisitorState} onClose={closeScanner} /></Suspense> : null;

  if (state === undefined) return <main className="visitor-empty"><div className="welcome-card"><p>Loading offline event…</p></div>{scanner}</main>;
  if (!state) return <main className="visitor-empty"><div className="welcome-card"><div className="welcome-mark">W</div><p className="eyebrow">Visitor navigation</p><h1>Find your way around DEF CON 34 — even offline.</h1><p>Load the built-in DEF CON 34 map, scan the organizer's animated <strong>location QR</strong>, or import its <strong>.navpack</strong>. Your map and latest checkpoint stay on this device.</p><button className="button accent large full" disabled={defconLoading} onClick={() => void loadDefconMap()}>{defconLoading ? 'Loading DEF CON 34 map…' : 'Load DEF CON 34 map'}</button><button className="button primary large full" onClick={() => setScannerIntent('location')}>Scan location QR</button><label className="button primary large full"><input type="file" accept=".navpack,application/x-navpack,application/json" onChange={(event) => void importFile(event.target.files?.[0])} />Import event navpack</label><button className="button text-button" onClick={() => { const pack = createDemoPack(); void applyVisitorState({ pack, checkpointId: 'c-registration', targetCheckpointId: 'c-booth8' }, 'Demo location loaded.'); }}>Try the demo event</button>{message ? <div className="notice">{message}</div> : null}</div>{scanner}</main>;

  const hasCheckpoints = state.pack.checkpoints.length > 0;
  const canChooseTarget = state.pack.checkpoints.length > 1;
  const targetOptions = destinationCheckpointOptions(state);
  const mapSelection = targetCheckpoint ? { type: 'checkpoint' as const, id: targetCheckpoint.id } : checkpoint ? { type: 'checkpoint' as const, id: checkpoint.id } : undefined;
  return <main className="visitor-layout">
    <section className="visitor-map"><div className="mobile-event-title"><p className="eyebrow">{readiness?.mode === 'map-only' ? 'Map view' : 'Checkpoint navigation'}</p><h1>{state.pack.event.name}</h1></div><MapCanvas pack={state.pack} route={route?.points} selection={mapSelection} currentCheckpointId={checkpoint?.id} targetCheckpointId={targetCheckpoint?.id} />{checkpoint ? <div className="you-are-here"><span className="pulse-dot"/>You are here: <strong>{checkpoint.label}</strong></div> : null}</section>
    <aside className="visitor-controls"><div><p className="eyebrow">{readiness?.mode === 'map-only' ? 'Map view' : 'Checkpoint navigation'}</p><h1>{state.pack.event.name}</h1></div>{message ? <div className="notice">{message}</div> : null}
      {readiness?.mode === 'map-only' ? <div className="visitor-capability-card"><p className="eyebrow">Map only</p><h2>Visual map guidance</h2><p>This package contains the floor plan without checkpoint positioning or calculated routes.</p></div> : readiness?.mode === 'partial-navigation' ? <div className="notice warning">Some checkpoints or routes are unavailable. The floor plan and available checkpoint markers can still be used for visual guidance.</div> : null}
      {hasCheckpoints ? <><div className="visitor-step"><div className="step-number">1</div><div><h2>Where are you?</h2><p>Pick the nearest labeled area on the map.</p></div></div><label className="field"><span>Current checkpoint</span><select value={state.checkpointId ?? ''} onChange={(event) => { const checkpointId = event.target.value || undefined; void applyVisitorState(selectCurrentCheckpoint(state, checkpointId), checkpointId ? 'Current checkpoint updated.' : 'Current checkpoint cleared.'); }}><option value="">Choose your location…</option>{state.pack.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.shortCode}</option>)}</select></label></> : <div className="visitor-capability-card"><p className="eyebrow">No checkpoint nodes</p><h2>Visual map guidance only</h2><p>The organizer did not include selectable checkpoint locations in this package.</p></div>}
      {canChooseTarget ? <><div className="divider"/><div className="visitor-step"><div className="step-number">2</div><div><h2>Where are you going?</h2><p>Choose another labeled checkpoint as your destination.</p></div></div><label className="field"><span>Destination checkpoint</span><select disabled={!checkpoint} value={targetCheckpoint?.id ?? ''} onChange={(event) => { const targetCheckpointId = event.target.value || undefined; void applyVisitorState({ ...state, targetCheckpointId }, targetCheckpointId ? 'Destination checkpoint selected.' : 'Destination checkpoint cleared.'); }}><option value="">{checkpoint ? 'Choose destination…' : 'Choose your current checkpoint first'}</option>{targetOptions.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.shortCode}</option>)}</select></label><div className={`visitor-route-card ${route ? 'active' : ''}`}>{checkpoint && targetCheckpoint ? route ? <><span className="route-icon">↗</span><div><small>Shortest route to {targetCheckpoint.label}</small><strong>{route.distanceMeters === null ? 'Route ready' : `${route.distanceMeters.toFixed(1)} metres`}</strong><span>{route.distanceMeters === null ? 'Approximate distance' : `About ${Math.max(1, Math.ceil(route.distanceMeters / 70))} minute walk`}</span></div></> : <div><strong>No calculated route</strong><span>{checkpoint.label} and {targetCheckpoint.label} are in disconnected route groups. Use their markers and the floor plan for visual guidance.</span></div> : <span>Choose your current checkpoint and a destination checkpoint to see a route.</span>}</div></> : hasCheckpoints ? <div className="visitor-capability-card single-checkpoint"><p className="eyebrow">One checkpoint available</p><h2>No route target yet</h2><p>This map can establish your location, but it needs at least two checkpoints for calculated navigation.</p></div> : null}
      <div className="visitor-footer"><button className="button danger-text full" onClick={() => void exitLocation()}>Exit Location</button></div>
    </aside>{scanner}
  </main>;
}
