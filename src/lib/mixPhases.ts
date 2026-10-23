/**
 * The four mixer phases and their reference times — WEBSITE-SPEC-biga-calculator.md
 * §4.3, read by the bake log's normalization and by §4.6's probe target.
 *
 * Its own module so the engine can read the references without importing the
 * bake log, which imports the engine.
 */

import { STEPS } from '../content/steps';
import { C } from './constants';

export type PhaseKey = 'a' | 'b' | 'c' | 'd';
export const PHASE_KEYS: readonly PhaseKey[] = ['a', 'b', 'c', 'd'];

export interface MixPhase {
  key: PhaseKey;
  /** The step that runs it: `mix-2`, `mix-3`, `mix-5`, `mix-7`. */
  stepId: string;
  /** Dial %, from the step's speed. Keys `FRICTION_RATE`. */
  dial: number;
  /** The printed range, minutes, from the step's timer. */
  rangeMin: readonly [number, number];
  /** The middle of the range: §4.3's reference. */
  referenceMin: number;
}

/**
 * The four mixer phases, derived from the step content rather than typed: the
 * speed steps of the mix phase, in order. §4.3 says to derive each reference
 * from its timer's range rather than typing 3.5, so extending a phase in §8.2
 * moves its reference, and every logged bake re-normalizes with it.
 */
export const MIX_PHASES: readonly MixPhase[] = (() => {
  const speedSteps = STEPS.filter((s) => s.phase === 'mix' && s.speed);
  if (speedSteps.length !== PHASE_KEYS.length) {
    throw new Error(`expected ${PHASE_KEYS.length} mixer phases, found ${speedSteps.length}`);
  }
  return speedSteps.map((s, i) => {
    const t = s.timerMinutes;
    if (t === undefined) throw new Error(`${s.id} has a speed but no timer`);
    const rangeMin: readonly [number, number] = Array.isArray(t) ? [t[0], t[1]] : [t, t];
    const dial = s.speed!.dial;
    if (!(dial in C.FRICTION_RATE)) throw new Error(`${s.id}: no friction rate at ${dial}%`);
    return {
      key: PHASE_KEYS[i]!,
      stepId: s.id,
      dial,
      rangeMin,
      referenceMin: (rangeMin[0] + rangeMin[1]) / 2,
    };
  });
})();

/** Phase by step id, for the timers that capture them. */
export function phaseForStep(stepId: string): MixPhase | undefined {
  return MIX_PHASES.find((p) => p.stepId === stepId);
}

/** `FRICTION_RATE` at a phase's dial: dough-only °F per minute. */
export const frictionRateOf = (dial: number): number => C.FRICTION_RATE[dial as keyof typeof C.FRICTION_RATE];

/**
 * §4.6. The probe step, pinned by id. The phases whose steps come after it are
 * the friction still to come when the dough is probed.
 */
export const PROBE_STEP_ID = 'mix-4';

export const PHASES_AFTER_PROBE: readonly MixPhase[] = (() => {
  const order = (id: string) => STEPS.findIndex((s) => s.id === id);
  const probe = order(PROBE_STEP_ID);
  if (probe < 0) throw new Error(`no ${PROBE_STEP_ID} step`);
  return MIX_PHASES.filter((p) => order(p.stepId) > probe);
})();

/**
 * §4.6 (MESSAGE-52). Dough-only friction still to come after the probe:
 * each later phase's `FRICTION_RATE` times its reference time, the same
 * references the log normalizes to. 1.08 × 3.5 + 0.86 × 52.5/60 = 4.5325 °F.
 * No FF: the probe measures where the dough is, and this is what C and D add.
 */
export const FRICTION_AFTER_PROBE_F = PHASES_AFTER_PROBE.reduce(
  (sum, p) => sum + frictionRateOf(p.dial) * p.referenceMin,
  0,
);
