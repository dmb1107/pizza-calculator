/**
 * §8.2a step expansion — WEBSITE-SPEC-biga-calculator.md.
 *
 * Pure, so it can be tested without a DOM. It used to live inside `StepList`,
 * which meant the rule that decides how many checkboxes and timers exist was
 * the one piece of step logic nothing could assert against.
 */

import { STEPS, type Step } from '../content/steps';

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
export function expandSteps(nMix: number, steps: readonly Step[] = STEPS): StepInstance[] {
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
