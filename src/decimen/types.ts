import type { NavPack } from '../types';
import type { CompressionMode } from './shared/protocol';

export const NAVPACK_MIME = 'application/x-navpack' as const;

export interface OpticalNavPack {
  name: string;
  mimeType: typeof NAVPACK_MIME;
  bytes: Uint8Array;
}

export type OpticalTransferState =
  | { phase: 'idle' }
  | { phase: 'preparing'; message: string }
  | { phase: 'transmitting'; frame: number; fps: number; originalSize: number; transmittedSize: number; compression: CompressionMode; estimatedSeconds: number }
  | { phase: 'receiving'; uniqueFrames: number; duplicateFrames: number; expectedFrames: number; progress: number; goodput: number; estimatedSeconds?: number; cameraStatus: string; advice?: string }
  | { phase: 'complete'; pack: NavPack; file: OpticalNavPack }
  | { phase: 'stopped'; reason: string }
  | { phase: 'error'; message: string };
