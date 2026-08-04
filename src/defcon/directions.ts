import type { NavPack, Point } from '../types';

// Which floor a point sits on, from the poster layout: Floors 2/3 occupy the
// right ~45% of the canvas (Floor 2 top, Floor 3 bottom); Floor 1 is the rest.
function floorOf(point: Point): 1 | 2 | 3 {
  if (point.x > 0.56) return point.y < 0.52 ? 2 : 3;
  return 1;
}

// Floor 1 hall bands by poster y (see docs/research/lvcc-maps.md).
function hallOf(point: Point): string | null {
  if (floorOf(point) !== 1) return null;
  if (point.x < 0.205) return null; // west atrium/concourse, not inside a hall block
  if (point.y < 0.30) return 'Hall 4';
  if (point.y < 0.505) return 'Hall 3 (Tracks)';
  if (point.y < 0.68) return 'Hall 2 (Villages)';
  return 'Hall 1 (Contests)';
}

/** Succinct step-by-step walking directions for a computed route. */
export function buildDirections(pack: NavPack, routeNodeIds: string[], fromCheckpointId: string, toCheckpointId: string): string[] {
  const nodes = new Map(pack.nodes.map((node) => [node.id, node]));
  const byRouteNode = new Map(pack.checkpoints.map((item) => [item.routeNodeId, item]));
  const from = pack.checkpoints.find((item) => item.id === fromCheckpointId);
  const to = pack.checkpoints.find((item) => item.id === toCheckpointId);
  if (!from || !to || routeNodeIds.length < 2) return [];

  const points = routeNodeIds.map((id) => nodes.get(id)).filter((point): point is NonNullable<typeof point> => Boolean(point));
  const steps: string[] = [];
  const startFloor = floorOf(points[0]);
  const endFloor = floorOf(points[points.length - 1]);
  steps.push(`Start at ${from.label}${startFloor !== endFloor ? ` (Floor ${startFloor})` : ''}.`);

  let index = 0;
  while (index < points.length - 1) {
    const floor = floorOf(points[index]);
    let end = index;
    while (end < points.length - 1 && floorOf(points[end + 1]) === floor) end++;
    const segment = points.slice(index, end + 1);
    const isLast = end >= points.length - 1;

    if (!isLast) {
      // Segment ends at an escalator landing — name it if it's a checkpoint.
      // A single-node segment means we're already standing on the landing.
      if (segment.length > 1) {
        const landing = byRouteNode.get(routeNodeIds[end]);
        const halls = [...new Set(segment.map(hallOf).filter(Boolean))];
        if (halls.length > 1) steps.push(`Walk through ${halls.join(', then ')} to ${landing?.label ?? 'the escalators'}.`);
        else steps.push(`Walk to ${landing?.label ?? 'the escalators'}.`);
      }
      const nextFloor = floorOf(points[end + 1]);
      steps.push(`Take the escalators ${nextFloor > floor ? 'up' : 'down'} to Floor ${nextFloor}.`);
      index = end + 1;
      continue;
    }

    // Final segment → destination.
    const halls = [...new Set(segment.map(hallOf).filter(Boolean))];
    const startHall = hallOf(segment[0]);
    const passed = halls.filter((hall) => hall !== startHall);
    if (passed.length > 0) steps.push(`Walk through ${passed.join(', then ')} to ${to.label}.`);
    else steps.push(`Follow the corridor to ${to.label}.`);
    index = end + 1;
  }

  steps.push(`You've arrived — look for ${to.label} (${to.shortCode}).`);
  return steps;
}
