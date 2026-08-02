import { useEffect, useRef, useState } from 'react';
import { saveOpticalNavPack } from '../decimen/integration';
import { startOpticalSender, type OpticalSenderController, type OpticalSenderSettings } from '../decimen/sender';
import type { OpticalTransferState } from '../decimen/types';
import { formatDuration } from '../decimen/shared/progress';
import { loadTransferDraft } from '../lib/storage';

const defaults: OpticalSenderSettings = { frameBytes: 1465, fps: 24, errorCorrection: 'L', displaySize: 'auto' };
const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

export default function OpticalSender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<OpticalSenderController>();
  const wakeRef = useRef<WakeLockSentinel>();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof loadTransferDraft>>>(null);
  const [settings, setSettings] = useState(defaults);
  const [state, setState] = useState<OpticalTransferState>({ phase: 'preparing', message: 'Loading transfer draft…' });

  useEffect(() => { void loadTransferDraft().then((draft) => { setPayload(draft); setState(draft ? { phase: 'idle' } : { phase: 'error', message: 'No prepared navpack was found. Return to Organizer and choose Broadcast location QR.' }); }).catch((error: unknown) => setState({ phase: 'error', message: error instanceof Error ? error.message : 'The transfer draft could not be loaded.' })); }, []);
  const stop = (reason = 'Broadcast stopped.') => { controllerRef.current?.stop(); controllerRef.current = undefined; void wakeRef.current?.release(); wakeRef.current = undefined; setState({ phase: 'stopped', reason }); };
  useEffect(() => {
    const visibility = () => { if (document.hidden && controllerRef.current) stop('Broadcast paused because Waypoint is no longer visible.'); };
    document.addEventListener('visibilitychange', visibility);
    return () => { document.removeEventListener('visibilitychange', visibility); controllerRef.current?.stop(); void wakeRef.current?.release(); };
  }, []);
  const start = async () => {
    if (!payload || !canvasRef.current) return;
    controllerRef.current?.stop();
    setState({ phase: 'preparing', message: 'Compressing and preparing the fountain stream…' });
    try {
      try { wakeRef.current = await navigator.wakeLock?.request('screen'); } catch { wakeRef.current = undefined; }
      controllerRef.current = await startOpticalSender(payload, canvasRef.current, settings, (diagnostics) => setState({ phase: 'transmitting', frame: diagnostics.frame, fps: settings.fps, originalSize: diagnostics.originalSize, transmittedSize: diagnostics.transmittedSize, compression: diagnostics.compression, estimatedSeconds: diagnostics.estimatedSeconds }));
    } catch (error) { setState({ phase: 'error', message: error instanceof Error ? error.message : 'The optical broadcast could not start.' }); }
  };
  return <main className="transfer-screen sender-screen">
    <header className="transfer-header"><a className="button" href="#/organizer">← Organizer</a><div><p className="eyebrow">Decimen optical transfer</p><h1>Broadcast location QR</h1></div><span className="warning-chip">Unencrypted channel</span></header>
    <section className="sender-stage"><canvas ref={canvasRef} aria-label="Animated QR transfer stream"/><div className="transfer-status">
      <strong>{state.phase === 'transmitting' ? `Broadcasting frame ${state.frame.toLocaleString()}` : state.phase === 'preparing' ? state.message : state.phase === 'stopped' ? state.reason : state.phase === 'error' ? state.message : 'Ready to broadcast'}</strong>
      {state.phase === 'transmitting' ? <div className="metric-grid"><span>Original<b>{formatBytes(state.originalSize)}</b></span><span>Transmitted<b>{formatBytes(state.transmittedSize)}</b></span><span>Compression<b>{state.compression === 'gzip' ? 'Gzip' : 'None'}</b></span><span>Est. receive<b>{formatDuration(state.estimatedSeconds)}</b></span></div> : null}
      {payload ? payload.startingCheckpoint ? <div className="notice warning transfer-location"><strong>Starting at {payload.startingCheckpoint.label}</strong><span>Receivers will use this checkpoint as their location. This screen must be physically at {payload.startingCheckpoint.label}.</span></div> : <div className="notice transfer-location"><strong>No starting location</strong><span>Receivers will scan or choose a checkpoint after importing the map.</span></div> : null}
      <p>Maximize this window and raise screen brightness. Anyone in view can receive this unencrypted navpack.</p>
      <div className="transfer-actions">{state.phase !== 'transmitting' && payload ? <button className="button accent large" onClick={() => void start()}>Start broadcast</button> : null}{state.phase === 'transmitting' ? <button className="button danger large" onClick={() => stop()}>Stop</button> : null}{payload ? <button className="button" onClick={() => saveOpticalNavPack(payload)}>Download .navpack</button> : null}<a className="button" href="#/print">Print checkpoint kit</a></div>
      <details><summary>Advanced settings</summary><div className="advanced-grid"><label>Bytes per frame<select value={settings.frameBytes} onChange={(event) => setSettings({ ...settings, frameBytes: Number(event.target.value) })}>{[500, 900, 1465, 2000, 2953].map((value) => <option key={value}>{value}</option>)}</select></label><label>Frames per second<select value={settings.fps} onChange={(event) => setSettings({ ...settings, fps: Number(event.target.value) })}>{[12, 18, 24, 30, 45, 60].map((value) => <option key={value}>{value}</option>)}</select></label><label>Error correction<select value={settings.errorCorrection} onChange={(event) => setSettings({ ...settings, errorCorrection: event.target.value as OpticalSenderSettings['errorCorrection'] })}>{['L', 'M', 'Q', 'H'].map((value) => <option key={value}>{value}</option>)}</select></label></div><p>Stop and restart to apply changed settings. Lower density and FPS are easier for phone cameras.</p></details>
    </div></section>
  </main>;
}
