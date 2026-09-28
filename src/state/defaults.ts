/** Defaults and input bounds — WEBSITE-SPEC-biga-calculator.md §6. */

import { C } from '../lib/constants';
import type { Calibration, Inputs, PanelPrefs, Persisted } from './types';

export const DEFAULT_INPUTS: Inputs = {
  balls: 6,
  ballWeightG: C.DEFAULT_BALL_G,
  coldFermentH: 24,
  schedule: 'retarded',

  roomTempF: 70,
  flourSameAsRoom: true,
  flourTempF: 70,
  bigaTempF: [C.DEFAULT_BIGA_TEMP_F],
  bowlState: 'cold',
  bowlTempF: [null],

  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  temperH: 2.5,
  finalDoughTempF: [null],
  waterUsedF: [null],
};

/**
 * §10: Reset starts a new bake. "The day's temperatures" go back to their
 * defaults: everything in Panel 2, the water poured and the final readings.
 * The batch settings stay (balls, ball weight, schedule, cold ferment), and so
 * do the schedule's adjustments, which are settings rather than readings.
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
 * Input bounds.
 *
 * The Panel 1 ranges are given in §6 and are enforced. The temperature ranges
 * are not specified there — they exist only to reject nonsense arriving from a
 * hand-edited URL, so they are deliberately permissive rather than opinionated.
 */
export const BOUNDS = {
  // §4.4. 3 is a hard floor, not a warning: 2 balls won't let a spiral hook
  // grip AND asks for 116 °F water. Two independent reasons, same answer.
  balls: { min: C.MIN_BALLS, max: 24, step: 1 },
  ballWeightG: { min: 240, max: 300, step: 1 },
  coldFermentH: { min: 6, max: 36, step: 1 },

  roomTempF: { min: 32, max: 120, step: 0.5 },
  flourTempF: { min: 32, max: 120, step: 0.5 },
  bigaTempF: { min: 32, max: 120, step: 0.5 },
  bowlTempF: { min: 32, max: 120, step: 0.5 },

  ddtOverrideF: { min: 60, max: 90, step: 0.5 },

  // §4.7 states each of these ranges explicitly. `ballRoomTemp` is absent
  // deliberately — §4.8 computes it and it is no longer a user choice.
  bigaFridgeH: { min: 18, max: 20, step: 0.5 },
  bigaRoomOnlyH: { min: 12, max: 18, step: 0.5 },
  temperH: { min: 2, max: 3, step: 0.25 },

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
