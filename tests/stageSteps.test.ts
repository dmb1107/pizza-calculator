import { describe, expect, it } from 'vitest';
import { STEPS } from '../src/content/steps';
import { expandSteps, timerLabelFor } from '../src/lib/stepInstances';
import { PLANNING_RANGE_H, STAGE_ORDER, stageDurations, type StageKey } from '../src/lib/timeline';
import { parseTimerLabel } from '../src/lib/timers';
import { bindTokens, tokenValues } from '../src/lib/bindTokens';
import { calculate } from '../src/lib/engine';
import { BOUNDS } from '../src/state/defaults';
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
  // §4.7's mapping since MESSAGE-31. biga-4 is the room-temperature stage on
  // either track; the fridge got its own step so that each timed stage has
  // its own timer.
  bigaRoomTemp: ['biga-4'],
  bigaFridge: ['biga-4b'],
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

describe('§7.5 ranges stay ranges', () => {
  /** The schedule a stage runs on at the defaults. */
  const runsOn = (stage: StageKey): Schedule =>
    stageDurations('retarded', DEFAULTS)[stage] > 0 ? 'retarded' : 'classic';

  it.each(Object.keys(PLANNING_RANGE_H) as StageKey[])(
    '%s: the step that instructs it times the whole §4.7 range',
    (stage) => {
      const [lo, hi] = PLANNING_RANGE_H[stage] as readonly [number, number];
      const schedule = runsOn(stage);
      const [id] = INSTRUCTED_BY[stage];
      const s = STEPS.find((x) => x.id === id)!;
      const label = timerLabelFor(s, schedule, DEFAULTS.bigaRoomOnlyH);
      expect(parseTimerLabel(label ?? ''), `${id} on ${schedule}: "${label}"`).toEqual({
        minMinutes: lo * 60,
        maxMinutes: hi * 60,
        isWindow: true,
      });
    },
  );

  it('keeps every planned point inside its range except a classic room ferment', () => {
    // Why §7.5 needs only one exception: the fridge and temper inputs are
    // bounded by their own windows, and bulkRest is fixed at 1 h.
    const inside = (key: StageKey, h: number) => {
      const [lo, hi] = PLANNING_RANGE_H[key] as readonly [number, number];
      return h >= lo && h <= hi;
    };
    expect(inside('bigaFridge', BOUNDS.bigaFridgeH.min) && inside('bigaFridge', BOUNDS.bigaFridgeH.max)).toBe(true);
    expect(inside('temper', BOUNDS.temperH.min) && inside('temper', BOUNDS.temperH.max)).toBe(true);
    expect(inside('bulkRest', stageDurations('retarded', DEFAULTS).bulkRest)).toBe(true);
    expect(inside('bigaRoomOnly', BOUNDS.bigaRoomOnlyH.min)).toBe(false);
  });

  it('times a classic room ferment planned off the Giorilli window for the plan', () => {
    // §7.5's exception: the input allows 12–18 h; 16–18 is the window.
    const biga4 = STEPS.find((s) => s.id === 'biga-4')!;
    const shown = [];
    for (let h = BOUNDS.bigaRoomOnlyH.min; h <= BOUNDS.bigaRoomOnlyH.max; h += BOUNDS.bigaRoomOnlyH.step) {
      const label = bindTokens(timerLabelFor(biga4, 'classic', h) ?? '', { bigaRoomOnly: String(h) });
      shown.push(`${h}: ${label}`);
    }
    expect(shown).toEqual([
      '12: 12 h', '12.5: 12.5 h', '13: 13 h', '13.5: 13.5 h', '14: 14 h', '14.5: 14.5 h',
      '15: 15 h', '15.5: 15.5 h', '16: 16–18 h', '16.5: 16–18 h', '17: 16–18 h',
      '17.5: 16–18 h', '18: 16–18 h',
    ]);
    // The retarded track is untouched by the plan.
    expect(timerLabelFor(biga4, 'retarded', 12)).toBe('2 h');
  });
});

describe('§7.5 a step\'s timer agrees with the stage it times', () => {
  /**
   * Every stage timed by one step with a single-number timer: the bound timer
   * against the duration the timeline plans. A timer that disagrees with its
   * own stage schedules the baker twice. (Windows are checked above; `mix` is
   * several steps, none of which times the whole stage.)
   */
  const mismatches = (schedule: Schedule, balls: number, bigaRoomOnlyH = DEFAULTS.bigaRoomOnlyH) => {
    const r = calculate({ balls, ballWeightG: 265, roomTempF: 70, flourTempF: 70, bigaTempF: 58, frictionFactorF: 14 });
    const plan = { ...DEFAULTS, bigaRoomOnlyH, ballRoomTempH: r.roomMinutes / 60, nMix: r.capacity.nMix };
    const durations = stageDurations(schedule, plan);
    const tokens = tokenValues(r, plan);
    const rendered = new Set(expandSteps(r.capacity.nMix, schedule).map((i) => i.step.id));
    const out: string[] = [];
    for (const stage of STAGE_ORDER) {
      const steps = INSTRUCTED_BY[stage].filter((id) => rendered.has(id));
      if (durations[stage] <= 0 || steps.length !== 1) continue;
      const s = STEPS.find((x) => x.id === steps[0])!;
      const spec = parseTimerLabel(bindTokens(timerLabelFor(s, schedule, plan.bigaRoomOnlyH) ?? '', tokens));
      if (!spec || spec.isWindow) continue;
      const planned = Math.round(durations[stage] * 60 * 10) / 10;
      if (spec.minMinutes !== Math.round(durations[stage] * 60)) out.push(`${s.id}: ${spec.minMinutes} min, ${stage} ${planned} min`);
    }
    return out;
  };

  it('agrees on every one-mix batch, on both schedules', () => {
    expect(mismatches('retarded', 6)).toEqual([]);
    expect(mismatches('classic', 6)).toEqual([]);
    // §7.5's exception: off the Giorilli window, the timer is the plan.
    expect(mismatches('classic', 6, 13)).toEqual([]);
  });

  it('pins bulk-3 running long at a split batch — reported in FINDINGS-32', () => {
    // Known wrong, pinned both ways. {roomMin} is the unshortened rise, while
    // §4.7 takes half the stagger off ballRoomTemp and bulk-1 tells the baker
    // so. Room 70 °F, biga 58 °F, FF 14, final dough at DDT. When the spec
    // decides which number bulk-3 times, this fails; replace it with [].
    expect(mismatches('retarded', 12)).toEqual(['bulk-3: 90 min, ballRoomTemp 72.5 min']);
    expect(mismatches('retarded', 24)).toEqual(['bulk-3: 90 min, ballRoomTemp 55 min']);
  });
});
