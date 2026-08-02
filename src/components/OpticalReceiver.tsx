import { useEffect, useRef, useState } from 'react';
import { saveOpticalNavPack, validateReceivedNavPack } from '../decimen/integration';
import { startOpticalReceiver, type OpticalReceiverController } from '../decimen/receiver';
import type { OpticalTransferState } from '../decimen/types';
import { formatDuration } from '../decimen/shared/progress';
import { saveVisitor } from '../lib/storage';

export default function OpticalReceiver() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<OpticalReceiverController>();
  const [state, setState] = useState<OpticalTransferState>({ phase: 'idle' });
  useEffect(() => () => controllerRef.current?.stop('Route changed.'), []);
  const start = async () => {
    if (!videoRef.current) return;
    controllerRef.current?.stop('Restarting.');
    setState({ phase: 'preparing', message: 'Requesting camera access…' });
    try {
      controllerRef.current = await startOpticalReceiver(videoRef.current, (diagnostics) => setState({ phase: 'receiving', ...diagnostics }), (opticalFile) => {
        void validateReceivedNavPack(opticalFile).then(async ({ pack, file }) => { await saveVisitor({ pack }); setState({ phase: 'complete', pack, file }); }).catch((error: unknown) => setState({ phase: 'error', message: error instanceof Error ? error.message : 'The received navpack is invalid.' }));
      }, (error) => setState({ phase: 'error', message: error.message }));
    } catch (error) {
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setState({ phase: 'error', message: denied ? 'Camera access was denied. Allow camera access in site settings, then restart.' : error instanceof Error ? error.message : 'The camera could not start.' });
    }
  };
  const stop = () => { controllerRef.current?.stop('Stopped by user.'); controllerRef.current = undefined; setState({ phase: 'stopped', reason: 'Reception stopped.' }); };
  const receiving = state.phase === 'receiving';
  return <main className="transfer-screen receiver-screen"><header className="transfer-header"><a className="button" href="#/visitor">← Visitor</a><div><p className="eyebrow">Decimen optical transfer</p><h1>Receive event with camera</h1></div><span className="warning-chip">Unencrypted channel</span></header><section className="receiver-stage"><div className="camera-frame"><video ref={videoRef} muted playsInline/><div className="camera-guide">Align the animated QR inside this frame</div></div><div className="transfer-status">
    {state.phase === 'idle' ? <><h2>Camera stays off until you start</h2><p>Point this device at the organizer’s animated QR. Waypoint accepts navpacks only.</p><button className="button accent large" onClick={() => void start()}>Start camera</button></> : null}
    {state.phase === 'preparing' ? <h2>{state.message}</h2> : null}
    {receiving ? <><h2>{state.uniqueFrames ? `${Math.round(state.progress * 100)}% received` : 'Looking for Decimen frames…'}</h2><progress value={state.progress} max={1}/><div className="metric-grid"><span>Unique frames<b>{state.uniqueFrames} / ~{state.expectedFrames}</b></span><span>Duplicates<b>{state.duplicateFrames}</b></span><span>Goodput<b>{state.goodput.toFixed(1)} fps</b></span><span>Time left<b>{state.estimatedSeconds === undefined ? 'Measuring…' : formatDuration(state.estimatedSeconds)}</b></span></div><p>{state.cameraStatus}</p>{state.advice ? <div className="notice error">{state.advice}</div> : null}<button className="button danger" onClick={stop}>Stop camera</button></> : null}
    {state.phase === 'error' ? <><div className="notice error">{state.message}</div><button className="button accent" onClick={() => void start()}>Restart camera</button></> : null}
    {state.phase === 'stopped' ? <><p>{state.reason}</p><button className="button accent" onClick={() => void start()}>Restart camera</button></> : null}
    {state.phase === 'complete' ? <><h2>{state.pack.event.name} is ready</h2><p>SHA-256 verified, validated, and saved to visitor storage.</p><div className="transfer-actions"><button className="button primary large" onClick={() => { location.hash = '/visitor'; }}>Open event</button><button className="button" onClick={() => saveOpticalNavPack(state.file)}>Save a copy</button></div></> : null}
  </div></section></main>;
}
