import type { NavPack, Point, RouteNode } from '../types';

export function imagePixelDistance(a: Point, b: Point, width: number, height: number): number {
  return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
}

export function calibrate(a: Point, b: Point, meters: number, width: number, height: number): number {
  const pixels = imagePixelDistance(a, b, width, height);
  if (!Number.isFinite(meters) || meters <= 0 || pixels === 0) throw new Error('Calibration distance must be greater than zero.');
  return meters / pixels;
}

export function distanceMeters(a: Point, b: Point, pack: NavPack): number | null {
  const value = imagePixelDistance(a, b, pack.floor.imageWidth, pack.floor.imageHeight);
  return pack.floor.calibration ? value * pack.floor.calibration.metersPerImagePixel : null;
}

export function nearestNode(point: Point, nodes: RouteNode[], width = 1, height = 1): RouteNode | undefined {
  let nearest: RouteNode | undefined;
  let best = Infinity;
  for (const node of nodes) {
    const distance = imagePixelDistance(point, node, width, height);
    if (distance < best) { best = distance; nearest = node; }
  }
  return nearest;
}

export function clampPoint(point: Point): Point {
  return { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) };
}
