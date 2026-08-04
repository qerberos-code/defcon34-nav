import type { Checkpoint, RouteEdge, RouteNode } from '../types';

// DEF CON 34 · LVCC West Hall — one poster image covering Floors 1–3.
// Coordinates are normalized 0–1 fractions of the full poster (see docs/research/lvcc-maps.md).
export const MAP_WIDTH = 3600;
export const MAP_HEIGHT = 2400;

type Floor = 1 | 2 | 3;

// --- Corridor spine nodes ---------------------------------------------------

const spineNodes: Record<Floor, RouteNode[]> = {
  // Floor 1 — wedge shape, main corridor tilts right going down; f1-atrium doubles as the Floor 1 escalator landing.
  1: [
    { id: 'f1-s1', x: .20, y: .15 }, { id: 'f1-s2', x: .22, y: .22 }, { id: 'f1-s3', x: .26, y: .38 },
    { id: 'f1-s4', x: .29, y: .47 }, { id: 'f1-s5', x: .31, y: .55 }, { id: 'f1-s6', x: .33, y: .62 },
    { id: 'f1-s7', x: .35, y: .665 }, { id: 'f1-s8', x: .37, y: .74 }, { id: 'f1-s9', x: .39, y: .80 },
    { id: 'f1-s10', x: .41, y: .85 },
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

// Chains of node ids joined by consecutive edges. The final chain (the escalators) holds the ONLY cross-floor edges.
const spineChains: string[][] = [
  ['f1-s1', 'f1-s2', 'f1-s3', 'f1-s4', 'f1-s5', 'f1-s6', 'f1-s7', 'f1-s8', 'f1-s9', 'f1-s10'],
  ['f1-atrium', 'f1-s5'],
  ['f2-entry', 'f2-l1', 'f2-l2', 'f2-l3', 'f2-l4', 'f2-l5', 'f2-l6', 'f2-r1', 'f2-r2', 'f2-r3', 'f2-r4'],
  ['f2-l4', 'f2-r2'], // crossbar between the legs near Workshops
  ['f3-entry', 'f3-s1', 'f3-s2', 'f3-s3', 'f3-s4', 'f3-s5', 'f3-r1', 'f3-r2'],
  ['f1-atrium', 'f2-entry', 'f3-entry'], // Escalators — only cross-floor edges
];

// --- POIs (docs/research/lvcc-maps.md) --------------------------------------

interface Poi { code: string; label: string; x: number; y: number; floor: Floor; attachTo?: string[] }

const pois: Poi[] = [
  // Floor 1 — west chain: Registration → Chillout → Food Court → Atrium, plus Registration ↔ south spine.
  { code: 'REG', label: 'Registration', x: .067, y: .90, floor: 1, attachTo: ['poi-chill', 'f1-s10'] },
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

function nearestSpineNodeId(poi: Poi): string {
  let bestId = spineNodes[poi.floor][0].id;
  let best = Infinity;
  for (const node of spineNodes[poi.floor]) {
    const distance = Math.hypot((poi.x - node.x) * MAP_WIDTH, (poi.y - node.y) * MAP_HEIGHT);
    if (distance < best) { best = distance; bestId = node.id; }
  }
  return bestId;
}

const poiNodeId = (poi: Poi): string => `poi-${poi.code.toLowerCase()}`;
const makeEdge = (fromNodeId: string, toNodeId: string): RouteEdge => ({ id: `e-${fromNodeId}--${toNodeId}`, fromNodeId, toNodeId, accessible: true });

export const defconNodes: RouteNode[] = [
  ...spineNodes[1], ...spineNodes[2], ...spineNodes[3],
  ...pois.map((poi) => ({ id: poiNodeId(poi), x: poi.x, y: poi.y })),
];

export const defconEdges: RouteEdge[] = [
  ...spineChains.flatMap((chain) => chain.slice(1).map((toNodeId, index) => makeEdge(chain[index], toNodeId))),
  ...pois.flatMap((poi) => (poi.attachTo ?? [nearestSpineNodeId(poi)]).map((spineId) => makeEdge(poiNodeId(poi), spineId))),
];

export const defconCheckpoints: Checkpoint[] = [
  ...pois.map((poi) => ({ id: `cp-${poi.code.toLowerCase()}`, label: poi.label, shortCode: poi.code, x: poi.x, y: poi.y, routeNodeId: poiNodeId(poi) })),
  { id: 'cp-esc1', label: 'Escalators (Floor 1)', shortCode: 'ESC1', x: .19, y: .60, routeNodeId: 'f1-atrium' },
  { id: 'cp-esc2', label: 'Escalators (Floor 2)', shortCode: 'ESC2', x: .645, y: .476, routeNodeId: 'f2-entry' },
  { id: 'cp-esc3', label: 'Escalators (Floor 3)', shortCode: 'ESC3', x: .670, y: .852, routeNodeId: 'f3-entry' },
];
