import { useEffect, useMemo, useState } from 'react';
import { createDemoPack, createEmptyPack } from '../demo';
import { calibrate, nearestNode } from '../lib/geometry';
import { createId, slugify } from '../lib/id';
import { deleteNodeSafely, downloadNavPack, parseNavPack } from '../lib/navpack';
import { createOpticalNavPack } from '../decimen/integration';
import { shortestRoute } from '../lib/routing';
import { loadOrganizer, saveOrganizer, saveTransferDraft } from '../lib/storage';
import type { Destination, EditorTool, NavPack, Point, Selection } from '../types';
import { MapCanvas } from './MapCanvas';

const tools: Array<{ id: EditorTool; label: string; step: string; help: string }> = [
  { id: 'select', label: 'Select', step: 'Edit', help: 'Select, drag, or delete map objects.' },
  { id: 'calibrate', label: 'Scale', step: '2', help: 'Click two points, then enter their real distance.' },
  { id: 'routes', label: 'Routes', step: '3', help: 'Click empty space for nodes. Click two nodes to connect them.' },
  { id: 'destinations', label: 'Destinations', step: '4', help: 'Click where visitors want to go.' },
  { id: 'checkpoints', label: 'Checkpoints', step: '5', help: 'Click where a physical QR sign will be installed.' },
  { id: 'preview', label: 'Preview', step: '6', help: 'Test a checkpoint-to-destination route.' },
];
const categories: Destination['category'][] = ['Booth', 'Stage', 'Toilets', 'Exit', 'Food', 'Other'];

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
  const [previewDestination, setPreviewDestination] = useState('');
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
    const handler = (event: KeyboardEvent) => { if ((event.key === 'Delete' || event.key === 'Backspace') && selection && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); deleteSelected(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });
  const preview = useMemo(() => {
    const checkpoint = pack.checkpoints.find((item) => item.id === previewCheckpoint);
    const destination = pack.destinations.find((item) => item.id === previewDestination);
    return checkpoint && destination ? shortestRoute(pack, checkpoint.routeNodeId, destination.routeNodeId) : undefined;
  }, [pack, previewCheckpoint, previewDestination]);

  const mutate = (next: NavPack) => { setPack(next); setMessage(''); };
  const handleUpload = async (file?: File) => {
    if (!file) return;
    try {
      if ((pack.nodes.length || pack.destinations.length || pack.checkpoints.length) && !confirm('Replace the floor plan and clear all map objects?')) return;
      const image = await readImage(file);
      mutate({ ...pack, floor: { id: createId('floor'), name: file.name, imageDataUrl: image.dataUrl, imageWidth: image.width, imageHeight: image.height }, nodes: [], edges: [], destinations: [], checkpoints: [] });
      setActiveTool('calibrate'); setSelection(null); setMessage('Floor plan loaded. Next, calibrate the map scale.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load that image.'); }
  };
  const handleNavPackImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parseNavPack(await file.text());
      const hasCurrentDraft = Boolean(pack.floor.imageDataUrl || pack.nodes.length || pack.destinations.length || pack.checkpoints.length);
      if (hasCurrentDraft && !confirm(`Replace the current organizer draft with “${imported.event.name}”?`)) return;
      await saveOrganizer(imported);
      setPack(imported);
      setActiveTool('select');
      setSelection(null);
      setRouteNode(null);
      setCalibrationPoints([]);
      setPreviewCheckpoint('');
      setPreviewDestination('');
      setUndoPack(null);
      setMessage(`${imported.event.name} imported for editing. Event and checkpoint identities were preserved.`);
    } catch (error) { setMessage(`Import failed: ${error instanceof Error ? error.message : 'Could not import that navpack.'}`); }
  };
  const addAtPoint = (point: Point) => {
    if (activeTool === 'routes') {
      const node = { id: createId('node'), ...point }; mutate({ ...pack, nodes: [...pack.nodes, node] }); setSelection({ type: 'node', id: node.id }); return;
    }
    if (activeTool === 'calibrate') {
      if (calibrationPoints.length === 0) { setCalibrationPoints([point]); return; }
      const distanceText = prompt('Real-world distance between these points (metres):', '10');
      if (!distanceText) { setCalibrationPoints([]); return; }
      try {
        const distanceMeters = Number(distanceText); const pointA = calibrationPoints[0];
        const metersPerImagePixel = calibrate(pointA, point, distanceMeters, pack.floor.imageWidth, pack.floor.imageHeight);
        mutate({ ...pack, floor: { ...pack.floor, calibration: { pointA, pointB: point, distanceMeters, metersPerImagePixel } } });
        setMessage(`Scale saved: ${distanceMeters.toLocaleString()} metres.`); setCalibrationPoints([]); setActiveTool('routes');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid distance.'); setCalibrationPoints([]); }
      return;
    }
    if (activeTool !== 'destinations' && activeTool !== 'checkpoints') return;
    const node = nearestNode(point, pack.nodes, pack.floor.imageWidth, pack.floor.imageHeight);
    if (!node) { setMessage('Add at least one route node first.'); return; }
    if (activeTool === 'destinations') {
      const name = prompt('Destination name:'); if (!name?.trim()) return;
      const response = prompt(`Category (${categories.join(', ')}):`, 'Booth')?.trim();
      const category = categories.find((item) => item.toLowerCase() === response?.toLowerCase()) ?? 'Other';
      const item: Destination = { id: createId('destination'), name: name.trim(), category, routeNodeId: node.id, ...point };
      mutate({ ...pack, destinations: [...pack.destinations, item] }); setSelection({ type: 'destination', id: item.id });
    } else {
      const label = prompt('Checkpoint label:'); if (!label?.trim()) return;
      let shortCode = slugify(label).replaceAll('-', '').slice(0, 6).toUpperCase() || 'POINT';
      let suffix = 2; while (pack.checkpoints.some((item) => item.shortCode === shortCode)) shortCode = `${shortCode.slice(0, 4)}${suffix++}`;
      const item = { id: createId('checkpoint'), label: label.trim(), shortCode, routeNodeId: node.id, ...point };
      mutate({ ...pack, checkpoints: [...pack.checkpoints, item] }); setSelection({ type: 'checkpoint', id: item.id });
    }
  };
  const activateNode = (id: string) => {
    if (activeTool !== 'routes') { setSelection({ type: 'node', id }); return; }
    if (!routeNode) { setRouteNode(id); setSelection({ type: 'node', id }); setMessage('First node selected. Choose another node to connect it.'); return; }
    if (routeNode === id) { setRouteNode(null); return; }
    const exists = pack.edges.some((edge) => (edge.fromNodeId === routeNode && edge.toNodeId === id) || (edge.fromNodeId === id && edge.toNodeId === routeNode));
    if (!exists) mutate({ ...pack, edges: [...pack.edges, { id: createId('edge'), fromNodeId: routeNode, toNodeId: id, accessible: true }] });
    setRouteNode(null); setSelection({ type: 'node', id }); setMessage(exists ? 'Those nodes are already connected.' : 'Route edge added.');
  };
  const deleteSelected = () => {
    if (!selection) return; setUndoPack(pack);
    if (selection.type === 'node') { const result = deleteNodeSafely(pack, selection.id); setPack(result.pack); setMessage(result.reassociated ? `${result.reassociated} linked map item(s) moved to the nearest remaining node.` : 'Route node deleted.'); }
    if (selection.type === 'edge') setPack({ ...pack, edges: pack.edges.filter((item) => item.id !== selection.id) });
    if (selection.type === 'destination') setPack({ ...pack, destinations: pack.destinations.filter((item) => item.id !== selection.id) });
    if (selection.type === 'checkpoint') setPack({ ...pack, checkpoints: pack.checkpoints.filter((item) => item.id !== selection.id) });
    setSelection(null); setRouteNode(null);
  };
  const loadDemo = () => { if (pack.floor.imageDataUrl && !confirm('Replace the current event with the demo?')) return; const demo = createDemoPack(); setPack(demo); setPreviewCheckpoint('c-registration'); setPreviewDestination('d-booth8'); setActiveTool('preview'); setSelection(null); setMessage('Demo loaded. A route from Registration Desk to Booth 8 is ready.'); };
  const clear = () => { if (!confirm('Clear this event map? You can undo this action once.')) return; setUndoPack(pack); setPack(createEmptyPack()); setSelection(null); setMessage('Map cleared.'); };
  const progress = [Boolean(pack.floor.imageDataUrl), Boolean(pack.floor.calibration), pack.nodes.length > 1 && pack.edges.length > 0, pack.destinations.length > 0, pack.checkpoints.length > 0];
  const readyToShare = Boolean(pack.floor.imageDataUrl && pack.nodes.length && pack.checkpoints.length && pack.destinations.length);
  const messageIsError = /invalid|missing|unsupported|could not|failed|unavailable|storage is full/i.test(message);
  const broadcast = async () => {
    try {
      const payload = createOpticalNavPack(pack);
      await Promise.all([saveOrganizer(pack), saveTransferDraft(payload)]);
      location.hash = '/transfer/send';
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The optical transfer could not be prepared.'); }
  };

  return <main className="workspace organizer-workspace">
    <aside className="sidebar">
      <div className="sidebar-heading"><p className="eyebrow">Organizer studio</p><h1>Build your event map</h1><p>Five quick steps from floor plan to visitor-ready navigation.</p></div>
      <label className="field"><span>1 · Event name</span><input value={pack.event.name} onChange={(event) => setPack({ ...pack, event: { ...pack.event, name: event.target.value } })} /></label>
      <label className="upload-button"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event.target.files?.[0])} /><span>{pack.floor.imageDataUrl ? 'Replace floor plan' : '1 · Upload floor plan'}</span></label>
      {!pack.floor.imageDataUrl ? <div className="empty-card"><strong>Start with a floor plan</strong><p>Upload a venue image, or load the fictional conference to explore every feature immediately.</p><button className="button accent full" onClick={loadDemo}>Load demo event</button></div> : null}
      <div className="progress-list" aria-label="Setup progress">{['Floor plan', 'Scale', 'Route graph', 'Destinations', 'Checkpoints'].map((label, index) => <div className={progress[index] ? 'done' : ''} key={label}><span>{progress[index] ? '✓' : index + 1}</span>{label}</div>)}</div>
      <div className="sidebar-actions"><label className="button"><input type="file" disabled={!storageReady} accept=".navpack,application/x-navpack,application/json" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void handleNavPackImport(file); }} /><span>Import .navpack</span></label><button className="button" onClick={loadDemo}>Load demo</button><button className="button danger-text" onClick={clear}>Clear</button>{undoPack ? <button className="button" onClick={() => { setPack(undoPack); setUndoPack(null); setMessage('Last deletion undone.'); }}>Undo</button> : null}</div>
    </aside>
    <section className="editor-panel">
      <div className="tool-row" role="toolbar" aria-label="Map editing tools">{tools.map((tool) => <button key={tool.id} className={activeTool === tool.id ? 'active' : ''} onClick={() => { setActiveTool(tool.id); setSelection(null); setRouteNode(null); }}>{tool.step} · {tool.label}</button>)}</div>
      <div className="instruction-bar"><div><strong>{tools.find((tool) => tool.id === activeTool)?.label}</strong><span>{tools.find((tool) => tool.id === activeTool)?.help}</span></div><div className="status-pills"><span>{pack.nodes.length} nodes</span><span>{pack.edges.length} edges</span><span>{pack.destinations.length} places</span><span>{pack.checkpoints.length} checkpoints</span></div></div>
      {message ? <div className={`notice ${messageIsError ? 'error' : ''}`}>{message}</div> : null}
      {pack.floor.imageDataUrl ? <MapCanvas pack={pack} activeTool={activeTool} selection={selection} route={preview?.points} calibrationPoints={calibrationPoints} interactive showGraph onMapClick={addAtPoint} onNodeActivate={activateNode} onObjectSelect={(item) => setSelection(item)} onMoveNode={(id, point) => setPack((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, ...point } : node) }))} /> : <div className="map-empty"><div><span>⌁</span><h2>Your floor plan will appear here</h2><p>PNG, JPEG, or WebP · stored entirely in the navpack</p></div></div>}
      {selection ? <div className="selection-bar"><span>Selected: <strong>{selection.type}</strong></span><button className="button danger" onClick={deleteSelected}>Delete selected</button><span className="muted">or press Delete</span></div> : null}
      {activeTool === 'preview' ? <div className="preview-panel"><label><span>Start checkpoint</span><select value={previewCheckpoint} onChange={(event) => setPreviewCheckpoint(event.target.value)}><option value="">Choose checkpoint…</option>{pack.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><span className="preview-arrow">→</span><label><span>Destination</span><select value={previewDestination} onChange={(event) => setPreviewDestination(event.target.value)}><option value="">Choose destination…</option>{pack.destinations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="route-summary">{preview ? <><strong>{preview.distanceMeters === null ? 'Route found' : `${preview.distanceMeters.toFixed(1)} m`}</strong><span>{preview.distanceMeters === null ? 'Approximate · calibrate for metres' : `${Math.max(1, Math.ceil(preview.distanceMeters / 70))} min walk`}</span></> : previewCheckpoint && previewDestination ? <strong className="error-text">No connected route</strong> : <span>Choose both ends</span>}</div></div> : null}
      <div className="export-bar"><div><p className="eyebrow">Ready to share?</p><strong>Broadcast with light, download a file, or print the signs.</strong></div><button className="button accent" disabled={!readyToShare} onClick={() => void broadcast()}>Broadcast with light</button><button className="button" disabled={!pack.checkpoints.length} onClick={() => { void saveOrganizer(pack).then(() => { location.hash = '/print'; }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'The event could not be saved.')); }}>Print checkpoint kit</button><button className="button primary" disabled={!readyToShare} onClick={() => { try { downloadNavPack(pack); setMessage('Navpack exported. It is ready for file transfer or direct import.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); } }}>Download .navpack</button></div>
    </section>
  </main>;
}
