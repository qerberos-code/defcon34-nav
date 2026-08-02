import { describe, expect, it } from 'vitest';
import { createDemoPack } from '../demo';
import { destinationCheckpointOptions, selectCurrentCheckpoint } from './visitor-navigation';

describe('visitor checkpoint selection', () => {
  it('has no destination options before the current checkpoint is known', () => {
    expect(destinationCheckpointOptions({ pack: createDemoPack() })).toEqual([]);
  });

  it('excludes the current checkpoint from destination options', () => {
    const state = { pack: createDemoPack(), checkpointId: 'c-registration' };
    expect(destinationCheckpointOptions(state).some((item) => item.id === 'c-registration')).toBe(false);
  });

  it('clears a destination that becomes the current checkpoint', () => {
    const state = { pack: createDemoPack(), checkpointId: 'c-registration', targetCheckpointId: 'c-booth8' };
    expect(selectCurrentCheckpoint(state, 'c-booth8').targetCheckpointId).toBeUndefined();
  });
});
