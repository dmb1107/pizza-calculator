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
import { DEFAULT_CALIBRATION, DEFAULT_PANELS, DEFAULT_PERSISTED, clampField } from './defaults';
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

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function parseFrictionFactors(raw: unknown): Calibration['frictionFactors'] {
  if (!isRecord(raw)) return {};
  const out: Calibration['frictionFactors'] = {};
  for (const [key, value] of Object.entries(raw)) {
    const balls = Number(key);
    // Keys are batch sizes; anything else is corruption.
    if (!Number.isInteger(balls) || balls < 1 || balls > 24) continue;
    if (!isRecord(value)) continue;
    const ff = value['ff'];
    if (typeof ff !== 'number' || !Number.isFinite(ff)) continue;
    const measuredAt = value['measuredAt'];
    out[balls] = {
      ff: clampField('frictionFactorF', ff),
      measuredAt: typeof measuredAt === 'string' ? measuredAt : '',
    };
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
    freezerTempF: clampField(
      'freezerTempF',
      finiteOr(parsed['freezerTempF'], DEFAULT_PERSISTED.freezerTempF),
    ),
    bigaStartAtIso: parseIsoInstant(parsed['bigaStartAtIso']),
    checkedSteps: parseStringArray(parsed['checkedSteps']),
    bowlMassG: clampField('bowlMassG', finiteOr(parsed['bowlMassG'], DEFAULT_PERSISTED.bowlMassG)),
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
 * §6: select the friction factor by current batch size, falling back to 14.
 *
 * "When the value in use is the fallback, badge it 'estimated — not yet
 * calibrated.' When it's measured, show the date it was recorded."
 */
export function effectiveFriction(calibration: Calibration, balls: number): EffectiveFriction {
  const measured = calibration.frictionFactors[balls];
  if (!measured) return { ff: C.DEFAULT_FF, isEstimate: true };
  return {
    ff: measured.ff,
    isEstimate: false,
    ...(measured.measuredAt ? { measuredAt: measured.measuredAt } : {}),
  };
}

/** Record a measured friction factor for one batch size. */
export function recordFriction(
  calibration: Calibration,
  balls: number,
  ff: number,
  today: string,
): Calibration {
  return {
    ...calibration,
    frictionFactors: {
      ...calibration.frictionFactors,
      [balls]: { ff: clampField('frictionFactorF', ff), measuredAt: today },
    },
  };
}

/** Forget a batch size's measurement, returning it to the estimate. */
export function clearFriction(calibration: Calibration, balls: number): Calibration {
  const next = { ...calibration.frictionFactors };
  delete next[balls];
  return { ...calibration, frictionFactors: next };
}
