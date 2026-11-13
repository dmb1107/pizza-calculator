/**
 * §13.3 (APP-8, MESSAGE-73): this device's copy of the ideas' photos, keyed
 * by an idea's `photo` name. IndexedDB, on every device, signed in or not: a
 * photo is a few hundred KB and localStorage holds about 5 MB in all.
 *
 * Three kinds of entry: the photo itself under its name, the closed card's
 * thumbnail under `thumbKey(name)`, and the gallery's square copy under
 * `squareKey(name)`. The last two are made here from the photo; the thumbnail
 * is never synced, and the square copy is uploaded beside the photo for the
 * portfolio (§13.3).
 */

export interface PhotoStore {
  get(key: string): Promise<Blob | null>;
  put(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  /** Told the key of every entry written or deleted. Returns the unsubscribe. */
  subscribe(listener: (key: string) => void): () => void;
}

/** The thumbnail's key for a photo name. `~` can't occur in a photo name. */
export const thumbKey = (name: string) => `${name}~thumb`;

/** The square copy's key for a photo name. */
export const squareKey = (name: string) => `${name}~square`;

/** The photo name an entry belongs to: the photo, its thumbnail or its square copy. */
export const photoOfKey = (key: string) => key.replace(/~(?:thumb|square)$/, '');

/** Makes a photo's square copy (`makeSquare` in the browser). */
export type SquareMaker = (photo: Blob) => Promise<Blob>;

/**
 * A photo's square copy on this device: the kept one, or made from the photo
 * and kept the first time it's wanted. Null while the photo isn't here.
 */
export async function keptSquare(photos: PhotoStore, name: string, make: SquareMaker): Promise<Blob | null> {
  const kept = await photos.get(squareKey(name));
  if (kept) return kept;
  const full = await photos.get(name);
  if (!full) return null;
  const square = await make(full);
  await photos.put(squareKey(name), square);
  return square;
}

function listeners() {
  const set = new Set<(key: string) => void>();
  return {
    subscribe(fn: (key: string) => void) {
      set.add(fn);
      return () => void set.delete(fn);
    },
    emit(key: string) {
      for (const fn of set) fn(key);
    },
  };
}

/** In memory only: tests, and a browser with no IndexedDB. */
export function memoryPhotoStore(): PhotoStore {
  const data = new Map<string, Blob>();
  const l = listeners();
  return {
    get: async (key) => data.get(key) ?? null,
    put: async (key, blob) => {
      data.set(key, blob);
      l.emit(key);
    },
    delete: async (key) => {
      data.delete(key);
      l.emit(key);
    },
    keys: async () => [...data.keys()],
    subscribe: l.subscribe,
  };
}

const DB_NAME = 'biga-calculator-photos';
const STORE = 'photos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<R>(db: IDBDatabase, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = op(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * IndexedDB, with every write held in memory until it lands, so a photo
 * saved a moment before a sync starts is there for the sync to upload. Falls
 * back to memory where IndexedDB can't be opened (a private window that
 * blocks it): the photos then last the session.
 */
export function browserPhotoStore(): PhotoStore {
  const pending = new Map<string, Blob | null>();
  const l = listeners();
  let dbPromise: Promise<IDBDatabase | null> | null = null;
  const db = () =>
    (dbPromise ??= typeof indexedDB === 'undefined' ? Promise.resolve(null) : openDb().catch(() => null));
  const fallback = new Map<string, Blob>();

  return {
    async get(key) {
      if (pending.has(key)) return pending.get(key) ?? null;
      const d = await db();
      if (!d) return fallback.get(key) ?? null;
      try {
        const v = await run<unknown>(d, 'readonly', (s) => s.get(key));
        return v instanceof Blob ? v : null;
      } catch {
        return null;
      }
    },
    async put(key, blob) {
      pending.set(key, blob);
      l.emit(key);
      const d = await db();
      try {
        if (d) await run(d, 'readwrite', (s) => s.put(blob, key));
        else fallback.set(key, blob);
      } finally {
        if (pending.get(key) === blob) pending.delete(key);
      }
    },
    async delete(key) {
      pending.set(key, null);
      l.emit(key);
      const d = await db();
      try {
        if (d) await run(d, 'readwrite', (s) => s.delete(key));
        else fallback.delete(key);
      } finally {
        if (pending.get(key) === null) pending.delete(key);
      }
    },
    async keys() {
      const d = await db();
      const stored = d
        ? await run<IDBValidKey[]>(d, 'readonly', (s) => s.getAllKeys()).catch(() => [] as IDBValidKey[])
        : [...fallback.keys()];
      const out = new Set(stored.filter((k): k is string => typeof k === 'string'));
      for (const [k, v] of pending) {
        if (v === null) out.delete(k);
        else out.add(k);
      }
      return [...out];
    },
    subscribe: l.subscribe,
  };
}
