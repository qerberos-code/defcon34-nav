import type { NavPack } from '../types';

export type NavPackReadinessMode = 'map-only' | 'partial-navigation' | 'complete-navigation';

export type NavPackReadinessIssueCode =
  | 'missing-floor-plan'
  | 'missing-route-points'
  | 'missing-route-segments'
  | 'missing-checkpoints'
  | 'isolated-intermediate-points'
  | 'isolated-checkpoints';

export interface NavPackReadinessIssue {
  code: NavPackReadinessIssueCode;
  message: string;
  count?: number;
}

export interface NavPackReadiness {
  mode: NavPackReadinessMode;
  shareable: boolean;
  counts: {
    routePoints: number;
    routeSegments: number;
    checkpoints: number;
    reachableCheckpoints: number;
  };
  reachableCheckpointIds: string[];
  isolatedCheckpointIds: string[];
  issues: NavPackReadinessIssue[];
}

function connectedComponents(pack: NavPack): Map<string, number> {
  const neighbors = new Map(pack.nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of pack.edges) {
    neighbors.get(edge.fromNodeId)?.add(edge.toNodeId);
    neighbors.get(edge.toNodeId)?.add(edge.fromNodeId);
  }
  const components = new Map<string, number>();
  let component = 0;
  for (const node of pack.nodes) {
    if (components.has(node.id)) continue;
    const pending = [node.id];
    components.set(node.id, component);
    while (pending.length) {
      const current = pending.pop()!;
      for (const neighbor of neighbors.get(current) ?? []) {
        if (components.has(neighbor)) continue;
        components.set(neighbor, component);
        pending.push(neighbor);
      }
    }
    component += 1;
  }
  return components;
}

export function analyzeNavPackReadiness(pack: NavPack): NavPackReadiness {
  const hasFloorPlan = pack.floor.imageDataUrl.startsWith('data:image/');
  // Legacy destinations remain in NavPack v1, but do not affect capability.
  const hasNavigationContent = Boolean(pack.nodes.length || pack.edges.length || pack.checkpoints.length);
  const issues: NavPackReadinessIssue[] = [];

  if (!hasFloorPlan) issues.push({ code: 'missing-floor-plan', message: 'Add a floor plan before sharing.' });
  if (hasNavigationContent && !pack.nodes.length) issues.push({ code: 'missing-route-points', message: 'Navigation content has no route points.' });
  if (hasNavigationContent && !pack.edges.length) issues.push({ code: 'missing-route-segments', message: 'No route segments connect the checkpoints or intermediate points.' });
  if (hasNavigationContent && !pack.checkpoints.length) issues.push({ code: 'missing-checkpoints', message: 'No checkpoints are available as route endpoints.' });

  const connectedNodeIds = new Set(pack.edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]));
  const checkpointNodeIds = new Set(pack.checkpoints.map((checkpoint) => checkpoint.routeNodeId));
  const isolatedIntermediateCount = pack.nodes.filter((node) => !checkpointNodeIds.has(node.id) && !connectedNodeIds.has(node.id)).length;
  if (isolatedIntermediateCount) issues.push({
    code: 'isolated-intermediate-points',
    count: isolatedIntermediateCount,
    message: `${isolatedIntermediateCount} unused intermediate ${isolatedIntermediateCount === 1 ? 'point is' : 'points are'} not connected by a segment.`,
  });

  const components = connectedComponents(pack);
  const checkpointCountsByComponent = new Map<number, number>();
  for (const checkpoint of pack.checkpoints) {
    const component = components.get(checkpoint.routeNodeId);
    if (component !== undefined) checkpointCountsByComponent.set(component, (checkpointCountsByComponent.get(component) ?? 0) + 1);
  }
  const reachableCheckpointIds = pack.checkpoints.filter((checkpoint) => {
    const component = components.get(checkpoint.routeNodeId);
    return component !== undefined && (checkpointCountsByComponent.get(component) ?? 0) > 1;
  }).map((checkpoint) => checkpoint.id);
  const reachableSet = new Set(reachableCheckpointIds);
  const isolatedCheckpointIds = pack.checkpoints.filter((checkpoint) => !reachableSet.has(checkpoint.id)).map((checkpoint) => checkpoint.id);
  if (isolatedCheckpointIds.length) issues.push({
    code: 'isolated-checkpoints',
    count: isolatedCheckpointIds.length,
    message: `${isolatedCheckpointIds.length} ${isolatedCheckpointIds.length === 1 ? 'checkpoint cannot' : 'checkpoints cannot'} reach another checkpoint.`,
  });

  const mode: NavPackReadinessMode = !hasNavigationContent
    ? 'map-only'
    : pack.checkpoints.length > 1 && reachableCheckpointIds.length === pack.checkpoints.length
      ? 'complete-navigation'
      : 'partial-navigation';

  return {
    mode,
    shareable: hasFloorPlan,
    counts: {
      routePoints: pack.nodes.length,
      routeSegments: pack.edges.length,
      checkpoints: pack.checkpoints.length,
      reachableCheckpoints: reachableCheckpointIds.length,
    },
    reachableCheckpointIds,
    isolatedCheckpointIds,
    issues,
  };
}

export function shareConfirmation(readiness: NavPackReadiness): string | null {
  if (readiness.mode === 'complete-navigation') return null;
  if (readiness.mode === 'map-only') return 'This package contains a floor plan only. Visitors can view the map, but checkpoint positioning and calculated routes will be unavailable. Publish map only?';
  const details = readiness.issues.map((issue) => `• ${issue.message}`).join('\n');
  return `This package has navigation limitations:\n\n${details}\n\nPublish anyway?`;
}
