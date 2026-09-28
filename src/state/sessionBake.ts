/**
 * The current session as a bake record — WEBSITE-SPEC-biga-calculator.md §10.
 *
 * "Auto-populate each bake from the session's inputs so only the measured
 * values need typing." Everything here is read from state the app already
 * holds: the inputs, the dates each reading was entered, and the timers.
 * Pure, so the rules can be tested without a DOM.
 */

import { MIX_PHASES, currentFormulaSnapshot, type LoggedBake, type PhaseKey } from '../lib/bakeLog';
import { atMix, type CalculatorResult } from '../lib/engine';
import { instanceKey } from '../lib/stepInstances';
import type { EnteredDates, Inputs, RunningTimer } from './types';

/** YYYY-MM-DD in local time: "on the day" is the baker's day, not UTC's. */
export function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Sortable and file-name safe: the local date and time the bake was first saved. */
export function newBakeId(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${localDate(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** A phase's captured time, seconds, or null while it is still running or never ran. */
export function phaseSeconds(timers: readonly RunningTimer[], stepId: string, mixIndex: number, nMix: number): number | null {
  const key = instanceKey(stepId, mixIndex, nMix);
  const t = timers.find((x) => x.stepId === key);
  if (!t || t.stoppedAt == null) return null;
  return (t.stoppedAt - t.startedAt) / 1000;
}

/** The phase timers still running for a mix, so the log can say which to stop. */
export function runningPhases(timers: readonly RunningTimer[], mixIndex: number, nMix: number): PhaseKey[] {
  return MIX_PHASES.filter((p) => {
    const t = timers.find((x) => x.stepId === instanceKey(p.stepId, mixIndex, nMix));
    return t !== undefined && t.stoppedAt == null;
  }).map((p) => p.key);
}

export interface SessionState {
  inputs: Inputs;
  result: CalculatorResult;
  entered: EnteredDates;
  timers: readonly RunningTimer[];
}

/**
 * The session as it would be logged now. A reading counts as entered when it
 * was typed or confirmed today; anything else goes in as its prefill, marked
 * unentered, so the log shows it and doesn't count the mix (§10).
 */
export function sessionBake(s: SessionState, now: Date, bakeId: string): LoggedBake {
  const { inputs, result, entered, timers } = s;
  const today = localDate(now);
  const on = (date: string | undefined) => date === today;
  const nMix = result.capacity.nMix;
  const roomEntered = on(entered.roomTempF);

  return {
    bake_id: bakeId,
    date: today,
    balls: inputs.balls,
    ball_g: inputs.ballWeightG,
    n_mix: nMix,
    formula: currentFormulaSnapshot(),
    room_temp_f: { value: inputs.roomTempF, entered: roomEntered },
    flour_temp_f: inputs.flourSameAsRoom
      ? { value: inputs.roomTempF, entered: roomEntered }
      : { value: inputs.flourTempF, entered: on(entered.flourTempF) },
    flour_follows_room: inputs.flourSameAsRoom,
    mixes: result.mixes.map((mix, i) => {
      const water = inputs.waterUsedF[i] ?? null;
      const final = inputs.finalDoughTempF[i] ?? null;
      const measuredBowl = inputs.bowlTempF[i] ?? null;
      return {
        mix_index: mix.index,
        // The biga field falls back to mix 1's reading until re-read, so only
        // this mix's own entry counts.
        biga_temp_at_mix_f: { value: atMix(inputs.bigaTempF, i), entered: on(entered.bigaTempF[i]) },
        bowl_state: mix.bowlState,
        // A prefill is a guess (§10): only a measurement entered today counts.
        bowl_temp_f: { value: mix.bowlTempF, entered: measuredBowl != null && on(entered.bowlTempF[i]) },
        water_temp_used_f: { value: water ?? mix.waterTempF, entered: water != null && on(entered.waterUsedF[i]) },
        final_dough_temp_f: { value: final ?? result.ddtF, entered: final != null && on(entered.finalDoughTempF[i]) },
        phase_seconds: Object.fromEntries(
          MIX_PHASES.map((p) => [p.key, phaseSeconds(timers, p.stepId, mix.index, nMix)]),
        ) as Record<PhaseKey, number | null>,
        excluded: false,
      };
    }),
  };
}
