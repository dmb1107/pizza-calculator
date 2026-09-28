/**
 * The current session as a bake record — WEBSITE-SPEC-biga-calculator.md §10.
 *
 * "Auto-populate each bake from the session's inputs so only the measured
 * values need typing." Everything here is read from state the app already
 * holds: the inputs, when each reading was typed, and the timers. Pure, so
 * the rules can be tested without a DOM.
 *
 * §10 *Capture and saving*: a session runs from a reset of the steps to the
 * save, and a reading counts as entered when it was typed during it. A value
 * carried over from an earlier bake, in the URL or in storage, was typed
 * before the session started (or not on this device at all), so it stays a
 * default until retyped.
 */

import { MIX_PHASES, currentFormulaSnapshot, type LoggedBake, type PhaseKey } from '../lib/bakeLog';
import type { LocalLog } from './bakeLogStore';
import { atMix, type CalculatorResult } from '../lib/engine';
import { instanceKey } from '../lib/stepInstances';
import type { EnteredAt, Inputs, RunningTimer } from './types';

/** YYYY-MM-DD in local time: the baker's day, not UTC's. */
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

/**
 * When the bake's first mix started: mix 1's Phase A timer. §10 dates a bake
 * by this, so a split batch that runs past midnight stays on one day. Null
 * before Phase A's timer has started.
 */
export function firstMixStartedAt(timers: readonly RunningTimer[], nMix: number): number | null {
  const phaseA = MIX_PHASES[0]!;
  return timers.find((t) => t.stepId === instanceKey(phaseA.stepId, 1, nMix))?.startedAt ?? null;
}

export interface SessionState {
  inputs: Inputs;
  result: CalculatorResult;
  entered: EnteredAt;
  timers: readonly RunningTimer[];
  /** Epoch ms of the reset that started the session; 0 before the first. */
  sessionStartedAt: number;
}

/**
 * The session as it would be logged now. A reading counts as entered when it
 * was typed during the session; anything else goes in as its prefill, marked
 * unentered, so the log shows it and doesn't count the mix (§10).
 */
export function sessionBake(s: SessionState, now: Date, bakeId: string): LoggedBake {
  const { inputs, result, entered, timers, sessionStartedAt } = s;
  const typed = (at: number | undefined) => at != null && at > 0 && at >= sessionStartedAt;
  const nMix = result.capacity.nMix;
  const roomEntered = typed(entered.roomTempF);
  const started = firstMixStartedAt(timers, nMix);

  return {
    bake_id: bakeId,
    // The day the first mix started; before it has, the day it is saved.
    date: localDate(started == null ? now : new Date(started)),
    balls: inputs.balls,
    ball_g: inputs.ballWeightG,
    n_mix: nMix,
    formula: currentFormulaSnapshot(),
    room_temp_f: { value: inputs.roomTempF, entered: roomEntered },
    flour_temp_f: inputs.flourSameAsRoom
      ? { value: inputs.roomTempF, entered: roomEntered }
      : { value: inputs.flourTempF, entered: typed(entered.flourTempF) },
    flour_follows_room: inputs.flourSameAsRoom,
    mixes: result.mixes.map((mix, i) => {
      const water = inputs.waterUsedF[i] ?? null;
      const final = inputs.finalDoughTempF[i] ?? null;
      const measuredBowl = inputs.bowlTempF[i] ?? null;
      return {
        mix_index: mix.index,
        // The biga field falls back to mix 1's reading until re-read, so only
        // this mix's own entry counts.
        biga_temp_at_mix_f: { value: atMix(inputs.bigaTempF, i), entered: typed(entered.bigaTempF[i]) },
        bowl_state: mix.bowlState,
        // A prefill is a guess (§10): only a measurement typed for this bake counts.
        bowl_temp_f: { value: mix.bowlTempF, entered: measuredBowl != null && typed(entered.bowlTempF[i]) },
        water_temp_used_f: { value: water ?? mix.waterTempF, entered: water != null && typed(entered.waterUsedF[i]) },
        final_dough_temp_f: { value: final ?? result.ddtF, entered: final != null && typed(entered.finalDoughTempF[i]) },
        phase_seconds: Object.fromEntries(
          MIX_PHASES.map((p) => [p.key, phaseSeconds(timers, p.stepId, mix.index, nMix)]),
        ) as Record<PhaseKey, number | null>,
        excluded: false,
      };
    }),
  };
}

/**
 * §10: "Saving over a bake from an earlier date asks first, so a forgotten
 * reset can't overwrite a finished bake." The bake this save would replace,
 * when it is dated before the draft; null when saving needs no question.
 */
export function saveConflict(log: LocalLog, sessionBakeId: string, draft: LoggedBake): LoggedBake | null {
  if (!sessionBakeId) return null;
  const saved = log.bakes.find((b) => b.bake_id === sessionBakeId);
  return saved && saved.date < draft.date ? saved : null;
}
