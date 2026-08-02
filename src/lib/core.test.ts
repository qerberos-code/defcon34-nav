import { describe, expect, it } from 'vitest';
import { createDemoPack } from '../demo';
import { calibrate, imagePixelDistance } from './geometry';
import { addCheckpointNode, deleteNodeSafely, moveRouteNode, parseNavPack, removeCheckpoint, serializeNavPack, validateNavPack } from './navpack';
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
  it('round trips a map-only package with empty navigation arrays', () => {
    const pack = { ...createDemoPack(), nodes: [], edges: [], destinations: [], checkpoints: [] };
    expect(parseNavPack(serializeNavPack(pack))).toEqual(pack);
  });
  it('preserves event and checkpoint identities when reopened for editing', () => {
    const pack = createDemoPack(); const imported = parseNavPack(serializeNavPack(pack));
    expect(imported.event.id).toBe(pack.event.id);
    expect(imported.checkpoints.map(({ id, shortCode }) => ({ id, shortCode }))).toEqual(pack.checkpoints.map(({ id, shortCode }) => ({ id, shortCode })));
  });
  it('preserves legacy destination records through a navpack round trip', () => {
    const pack = createDemoPack();
    expect(parseNavPack(serializeNavPack(pack)).destinations).toEqual(pack.destinations);
  });
  it('strips transient optical transfer metadata during ordinary parsing', () => {
    const pack = { ...createDemoPack(), _waypointTransfer: { version: 1, checkpointId: 'c-registration' } };
    expect(parseNavPack(JSON.stringify(pack))).not.toHaveProperty('_waypointTransfer');
  });
  it('rejects an invalid version', () => { const pack = { ...createDemoPack(), version: 2 }; expect(() => validateNavPack(pack)).toThrow(/Unsupported/); });
  it('deleting a node leaves no orphaned references', () => {
    const result = deleteNodeSafely(createDemoPack(), 'n1').pack; const ids = new Set(result.nodes.map((node) => node.id));
    expect(result.edges.every((edge) => ids.has(edge.fromNodeId) && ids.has(edge.toNodeId))).toBe(true);
    expect([...result.destinations, ...result.checkpoints].every((item) => ids.has(item.routeNodeId))).toBe(true);
  });
  it('creates a checkpoint and backing route point atomically', () => {
    const pack = createDemoPack();
    const next = addCheckpointNode(pack, { id: 'c-new', label: 'North Door', shortCode: 'NORTH', x: .2, y: .3 }, 'n-new');
    expect(next.nodes).toContainEqual({ id: 'n-new', x: .2, y: .3 });
    expect(next.checkpoints).toContainEqual(expect.objectContaining({ id: 'c-new', routeNodeId: 'n-new', x: .2, y: .3 }));
  });
  it('keeps checkpoint and backing point coordinates synchronized', () => {
    const next = moveRouteNode(createDemoPack(), 'n1', { x: .22, y: .33 });
    expect(next.nodes.find((node) => node.id === 'n1')).toEqual({ id: 'n1', x: .22, y: .33 });
    expect(next.checkpoints.find((item) => item.id === 'c-registration')).toEqual(expect.objectContaining({ x: .22, y: .33 }));
  });
  it('can demote a checkpoint to an intermediate point', () => {
    const next = removeCheckpoint(createDemoPack(), 'c-registration', false);
    expect(next.checkpoints.some((item) => item.id === 'c-registration')).toBe(false);
    expect(next.nodes.some((node) => node.id === 'n1')).toBe(true);
    expect(next.edges.some((edge) => edge.fromNodeId === 'n1' || edge.toNodeId === 'n1')).toBe(true);
  });
  it('can delete a checkpoint with its backing point and connected segments', () => {
    const next = removeCheckpoint(createDemoPack(), 'c-registration', true);
    expect(next.checkpoints.some((item) => item.id === 'c-registration')).toBe(false);
    expect(next.nodes.some((node) => node.id === 'n1')).toBe(false);
    expect(next.edges.some((edge) => edge.fromNodeId === 'n1' || edge.toNodeId === 'n1')).toBe(false);
  });
});

describe('QR payloads', () => {
  it('parses a valid checkpoint payload', () => { expect(parseQrPayload(makeQrPayload('event 1', 'REG'))).toEqual({ version: 1, eventId: 'event 1', checkpointCode: 'REG' }); });
  it('rejects another event', () => { expect(() => parseQrPayload(makeQrPayload('event-a', 'REG'), 'event-b')).toThrow(/different event/); });
});
