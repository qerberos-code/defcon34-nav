import type { Checkpoint, RouteEdge, RouteNode } from '../types';

// DEF CON 34 · LVCC West Hall — one poster image covering Floors 1–3.
// Coordinates are normalized 0–1 fractions of the full poster (see docs/research/lvcc-maps.md).
export const MAP_WIDTH = 3600;
export const MAP_HEIGHT = 2400;

type Floor = 1 | 2 | 3;

// --- Corridor spine nodes ---------------------------------------------------

const spineNodes: Record<Floor, RouteNode[]> = {
  // Floor 1 — wedge shape. Spine traced from the poster's actual white aisle bands
  // (300dpi crop check, 2026-08-04): a west-edge corridor left of the hall blocks,
  // plus horizontal aisles between the rows; f1-a*e nodes are the aisles' east ends.
  // f1-atrium doubles as the Floor 1 escalator landing.
  1: [
    { id: 'f1-s1', x: .20, y: .15 }, { id: 'f1-s2', x: .22, y: .22 },
    { id: 'f1-s3', x: .205, y: .437 }, { id: 'f1-s4', x: .215, y: .527 }, { id: 'f1-s5', x: .225, y: .592 },
    { id: 'f1-s6', x: .26, y: .710 }, { id: 'f1-s7', x: .29, y: .832 },
    { id: 'f1-a1e', x: .39, y: .44 }, { id: 'f1-a2e', x: .42, y: .53 }, { id: 'f1-a3e', x: .44, y: .59 },
    { id: 'f1-a4e', x: .46, y: .71 }, { id: 'f1-a5e', x: .48, y: .832 },
    { id: 'f1-atrium', x: .19, y: .60 },
  ],
  // Floor 2 — A-shape; f2-entry is the escalator landing, left leg climbs to the apex, right leg descends.
  2: [
    { id: 'f2-entry', x: .645, y: .476 },
    { id: 'f2-l1', x: .655, y: .46 }, { id: 'f2-l2', x: .68, y: .42 }, { id: 'f2-l3', x: .71, y: .37 },
    { id: 'f2-l4', x: .735, y: .32 }, { id: 'f2-l5', x: .76, y: .27 }, { id: 'f2-l6', x: .80, y: .21 },
    { id: 'f2-r1', x: .82, y: .30 }, { id: 'f2-r2', x: .80, y: .35 }, { id: 'f2-r3', x: .83, y: .42 },
    { id: 'f2-r4', x: .843, y: .469 },
  ],
  // Floor 3 — A-shape; f3-entry is the escalator landing.
  3: [
    { id: 'f3-entry', x: .670, y: .852 },
    { id: 'f3-s1', x: .695, y: .81 }, { id: 'f3-s2', x: .72, y: .77 }, { id: 'f3-s3', x: .74, y: .72 },
    { id: 'f3-s4', x: .755, y: .67 }, { id: 'f3-s5', x: .77, y: .63 },
    { id: 'f3-r1', x: .79, y: .72 }, { id: 'f3-r2', x: .77, y: .765 },
  ],
};

// Walkable corridor polylines per floor. POIs never attach to these diagonally:
// each POI gets a "door" node projected perpendicularly onto its nearest corridor
// segment, so a connector crosses (at most) the POI's own block — never a
// neighboring village. Doors are then chained INTO the corridor in order.
const corridorChains: Record<Floor, string[][]> = {
  1: [
    ['f1-s1', 'f1-s2', 'f1-s3', 'f1-s4', 'f1-s5', 'f1-s6', 'f1-s7'], // west-edge corridor
    ['f1-s3', 'f1-a1e'], ['f1-s4', 'f1-a2e'], ['f1-s5', 'f1-a3e'], ['f1-s6', 'f1-a4e'], ['f1-s7', 'f1-a5e'], // aisles between hall rows
    ['f1-a1e', 'f1-a2e', 'f1-a3e', 'f1-a4e', 'f1-a5e'], // east wedge-margin corridor
    ['f1-atrium', 'f1-s5'],
  ],
  2: [
    ['f2-entry', 'f2-l1', 'f2-l2', 'f2-l3', 'f2-l4', 'f2-l5', 'f2-l6', 'f2-r1', 'f2-r2', 'f2-r3', 'f2-r4'],
    ['f2-l4', 'f2-r2'], // crossbar between the legs near Workshops
  ],
  3: [
    ['f3-entry', 'f3-s1', 'f3-s2', 'f3-s3', 'f3-s4', 'f3-s5', 'f3-r1', 'f3-r2'],
  ],
};

const escalatorChain = ['f1-atrium', 'f2-entry', 'f3-entry']; // the ONLY cross-floor edges

// --- POIs (docs/research/lvcc-maps.md) --------------------------------------

interface Poi { code: string; label: string; x: number; y: number; floor: Floor; attachTo?: string[] }

const pois: Poi[] = [
  // Floor 1 — west chain: Registration → Chillout → Food Court → Atrium, plus Registration ↔ south spine.
  { code: 'REG', label: 'Registration', x: .067, y: .90, floor: 1, attachTo: ['poi-chill', 'f1-s7'] },
  { code: 'CHILL', label: 'Chillout Lounge', x: .082, y: .807, floor: 1, attachTo: ['poi-food'] },
  { code: 'FOOD', label: 'Food Court', x: .193, y: .733, floor: 1, attachTo: ['f1-atrium'] },
  { code: 'MERCH', label: 'Merch', x: .186, y: .141, floor: 1 },
  { code: 'COMM', label: 'Hall 4 Communities', x: .258, y: .208, floor: 1 },
  { code: 'TRK1', label: 'Track 1', x: .295, y: .379, floor: 1 },
  { code: 'TRK2', label: 'Track 2', x: .342, y: .381, floor: 1 },
  { code: 'CRTR', label: 'Creator Stages', x: .203, y: .376, floor: 1 },
  { code: 'TRK5', label: 'Track 5', x: .258, y: .472, floor: 1 },
  { code: 'TRK4', label: 'Track 4', x: .298, y: .472, floor: 1 },
  { code: 'TRK3', label: 'Track 3', x: .365, y: .472, floor: 1 },
  { code: 'AERO', label: 'Aerospace Village', x: .253, y: .554, floor: 1 },
  { code: 'CAR', label: 'Car Hacking Village', x: .320, y: .550, floor: 1 },
  { code: 'CCV', label: 'Crypto-currency Village', x: .362, y: .554, floor: 1 },
  { code: 'MARI', label: 'Maritime Hacking Village', x: .392, y: .554, floor: 1 },
  { code: 'MALW', label: 'Malware Village', x: .253, y: .617, floor: 1 },
  { code: 'PHYS', label: 'Physical Security Village', x: .273, y: .617, floor: 1 },
  { code: 'ADV', label: 'Adversary Village', x: .308, y: .617, floor: 1 },
  { code: 'AI', label: 'AI Village', x: .355, y: .610, floor: 1 },
  { code: 'APP', label: 'AppSec Village', x: .374, y: .638, floor: 1 },
  { code: 'QUAN', label: 'Quantum Village', x: .412, y: .610, floor: 1 },
  { code: 'CTF', label: 'DEF CON CTF', x: .278, y: .666, floor: 1 },
  { code: 'RECON', label: 'Recon Village', x: .315, y: .666, floor: 1 },
  { code: 'ICS', label: 'ICS Village', x: .350, y: .658, floor: 1 },
  { code: 'EMB', label: 'Embedded Systems Village', x: .417, y: .658, floor: 1 },
  { code: 'HHV', label: 'Hardware Hacking Village', x: .293, y: .740, floor: 1 },
  { code: 'CPV', label: 'Crypto & Privacy Village', x: .320, y: .722, floor: 1 },
  { code: 'LOCK', label: 'Lock Pick Village', x: .350, y: .751, floor: 1 },
  { code: 'BIO', label: 'Biohacking Village', x: .377, y: .748, floor: 1 },
  { code: 'RF', label: 'Radio Frequency Village', x: .427, y: .740, floor: 1 },
  { code: 'REDT', label: 'Red Team Village', x: .442, y: .792, floor: 1 },
  { code: 'MAKE', label: 'Makers Village', x: .293, y: .803, floor: 1 },
  { code: 'CSTG', label: 'Contest Stage', x: .317, y: .848, floor: 1 },
  { code: 'SCAM', label: 'Scambait Village', x: .370, y: .844, floor: 1 },
  { code: 'SCAV', label: 'Scavenger Hunt', x: .362, y: .859, floor: 1 },
  { code: 'GAME', label: 'Game Hacking Village', x: .417, y: .844, floor: 1 },
  { code: 'IOT', label: 'IoT Village', x: .466, y: .848, floor: 1 },
  // Floor 2
  { code: 'DCG', label: 'DEF CON Groups', x: .821, y: .193, floor: 2 },
  { code: 'WKSP', label: 'Workshops', x: .794, y: .346, floor: 2 },
  { code: 'VOTE', label: 'Voting Village', x: .754, y: .264, floor: 2 },
  { code: 'BLUE', label: 'Blue Team Village', x: .727, y: .313, floor: 2 },
  { code: 'CALL', label: 'Call Center Village', x: .744, y: .309, floor: 2 },
  { code: 'BUG', label: 'Bug Bounty Village', x: .694, y: .376, floor: 2 },
  { code: 'PAY', label: 'Payment Village', x: .704, y: .406, floor: 2 },
  { code: 'POL', label: 'Policy Village', x: .719, y: .406, floor: 2 },
  { code: 'HDA', label: 'HDA Community', x: .652, y: .461, floor: 2 },
  { code: 'LOST', label: 'Lost and Found', x: .843, y: .469, floor: 2 },
  { code: 'HALL', label: 'Hallwaycon Lounge', x: .863, y: .502, floor: 2 },
  // Floor 3
  { code: 'TCOM', label: 'Telecom Village', x: .764, y: .636, floor: 3 },
  { code: 'SEV', label: 'Social Engineering Village', x: .744, y: .688, floor: 3 },
  { code: 'HAM', label: 'Ham Radio Village', x: .727, y: .733, floor: 3 },
  { code: 'NXTG', label: 'DC NextGen', x: .744, y: .733, floor: 3 },
  { code: 'BIC', label: 'Blacks in Cyber Village', x: .799, y: .737, floor: 3 },
  { code: 'CLOUD', label: 'Cloud Village', x: .719, y: .781, floor: 3 },
  { code: 'QCON', label: 'Queercon Lounge', x: .766, y: .770, floor: 3 },
  { code: 'VET', label: 'Vetcon', x: .784, y: .770, floor: 3 },
  { code: 'MEET', label: 'Meetup Location', x: .804, y: .770, floor: 3 },
  { code: 'PKT', label: 'Packet Hacking Village', x: .704, y: .841, floor: 3 },
];

// --- Graph assembly ---------------------------------------------------------

const poiNodeId = (poi: Poi): string => `poi-${poi.code.toLowerCase()}`;
const makeEdge = (fromNodeId: string, toNodeId: string): RouteEdge => ({ id: `e-${fromNodeId}--${toNodeId}`, fromNodeId, toNodeId, accessible: true });

// Perpendicular projection of a POI onto each corridor segment of its floor
// (aspect-corrected pixel space). Returns the closest hit.
interface DoorHit { chainIndex: number; segmentIndex: number; t: number; x: number; y: number; distance: number }
function projectPoi(poi: Poi, nodeById: Map<string, RouteNode>): DoorHit {
  let best: DoorHit | null = null;
  corridorChains[poi.floor].forEach((chain, chainIndex) => {
    for (let segmentIndex = 0; segmentIndex < chain.length - 1; segmentIndex++) {
      const a = nodeById.get(chain[segmentIndex])!;
      const b = nodeById.get(chain[segmentIndex + 1])!;
      const ax = a.x * MAP_WIDTH, ay = a.y * MAP_HEIGHT, bx = b.x * MAP_WIDTH, by = b.y * MAP_HEIGHT;
      const px = poi.x * MAP_WIDTH, py = poi.y * MAP_HEIGHT;
      const lengthSq = (bx - ax) ** 2 + (by - ay) ** 2;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / lengthSq));
      const hx = ax + t * (bx - ax), hy = ay + t * (by - ay);
      const distance = Math.hypot(px - hx, py - hy);
      if (!best || distance < best.distance) best = { chainIndex, segmentIndex, t, x: hx / MAP_WIDTH, y: hy / MAP_HEIGHT, distance };
    }
  });
  return best!;
}

function assembleGraph(): { nodes: RouteNode[]; edges: RouteEdge[] } {
  const spine = [...spineNodes[1], ...spineNodes[2], ...spineNodes[3]];
  const nodeById = new Map(spine.map((node) => [node.id, node]));
  const doorNodes: RouteNode[] = [];
  const poiEdges: RouteEdge[] = [];
  // door insertions per floor/chain/segment, ordered later by t
  const inserted = new Map<string, { t: number; id: string }[]>();
  const END_SNAP = 0.02; // within 2% of a segment end → reuse the endpoint node

  for (const poi of pois) {
    const poiId = poiNodeId(poi);
    if (poi.attachTo) { poi.attachTo.forEach((target) => poiEdges.push(makeEdge(poiId, target))); continue; }
    const hit = projectPoi(poi, nodeById);
    const chain = corridorChains[poi.floor][hit.chainIndex];
    if (hit.t <= END_SNAP) { poiEdges.push(makeEdge(poiId, chain[hit.segmentIndex])); continue; }
    if (hit.t >= 1 - END_SNAP) { poiEdges.push(makeEdge(poiId, chain[hit.segmentIndex + 1])); continue; }
    const doorId = `door-${poi.code.toLowerCase()}`;
    doorNodes.push({ id: doorId, x: hit.x, y: hit.y });
    poiEdges.push(makeEdge(poiId, doorId));
    const key = `${poi.floor}:${hit.chainIndex}:${hit.segmentIndex}`;
    if (!inserted.has(key)) inserted.set(key, []);
    inserted.get(key)!.push({ t: hit.t, id: doorId });
  }

  // Corridor edges with doors spliced in, in order of t along each segment.
  const corridorEdges: RouteEdge[] = [];
  (Object.keys(corridorChains) as unknown as Floor[]).forEach((floor) => {
    corridorChains[floor].forEach((chain, chainIndex) => {
      for (let segmentIndex = 0; segmentIndex < chain.length - 1; segmentIndex++) {
        const doors = (inserted.get(`${floor}:${chainIndex}:${segmentIndex}`) ?? []).sort((a, b) => a.t - b.t);
        const sequence = [chain[segmentIndex], ...doors.map((door) => door.id), chain[segmentIndex + 1]];
        for (let i = 0; i < sequence.length - 1; i++) corridorEdges.push(makeEdge(sequence[i], sequence[i + 1]));
      }
    });
  });

  return {
    nodes: [...spine, ...doorNodes, ...pois.map((poi) => ({ id: poiNodeId(poi), x: poi.x, y: poi.y }))],
    edges: [
      ...corridorEdges,
      ...escalatorChain.slice(1).map((toNodeId, index) => makeEdge(escalatorChain[index], toNodeId)),
      ...poiEdges,
    ],
  };
}

const graph = assembleGraph();
export const defconNodes: RouteNode[] = graph.nodes;
export const defconEdges: RouteEdge[] = graph.edges;

export const defconCheckpoints: Checkpoint[] = [
  ...pois.map((poi) => ({ id: `cp-${poi.code.toLowerCase()}`, label: poi.label, shortCode: poi.code, x: poi.x, y: poi.y, routeNodeId: poiNodeId(poi) })),
  { id: 'cp-esc1', label: 'Escalators (Floor 1)', shortCode: 'ESC1', x: .19, y: .60, routeNodeId: 'f1-atrium' },
  { id: 'cp-esc2', label: 'Escalators (Floor 2)', shortCode: 'ESC2', x: .645, y: .476, routeNodeId: 'f2-entry' },
  { id: 'cp-esc3', label: 'Escalators (Floor 3)', shortCode: 'ESC3', x: .670, y: .852, routeNodeId: 'f3-entry' },
];
