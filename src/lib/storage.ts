import type { OpticalNavPack } from '../decimen/types';
import type { NavPack } from '../types';
import { validateNavPack } from './navpack';

const DATABASE = 'waypoint';
const STORE = 'state';
const ORGANIZER = 'organizer';
const VISITOR = 'visitor';
const TRANSFER = 'transfer';
const ORGANIZER_KEY = 'waypoint:organizer:v1';
const VISITOR_KEY = 'waypoint:visitor:v1';

export interface VisitorState {
  pack: NavPack;
  checkpointId?: string;
  targetCheckpointId?: string;
  /** Retained so older stored visitor state can be read without migration loss. */
  destinationId?: string;
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

async function write(database: IDBDatabase, key: string, value: unknown): Promise<void> {
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).put(value, key);
  await finished(transaction);
}

async function migrateLegacy(database: IDBDatabase): Promise<void> {
  if (!('localStorage' in globalThis)) return;
  const migrations: Array<[string, string, (value: unknown) => unknown]> = [
    [ORGANIZER_KEY, ORGANIZER, validateNavPack],
    [VISITOR_KEY, VISITOR, (value) => {
      const state = value as Partial<VisitorState>;
      if (!state?.pack) throw new Error('Invalid visitor state.');
      return { ...state, pack: validateNavPack(state.pack) };
    }],
  ];
  for (const [legacyKey, newKey, validate] of migrations) {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) continue;
    try {
      await write(database, newKey, validate(JSON.parse(raw)));
      localStorage.removeItem(legacyKey);
    } catch {
      // Preserve data until both validation and the IndexedDB write succeed.
    }
  }
}

let databasePromise: Promise<IDBDatabase> | undefined;
async function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) throw new Error('Offline storage is unavailable in this browser.');
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Offline storage could not be opened.'));
      request.onblocked = () => reject(new Error('Offline storage is blocked by another Waypoint tab.'));
    }).then(async (database) => { await migrateLegacy(database); return database; }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}

async function read<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readonly');
  const value = await result(transaction.objectStore(STORE).get(key));
  await finished(transaction);
  return (value as T | undefined) ?? null;
}

async function save(key: string, value: unknown): Promise<void> {
  try { await write(await openDatabase(), key, value); }
  catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') throw new Error('Offline storage is full. Remove other saved site data and try again.');
    throw error;
  }
}

async function remove(key: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE, 'readwrite');
  transaction.objectStore(STORE).delete(key);
  await finished(transaction);
}

export async function loadOrganizer(): Promise<NavPack | null> {
  const value = await read<unknown>(ORGANIZER);
  return value ? validateNavPack(value) : null;
}
export async function saveOrganizer(pack: NavPack): Promise<void> { await save(ORGANIZER, validateNavPack(pack)); }
export async function loadVisitor(): Promise<VisitorState | null> {
  const value = await read<VisitorState>(VISITOR);
  return value ? { ...value, pack: validateNavPack(value.pack) } : null;
}
export async function saveVisitor(state: VisitorState): Promise<void> { await save(VISITOR, { ...state, pack: validateNavPack(state.pack) }); }
export async function clearVisitor(): Promise<void> {
  try { await remove(VISITOR); }
  catch { throw new Error('The saved visitor location could not be removed.'); }
}
export async function loadTransferDraft(): Promise<OpticalNavPack | null> { return read<OpticalNavPack>(TRANSFER); }
export async function saveTransferDraft(payload: OpticalNavPack): Promise<void> { await save(TRANSFER, payload); }
