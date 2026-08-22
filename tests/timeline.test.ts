import { describe, expect, it } from 'vitest';
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
      divideBall: 0.33,
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
      divideBall: 0.33,
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

    it('keeps fixed overhead inside the stated 25.5–30 h band', () => {
      for (const cold of [6, 12, 24, 30, 36]) {
        const overhead = totalAt(cold) - cold;
        expect(overhead, `overhead at ${cold} h cold`).toBeGreaterThanOrEqual(25.5);
        expect(overhead, `overhead at ${cold} h cold`).toBeLessThanOrEqual(30);
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

    it('stays inside the band across the realistic range', () => {
      // ballRoomTempH is no longer chosen — §4.8 computes it from the measured
      // dough temperature, spanning 71 min (77 °F) to 144 min (70 °F).
      const overhead = (a: ScheduleAdjustments) =>
        buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH -
        a.coldFermentH;

      const warmest: ScheduleAdjustments = {
        bigaFridgeH: 18, bigaRoomOnlyH: 16, ballRoomTempH: 71 / 60, coldFermentH: 24, temperH: 2,
      };
      expect(overhead(warmest)).toBeGreaterThanOrEqual(25.5);
      expect(overhead(warmest)).toBeLessThanOrEqual(30);
      expect(overhead({ ...DEFAULTS })).toBeCloseTo(27.83, 2);
    });

    /**
     * §4.8 quotes fixed overhead as 25.5–30 h, but that band predates the
     * shaped rise time. With every adjustable at its maximum simultaneously —
     * a 20 h fridge, a 3 h temper, and a 70 °F dough stretching the room phase
     * to 144 min — overhead reaches 30.2 h and steps just past it.
     *
     * Recorded rather than papered over: the defaults still land exactly on the
     * ~34 / ~52 / ~64 h totals §4.8 says to assert, and this corner needs all
     * three maxima at once plus a 5 °F temperature miss. Flagged for the spec.
     */
    it('exceeds the quoted band only at the all-maximum corner', () => {
      const overhead = (a: ScheduleAdjustments) =>
        buildTimeline({ startAt: start, schedule: 'retarded', adjustments: a }).totalH -
        a.coldFermentH;
      const hottest: ScheduleAdjustments = {
        bigaFridgeH: 20, bigaRoomOnlyH: 16, ballRoomTempH: 144 / 60, coldFermentH: 24, temperH: 3,
      };
      expect(overhead(hottest)).toBeCloseTo(30.23, 2);
      expect(overhead(hottest)).toBeGreaterThan(30);
    });
  });

  it('omits stages that do not apply rather than showing them as zero', () => {
    const start = new Date(2026, 7, 21, 9, 0);
    const retarded = buildTimeline({ startAt: start, schedule: 'retarded', adjustments: DEFAULTS });
    const classic = buildTimeline({ startAt: start, schedule: 'classic', adjustments: DEFAULTS });

    expect(retarded.stages.map((s) => s.key)).not.toContain('bigaRoomOnly');
    expect(classic.stages.map((s) => s.key)).not.toContain('bigaFridge');
    expect(classic.stages.map((s) => s.key)).not.toContain('bigaTemper');
    for (const s of [...retarded.stages, ...classic.stages]) {
      expect(s.durationH, `${s.key} has a real duration`).toBeGreaterThan(0);
    }
  });

  it('runs the stages in §4.7 order', () => {
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 9, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    expect(t.stages.map((s) => s.key)).toEqual([
      'bigaRoomTemp',
      'bigaFridge',
      'bigaTemper',
      'mix',
      'bulkRest',
      'divideBall',
      'ballRoomTemp',
      'coldFerment',
      'temper',
    ]);
  });

  it('leaves no gaps or overlaps between stages', () => {
    const t = buildTimeline({
      startAt: new Date(2026, 7, 21, 9, 0),
      schedule: 'retarded',
      adjustments: DEFAULTS,
    });
    for (let i = 1; i < t.stages.length; i++) {
      expect(t.stages[i]!.startsAt.getTime()).toBe(t.stages[i - 1]!.endsAt.getTime());
    }
    expect(t.stages.at(-1)!.endsAt.getTime()).toBe(t.bakeAt.getTime());
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
