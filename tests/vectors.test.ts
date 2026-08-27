import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { BATCH_VECTORS, THERMAL_WEIGHTS, TOL } from './vectors';

/**
 * These tests validate the TRANSCRIPTION of spec §5, not the engine.
 *
 * The vectors are the engine's acceptance criteria, so a typo in the table
 * would silently redefine "correct". Checking the table against the spec's own
 * stated invariants catches that before any engine code runs.
 *
 * Note on tolerances: §5 is a DISPLAY table — every gram figure is already
 * rounded to 1 decimal, so summing n of them admits up to n * 0.05 g of
 * accumulated rounding.
 */

function within(actual: number, expected: number, tol: number, what: string): void {
  const diff = Math.abs(actual - expected);
  expect(
    diff <= tol + 1e-9,
    `${what}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)} +/-${tol} (off by ${diff.toFixed(4)})`,
  ).toBe(true);
}

describe('spec §5 test vectors are internally consistent', () => {
  it.each(BATCH_VECTORS)('$balls balls x $ballG g satisfies the §5 invariants', (v) => {
    within((v.bigaWater + v.freshWater) / v.F, C.HYDRATION, 0.0005, 'hydration');
    within(v.salt / v.F, C.SALT, 0.0005, 'salt fraction');
    within(v.bigaFlour / v.F, C.BIGA_FRACTION, 0.0005, 'biga fraction');
    within(v.bigaWater / v.bigaFlour, C.BIGA_HYDRATION, 0.0005, 'biga hydration');
    within(v.bigaADY / v.bigaFlour, C.ADY_OF_BIGA_FLOUR, 0.00002, 'ADY fraction');
    within(v.bigaFlour + v.freshFlour, v.F, 0.15, 'bigaFlour + freshFlour = F');
    // §5: "phaseA + phaseB = freshWater"
    within(v.phaseA + v.phaseB, v.freshWater, 0.15, 'phaseA + phaseB = freshWater');
    within(v.phaseA / v.freshWater, C.PHASE_A_FRACTION, 0.001, 'Phase A is 60%');
  });

  it('derives total flour from balls, ball weight and overage', () => {
    for (const v of BATCH_VECTORS) {
      within(v.F, (v.balls * v.ballG * C.OVERAGE) / C.DOUGH_YIELD, TOL.grams, `F for ${v.balls}x${v.ballG}`);
    }
  });

  it('quotes a dough-only Ct consistent with the component heat capacities', () => {
    // §4.2: Ct is PER-MIX. The ingredient columns are batch totals, so they
    // have to be divided by nMix before the heat capacities are summed — the
    // bowl only ever faces one mix at a time.
    for (const v of BATCH_VECTORS) {
      const bigaMass = (v.bigaFlour + v.bigaWater) / v.nMix;
      const ct =
        bigaMass * C.C_BIGA +
        (v.freshFlour / v.nMix) * C.C_FLOUR +
        (v.freshWater / v.nMix) * C.C_WATER +
        (v.salt / v.nMix) * C.C_SALT;
      within(v.Ct, ct, 0.5, `Ct for ${v.balls} balls`);
    }
  });

  it('uses the default DDT rule: 75 degF for <=6 balls, 74 degF for 7+', () => {
    for (const v of BATCH_VECTORS) {
      expect(v.ddtF, `${v.balls} balls`).toBe(v.balls <= 6 ? 75 : 74);
    }
  });

  it('splits capacity per the §4.5 rules', () => {
    for (const v of BATCH_VECTORS) {
      const doughTotal = v.F * C.DOUGH_YIELD;
      const bigaMass = v.bigaFlour + v.bigaWater;
      expect(
        Math.max(1, Math.ceil(Math.max(doughTotal / C.MAX_DOUGH, v.F / C.FLOUR_CAP_66))),
        `nMix for ${v.balls} balls`,
      ).toBe(v.nMix);
      expect(
        Math.max(1, Math.ceil(Math.max(v.bigaFlour / C.FLOUR_CAP_55, bigaMass / C.MAX_DOUGH))),
        `nBiga for ${v.balls} balls`,
      ).toBe(v.nBiga);
    }
  });

  it('shows the water temperature falling as the MIX grows, at a fixed DDT', () => {
    // Not a formula check — a shape check. Bigger mixes dilute the bowl's fixed
    // contribution, so they need colder water at the same DDT.
    //
    // ⚠️ Three things have to be held straight here, and the obvious version of
    // this test gets all three wrong:
    //
    //   1. It is the MIX that matters, not the batch. §4.2 made the weights
    //      per-mix, so 12 balls (two 6-ball mixes) sits ABOVE 9 balls.
    //   2. DDT must be held fixed. §4.11 keys DDT to TOTAL balls, because both
    //      doughs share one bulk container — so 6 balls runs at 75 and 12 at
    //      74 despite being the same size of mix, which is worth 3.3 °F.
    //   3. Equal mix size at equal DDT must give an equal answer: 18 balls is
    //      two 9-ball mixes and lands exactly on the 9-ball row.
    const at265 = BATCH_VECTORS.filter((v) => v.ballG === 265);
    const byDdt = new Map<number, { perMixBalls: number; waterTempF: number }[]>();
    for (const v of at265) {
      const group = byDdt.get(v.ddtF) ?? [];
      group.push({ perMixBalls: v.balls / v.nMix, waterTempF: v.waterTempF });
      byDdt.set(v.ddtF, group);
    }
    expect(byDdt.size, 'both DDT bands are represented').toBe(2);

    for (const [ddtF, group] of byDdt) {
      const sorted = [...group].sort((a, b) => a.perMixBalls - b.perMixBalls);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!;
        const cur = sorted[i]!;
        if (cur.perMixBalls === prev.perMixBalls) {
          expect(cur.waterTempF, `equal mixes at DDT ${ddtF}`).toBeCloseTo(prev.waterTempF, 1);
        } else {
          expect(cur.waterTempF, `mix growth at DDT ${ddtF}`).toBeLessThan(prev.waterTempF);
        }
      }
    }
  });
});

describe('constants', () => {
  it('derives C_BIGA to the value quoted in §3', () => {
    within(C.C_BIGA, 0.6133, 0.00005, 'C_BIGA');
  });

  it('has DOUGH_YIELD consistent with hydration and salt', () => {
    within(C.DOUGH_YIELD, 1 + C.HYDRATION + C.SALT, 1e-10, 'DOUGH_YIELD');
  });

  it('gives the bowl a heat capacity of 115.8 at the 965 g default', () => {
    within(C.DEFAULT_BOWL_MASS_G * C.C_BOWL_SPECIFIC_HEAT, 115.8, 0.05, 'C_bowl');
  });

  it('maps 5% dial to the measured 60 RPM', () => {
    within(C.RPM_INTERCEPT + C.RPM_SLOPE * 5, 60, 0.05, '5% dial RPM');
  });

  it('has dough-only thermal weights summing to 1', () => {
    within(Object.values(THERMAL_WEIGHTS).reduce((a: number, b: number) => a + b, 0), 1, 0.0005, 'weight sum');
  });
});
