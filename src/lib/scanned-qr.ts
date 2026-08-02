import { parseFrame, streamIdentity } from '../decimen/shared/protocol';
import type { NavPack } from '../types';
import { parseQrPayload, type QrPayload } from './qr';

export type ScannerIntent = 'location' | 'checkpoint';

export type ClassifiedQr =
  | { kind: 'location-frame'; bytes: Uint8Array; sessionIdentity: string }
  | { kind: 'checkpoint'; value: string; payload: QrPayload }
  | { kind: 'unsupported'; message: string };

export type CheckpointScanResolution =
  | { kind: 'matched'; checkpointId: string; label: string }
  | { kind: 'missing-location'; message: string }
  | { kind: 'different-location'; message: string }
  | { kind: 'unknown-checkpoint'; message: string };

const utf8 = new TextDecoder('utf-8', { fatal: true });

export function classifyDecodedQr(bytes: Uint8Array): ClassifiedQr {
  const frame = parseFrame(bytes);
  if (frame) return { kind: 'location-frame', bytes, sessionIdentity: streamIdentity(frame.header) };
  let value: string;
  try { value = utf8.decode(bytes).trim(); }
  catch { return { kind: 'unsupported', message: 'This QR code is not a supported Waypoint code.' }; }
  if (!value) return { kind: 'unsupported', message: 'This QR code is empty.' };
  try { return { kind: 'checkpoint', value, payload: parseQrPayload(value) }; }
  catch { return { kind: 'unsupported', message: 'This QR code is not a supported Waypoint location or checkpoint QR.' }; }
}

export function resolveCheckpointScan(pack: NavPack | undefined, payload: QrPayload): CheckpointScanResolution {
  if (!pack) return { kind: 'missing-location', message: 'This is a checkpoint QR. First scan the organizer\'s animated location QR or import its .navpack, then scan this checkpoint again.' };
  if (payload.eventId !== pack.event.id) return { kind: 'different-location', message: 'This checkpoint belongs to a different location. Scan that location\'s animated location QR first.' };
  const checkpoint = pack.checkpoints.find((item) => item.shortCode === payload.checkpointCode || item.id === payload.checkpointCode);
  if (!checkpoint) return { kind: 'unknown-checkpoint', message: 'This checkpoint is not included in the loaded location.' };
  return { kind: 'matched', checkpointId: checkpoint.id, label: checkpoint.label };
}

export class LocationSessionPolicy {
  private readonly accepted = new Set<string>();
  private readonly ignored = new Set<string>();

  shouldReceive(identity: string, intent: ScannerIntent, confirmSwitch: (identity: string) => boolean): boolean {
    if (intent === 'location' || this.accepted.has(identity)) return true;
    if (this.ignored.has(identity)) return false;
    if (confirmSwitch(identity)) { this.accepted.add(identity); return true; }
    this.ignored.add(identity);
    return false;
  }
}
