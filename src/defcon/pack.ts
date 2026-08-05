import type { NavPack } from '../types';
import { MAP_HEIGHT, MAP_WIDTH, defconCheckpoints, defconEdges, defconNodes } from './data';

// Bump the suffix whenever the bundled map/graph data changes: visitors with an
// older saved DC34 pack get it transparently rebuilt on next launch.
export const DEFCON_EVENT_ID = 'defcon34-v2';

export function assemblePack(imageDataUrl: string): NavPack {
  return {
    version: 1,
    event: { id: DEFCON_EVENT_ID, name: 'DEF CON 34 · LVCC', createdAt: '2026-08-04T00:00:00.000Z' },
    // Calibration is approximate: LVCC West Hall's Floor 1 drawing spans ~180m
    // over ~1800px of the 3600px poster (~0.1 m/px). Floors 2–3 are drawn at a
    // slightly different scale, so distances are estimates, not measurements.
    floor: { id: 'lvcc-all', name: 'LVCC West Hall (Floors 1–3)', imageDataUrl, imageWidth: MAP_WIDTH, imageHeight: MAP_HEIGHT, calibration: { pointA: { x: 0.05, y: 0.55 }, pointB: { x: 0.55, y: 0.55 }, distanceMeters: 180, metersPerImagePixel: 0.1 } },
    nodes: defconNodes,
    edges: defconEdges,
    destinations: [],
    checkpoints: defconCheckpoints,
  };
}

export async function buildDefconPack(): Promise<NavPack> {
  let blob: Blob;
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}defcon34-map.jpg`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    blob = await response.blob();
  } catch {
    throw new Error('Could not load the DEF CON 34 map image. Check your connection and reload the app once online.');
  }
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the DEF CON 34 map image data.'));
    reader.readAsDataURL(blob);
  });
  return assemblePack(imageDataUrl);
}
