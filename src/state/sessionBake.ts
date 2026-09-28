/**
 * The current session as a bake record — WEBSITE-SPEC-biga-calculator.md §10.
 *
 * "Auto-populate each bake from the session's inputs so only the measured
 * values need typing." Everything here is read from state the app already
 * holds: the inputs and the timers. Pure, so the rules can be tested without
 * a DOM.
 *
 * §10 *Capture and saving*: "Save records the inputs as they stand",
 * including values that arrived in a link. Nothing tracks which values were
 * typed or when (Dave's call, 28 Sep). The page's Reset starts a new bake.
 */

import { MIX_PHASES, currentFormulaSnapshot, type LoggedBake, type PhaseKey } from '../lib/bakeLog';
import type { LocalLog } from './bakeLogStore';
import { atMix, type CalculatorResult } from '../lib/engine';
import { instanceKey } from '../lib/stepInstances';
import type { Inputs, RunningTimer } from './types';

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
  timers: readonly RunningTimer[];
}

/**
 * The session as it would be logged now: the inputs as they stand. A final
 * or water reading with no value is null, and the bowl records whether its
 * field still holds the selector's prefill (§10), so the log can leave those
 * mixes out.
 */
export function sessionBake(s: SessionState, now: Date, bakeId: string): LoggedBake {
  const { inputs, result, timers } = s;
  const nMix = result.capacity.nMix;
  const started = firstMixStartedAt(timers, nMix);

  return {
    bake_id: bakeId,
    // The day the first mix started; before it has, the day it is saved.
    date: localDate(started == null ? now : new Date(started)),
    balls: inputs.balls,
    ball_g: inputs.ballWeightG,
    n_mix: nMix,
    formula: currentFormulaSnapshot(),
    room_temp_f: inputs.roomTempF,
    flour_temp_f: inputs.flourSameAsRoom ? inputs.roomTempF : inputs.flourTempF,
    flour_follows_room: inputs.flourSameAsRoom,
    mixes: result.mixes.map((mix, i) => ({
      mix_index: mix.index,
      // The biga carries mix 1's reading forward until re-read (§6).
      biga_temp_at_mix_f: atMix(inputs.bigaTempF, i),
      bowl_state: mix.bowlState,
      bowl_temp_f: mix.bowlTempF,
      // By index, as the engine reads it: no reading of its own is the prefill.
      bowl_prefilled: (inputs.bowlTempF[i] ?? null) == null,
      water_temp_used_f: inputs.waterUsedF[i] ?? null,
      final_dough_temp_f: inputs.finalDoughTempF[i] ?? null,
      phase_seconds: Object.fromEntries(
        MIX_PHASES.map((p) => [p.key, phaseSeconds(timers, p.stepId, mix.index, nMix)]),
      ) as Record<PhaseKey, number | null>,
      excluded: false,
    })),
  };
}

/**
 * §10: saving over a bake from an earlier date asks first, "as a safety net
 * for a forgotten Reset". The bake this save would replace,
 * when it is dated before the draft; null when saving needs no question.
 */
export function saveConflict(log: LocalLog, sessionBakeId: string, draft: LoggedBake): LoggedBake | null {
  if (!sessionBakeId) return null;
  const saved = log.bakes.find((b) => b.bake_id === sessionBakeId);
  return saved && saved.date < draft.date ? saved : null;
}
