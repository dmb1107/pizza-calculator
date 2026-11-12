/**
 * Bake-log sync through a private GitHub repository — WEBSITE-SPEC §2 and §10.
 *
 * One JSON file per bake under `bakes/`, read and written from the browser
 * through GitHub's contents API by way of the Worker, which holds the one
 * token that can reach that repository (§14.2); this device signs in with a
 * passkey and holds no token. The bake log and the topping ideas (§13.3) are the app's only
 * network calls (§2), and both run `repoSync.ts`'s sync on their own stores.
 *
 * Conflicts: a bake is written by one device at a time in practice, so a stale
 * write (GitHub refuses it because the file moved) re-reads the file's
 * current version and writes again. The device pushing last wins.
 */

import type { LoggedBake } from '../lib/bakeLog';
import { BAKE_KIND, logAsStore, storeAsLog, type LocalLog } from './bakeLogStore';
import {
  mergeRecordsAfterSync,
  serializeRecord,
  syncRecords,
  type FetchLike,
  type SyncError,
} from './repoSync';

export { API, SyncError, fromBase64, toBase64, type FetchLike, type SyncErrorKind } from './repoSync';

export const BAKES_DIR = BAKE_KIND.dir;

/** A bake as its file holds it: indented, so it reads in the repository. */
export function serializeBake(bake: LoggedBake): string {
  return serializeRecord(bake);
}

export interface SyncResult {
  log: LocalLog;
  /** Set when the sync stopped partway. `log` holds whatever finished before it. */
  error?: SyncError;
}

/**
 * Push this device's changes, then pull everything the repository has that
 * this device hasn't seen. Deletions made on another device are applied here.
 */
export async function syncLog(start: LocalLog, fetchFn: FetchLike, now: Date = new Date()): Promise<SyncResult> {
  const { store, error } = await syncRecords(BAKE_KIND, logAsStore(start), fetchFn, now);
  return error ? { log: storeAsLog(store), error } : { log: storeAsLog(store) };
}

/**
 * Fold a finished sync into a log that may have changed while it ran: the
 * sync's result is the base, and any bake edited, added or deleted here in the
 * meantime is applied on top and left marked for the next sync.
 */
export function mergeAfterSync(current: LocalLog, started: LocalLog, synced: LocalLog): LocalLog {
  return storeAsLog(mergeRecordsAfterSync(BAKE_KIND, logAsStore(current), logAsStore(started), logAsStore(synced)));
}
