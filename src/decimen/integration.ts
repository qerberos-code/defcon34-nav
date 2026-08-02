import type { NavPack } from '../types';
import { serializeNavPack, validateNavPack } from '../lib/navpack';
import { slugify } from '../lib/id';
import { MAX_FILE_BYTES, type OpticalFile, verifyFile } from './shared/protocol';
import { NAVPACK_MIME, type OpticalNavPack, type OpticalStartingCheckpoint } from './types';

const TRANSFER_CONTEXT = '_waypointTransfer';
interface TransferContext { version: 1; checkpointId: string }
type TransferredNavPack = NavPack & { [TRANSFER_CONTEXT]?: TransferContext };

function decodeTransferredNavPack(bytes: Uint8Array): { pack: NavPack; startingCheckpoint?: OpticalStartingCheckpoint } {
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('The received navpack is not valid JSON.'); }
  const context = value && typeof value === 'object' ? (value as TransferredNavPack)[TRANSFER_CONTEXT] as unknown : undefined;
  const pack = validateNavPack(value);
  if (context === undefined) return { pack };
  if (!context || typeof context !== 'object' || (context as Partial<TransferContext>).version !== 1 || typeof (context as Partial<TransferContext>).checkpointId !== 'string') {
    throw new Error('The optical starting-checkpoint hint is invalid.');
  }
  const checkpoint = pack.checkpoints.find((item) => item.id === (context as TransferContext).checkpointId);
  if (!checkpoint) throw new Error('The optical starting checkpoint is not included in this navpack.');
  return { pack, startingCheckpoint: { id: checkpoint.id, label: checkpoint.label, shortCode: checkpoint.shortCode } };
}

export function createOpticalNavPack(pack: NavPack, checkpointId?: string): OpticalNavPack {
  const checkpoint = checkpointId ? pack.checkpoints.find((item) => item.id === checkpointId) : undefined;
  if (checkpointId && !checkpoint) throw new Error('Choose a starting checkpoint included in this event.');
  const canonical = validateNavPack(pack);
  const serialized = checkpoint ? JSON.stringify({ ...canonical, [TRANSFER_CONTEXT]: { version: 1, checkpointId: checkpoint.id } }) : serializeNavPack(canonical);
  const bytes = new TextEncoder().encode(serialized);
  if (bytes.length > MAX_FILE_BYTES) throw new Error('This navpack is larger than Decimen’s 64 MB transfer limit. Use Download .navpack instead.');
  return {
    name: `${slugify(pack.event.name)}.navpack`,
    mimeType: NAVPACK_MIME,
    bytes,
    startingCheckpoint: checkpoint ? { id: checkpoint.id, label: checkpoint.label, shortCode: checkpoint.shortCode } : undefined,
  };
}

export function canonicalizeOpticalNavPack(file: OpticalNavPack): OpticalNavPack {
  const { pack } = decodeTransferredNavPack(file.bytes);
  return { name: file.name, mimeType: NAVPACK_MIME, bytes: new TextEncoder().encode(serializeNavPack(pack)) };
}

export async function validateReceivedNavPack(file: OpticalFile): Promise<{ pack: NavPack; file: OpticalNavPack; startingCheckpoint?: OpticalStartingCheckpoint }> {
  if (file.type !== NAVPACK_MIME || !file.name.toLowerCase().endsWith('.navpack')) {
    throw new Error('Waypoint only receives .navpack files with the application/x-navpack media type.');
  }
  if (!await verifyFile(file)) throw new Error('The received navpack failed SHA-256 verification. Restart the transfer.');
  const { pack, startingCheckpoint } = decodeTransferredNavPack(file.bytes);
  return {
    pack,
    file: { name: file.name, mimeType: NAVPACK_MIME, bytes: new TextEncoder().encode(serializeNavPack(pack)) },
    startingCheckpoint,
  };
}

export function saveOpticalNavPack(file: OpticalNavPack): void {
  const canonical = canonicalizeOpticalNavPack(file);
  const url = URL.createObjectURL(new Blob([canonical.bytes as BlobPart], { type: NAVPACK_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
