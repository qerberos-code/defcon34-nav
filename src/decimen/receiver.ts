import { classifyDecodedQr, LocationSessionPolicy, type ScannerIntent } from '../lib/scanned-qr';
import { LTDecoder } from './shared/fountain';
import { NoSignalHintTimer } from './shared/no-signal';
import { estimateTransferProgress } from './shared/progress';
import { fnv1a, parseFrame, streamIdentity, unpackFile, type OpticalFile } from './shared/protocol';
import { DecodeWorkerPool } from './shared/worker-pool';
import { createDecodeWorker } from './receive/worker-factory';

export interface ReceiverDiagnostics {
  uniqueFrames: number; duplicateFrames: number; expectedFrames: number; progress: number;
  goodput: number; estimatedSeconds?: number; cameraStatus: string; advice?: string;
}
export interface OpticalReceiverController { stop(reason?: string): void }
export interface QrScannerOptions {
  intent: ScannerIntent;
  onProgress: (diagnostics: ReceiverDiagnostics) => void;
  onComplete: (file: OpticalFile) => void;
  onCheckpoint: (value: string) => void;
  onUnsupported: (message: string) => void;
  onLocationDetected: (sessionIdentity: string) => boolean;
  onError: (error: Error) => void;
}

async function openCamera(): Promise<MediaStream> {
  const candidates: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, frameRate: { exact: 30 } } },
    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, frameRate: { ideal: 30 } } },
    { audio: false, video: { facingMode: { ideal: 'environment' } } },
    { audio: false, video: true },
  ];
  let lastError: unknown;
  for (const constraints of candidates) {
    try { return await navigator.mediaDevices.getUserMedia(constraints); }
    catch (error) { lastError = error; if (error instanceof DOMException && error.name === 'NotAllowedError') break; }
  }
  throw lastError ?? new Error('No camera is available.');
}

export async function startQrScanner(video: HTMLVideoElement, options: QrScannerOptions): Promise<OpticalReceiverController> {
  const stream = await openCamera();
  video.srcObject = stream; video.setAttribute('playsinline', ''); await video.play();
  let stopped = false; let frameId = 0; let animation = 0; let decoder: LTDecoder | undefined;
  let identity = ''; let expectedFnv = 0; let receivingLocation = false;
  const started = performance.now(); const noSignal = new NoSignalHintTimer(8000); noSignal.cameraStarted(started);
  const captureCanvas = document.createElement('canvas'); const context = captureCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) { stream.getTracks().forEach((track) => track.stop()); throw new Error('This browser cannot capture camera frames.'); }
  const sessions = new LocationSessionPolicy(); const reportedStatic = new Set<string>();

  const cleanup = () => {
    if (stopped) return;
    stopped = true; cancelAnimationFrame(animation); pool.resize(0);
    stream.getTracks().forEach((track) => track.stop()); video.pause(); video.srcObject = null;
  };
  const report = () => {
    const elapsed = Math.max(0.001, (performance.now() - started) / 1000); const unique = decoder?.framesNew ?? 0;
    const estimate = estimateTransferProgress(decoder?.k ?? 1, unique, elapsed, decoder?.solvedCount ?? 0);
    const waitingForLocation = options.intent === 'location' && !receivingLocation;
    options.onProgress({ uniqueFrames: unique, duplicateFrames: decoder?.framesDup ?? 0, expectedFrames: estimate.expectedFrames, progress: decoder ? estimate.fraction : 0, goodput: unique / elapsed, estimatedSeconds: estimate.etaSeconds, cameraStatus: receivingLocation ? 'Receiving animated location QR' : waitingForLocation ? 'Looking for an animated location QR' : 'Looking for a checkpoint QR', advice: noSignal.isVisible ? (receivingLocation || waitingForLocation ? 'No location frames yet: fill the frame, stabilize the phone, raise sender brightness, or lower sender density and FPS.' : 'No checkpoint QR detected yet. Fill the frame, hold steady, and improve lighting.') : undefined });
  };

  const pool = new DecodeWorkerPool(createDecodeWorker, (bytes) => {
    if (stopped) return;
    const classified = classifyDecodedQr(bytes);
    if (classified.kind === 'checkpoint') {
      if (receivingLocation || reportedStatic.has(classified.value)) return;
      reportedStatic.add(classified.value); options.onCheckpoint(classified.value); return;
    }
    if (classified.kind === 'unsupported') {
      if (receivingLocation || reportedStatic.has(classified.message)) return;
      reportedStatic.add(classified.message); options.onUnsupported(classified.message); return;
    }
    if (!sessions.shouldReceive(classified.sessionIdentity, options.intent, options.onLocationDetected)) {
      options.onProgress({ uniqueFrames: 0, duplicateFrames: 0, expectedFrames: 0, progress: 0, goodput: 0, cameraStatus: 'Looking for a checkpoint QR', advice: 'Location QR ignored. Continue scanning the static checkpoint QR.' }); return;
    }
    receivingLocation = true;
    const parsed = parseFrame(classified.bytes); if (!parsed) return;
    noSignal.frameDecoded(); const nextIdentity = streamIdentity(parsed.header);
    if (!decoder || nextIdentity !== identity) { identity = nextIdentity; expectedFnv = parsed.header.payloadFnv; decoder = new LTDecoder(parsed.header.k, parsed.header.blockLen, parsed.header.sessionId, parsed.header.totalLen); }
    decoder.addFrame(parsed.header.seq, parsed.block); report();
    if (!decoder.isComplete) return;
    const container = decoder.assemble();
    if (!container || fnv1a(container) !== expectedFnv) { cleanup(); options.onError(new Error('The optical payload checksum did not match. Restart the transfer.')); return; }
    cleanup(); void unpackFile(container).then(options.onComplete).catch((error: unknown) => options.onError(error instanceof Error ? error : new Error(String(error))));
  });
  pool.resize(Math.max(1, Math.min(2, navigator.hardwareConcurrency || 1)));

  const capture = () => {
    if (stopped) return;
    if (noSignal.tick(performance.now())) report();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && pool.busyCount < pool.size) {
      const scale = Math.min(1, 1280 / Math.max(1, video.videoWidth)); const width = Math.max(1, Math.round(video.videoWidth * scale)); const height = Math.max(1, Math.round(video.videoHeight * scale));
      if (captureCanvas.width !== width || captureCanvas.height !== height) { captureCanvas.width = width; captureCanvas.height = height; }
      context.drawImage(video, 0, 0, width, height); const image = context.getImageData(0, 0, width, height);
      pool.submit({ id: frameId++, buf: image.data.buffer, w: width, h: height }, [image.data.buffer]);
    }
    animation = requestAnimationFrame(capture);
  };
  animation = requestAnimationFrame(capture); report();
  return { stop: cleanup };
}

/** Backward-compatible Decimen-only entry point. */
export async function startOpticalReceiver(video: HTMLVideoElement, onProgress: QrScannerOptions['onProgress'], onComplete: QrScannerOptions['onComplete'], onError: QrScannerOptions['onError']): Promise<OpticalReceiverController> {
  return startQrScanner(video, { intent: 'location', onProgress, onComplete, onError, onCheckpoint: () => undefined, onUnsupported: () => undefined, onLocationDetected: () => true });
}
