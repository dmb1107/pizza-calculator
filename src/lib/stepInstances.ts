/**
 * §8.2a step expansion — WEBSITE-SPEC-biga-calculator.md.
 *
 * Pure, so it can be tested without a DOM. It used to live inside `StepList`,
 * which meant the rule that decides how many checkboxes and timers exist was
 * the one piece of step logic nothing could assert against.
 */

import { STEPS, type DetailCondition, type ShownWhen, type Step } from '../content/steps';
import type { Schedule } from '../state/types';

/**
 * §8.2's `shown only when` conditions, resolved by lookup rather than by
 * evaluating the string. An unrecognised condition throws: silently showing or
 * silently hiding a step are both wrong, and a missing temper step is exactly
 * the failure this mechanism was added to fix.
 */
const SHOWN_WHEN: Record<ShownWhen, Schedule> = {
  "schedule === 'retarded'": 'retarded',
  "schedule === 'classic'": 'classic',
};

/**
 * §8.2's conditional DETAIL blocks — a block inside a step, where `shownWhen`
 * gates the whole step. Resolved by lookup; an unknown condition throws.
 *
 * ⚠️ This used to be an inline ternary in `StepList` that read anything other
 * than `nMix > 1` as `nBiga > 1`, so a third condition would have silently
 * borrowed the biga-split test. And the generator and the test parser matched
 * conditions from the same hard-coded list, so a block with a new one was
 * dropped by both and the verbatim check still passed — which is what
 * happened to `bulk-2`'s `openDiameterCapped` block before this was fixed.
 */
export interface DetailConditionContext {
  nMix: number;
  nBiga: number;
  openDiameterCapped: boolean;
}

const DETAIL_CONDITIONS: Record<DetailCondition, (ctx: DetailConditionContext) => boolean> = {
  'nMix > 1': (ctx) => ctx.nMix > 1,
  'nBiga > 1': (ctx) => ctx.nBiga > 1,
  openDiameterCapped: (ctx) => ctx.openDiameterCapped,
};

export const DETAIL_CONDITION_NAMES = Object.keys(DETAIL_CONDITIONS) as readonly DetailCondition[];

export function detailConditionHolds(condition: string, ctx: DetailConditionContext): boolean {
  const test = DETAIL_CONDITIONS[condition as DetailCondition];
  if (!test) throw new Error(`unknown detail condition: ${condition}`);
  return test(ctx);
}

function showsOn(step: Step, schedule: Schedule): boolean {
  if (!step.shownWhen) return true;
  const required = SHOWN_WHEN[step.shownWhen];
  if (!required) throw new Error(`unknown shownWhen condition: ${step.shownWhen}`);
  return required === schedule;
}

export interface StepInstance {
  /**
   * The primary key. `mix-2#2` for a repeated step, the bare template id
   * otherwise — checkbox and timer state key off THIS, not the template.
   */
  key: string;
  step: Step;
  /** 1-based. Always 1 for a step that does not repeat. */
  mixIndex: number;
}

/**
 * §8.2a. Expand the templates to one instance per mix.
 *
 * At `nMix = 2` the baker runs `mix-1` through `mix-7`, changes over, then runs
 * them again — so each needs its own checkbox and its own timer on each pass.
 *
 * At `nMix = 1` every instance key is the bare template id, so nothing changes
 * for 3, 6 or 9 balls and no persisted checkbox is orphaned.
 */
export function expandSteps(
  nMix: number,
  /**
   * Required, not defaulted. `biga-6` renders only on the retarded track, and a
   * default would let a caller that forgot to pass one silently instruct a
   * classic baker to temper a biga that never went in the fridge — or, worse in
   * the other direction, silently drop the temper again.
   */
  schedule: Schedule,
  allSteps: readonly Step[] = STEPS,
): StepInstance[] {
  const steps = allSteps.filter((step) => showsOn(step, schedule));
  const out: StepInstance[] = [];
  const passes = Math.max(1, nMix);

  let i = 0;
  while (i < steps.length) {
    const step = steps[i] as Step;
    if (!step.repeatsPerMix) {
      out.push({ key: step.id, step, mixIndex: 1 });
      i += 1;
      continue;
    }

    // ⚠️ Repeat the whole CONTIGUOUS BLOCK per mix, not each step in turn.
    //
    // The baker runs mix-1 through mix-8, then mix-1 through mix-7 again —
    // `mix-1#1 … mix-8#1, mix-1#2 …`. Repeating each template individually
    // would give `mix-1#1, mix-1#2, mix-2#1, mix-2#2 …`: both bowls prepped,
    // then Phase A twice, with the changeover rendered last of all. Same
    // instance count, same labels, wrong procedure.
    let end = i;
    while (end < steps.length && (steps[end] as Step).repeatsPerMix) end += 1;
    const block = steps.slice(i, end);

    for (let mix = 1; mix <= passes; mix += 1) {
      for (const inner of block) {
        // No changeover after the last mix — and with one mix, none at all.
        if (inner.suppressOnFinal && mix === passes) continue;
        out.push({
          // At nMix 1 the key is the bare template id, so nothing changes for
          // 3, 6 or 9 balls and no persisted checkbox is orphaned.
          key: passes === 1 ? inner.id : `${inner.id}#${mix}`,
          step: inner,
          mixIndex: mix,
        });
      }
    }
    i = end;
  }
  return out;
}
