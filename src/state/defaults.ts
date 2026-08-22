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
  bigaTempF: 64,
  tapTempF: C.DEFAULT_TAP_F,
  freezerTempF: C.DEFAULT_FREEZER_F,
  bowlMassG: C.DEFAULT_BOWL_MASS_G,

  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  temperH: 2.5,
  finalDoughTempF: null,
};

/**
 * §6: seed the friction map with the one real measurement.
 * FF 14.04 °F at 6 balls, bake 1, 21 Aug 2026. Other sizes fall back to 14.0.
 */
export const DEFAULT_CALIBRATION: Calibration = {
  frictionFactors: { 6: { ff: 14.04, measuredAt: '2026-08-21' } },
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
  freezerTempF: DEFAULT_INPUTS.freezerTempF,
  bigaStartAtIso: '',
  checkedSteps: [],
  bowlMassG: DEFAULT_INPUTS.bowlMassG,
};

/**
 * Input bounds.
 *
 * The Panel 1 ranges are given in §6 and are enforced. The temperature ranges
 * are not specified there — they exist only to reject nonsense arriving from a
 * hand-edited URL, so they are deliberately permissive rather than opinionated.
 * The one real ceiling is the freezer: above 32 °F there is no ice, and the
 * §4.4 effective-temperature formula stops meaning anything.
 */
export const BOUNDS = {
  balls: { min: 1, max: 24, step: 1 },
  ballWeightG: { min: 240, max: 300, step: 1 },
  coldFermentH: { min: 6, max: 36, step: 1 },

  roomTempF: { min: 32, max: 120, step: 0.5 },
  flourTempF: { min: 32, max: 120, step: 0.5 },
  bigaTempF: { min: 32, max: 120, step: 0.5 },
  tapTempF: { min: 32, max: 120, step: 0.5 },
  freezerTempF: { min: -20, max: 32, step: 1 },

  frictionFactorF: { min: 0, max: 40, step: 0.1 },
  ddtOverrideF: { min: 60, max: 90, step: 0.5 },

  // §4.7 states each of these ranges explicitly. `ballRoomTemp` is absent
  // deliberately — §4.8 computes it and it is no longer a user choice.
  bigaFridgeH: { min: 18, max: 20, step: 0.5 },
  bigaRoomOnlyH: { min: 12, max: 18, step: 0.5 },
  temperH: { min: 2, max: 3, step: 0.25 },

  bowlMassG: { min: 200, max: 3000, step: 5 },
  /** Wide: this is a reading off a probe, and a wild one should be visible. */
  finalDoughTempF: { min: 55, max: 95, step: 0.1 },
} as const;

export type BoundedField = keyof typeof BOUNDS;

/** Clamp to a field's bounds. Used on commit, never on keystroke. */
export function clampField(field: BoundedField, value: number): number {
  const { min, max } = BOUNDS[field];
  return Math.min(max, Math.max(min, value));
}
