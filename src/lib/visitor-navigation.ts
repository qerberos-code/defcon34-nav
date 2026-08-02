import type { Checkpoint } from '../types';
import type { VisitorState } from './storage';

export function selectCurrentCheckpoint(state: VisitorState, checkpointId?: string): VisitorState {
  return { ...state, checkpointId, targetCheckpointId: state.targetCheckpointId === checkpointId ? undefined : state.targetCheckpointId };
}

export function destinationCheckpointOptions(state: VisitorState): Checkpoint[] {
  if (!state.checkpointId) return [];
  return state.pack.checkpoints.filter((checkpoint) => checkpoint.id !== state.checkpointId);
}
