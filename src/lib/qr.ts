const PROTOCOL = 'navpack';

export interface QrPayload { version: 1; eventId: string; checkpointCode: string }

export function makeQrPayload(eventId: string, checkpointCode: string): string {
  return `${PROTOCOL}://v1/${encodeURIComponent(eventId)}/${encodeURIComponent(checkpointCode)}`;
}

export function parseQrPayload(payload: string, expectedEventId?: string): QrPayload {
  let url: URL;
  try { url = new URL(payload); } catch { throw new Error('This is not a valid Waypoint checkpoint code.'); }
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (url.protocol !== `${PROTOCOL}:` || url.hostname !== 'v1' || parts.length !== 2) throw new Error('This QR code uses an unsupported checkpoint format.');
  const [eventId, checkpointCode] = parts;
  if (!eventId || !checkpointCode) throw new Error('This checkpoint code is incomplete.');
  if (expectedEventId && eventId !== expectedEventId) throw new Error('This checkpoint belongs to a different event.');
  return { version: 1, eventId, checkpointCode };
}
