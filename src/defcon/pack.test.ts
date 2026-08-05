import { describe, expect, it } from 'vitest';
import { validateNavPack } from '../lib/navpack';
import { assemblePack, DEFCON_EVENT_ID } from './pack';

const fixture = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

describe('defcon34 pack', () => {
  it('assembles a pack that passes navpack validation', () => {
    expect(() => validateNavPack(assemblePack(fixture))).not.toThrow();
    const pack = assemblePack(fixture);
    expect(pack.event.id).toBe(DEFCON_EVENT_ID);
    expect(pack.destinations).toEqual([]);
  });

  it('connects every checkpoint to Registration through the route graph', () => {
    const pack = assemblePack(fixture);
    const registration = pack.checkpoints.find((checkpoint) => checkpoint.shortCode === 'REG');
    expect(registration).toBeDefined();
    const adjacency = new Map<string, string[]>();
    for (const edge of pack.edges) {
      adjacency.set(edge.fromNodeId, [...(adjacency.get(edge.fromNodeId) ?? []), edge.toNodeId]);
      adjacency.set(edge.toNodeId, [...(adjacency.get(edge.toNodeId) ?? []), edge.fromNodeId]);
    }
    const reached = new Set([registration!.routeNodeId]);
    const queue = [registration!.routeNodeId];
    while (queue.length) for (const neighbor of adjacency.get(queue.shift()!) ?? []) if (!reached.has(neighbor)) { reached.add(neighbor); queue.push(neighbor); }
    for (const checkpoint of pack.checkpoints) expect(reached.has(checkpoint.routeNodeId), `${checkpoint.label} is unreachable from Registration`).toBe(true);
  });

  it('uses unique shortCodes and only references existing nodes', () => {
    const pack = assemblePack(fixture);
    const shortCodes = pack.checkpoints.map((checkpoint) => checkpoint.shortCode);
    expect(new Set(shortCodes).size).toBe(shortCodes.length);
    const nodeIds = new Set(pack.nodes.map((node) => node.id));
    expect(nodeIds.size).toBe(pack.nodes.length);
    for (const edge of pack.edges) { expect(nodeIds.has(edge.fromNodeId)).toBe(true); expect(nodeIds.has(edge.toNodeId)).toBe(true); }
    for (const checkpoint of pack.checkpoints) expect(nodeIds.has(checkpoint.routeNodeId)).toBe(true);
  });
});
