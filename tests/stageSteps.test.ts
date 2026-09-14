import { describe, expect, it } from 'vitest';
import { STEPS } from '../src/content/steps';
import { expandSteps } from '../src/lib/stepInstances';
import { STAGE_ORDER, stageDurations, type StageKey } from '../src/lib/timeline';
import type { Schedule } from '../src/state/types';
import type { ScheduleAdjustments } from '../src/lib/timeline';

/**
 * §4.7: *every timeline stage maps to a step that instructs it, and every step
 * maps to a stage.*
 *
 * The same shape as "every constant has a reader", which is the check that
 * found `MAX_RUN_MIN` — and it would have found this one too if it had been
 * pointed at stages instead of constants. `bigaTemper` had a duration, a place
 * in the sequence, a clock time in the timeline, and a water-temperature
 * consequence larger than anything else the baker measures. Nothing in the step
 * list told them to do it. The app scheduled the temper, computed from it, and
 * warned about skipping it, while never instructing it.
 *
 * Neither table below is derived from the other, or from the thing under test.
 * Both are written out by a person reading the procedure, so an orphan on
 * either side points at whatever went missing.
 */

const DEFAULTS: ScheduleAdjustments = {
  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  ballRoomTempH: 1.5,
  nMix: 1,
  coldFermentH: 24,
  temperH: 2.5,
};

/** Which step tells the baker to do each stage. */
const INSTRUCTED_BY: Record<StageKey, readonly string[]> = {
  // biga-4's two summaries cover all three fermentation stages: the retarded
  // one reads "2 hours at room temperature, then {bigaFridge} hours in the
  // fridge", the classic one "{bigaRoomOnly} hours at 61–65 °F".
  bigaRoomTemp: ['biga-4'],
  bigaFridge: ['biga-4'],
  bigaRoomOnly: ['biga-4'],
  bigaTemper: ['biga-6'],
  mix: ['mix-1', 'mix-2', 'mix-3', 'mix-4', 'mix-5', 'mix-6', 'mix-7', 'mix-8'],
  bulkRest: ['bulk-1'],
  divideBall: ['bulk-2'],
  ballRoomTemp: ['bulk-3'],
  coldFerment: ['bulk-4'],
  temper: ['bake-1'],
};

/** Steps that deliberately instruct no stage, each with the reason. */
const NO_STAGE: Record<string, string> = {
  'biga-1': 'making the biga — t = 0, the instant every stage is measured from',
  'biga-2': 'making the biga — t = 0',
  'biga-3': 'making the biga — t = 0',
  'biga-5': 'the ripeness cue that ENDS fermentation: a moment, not a duration',
  'bake-2': 'the bake itself, after the timeline finishes at `temper`',
};

const stepIds = new Set(STEPS.map((s) => s.id));
const claimed = new Set(Object.values(INSTRUCTED_BY).flat());

describe('§4.7 every stage maps to a step, and every step to a stage', () => {
  it('names an instructing step for every stage in the sequence', () => {
    for (const stage of STAGE_ORDER) {
      expect(INSTRUCTED_BY[stage]?.length, `${stage} has no step`).toBeGreaterThan(0);
    }
  });

  it('covers exactly the stages the timeline defines', () => {
    expect(Object.keys(INSTRUCTED_BY).sort()).toEqual([...STAGE_ORDER].sort());
  });

  it('leaves no step orphaned', () => {
    const orphans = STEPS.map((s) => s.id).filter((id) => !claimed.has(id) && !(id in NO_STAGE));
    expect(orphans, 'a step instructing no stage, and not a declared exception').toEqual([]);
  });

  it('names no step that does not exist', () => {
    expect([...claimed].filter((id) => !stepIds.has(id)), 'INSTRUCTED_BY').toEqual([]);
    expect(Object.keys(NO_STAGE).filter((id) => !stepIds.has(id)), 'NO_STAGE').toEqual([]);
  });

  it('does not both claim and excuse the same step', () => {
    expect(Object.keys(NO_STAGE).filter((id) => claimed.has(id))).toEqual([]);
  });

  /**
   * The one that would have caught `bigaTemper` at the moment it broke: a stage
   * with real duration on a schedule must be instructed by a step that actually
   * renders on that schedule. Counting steps, or checking the template list,
   * would both have passed — `biga-6` simply did not exist.
   */
  it.each(['retarded', 'classic'] as const)(
    'instructs every non-zero stage with a step rendered on that schedule (%s)',
    (schedule: Schedule) => {
      const durations = stageDurations(schedule, DEFAULTS);
      const rendered = new Set(expandSteps(1, schedule).map((i) => i.step.id));

      for (const stage of STAGE_ORDER) {
        if (durations[stage] <= 0) continue;
        const instructing = INSTRUCTED_BY[stage].filter((id) => rendered.has(id));
        expect(
          instructing.length,
          `${schedule}: ${stage} lasts ${durations[stage]} h and no rendered step instructs it`,
        ).toBeGreaterThan(0);
      }
    },
  );

  it.each(['retarded', 'classic'] as const)(
    'renders no step whose only stage is zero on that schedule (%s)',
    (schedule: Schedule) => {
      const durations = stageDurations(schedule, DEFAULTS);
      const rendered = new Set(expandSteps(1, schedule).map((i) => i.step.id));

      for (const [stepId, stages] of Object.entries(
        STEPS.reduce<Record<string, StageKey[]>>((acc, step) => {
          const stages = STAGE_ORDER.filter((k) => INSTRUCTED_BY[k].includes(step.id));
          if (stages.length) acc[step.id] = stages;
          return acc;
        }, {}),
      )) {
        if (!rendered.has(stepId)) continue;
        const live = stages.filter((k) => durations[k] > 0);
        expect(
          live.length,
          `${schedule}: ${stepId} renders but every stage it instructs is zero`,
        ).toBeGreaterThan(0);
      }
    },
  );
});
