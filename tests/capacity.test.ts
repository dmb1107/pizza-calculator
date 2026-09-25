import { describe, expect, it } from 'vitest';
import { C, indicatorForDial, indicatorSegments } from '../src/lib/constants';
import { calculate, computeCapacity, computeFormula, type CalculatorInputs } from '../src/lib/engine';
import { tokenValues, type ScheduleTokens } from '../src/lib/bindTokens';
import { capacityAlerts, splitHint, NEAR_LIMIT_FRACTION } from '../src/lib/capacity';
import { formatLitSegments, formatSegmentCount } from '../src/lib/format';

/** §7.3 *Capacity* and §7.5 *Speed* — MESSAGE-29. */

const SCHEDULE: ScheduleTokens = { bigaFridgeH: 19, bigaRoomOnlyH: 16, coldFermentH: 24, temperH: 2.5 };
const inputs = (balls: number, ballWeightG = 265): CalculatorInputs => ({
  balls,
  ballWeightG,
  roomTempF: 70,
  flourTempF: 70,
  bigaTempF: 58,
  frictionFactorF: 14,
});
const alertsAt = (balls: number, ballWeightG = 265) => {
  const r = calculate(inputs(balls, ballWeightG));
  return capacityAlerts(r, tokenValues(r, SCHEDULE));
};
const ids = (balls: number, ballWeightG = 265) => alertsAt(balls, ballWeightG).map((a) => a.id);

describe('§7.3 capacity: which message, when', () => {
  it('says nothing at 6 balls — one mix, well inside the limits', () => {
    expect(ids(6)).toEqual([]);
  });

  it('puts the split first, then the one-biga line, at 12 balls', () => {
    expect(ids(12)).toEqual(['capacity-split', 'capacity-divide-biga']);
  });

  it('splits the biga too at 18 balls, and is near the limit there', () => {
    // 18 x 265 g: two mixes of 2437.5 g, and 1833.7 g of biga flour over the 1610 g cap.
    expect(ids(18)).toEqual(['capacity-split', 'capacity-biga-split', 'capacity-near-limit']);
  });

  it('fires near the limit at exactly 9 and 18 balls at the 265 g default', () => {
    const near = [];
    for (let b = C.MIN_BALLS; b <= 24; b++) if (ids(b).includes('capacity-near-limit')) near.push(b);
    expect(near).toEqual([9, 18]);
  });

  it('never reaches the below-minimum guard anywhere in the input ranges', () => {
    // §7.3: smallest single mix 735.8 g (3 x 240 g), smallest split 1250.9 g.
    // Kept, and swept, so a range change cannot make it silently reachable.
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let w = 240; w <= 300; w++) {
        expect(ids(b, w), `${b} x ${w} g`).not.toContain('capacity-below-minimum');
      }
    }
  });

  it('does fire it below the input range, where the engine still computes', () => {
    expect(ids(1)).toContain('capacity-below-minimum');
  });

  it('decides the near-limit on the printed per-mix dough, not the unrounded one', () => {
    // §7.3: "evaluated on the values the app displays". 2374.96 g prints as
    // 2375.0, which is exactly 0.95 x 2500 — so it must fire.
    const base = calculate(inputs(6));
    const at = (doughPerMix: number) => {
      const r = { ...base, capacity: { ...base.capacity, doughPerMix } };
      return capacityAlerts(r, tokenValues(r, SCHEDULE)).map((a) => a.id);
    };
    expect(NEAR_LIMIT_FRACTION * C.MAX_DOUGH).toBe(2375);
    expect(at(2374.96)).toContain('capacity-near-limit');
    expect(at(2374.94)).not.toContain('capacity-near-limit');
  });
});

describe('§7.3 capacity: the limit named is the one that binds', () => {
  it('splits a final mix on dough, never first on the 66% flour cap', () => {
    // FLOUR_CAP_66 x DOUGH_YIELD = 2600.6 g of dough, above 2500 — the split
    // message names only the dough limit. Fails if a formula change (hydration)
    // ever lets the flour cap bind first.
    expect(C.FLOUR_CAP_66 * C.DOUGH_YIELD).toBeGreaterThan(C.MAX_DOUGH);
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let w = 240; w <= 300; w++) {
        const f = computeFormula({ balls: b, ballWeightG: w });
        expect(Math.ceil(f.flourTotal / C.FLOUR_CAP_66), `${b} x ${w} g`).toBeLessThanOrEqual(
          Math.ceil(f.doughTotal / C.MAX_DOUGH),
        );
      }
    }
  });

  it('splits the biga on the 55% flour cap, never first on dough mass', () => {
    // FLOUR_CAP_55 x 1.5 = 2415 g of biga, under 2500 — the biga message names the flour cap.
    expect(C.FLOUR_CAP_55 * (1 + C.BIGA_HYDRATION)).toBeLessThan(C.MAX_DOUGH);
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let w = 240; w <= 300; w++) {
        const f = computeFormula({ balls: b, ballWeightG: w });
        expect(Math.ceil(f.bigaMass / C.MAX_DOUGH), `${b} x ${w} g`).toBeLessThanOrEqual(
          computeCapacity(f).nBiga,
        );
      }
    }
  });
});

describe('§7.3 capacity: the words', () => {
  it('renders the split with the spec wording and the batch figures', () => {
    const split = alertsAt(12)[0]!;
    expect(split.title).toBe('Too much dough for one mix — this batch is split.');
    expect(split.detail).toBe(
      '12 balls is 3250.0 g of dough, and the Halo Core takes at most 2500 g. Mix it as **2 batches of 1625.0 g**, ' +
        'one after another in the same bowl. The amounts and steps below are already per mix.',
    );
  });

  it('names the printed per-mix dough near the limit', () => {
    const near = alertsAt(9).find((a) => a.id === 'capacity-near-limit')!;
    expect(near.detail).toBe('2437.5 g per mix is within 5% of the 2500 g maximum. It will mix, but there\'s little margin — weigh carefully.');
  });

  it('shows the split beside the ball count only when the batch splits', () => {
    const at = (balls: number) => {
      const r = calculate(inputs(balls));
      return splitHint(r, tokenValues(r, SCHEDULE));
    };
    expect(at(9)).toBeNull();
    expect(at(12)).toBe('→ 2 mixes of 1625.0 g');
    expect(at(24)).toBe('→ 3 mixes of 2166.6 g'); // 24 x 265 x 1.022 / 3 = 2166.64
  });
});

describe('§7.5 speed: what the indicator shows', () => {
  it.each([
    [5, 0, true, '½', '½ lit segment'],
    [10, 1, false, '1', '1 lit segment'],
    [15, 1, true, '1½', '1½ lit segments'],
    [20, 2, false, '2', '2 lit segments'],
    [30, 3, false, '3', '3 lit segments'],
    [40, 4, false, '4', '4 lit segments'],
    [80, 8, false, '8', '8 lit segments'],
  ])('%i%% is %i full, half %s — "%s"', (dial, full, half, count, words) => {
    const ind = indicatorForDial(dial);
    expect(ind).toEqual({ full, half, total: 10 });
    expect(formatSegmentCount(ind.full, ind.half)).toBe(count);
    expect(formatLitSegments(ind.full, ind.half)).toBe(words);
  });

  it.each([
    [5, ['dim']],
    [15, ['lit', 'dim']],
    [20, ['lit', 'lit']],
    [40, ['lit', 'lit', 'lit', 'lit']],
  ] as const)('%i%% shows %j, then the rest off — a half step is the next segment dimmed', (dial, head) => {
    // Dave, at the mixer: half segments are dimmed, not half-filled.
    const segs = indicatorSegments(dial);
    expect(segs).toHaveLength(10);
    expect(segs.slice(0, head.length)).toEqual(head);
    expect(segs.slice(head.length).every((s) => s === 'off')).toBe(true);
  });
});
