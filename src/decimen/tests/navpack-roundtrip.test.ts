import { describe, expect, test } from 'vitest';
import { createDemoPack } from '../../demo';
import { createOpticalNavPack, validateReceivedNavPack } from '../integration';
import { LTDecoder, LTEncoder } from '../shared/fountain';
import { fnv1a, packFile, packFrame, parseFrame, unpackFile } from '../shared/protocol';

describe('Waypoint optical navpack', () => {
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

