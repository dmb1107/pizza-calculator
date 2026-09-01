import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { mixStaggerH } from '../src/lib/engine';
import {
  buildTimeline,
  formatDuration,
  fromDatetimeLocal,
  isUnsocialHour,
  roundToNextQuarterHour,
  solveBigaStart,
  stageDurations,
  toDatetimeLocal,
  type ScheduleAdjustments,
} from '../src/lib/timeline';

/** Timeline — WEBSITE-SPEC-biga-calculator.md §4.7. TZ is pinned to America/New_York. */

const DEFAULTS: ScheduleAdjustments = {
  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  ballRoomTempH: 1.5,
  nMix: 1,
  coldFermentH: 24,
  temperH: 2.5,
};

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
      divideBall: C.DIVIDE_BALL_H,
      ballRoomTemp: 1.5,
      coldFerment: 24,
      temper: 2.5,
    });
  });

  it('matches the classic RT column', () => {
    expect(stageDurations('classic', DEFAULTS)).toEqual({
      bigaRoomTemp: 0,
      bigaFridge: 0,
      bigaRoomOnly: 16,
      bigaTemper: 0,
      mix: 0.5,
      bulkRest: 1,
      divideBall: C.DIVIDE_BALL_H,
      ballRoomTemp: 1.5,
      coldFerment: 24,
      temper: 2.5,
    });
  });

  it('totals 51.83 h retarded and 45.83 h classic at the defaults', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    expect(buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS }).totalH).toBeCloseTo(51.83, 2);
    expect(buildTimeline({ startAt: start, schedule: 'classic', adjustments: DEFAULTS }).totalH).toBeCloseTo(45.83, 2);
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
      [6, 34],
      [24, 52],
      [36, 64],
    ])('%i h cold ferment gives ~%i h total', (cold, expected) => {
      // "Those are midpoints; each carries a ±2 h spread."
      expect(Math.abs(totalAt(cold) - expected)).toBeLessThanOrEqual(2);
    });

    it('keeps fixed overhead inside the stated 25.6–30.8 h band', () => {
      for (const cold of [6, 12, 24, 30, 36]) {
        const overhead = totalAt(cold) - cold;
        expect(overhead, `overhead at ${cold} h cold`).toBeGreaterThanOrEqual(25.6);
        expect(overhead, `overhead at ${cold} h cold`).toBeLessThanOrEqual(30.8);
      }
    });

    it('holds the overhead constant, so total is always coldFerment + ~28 h', () => {
      // Everything outside the cold ferment is fixed, so the relationship is
      // linear with slope exactly 1 — a stage accidentally scaling with the
      // cold ferment would show up here.
      const overheads = [6, 12, 24, 30, 36].map((c) => totalAt(c) - c);
      for (const o of overheads) expect(o).toBeCloseTo(overheads[0] as number, 10);
      expect(overheads[0]).toBeCloseTo(27.83, 2);
    });

    /**
     * §4.8 quotes fixed overhead as **25.6–30.8 h** across the full input
     * ranges, with **27.8 h at the defaults**. The defaults are asserted as an
     * equality; the band is a range check.
     *
     * `bulkRest` (1 h) and `divideBall` (0.33 h) are FIXED by §4.7 and are not
     * inputs. The recipe's "45–60 min" for the bulk rest is guidance to the
     * baker — rest until the gluten relaxes — not a scheduling variable, and
     * 60 min is the planning number. Flexing either is what put an earlier
     * version of this band at 25.3.
     */
    it('is exactly 27.8 h at the defaults', () => {
      expect(overheadOf(DEFAULTS)).toBeCloseTo(27.83, 2);
    });

    it('spans exactly 25.6–30.8 h across the full input ranges', () => {
      // The extremes use the shaped-rise CLAMP bounds, not the 71–144 min the
      // model reaches at realistic dough temperatures. Both ends are tight.
      const lowest: ScheduleAdjustments = {
        bigaFridgeH: 18, bigaRoomOnlyH: 16, ballRoomTempH: 45 / 60, nMix: 1, coldFermentH: 24, temperH: 2,
      };
      const highest: ScheduleAdjustments = {
        bigaFridgeH: 20, bigaRoomOnlyH: 16, ballRoomTempH: 180 / 60, nMix: 1, coldFermentH: 24, temperH: 3,
      };
      expect(overheadOf(lowest)).toBeCloseTo(25.58, 2);
      expect(overheadOf(highest)).toBeCloseTo(30.83, 2);

      // The band is quoted to one decimal, so compare at that precision.
      for (const a of [lowest, DEFAULTS, highest]) {
        const rounded = Math.round(overheadOf(a) * 10) / 10;
        expect(rounded, 'above the band').toBeGreaterThanOrEqual(25.6);
        expect(rounded, 'below the band').toBeLessThanOrEqual(30.8);
      }
    });

    /**
     * A known simplification, recorded so it stays known rather than becoming
     * an undiscovered bug. §4.7 models `divideBall` as a flat 20 min; the real
     * time scales at roughly 1 min per ball on top of a fixed 10–15 min rest,
     * so 3 balls takes ~15 min and 18 takes ~30. The worst case is ~10 min in
     * a 52-hour schedule — 0.3% — and modelling it would change no decision.
     *
     * Deliberately NOT built. This test pins the flat behaviour so a future
     * scaling rule is a conscious change rather than an accident.
     */
    it('models divide-and-ball as a flat 20 min, independent of batch size', () => {
      // Batch size is not a parameter of the schedule at all — that is the
      // simplification, stated structurally rather than by sampling sizes.
      for (const schedule of ['retarded', 'classic'] as const) {
        expect(stageDurations(schedule, DEFAULTS).divideBall).toBeCloseTo(0.33, 2);
      }
      expect(buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS })
        .stages.find((x) => x.key === 'divideBall')?.durationH).toBeCloseTo(0.33, 2);
    });
  });

  describe('honours the §4.7 adjustable ranges', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    const total = (a: Partial<ScheduleAdjustments>, schedule: 'retarded' | 'classic' = 'retarded') =>
      buildTimeline({ startAt: start, schedule, adjustments: { ...DEFAULTS, ...a } }).totalH;

    it('bigaFridge 18–20', () => {
      expect(total({ bigaFridgeH: 18 })).toBeCloseTo(50.83, 2);
      expect(total({ bigaFridgeH: 20 })).toBeCloseTo(52.83, 2);
    });

    it('bigaRoomOnly 12–18', () => {
      expect(total({ bigaRoomOnlyH: 12 }, 'classic')).toBeCloseTo(41.83, 2);
      expect(total({ bigaRoomOnlyH: 18 }, 'classic')).toBeCloseTo(47.83, 2);
    });

    it('ballRoomTemp 1–2', () => {
      expect(total({ ballRoomTempH: 1 })).toBeCloseTo(51.33, 2);
      expect(total({ ballRoomTempH: 2 })).toBeCloseTo(52.33, 2);
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
      // ⚠️ This CENTRES the spread rather than removing it: mix 1's half goes
      // from +35 to +17.5 min and mix 2's from 0 to −17.5. One clock cannot do
      // better, and halving the worst case is the whole gain.
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
      [1, 0.5, 1.5, 27.83],
      [2, 1.083, 1.208, 28.12],
      // Settled by MESSAGE-6 §3, and I was wrong. 28.41 came from `divideBall`
      // being the literal 0.33 rather than the 20 minutes it actually is —
      // a displayed figure baked into the source, which is the same error one
      // level deeper than the one I was reporting. At 20/60 every route gives
      // 28.4167.
      [3, 1.667, 0.917, 28.42],
    ])('nMix %i: mix %f h, rise %f h, overhead %f h', (nMix, mix, rise, overheadH) => {
      // §4.7's table, all three asserted. 28.42 was the figure an earlier draft
      // attached to nMix 2 — right arithmetic, wrong batch size, which is why
      // it reproduced whenever anyone checked it in isolation.
      const d = stageDurations('retarded', { ...DEFAULTS, nMix });
      expect(d.mix).toBeCloseTo(mix, 2);
      expect(d.ballRoomTemp).toBeCloseTo(rise, 2);
      const total =
        buildTimeline({ startAt: start, schedule: 'retarded', adjustments: { ...DEFAULTS, nMix } })
          .totalH - DEFAULTS.coldFermentH;
      expect(total).toBeCloseTo(overheadH, 2);
    });

    it('puts fixed overhead at 28.1 h when nMix is 2', () => {
      const overhead = (a: ScheduleAdjustments) =>
        buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH -
        a.coldFermentH;

      // The 25.6–30.8 band in §4.7 is explicitly nMix = 1 only.
      expect(overhead(DEFAULTS)).toBeCloseTo(27.83, 2);

      // ⚠️ §4.7 asserts 28.4 h here, which is 27.83 + 0.58 — the second mix and
      // the changeover, and nothing else. But the SAME section then subtracts
      // half the stagger (0.29 h) from `ballRoomTemp`, which necessarily takes
      // it back out of the overhead. Both cannot hold at once; 28.12 is the
      // figure consistent with the rules as written.
      //
      // RAISED WITH THE RECIPE AGENT. The two numbers look like they were
      // computed in separate passes — "90 min becomes 72" has the same
      // fingerprint, being 72.5 exactly.
      expect(overhead({ ...DEFAULTS, nMix: 2 })).toBeCloseTo(28.12, 2);

      // What §4.7's superseded 28.4 would require: the mix change with the
      // stagger correction left out.
      const withoutStagger = overhead({ ...DEFAULTS, nMix: 2 }) + mixStaggerH(2) / 2;
      expect(withoutStagger).toBeCloseTo(28.42, 2);
    });

    it('leaves every other stage untouched by nMix', () => {
      const one = stageDurations('retarded', DEFAULTS);
      const two = stageDurations('retarded', { ...DEFAULTS, nMix: 2 });
      for (const key of ['bigaRoomTemp', 'bigaFridge', 'bigaTemper', 'bulkRest', 'divideBall', 'coldFerment', 'temper'] as const) {
        expect(two[key], `${key} must not depend on nMix`).toBe(one[key]);
      }
    });

    it('coldFerment 6–36', () => {
      expect(total({ coldFermentH: 6 })).toBeCloseTo(33.83, 2);
      expect(total({ coldFermentH: 36 })).toBeCloseTo(63.83, 2);
    });

    it('temper 2–3', () => {
      expect(total({ temperH: 2 })).toBeCloseTo(51.33, 2);
      expect(total({ temperH: 3 })).toBeCloseTo(52.33, 2);
    });
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
