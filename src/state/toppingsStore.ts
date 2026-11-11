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
 * Reads are defensive for the same reason as the log's: an idea can arrive
 * from the repository, where it may have been edited by hand. A record that
 * doesn't parse is dropped here and left in the repository.
 */

import { isRating, remoteIsNewer, type ToppingIdea } from '../lib/toppings';
import {
  mergeRecordsAfterSync,
  removeRecord,
  syncRecords,
  upsertRecord,
  type FetchLike,
  type GitHubConfig,
  type RecordKind,
  type RecordStore,
  type RecordSyncResult,
} from './repoSync';
import type { StorageLike } from './storage';

export const TOPPINGS_KEY = 'biga-calculator:toppings:v1';

export type ToppingStore = RecordStore<ToppingIdea>;

export const EMPTY_TOPPINGS: ToppingStore = { items: [], shas: {}, dirty: [], deleted: [], lastSyncedAt: '' };

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
  const { id, name, rating, created, updated } = raw;
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

/** Add an idea, or replace the one with its id, and mark it for the next sync. */
export const upsertIdea = (store: ToppingStore, idea: ToppingIdea): ToppingStore => upsertRecord(TOPPING_KIND, store, idea);

/** Remove an idea; one the repository has is deleted there on the next sync. */
export const removeIdea = (store: ToppingStore, id: string): ToppingStore => removeRecord(TOPPING_KIND, store, id);

export function syncToppings(
  cfg: GitHubConfig,
  start: ToppingStore,
  fetchFn: FetchLike,
  now: Date = new Date(),
): Promise<RecordSyncResult<ToppingIdea>> {
  return syncRecords(cfg, TOPPING_KIND, start, fetchFn, now);
}

export function mergeToppingsAfterSync(current: ToppingStore, started: ToppingStore, synced: ToppingStore): ToppingStore {
  return mergeRecordsAfterSync(TOPPING_KIND, current, started, synced);
}
