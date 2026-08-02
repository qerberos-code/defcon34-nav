import { useEffect, useRef, useState } from 'react';
import { validateReceivedNavPack } from '../decimen/integration';
import { startQrScanner, type OpticalReceiverController, type ReceiverDiagnostics } from '../decimen/receiver';
import { formatDuration } from '../decimen/shared/progress';
import { parseQrPayload } from '../lib/qr';
import { resolveCheckpointScan, type ScannerIntent } from '../lib/scanned-qr';
import type { VisitorState } from '../lib/storage';
import { selectCurrentCheckpoint } from '../lib/visitor-navigation';

interface Props {
  intent: ScannerIntent;
  visitorState: VisitorState | null;
  onApply: (next: VisitorState, message: string) => Promise<void>;
  onClose: () => void;
}

type ScannerViewState =
  | { phase: 'starting'; message: string }
  | { phase: 'scanning'; diagnostics: ReceiverDiagnostics; message?: string }
  | { phase: 'verifying'; message: string }
  | { phase: 'error'; message: string };

const emptyDiagnostics: ReceiverDiagnostics = { uniqueFrames: 0, duplicateFrames: 0, expectedFrames: 0, progress: 0, goodput: 0, cameraStatus: 'Starting camera' };

export default function WaypointScanner({ intent, visitorState, onApply, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<OpticalReceiverController>();
  const visitorStateRef = useRef(visitorState);
  visitorStateRef.current = visitorState;
  const [restart, setRestart] = useState(0);
  const [state, setState] = useState<ScannerViewState>({ phase: 'starting', message: 'Requesting camera access…' });

  useEffect(() => {
    const video = videoRef.current; if (!video) return;
    let cancelled = false;
    setState({ phase: 'starting', message: 'Requesting camera access…' });
    void startQrScanner(video, {
      intent,
      onProgress: (diagnostics) => { if (!cancelled) setState((current) => ({ phase: 'scanning', diagnostics, message: current.phase === 'scanning' ? current.message : undefined })); },
      onCheckpoint: (value) => {
        if (cancelled) return;
        if (intent === 'location') {
          setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message: 'This is a checkpoint QR. First scan the organizer\'s animated location QR or import its .navpack, then scan this checkpoint again.' }); return;
        }
        let resolution;
        const currentVisitor = visitorStateRef.current;
        try { resolution = resolveCheckpointScan(currentVisitor?.pack, parseQrPayload(value)); }
        catch { setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message: 'This checkpoint QR is invalid.' }); return; }
        if (resolution.kind !== 'matched') { setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message: resolution.message }); return; }
        if (!currentVisitor) { setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message: 'Load a location before scanning its checkpoint QR.' }); return; }
        const next = selectCurrentCheckpoint(currentVisitor, resolution.checkpointId);
        controllerRef.current?.stop();
        void onApply(next, `Current location set to ${resolution.label}.`).then(onClose).catch((error: unknown) => setState({ phase: 'error', message: error instanceof Error ? error.message : 'The checkpoint could not be saved.' }));
      },
      onUnsupported: (message) => { if (!cancelled) setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message }); },
      onLocationDetected: () => {
        if (intent === 'location') return true;
        const accepted = confirm('Animated location QR detected. Switch to receiving this updated location? Your current saved location will be replaced only after it is completely received and verified.');
        if (!accepted && !cancelled) setState({ phase: 'scanning', diagnostics: emptyDiagnostics, message: 'Location QR ignored. Continue scanning the static checkpoint QR.' });
        return accepted;
      },
      onComplete: (file) => {
        if (cancelled) return;
        setState({ phase: 'verifying', message: 'Verifying the received location…' });
        void validateReceivedNavPack(file).then(async ({ pack, startingCheckpoint }) => {
          const next: VisitorState = { pack, checkpointId: startingCheckpoint?.id };
          await onApply(next, startingCheckpoint ? `${pack.event.name} loaded. Current checkpoint: ${startingCheckpoint.label}.` : `${pack.event.name} loaded. Scan or choose your current checkpoint.`);
          onClose();
        }).catch((error: unknown) => setState({ phase: 'error', message: error instanceof Error ? error.message : 'The received navpack is invalid.' }));
      },
      onError: (error) => { if (!cancelled) setState({ phase: 'error', message: error.message }); },
    }).then((controller) => { if (cancelled) controller.stop(); else controllerRef.current = controller; }).catch((error: unknown) => {
      if (cancelled) return;
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setState({ phase: 'error', message: denied ? 'Camera access was denied. Allow it in site settings, then restart.' : error instanceof Error ? error.message : 'The camera could not start.' });
    });
    return () => { cancelled = true; controllerRef.current?.stop(); controllerRef.current = undefined; };
  }, [intent, onApply, onClose, restart]);

  const diagnostics = state.phase === 'scanning' ? state.diagnostics : undefined;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={intent === 'location' ? 'Scan animated location QR' : 'Scan checkpoint QR'}>
    <div className="scanner-card waypoint-scanner"><div className="section-heading"><div><p className="eyebrow">{intent === 'location' ? 'Location QR scanner' : 'Checkpoint QR scanner'}</p><h2>{intent === 'location' ? 'Scan location QR' : 'Scan checkpoint QR'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close scanner">×</button></div>
      <div className="scanner-video"><video ref={videoRef} playsInline muted/><div className="camera-guide">{intent === 'location' ? 'Align the animated location QR inside this frame' : 'Align the static checkpoint QR inside this frame'}</div></div>
      {state.phase === 'starting' || state.phase === 'verifying' ? <p className="scanner-status">{state.message}</p> : null}
      {diagnostics ? <><p className="scanner-status">{diagnostics.cameraStatus}</p>{diagnostics.uniqueFrames > 0 ? <><progress value={diagnostics.progress} max={1}/><div className="metric-grid compact"><span>Received<b>{Math.round(diagnostics.progress * 100)}%</b></span><span>Unique frames<b>{diagnostics.uniqueFrames} / ~{diagnostics.expectedFrames}</b></span><span>Time left<b>{diagnostics.estimatedSeconds === undefined ? 'Measuring…' : formatDuration(diagnostics.estimatedSeconds)}</b></span></div></> : null}{state.message ? <div className="notice warning">{state.message}</div> : null}{diagnostics.advice ? <div className="notice warning">{diagnostics.advice}</div> : null}</> : null}
      {state.phase === 'error' ? <><div className="notice error">{state.message}</div><button className="button accent full" onClick={() => setRestart((value) => value + 1)}>Restart camera</button></> : null}
      <p className="muted">{intent === 'location' ? 'Animated location QRs load a complete map package.' : 'Checkpoint QRs set your position. Animated location QRs are detected but require confirmation.'}</p>
    </div>
  </div>;
}
