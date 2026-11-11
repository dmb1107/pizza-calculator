/** Defaults and input bounds — WEBSITE-SPEC-biga-calculator.md §6. */

import { C } from '../lib/constants';
import { BALLS_MAX, BALLS_MIN, roundUpToEvenSplit } from '../lib/ballCounts';
import { DEFAULT_TAB } from '../lib/tabs';
import type { Calibration, Inputs, PanelPrefs, Persisted, Schedule } from './types';

/**
 * §4.7, §6 Panel 1. The cold ferment by track. A classic biga arrives fully
 * ripe from 16–18 h at room temperature, so its dough gets a short cold
 * ferment: 6–8 h, default 6 (MESSAGE-53). The retarded track runs to 48 h
 * (MESSAGE-59): on bake 2, balls from one dough had more flavor at 48 h than
 * at 24 and didn't over-proof. The default stays 24 until a full batch at
 * 48 h, Dave's call.
 */
export const COLD_FERMENT_H: Record<Schedule, { min: number; max: number; step: number; default: number }> = {
  retarded: { min: 6, max: 48, step: 1, default: 24 },
  classic: { min: 6, max: 8, step: 1, default: 6 },
};

/** §4.7: "Clamp the value into the track's range when the schedule changes." */
export function clampColdFerment(schedule: Schedule, hours: number): number {
  const { min, max } = COLD_FERMENT_H[schedule];
  return Math.min(max, Math.max(min, hours));
}

/**
 * `setInput`'s rules, pure so the tests reach them: the flour tracks the room
 * while the toggle is on, in both directions; the cold ferment stays inside
 * its track's range, so a schedule change clamps it (§4.7, MESSAGE-53); and a
 * ball count that doesn't split evenly between the mixes rounds up to one that
 * does, whether the count or the ball weight moved (§6, MESSAGE-61). The
 * stepper skips instead, before it gets here (`stepToEvenSplit`).
 */
export function applyInput<K extends keyof Inputs>(prev: Inputs, key: K, value: Inputs[K]): Inputs {
  const next = { ...prev, [key]: value };
  if (key === 'balls' || key === 'ballWeightG') {
    next.balls = roundUpToEvenSplit(next.balls, next.ballWeightG);
  }
  if (key === 'roomTempF' && next.flourSameAsRoom) next.flourTempF = next.roomTempF;
  if (key === 'flourSameAsRoom' && value === true) next.flourTempF = next.roomTempF;
  if (key === 'schedule' || key === 'coldFermentH') {
    next.coldFermentH = clampColdFerment(next.schedule, next.coldFermentH);
  }
  return next;
}

export const DEFAULT_INPUTS: Inputs = {
  balls: 6,
  ballWeightG: C.DEFAULT_BALL_G,
  coldFermentH: COLD_FERMENT_H.retarded.default,
  schedule: 'retarded',

  roomTempF: 70,
  flourSameAsRoom: true,
  flourTempF: 70,
  bigaTempF: [C.DEFAULT_BIGA_TEMP_F],
  bowlTempF: [null],

  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  temperH: 1.5,
  finalDoughTempF: [null],
};

/**
 * §10: Reset starts a new bake, and every input goes back to its default:
 * the batch settings (balls, ball weight, schedule, cold ferment), the
 * schedule's adjustments, and today's readings (room, flour and its "Same as
 * room" switch, each mix's biga and bowl, the final readings). Dave's call on
 * 10 Nov 2026, after MESSAGE-65: until then the batch settings and the
 * adjustments were kept. `persistedForNewBake` (`storedInputs.ts`) covers the
 * rest of the page.
 */
export function inputsForNewBake(): Inputs {
  return DEFAULT_INPUTS;
}

/** No DDT override. The FF isn't stored: bake 1's seed lives in `bakeLog.ts`. */
export const DEFAULT_CALIBRATION: Calibration = {
  ddtOverrideF: null,
};

/** §6: Batch open by default, Calibration collapsed with a summary line. */
export const DEFAULT_PANELS: PanelPrefs = {
  batch: true,
  calibration: false,
};

export const DEFAULT_PERSISTED: Persisted = {
  calibration: DEFAULT_CALIBRATION,
  panels: DEFAULT_PANELS,
  bigaStartAtIso: '',
  timelineMode: 'forward',
  bakeAtIso: '',
  checkedSteps: [],
  closedGroups: [],
  timers: [],
  sessionBakeId: '',
  inputsQuery: null,
  tab: DEFAULT_TAB,
};

/**
 * Input bounds.
 *
 * The Panel 1 ranges are given in §6 and are enforced. The temperature ranges
 * are not specified there — they exist only to reject nonsense arriving from a
 * hand-edited URL, so they are deliberately permissive rather than opinionated.
 */
export const BOUNDS = {
  // §4.4. 3 is a hard floor, not a warning: 2 balls won't let a spiral hook
  // grip AND asks for 126 °F water at the hot corner. Two independent
  // reasons, same answer. Inside the range only counts that split evenly
  // are allowed (`ballCounts.ts`, MESSAGE-61).
  balls: { min: BALLS_MIN, max: BALLS_MAX, step: 1 },
  ballWeightG: { min: 240, max: 300, step: 1 },
  // The widest track's range, for a generic clamp. Each track's own range is
  // `COLD_FERMENT_H`, applied by `clampColdFerment` after this.
  coldFermentH: { min: COLD_FERMENT_H.retarded.min, max: COLD_FERMENT_H.retarded.max, step: 1 },

  roomTempF: { min: 32, max: 120, step: 0.5 },
  flourTempF: { min: 32, max: 120, step: 0.5 },
  bigaTempF: { min: 32, max: 120, step: 0.5 },
  bowlTempF: { min: 32, max: 120, step: 0.5 },

  ddtOverrideF: { min: 60, max: 90, step: 0.5 },

  // §4.7 states each of these ranges explicitly. `ballRoomTemp` is absent
  // deliberately — §4.8 computes it and it is no longer a user choice.
  bigaFridgeH: { min: 18, max: 20, step: 0.5 },
  bigaRoomOnlyH: { min: 12, max: 18, step: 0.5 },
  // 1.5–2 since MESSAGE-53 (was 2–3): Sisofo's 1–2 h, and the recipe's
  // cooling figure puts a 39 °F ball at 60 °F in a little over an hour.
  temperH: { min: 1.5, max: 2, step: 0.25 },

  /** Wide: this is a reading off a probe, and a wild one should be visible. */
  finalDoughTempF: { min: 55, max: 95, step: 0.1 },
} as const;

export type BoundedField = keyof typeof BOUNDS;

/** Clamp to a field's bounds. Used on commit, never on keystroke. */
export function clampField(field: BoundedField, value: number): number {
  const { min, max } = BOUNDS[field];
  return Math.min(max, Math.max(min, value));
}
