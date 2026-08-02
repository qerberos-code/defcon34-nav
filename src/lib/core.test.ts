import { describe, expect, it } from 'vitest';
import { createDemoPack } from '../demo';
import { calibrate, imagePixelDistance } from './geometry';
import { deleteNodeSafely, parseNavPack, serializeNavPack, validateNavPack } from './navpack';
import { makeQrPayload, parseQrPayload } from './qr';
import { shortestRoute } from './routing';

describe('routing', () => {
  it('returns the expected shortest route', () => {
    const pack = createDemoPack(); const result = shortestRoute(pack, 'n1', 'n7');
    expect(result?.nodeIds).toEqual(['n1', 'n2', 'n3', 'n6', 'n7']);
    expect(result?.distanceMeters).toBeGreaterThan(0);
  });
  it('returns null for disconnected destinations', () => {
    const pack = createDemoPack(); pack.edges = pack.edges.filter((edge) => edge.fromNodeId !== 'n1' && edge.toNodeId !== 'n1');
    expect(shortestRoute(pack, 'n1', 'n7')).toBeNull();
  });
});

describe('geometry', () => {
  it('corrects distance for image aspect ratio', () => {
    expect(imagePixelDistance({ x: 0, y: 0 }, { x: .5, y: .5 }, 1000, 500)).toBeCloseTo(Math.hypot(500, 250));
    expect(calibrate({ x: 0, y: 0 }, { x: .5, y: 0 }, 50, 1000, 500)).toBe(.1);
  });
});

describe('navpack format', () => {
  it('round trips an exported package', () => { const pack = createDemoPack(); expect(parseNavPack(serializeNavPack(pack))).toEqual(pack); });
  it('rejects an invalid version', () => { const pack = { ...createDemoPack(), version: 2 }; expect(() => validateNavPack(pack)).toThrow(/Unsupported/); });
  it('deleting a node leaves no orphaned references', () => {
    const result = deleteNodeSafely(createDemoPack(), 'n1').pack; const ids = new Set(result.nodes.map((node) => node.id));
    expect(result.edges.every((edge) => ids.has(edge.fromNodeId) && ids.has(edge.toNodeId))).toBe(true);
    expect([...result.destinations, ...result.checkpoints].every((item) => ids.has(item.routeNodeId))).toBe(true);
  });
});

describe('QR payloads', () => {
  it('parses a valid checkpoint payload', () => { expect(parseQrPayload(makeQrPayload('event 1', 'REG'))).toEqual({ version: 1, eventId: 'event 1', checkpointCode: 'REG' }); });
  it('rejects another event', () => { expect(() => parseQrPayload(makeQrPayload('event-a', 'REG'), 'event-b')).toThrow(/different event/); });
});
