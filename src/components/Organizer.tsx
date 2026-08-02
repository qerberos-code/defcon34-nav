import { useEffect, useMemo, useState } from 'react';
import { createDemoPack, createEmptyPack } from '../demo';
import { calibrate } from '../lib/geometry';
import { createId, slugify } from '../lib/id';
import { addCheckpointNode, deleteNodeSafely, downloadNavPack, moveRouteNode, parseNavPack, removeCheckpoint } from '../lib/navpack';
import { createOpticalNavPack } from '../decimen/integration';
import { analyzeNavPackReadiness, shareConfirmation } from '../lib/readiness';
import { shortestRoute } from '../lib/routing';
import { loadOrganizer, saveOrganizer, saveTransferDraft } from '../lib/storage';
import type { EditorTool, NavPack, Point, Selection } from '../types';
import { MapCanvas } from './MapCanvas';

const tools: Array<{ id: EditorTool; label: string; step: string; help: string }> = [
  { id: 'select', label: 'Select', step: 'Edit', help: 'Select, drag, or delete checkpoints, intermediate points, and route segments.' },
  { id: 'calibrate', label: 'Scale', step: '2', help: 'Click two points, then enter their real distance.' },
  { id: 'checkpoints', label: 'Checkpoints', step: '3', help: 'Place and label the physical or displayed QR checkpoints visitors can route between.' },
  { id: 'routes', label: 'Routes', step: '4', help: 'Click empty space for intermediate points. Click any two points or checkpoints to connect them.' },
  { id: 'preview', label: 'Preview', step: '5', help: 'Test a route between two checkpoints.' },
];
const selectionLabels = { node: 'intermediate route point', edge: 'route segment', checkpoint: 'checkpoint node' } as const;
const readinessContent = {
  'map-only': { title: 'Map only', description: 'Visitors can view the floor plan, but checkpoint positioning and calculated routes are not included.' },
  'partial-navigation': { title: 'Partial navigation', description: 'The map is shareable, but one or more checkpoints cannot route to another checkpoint.' },
  'complete-navigation': { title: 'Complete navigation', description: 'Every checkpoint can reach at least one other checkpoint.' },
} as const;

async function readImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read that image.')); reader.readAsDataURL(file); });
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ dataUrl, width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error('That image could not be decoded.')); image.src = dataUrl; });
}

export function Organizer() {
  const [pack, setPack] = useState<NavPack>(() => createEmptyPack());
  const [storageReady, setStorageReady] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [selection, setSelection] = useState<Selection>(null);
  const [routeNode, setRouteNode] = useState<string | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([]);
  const [previewCheckpoint, setPreviewCheckpoint] = useState('');
  const [previewTargetCheckpoint, setPreviewTargetCheckpoint] = useState('');
  const [broadcastCheckpointId, setBroadcastCheckpointId] = useState('');
  const [undoPack, setUndoPack] = useState<NavPack | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let current = true;
    void loadOrganizer().then((saved) => { if (current && saved) setPack(saved); }).catch((error: unknown) => { if (current) setMessage(error instanceof Error ? error.message : 'Offline storage is unavailable.'); }).finally(() => { if (current) setStorageReady(true); });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    if (!storageReady || !pack.floor.imageDataUrl) return;
    const timer = setTimeout(() => { void saveOrganizer(pack).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'This event could not be saved offline.')); }, 250);
    return () => clearTimeout(timer);
  }, [pack, storageReady]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selection && !editing) { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });

  const preview = useMemo(() => {
    const start = pack.checkpoints.find((item) => item.id === previewCheckpoint);
    const target = pack.checkpoints.find((item) => item.id === previewTargetCheckpoint);
    return start && target && start.id !== target.id ? shortestRoute(pack, start.routeNodeId, target.routeNodeId) : undefined;
  }, [pack, previewCheckpoint, previewTargetCheckpoint]);
  const readiness = useMemo(() => analyzeNavPackReadiness(pack), [pack]);
  const selectedBroadcastCheckpointId = pack.checkpoints.some((checkpoint) => checkpoint.id === broadcastCheckpointId) ? broadcastCheckpointId : '';

  const mutate = (next: NavPack) => { setPack(next); setMessage(''); };
  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      if ((pack.nodes.length || pack.destinations.length || pack.checkpoints.length) && !confirm('Replace the floor plan and clear all map objects?')) return;
      const image = await readImage(file);
      mutate({ ...pack, floor: { id: createId('floor'), name: file.name, imageDataUrl: image.dataUrl, imageWidth: image.width, imageHeight: image.height }, nodes: [], edges: [], destinations: [], checkpoints: [] });
      setBroadcastCheckpointId(''); setActiveTool('calibrate'); setSelection(null); setMessage('Floor plan loaded. Next, calibrate the map scale.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load that image.'); }
  };
  const handleNavPackImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parseNavPack(await file.text());
      const hasCurrentDraft = Boolean(pack.floor.imageDataUrl || pack.nodes.length || pack.destinations.length || pack.checkpoints.length);
      if (hasCurrentDraft && !confirm(`Replace the current organizer draft with "${imported.event.name}"?`)) return;
      await saveOrganizer(imported);
      setPack(imported); setActiveTool('select'); setSelection(null); setRouteNode(null); setCalibrationPoints([]);
      setPreviewCheckpoint(''); setPreviewTargetCheckpoint(''); setBroadcastCheckpointId(''); setUndoPack(null);
      setMessage(`${imported.event.name} imported. Existing NavPack v1 destination data was preserved but is not shown in the checkpoint-centric editor.`);
    } catch (error) { setMessage(`Import failed: ${error instanceof Error ? error.message : 'Could not import that navpack.'}`); }
  };
  const addAtPoint = (point: Point) => {
    if (activeTool === 'routes') {
      const node = { id: createId('node'), ...point };
      mutate({ ...pack, nodes: [...pack.nodes, node] }); setSelection({ type: 'node', id: node.id });
      setMessage('Intermediate route point added. Click it and another point or checkpoint to connect a segment.'); return;
    }
    if (activeTool === 'calibrate') {
      if (calibrationPoints.length === 0) { setCalibrationPoints([point]); return; }
      const distanceText = prompt('Real-world distance between these points (metres):', '10');
      if (!distanceText) { setCalibrationPoints([]); return; }
      try {
        const distanceMeters = Number(distanceText); const pointA = calibrationPoints[0];
        const metersPerImagePixel = calibrate(pointA, point, distanceMeters, pack.floor.imageWidth, pack.floor.imageHeight);
        mutate({ ...pack, floor: { ...pack.floor, calibration: { pointA, pointB: point, distanceMeters, metersPerImagePixel } } });
        setMessage(`Scale saved: ${distanceMeters.toLocaleString()} metres. Next, place checkpoints.`); setCalibrationPoints([]); setActiveTool('checkpoints');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid distance.'); setCalibrationPoints([]); }
      return;
    }
    if (activeTool !== 'checkpoints') return;
    const label = prompt('Checkpoint label:'); if (!label?.trim()) return;
    let shortCode = slugify(label).replaceAll('-', '').slice(0, 6).toUpperCase() || 'POINT';
    let suffix = 2; while (pack.checkpoints.some((item) => item.shortCode === shortCode)) shortCode = `${shortCode.slice(0, 4)}${suffix++}`;
    const checkpointId = createId('checkpoint'); const nodeId = createId('node');
    const next = addCheckpointNode(pack, { id: checkpointId, label: label.trim(), shortCode, ...point }, nodeId);
    mutate(next); setSelection({ type: 'checkpoint', id: checkpointId }); setMessage(`${label.trim()} added as a labeled checkpoint node.`);
  };
  const activateNode = (id: string) => {
    if (activeTool !== 'routes') { setSelection({ type: 'node', id }); return; }
    if (!routeNode) { setRouteNode(id); setSelection({ type: 'node', id }); setMessage('First endpoint selected. Choose a checkpoint or intermediate point to connect it.'); return; }
    if (routeNode === id) { setRouteNode(null); setMessage('Route selection cleared.'); return; }
    const exists = pack.edges.some((edge) => (edge.fromNodeId === routeNode && edge.toNodeId === id) || (edge.fromNodeId === id && edge.toNodeId === routeNode));
    if (!exists) mutate({ ...pack, edges: [...pack.edges, { id: createId('edge'), fromNodeId: routeNode, toNodeId: id, accessible: true }] });
    setRouteNode(null); setSelection({ type: 'node', id }); setMessage(exists ? 'Those points are already connected.' : 'Route segment added.');
  };
  const deleteSelected = () => {
    if (!selection) return;
    let next = pack; let nextMessage = '';
    if (selection.type === 'node') {
      const result = deleteNodeSafely(pack, selection.id); next = result.pack;
      nextMessage = result.reassociated ? `${result.reassociated} legacy linked item(s) moved to the nearest remaining point.` : 'Intermediate route point deleted.';
    }
    if (selection.type === 'edge') { next = { ...pack, edges: pack.edges.filter((item) => item.id !== selection.id) }; nextMessage = 'Route segment deleted.'; }
    if (selection.type === 'checkpoint') {
      const checkpoint = pack.checkpoints.find((item) => item.id === selection.id); if (!checkpoint) return;
      const connected = pack.edges.some((edge) => edge.fromNodeId === checkpoint.routeNodeId || edge.toNodeId === checkpoint.routeNodeId);
      let removeBackingNode = true;
      if (connected) {
        const choice = prompt(`"${checkpoint.label}" has connected route segments. Type KEEP to remove only its checkpoint label and keep the point as an intermediate, or DELETE to remove the point and its connected segments.`, 'KEEP');
        if (choice === null) return;
        const normalized = choice.trim().toUpperCase();
        if (normalized !== 'KEEP' && normalized !== 'DELETE') { setMessage('Deletion cancelled. Enter KEEP or DELETE.'); return; }
        removeBackingNode = normalized === 'DELETE';
      }
      next = removeCheckpoint(pack, checkpoint.id, removeBackingNode);
      nextMessage = removeBackingNode ? 'Checkpoint, backing point, and connected segments deleted.' : 'Checkpoint removed; its route point remains as an intermediate point.';
    }
    setUndoPack(pack); setPack(next); setMessage(nextMessage); setSelection(null); setRouteNode(null);
  };
  const loadDemo = () => {
    if (pack.floor.imageDataUrl && !confirm('Replace the current event with the demo?')) return;
    const demo = createDemoPack(); setPack(demo); setPreviewCheckpoint('c-registration'); setPreviewTargetCheckpoint('c-booth8');
    setBroadcastCheckpointId(''); setActiveTool('preview'); setSelection(null); setMessage('Demo loaded. A route from Registration Desk to Booth 8 is ready.');
  };
  const clear = () => { if (!confirm('Clear this event map? You can undo this action once.')) return; setUndoPack(pack); setPack(createEmptyPack()); setBroadcastCheckpointId(''); setSelection(null); setMessage('Map cleared.'); };
  const progress = [Boolean(pack.floor.imageDataUrl), Boolean(pack.floor.calibration), pack.checkpoints.length > 0, pack.nodes.length > 1 && pack.edges.length > 0];
  const messageIsError = /invalid|missing|unsupported|could not|failed|unavailable|storage is full|cancelled/i.test(message);
  const broadcast = async () => {
    const warning = shareConfirmation(readiness); if (warning && !confirm(warning)) return;
    try { const payload = createOpticalNavPack(pack, selectedBroadcastCheckpointId || undefined); await Promise.all([saveOrganizer(pack), saveTransferDraft(payload)]); location.hash = '/transfer/send'; }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The optical transfer could not be prepared.'); }
  };

  return <main className="workspace organizer-workspace">
    <aside className="sidebar">
      <div className="sidebar-heading"><p className="eyebrow">Organizer studio</p><h1>Augment your floor plan</h1><p>Add labeled checkpoint nodes, connect them through walkable routes, and share the result.</p></div>
      <label className="field"><span>1 · Event or venue name</span><input value={pack.event.name} onChange={(event) => setPack({ ...pack, event: { ...pack.event, name: event.target.value } })} /></label>
      <label className="upload-button"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event.target.files?.[0])} /><span>{pack.floor.imageDataUrl ? 'Replace floor plan' : '1 · Upload floor plan'}</span></label>
      {!pack.floor.imageDataUrl ? <div className="empty-card"><strong>Start with an existing floor plan</strong><p>Upload a venue image, or load the fictional conference to explore the checkpoint workflow.</p><button className="button accent full" onClick={loadDemo}>Load demo event</button></div> : null}
      <div className="progress-list" aria-label="Setup progress">{['Floor plan', 'Scale', 'Checkpoints', 'Route network'].map((label, index) => <div className={progress[index] ? 'done' : ''} key={label}><span>{progress[index] ? '✓' : index + 1}</span>{label}</div>)}</div>
      <details className="object-guide" open><summary>Map object guide</summary><dl><dt>Checkpoint node</dt><dd>A labeled physical or displayed QR location that visitors can start from or route to.</dd><dt>Intermediate route point</dt><dd>An unlabeled anchor used to trace turns and walkable paths between checkpoints.</dd><dt>Route segment</dt><dd>A walkable connection between two checkpoints, two intermediate points, or one of each.</dd></dl></details>
      <div className="sidebar-actions"><label className="button"><input type="file" disabled={!storageReady} accept=".navpack,application/x-navpack,application/json" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void handleNavPackImport(file); }} /><span>Import .navpack</span></label><button className="button" onClick={loadDemo}>Load demo</button><button className="button danger-text" onClick={clear}>Clear</button>{undoPack ? <button className="button" onClick={() => { setPack(undoPack); setUndoPack(null); setMessage('Last deletion undone.'); }}>Undo</button> : null}</div>
    </aside>
    <section className="editor-panel">
      <div className="tool-row" role="toolbar" aria-label="Map editing tools">{tools.map((tool) => <button key={tool.id} className={activeTool === tool.id ? 'active' : ''} onClick={() => { setActiveTool(tool.id); setSelection(null); setRouteNode(null); }}>{tool.step} · {tool.label}</button>)}</div>
      <div className="instruction-bar"><div><strong>{tools.find((tool) => tool.id === activeTool)?.label}</strong><span>{tools.find((tool) => tool.id === activeTool)?.help}</span></div><div className="status-pills"><span>{pack.checkpoints.length} checkpoints</span><span>{pack.nodes.length - new Set(pack.checkpoints.map((item) => item.routeNodeId)).size} intermediate points</span><span>{pack.edges.length} route segments</span></div></div>
      <div className="map-legend" aria-label="Map legend"><span><i className="legend-checkpoint">C</i>Labeled checkpoint</span><span><i className="legend-point"/>Intermediate point</span><span><i className="legend-segment"/>Route segment</span></div>
      {message ? <div className={`notice ${messageIsError ? 'error' : ''}`}>{message}</div> : null}
      {pack.floor.imageDataUrl ? <MapCanvas pack={pack} activeTool={activeTool} selection={selection} route={preview?.points} calibrationPoints={calibrationPoints} interactive showGraph onMapClick={addAtPoint} onNodeActivate={activateNode} onObjectSelect={setSelection} onMoveNode={(id, point) => setPack((current) => moveRouteNode(current, id, point))} /> : <div className="map-empty"><div><span>⌁</span><h2>Your floor plan will appear here</h2><p>PNG, JPEG, or WebP · stored entirely in the navpack</p></div></div>}
      {selection ? <div className="selection-bar"><span>Selected: <strong>{selectionLabels[selection.type]}</strong></span><button className="button danger" onClick={deleteSelected}>Delete selected</button><span className="muted">or press Delete</span></div> : null}
      {activeTool === 'preview' ? <div className="preview-panel"><label><span>Start checkpoint</span><select value={previewCheckpoint} onChange={(event) => { setPreviewCheckpoint(event.target.value); if (event.target.value === previewTargetCheckpoint) setPreviewTargetCheckpoint(''); }}><option value="">Choose checkpoint…</option>{pack.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><span className="preview-arrow">→</span><label><span>Destination checkpoint</span><select value={previewTargetCheckpoint} onChange={(event) => setPreviewTargetCheckpoint(event.target.value)}><option value="">Choose another checkpoint…</option>{pack.checkpoints.filter((item) => item.id !== previewCheckpoint).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="route-summary">{preview ? <><strong>{preview.distanceMeters === null ? 'Route found' : `${preview.distanceMeters.toFixed(1)} m`}</strong><span>{preview.distanceMeters === null ? 'Approximate · calibrate for metres' : `${Math.max(1, Math.ceil(preview.distanceMeters / 70))} min walk`}</span></> : previewCheckpoint && previewTargetCheckpoint ? <><strong className="error-text">No connected route</strong><span>The markers remain available for visual guidance.</span></> : <span>Choose two different checkpoints</span>}</div></div> : null}
      <section className={`package-readiness ${readiness.mode}`} aria-label="Package readiness"><div><p className="eyebrow">Package capability</p><strong>{readinessContent[readiness.mode].title}</strong><span>{readinessContent[readiness.mode].description}</span></div>{readiness.issues.length ? <ul>{readiness.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul> : null}</section>
      <div className="export-bar"><div><p className="eyebrow">Ready to share?</p><strong>Broadcast with light, download a file, or print the signs.</strong></div><label className="broadcast-location"><span>Broadcast starting location</span><select value={selectedBroadcastCheckpointId} disabled={!pack.checkpoints.length} onChange={(event) => setBroadcastCheckpointId(event.target.value)}><option value="">No starting location</option>{pack.checkpoints.map((checkpoint) => <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.label} · {checkpoint.shortCode}</option>)}</select><small>Optional · choose only when this screen is physically at the checkpoint.</small></label><button className="button accent" disabled={!readiness.shareable} onClick={() => void broadcast()}>Broadcast with light</button><button className="button" disabled={!pack.checkpoints.length} onClick={() => { void saveOrganizer(pack).then(() => { location.hash = '/print'; }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'The event could not be saved.')); }}>Print checkpoint kit</button><button className="button primary" disabled={!readiness.shareable} onClick={() => { const warning = shareConfirmation(readiness); if (warning && !confirm(warning)) return; try { downloadNavPack(pack); setMessage('Navpack exported. It is ready for file transfer or direct import.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); } }}>Download .navpack</button></div>
    </section>
  </main>;
}
