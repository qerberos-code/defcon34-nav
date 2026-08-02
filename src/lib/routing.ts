import type { NavPack, Point } from '../types';
import { imagePixelDistance } from './geometry';

export interface RouteResult { nodeIds: string[]; points: Point[]; distanceMeters: number | null; approximateUnits: number }

export function shortestRoute(pack: NavPack, startNodeId: string, endNodeId: string): RouteResult | null {
  if (!pack.nodes.some((node) => node.id === startNodeId) || !pack.nodes.some((node) => node.id === endNodeId)) return null;
  const nodes = new Map(pack.nodes.map((node) => [node.id, node]));
  const distances = new Map(pack.nodes.map((node) => [node.id, Infinity]));
  const previous = new Map<string, string>();
  const unvisited = new Set(nodes.keys());
  distances.set(startNodeId, 0);

  while (unvisited.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const id of unvisited) {
      const candidate = distances.get(id) ?? Infinity;
      if (candidate < best) { best = candidate; current = id; }
    }
    if (!current || best === Infinity) break;
    unvisited.delete(current);
    if (current === endNodeId) break;
    for (const edge of pack.edges) {
      const neighbor = edge.fromNodeId === current ? edge.toNodeId : edge.toNodeId === current ? edge.fromNodeId : undefined;
      if (!neighbor || !unvisited.has(neighbor)) continue;
      const a = nodes.get(current)!;
      const b = nodes.get(neighbor)!;
      const weight = imagePixelDistance(a, b, pack.floor.imageWidth, pack.floor.imageHeight);
      const alternate = best + weight;
      if (alternate < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, alternate);
        previous.set(neighbor, current);
      }
    }
  }

  const total = distances.get(endNodeId) ?? Infinity;
  if (total === Infinity) return null;
  const nodeIds = [endNodeId];
  while (nodeIds[0] !== startNodeId) {
    const predecessor = previous.get(nodeIds[0]);
    if (!predecessor) return null;
    nodeIds.unshift(predecessor);
  }
  return {
    nodeIds,
    points: nodeIds.map((id) => nodes.get(id)!),
    distanceMeters: pack.floor.calibration ? total * pack.floor.calibration.metersPerImagePixel : null,
    approximateUnits: total / Math.max(pack.floor.imageWidth, pack.floor.imageHeight),
  };
}
