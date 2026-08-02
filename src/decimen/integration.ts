import type { NavPack } from '../types';
import { parseNavPack, serializeNavPack } from '../lib/navpack';
import { slugify } from '../lib/id';
import { MAX_FILE_BYTES, type OpticalFile, verifyFile } from './shared/protocol';
import { NAVPACK_MIME, type OpticalNavPack } from './types';

export function createOpticalNavPack(pack: NavPack): OpticalNavPack {
  const bytes = new TextEncoder().encode(serializeNavPack(pack));
  if (bytes.length > MAX_FILE_BYTES) throw new Error('This navpack is larger than Decimen’s 64 MB transfer limit. Use Download .navpack instead.');
  return { name: `${slugify(pack.event.name)}.navpack`, mimeType: NAVPACK_MIME, bytes };
}

export async function validateReceivedNavPack(file: OpticalFile): Promise<{ pack: NavPack; file: OpticalNavPack }> {
  if (file.type !== NAVPACK_MIME || !file.name.toLowerCase().endsWith('.navpack')) {
    throw new Error('Waypoint only receives .navpack files with the application/x-navpack media type.');
  }
  if (!await verifyFile(file)) throw new Error('The received navpack failed SHA-256 verification. Restart the transfer.');
  const pack = parseNavPack(new TextDecoder().decode(file.bytes));
  return { pack, file: { name: file.name, mimeType: NAVPACK_MIME, bytes: file.bytes } };
}

export function saveOpticalNavPack(file: OpticalNavPack): void {
  const url = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: NAVPACK_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
