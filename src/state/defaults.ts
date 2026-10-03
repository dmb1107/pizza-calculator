/** Defaults and input bounds — WEBSITE-SPEC-biga-calculator.md §6. */

import { C } from '../lib/constants';
import type { Calibration, Inputs, PanelPrefs, Persisted, Schedule } from './types';

/**
 * §4.7, §6 Panel 1 (MESSAGE-53). The cold ferment by track. A classic biga
 * arrives fully ripe from 16–18 h at room temperature, so its dough gets a
 * short cold ferment: 6–8 h, default 6. The retarded track keeps 6–36, 24.
 */
export const COLD_FERMENT_H: Record<Schedule, { min: number; max: number; step: number; default: number }> = {
  retarded: { min: 6, max: 36, step: 1, default: 24 },
  classic: { min: 6, max: 8, step: 1, default: 6 },
};

/** §4.7: "Clamp the value into the track's range when the schedule changes." */
export function clampColdFerment(schedule: Schedule, hours: number): number {
  const { min, max } = COLD_FERMENT_H[schedule];
  return Math.min(max, Math.max(min, hours));
}

/**
 * `setInput`'s rules, pure so the tests reach them: the flour tracks the room
 * while the toggle is on, in both directions, and the cold ferment stays inside
 * its track's range, so a schedule change clamps it (§4.7, MESSAGE-53).
 */
export function applyInput<K extends keyof Inputs>(prev: Inputs, key: K, value: Inputs[K]): Inputs {
  const next = { ...prev, [key]: value };
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
  bowlState: 'cold',
  bowlTempF: [null],

  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  temperH: 1.5,
  finalDoughTempF: [null],
  waterUsedF: [null],
};

/**
 * §10: Reset starts a new bake. Today's temperatures go back to their
 * defaults: everything in Panel 2, the water poured and the final readings.
 * The batch settings stay (balls, ball weight, schedule, cold ferment), and so
 * do the schedule's adjustments, which are how the baker plans rather than
 * what they measured. `persistedForNewBake` covers the rest of the page.
 */
export function inputsForNewBake(prev: Inputs): Inputs {
  return {
    ...prev,
    roomTempF: DEFAULT_INPUTS.roomTempF,
    flourSameAsRoom: DEFAULT_INPUTS.flourSameAsRoom,
    flourTempF: DEFAULT_INPUTS.flourTempF,
    bigaTempF: DEFAULT_INPUTS.bigaTempF,
    bowlState: DEFAULT_INPUTS.bowlState,
    bowlTempF: DEFAULT_INPUTS.bowlTempF,
    finalDoughTempF: DEFAULT_INPUTS.finalDoughTempF,
    waterUsedF: DEFAULT_INPUTS.waterUsedF,
  };
}

/** No DDT override. The FF isn't stored: bake 1's seed lives in `bakeLog.ts`. */
export const DEFAULT_CALIBRATION: Calibration = {
  ddtOverrideF: null,
};

/** §6: Batch open by default, the other two collapsed with a summary line. */
export const DEFAULT_PANELS: PanelPrefs = {
  batch: true,
  temperatures: false,
  calibration: false,
};

export const DEFAULT_PERSISTED: Persisted = {
  calibration: DEFAULT_CALIBRATION,
  panels: DEFAULT_PANELS,
  bigaStartAtIso: '',
  timelineMode: 'forward',
  bakeAtIso: '',
  checkedSteps: [],
  timers: [],
  sessionBakeId: '',
};

/**
 * §10: the rest of Reset. The DDT override goes back to auto and the
 * timeline's anchor to its default, since both are per-bake choices: a stale
 * override moves the water target and the rise, and a stale anchor puts every
 * stage in the past. The biga start's default is '', read as "now" the same
 * way a fresh session reads it. The checkboxes, the timers and the link to the
 * saved bake are cleared, so the next save is a new bake.
 *
 * Kept (§10, MESSAGE-49): which panels are open, and which end of the
 * timeline is held. The anchor is the held time, not the mode, so in backward
 * mode the hook takes the bake time the reset start implies, as switching
 * modes does.
 */
export function persistedForNewBake(prev: Persisted): Persisted {
  return {
    ...prev,
    calibration: DEFAULT_CALIBRATION,
    bigaStartAtIso: DEFAULT_PERSISTED.bigaStartAtIso,
    bakeAtIso: DEFAULT_PERSISTED.bakeAtIso,
    checkedSteps: [],
    timers: [],
    sessionBakeId: '',
  };
}

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
  // reasons, same answer.
  balls: { min: C.MIN_BALLS, max: 24, step: 1 },
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
  /** What was poured: wide enough for the whole blend, fridge to hot tap. */
  waterUsedF: { min: 32, max: 140, step: 0.1 },
} as const;

export type BoundedField = keyof typeof BOUNDS;

/** Clamp to a field's bounds. Used on commit, never on keystroke. */
export function clampField(field: BoundedField, value: number): number {
  const { min, max } = BOUNDS[field];
  return Math.min(max, Math.max(min, value));
}
