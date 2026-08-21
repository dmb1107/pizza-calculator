import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import {
  calculate,
  computeCapacity,
  computeFormula,
  computeIce,
  computeProbeTargetF,
  computeThermal,
  computeWaterTempF,
  type CalculatorInputs,
} from '../src/lib/engine';
import {
  BATCH_VECTORS,
  ICE_EFF_VECTORS,
  ICE_PER_100G,
  THERMAL_WEIGHTS,
  TOL,
  VECTOR_CONDITIONS,
  WATER_TEMP_VECTORS,
} from './vectors';

/**
 * Engine acceptance tests — WEBSITE-SPEC-biga-calculator.md §5.
 *
 * "Assert against these exactly (tolerance ±0.1 g, ±0.1 °F). Generated from a
 * verified reference implementation."
 *
 * Spec §12 build order: get this green before writing any UI.
 */

function within(actual: number, expected: number, tol: number, what: string): void {
  const diff = Math.abs(actual - expected);
  expect(
    diff <= tol + 1e-9,
    `${what}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)} +/-${tol} (off by ${diff.toFixed(4)})`,
  ).toBe(true);
}

/** The §5 row conditions, as engine inputs. */
function vectorInputs(balls: number, ballWeightG: number): CalculatorInputs {
  return {
    balls,
    ballWeightG,
    roomTempF: VECTOR_CONDITIONS.tRoomF,
    flourTempF: VECTOR_CONDITIONS.tFlourF,
    bigaTempF: VECTOR_CONDITIONS.tBigaF,
    tapTempF: VECTOR_CONDITIONS.tapF,
    freezerTempF: VECTOR_CONDITIONS.freezerF,
    frictionFactorF: VECTOR_CONDITIONS.ff,
  };
}

// ---------------------------------------------------------------------------

describe('§5 batch vectors', () => {
  it.each(BATCH_VECTORS)('$balls balls x $ballG g', (v) => {
    const r = calculate(vectorInputs(v.balls, v.ballG));

    within(r.formula.flourTotal, v.F, TOL.grams, 'total flour');
    within(r.formula.bigaFlour, v.bigaFlour, TOL.grams, 'biga flour');
    within(r.formula.bigaWater, v.bigaWater, TOL.grams, 'biga water');
    within(r.formula.bigaADY, v.bigaADY, TOL.ady, 'biga ADY');
    within(r.formula.freshFlour, v.freshFlour, TOL.grams, 'fresh flour');
    within(r.formula.freshWater, v.freshWater, TOL.grams, 'fresh water');
    within(r.formula.salt, v.salt, TOL.grams, 'salt');
    within(r.formula.doughTotal, v.doughTotal, TOL.grams, 'dough total');

    expect(r.capacity.nBiga, 'nBiga').toBe(v.nBiga);
    expect(r.capacity.nMix, 'nMix').toBe(v.nMix);

    within(r.waterTempF, v.waterTempF, TOL.degF, 'water temp');
    within(r.ice.iceG, v.iceG, TOL.grams, 'ice');
    within(r.ice.tapG, v.tapG, TOL.grams, 'tap water');
  });
});

describe('§5 water temperature under varied conditions (9 balls x 265 g)', () => {
  it.each(WATER_TEMP_VECTORS)(
    'DDT $ddtF / FF $ff / biga $tBigaF / room $tRoomF -> $waterTempF degF',
    (v) => {
      const r = calculate({
        ...vectorInputs(9, 265),
        ddtOverrideF: v.ddtF,
        frictionFactorF: v.ff,
        bigaTempF: v.tBigaF,
        // §5: these rows vary room temp, with flour tracking it.
        flourTempF: v.tRoomF,
        roomTempF: v.tRoomF,
      });
      within(r.waterTempF, v.waterTempF, TOL.degF, 'water temp');
    },
  );

  it('requires WARM water for a fridge-retarded biga', () => {
    // The row the spec calls out: "If the UI can't express that, it is wrong."
    const r = calculate({
      ...vectorInputs(9, 265),
      ddtOverrideF: 74,
      frictionFactorF: 12,
      bigaTempF: 42,
    });
    within(r.waterTempF, 90.6, TOL.degF, 'water temp');
    expect(r.waterTempF).toBeGreaterThan(VECTOR_CONDITIONS.tapF);
    expect(r.ice.status).toBe('warm-water');
    expect(r.ice.iceG).toBe(0);
    within(r.ice.warmToF ?? 0, 90.6, TOL.degF, 'warm-to target');
    expect(r.warnings.map((w) => w.id)).toContain('warm-water');
  });
});

describe('§4.2 thermal weights', () => {
  it('matches the spec values', () => {
    const t = computeThermal(computeFormula({ balls: 9, ballWeightG: 265 }));
    within(t.weights.biga, THERMAL_WEIGHTS.biga, TOL.weight, 'biga weight');
    within(t.weights.flour, THERMAL_WEIGHTS.flour, TOL.weight, 'flour weight');
    within(t.weights.water, THERMAL_WEIGHTS.water, TOL.weight, 'water weight');
    within(t.weights.salt, THERMAL_WEIGHTS.salt, TOL.weight, 'salt weight');
  });

  it('is identical at every batch size and ball weight', () => {
    const reference = computeThermal(computeFormula({ balls: 3, ballWeightG: 265 })).weights;
    for (const { balls, ballG } of BATCH_VECTORS) {
      const w = computeThermal(computeFormula({ balls, ballWeightG: ballG })).weights;
      // Scale-invariance is exact, not approximate — every mass scales with flour.
      within(w.biga, reference.biga, 1e-12, `biga weight at ${balls}x${ballG}`);
      within(w.flour, reference.flour, 1e-12, `flour weight at ${balls}x${ballG}`);
      within(w.water, reference.water, 1e-12, `water weight at ${balls}x${ballG}`);
      within(w.salt, reference.salt, 1e-12, `salt weight at ${balls}x${ballG}`);
    }
  });

  it('sums to the total heat capacity', () => {
    const t = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }));
    within(t.cBiga + t.cFreshFlour + t.cFreshWater + t.cSalt, t.cTotal, 1e-9, 'component sum');
  });

  it('makes the water temperature scale-independent', () => {
    // §8.3 thermal-model: "identical for 3, 6, 9, 12 or 18 balls".
    const args = { ddtF: 74, frictionFactorF: 14, bigaTempF: 64, flourTempF: 70, roomTempF: 70 };
    const temps = BATCH_VECTORS.map(({ balls, ballG }) =>
      computeWaterTempF(args, computeThermal(computeFormula({ balls, ballWeightG: ballG }))),
    );
    for (const t of temps) within(t, temps[0] as number, 1e-9, 'water temp across batch sizes');
  });
});

describe('§4.3 temperature terms', () => {
  it('holds the salt at room temperature, independent of the flour', () => {
    // §4.3 has Cf x T_flour and Cs x T_room as separate terms. They coincide
    // whenever the "flour same as room" toggle is on, so this pins them apart:
    // moving the room alone must still move the answer, through the salt term.
    const base = { ...vectorInputs(9, 265), flourTempF: 60 };
    const cool = calculate({ ...base, roomTempF: 60 });
    const warm = calculate({ ...base, roomTempF: 80 });

    const { weights } = cool.thermal;
    const expectedShift = (-weights.salt / weights.water) * 20;
    within(warm.waterTempF - cool.waterTempF, expectedShift, 1e-9, 'salt term contribution');
    // Small, but real: a 20 degF swing is worth about a third of a degree.
    expect(Math.abs(warm.waterTempF - cool.waterTempF)).toBeGreaterThan(0.3);
  });

  it('tracks the flour temperature separately from the room', () => {
    const base = { ...vectorInputs(9, 265), roomTempF: 70 };
    const cool = calculate({ ...base, flourTempF: 60 });
    const warm = calculate({ ...base, flourTempF: 80 });

    const { weights } = cool.thermal;
    const expectedShift = (-weights.flour / weights.water) * 20;
    within(warm.waterTempF - cool.waterTempF, expectedShift, 1e-9, 'flour term contribution');
  });

  it('makes the biga the dominant lever', () => {
    // §8.3 thermal-model: the biga's thermal mass is a more powerful control
    // than ice. One degree of biga moves the water more than one of anything else.
    const { weights } = calculate(vectorInputs(9, 265)).thermal;
    expect(weights.biga).toBeGreaterThan(weights.flour + weights.salt);
    expect(weights.biga).toBeGreaterThan(weights.water);
  });
});

describe('§4.4 ice', () => {
  it.each(ICE_EFF_VECTORS)('freezer $freezerF degF -> $iceEffF degF effective', (v) => {
    const r = computeIce({
      waterTempF: 50,
      freshWater: 100,
      tapTempF: 60,
      freezerTempF: v.freezerF,
    });
    within(r.iceEffF, v.iceEffF, 1e-9, 'ice effective temp');
  });

  it.each(ICE_PER_100G)(
    '§9 table: 100 g water to $waterTempF degF needs $iceG g ice',
    ({ waterTempF, iceG }) => {
      const r = computeIce({ waterTempF, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
      within(r.iceG, iceG, TOL.grams, 'ice');
      within(r.tapG, 100 - iceG, TOL.grams, 'tap');
    },
  );

  it('uses no ice when the target is at tap temperature', () => {
    const r = computeIce({ waterTempF: 60, freshWater: 500, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('none');
    expect(r.iceG).toBe(0);
    expect(r.tapG).toBe(500);
  });

  it('stays on plain tap water within 0.5 degF above tap', () => {
    const r = computeIce({ waterTempF: 60.4, freshWater: 500, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('none');
    expect(r.warmToF).toBeUndefined();
  });

  it('says warm the water past 0.5 degF above tap', () => {
    const r = computeIce({ waterTempF: 60.6, freshWater: 500, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('warm-water');
    expect(r.iceG).toBe(0);
    within(r.warmToF ?? 0, 60.6, 1e-9, 'warm-to target');
  });

  it('warns above 35% ice', () => {
    // 35% of 180 degF span is 63 degF below tap.
    const below = computeIce({ waterTempF: 60 - 62, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    expect(below.status).toBe('ok');
    const above = computeIce({ waterTempF: 60 - 64, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    expect(above.status).toBe('excessive');
    expect(above.iceFraction).toBeGreaterThan(0.35);
  });

  it('reports unreachable below the effective ice temperature', () => {
    const r = computeIce({ waterTempF: -130, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('unreachable');
    expect(r.iceRequiredG).toBeGreaterThan(100);
    // Display figures stay physical even when the requirement isn't.
    expect(r.iceG).toBe(100);
    expect(r.tapG).toBe(0);
  });

  it('always splits the fresh water exactly', () => {
    for (const v of BATCH_VECTORS) {
      const r = calculate(vectorInputs(v.balls, v.ballG));
      within(r.ice.iceG + r.ice.tapG, r.formula.freshWater, 1e-9, 'ice + tap = fresh water');
    }
  });
});

describe('§4.5 capacity', () => {
  it('flags the 12-ball case as one biga across two mixes', () => {
    const c = computeCapacity(computeFormula({ balls: 12, ballWeightG: 265 }));
    expect(c.nBiga).toBe(1);
    expect(c.nMix).toBe(2);
    expect(c.divideBigaAcrossMixes).toBe(true);
  });

  it('splits the biga at 18 balls', () => {
    const c = computeCapacity(computeFormula({ balls: 18, ballWeightG: 265 }));
    expect(c.nBiga).toBe(2);
    expect(c.nMix).toBe(2);
    expect(c.divideBigaAcrossMixes).toBe(false);
  });

  it('warns below the mixer minimum', () => {
    // 1 ball x 265 g -> ~271 g of dough, under the 500 g the mixer can grip.
    const r = calculate(vectorInputs(1, 265));
    expect(r.capacity.belowMixerMinimum).toBe(true);
    expect(r.warnings.map((w) => w.id)).toContain('below-minimum');
  });

  it('warns when a final mix is within 5% of the ceiling', () => {
    const r = calculate(vectorInputs(9, 265));
    expect(r.capacity.doughPerMix).toBeGreaterThanOrEqual(0.95 * C.MAX_DOUGH);
    expect(r.capacity.tightFinalMix).toBe(true);
    expect(r.warnings.map((w) => w.id)).toContain('tight-mix');
  });

  /**
   * §4.5 takes max(doughTotal / MAX_DOUGH, F / FLOUR_CAP_66) for nMix. Under
   * the current constants the first term always wins: the 2500 g dough ceiling
   * implies 2500 / 1.728 = 1446.8 g of flour, below the 1505 g flour cap. The
   * flour term is therefore unreachable at 70% hydration and no input can
   * exercise it — swapping FLOUR_CAP_66 for FLOUR_CAP_55 changes no result.
   *
   * This is asserted rather than removed. The max() is correct defensive form,
   * and the term becomes live if MAX_DOUGH, DOUGH_YIELD or HYDRATION move. When
   * that happens this test fails and tells the reader why.
   */
  it('documents which capacity term actually binds', () => {
    // Final mix: dough mass binds, flour cap is the dormant safety net.
    expect(C.MAX_DOUGH / C.DOUGH_YIELD).toBeLessThan(C.FLOUR_CAP_66);
    // Biga at 50% hydration: flour cap binds, dough mass is the safety net.
    expect(C.FLOUR_CAP_55).toBeLessThan(C.MAX_DOUGH / (1 + C.BIGA_HYDRATION));
  });

  it('drives nBiga off the flour cap, not the dough ceiling', () => {
    // At 18 balls both terms exceed their limits, so that case can't isolate
    // the flour cap. 16 x 265 g can: 1630.0 g of biga flour is over the 1610 g
    // cap while its 2445.0 g mass stays under the 2500 g ceiling, so the split
    // is attributable to the flour cap alone.
    const f = computeFormula({ balls: 16, ballWeightG: 265 });
    expect(f.bigaFlour).toBeGreaterThan(C.FLOUR_CAP_55);
    expect(f.bigaMass).toBeLessThan(C.MAX_DOUGH);
    expect(computeCapacity(f).nBiga).toBe(2);
  });

  it('uses the 55% flour cap for the biga, not the 66% one', () => {
    // 15 x 265 g puts 1528.1 g of biga flour between the two caps: under the
    // 1610 g cap that applies at 50% hydration (one batch), but over the
    // 1505 g cap that applies to the wetter final mix (which would give two).
    // Its 2292.2 g mass is clear of the dough ceiling, so only the cap decides.
    const f = computeFormula({ balls: 15, ballWeightG: 265 });
    expect(f.bigaFlour).toBeGreaterThan(C.FLOUR_CAP_66);
    expect(f.bigaFlour).toBeLessThan(C.FLOUR_CAP_55);
    expect(f.bigaMass).toBeLessThan(C.MAX_DOUGH);
    expect(computeCapacity(f).nBiga).toBe(1);
  });

  it('never returns a mix over the ceiling or a flour load over the cap', () => {
    for (let balls = 1; balls <= 24; balls++) {
      const f = computeFormula({ balls, ballWeightG: 265 });
      const c = computeCapacity(f);
      expect(c.doughPerMix, `dough per mix at ${balls} balls`).toBeLessThanOrEqual(C.MAX_DOUGH + 1e-9);
      expect(f.flourTotal / c.nMix, `flour per mix at ${balls} balls`).toBeLessThanOrEqual(
        C.FLOUR_CAP_66 + 1e-9,
      );
      expect(c.bigaFlourPerBatch, `biga flour per batch at ${balls} balls`).toBeLessThanOrEqual(
        C.FLOUR_CAP_55 + 1e-9,
      );
      expect(c.bigaMassPerBatch, `biga mass per batch at ${balls} balls`).toBeLessThanOrEqual(
        C.MAX_DOUGH + 1e-9,
      );
    }
  });
});

describe('§4.6 probe target', () => {
  it('sits about 4 degF below DDT at the default friction factor', () => {
    const p = computeProbeTargetF({ ddtF: 74, frictionFactorF: 14, balls: 9 });
    within(p, 74 - 0.33 * 14 + 1, 1e-9, 'probe target');
    within(74 - p, 3.62, 0.01, 'gap below DDT');
  });

  it('adds a degree for batches of 3 or fewer', () => {
    const small = computeProbeTargetF({ ddtF: 75, frictionFactorF: 14, balls: 3 });
    const large = computeProbeTargetF({ ddtF: 75, frictionFactorF: 14, balls: 4 });
    within(small - large, 1, 1e-9, 'small batch bonus');
  });
});

describe('§4.3 DDT defaults', () => {
  it('uses 75 degF up to 6 balls and 74 degF from 7', () => {
    expect(calculate(vectorInputs(6, 265)).ddtF).toBe(75);
    expect(calculate(vectorInputs(7, 265)).ddtF).toBe(74);
  });

  it('honours an override', () => {
    expect(calculate({ ...vectorInputs(6, 265), ddtOverrideF: 72 }).ddtF).toBe(72);
  });
});

describe('invariants hold at every batch size', () => {
  const sizes = [1, 3, 6, 9, 12, 18, 24];
  const weights = [240, 250, 265, 280, 300];

  it('holds hydration, salt and biga fraction exactly', () => {
    for (const balls of sizes) {
      for (const ballWeightG of weights) {
        const f = computeFormula({ balls, ballWeightG });
        const label = `${balls}x${ballWeightG}`;
        within((f.bigaWater + f.freshWater) / f.flourTotal, C.HYDRATION, 1e-12, `hydration ${label}`);
        within(f.salt / f.flourTotal, C.SALT, 1e-12, `salt ${label}`);
        within(f.bigaFlour / f.flourTotal, C.BIGA_FRACTION, 1e-12, `biga fraction ${label}`);
        within(f.bigaWater / f.bigaFlour, C.BIGA_HYDRATION, 1e-12, `biga hydration ${label}`);

        // "Sum of all components ≈ doughTotal (+ ADY, ~0.1%)"
        const sum = f.bigaFlour + f.bigaWater + f.freshFlour + f.freshWater + f.salt;
        within(sum, f.doughTotal, 1e-9, `component sum ${label}`);
        // The ADY sits on top and is about 0.1% of the dough.
        expect(f.bigaADY / f.doughTotal).toBeLessThan(0.002);

        // Bassinage split accounts for all the fresh water.
        within(f.freshWater60 + f.freshWater40, f.freshWater, 1e-9, `bassinage split ${label}`);
      }
    }
  });

  it('delivers the requested dough weight plus overage', () => {
    for (const balls of sizes) {
      for (const ballWeightG of weights) {
        const f = computeFormula({ balls, ballWeightG });
        within(
          f.doughTotal,
          balls * ballWeightG * C.OVERAGE,
          1e-9,
          `dough total ${balls}x${ballWeightG}`,
        );
        // The overage is scrap margin: always more than the balls need.
        expect(f.doughTotal).toBeGreaterThan(balls * ballWeightG);
      }
    }
  });
});

describe('engine purity', () => {
  it('does not round intermediates', () => {
    // A rounded intermediate would quantise the output; a 0.01 degF nudge to an
    // input must move the answer.
    const base = calculate(vectorInputs(9, 265));
    const nudged = calculate({ ...vectorInputs(9, 265), bigaTempF: 64.01 });
    expect(nudged.waterTempF).not.toBe(base.waterTempF);
    expect(Math.abs(nudged.waterTempF - base.waterTempF)).toBeLessThan(0.1);
  });

  it('does not mutate its inputs', () => {
    const inputs = vectorInputs(9, 265);
    const snapshot = structuredClone(inputs);
    calculate(inputs);
    expect(inputs).toEqual(snapshot);
  });
});
