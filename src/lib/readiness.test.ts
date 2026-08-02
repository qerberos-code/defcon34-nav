import { describe, expect, it } from 'vitest';
import { createDemoPack } from '../demo';
import { analyzeNavPackReadiness, shareConfirmation } from './readiness';

function mapOnlyPack() {
  return { ...createDemoPack(), nodes: [], edges: [], destinations: [], checkpoints: [] };
}

describe('checkpoint-centric navpack readiness', () => {
  it('classifies a floor plan without navigation data as map only', () => {
    const readiness = analyzeNavPackReadiness(mapOnlyPack());
    expect(readiness.mode).toBe('map-only');
    expect(readiness.shareable).toBe(true);
    expect(readiness.issues).toEqual([]);
    expect(shareConfirmation(readiness)).toMatch(/Publish map only/);
  });

  it('classifies the connected demo checkpoints as complete navigation', () => {
    const readiness = analyzeNavPackReadiness(createDemoPack());
    expect(readiness.mode).toBe('complete-navigation');
    expect(readiness.counts.reachableCheckpoints).toBe(readiness.counts.checkpoints);
    expect(readiness.isolatedCheckpointIds).toEqual([]);
    expect(shareConfirmation(readiness)).toBeNull();
  });

  it('reports a checkpoint that cannot reach another checkpoint', () => {
    const pack = createDemoPack();
    pack.nodes.push({ id: 'isolated', x: .02, y: .02 });
    pack.checkpoints.push({ id: 'isolated-checkpoint', label: 'Remote sign', shortCode: 'REMOTE', routeNodeId: 'isolated', x: .02, y: .02 });
    const readiness = analyzeNavPackReadiness(pack);
    expect(readiness.mode).toBe('partial-navigation');
    expect(readiness.isolatedCheckpointIds).toEqual(['isolated-checkpoint']);
    expect(readiness.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'isolated-checkpoints', count: 1 })]));
  });

  it('allows multiple disconnected groups when each checkpoint can reach a peer', () => {
    const pack = createDemoPack();
    pack.nodes.push({ id: 'wing-a', x: .02, y: .02 }, { id: 'wing-b', x: .08, y: .02 });
    pack.edges.push({ id: 'wing-edge', fromNodeId: 'wing-a', toNodeId: 'wing-b', accessible: true });
    pack.checkpoints.push(
      { id: 'wing-checkpoint-a', label: 'Remote A', shortCode: 'RA', routeNodeId: 'wing-a', x: .02, y: .02 },
      { id: 'wing-checkpoint-b', label: 'Remote B', shortCode: 'RB', routeNodeId: 'wing-b', x: .08, y: .02 },
    );
    expect(analyzeNavPackReadiness(pack).mode).toBe('complete-navigation');
  });

  it('treats a single checkpoint as partial navigation', () => {
    const pack = createDemoPack();
    pack.checkpoints = [pack.checkpoints[0]!];
    const readiness = analyzeNavPackReadiness(pack);
    expect(readiness.mode).toBe('partial-navigation');
    expect(readiness.isolatedCheckpointIds).toEqual(['c-registration']);
  });

  it('reports unused intermediate points without blocking a complete checkpoint network', () => {
    const pack = createDemoPack();
    pack.nodes.push({ id: 'unused', x: .02, y: .02 });
    const readiness = analyzeNavPackReadiness(pack);
    expect(readiness.mode).toBe('complete-navigation');
    expect(readiness.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'isolated-intermediate-points', count: 1 })]));
  });

  it('reports zero-edge packages without blocking sharing', () => {
    const pack = createDemoPack(); pack.edges = [];
    const readiness = analyzeNavPackReadiness(pack);
    expect(readiness.mode).toBe('partial-navigation');
    expect(readiness.shareable).toBe(true);
    expect(readiness.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing-route-segments' }),
      expect.objectContaining({ code: 'isolated-checkpoints' }),
    ]));
    expect(shareConfirmation(readiness)).toMatch(/Publish anyway/);
  });

  it('blocks sharing until a floor plan exists', () => {
    const pack = mapOnlyPack(); pack.floor.imageDataUrl = '';
    const readiness = analyzeNavPackReadiness(pack);
    expect(readiness.shareable).toBe(false);
    expect(readiness.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-floor-plan' })]));
  });
});
