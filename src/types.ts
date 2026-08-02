export interface Point { x: number; y: number }

export interface RouteNode extends Point { id: string }

export interface RouteEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  accessible: boolean;
}

export interface Destination extends Point {
  id: string;
  name: string;
  category: 'Booth' | 'Stage' | 'Toilets' | 'Exit' | 'Food' | 'Other';
  routeNodeId: string;
}

export interface Checkpoint extends Point {
  id: string;
  label: string;
  shortCode: string;
  routeNodeId: string;
  installationNote?: string;
}

export interface NavPack {
  version: 1;
  event: { id: string; name: string; createdAt: string };
  floor: {
    id: string;
    name: string;
    imageDataUrl: string;
    imageWidth: number;
    imageHeight: number;
    calibration?: {
      pointA: Point;
      pointB: Point;
      distanceMeters: number;
      metersPerImagePixel: number;
    };
  };
  nodes: RouteNode[];
  edges: RouteEdge[];
  destinations: Destination[];
  checkpoints: Checkpoint[];
}

export type EditorTool = 'select' | 'calibrate' | 'checkpoints' | 'routes' | 'preview';
export type Selection = { type: 'node' | 'edge' | 'checkpoint'; id: string } | null;
