import type { NavPack } from '../types';
import { nearestNode } from './geometry';
import { slugify } from './id';

export function validateNavPack(value: unknown): NavPack {
  if (!value || typeof value !== 'object') throw new Error('This file is not a valid navpack.');
  const pack = value as Partial<NavPack>;
  if (pack.version !== 1) throw new Error(`Unsupported navpack version: ${String(pack.version)}.`);
  if (!pack.event || typeof pack.event.id !== 'string' || typeof pack.event.name !== 'string') throw new Error('The navpack is missing valid event information.');
  if (!pack.floor || typeof pack.floor.imageDataUrl !== 'string' || !pack.floor.imageDataUrl.startsWith('data:image/')) throw new Error('The navpack is missing an embedded floor-plan image.');
  if (!Number.isFinite(pack.floor.imageWidth) || !Number.isFinite(pack.floor.imageHeight)) throw new Error('The floor-plan dimensions are invalid.');
  for (const key of ['nodes', 'edges', 'destinations', 'checkpoints'] as const) if (!Array.isArray(pack[key])) throw new Error(`The navpack is missing ${key}.`);
  const nodeIds = new Set(pack.nodes!.map((node) => node.id));
  if (pack.edges!.some((edge) => !nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId))) throw new Error('The navpack contains an edge connected to a missing node.');
  if (pack.destinations!.some((item) => !nodeIds.has(item.routeNodeId)) || pack.checkpoints!.some((item) => !nodeIds.has(item.routeNodeId))) throw new Error('The navpack contains a destination or checkpoint connected to a missing node.');
  return pack as NavPack;
}

export function serializeNavPack(pack: NavPack): string { return JSON.stringify(validateNavPack(pack)); }
export function parseNavPack(text: string): NavPack {
  try { return validateNavPack(JSON.parse(text)); }
  catch (error) { if (error instanceof SyntaxError) throw new Error('This file is not valid JSON.'); throw error; }
}

export function downloadNavPack(pack: NavPack): void {
  const blob = new Blob([serializeNavPack(pack)], { type: 'application/x-navpack' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${slugify(pack.event.name)}.navpack`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function deleteNodeSafely(pack: NavPack, nodeId: string): { pack: NavPack; reassociated: number } {
  const nodes = pack.nodes.filter((node) => node.id !== nodeId);
  let reassociated = 0;
  const destinations = pack.destinations.flatMap((item) => {
    if (item.routeNodeId !== nodeId) return [item];
    const replacement = nearestNode(item, nodes, pack.floor.imageWidth, pack.floor.imageHeight);
    if (!replacement) return [];
    reassociated += 1; return [{ ...item, routeNodeId: replacement.id }];
  });
  const checkpoints = pack.checkpoints.flatMap((item) => {
    if (item.routeNodeId !== nodeId) return [item];
    const replacement = nearestNode(item, nodes, pack.floor.imageWidth, pack.floor.imageHeight);
    if (!replacement) return [];
    reassociated += 1; return [{ ...item, routeNodeId: replacement.id }];
  });
  return { pack: { ...pack, nodes, edges: pack.edges.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId), destinations, checkpoints }, reassociated };
}
