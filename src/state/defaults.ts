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

  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  ballRoomTempH: 1.5,
  temperH: 2.5,
};

export const DEFAULT_CALIBRATION: Calibration = {
  frictionFactors: {},
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

  // §4.7 states each of these ranges explicitly.
  bigaFridgeH: { min: 18, max: 20, step: 0.5 },
  bigaRoomOnlyH: { min: 12, max: 18, step: 0.5 },
  ballRoomTempH: { min: 1, max: 2, step: 0.25 },
  temperH: { min: 2, max: 3, step: 0.25 },
} as const;

export type BoundedField = keyof typeof BOUNDS;

/** Clamp to a field's bounds. Used on commit, never on keystroke. */
export function clampField(field: BoundedField, value: number): number {
  const { min, max } = BOUNDS[field];
  return Math.min(max, Math.max(min, value));
}
