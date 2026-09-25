/**
 * localStorage persistence — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * "Calibration + preferences persist to localStorage." Everything here takes
 * the storage object as an argument rather than reaching for the global, so it
 * is testable without a DOM and cannot throw in a context that has no
 * localStorage (private browsing, an embedded webview).
 *
 * Reads are defensive by design: stored JSON is user-editable and may be from
 * an older version of the app, so every field is validated on the way in and a
 * bad record degrades to defaults rather than breaking the calculator.
 */

import { C } from '../lib/constants';
import { BOUNDS, DEFAULT_CALIBRATION, DEFAULT_PANELS, DEFAULT_PERSISTED, clampField } from './defaults';
import type { Calibration, EffectiveFriction, PanelPrefs, Persisted, RunningTimer } from './types';

export const STORAGE_KEY = 'biga-calculator:v1';

/** The slice of the Storage interface actually used. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
 * A key the map can legitimately hold: some whole number of balls split
 * evenly across some number of mixes, `balls / nMix` exactly. 6, 6.5 and 20/3
 * pass; 0, 99 and 6.4 are corruption.
 */
export function isMixSizeKey(key: number): boolean {
  if (!Number.isFinite(key) || key <= 0) return false;
  for (let nMix = 1; nMix <= BOUNDS.balls.max; nMix++) {
    const balls = Math.round(key * nMix);
    if (balls >= 1 && balls <= BOUNDS.balls.max && balls / nMix === key) return true;
  }
  return false;
}

/**
 * The seed as it shipped before MESSAGE-25. §5 re-solved bake 1 to 14.031; a
 * stored map still carrying this exact entry is the untouched seed rather than
 * a measurement, so it is replaced. Anything the baker typed is left alone.
 */
const SUPERSEDED_SEED = { key: 6, ff: 14.04, measuredAt: '2026-08-21' } as const;

function parseFrictionFactors(raw: unknown): Calibration['frictionFactors'] {
  if (!isRecord(raw)) return {};
  const out: Calibration['frictionFactors'] = {};
  for (const [key, value] of Object.entries(raw)) {
    // §6: keyed on balls per mix. Maps stored before MESSAGE-25 were keyed on
    // batch size; every batch of up to 9 balls at the default ball weight is
    // one mix, so those keys read the same either way. A split-batch key (12,
    // 18) now names a mix size that can't occur and is simply never read.
    const size = Number(key);
    if (!isMixSizeKey(size)) continue;
    if (!isRecord(value)) continue;
    const ff = value['ff'];
    if (typeof ff !== 'number' || !Number.isFinite(ff)) continue;
    const measuredAt = typeof value['measuredAt'] === 'string' ? value['measuredAt'] : '';
    const seed =
      size === SUPERSEDED_SEED.key && ff === SUPERSEDED_SEED.ff && measuredAt === SUPERSEDED_SEED.measuredAt;
    out[size] = seed
      ? { ...DEFAULT_CALIBRATION.frictionFactors[SUPERSEDED_SEED.key]! }
      : { ff: clampField('frictionFactorF', ff), measuredAt };
  }
  return out;
}

/**
 * Started timers, dropping anything malformed.
 *
 * A stored timer is just a timestamp and two bounds, so a corrupt entry can
 * only ever produce a nonsense countdown — cheap to validate, and the
 * alternative is a step showing "NaN:NaN" in the middle of a mix.
 */
function parseTimers(raw: unknown): RunningTimer[] {
  if (!Array.isArray(raw)) return [];
  const out: RunningTimer[] = [];
  for (const v of raw) {
    if (!isRecord(v)) continue;
    const { stepId, startedAt, minMinutes, maxMinutes } = v;
    if (typeof stepId !== 'string' || stepId === '') continue;
    if (![startedAt, minMinutes, maxMinutes].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      continue;
    }
    out.push({
      stepId,
      startedAt: startedAt as number,
      minMinutes: minMinutes as number,
      maxMinutes: maxMinutes as number,
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
    calibration: {
      frictionFactors: parseFrictionFactors(calibrationRaw['frictionFactors']),
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

/**
 * §6: select the friction factor by the batch's balls per mix
 * (`ballsPerMix` in the engine), falling back to 14. Exact match only — 6.5
 * does not borrow from 6 or 7.
 *
 * "When the value in use is the fallback, badge it 'estimated — not yet
 * calibrated.' When it's measured, show the date it was recorded."
 */
export function effectiveFriction(calibration: Calibration, ballsPerMix: number): EffectiveFriction {
  const measured = calibration.frictionFactors[ballsPerMix];
  if (!measured) return { ff: C.DEFAULT_FF, isEstimate: true };
  return {
    ff: measured.ff,
    isEstimate: false,
    ...(measured.measuredAt ? { measuredAt: measured.measuredAt } : {}),
  };
}

/** Record a measured friction factor for one mix size — an FF solved on a 12-ball bake files under 6. */
export function recordFriction(
  calibration: Calibration,
  ballsPerMix: number,
  ff: number,
  today: string,
): Calibration {
  return {
    ...calibration,
    frictionFactors: {
      ...calibration.frictionFactors,
      [ballsPerMix]: { ff: clampField('frictionFactorF', ff), measuredAt: today },
    },
  };
}

/** Forget a mix size's measurement, returning it to the estimate. */
export function clearFriction(calibration: Calibration, ballsPerMix: number): Calibration {
  const next = { ...calibration.frictionFactors };
  delete next[ballsPerMix];
  return { ...calibration, frictionFactors: next };
}
