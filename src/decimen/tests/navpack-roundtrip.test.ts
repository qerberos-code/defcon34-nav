import { describe, expect, test } from 'vitest';
import { createDemoPack } from '../../demo';
import { canonicalizeOpticalNavPack, createOpticalNavPack, validateReceivedNavPack } from '../integration';
import { LTDecoder, LTEncoder } from '../shared/fountain';
import { fnv1a, packFile, packFrame, parseFrame, unpackFile } from '../shared/protocol';

describe('Waypoint optical navpack', () => {
  test('packs and verifies a map-only navpack', async () => {
    const original = { ...createDemoPack(), nodes: [], edges: [], destinations: [], checkpoints: [] };
    const navpack = createOpticalNavPack(original);
    const packed = await packFile(navpack.name, navpack.mimeType, navpack.bytes);
    const received = await validateReceivedNavPack(await unpackFile(packed.container));
    expect(received.pack).toEqual(original);
  });

  test('applies a valid per-broadcast checkpoint and strips it from canonical copies', async () => {
    const original = createDemoPack();
    const navpack = createOpticalNavPack(original, 'c-registration');
    expect(navpack.startingCheckpoint).toEqual({ id: 'c-registration', label: 'Registration Desk', shortCode: 'REG' });
    expect(JSON.parse(new TextDecoder().decode(navpack.bytes))).toHaveProperty('_waypointTransfer.checkpointId', 'c-registration');

    const packed = await packFile(navpack.name, navpack.mimeType, navpack.bytes);
    const received = await validateReceivedNavPack(await unpackFile(packed.container));
    expect(received.startingCheckpoint).toEqual(navpack.startingCheckpoint);
    expect(received.pack).toEqual(original);
    expect(JSON.parse(new TextDecoder().decode(received.file.bytes))).not.toHaveProperty('_waypointTransfer');
    expect(JSON.parse(new TextDecoder().decode(canonicalizeOpticalNavPack(navpack).bytes))).not.toHaveProperty('_waypointTransfer');
  });

  test('rejects missing or forged starting checkpoints', async () => {
    const original = createDemoPack();
    expect(() => createOpticalNavPack(original, 'not-a-checkpoint')).toThrow(/included in this event/);
    const forged = new TextEncoder().encode(JSON.stringify({ ...original, _waypointTransfer: { version: 1, checkpointId: 'not-a-checkpoint' } }));
    const packed = await packFile('forged.navpack', 'application/x-navpack', forged);
    await expect(validateReceivedNavPack(await unpackFile(packed.container))).rejects.toThrow(/not included/);
  });

  test('reconstructs after shuffled, dropped, and duplicated frames', async () => {
    const original = createDemoPack();
    const navpack = createOpticalNavPack(original);
    const packed = await packFile(navpack.name, navpack.mimeType, navpack.bytes);
    const encoder = new LTEncoder(packed.container, 240, 4242);
    const checksum = fnv1a(packed.container);
    const frames = Array.from({ length: Math.ceil(encoder.k * 2.4) }, (_, seq) => packFrame({ sessionId: 4242, seq, k: encoder.k, blockLen: encoder.blockLen, totalLen: packed.container.length, payloadFnv: checksum }, encoder.encode(seq)))
      .filter((_, index) => index % 5 !== 0)
      .reverse();
    frames.splice(3, 0, frames[2]!);
    const decoder = new LTDecoder(encoder.k, encoder.blockLen, 4242, packed.container.length);
    for (const bytes of frames) {
      const frame = parseFrame(bytes)!;
      decoder.addFrame(frame.header.seq, frame.block);
      if (decoder.isComplete) break;
    }
    expect(decoder.isComplete).toBe(true);
    const file = await unpackFile(decoder.assemble()!);
    const received = await validateReceivedNavPack(file);
    expect(received.pack).toEqual(original);
  });

  test('rejects arbitrary optical files', async () => {
    const packed = await packFile('notes.txt', 'text/plain', new TextEncoder().encode('hello'));
    await expect(validateReceivedNavPack(await unpackFile(packed.container))).rejects.toThrow('only receives .navpack');
  });
});

