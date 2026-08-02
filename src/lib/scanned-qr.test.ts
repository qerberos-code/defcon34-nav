import { describe, expect, it, vi } from 'vitest';
import { createDemoPack } from '../demo';
import { packFrame } from '../decimen/shared/protocol';
import { makeQrPayload } from './qr';
import { classifyDecodedQr, LocationSessionPolicy, resolveCheckpointScan } from './scanned-qr';

describe('decoded Waypoint QR classification', () => {
  it('recognizes a Decimen location frame without copying it', () => {
    const bytes = packFrame({ sessionId: 42, seq: 3, k: 2, blockLen: 4, totalLen: 8, payloadFnv: 99 }, new Uint8Array([1, 2, 3, 4]));
    const result = classifyDecodedQr(bytes);
    expect(result.kind).toBe('location-frame');
    if (result.kind === 'location-frame') { expect(result.bytes).toBe(bytes); expect(result.sessionIdentity).toContain('42'); }
  });

  it('recognizes a static checkpoint QR', () => {
    const result = classifyDecodedQr(new TextEncoder().encode(makeQrPayload('demo-event', 'REG')));
    expect(result).toEqual(expect.objectContaining({ kind: 'checkpoint', payload: { version: 1, eventId: 'demo-event', checkpointCode: 'REG' } }));
  });

  it('rejects malformed text and binary data', () => {
    expect(classifyDecodedQr(new TextEncoder().encode('https://example.com')).kind).toBe('unsupported');
    expect(classifyDecodedQr(new Uint8Array([0xff, 0xfe, 0xfd])).kind).toBe('unsupported');
  });
});

describe('location session policy', () => {
  it('accepts location-intent sessions without prompting', () => {
    const confirmSwitch = vi.fn(() => false);
    expect(new LocationSessionPolicy().shouldReceive('session-a', 'location', confirmSwitch)).toBe(true);
    expect(confirmSwitch).not.toHaveBeenCalled();
  });

  it('prompts once and remembers accepted checkpoint-intent sessions', () => {
    const confirmSwitch = vi.fn(() => true); const policy = new LocationSessionPolicy();
    expect(policy.shouldReceive('session-a', 'checkpoint', confirmSwitch)).toBe(true);
    expect(policy.shouldReceive('session-a', 'checkpoint', confirmSwitch)).toBe(true);
    expect(confirmSwitch).toHaveBeenCalledTimes(1);
  });

  it('suppresses a declined session but prompts for a different one', () => {
    const confirmSwitch = vi.fn(() => false); const policy = new LocationSessionPolicy();
    expect(policy.shouldReceive('session-a', 'checkpoint', confirmSwitch)).toBe(false);
    expect(policy.shouldReceive('session-a', 'checkpoint', confirmSwitch)).toBe(false);
    expect(policy.shouldReceive('session-b', 'checkpoint', confirmSwitch)).toBe(false);
    expect(confirmSwitch).toHaveBeenCalledTimes(2);
  });
});

describe('checkpoint resolution', () => {
  const pack = createDemoPack();
  it('requires a loaded location', () => { expect(resolveCheckpointScan(undefined, { version: 1, eventId: pack.event.id, checkpointCode: 'REG' }).kind).toBe('missing-location'); });
  it('rejects a checkpoint from another location', () => { expect(resolveCheckpointScan(pack, { version: 1, eventId: 'other', checkpointCode: 'REG' }).kind).toBe('different-location'); });
  it('rejects an unknown checkpoint', () => { expect(resolveCheckpointScan(pack, { version: 1, eventId: pack.event.id, checkpointCode: 'NOPE' }).kind).toBe('unknown-checkpoint'); });
  it('returns the matching checkpoint', () => { expect(resolveCheckpointScan(pack, { version: 1, eventId: pack.event.id, checkpointCode: 'REG' })).toEqual({ kind: 'matched', checkpointId: 'c-registration', label: 'Registration Desk' }); });
});
