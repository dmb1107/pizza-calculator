/**
 * Browser-storage persistence — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * Preferences and the session persist to browser storage. The FF doesn't: it
 * is computed from the bake log each time (§6, Panel 3), and a map stored by
 * an earlier version is ignored. The log itself is in `bakeLogStore.ts`.
 * Everything here takes
 * the storage object as an argument rather than reaching for the global, so it
 * is testable without a DOM and cannot throw in a context that has no
 * localStorage (private browsing, an embedded webview).
 *
 * Reads are defensive by design: stored JSON is user-editable and may be from
 * an older version of the app, so every field is validated on the way in and a
 * bad record degrades to defaults rather than breaking the calculator.
 */

import { DEFAULT_CALIBRATION, DEFAULT_PANELS, DEFAULT_PERSISTED, clampField } from './defaults';
import type { PanelPrefs, Persisted, RunningTimer } from './types';

export const STORAGE_KEY = 'biga-calculator:v1';

/** The slice of the Storage interface actually used. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** Optional so an in-memory stand-in needs only the two above. */
  removeItem?(key: string): void;
}

/** The real localStorage, or null where it isn't available or is blocked. */
export function browserStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    // Safari in private mode exposes localStorage but throws on write.
    const probe = `${STORAGE_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Started timers, dropping anything malformed.
 *
 * A stored timer is just a timestamp and two bounds, so a corrupt entry can
 * only ever produce a nonsense timer — cheap to validate, and the
 * alternative is a step showing "NaN:NaN" in the middle of a mix.
 */
function parseTimers(raw: unknown): RunningTimer[] {
  if (!Array.isArray(raw)) return [];
  const out: RunningTimer[] = [];
  for (const v of raw) {
    if (!isRecord(v)) continue;
    const { stepId, startedAt, minMinutes, maxMinutes, stoppedAt } = v;
    if (typeof stepId !== 'string' || stepId === '') continue;
    if (![startedAt, minMinutes, maxMinutes].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      continue;
    }
    // A stop before the start is corruption; the timer reads as still running.
    const stopped =
      typeof stoppedAt === 'number' && Number.isFinite(stoppedAt) && stoppedAt >= (startedAt as number);
    out.push({
      stepId,
      startedAt: startedAt as number,
      minMinutes: minMinutes as number,
      maxMinutes: maxMinutes as number,
      ...(stopped ? { stoppedAt: stoppedAt as number } : {}),
    });
  }
  return out;
}

/** A list of step ids, dropping anything that isn't a string. */
function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

/** An ISO instant we wrote ourselves, or '' if it is anything else. */
function parseIsoInstant(raw: unknown): string {
  if (typeof raw !== 'string' || raw === '') return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : raw;
}

/**
 * Backward mode only means something with a bake time to hold, so a mode
 * without one degrades to forward rather than to a schedule anchored nowhere.
 */
function parseTimelineAnchor(mode: unknown, bakeAtRaw: unknown): Pick<Persisted, 'timelineMode' | 'bakeAtIso'> {
  const bakeAtIso = parseIsoInstant(bakeAtRaw);
  const timelineMode = mode === 'backward' && bakeAtIso !== '' ? 'backward' : 'forward';
  return { timelineMode, bakeAtIso };
}

function parsePanels(raw: unknown): PanelPrefs {
  if (!isRecord(raw)) return DEFAULT_PANELS;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    batch: bool(raw['batch'], DEFAULT_PANELS.batch),
    temperatures: bool(raw['temperatures'], DEFAULT_PANELS.temperatures),
    calibration: bool(raw['calibration'], DEFAULT_PANELS.calibration),
  };
}

/** Read persisted state, degrading to defaults on anything unexpected. */
export function loadPersisted(storage: StorageLike | null): Persisted {
  if (!storage) return DEFAULT_PERSISTED;

  let parsed: unknown;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_PERSISTED;
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PERSISTED;
  }
  if (!isRecord(parsed)) return DEFAULT_PERSISTED;

  const calibrationRaw = isRecord(parsed['calibration']) ? parsed['calibration'] : {};
  const ddtRaw = calibrationRaw['ddtOverrideF'];

  return {
    // A `frictionFactors` map stored before the log is ignored (§6, Panel 3):
    // the FF comes from the log, and a typed value would outrank it.
    calibration: {
      ddtOverrideF:
        typeof ddtRaw === 'number' && Number.isFinite(ddtRaw)
          ? clampField('ddtOverrideF', ddtRaw)
          : DEFAULT_CALIBRATION.ddtOverrideF,
    },
    panels: parsePanels(parsed['panels']),
    bigaStartAtIso: parseIsoInstant(parsed['bigaStartAtIso']),
    ...parseTimelineAnchor(parsed['timelineMode'], parsed['bakeAtIso']),
    checkedSteps: parseStringArray(parsed['checkedSteps']),
    timers: parseTimers(parsed['timers']),
    // Typing times stored by an earlier build are ignored: nothing tracks
    // which values were typed (§10, Dave's call on 28 Sep).
    sessionBakeId: typeof parsed['sessionBakeId'] === 'string' ? parsed['sessionBakeId'] : '',
  };
}

/** Write persisted state. A failure here must never break the calculator. */
export function savePersisted(storage: StorageLike | null, value: Persisted): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota exceeded or a blocked store. The session still works in memory.
  }
}
