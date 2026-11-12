/**
 * The topping ideas' local copy and their sync — WEBSITE-SPEC §13.3
 * (APP-6, MESSAGE-70).
 *
 * One JSON file per idea under `toppings/`, in the bake log's repository,
 * with the same token and settings as the log. The same local-first sync as
 * the log (`repoSync.ts`), on a store of its own: its own storage key and its
 * own changed and deleted lists, so a failed toppings sync never holds up the
 * log, and the reverse. Without a token the ideas stay in this browser.
 *
 * Photos (APP-8, MESSAGE-73) are JPEGs under `toppings/images/`, named by an
 * idea's `photo` field, and they ride on the ideas' sync rather than being
 * records of their own: an idea about to be pushed uploads its photo first,
 * and once the ideas have synced, the photos they name are fetched and the
 * ones replaced or removed here are deleted, unless an idea still names them.
 *
 * Reads are defensive for the same reason as the log's: an idea can arrive
 * from the repository, where it may have been edited by hand. A record that
 * doesn't parse is dropped here and left in the repository.
 */

import { PHOTO_DIR, base64ToBytes, bytesToBase64, photoPath } from '../lib/photos';
import { isPhotoName, isRating, remoteIsNewer, type ToppingIdea } from '../lib/toppings';
import { memoryPhotoStore, type PhotoStore } from './photoStore';
import {
  mergeRecordsAfterSync,
  removeRecord,
  syncRecords,
  upsertRecord,
  type FetchLike,
  type RecordKind,
  type RecordStore,
  type RecordSyncResult,
  type RepoFiles,
} from './repoSync';
import type { StorageLike } from './storage';

export const TOPPINGS_KEY = 'biga-calculator:toppings:v1';

export interface ToppingStore extends RecordStore<ToppingIdea> {
  /**
   * Photos replaced or removed on this device, or whose idea was deleted
   * here, not yet deleted from the repository. The next sync deletes each
   * one no idea names any more (§13.3).
   */
  deletedPhotos: string[];
}

export const EMPTY_TOPPINGS: ToppingStore = {
  items: [],
  shas: {},
  dirty: [],
  deleted: [],
  deletedPhotos: [],
  lastSyncedAt: '',
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInstant = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * An idea as stored, or null if any part of it is malformed. A text field
 * left out reads as empty; one that isn't text, a rating §13.2 doesn't allow
 * or a missing date is malformed. A rated idea without pre-bake toppings is
 * read as it is: the editor asks for them, and a reader shouldn't hide an
 * idea for it.
 *
 * Keys this build doesn't know are kept, so a device on this build that saves
 * an idea doesn't strip a field a later build added (the way an APP-6 bundle
 * drops `comments`).
 */
export function parseIdea(raw: unknown): ToppingIdea | null {
  if (!isRecord(raw)) return null;
  const { id, name, rating, created, updated, photo, dessert } = raw;
  // The id is a file name in the repository.
  if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  const text = (key: 'pre_bake' | 'post_bake' | 'notes' | 'comments') => {
    const v = raw[key];
    return v === undefined || v === null ? '' : typeof v === 'string' ? v : undefined;
  };
  const pre = text('pre_bake');
  const post = text('post_bake');
  const notes = text('notes');
  const comments = text('comments');
  if (pre === undefined || post === undefined || notes === undefined || comments === undefined) return null;
  if (!(rating === null || rating === undefined || isRating(rating))) return null;
  if (!isInstant(created) || !isInstant(updated)) return null;
  // §13.2: missing or null is no photo; anything else must be a safe file name.
  if (!(photo === undefined || photo === null || isPhotoName(photo))) return null;
  // APP-14: missing or null is a pizza; anything but a boolean is malformed.
  if (!(dessert === undefined || dessert === null || typeof dessert === 'boolean')) return null;
  const unknown = Object.fromEntries(Object.entries(raw).filter(([key]) => !IDEA_KEYS.has(key)));
  return {
    ...unknown,
    id,
    name,
    pre_bake: pre,
    post_bake: post,
    notes,
    comments,
    rating: rating ?? null,
    photo: photo ?? null,
    dessert: dessert ?? false,
    created,
    updated,
  };
}

/** §13.2's fields: every key `parseIdea` reads. */
const IDEA_KEYS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'pre_bake',
  'post_bake',
  'notes',
  'comments',
  'rating',
  'photo',
  'dessert',
  'created',
  'updated',
]);

/** What the shared sync needs to know about an idea. */
export const TOPPING_KIND: RecordKind<ToppingIdea> = {
  dir: 'toppings',
  idOf: (i) => i.id,
  parse: parseIdea,
  putMessage: (id) => `Save topping idea ${id}`,
  deleteMessage: (id) => `Delete topping idea ${id}`,
  offline: 'The ideas are saved on this device and will sync later.',
  noun: 'the idea',
  // §13.3: the copy saved last wins, by when it was saved.
  keepRemote: remoteIsNewer,
};

const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function loadToppings(storage: StorageLike | null): ToppingStore {
  if (!storage) return EMPTY_TOPPINGS;
  let parsed: unknown;
  try {
    const raw = storage.getItem(TOPPINGS_KEY);
    if (raw === null) return EMPTY_TOPPINGS;
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_TOPPINGS;
  }
  if (!isRecord(parsed)) return EMPTY_TOPPINGS;
  const items = Array.isArray(parsed['items'])
    ? parsed['items'].map(parseIdea).filter((i): i is ToppingIdea => i !== null)
    : [];
  const shasRaw = isRecord(parsed['shas']) ? parsed['shas'] : {};
  const shas = Object.fromEntries(Object.entries(shasRaw).filter(([, v]) => typeof v === 'string')) as Record<
    string,
    string
  >;
  return {
    items,
    shas,
    dirty: stringList(parsed['dirty']),
    deleted: stringList(parsed['deleted']),
    deletedPhotos: stringList(parsed['deletedPhotos']).filter(isPhotoName),
    lastSyncedAt: typeof parsed['lastSyncedAt'] === 'string' ? parsed['lastSyncedAt'] : '',
  };
}

export function saveToppings(storage: StorageLike | null, store: ToppingStore): void {
  if (!storage) return;
  try {
    storage.setItem(TOPPINGS_KEY, JSON.stringify(store));
  } catch {
    // Quota or a blocked store. The ideas still work in memory this session.
  }
}

const withPhotoDeleted = (list: readonly string[], photo: string | null) =>
  photo === null || list.includes(photo) ? [...list] : [...list, photo];

/**
 * Add an idea, or replace the one with its id, and mark it for the next
 * sync. A photo the idea no longer names is queued for deletion.
 */
export function upsertIdea(store: ToppingStore, idea: ToppingIdea): ToppingStore {
  const before = store.items.find((i) => i.id === idea.id);
  const dropped = before && before.photo !== idea.photo ? before.photo : null;
  return { ...upsertRecord(TOPPING_KIND, store, idea), deletedPhotos: withPhotoDeleted(store.deletedPhotos, dropped) };
}

/** Remove an idea; one the repository has is deleted there on the next sync, and its photo with it. */
export function removeIdea(store: ToppingStore, id: string): ToppingStore {
  const photo = store.items.find((i) => i.id === id)?.photo ?? null;
  return { ...removeRecord(TOPPING_KIND, store, id), deletedPhotos: withPhotoDeleted(store.deletedPhotos, photo) };
}

/**
 * The photo half of the ideas' sync, for one run (§13.3, APP-8):
 *
 * - **before an idea is written**, its photo is uploaded if the repository
 *   hasn't got it, so no device reads an idea naming a missing file;
 * - **after the ideas have synced**, the photos queued for deletion go, unless
 *   an idea still names one (the copy that won may name the old photo:
 *   "a photo follows its idea"), and every named photo this device hasn't
 *   got is fetched. A device fetches a photo once: its name changes with
 *   each new photo, so a stored one is never stale.
 */
function photoHooks(photos: PhotoStore): Pick<RecordKind<ToppingIdea>, 'beforePut' | 'afterSync'> {
  let listing: Map<string, string> | null = null;
  const remote = async (files: RepoFiles) => (listing ??= await files.listFiles(PHOTO_DIR));
  const fileOf = (name: string) => `${name}.jpg`;

  return {
    async beforePut(idea, files) {
      if (idea.photo === null) return;
      const r = await remote(files);
      if (r.has(fileOf(idea.photo))) return;
      const blob = await photos.get(idea.photo);
      // Not on this device: nothing to upload. Another device may still have it.
      if (!blob) return;
      const base64 = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
      const sha = await files.createFile(photoPath(idea.photo), base64, `Save topping photo ${idea.photo}`);
      if (sha) r.set(fileOf(idea.photo), sha);
      else listing = null;
    },

    async afterSync(recordStore, files) {
      const store = recordStore as ToppingStore;
      const named = new Set(store.items.flatMap((i) => (i.photo === null ? [] : [i.photo])));
      if (named.size === 0 && (store.deletedPhotos ?? []).length === 0) return store;
      let r = await remote(files);
      let deletedPhotos = [...(store.deletedPhotos ?? [])];
      for (const name of store.deletedPhotos ?? []) {
        if (!named.has(name)) {
          // A file uploaded in this run without a sha back: list again for it.
          if (!r.has(fileOf(name)) && listing === null) r = await remote(files);
          const sha = r.get(fileOf(name));
          if (sha) {
            await files.removeFile(photoPath(name), sha, `Delete topping photo ${name}`);
            r.delete(fileOf(name));
          }
        }
        deletedPhotos = deletedPhotos.filter((n) => n !== name);
      }
      for (const name of named) {
        if (await photos.get(name)) continue;
        const sha = r.get(fileOf(name));
        if (!sha) continue;
        const bytes = base64ToBytes(await files.blob(sha));
        await photos.put(name, new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
      }
      return { ...store, deletedPhotos } satisfies ToppingStore;
    },
  };
}

export async function syncToppings(
  start: ToppingStore,
  fetchFn: FetchLike,
  photos: PhotoStore = memoryPhotoStore(),
  now: Date = new Date(),
): Promise<{ store: ToppingStore; error?: RecordSyncResult<ToppingIdea>['error'] }> {
  const kind: RecordKind<ToppingIdea> = { ...TOPPING_KIND, ...photoHooks(photos) };
  const { store, error } = await syncRecords(kind, start, fetchFn, now);
  // The record sync carries every field of the store it was given, deletedPhotos included.
  return { store: store as ToppingStore, ...(error ? { error } : {}) };
}

/**
 * Fold a finished sync into a store that may have changed while it ran (the
 * records as the log does), keeping any photo queued for deletion meanwhile.
 */
export function mergeToppingsAfterSync(current: ToppingStore, started: ToppingStore, synced: ToppingStore): ToppingStore {
  const merged = mergeRecordsAfterSync(TOPPING_KIND, current, started, synced) as ToppingStore;
  const queuedSince = current.deletedPhotos.filter((n) => !started.deletedPhotos.includes(n));
  let deletedPhotos = [...merged.deletedPhotos];
  for (const n of queuedSince) deletedPhotos = withPhotoDeleted(deletedPhotos, n);
  return { ...merged, deletedPhotos };
}
