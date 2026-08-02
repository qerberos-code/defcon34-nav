import QRCode from 'qrcode';
import type { OpticalNavPack } from './types';
import { LTEncoder } from './shared/fountain';
import { blockLength, fitsInOneStream, sourceBlockCount } from './shared/frame-capacity';
import { expectedFountainOverhead } from './shared/progress';
import { fnv1a, packFile, packFrame } from './shared/protocol';
import { rasterizeQr } from './shared/qr-raster';

export interface OpticalSenderSettings { frameBytes: number; fps: number; errorCorrection: 'L' | 'M' | 'Q' | 'H'; displaySize: number | 'auto' }
export interface OpticalSenderDiagnostics { frame: number; originalSize: number; transmittedSize: number; compression: 'none' | 'gzip'; estimatedSeconds: number; sourceBlocks: number }
export interface OpticalSenderController { stop(): void }

export async function startOpticalSender(
  payload: OpticalNavPack,
  canvas: HTMLCanvasElement,
  settings: OpticalSenderSettings,
  onFrame: (diagnostics: OpticalSenderDiagnostics) => void,
): Promise<OpticalSenderController> {
  const packed = await packFile(payload.name, payload.mimeType, payload.bytes);
  if (!fitsInOneStream(packed.container.length, settings.frameBytes)) throw new Error('This frame density cannot address the entire navpack. Increase bytes per frame.');
  const sessionId = crypto.getRandomValues(new Uint16Array(1))[0]!;
  const payloadFnv = fnv1a(packed.container);
  const encoder = new LTEncoder(packed.container, blockLength(settings.frameBytes), sessionId);
  const expectedFrames = Math.ceil(sourceBlockCount(packed.container.length, settings.frameBytes) * expectedFountainOverhead(encoder.k));
  const estimatedSeconds = expectedFrames / settings.fps;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('This browser cannot draw the optical stream.');
  context.imageSmoothingEnabled = false;
  let stopped = false;
  let seq = 0;
  let animation = 0;
  let nextAt = performance.now();
  let qrVersion: number | undefined;

  const draw = (now: number) => {
    if (stopped) return;
    if (now < nextAt) { animation = requestAnimationFrame(draw); return; }
    const block = encoder.encode(seq);
    const frame = packFrame({ sessionId, seq, k: encoder.k, blockLen: encoder.blockLen, totalLen: packed.container.length, payloadFnv }, block);
    const qr = QRCode.create([{ data: frame, mode: 'byte' }], { errorCorrectionLevel: settings.errorCorrection, maskPattern: 4, version: qrVersion });
    qrVersion ??= qr.version;
    const raster = rasterizeQr(qr.modules.size, qr.modules.data, 4);
    const image = new ImageData(new Uint8ClampedArray(raster.pixels.buffer), raster.size, raster.size);
    const side = settings.displaySize === 'auto' ? Math.max(256, Math.min(innerWidth, innerHeight) - 48) : settings.displaySize;
    canvas.width = side;
    canvas.height = side;
    const scratch = document.createElement('canvas');
    scratch.width = raster.size;
    scratch.height = raster.size;
    scratch.getContext('2d')!.putImageData(image, 0, 0);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, side, side);
    context.drawImage(scratch, 0, 0, side, side);
    onFrame({ frame: seq + 1, originalSize: packed.originalSize, transmittedSize: packed.transmittedSize, compression: packed.compression, estimatedSeconds, sourceBlocks: encoder.k });
    seq = (seq + 1) >>> 0;
    nextAt += 1000 / settings.fps;
    if (nextAt < now - 1000) nextAt = now;
    animation = requestAnimationFrame(draw);
  };
  animation = requestAnimationFrame(draw);
  return { stop: () => { stopped = true; cancelAnimationFrame(animation); context.clearRect(0, 0, canvas.width, canvas.height); } };
}
