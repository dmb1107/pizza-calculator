import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { computeRoomMinutes, mixStaggerH } from '../src/lib/engine';
import {
  buildTimeline,
  formatDuration,
  formatStageDuration,
  fromDatetimeLocal,
  isUnsocialHour,
  roundToNextQuarterHour,
  socialWindowPhrase,
  socialWindows,
  solveBigaStart,
  stageDurations,
  timelineFor,
  toDatetimeLocal,
  type ScheduleAdjustments,
} from '../src/lib/timeline';
import type { Schedule } from '../src/state/types';

/** Timeline — WEBSITE-SPEC-biga-calculator.md §4.7. TZ is pinned to America/New_York. */

/** The app's defaults: 6 balls, a 1.5 h temper since MESSAGE-53 (2.5 before). */
const DEFAULTS: ScheduleAdjustments = {
  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  ballRoomTempH: 1.5,
  nMix: 1,
  balls: 6,
  coldFermentH: 24,
  temperH: 1.5,
};

/** Classic's defaults: its cold ferment is 6–8 h, default 6 (MESSAGE-53). */
const CLASSIC: ScheduleAdjustments = { ...DEFAULTS, coldFermentH: 6 };

const HOUR_MS = 3_600_000;

describe('§4.7 stage durations', () => {
  it('matches the retarded column', () => {
    expect(stageDurations('retarded', DEFAULTS)).toEqual({
      bigaRoomTemp: 2,
      bigaFridge: 19,
      bigaRoomOnly: 0,
      bigaTemper: 1,
      mix: 0.5,
      bulkRest: 1,
      divideBall: 20 / 60, // 6 balls: 12.5 + 1.25 × 6 minutes
      ballRoomTemp: 1.5,
      coldFerment: 24,
      temper: 1.5,
    });
  });

  it('matches the classic RT column', () => {
    expect(stageDurations('classic', CLASSIC)).toEqual({
      bigaRoomTemp: 0,
      bigaFridge: 0,
      bigaRoomOnly: 16,
      bigaTemper: 0,
      mix: 0.5,
      bulkRest: 1,
      divideBall: 20 / 60,
      ballRoomTemp: 1.5,
      coldFerment: 6,
      temper: 1.5,
    });
  });

  it('totals 50.83 h retarded and 26.83 h classic at the defaults', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    expect(buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS }).totalH).toBeCloseTo(50.8333, 4);
    expect(buildTimeline({ startAt: start, schedule: 'classic', adjustments: CLASSIC }).totalH).toBeCloseTo(26.8333, 4);
  });

  /**
   * §4.7: "Fixed overhead outside the cold ferment totals 25.5–30 h, so total
   * elapsed is always coldFerment + ~28 h. At the defaults: ~34 h at 6 h cold,
   * ~52 h at 24 h, ~64 h at 36 h. Assert these."
   *
   * This is the check that would have caught the recipe document's §7 summary
   * table, which collapsed bulk rest, divide-and-ball and the balls' room
   * temperature rest into one row and left the final mix out entirely.
   */
  describe('§4.7 published totals', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    const overheadOf = (a: ScheduleAdjustments) =>
      buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH - a.coldFermentH;
    const totalAt = (coldFermentH: number) =>
      buildTimeline({
        startAt: start,
        schedule: 'retarded',
        adjustments: { ...DEFAULTS, coldFermentH },
      }).totalH;

    it.each([
      [6, 33],
      [24, 51],
      [36, 63],
    ])('%i h cold ferment gives ~%i h total', (cold, expected) => {
      // "Those are midpoints; each carries a ±2 h spread."
      expect(Math.abs(totalAt(cold) - expected)).toBeLessThanOrEqual(2);
    });

    it('keeps fixed overhead inside the stated 25.0–29.9 h band', () => {
      for (const cold of [6, 12, 24, 30, 36]) {
        const overhead = totalAt(cold) - cold;
        expect(overhead, `overhead at ${cold} h cold`).toBeGreaterThanOrEqual(25.0);
        expect(overhead, `overhead at ${cold} h cold`).toBeLessThanOrEqual(29.9);
      }
    });

    it('holds the overhead constant, so total is always coldFerment + ~27 h', () => {
      // Everything outside the cold ferment is fixed, so the relationship is
      // linear with slope exactly 1 — a stage accidentally scaling with the
      // cold ferment would show up here.
      const overheads = [6, 12, 24, 30, 36].map((c) => totalAt(c) - c);
      for (const o of overheads) expect(o).toBeCloseTo(overheads[0] as number, 10);
      expect(overheads[0]).toBeCloseTo(26.8333, 4);
    });

    /**
     * §4.8 quotes fixed overhead as **25.0–29.9 h** across the full input
     * ranges at `nMix = 1` on the retarded track, with **26.8 h at the
     * defaults** (MESSAGE-53). The defaults are asserted as an equality; the
     * band is a range check.
     *
     * `bulkRest` (1 h) is FIXED by §4.7 and is not an input: the recipe's
     * "45–60 min" is guidance to the baker, and 60 min is the planning number.
     * `divideBall` scales with the ball count since MESSAGE-53.
     */
    it('is exactly 26.8 h at the defaults', () => {
      expect(overheadOf(DEFAULTS)).toBeCloseTo(26.8333, 4);
    });

    it('spans exactly 25.0–29.9 h across the full input ranges', () => {
      // The extremes use the shaped-rise CLAMP bounds (45 and 180 min). The
      // low end is 3 balls, an 18 h fridge and a 1.5 h temper; the high end
      // 10 × 240 g, the largest single mix, with a 20 h fridge and a 2 h
      // temper. Both ends are tight.
      const lowest: ScheduleAdjustments = {
        bigaFridgeH: 18, bigaRoomOnlyH: 16, ballRoomTempH: 45 / 60, nMix: 1, balls: 3, coldFermentH: 24, temperH: 1.5,
      };
      const highest: ScheduleAdjustments = {
        bigaFridgeH: 20, bigaRoomOnlyH: 16, ballRoomTempH: 180 / 60, nMix: 1, balls: 10, coldFermentH: 24, temperH: 2,
      };
      expect(overheadOf(lowest)).toBeCloseTo(25.0208, 4);
      expect(overheadOf(highest)).toBeCloseTo(29.9167, 4);

      // The band is quoted to one decimal, so compare at that precision.
      for (const a of [lowest, DEFAULTS, highest]) {
        const rounded = Math.round(overheadOf(a) * 10) / 10;
        expect(rounded, 'above the band').toBeGreaterThanOrEqual(25.0);
        expect(rounded, 'below the band').toBeLessThanOrEqual(29.9);
      }
    });

    it('scales divide-and-ball with the total ball count (MESSAGE-53)', () => {
      // 12.5 min plus 1.25 per ball, written out: 16.25 at 3, 20 at 6,
      // 23.75 at 9, 27.5 at 12, 35 at 18, 42.5 at 24.
      for (const [balls, minutes] of [[3, 16.25], [6, 20], [9, 23.75], [12, 27.5], [18, 35], [24, 42.5]] as const) {
        for (const schedule of ['retarded', 'classic'] as const) {
          expect(stageDurations(schedule, { ...DEFAULTS, balls }).divideBall * 60, `${balls} balls`).toBeCloseTo(minutes, 9);
        }
      }
      // Timeline only: the rise after balling is not shortened for it.
      expect(stageDurations('retarded', { ...DEFAULTS, balls: 12 }).ballRoomTemp).toBe(
        stageDurations('retarded', DEFAULTS).ballRoomTemp,
      );
    });
  });

  describe('honours the §4.7 adjustable ranges', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    const total = (a: Partial<ScheduleAdjustments>, schedule: 'retarded' | 'classic' = 'retarded') =>
      buildTimeline({ startAt: start, schedule, adjustments: { ...DEFAULTS, ...a } }).totalH;

    it('bigaFridge 18–20', () => {
      expect(total({ bigaFridgeH: 18 })).toBeCloseTo(49.8333, 4);
      expect(total({ bigaFridgeH: 20 })).toBeCloseTo(51.8333, 4);
    });

    it('bigaRoomOnly 12–18', () => {
      expect(total({ bigaRoomOnlyH: 12, coldFermentH: 6 }, 'classic')).toBeCloseTo(22.8333, 4);
      expect(total({ bigaRoomOnlyH: 18, coldFermentH: 6 }, 'classic')).toBeCloseTo(28.8333, 4);
    });

    it('classic totals 26.8–28.8 h at a 16 h biga, ~27–31 h across 16–18 (MESSAGE-53)', () => {
      expect(total({ coldFermentH: 6 }, 'classic')).toBeCloseTo(26.8333, 4);
      expect(total({ coldFermentH: 8 }, 'classic')).toBeCloseTo(28.8333, 4);
      expect(total({ bigaRoomOnlyH: 18, coldFermentH: 8 }, 'classic')).toBeCloseTo(30.8333, 4);
    });

    it('ballRoomTemp 1–2', () => {
      expect(total({ ballRoomTempH: 1 })).toBeCloseTo(50.3333, 4);
      expect(total({ ballRoomTempH: 2 })).toBeCloseTo(51.3333, 4);
    });

    it('keeps stagger on the planning basis, tied to the timeline', () => {
      // ⚠️ §5 names THREE wall-clock bases for a mix, spanning 12 minutes:
      //   nominal mid-range 23.9 · phase maxima 27.0 · planning 30.0
      //
      // `stagger` uses the planning basis, and must: it and the timeline are
      // the same quantity — how long a mix takes — so rebasing one decouples
      // the correction from the schedule it corrects. On the maxima basis the
      // stagger would be 32 min and the rise cut 16.0 rather than 17.5, and
      // the schedule and the correction would describe different sessions.
      //
      // Pinned because the tempting "improvement" is to notice the duty-cycle
      // figure uses maxima and conclude this should too. If one moves, both
      // move.
      const planningMixH = stageDurations('retarded', DEFAULTS).mix;
      expect(planningMixH, 'one mix on the planning basis').toBeCloseTo(0.5, 6);
      expect(mixStaggerH(2) * 60, 'stagger at nMix 2').toBeCloseTo(35, 6);
      expect(mixStaggerH(2) / 2, 'half the stagger, hours').toBeCloseTo(
        (planningMixH + C.CHANGEOVER_H) / 2,
        6,
      );

      // What the maxima basis would give, so the difference is visible.
      const maximaMixH = 27 / 60;
      expect((maximaMixH + C.CHANGEOVER_H) * 60, 'maxima-based stagger').toBeCloseTo(32, 6);
    });

    it('adds a second mix and a changeover at nMix 2', () => {
      // §4.7: `mix` was a flat 0.5 h and counted one mix for a 12-ball batch
      // that runs two back to back. 0.5 × 2 + 0.0833 = 1.083 h.
      const one = stageDurations('retarded', DEFAULTS);
      const two = stageDurations('retarded', { ...DEFAULTS, nMix: 2 });
      expect(one.mix).toBeCloseTo(0.5, 4);
      expect(two.mix).toBeCloseTo(0.5 * 2 + C.CHANGEOVER_H, 4);
      expect(mixStaggerH(1)).toBe(0);
      expect(mixStaggerH(2) * 60).toBeCloseTo(35, 1);
    });

    it('subtracts half the stagger from the ball rise, centring the error', () => {
      // ⚠️ This CENTRES the spread rather than removing it: at nMix 2 the first
      // dough goes from +35 to +17.5 min and the second from 0 to −17.5. One
      // clock cannot do better, and halving the worst case is the whole gain.
      const one = stageDurations('retarded', { ...DEFAULTS, ballRoomTempH: 1.5 });
      const two = stageDurations('retarded', { ...DEFAULTS, ballRoomTempH: 1.5, nMix: 2 });
      expect(one.ballRoomTemp * 60).toBeCloseTo(90, 1);
      // §4.7 says "90 min becomes 72"; the exact arithmetic is 72.5.
      expect(two.ballRoomTemp * 60).toBeCloseTo(72.5, 1);
      expect((one.ballRoomTemp - two.ballRoomTemp) * 60).toBeCloseTo(
        (mixStaggerH(2) / 2) * 60,
        1,
      );
    });

    // Each dough's error against a uniform batch: its lead on the last mix,
    // less the cut. Both read off `stageDurations`, so neither is transcribed.
    const cutMin = (nMix: number) =>
      (stageDurations('retarded', DEFAULTS).ballRoomTemp -
        stageDurations('retarded', { ...DEFAULTS, nMix }).ballRoomTemp) *
      60;
    // One mix plus one changeover on the planning basis: 35 min.
    const planStepMin =
      (stageDurations('retarded', { ...DEFAULTS, nMix: 2 }).mix -
        stageDurations('retarded', DEFAULTS).mix) *
      60;
    const doughErrorsMin = (nMix: number, changeoverMin = C.CHANGEOVER_H * 60) =>
      Array.from(
        { length: nMix },
        (_, i) => (nMix - 1 - i) * (planStepMin - C.CHANGEOVER_H * 60 + changeoverMin) - cutMin(nMix),
      );

    it('centres the error at nMix 3, with the middle dough on time', () => {
      // MESSAGE-38. The cut is half the stagger at any nMix: 35 min at 3,
      // taking the 90-minute rise to 55. bulk-1's "the first and last end up
      // about {staggerHalfMinutes} minutes off in opposite directions" rests
      // on the middle dough's 0.
      expect(stageDurations('retarded', { ...DEFAULTS, nMix: 3 }).ballRoomTemp * 60).toBeCloseTo(55, 6);
      const [first, middle, last] = doughErrorsMin(3);
      expect(first).toBeCloseTo(35, 6);
      expect(middle).toBeCloseTo(0, 6);
      expect(last).toBeCloseTo(-35, 6);
      const [first2, last2] = doughErrorsMin(2);
      expect(first2).toBeCloseTo(17.5, 6);
      expect(last2).toBeCloseTo(-17.5, 6);
    });

    it('lands a changeover overrun whole on the first dough', () => {
      // MESSAGE-38, mix-1: "every extra five minutes adds five minutes of
      // fermentation to the first dough". The bulk clocks from the last mix,
      // and the cut comes from the PLANNED stagger — nothing in the schedule
      // reads the changeover the baker actually ran — so an overrun is never
      // halved. The "2½" this replaced halved it.
      const [first, last] = doughErrorsMin(2, 10);
      expect(first, 'two mixes, a 10-minute changeover').toBeCloseTo(22.5, 6);
      expect(last).toBeCloseTo(-17.5, 6);

      // Three mixes, against plan: each changeover's overrun adds to every
      // dough ahead of it.
      const againstPlan = (changeoverMin: number) => {
        const plan = doughErrorsMin(3);
        return doughErrorsMin(3, changeoverMin).map((e, i) => e - plan[i]!);
      };
      againstPlan(10).forEach((e, i) => expect(e, `10-min changeovers, dough ${i + 1}`).toBeCloseTo([10, 5, 0][i]!, 6));
      againstPlan(15).forEach((e, i) => expect(e, `15-min changeovers, dough ${i + 1}`).toBeCloseTo([20, 10, 0][i]!, 6));
    });

    it('still clamps the ball rise after the stagger correction', () => {
      // The correction must not push a short rise under the 45-minute floor.
      const short = stageDurations('retarded', {
        ...DEFAULTS,
        ballRoomTempH: 45 / 60,
        nMix: 2,
      });
      expect(short.ballRoomTemp * 60).toBeCloseTo(45, 1);
    });

    it.each([
      [3, 1, 0.5, 0.2708, 1.5, 26.7708],
      [6, 1, 0.5, 0.3333, 1.5, 26.8333],
      [9, 1, 0.5, 0.3958, 1.5, 26.8958],
      [12, 2, 1.0833, 0.4583, 1.2083, 27.25],
      [18, 2, 1.0833, 0.5833, 1.2083, 27.375],
      [24, 3, 1.6667, 0.7083, 0.9167, 27.7917],
    ])('%i balls, nMix %i: mix %f h, divide %f h, rise %f h, overhead %f h', (balls, nMix, mix, divide, rise, overheadH) => {
      // §4.8's table since MESSAGE-53, all six asserted, at 265 g on target.
      // With the divide scaling, the overhead depends on the ball count as
      // well as nMix. (MESSAGE-6: an earlier 28.41 came from `divideBall` as
      // the literal 0.33, a displayed figure baked into the source.)
      const a = { ...DEFAULTS, nMix, balls };
      const d = stageDurations('retarded', a);
      expect(d.mix).toBeCloseTo(mix, 4);
      expect(d.divideBall).toBeCloseTo(divide, 4);
      expect(d.ballRoomTemp).toBeCloseTo(rise, 4);
      const total = buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH - a.coldFermentH;
      expect(total).toBeCloseTo(overheadH, 4);
    });

    it('adds the second mix, takes half the stagger back off the rise, and adds the longer divide', () => {
      const overhead = (a: ScheduleAdjustments) =>
        buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH -
        a.coldFermentH;
      // The 25.0–29.9 band in §4.8 is nMix = 1 only.
      expect(overhead(DEFAULTS)).toBeCloseTo(26.8333, 4);
      // 12 balls: + 0.5833 (a mix and a changeover) − 0.2917 (half the
      // stagger) + 0.125 (7.5 more minutes of divide) = 27.25.
      const twelve = overhead({ ...DEFAULTS, nMix: 2, balls: 12 });
      expect(twelve).toBeCloseTo(27.25, 4);
      expect(twelve - overhead(DEFAULTS)).toBeCloseTo(
        0.5 + C.CHANGEOVER_H - mixStaggerH(2) / 2 + (C.DIVIDE_PER_BALL_MIN * 6) / 60,
        9,
      );
    });

    it('leaves every other stage untouched by nMix', () => {
      const one = stageDurations('retarded', DEFAULTS);
      const two = stageDurations('retarded', { ...DEFAULTS, nMix: 2 });
      for (const key of ['bigaRoomTemp', 'bigaFridge', 'bigaTemper', 'bulkRest', 'divideBall', 'coldFerment', 'temper'] as const) {
        expect(two[key], `${key} must not depend on nMix`).toBe(one[key]);
      }
    });

    it('coldFerment 6–36', () => {
      expect(total({ coldFermentH: 6 })).toBeCloseTo(32.8333, 4);
      expect(total({ coldFermentH: 36 })).toBeCloseTo(62.8333, 4);
    });

    it('temper 1.5–2', () => {
      expect(total({ temperH: 1.5 })).toBeCloseTo(50.8333, 4);
      expect(total({ temperH: 2 })).toBeCloseTo(51.3333, 4);
    });
  });
});

/**
 * §4.7's duration table is a SEQUENCE, and the overhead total cannot detect a
 * wrong one. Addition is commutative, so any stage-order error produces a
 * correct sum and a wrong schedule — a weaker check than the instance count
 * that failed to catch the §8.2a ordering bug, because a sum cannot even tell
 * you the count is wrong.
 *
 * The forward timeline hides this: stages accumulate to the same end time
 * either way. The BACKWARD timeline is where order becomes timestamps — solve
 * from a target bake time back through a mis-ordered stage list and every total
 * still asserts clean while every intermediate time is wrong. It surfaces as a
 * baker standing at a cold oven, not as a red test.
 *
 * Both sequences below are written out by hand, NOT derived from `STAGE_ORDER`
 * or from the duration table — those are the things under test, and a check
 * that compares something to a description of itself cannot fail usefully.
 * Reordering the table for readability must not silently reorder the schedule.
 */
describe('§4.7 stage sequence', () => {
  // ⚠️ `coldFerment` sits AFTER `ballRoomTemp`, not with the other biga stages:
  // the balls go to the fridge shaped. That is the one placement here that is
  // not obvious from reading §4.7's table top to bottom.
  const RETARDED_SEQUENCE = [
    'bigaRoomTemp',
    'bigaFridge',
    'bigaTemper',
    'mix',
    'bulkRest',
    'divideBall',
    'ballRoomTemp',
    'coldFerment',
    'temper',
  ];

  // §4.7 writes its sequence for the retarded schedule, where `bigaRoomOnly` is
  // zero and therefore absent. On classic it replaces all three retarded biga
  // stages; everything from `mix` onward is identical.
  const CLASSIC_SEQUENCE = [
    'bigaRoomOnly',
    'mix',
    'bulkRest',
    'divideBall',
    'ballRoomTemp',
    'coldFerment',
    'temper',
  ];

  const keysFor = (schedule: Schedule, adjustments: ScheduleAdjustments = DEFAULTS) =>
    buildTimeline({ startAt: new Date(2026, 7, 21, 9, 0), schedule, adjustments }).stages.map(
      (s) => s.key,
    );

  it('runs the retarded stages in the order §4.7 gives', () => {
    expect(keysFor('retarded')).toEqual(RETARDED_SEQUENCE);
  });

  it('runs the classic stages in that order, with bigaRoomOnly for the fridge', () => {
    expect(keysFor('classic', CLASSIC)).toEqual(CLASSIC_SEQUENCE);
  });

  it('holds the sequence at nMix 2, where `mix` and `ballRoomTemp` both move', () => {
    // Splitting the batch changes two durations. It must not change the order.
    expect(keysFor('retarded', { ...DEFAULTS, nMix: 2 })).toEqual(RETARDED_SEQUENCE);
    expect(keysFor('classic', { ...DEFAULTS, nMix: 2 })).toEqual(CLASSIC_SEQUENCE);
  });

  it('holds the sequence when the backward solve sets the start', () => {
    // This is the case §4.7 warns about. Solve back from a bake time, rebuild
    // forward from the answer, and the stages must still be in order, butt-join
    // end to start, and land exactly on the requested bake.
    const bakeAt = new Date(2026, 7, 23, 18, 30);
    const startAt = solveBigaStart({ bakeAt, schedule: 'retarded', adjustments: DEFAULTS });
    const timeline = buildTimeline({ startAt, schedule: 'retarded', adjustments: DEFAULTS });

    expect(timeline.stages.map((s) => s.key)).toEqual(RETARDED_SEQUENCE);
    expect(timeline.bakeAt.getTime()).toBe(bakeAt.getTime());

    for (let i = 1; i < timeline.stages.length; i += 1) {
      const prev = timeline.stages[i - 1]!;
      const here = timeline.stages[i]!;
      expect(here.startsAt.getTime(), here.key + ' starts where ' + prev.key + ' ends').toBe(
        prev.endsAt.getTime(),
      );
    }
  });
});

describe('unsocial hours', () => {
  it.each([0, 1, 3, 5])('flags %i:00', (h) => {
    expect(isUnsocialHour(new Date(2026, 7, 21, h, 0))).toBe(true);
  });

  it.each([6, 7, 12, 22, 23])('does not flag %i:00', (h) => {
    expect(isUnsocialHour(new Date(2026, 7, 21, h, 0))).toBe(false);
  });

  it('flags the action, not the whole stage', () => {
    // The 19 h fridge rest always spans the small hours. If "lands in" meant
    // overlap, every schedule would be flagged and the flag would say nothing.
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 9, 0), // Fri 09:00
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    const fridge = t.stages.find((s) => s.key === 'bigaFridge')!;
    expect(fridge.startsAt.getHours()).toBe(11); // Fri 11:00 — a fine time to act
    expect(fridge.endsAt.getHours()).toBe(6); // ...even though it runs past dawn
    expect(fridge.unsocialStart).toBe(false);
  });

  it('catches a start time that buries three actions in the small hours', () => {
    // Mixing the biga at 23:00 means fridging it at 01:00, trays into the
    // fridge at midnight the next day, and out again at 02:00. This is the
    // schedule §4.7 exists to warn about.
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 23, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    expect(t.stages.filter((s) => s.unsocialStart).map((s) => s.key)).toEqual([
      'bigaFridge',
      'coldFerment',
      'temper',
    ]);
    expect(t.bakeIsUnsocial).toBe(true);
    expect(t.hasUnsocialHours).toBe(true);
  });

  it('catches a single offender', () => {
    // 08:00 is fine except that the biga comes out to temper at 05:00.
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 8, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    expect(t.stages.filter((s) => s.unsocialStart).map((s) => s.key)).toEqual(['bigaTemper']);
    expect(t.hasUnsocialHours).toBe(true);
  });

  it('reports a clean schedule as clean', () => {
    // Starting between 09:00 and 20:00 puts every action and the bake itself in
    // daylight — the window worth steering a user towards.
    for (let hour = 9; hour <= 20; hour++) {
      const t = buildTimeline({
        startAt: new Date(2026, 7, 21, hour, 0),
        schedule: 'retarded',
        adjustments: DEFAULTS,
      });
      expect(t.hasUnsocialHours, `${hour}:00 start`).toBe(false);
      expect(t.stages.some((s) => s.unsocialStart)).toBe(false);
      expect(t.bakeIsUnsocial).toBe(false);
    }
  });

  it('flags a bake that lands in the small hours', () => {
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 22, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    expect(t.bakeAt.getHours()).toBeLessThan(6);
    expect(t.bakeIsUnsocial).toBe(true);
    expect(t.hasUnsocialHours).toBe(true);
  });
});

describe('daylight saving', () => {
  // US clocks spring forward 2026-03-08 02:00 and fall back 2026-11-01 02:00.
  it('preserves elapsed real time across spring forward', () => {
    const t = buildTimeline({
      startAt: new Date(2026, 2, 7, 20, 0), // Sat 7 Mar, evening
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    // Fermentation follows the thermometer, not the clock: every stage lasts
    // exactly its stated number of real hours.
    for (const s of t.stages) {
      expect(s.endsAt.getTime() - s.startsAt.getTime(), `${s.key} elapsed`).toBe(s.durationH * HOUR_MS);
    }
    expect(t.bakeAt.getTime() - t.startsAt.getTime()).toBe(t.totalH * HOUR_MS);
  });

  it('shows the wall clock moving an hour forward through the transition', () => {
    const start = new Date(2026, 2, 7, 20, 0); // 20:00 EST
    const t = buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS });
    const fridge = t.stages.find((s) => s.key === 'bigaFridge')!;
    // 22:00 Sat + 19 real hours crosses the 02:00 jump, so the clock reads
    // 18:00 rather than the 17:00 naive calendar addition would give.
    expect(fridge.startsAt.getHours()).toBe(22);
    expect(fridge.endsAt.getHours()).toBe(18);
  });

  it('preserves elapsed real time across fall back', () => {
    const t = buildTimeline({
      startAt: new Date(2026, 9, 31, 20, 0), // Sat 31 Oct
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    for (const s of t.stages) {
      expect(s.endsAt.getTime() - s.startsAt.getTime(), `${s.key} elapsed`).toBe(s.durationH * HOUR_MS);
    }
  });
});

describe('current stage', () => {
  const start = new Date(2026, 7, 21, 9, 0);
  const t = (now?: Date) =>
    buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS, now });

  it('marks exactly one stage as current', () => {
    const inFridge = new Date(2026, 7, 21, 20, 0);
    const current = t(inFridge).stages.filter((s) => s.current);
    expect(current).toHaveLength(1);
    expect(current[0]!.key).toBe('bigaFridge');
  });

  it('treats a stage boundary as the start of the next stage', () => {
    const boundary = new Date(2026, 7, 21, 11, 0); // room temp ends, fridge begins
    const current = t(boundary).stages.filter((s) => s.current);
    expect(current).toHaveLength(1);
    expect(current[0]!.key).toBe('bigaFridge');
  });

  it('marks nothing before the start or after the bake', () => {
    expect(t(new Date(2026, 7, 21, 8, 0)).stages.some((s) => s.current)).toBe(false);
    expect(t(new Date(2026, 7, 25, 0, 0)).stages.some((s) => s.current)).toBe(false);
  });

  it('marks nothing when now is not supplied', () => {
    expect(t().stages.some((s) => s.current)).toBe(false);
  });
});

describe('backward mode', () => {
  it('solves for a biga start that lands on the target bake time', () => {
    const bakeAt = new Date(2026, 7, 23, 18, 0);
    for (const schedule of ['retarded', 'classic'] as const) {
      const startAt = solveBigaStart({ bakeAt, schedule, adjustments: DEFAULTS });
      const forward = buildTimeline({ startAt, schedule, adjustments: DEFAULTS });
      expect(forward.bakeAt.getTime(), schedule).toBe(bakeAt.getTime());
    }
  });

  /**
   * §4.7 / MESSAGE-12: the backward timeline is where order becomes timestamps,
   * and a sum can't see order. So these are clock times written out by hand
   * from the §4.7 table — not derived from `STAGE_ORDER` or `stageDurations` —
   * for a bake at Sat 3 Oct 2026, 18:00 (no daylight-saving change nearby).
   * Swapping `coldFerment` and `ballRoomTemp` leaves the start and the bake
   * right and fails every row between them.
   */
  const local = (d: number, h: number, m: number, s = 0) => new Date(2026, 9, d, h, m, s).getTime();
  const BAKE = new Date(2026, 9, 3, 18, 0);
  const golden = (schedule: Schedule, a: ScheduleAdjustments) =>
    timelineFor({ mode: 'backward', bigaStartAt: new Date(0), bakeAt: BAKE, schedule, adjustments: a }).stages.map(
      (st) => [st.key, st.startsAt.getTime()] as const,
    );

  it('puts every retarded stage at its hand-computed time (50 h 50 min back)', () => {
    expect(golden('retarded', DEFAULTS)).toEqual([
      ['bigaRoomTemp', local(1, 15, 10)], // Thu
      ['bigaFridge', local(1, 17, 10)], //   + 2 h
      ['bigaTemper', local(2, 12, 10)], //   + 19 h, Fri
      ['mix', local(2, 13, 10)], //          + 1 h
      ['bulkRest', local(2, 13, 40)], //     + 30 min
      ['divideBall', local(2, 14, 40)], //   + 1 h
      ['ballRoomTemp', local(2, 15, 0)], //  + 20 min
      ['coldFerment', local(2, 16, 30)], //  + 90 min
      ['temper', local(3, 16, 30)], //       + 24 h, Sat; + 1.5 h = 18:00
    ]);
  });

  it('puts every classic stage at its hand-computed time (26 h 50 min back)', () => {
    expect(golden('classic', CLASSIC)).toEqual([
      ['bigaRoomOnly', local(2, 15, 10)], // Fri
      ['mix', local(3, 7, 10)], //           + 16 h, Sat
      ['bulkRest', local(3, 7, 40)], //      + 30 min
      ['divideBall', local(3, 8, 40)], //    + 1 h
      ['ballRoomTemp', local(3, 9, 0)], //   + 20 min
      ['coldFerment', local(3, 10, 30)], //  + 90 min
      ['temper', local(3, 16, 30)], //       + 6 h; + 1.5 h = 18:00
    ]);
  });

  it('carries a split batch’s longer mix, shorter rise and longer divide to the second', () => {
    // 12 balls, nMix 2: mix 65 min, divide 27.5 min, rise 90 − 17.5 = 72.5
    // min. 51 h 15 min back.
    expect(golden('retarded', { ...DEFAULTS, nMix: 2, balls: 12 })).toEqual([
      ['bigaRoomTemp', local(1, 14, 45)],
      ['bigaFridge', local(1, 16, 45)], //    + 2 h
      ['bigaTemper', local(2, 11, 45)], //    + 19 h
      ['mix', local(2, 12, 45)], //           + 1 h
      ['bulkRest', local(2, 13, 50)], //      + 65 min
      ['divideBall', local(2, 14, 50)], //    + 1 h
      ['ballRoomTemp', local(2, 15, 17, 30)], // + 27.5 min
      ['coldFerment', local(2, 16, 30)], //   + 72.5 min
      ['temper', local(3, 16, 30)], //        + 24 h
    ]);
  });

  it('lands exactly on the bake when a duration is not a whole minute', () => {
    // A measured rise is 80.41 min, not 80. Summing hours x 3.6e6 left the
    // bake 1 ms early in 288 of these 648 cases, and the clock then printed
    // the minute before (6:55 PM for 6:56).
    for (const T of [70, 72.3, 73.1, 74.6, 75.7, 76.9]) {
      for (const nMix of [1, 2, 3]) {
        for (const schedule of ['retarded', 'classic'] as const) {
          for (let min = 0; min < 60; min += 7) {
            const adjustments = { ...DEFAULTS, nMix, ballRoomTempH: computeRoomMinutes({ finalDoughTempF: T, ddtF: 74 }) / 60 };
            const bakeAt = new Date(2026, 9, 3, 18, min);
            const t = timelineFor({ mode: 'backward', bigaStartAt: new Date(0), bakeAt, schedule, adjustments });
            expect(t.bakeAt.getTime(), `${T} °F, nMix ${nMix}, ${schedule}, :${min}`).toBe(bakeAt.getTime());
          }
        }
      }
    }
  });

  it('counts back in real hours across the end of daylight saving', () => {
    // Clocks go back at 02:00 on Sun 1 Nov 2026. 50 h 50 min before 18:00 EST
    // is 16:10 EDT on Fri 30 Oct — calendar arithmetic would say 15:10.
    const t = timelineFor({
      mode: 'backward',
      bigaStartAt: new Date(0),
      bakeAt: new Date(2026, 10, 1, 18, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    expect(t.startsAt.getTime()).toBe(new Date(2026, 9, 30, 16, 10).getTime());
    expect((t.bakeAt.getTime() - t.startsAt.getTime()) / HOUR_MS).toBeCloseTo(50 + 50 / 60, 9);
  });

  it('holds the start going forward and the bake going backward', () => {
    // The default schedule from this start bakes at BAKE; 6 h more cold moves
    // whichever end isn't held.
    const start = new Date(2026, 9, 1, 15, 10);
    const longer = { ...DEFAULTS, coldFermentH: 30 };
    const fwd = timelineFor({ mode: 'forward', bigaStartAt: start, bakeAt: BAKE, schedule: 'retarded', adjustments: longer });
    const back = timelineFor({ mode: 'backward', bigaStartAt: start, bakeAt: BAKE, schedule: 'retarded', adjustments: longer });
    expect(fwd.startsAt.getTime()).toBe(start.getTime());
    expect(fwd.bakeAt.getTime()).toBe(BAKE.getTime() + 6 * HOUR_MS);
    expect(back.bakeAt.getTime()).toBe(BAKE.getTime());
    expect(back.startsAt.getTime()).toBe(start.getTime() - 6 * HOUR_MS);
  });

  it('falls back to forward when there is no bake time to hold', () => {
    const start = new Date(2026, 9, 1, 14, 10);
    const t = timelineFor({ mode: 'backward', bigaStartAt: start, bakeAt: null, schedule: 'retarded', adjustments: DEFAULTS });
    expect(t.startsAt.getTime()).toBe(start.getTime());
  });

  it('shows the same schedule either way when one end is fed to the other', () => {
    // What switching modes does: nothing may move at the moment of the switch.
    const start = new Date(2026, 9, 1, 14, 17, 23);
    const a = { ...DEFAULTS, nMix: 2, ballRoomTempH: 80.41 / 60 };
    const fwd = timelineFor({ mode: 'forward', bigaStartAt: start, bakeAt: null, schedule: 'retarded', adjustments: a });
    const back = timelineFor({ mode: 'backward', bigaStartAt: new Date(0), bakeAt: fwd.bakeAt, schedule: 'retarded', adjustments: a });
    expect(back.stages.map((st) => st.startsAt.getTime())).toEqual(fwd.stages.map((st) => st.startsAt.getTime()));
  });
});

describe('§4.7 windows that keep every step out of the small hours', () => {
  const DAY = new Date(2026, 9, 5);
  const q = (h: number, m = 0) => new Date(2026, 9, 5, h, m).getTime();
  const spans = (mode: 'forward' | 'backward', schedule: Schedule, a: ScheduleAdjustments) =>
    socialWindows({ mode, day: DAY, schedule, adjustments: a }).map((w) => [w.from.getTime(), w.to.getTime()]);

  // Each window worked by hand from the stage offsets: every action start,
  // and the bake, in 06:00–24:00. Retarded at 24 h cold: the temper starts
  // at S + 1:20 the next day but one, and the bake at S + 2:50, so the start
  // must be before 21:10 — and after 9:00, for the biga's temper at S + 21 h.
  it('gives 9:00 AM–9:00 PM for a retarded start at 24 h', () => {
    expect(spans('forward', 'retarded', DEFAULTS)).toEqual([[q(9), q(21)]]);
  });

  it('gives 2:00–9:00 PM for a classic start at its 6 h cold ferment, where 9 a.m. is itself overnight', () => {
    // The mix at S + 16 h and the trays into the fridge at S + 19:20 need S
    // from 14:00; the bake at S + 26:50 needs it before 21:10.
    expect(spans('forward', 'classic', CLASSIC)).toEqual([[q(14), q(21)]]);
  });

  it('moves with the cold ferment', () => {
    // 6 h: the bake at S + 8:50 must fall before midnight, so the start is
    // before 15:10. 18 h: the temper at S + 19:20 must be after 06:00.
    expect(spans('forward', 'retarded', { ...DEFAULTS, coldFermentH: 6 })).toEqual([[q(9), q(15)]]);
    expect(spans('forward', 'retarded', { ...DEFAULTS, coldFermentH: 18 })).toEqual([[q(10, 45), q(21, 45)]]);
  });

  it('can be two windows', () => {
    // 12 h: the bake at S + 14:50 allows a 9:00 start alone before 9:10, and
    // the temper at S + 13:20 allows nothing again until 16:40.
    expect(spans('forward', 'retarded', { ...DEFAULTS, coldFermentH: 12 })).toEqual([
      [q(9), q(9)],
      [q(16, 45), q(21, 45)],
    ]);
  });

  it('gives bake times in backward mode', () => {
    // The forward window shifted by 50 h 50 min, rounded inward to quarters.
    expect(spans('backward', 'retarded', DEFAULTS)).toEqual([[q(12), q(23, 45)]]);
  });

  it('matches a brute-force scan exactly', () => {
    // Independent of the grouping: every quarter in a window works, every
    // quarter outside fails.
    for (const mode of ['forward', 'backward'] as const) {
      for (const schedule of ['retarded', 'classic'] as const) {
        for (let cold = 6; cold <= 36; cold += 1) {
          for (const temperH of [1.5, 1.75, 2]) {
            const a = { ...DEFAULTS, coldFermentH: cold, temperH };
            const windows = socialWindows({ mode, day: DAY, schedule, adjustments: a });
            const inWindow = new Set<number>();
            for (const w of windows) {
              for (let t = w.from.getTime(); t <= w.to.getTime(); t += 15 * 60_000) inWindow.add(new Date(t).getHours() * 60 + new Date(t).getMinutes());
            }
            for (let i = 0; i < 96; i++) {
              const at = new Date(2026, 9, 5, 0, i * 15);
              const ok = !timelineFor({ mode, bigaStartAt: at, bakeAt: at, schedule, adjustments: a }).hasUnsocialHours;
              expect(inWindow.has(i * 15), `${mode} ${schedule} ${cold} h, temper ${temperH}, ${i * 15} min`).toBe(ok);
            }
          }
        }
      }
    }
  });

  it('never works with the anchor itself in the small hours, so no window crosses midnight', () => {
    // The anchor is an action — the biga going in, or the bake.
    for (const mode of ['forward', 'backward'] as const) {
      for (const schedule of ['retarded', 'classic'] as const) {
        for (let i = 0; i < 24; i++) {
          const at = new Date(2026, 9, 5, 0, i * 15);
          expect(timelineFor({ mode, bigaStartAt: at, bakeAt: at, schedule, adjustments: DEFAULTS }).hasUnsocialHours).toBe(true);
        }
      }
    }
  });

  it('words one window, two, a single quarter, and none', () => {
    const w = (h1: number, m1: number, h2: number, m2: number) => ({ from: new Date(q(h1, m1)), to: new Date(q(h2, m2)) });
    expect(socialWindowPhrase([w(9, 0, 20, 0)], 'forward')).toMatch(/^Starting the biga between 9:00\sAM and 8:00\sPM keeps every step out of the small hours\.$/);
    expect(socialWindowPhrase([w(14, 0, 14, 0), w(22, 45, 23, 45)], 'backward')).toMatch(/^Baking at 2:00\sPM or between 10:45\sPM and 11:45\sPM keeps/);
    expect(socialWindowPhrase([], 'backward')).toBe('With these durations no bake time keeps every step out of the small hours.');
  });
});

describe('formatting', () => {
  it.each([
    [2, '2 h'],
    [0.33, '20 min'],
    [0.5, '30 min'],
    [1.5, '1 h 30 min'],
    [51.83, '51 h 50 min'],
  ])('formats %s h as %s', (hours, expected) => {
    expect(formatDuration(hours)).toBe(expected);
  });

  it('round-trips a datetime-local value', () => {
    const d = new Date(2026, 7, 21, 14, 30);
    expect(toDatetimeLocal(d)).toBe('2026-08-21T14:30');
    expect(fromDatetimeLocal('2026-08-21T14:30')?.getTime()).toBe(d.getTime());
  });

  it('rejects a malformed datetime-local value', () => {
    for (const bad of ['', 'not-a-date', '2026-08-21', '2026-13-45T99:99x']) {
      expect(fromDatetimeLocal(bad), bad).toBeNull();
    }
  });

  it('rounds up to the next quarter hour', () => {
    expect(toDatetimeLocal(roundToNextQuarterHour(new Date(2026, 7, 21, 14, 1)))).toBe('2026-08-21T14:15');
    expect(toDatetimeLocal(roundToNextQuarterHour(new Date(2026, 7, 21, 14, 15)))).toBe('2026-08-21T14:15');
    expect(toDatetimeLocal(roundToNextQuarterHour(new Date(2026, 7, 21, 23, 58)))).toBe('2026-08-22T00:00');
  });
});

describe('§7.4 a planning point shows its range', () => {
  const shown = (schedule: Schedule, a: ScheduleAdjustments = DEFAULTS) =>
    buildTimeline({ startAt: new Date(2026, 8, 25, 9), schedule, adjustments: a }).stages.map(
      (s) => `${s.key}: ${formatStageDuration(s.durationH, s.range)}`,
    );

  it('puts the recipe range beside each planning point, and only there', () => {
    // MESSAGE-31: bigaFridge, bigaRoomOnly, bulkRest and temper. Written out,
    // not derived from PLANNING_RANGE_H, so a wrong range fails here.
    expect(shown('retarded')).toEqual([
      'bigaRoomTemp: 2 h',
      'bigaFridge: 19 h (18–20)',
      'bigaTemper: 1 h',
      'mix: 30 min',
      'bulkRest: 1 h (45–60 min)',
      'divideBall: 20 min',
      'ballRoomTemp: 1 h 30 min',
      'coldFerment: 24 h',
      'temper: 1 h 30 min (1.5–2 h)',
    ]);
    expect(shown('classic', CLASSIC).slice(0, 2)).toEqual(['bigaRoomOnly: 16 h (16–18)', 'mix: 30 min']);
  });

  it('drops the range for a classic ferment planned off the Giorilli window', () => {
    // §7.5's exception: the plan rules, so "13 h (16–18)" would contradict it.
    expect(shown('classic', { ...DEFAULTS, bigaRoomOnlyH: 13 })[0]).toBe('bigaRoomOnly: 13 h');
    expect(shown('classic', { ...DEFAULTS, bigaRoomOnlyH: 18 })[0]).toBe('bigaRoomOnly: 18 h (16–18)');
  });

  it('keeps the unit when the point is not in the range\'s unit alone', () => {
    expect(shown('retarded', { ...DEFAULTS, bigaFridgeH: 18.5 })[1]).toBe('bigaFridge: 18 h 30 min (18–20 h)');
  });
});
