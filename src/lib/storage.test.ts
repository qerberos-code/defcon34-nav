import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDemoPack } from '../demo';
import { createOpticalNavPack } from '../decimen/integration';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } as Storage;
}

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
});

describe('IndexedDB persistence', () => {
  test('persists organizer, visitor, and transfer draft values', async () => {
    const storage = await import('./storage');
    const pack = createDemoPack();
    const transfer = createOpticalNavPack(pack, pack.checkpoints[0]!.id);
    await storage.saveOrganizer(pack);
    await storage.saveVisitor({ pack, checkpointId: pack.checkpoints[0]!.id, targetCheckpointId: pack.checkpoints[1]!.id });
    await storage.saveTransferDraft(transfer);
    expect(await storage.loadOrganizer()).toEqual(pack);
    expect(await storage.loadVisitor()).toEqual({ pack, checkpointId: pack.checkpoints[0]!.id, targetCheckpointId: pack.checkpoints[1]!.id });
    expect(await storage.loadTransferDraft()).toEqual(transfer);
  });

  test('migrates valid legacy data and removes it only after writing', async () => {
    const pack = createDemoPack();
    localStorage.setItem('waypoint:organizer:v1', JSON.stringify(pack));
    const storage = await import('./storage');
    expect(await storage.loadOrganizer()).toEqual(pack);
    expect(localStorage.getItem('waypoint:organizer:v1')).toBeNull();
  });

  test('retains invalid legacy data', async () => {
    localStorage.setItem('waypoint:organizer:v1', '{"version":99}');
    const storage = await import('./storage');
    expect(await storage.loadOrganizer()).toBeNull();
    expect(localStorage.getItem('waypoint:organizer:v1')).not.toBeNull();
  });

  test('surfaces quota failures', async () => {
    const storage = await import('./storage');
    await storage.loadOrganizer();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { throw new DOMException('full', 'QuotaExceededError'); };
    await expect(storage.saveOrganizer(createDemoPack())).rejects.toThrow('Offline storage is full');
    IDBObjectStore.prototype.put = original;
  });

  test('clears visitor data without removing organizer data', async () => {
    const storage = await import('./storage'); const pack = createDemoPack();
    await storage.saveOrganizer(pack); await storage.saveVisitor({ pack, checkpointId: 'c-registration', targetCheckpointId: 'c-booth8' });
    await storage.clearVisitor();
    expect(await storage.loadVisitor()).toBeNull();
    expect(await storage.loadOrganizer()).toEqual(pack);
  });

  test('surfaces visitor deletion failures', async () => {
    const storage = await import('./storage'); await storage.loadVisitor();
    const original = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function () { throw new DOMException('blocked', 'UnknownError'); };
    await expect(storage.clearVisitor()).rejects.toThrow('saved visitor location could not be removed');
    IDBObjectStore.prototype.delete = original;
  });
});
