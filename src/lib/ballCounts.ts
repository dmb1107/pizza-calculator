/**
 * §6 Panel 1 (MESSAGE-61): ball counts split evenly between the mixes.
 *
 * Each dough bulks, divides and rises on its own (§4.8), so each must make
 * whole balls. `nMix` is computed as before (§4.5); a count is allowed when
 * `nMix` divides it. At 265 g that removes 11, 13, 15, 17, 19, 20, 22 and 23;
 * at 272 g and above, 9 as well (two mixes of 4½).
 *
 * Pure, and in `src/lib` so the stepper, `applyInput` and the link decoder
 * all decide it the same way.
 */

import { computeCapacity, computeFormula } from './engine';
import { C } from './constants';

/** §6: the stepper's range. Re-exported by `BOUNDS.balls`. */
export const BALLS_MIN = C.MIN_BALLS;
export const BALLS_MAX = 24;

/** How many mixes `balls` at `ballWeightG` runs as (§4.5). */
export function mixesFor(balls: number, ballWeightG: number): number {
  return computeCapacity(computeFormula({ balls, ballWeightG })).nMix;
}

/** True when every mix makes the same whole number of balls. */
export function splitsEvenly(balls: number, ballWeightG: number): boolean {
  return balls % mixesFor(balls, ballWeightG) === 0;
}

/**
 * §6: anything other than the stepper that lands on a disallowed count rounds
 * up to the next allowed one: a ball-weight change, a link, a stored value.
 * 24 is allowed at every weight from 240 to 300 g (three 8-ball mixes), so
 * this always ends; the guard throws rather than loop if a range change ever
 * breaks that.
 */
export function roundUpToEvenSplit(balls: number, ballWeightG: number): number {
  for (let n = balls; n <= BALLS_MAX; n++) {
    if (splitsEvenly(n, ballWeightG)) return n;
  }
  throw new Error(`no allowed ball count from ${balls} at ${ballWeightG} g up to ${BALLS_MAX}`);
}

/**
 * §6: the stepper skips a disallowed count in the direction of the step. At
 * 265 g, up from 18 goes to 21 and down from 21 to 18. Held at the range's
 * ends: a step that finds no allowed count before the end stays put.
 */
export function stepToEvenSplit(balls: number, ballWeightG: number, delta: number): number {
  const dir = Math.sign(delta);
  if (dir === 0) return balls;
  for (let n = balls + delta; n >= BALLS_MIN && n <= BALLS_MAX; n += dir) {
    if (splitsEvenly(n, ballWeightG)) return n;
  }
  return balls;
}
