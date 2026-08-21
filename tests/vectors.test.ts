import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { BATCH_VECTORS, ICE_EFF_VECTORS, THERMAL_WEIGHTS, TOL } from './vectors';

/**
 * These tests validate the TRANSCRIPTION of spec §5, not the engine.
 *
 * The vectors are the engine's acceptance criteria, so a typo in the table
 * would silently redefine "correct". Checking the table against the spec's
 * own stated invariants catches that before any engine code exists.
 *
 * The engine's own suite lands in tests/engine.test.ts (plan Task 1).
 *
 * Note on tolerances: §5 is a DISPLAY table — every gram figure is already
 * rounded to 1 decimal. Summing n of them admits up to n * 0.05 g of
 * accumulated rounding, which is why the sum checks below carry a wider
 * tolerance than the +/-0.1 g the spec quotes for a single value. Ratio
 * checks are correspondingly loosened by the rounding of their operands.
 */

/** Assert |actual - expected| <= tol, with a message that shows the miss. */
function within(actual: number, expected: number, tol: number, what: string): void {
  const diff = Math.abs(actual - expected);
  expect(
    diff <= tol + 1e-9,
    `${what}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)} +/-${tol} (off by ${diff.toFixed(4)})`,
  ).toBe(true);
}

describe('spec §5 test vectors are internally consistent', () => {
  it.each(BATCH_VECTORS)('$balls balls x $ballG g satisfies the §5 invariants', (v) => {
    // "(bigaWater + freshWater) / F = 0.700"
    within((v.bigaWater + v.freshWater) / v.F, C.HYDRATION, 0.0005, 'hydration');
    // "salt / F = 0.028"
    within(v.salt / v.F, C.SALT, 0.0005, 'salt fraction');
    // "bigaFlour / F = 0.650"
    within(v.bigaFlour / v.F, C.BIGA_FRACTION, 0.0005, 'biga fraction');
    // biga is 50% hydration internally
    within(v.bigaWater / v.bigaFlour, C.BIGA_HYDRATION, 0.0005, 'biga hydration');
    // ADY is 0.38% of biga flour
    within(v.bigaADY / v.bigaFlour, C.ADY_OF_BIGA_FLOUR, 0.00002, 'ADY fraction');
    // flour splits exactly into biga + fresh
    within(v.bigaFlour + v.freshFlour, v.F, 0.15, 'bigaFlour + freshFlour = F');
    // "Sum of all components ≈ doughTotal (+ ADY, ~0.1%)"
    const sum = v.bigaFlour + v.bigaWater + v.freshFlour + v.freshWater + v.salt;
    within(sum, v.doughTotal, 0.3, 'component sum = doughTotal');
    // dough yield holds
    within(v.doughTotal / v.F, C.DOUGH_YIELD, 0.0005, 'dough yield');
    // ice + tap accounts for all the fresh water
    within(v.iceG + v.tapG, v.freshWater, 0.15, 'ice + tap = freshWater');
  });

  it('derives total flour from balls, ball weight and overage', () => {
    for (const v of BATCH_VECTORS) {
      const expected = (v.balls * v.ballG * C.OVERAGE) / C.DOUGH_YIELD;
      within(v.F, expected, TOL.grams, `F for ${v.balls}x${v.ballG}`);
    }
  });

  it('uses the default DDT rule: 75 degF for <=6 balls, 74 degF for 7+', () => {
    // A distinct DDT shows up as a distinct water temperature under identical conditions.
    const small = BATCH_VECTORS.filter((v) => v.balls <= 6).map((v) => v.waterTempF);
    const large = BATCH_VECTORS.filter((v) => v.balls >= 7).map((v) => v.waterTempF);
    expect(new Set(small)).toEqual(new Set([52.5]));
    expect(new Set(large)).toEqual(new Set([49.5]));
    // 1 degF of DDT moves the water temp by 1 / 0.3331 = ~3 degF.
    within(52.5 - 49.5, 1 / THERMAL_WEIGHTS.water, 0.05, 'DDT sensitivity');
  });

  it('splits capacity per the §4.5 rules', () => {
    for (const v of BATCH_VECTORS) {
      const bigaMass = v.bigaFlour + v.bigaWater;
      const nMix = Math.max(1, Math.ceil(Math.max(v.doughTotal / C.MAX_DOUGH, v.F / C.FLOUR_CAP_66)));
      const nBiga = Math.max(1, Math.ceil(Math.max(v.bigaFlour / C.FLOUR_CAP_55, bigaMass / C.MAX_DOUGH)));
      expect(nMix, `nMix for ${v.balls} balls`).toBe(v.nMix);
      expect(nBiga, `nBiga for ${v.balls} balls`).toBe(v.nBiga);
    }
  });

  it('covers the nBiga < nMix case that the UI has to explain', () => {
    // 12 balls: one biga, divided by weight into two final mixes.
    const twelve = BATCH_VECTORS.find((v) => v.balls === 12);
    expect(twelve?.nBiga).toBe(1);
    expect(twelve?.nMix).toBe(2);
  });
});

describe('constants', () => {
  it('derives C_BIGA to the value quoted in §3', () => {
    within(C.C_BIGA, 0.6133, 0.00005, 'C_BIGA');
  });

  it('has DOUGH_YIELD consistent with hydration and salt', () => {
    within(C.DOUGH_YIELD, 1 + C.HYDRATION + C.SALT, 1e-10, 'DOUGH_YIELD');
  });

  it('expresses the latent heat of fusion as 144 degF of liquid-water equivalent', () => {
    // 80 cal/g / 1.00 cal/g·degC = 80 degC = 144 degF
    expect(C.LATENT_F).toBe(80 * 1.8);
  });

  it('maps 5% dial to the measured 60 RPM', () => {
    within(C.RPM_INTERCEPT + C.RPM_SLOPE * 5, 60, 0.05, '5% dial RPM');
  });

  it('agrees with the §5 ice effective temperatures', () => {
    for (const { freezerF, iceEffF } of ICE_EFF_VECTORS) {
      within(-112 - C.C_ICE * (32 - freezerF), iceEffF, 1e-9, `ice eff at ${freezerF} degF`);
    }
  });

  it('has thermal weights summing to 1', () => {
    const sum = Object.values(THERMAL_WEIGHTS).reduce((a, b) => a + b, 0);
    within(sum, 1, 0.0005, 'thermal weight sum');
  });
});
