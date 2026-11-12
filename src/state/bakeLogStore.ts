/**
 * The bake log's local copy — WEBSITE-SPEC-biga-calculator.md §2 and §10.
 *
 * "Each device writes its own copy first and syncs after, so a mix never waits
 * on the network. **Signed out**, the log stays in browser storage" (§14.3). This is
 * that copy, plus the bookkeeping `githubSync.ts` needs: the blob each bake
 * was last synced at, and what changed here since.
 *
 * Reads are defensive for the same reason as `storage.ts`, and more so: a bake
 * can arrive from the repository, where it may have been edited by hand. A
 * record that doesn't parse is dropped rather than solved.
 */

import {
  PHASE_KEYS,
  type FormulaSnapshot,
  type LegacyBowlState,
  type LoggedBake,
  type LoggedMix,
  type PhaseKey,
} from '../lib/bakeLog';
import { removeRecord, upsertRecord, type RecordKind, type RecordStore } from './repoSync';
import type { StorageLike } from './storage';


export const LOG_KEY = 'biga-calculator:log:v1';

export interface LocalLog {
  bakes: LoggedBake[];
  /** The repository blob each bake was last synced at. Absent: never pushed. */
  shas: Record<string, string>;
  /** Bakes changed on this device and not yet pushed. */
  dirty: string[];
  /** Bakes deleted on this device and not yet removed from the repository. */
  deleted: string[];
  /** ISO instant of the last complete sync, '' for never. */
  lastSyncedAt: string;
}

export const EMPTY_LOG: LocalLog = { bakes: [], shas: {}, dirty: [], deleted: [], lastSyncedAt: '' };

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const LEGACY_BOWL_STATES: readonly LegacyBowlState[] = ['cold', 'room', 'warm'];

function parseSnapshot(raw: unknown): FormulaSnapshot | null {
  if (!isRecord(raw) || !isRecord(raw['speeds'])) return null;
  const speeds = raw['speeds'];
  const fields = ['hydration', 'salt', 'biga_fraction', 'biga_hydration', 'overage'] as const;
  if (!fields.every((f) => isNum(raw[f])) || !PHASE_KEYS.every((k) => isNum(speeds[k]))) return null;
  return {
    hydration: raw['hydration'] as number,
    salt: raw['salt'] as number,
    biga_fraction: raw['biga_fraction'] as number,
    biga_hydration: raw['biga_hydration'] as number,
    overage: raw['overage'] as number,
    speeds: Object.fromEntries(PHASE_KEYS.map((k) => [k, speeds[k]])) as Record<PhaseKey, number>,
  };
}

/** A temperature that may be absent: null, or a finite number. Anything else is malformed. */
const optionalNum = (v: unknown): number | null | undefined => (v === null ? null : isNum(v) ? v : undefined);

function parseMix(raw: unknown): LoggedMix | null {
  if (!isRecord(raw) || !isNum(raw['mix_index']) || !isRecord(raw['phase_seconds'])) return null;
  const { biga_temp_at_mix_f: biga, bowl_temp_f: bowl, bowl_prefilled: prefilled } = raw;
  const water = optionalNum(raw['water_temp_used_f']);
  const final = optionalNum(raw['final_dough_temp_f']);
  if (!isNum(biga) || !isNum(bowl) || typeof prefilled !== 'boolean' || water === undefined || final === undefined) {
    return null;
  }
  // §10: bakes before MESSAGE-54 carry the selector's value. Kept so a rewrite
  // doesn't strip it; nothing reads it, so an unrecognised one is dropped
  // rather than rejecting the bake.
  const bowlState = raw['bowl_state'];
  const legacy = LEGACY_BOWL_STATES.includes(bowlState as LegacyBowlState)
    ? { bowl_state: bowlState as LegacyBowlState }
    : {};
  const seconds = raw['phase_seconds'];
  return {
    mix_index: raw['mix_index'],
    biga_temp_at_mix_f: biga,
    ...legacy,
    bowl_temp_f: bowl,
    bowl_prefilled: prefilled,
    water_temp_used_f: water,
    final_dough_temp_f: final,
    // A phase time that isn't a positive number is a phase not captured.
    phase_seconds: Object.fromEntries(
      PHASE_KEYS.map((k) => [k, isNum(seconds[k]) && seconds[k] > 0 ? seconds[k] : null]),
    ) as Record<PhaseKey, number | null>,
    excluded: raw['excluded'] === true,
  };
}

/** A bake as stored, or null if any part of it is malformed. */
export function parseBake(raw: unknown): LoggedBake | null {
  if (!isRecord(raw)) return null;
  const { bake_id, date, balls, ball_g, n_mix } = raw;
  if (typeof bake_id !== 'string' || !/^[\w-]+$/.test(bake_id)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!isNum(balls) || !isNum(ball_g) || !isNum(n_mix) || balls <= 0 || ball_g <= 0 || n_mix < 1) return null;
  const formula = parseSnapshot(raw['formula']);
  const room = raw['room_temp_f'];
  const flour = raw['flour_temp_f'];
  if (!formula || !isNum(room) || !isNum(flour) || !Array.isArray(raw['mixes'])) return null;
  const mixes = raw['mixes'].map(parseMix);
  if (mixes.length === 0 || mixes.some((m) => m === null)) return null;
  return {
    bake_id,
    date,
    balls,
    ball_g,
    n_mix,
    formula,
    room_temp_f: room,
    flour_temp_f: flour,
    flour_follows_room: raw['flour_follows_room'] === true,
    mixes: mixes as LoggedMix[],
  };
}

const stringList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function loadLog(storage: StorageLike | null): LocalLog {
  if (!storage) return EMPTY_LOG;
  let parsed: unknown;
  try {
    const raw = storage.getItem(LOG_KEY);
    if (raw === null) return EMPTY_LOG;
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_LOG;
  }
  if (!isRecord(parsed)) return EMPTY_LOG;
  const bakes = Array.isArray(parsed['bakes'])
    ? parsed['bakes'].map(parseBake).filter((b): b is LoggedBake => b !== null)
    : [];
  const shasRaw = isRecord(parsed['shas']) ? parsed['shas'] : {};
  const shas = Object.fromEntries(Object.entries(shasRaw).filter(([, v]) => typeof v === 'string')) as Record<
    string,
    string
  >;
  return {
    bakes,
    shas,
    dirty: stringList(parsed['dirty']),
    deleted: stringList(parsed['deleted']),
    lastSyncedAt: typeof parsed['lastSyncedAt'] === 'string' ? parsed['lastSyncedAt'] : '',
  };
}

export function saveLog(storage: StorageLike | null, log: LocalLog): void {
  if (!storage) return;
  try {
    storage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    // Quota or a blocked store. The log still works in memory this session.
  }
}

// ---------------------------------------------------------------------------
// Local edits. Each marks what the next sync has to push.
// ---------------------------------------------------------------------------

/** What the shared sync (`repoSync.ts`) needs to know about a bake. */
export const BAKE_KIND: RecordKind<LoggedBake> = {
  dir: 'bakes',
  idOf: (b) => b.bake_id,
  parse: parseBake,
  putMessage: (id) => `Log bake ${id}`,
  deleteMessage: (id) => `Delete bake ${id}`,
  offline: 'The log is saved on this device and will sync later.',
  noun: 'the bake',
};

/** The log as the shared sync's store, and back. */
export const logAsStore = ({ bakes, ...rest }: LocalLog): RecordStore<LoggedBake> => ({ items: bakes, ...rest });
export const storeAsLog = ({ items, ...rest }: RecordStore<LoggedBake>): LocalLog => ({ bakes: items, ...rest });

/** Add a bake, or replace the one with its id. */
export function upsertBake(log: LocalLog, bake: LoggedBake): LocalLog {
  return storeAsLog(upsertRecord(BAKE_KIND, logAsStore(log), bake));
}

/** Only a bake the repository has needs deleting there. */
export function removeBake(log: LocalLog, bakeId: string): LocalLog {
  return storeAsLog(removeRecord(BAKE_KIND, logAsStore(log), bakeId));
}

/** Dave's switch (§10). */
export function setMixExcluded(log: LocalLog, bakeId: string, mixIndex: number, excluded: boolean): LocalLog {
  const bake = log.bakes.find((b) => b.bake_id === bakeId);
  if (!bake) return log;
  return upsertBake(log, {
    ...bake,
    mixes: bake.mixes.map((m) => (m.mix_index === mixIndex ? { ...m, excluded } : m)),
  });
}
