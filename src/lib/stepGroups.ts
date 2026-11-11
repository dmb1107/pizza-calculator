/**
 * §7.5 *Finished steps and groups fold away* (APP-5, MESSAGE-68).
 *
 * The step list in groups, which group headings are closed, what a closed
 * heading says about a running timer, and which ticked steps fold. Pure, so
 * the rules are tested here and `StepList` only draws them.
 */

import type { Phase } from '../content/steps';
import { PHASE_LABELS } from '../content/steps';
import { isTimerOf, timerSlots, type StepInstance } from './stepInstances';
import { timerDueAt, timerState, type RunningTimer, type TimerPhase } from './timers';

export interface StepGroup {
  /**
   * The stored key. A phase's name (`biga`, `mix`, `bulk`, `bake`), or `mix#2`
   * for one mix's steps at `nMix > 1`, in §8.2a's instance-key form. A key is
   * the same group at every batch size where it exists, so Mix 1 closed at two
   * mixes is still closed at three, and a key from another size matches
   * nothing here and is ignored.
   */
  key: string;
  label: string;
  instances: StepInstance[];
}

const PHASES: readonly Phase[] = ['biga', 'mix', 'bulk', 'bake'];

/** The group key for one mix's steps at `nMix > 1`. */
export function mixGroupKey(mixIndex: number): string {
  return `mix#${mixIndex}`;
}

/**
 * The groups, in list order.
 *
 * At one mix, the four phases under §8.2's phase labels. At `nMix > 1` the
 * mix phase becomes one group per mix, "Mix 1", "Mix 2" …, since the block
 * repeats per mix (§8.2a). **`mix-0` opens Mix 1's group** (the place
 * MESSAGE-68 left to this side): it is the first thing done at the bench on
 * mix day, right before mix 1's prep, so it sits in the group the baker is
 * working in. In the Biga group it would close with the biga steps, which
 * are done by the evening before on the retarded track, and hide the next
 * step to do.
 */
export function groupSteps(instances: readonly StepInstance[], nMix: number): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const phase of PHASES) {
    const inPhase = instances.filter((i) => i.step.phase === phase);
    if (phase !== 'mix' || nMix <= 1) {
      groups.push({ key: phase, label: PHASE_LABELS[phase], instances: inPhase });
      continue;
    }
    for (let mix = 1; mix <= nMix; mix += 1) {
      groups.push({
        key: mixGroupKey(mix),
        label: `Mix ${mix}`,
        // A step that doesn't repeat (mix-0) has mixIndex 1, so it lands here.
        instances: inPhase.filter((i) => i.mixIndex === mix),
      });
    }
  }
  return groups;
}

/** The last group holding mix steps: the log card follows it, outside every group. */
export function lastMixGroupKey(groups: readonly StepGroup[]): string | undefined {
  return [...groups].reverse().find((g) => g.instances.some((i) => i.step.phase === 'mix'))?.key;
}

/**
 * Which of these groups are closed. A stored key that names no group here (a
 * mix group after the batch drops to one mix, or anything unreadable) is
 * ignored, never an error.
 */
export function closedGroupsIn(stored: readonly string[], groups: readonly StepGroup[]): Set<string> {
  const here = new Set(groups.map((g) => g.key));
  return new Set(stored.filter((k) => here.has(k)));
}

/**
 * The stored list after tapping a group's heading. Keys for groups that don't
 * exist at this size are left alone: storage holds the baker's choices, and
 * `closedGroupsIn` decides what applies.
 */
export function toggledClosedGroups(stored: readonly string[], key: string): string[] {
  return stored.includes(key) ? stored.filter((k) => k !== key) : [...stored, key];
}

/** "3 / 6 done", the form the list's own count uses. */
export function groupProgress(group: StepGroup, checked: ReadonlySet<string>): { done: number; total: number } {
  return {
    done: group.instances.filter((i) => checked.has(i.key)).length,
    total: group.instances.length,
  };
}

/**
 * The mixes whose prep step (`mix-1`, where the readings and the water target
 * are) sits in this group. A closed group shows those mixes' water warnings
 * under its heading, so a warning never folds out of sight (§7.3).
 */
export function prepMixesIn(group: StepGroup): number[] {
  return group.instances.filter((i) => i.step.id === 'mix-1').map((i) => i.mixIndex);
}

/** Every timer key this instance carries: one, or one per dough (`timerSlots`). */
function slotKeysOf(instance: StepInstance, nMix: number): string[] {
  return timerSlots(instance.key, instance.step.id, nMix).map((s) => s.key);
}

/** Whether any of this instance's timers is running (started and not stopped). */
export function hasRunningTimer(instanceKey: string, timers: readonly RunningTimer[]): boolean {
  return timers.some((t) => t.stoppedAt == null && isTimerOf(t.stepId, instanceKey));
}

/**
 * §7.5: a ticked step shrinks to one line, unless the baker reopened it (in
 * memory only) or one of its timers is running. Unticked, it is never folded.
 */
export function stepFolded(checked: boolean, reopened: boolean, timerRunning: boolean): boolean {
  return checked && !reopened && !timerRunning;
}

export interface GroupTimerMark {
  phase: TimerPhase;
  isWindow: boolean;
  elapsedMs: number;
}

/**
 * The mark on a closed group's heading: the running timer in it that comes
 * due first, and where it stands. Its `phase` turns from `running` at the
 * lower bound, which is the change the heading shows. Only timers this group's
 * steps carry count, so a stored timer from another batch size marks nothing.
 */
export function groupTimerMark(
  group: StepGroup,
  timers: readonly RunningTimer[],
  nMix: number,
  now: number,
): GroupTimerMark | null {
  const keys = new Set(group.instances.flatMap((i) => slotKeysOf(i, nMix)));
  const running = timers.filter((t) => t.stoppedAt == null && keys.has(t.stepId));
  if (running.length === 0) return null;
  const first = running.reduce((a, b) => (timerDueAt(b) < timerDueAt(a) ? b : a));
  const state = timerState(first, now);
  return { phase: state.phase, isWindow: first.maxMinutes > first.minMinutes, elapsedMs: state.elapsedMs };
}

/**
 * Every timer key the list renders at this size. Beeping is limited to these,
 * as it was while each timer card beeped for itself: a stored timer from
 * another batch size has no card and stays quiet.
 */
export function liveTimerKeys(instances: readonly StepInstance[], nMix: number): Set<string> {
  return new Set(instances.flatMap((i) => slotKeysOf(i, nMix)));
}
