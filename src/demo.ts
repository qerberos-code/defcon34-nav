import type { NavPack } from './types';

const floorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720"><rect width="1200" height="720" fill="#f7f3e8"/><rect x="38" y="38" width="1124" height="644" rx="10" fill="#fff" stroke="#183f43" stroke-width="8"/><path d="M310 42v210M310 460v218M720 42v190M720 490v188M940 42v210M940 470v208" stroke="#809093" stroke-width="5"/><path d="M42 300h180M380 300h270M790 300h370M42 430h180M380 430h270M790 430h370" stroke="#809093" stroke-width="5"/><g fill="#173f43" font-family="Arial" font-size="30" font-weight="bold"><text x="82" y="178">REGISTRATION</text><text x="440" y="150">MAIN STAGE</text><text x="785" y="150">BOOTH HALL</text><text x="85" y="575">LOUNGE</text><text x="442" y="575">FOOD COURT</text><text x="790" y="575">RESTROOMS</text></g><g fill="#d9a441"><rect x="800" y="188" width="110" height="65" rx="8"/><rect x="990" y="188" width="110" height="65" rx="8"/><rect x="800" y="505" width="110" height="65" rx="8"/><rect x="990" y="505" width="110" height="65" rx="8"/></g><g fill="#fff" font-family="Arial" font-size="22" font-weight="bold"><text x="816" y="230">BOOTH 3</text><text x="1006" y="230">BOOTH 8</text><text x="816" y="547">BOOTH 12</text><text x="1002" y="547">BOOTH 15</text></g></svg>`;
const imageDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(floorSvg)}`;

export function createDemoPack(): NavPack {
  const nodes = [
    { id: 'n1', x: .12, y: .5 }, { id: 'n2', x: .3, y: .5 }, { id: 'n3', x: .5, y: .5 },
    { id: 'n4', x: .7, y: .5 }, { id: 'n5', x: .88, y: .5 }, { id: 'n6', x: .5, y: .25 },
    { id: 'n7', x: .88, y: .25 }, { id: 'n8', x: .5, y: .75 }, { id: 'n9', x: .88, y: .75 },
  ];
  const pairs = [['n1','n2'],['n2','n3'],['n3','n4'],['n4','n5'],['n3','n6'],['n6','n7'],['n7','n5'],['n3','n8'],['n8','n9'],['n9','n5']];
  return {
    version: 1,
    event: { id: 'demo-event', name: 'Northstar Conference', createdAt: '2026-01-01T00:00:00.000Z' },
    floor: { id: 'floor-1', name: 'Conference floor', imageDataUrl, imageWidth: 1200, imageHeight: 720, calibration: { pointA: { x: .1, y: .5 }, pointB: { x: .9, y: .5 }, distanceMeters: 96, metersPerImagePixel: .1 } },
    nodes,
    edges: pairs.map(([fromNodeId, toNodeId], index) => ({ id: `e${index + 1}`, fromNodeId, toNodeId, accessible: true })),
    destinations: [
      { id: 'd-stage', name: 'Main Stage', category: 'Stage', x: .5, y: .14, routeNodeId: 'n6' },
      { id: 'd-booth8', name: 'Booth 8', category: 'Booth', x: .87, y: .29, routeNodeId: 'n7' },
      { id: 'd-restrooms', name: 'Restrooms', category: 'Toilets', x: .87, y: .81, routeNodeId: 'n9' },
      { id: 'd-exit', name: 'South Exit', category: 'Exit', x: .5, y: .94, routeNodeId: 'n8' },
    ],
    checkpoints: [
      { id: 'c-registration', label: 'Registration Desk', shortCode: 'REG', x: .12, y: .5, routeNodeId: 'n1', installationNote: 'Place beside the welcome desk.' },
      { id: 'c-crossroads', label: 'Central Crossroads', shortCode: 'CTR', x: .5, y: .5, routeNodeId: 'n3' },
      { id: 'c-booths', label: 'Booth Hall', shortCode: 'BTH', x: .88, y: .5, routeNodeId: 'n5' },
      { id: 'c-stage', label: 'Main Stage', shortCode: 'STAGE', x: .5, y: .25, routeNodeId: 'n6' },
      { id: 'c-booth8', label: 'Booth 8', shortCode: 'BTH8', x: .88, y: .25, routeNodeId: 'n7' },
      { id: 'c-food', label: 'Food Court', shortCode: 'FOD', x: .5, y: .75, routeNodeId: 'n8' },
      { id: 'c-restrooms', label: 'Restrooms', shortCode: 'WC', x: .88, y: .75, routeNodeId: 'n9' },
    ],
  };
}

export function createEmptyPack(): NavPack {
  return { version: 1, event: { id: `event-${Date.now().toString(36)}`, name: 'Untitled event', createdAt: new Date().toISOString() }, floor: { id: 'floor-1', name: '', imageDataUrl: '', imageWidth: 1, imageHeight: 1 }, nodes: [], edges: [], destinations: [], checkpoints: [] };
}
