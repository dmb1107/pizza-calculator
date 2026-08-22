import { describe, expect, it } from 'vitest';
import { C, bowlHeatCapacity } from '../src/lib/constants';
import {
  calculate,
  computeCapacity,
  computeFinalTempF,
  computeFormula,
  computeIce,
  computeProbeTargetF,
  computeRoomMinutes,
  computeThermal,
  computeWaterTempF,
  solveFrictionFactorF,
  type CalculatorInputs,
} from '../src/lib/engine';
import {
  BAKE_1,
  BATCH_VECTORS,
  BOWL_DILUTION,
  ICE_EFF_VECTORS,
  ICE_PER_100G,
  ROOM_MINUTES,
  THERMAL_WEIGHTS,
  TOL,
  VECTOR_CONDITIONS,
} from './vectors';

/**
 * Engine acceptance tests — WEBSITE-SPEC-biga-calculator.md §5.
 *
 * §12: "The bowl term and the `FF × Ct` work term are the two places this goes
 * wrong silently." Both have dedicated tests below.
 */

function within(actual: number, expected: number, tol: number, what: string): void {
  const diff = Math.abs(actual - expected);
  expect(
    diff <= tol + 1e-9,
    `${what}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)} +/-${tol} (off by ${diff.toFixed(4)})`,
  ).toBe(true);
}

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
    bowlMassG: VECTOR_CONDITIONS.bowlMassG,
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
    within(r.formula.phaseAWater, v.phaseA, TOL.grams, 'Phase A water');
    within(r.formula.phaseBWater, v.phaseB, TOL.grams, 'Phase B water');
    within(r.formula.salt, v.salt, TOL.grams, 'salt');

    within(r.thermal.cTotal, v.Ct, 0.5, 'Ct (dough only)');
    expect(r.ddtF, 'DDT').toBe(v.ddtF);
    within(r.waterTempF, v.waterTempF, TOL.degF, 'water temp');
    within(r.probeTargetF, v.probeTargetF, TOL.degF, 'probe target');

    expect(r.capacity.nBiga, 'nBiga').toBe(v.nBiga);
    expect(r.capacity.nMix, 'nMix').toBe(v.nMix);
  });
});

describe('bake 1 regression — 21 Aug 2026', () => {
  const inputs: CalculatorInputs = {
    balls: BAKE_1.balls,
    ballWeightG: BAKE_1.ballG,
    roomTempF: BAKE_1.tRoomF,
    flourTempF: BAKE_1.tFlourF,
    bigaTempF: BAKE_1.tBigaF,
    tapTempF: 60,
    freezerTempF: 16,
    frictionFactorF: BAKE_1.ff,
    bowlMassG: BAKE_1.bowlMassG,
  };
  const formula = computeFormula(inputs);
  const thermal = computeThermal(formula, BAKE_1.bowlMassG);
  const temps = {
    ddtF: BAKE_1.ddtF,
    frictionFactorF: BAKE_1.ff,
    bigaTempF: BAKE_1.tBigaF,
    flourTempF: BAKE_1.tFlourF,
    roomTempF: BAKE_1.tRoomF,
  };

  it('predicts the 73.5 degF the dough actually finished at', () => {
    // If this fails, the bowl term is wired wrong.
    within(computeFinalTempF(temps, thermal, BAKE_1.waterUsedF), BAKE_1.finalTempF, TOL.degF, 'final temp');
  });

  it('says the water should have been 67.97 degF, not the 63.0 used', () => {
    within(computeWaterTempF(temps, thermal), BAKE_1.waterRequiredF, TOL.degF, 'required water');
  });

  it('accounts for the miss exactly: 5 degF of water x water’s share of the system', () => {
    const shortfall = BAKE_1.waterRequiredF - BAKE_1.waterUsedF;
    const waterShare = thermal.cFreshWater / thermal.cSystem;
    within(shortfall * waterShare, BAKE_1.ddtF - BAKE_1.finalTempF, 0.05, 'temperature shortfall');
  });

  it('recovers FF = 14.04 from the measured bake', () => {
    // The same solve the bake log uses. `final − predicted_mix` omits the bowl
    // and would understate FF by 1.5–2.5 degF.
    const ff = solveFrictionFactorF(
      { bigaTempF: BAKE_1.tBigaF, flourTempF: BAKE_1.tFlourF, roomTempF: BAKE_1.tRoomF },
      thermal,
      { waterTempF: BAKE_1.waterUsedF, finalTempF: BAKE_1.finalTempF },
    );
    within(ff, BAKE_1.ff, 0.02, 'solved FF');
  });

  it('is about 5 degF away from what the superseded bowl-free model said', () => {
    // The old model reconstructed by zeroing the bowl. §4.3: "Omitting the bowl
    // made this output 5 °F wrong on the first real bake."
    const bowlFree = computeWaterTempF(temps, computeThermal(formula, 0));
    const gap = computeWaterTempF(temps, thermal) - bowlFree;
    expect(gap).toBeGreaterThan(5);
    expect(gap).toBeLessThan(6);
  });
});

describe('§4.3 the three formulas round-trip', () => {
  it('waterTempF fed into finalTempF returns DDT exactly, at every batch size', () => {
    for (const v of BATCH_VECTORS) {
      const inputs = vectorInputs(v.balls, v.ballG);
      const thermal = computeThermal(computeFormula(inputs), VECTOR_CONDITIONS.bowlMassG);
      const temps = {
        ddtF: v.ddtF,
        frictionFactorF: VECTOR_CONDITIONS.ff,
        bigaTempF: VECTOR_CONDITIONS.tBigaF,
        flourTempF: VECTOR_CONDITIONS.tFlourF,
        roomTempF: VECTOR_CONDITIONS.tRoomF,
      };
      const water = computeWaterTempF(temps, thermal);
      within(computeFinalTempF(temps, thermal, water), v.ddtF, 1e-9, `round-trip at ${v.balls} balls`);
    }
  });

  it('solving for FF recovers the FF that produced the temperature', () => {
    for (const v of BATCH_VECTORS) {
      const inputs = vectorInputs(v.balls, v.ballG);
      const thermal = computeThermal(computeFormula(inputs), VECTOR_CONDITIONS.bowlMassG);
      const temps = {
        ddtF: v.ddtF,
        frictionFactorF: VECTOR_CONDITIONS.ff,
        bigaTempF: VECTOR_CONDITIONS.tBigaF,
        flourTempF: VECTOR_CONDITIONS.tFlourF,
        roomTempF: VECTOR_CONDITIONS.tRoomF,
      };
      const water = computeWaterTempF(temps, thermal);
      const ff = solveFrictionFactorF(
        { bigaTempF: temps.bigaTempF, flourTempF: temps.flourTempF, roomTempF: temps.roomTempF },
        thermal,
        { waterTempF: water, finalTempF: v.ddtF },
      );
      within(ff, VECTOR_CONDITIONS.ff, 1e-9, `solved FF at ${v.balls} balls`);
    }
  });
});

describe('§4.2 the bowl', () => {
  it('contributes 115.8 at the 965 g default', () => {
    const t = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }), 965);
    within(t.cBowl, 115.8, 0.05, 'C_bowl');
  });

  it('outweighs the fresh flour only up to about 5 balls', () => {
    // §8.3 thermal-model says the bowl contributes "more than the fresh flour
    // does". That holds at small batches and stops at 6 — the crossover is
    // almost exactly 5 balls, because the flour scales and the bowl does not.
    const cf = (balls: number) =>
      computeThermal(computeFormula({ balls, ballWeightG: 265 }), 965).cFreshFlour;
    expect(cf(5)).toBeLessThan(115.8);
    expect(cf(6)).toBeGreaterThan(115.8);
  });

  it.each(BOWL_DILUTION)('dilutes FF 14 to $apparentFF degF at $balls balls', (d) => {
    const t = computeThermal(computeFormula({ balls: d.balls, ballWeightG: 265 }), 965);
    within(t.bowlShare, d.bowlShare, 0.002, `bowl share at ${d.balls} balls`);
    within(14 * (t.cTotal / t.cSystem), d.apparentFF, 0.05, `apparent FF at ${d.balls} balls`);
  });

  it('defaults T_bowl to T_biga', () => {
    const inputs = vectorInputs(6, 265);
    const explicit = calculate({ ...inputs, bowlTempF: VECTOR_CONDITIONS.tBigaF });
    within(calculate(inputs).waterTempF, explicit.waterTempF, 1e-9, 'implicit vs explicit T_bowl');
  });

  /**
   * §4.2 states bowl-temperature sensitivity as the coefficient
   * `C_bowl / TOT` rather than either endpoint, because the two figures that
   * previously appeared in the docs (−0.3 °F and 2.0 °F) are the same
   * coefficient applied to different inputs and looked irreconcilable quoted
   * on their own.
   *
   * Asserting the coefficient is what makes the "no measurement needed"
   * argument properly: even a 10 °F misestimate costs under 1 °F at 6 balls.
   */
  it.each([
    [3, 0.18],
    [6, 0.10],
    [9, 0.07],
  ])('has a bowl-temperature sensitivity of %s balls -> %s degF per degF', (balls, coefficient) => {
    const t = computeThermal(computeFormula({ balls, ballWeightG: 265 }), 965);
    within(t.cBowl / t.cSystem, coefficient, 0.005, `sensitivity at ${balls} balls`);
  });

  it('makes a bowl-temperature measurement unnecessary', () => {
    const t = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }), 965);
    const perDegree = t.cBowl / t.cSystem;
    // The claim §4.2 rests on: a 10 degF misestimate of T_bowl costs under 1 degF.
    expect(10 * perDegree).toBeLessThan(1);
    // And the two figures the docs previously quoted, from that one coefficient.
    within(3 * perDegree, 0.3, 0.02, 'a 3 degF assumption error');
    within(20 * perDegree, 2.0, 0.05, 'a 20 degF cold-vs-room bowl');
  });

  it('makes a heavier bowl need warmer water', () => {
    const inputs = vectorInputs(6, 265);
    const light = calculate({ ...inputs, bowlMassG: 500 }).waterTempF;
    const heavy = calculate({ ...inputs, bowlMassG: 1500 }).waterTempF;
    // A cold bowl of greater mass pulls more heat out, so the water compensates.
    expect(heavy).toBeGreaterThan(light);
  });

  it('reduces to the bowl-free model at zero bowl mass', () => {
    const t = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }), 0);
    expect(t.cBowl).toBe(0);
    expect(t.cSystem).toBe(t.cTotal);
    expect(t.bowlShare).toBe(0);
  });
});

describe('§4.3 the FF x Ct trap', () => {
  it('uses the dough-only heat capacity for the work term', () => {
    // Reversing this returns a plausible-looking answer several degrees wrong,
    // so the test asserts the arithmetic directly rather than trusting the code.
    const inputs = vectorInputs(6, 265);
    const t = computeThermal(computeFormula(inputs), 965);
    const temps = {
      ddtF: 75,
      frictionFactorF: 14,
      bigaTempF: 58,
      flourTempF: 69,
      roomTempF: 70,
    };
    const correct =
      (75 * t.cSystem -
        14 * t.cTotal -
        t.cBiga * 58 -
        t.cFreshFlour * 69 -
        t.cSalt * 70 -
        t.cBowl * 58) /
      t.cFreshWater;
    const wrong =
      (75 * t.cSystem -
        14 * t.cSystem - // the mistake
        t.cBiga * 58 -
        t.cFreshFlour * 69 -
        t.cSalt * 70 -
        t.cBowl * 58) /
      t.cFreshWater;

    within(computeWaterTempF(temps, t), correct, 1e-9, 'engine uses FF x Ct');
    // And confirm the mistake would be big enough to ruin a bake, not a rounding nit.
    expect(Math.abs(correct - wrong)).toBeGreaterThan(4);
  });
});

describe('§4.2 dough-only thermal weights', () => {
  it('matches the spec values', () => {
    const t = computeThermal(computeFormula({ balls: 9, ballWeightG: 265 }));
    within(t.weights.biga, THERMAL_WEIGHTS.biga, TOL.weight, 'biga weight');
    within(t.weights.flour, THERMAL_WEIGHTS.flour, TOL.weight, 'flour weight');
    within(t.weights.water, THERMAL_WEIGHTS.water, TOL.weight, 'water weight');
    within(t.weights.salt, THERMAL_WEIGHTS.salt, TOL.weight, 'salt weight');
  });

  it('is scale-invariant DOUGH-ONLY', () => {
    const reference = computeThermal(computeFormula({ balls: 3, ballWeightG: 265 })).weights;
    for (const { balls, ballG } of BATCH_VECTORS) {
      const w = computeThermal(computeFormula({ balls, ballWeightG: ballG })).weights;
      within(w.biga, reference.biga, 1e-12, `biga weight at ${balls}x${ballG}`);
      within(w.water, reference.water, 1e-12, `water weight at ${balls}x${ballG}`);
    }
  });

  /**
   * §4.2: "Any test asserting scale-invariance must be DELETED, not loosened."
   *
   * The old suite asserted the water temperature was identical at every batch
   * size. With the bowl in the model that is false, so rather than delete the
   * coverage entirely this asserts the opposite — the property that replaced it.
   */
  it('is NOT scale-invariant once the bowl is included', () => {
    const shares = BATCH_VECTORS.map(({ balls, ballG }) => {
      const t = computeThermal(computeFormula({ balls, ballWeightG: ballG }), 965);
      return t.cFreshWater / t.cSystem;
    });
    expect(new Set(shares.map((s) => s.toFixed(4))).size).toBeGreaterThan(1);
  });

  it('makes the water temperature vary with batch size', () => {
    // The old `3.00 ×` shortcut assumed this was constant. It is not, and the
    // spread is far too large to ignore.
    const temps = BATCH_VECTORS.filter((v) => v.ballG === 265).map(
      (v) => calculate({ ...vectorInputs(v.balls, v.ballG), ddtOverrideF: 75 }).waterTempF,
    );
    expect(Math.max(...temps) - Math.min(...temps)).toBeGreaterThan(5);
  });

  it('sums to the system heat capacity', () => {
    const t = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }), 965);
    within(t.cBiga + t.cFreshFlour + t.cFreshWater + t.cSalt, t.cTotal, 1e-9, 'dough sum');
    within(t.cTotal + t.cBowl, t.cSystem, 1e-9, 'system sum');
  });
});

describe('§4.8 shaped rise time', () => {
  it.each(ROOM_MINUTES)('$finalTempF degF gives $roomMin min', ({ finalTempF, roomMin }) => {
    expect(Math.round(computeRoomMinutes({ finalDoughTempF: finalTempF, ddtF: 75 }))).toBe(roomMin);
  });

  it('returns exactly the base 90 min at DDT', () => {
    for (const ddtF of [74, 75]) {
      within(computeRoomMinutes({ finalDoughTempF: ddtF, ddtF }), C.BASE_ROOM_MIN, 1e-9, `at DDT ${ddtF}`);
    }
  });

  it('gives a cold dough longer and a warm dough shorter', () => {
    const cold = computeRoomMinutes({ finalDoughTempF: 70, ddtF: 75 });
    const warm = computeRoomMinutes({ finalDoughTempF: 78, ddtF: 75 });
    expect(cold).toBeGreaterThan(C.BASE_ROOM_MIN);
    expect(warm).toBeLessThan(C.BASE_ROOM_MIN);
  });

  it('clamps to 45–180 min at the extremes', () => {
    expect(computeRoomMinutes({ finalDoughTempF: 100, ddtF: 75 })).toBe(C.ROOM_MIN_CLAMP[0]);
    expect(computeRoomMinutes({ finalDoughTempF: 40, ddtF: 75 })).toBe(C.ROOM_MIN_CLAMP[1]);
  });

  it('plans at DDT until a real temperature is entered', () => {
    const planning = calculate(vectorInputs(6, 265));
    expect(planning.roomMinutesIsPlanned).toBe(true);
    expect(planning.effectiveFinalTempF).toBe(75);
    within(planning.roomMinutes, 90, 1e-9, 'planning-mode room time');

    const measured = calculate({ ...vectorInputs(6, 265), finalDoughTempF: 73 });
    expect(measured.roomMinutesIsPlanned).toBe(false);
    within(measured.roomMinutes, 110.4, 0.1, 'measured room time');
  });
});

describe('§4.4 ice', () => {
  it.each(ICE_EFF_VECTORS)('freezer $freezerF degF -> $iceEffF degF effective', (v) => {
    const r = computeIce({ waterTempF: 50, freshWater: 100, tapTempF: 60, freezerTempF: v.freezerF });
    within(r.iceEffF, v.iceEffF, 1e-9, 'ice effective temp');
  });

  it.each(ICE_PER_100G)('§9 table: 100 g water to $waterTempF degF needs $iceG g ice', ({ waterTempF, iceG }) => {
    const r = computeIce({ waterTempF, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    within(r.iceG, iceG, TOL.grams, 'ice');
    within(r.tapG, 100 - iceG, TOL.grams, 'tap');
  });

  it('uses no ice when the target is at tap temperature', () => {
    const r = computeIce({ waterTempF: 60, freshWater: 500, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('none');
    expect(r.iceG).toBe(0);
  });

  it('stays on plain tap water within 0.5 degF above tap', () => {
    expect(computeIce({ waterTempF: 60.4, freshWater: 500, tapTempF: 60, freezerTempF: 16 }).status).toBe('none');
  });

  it('says warm the water past 0.5 degF above tap', () => {
    const r = computeIce({ waterTempF: 60.6, freshWater: 500, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('warm-water');
    within(r.warmToF ?? 0, 60.6, 1e-9, 'warm-to target');
  });

  it('warns above 35% ice', () => {
    expect(computeIce({ waterTempF: -2, freshWater: 100, tapTempF: 60, freezerTempF: 16 }).status).toBe('ok');
    const above = computeIce({ waterTempF: -4, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    expect(above.status).toBe('excessive');
    expect(above.iceFraction).toBeGreaterThan(0.35);
  });

  it('reports unreachable below the effective ice temperature', () => {
    const r = computeIce({ waterTempF: -130, freshWater: 100, tapTempF: 60, freezerTempF: 16 });
    expect(r.status).toBe('unreachable');
    expect(r.iceG).toBe(100);
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
  });

  it('uses the 55% flour cap for the biga, not the 66% one', () => {
    // 15 x 265 g puts 1528.1 g of biga flour between the two caps.
    const f = computeFormula({ balls: 15, ballWeightG: 265 });
    expect(f.bigaFlour).toBeGreaterThan(C.FLOUR_CAP_66);
    expect(f.bigaFlour).toBeLessThan(C.FLOUR_CAP_55);
    expect(computeCapacity(f).nBiga).toBe(1);
  });

  it('documents which capacity term actually binds', () => {
    // The flour term in nMix is unreachable at 70% hydration: the 2500 g dough
    // ceiling implies 1446.8 g of flour, below the 1505 g cap. Kept as correct
    // defensive form; this asserts why no input can exercise it.
    expect(C.MAX_DOUGH / C.DOUGH_YIELD).toBeLessThan(C.FLOUR_CAP_66);
    expect(C.FLOUR_CAP_55).toBeLessThan(C.MAX_DOUGH / (1 + C.BIGA_HYDRATION));
  });

  it('warns below the mixer minimum', () => {
    const r = calculate(vectorInputs(1, 265));
    expect(r.capacity.belowMixerMinimum).toBe(true);
    expect(r.warnings.map((w) => w.id)).toContain('below-minimum');
  });

  it('never returns a mix over the ceiling or a flour load over the cap', () => {
    for (let balls = 1; balls <= 24; balls++) {
      const f = computeFormula({ balls, ballWeightG: 265 });
      const c = computeCapacity(f);
      expect(c.doughPerMix, `dough per mix at ${balls}`).toBeLessThanOrEqual(C.MAX_DOUGH + 1e-9);
      expect(c.bigaFlourPerBatch, `biga flour at ${balls}`).toBeLessThanOrEqual(C.FLOUR_CAP_55 + 1e-9);
    }
  });
});

describe('§4.6 probe target', () => {
  it('matches the quoted values at FF 14 in a 70 degF room', () => {
    for (const [balls, expected] of [[3, 72.2], [6, 71.8], [9, 70.5]] as const) {
      const r = calculate(vectorInputs(balls, 265));
      within(r.probeTargetF, expected, TOL.degF, `probe at ${balls} balls`);
    }
  });

  it('dilutes the remaining friction by the bowl', () => {
    // Without the dilution the 3-ball probe would sit lower, not higher.
    const three = computeThermal(computeFormula({ balls: 3, ballWeightG: 265 }), 965);
    const nine = computeThermal(computeFormula({ balls: 9, ballWeightG: 265 }), 965);
    expect(three.cTotal / three.cSystem).toBeLessThan(nine.cTotal / nine.cSystem);
  });

  it('shifts with the room temperature', () => {
    const args = { ddtF: 75, frictionFactorF: 14 };
    const thermal = computeThermal(computeFormula({ balls: 6, ballWeightG: 265 }), 965);
    const cool = computeProbeTargetF({ ...args, roomTempF: 65, thermal });
    const warm = computeProbeTargetF({ ...args, roomTempF: 75, thermal });
    // The rest sheds heat in proportion to the dough-to-room gap.
    within(cool - warm, 0.2 * 10, 1e-9, 'room sensitivity');
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

  it('holds hydration, salt, biga fraction and the phase split exactly', () => {
    for (const balls of sizes) {
      for (const ballWeightG of weights) {
        const f = computeFormula({ balls, ballWeightG });
        const label = `${balls}x${ballWeightG}`;
        within((f.bigaWater + f.freshWater) / f.flourTotal, C.HYDRATION, 1e-12, `hydration ${label}`);
        within(f.salt / f.flourTotal, C.SALT, 1e-12, `salt ${label}`);
        within(f.bigaFlour / f.flourTotal, C.BIGA_FRACTION, 1e-12, `biga fraction ${label}`);
        within(f.phaseAWater + f.phaseBWater, f.freshWater, 1e-9, `phase split ${label}`);
        within(f.phaseAWater / f.freshWater, C.PHASE_A_FRACTION, 1e-12, `Phase A share ${label}`);
        const sum = f.bigaFlour + f.bigaWater + f.freshFlour + f.freshWater + f.salt;
        within(sum, f.doughTotal, 1e-9, `component sum ${label}`);
      }
    }
  });

  it('delivers the requested dough weight plus overage', () => {
    for (const balls of sizes) {
      const f = computeFormula({ balls, ballWeightG: 265 });
      within(f.doughTotal, balls * 265 * C.OVERAGE, 1e-9, `dough total at ${balls}`);
    }
  });
});

describe('engine purity', () => {
  it('does not round intermediates', () => {
    const base = calculate(vectorInputs(9, 265));
    const nudged = calculate({ ...vectorInputs(9, 265), bigaTempF: 58.01 });
    expect(nudged.waterTempF).not.toBe(base.waterTempF);
    expect(Math.abs(nudged.waterTempF - base.waterTempF)).toBeLessThan(0.1);
  });

  it('does not mutate its inputs', () => {
    const inputs = vectorInputs(9, 265);
    const snapshot = structuredClone(inputs);
    calculate(inputs);
    expect(inputs).toEqual(snapshot);
  });

  it('exposes the bowl heat capacity helper consistently', () => {
    expect(bowlHeatCapacity(965)).toBeCloseTo(115.8, 6);
    expect(bowlHeatCapacity(0)).toBe(0);
  });
});
