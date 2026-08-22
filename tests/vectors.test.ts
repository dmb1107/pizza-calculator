import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { BATCH_VECTORS, ICE_EFF_VECTORS, THERMAL_WEIGHTS, TOL } from './vectors';

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
    for (const v of BATCH_VECTORS) {
      const ct =
        (v.bigaFlour + v.bigaWater) * C.C_BIGA +
        v.freshFlour * C.C_FLOUR +
        v.freshWater * C.C_WATER +
        v.salt * C.C_SALT;
      // Built from already-rounded gram figures, so allow a little slack.
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

  it('shows the water temperature falling as the batch grows', () => {
    // Not a formula check — a shape check. With the bowl in the model the
    // answer is no longer scale-independent, and bigger batches dilute the
    // bowl's fixed contribution, so they need colder water at the same DDT.
    const at265 = BATCH_VECTORS.filter((v) => v.ballG === 265);
    for (let i = 1; i < at265.length; i++) {
      expect(at265[i]!.waterTempF).toBeLessThan(at265[i - 1]!.waterTempF);
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

  it('expresses the latent heat of fusion as 144 degF of liquid-water equivalent', () => {
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

  it('has dough-only thermal weights summing to 1', () => {
    within(Object.values(THERMAL_WEIGHTS).reduce((a, b) => a + b, 0), 1, 0.0005, 'weight sum');
  });
});
