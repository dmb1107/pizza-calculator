import { describe, expect, it } from 'vitest';
import { C, bowlHeatCapacity, defaultDdtF } from '../src/lib/constants';
import { formatInches, formatWhole } from '../src/lib/format';
import {
  bigaReadingCost,
  bowlReadingCost,
  calculate,
  computeCapacity,
  computeFinalTempF,
  computeFormula,
  computeOpening,
  computeProbeParts,
  computeProbeTargetF,
  mixStaggerH,
  staggerUncentredMin,
  observedRate,
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
  BOWL_SHARE_FLOOR,
  BOWL_SHARE_MINIMUM_CASE,
  BELOW_MIN_BALLS_WATER,
  BOWL_DILUTION_SPLIT,
  BOWL_MODE_VECTORS,
  OBSERVED_RATE_VECTORS,
  PER_BATCH_MAX_WATER,
  PROBE_GAP_VECTORS,
  ROOM_MINUTES,
  WATER_REACHABILITY,
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

  // §5: at FF 14.03 both pins are exact to the printed precision (73.499,
  // 67.999), so they are held to it rather than to TOL.degF — at 0.1, this
  // suite could not tell 67.97 from 68.00, which is the whole of the change.
  const PRINTED = 0.005;

  it('predicts the 73.5 degF the dough actually finished at', () => {
    // If this fails, the bowl term is wired wrong.
    within(computeFinalTempF(temps, thermal, BAKE_1.waterUsedF), BAKE_1.finalTempF, PRINTED, 'final temp');
  });

  it('says the water should have been 68.00 degF, not the 63.0 used', () => {
    within(computeWaterTempF(temps, thermal), BAKE_1.waterRequiredF, PRINTED, 'required water');
  });

  it('accounts for the miss exactly: 5 degF of water x water’s share of the system', () => {
    const shortfall = BAKE_1.waterRequiredF - BAKE_1.waterUsedF;
    const waterShare = thermal.cFreshWater / thermal.cSystem;
    within(shortfall * waterShare, BAKE_1.ddtF - BAKE_1.finalTempF, 0.05, 'temperature shortfall');
  });

  it('recovers FF = 14.03 from the measured bake', () => {
    // The same solve the bake log uses. `final − predicted_mix` is the rise
    // after the bowl diluted it, low by FF x C_bowl/(Ct + C_bowl) — §10.
    const ff = solveFrictionFactorF(
      { bigaTempF: BAKE_1.tBigaF, flourTempF: BAKE_1.tFlourF, roomTempF: BAKE_1.tRoomF },
      thermal,
      { waterTempF: BAKE_1.waterUsedF, finalTempF: BAKE_1.finalTempF },
    );
    within(ff, 14.031, 0.0005, 'solved FF');
    within(ff, BAKE_1.ff, 0.0015, 'the seed is the solve, to two decimals');
  });

  it('is about 5 degF away from what the superseded bowl-free model said', () => {
    // The old model reconstructed by zeroing the bowl. §4.3: "Omitting the bowl
    // made this output 5 °F wrong on the first real bake."
    const bowlFree = computeWaterTempF(temps, computeThermal(formula, 0));
    const gap = computeWaterTempF(temps, thermal) - bowlFree;
    expect(gap).toBeGreaterThan(5);
    expect(gap).toBeLessThan(6);
  });

  it('but 5 degF is the SIX-ball figure, not a general one', () => {
    // §4.3 states it "on the first real bake", which was 6 balls, and the index
    // is load-bearing. Subtracting the two formulas leaves
    //
    //     gap = C_bowl x (DDT - T_bowl) / Cw
    //
    // and `Cw` scales linearly with balls per mix, so the bowl-free error is
    // exactly INVERSELY PROPORTIONAL to mix size. It is a hyperbola, and 5 °F is
    // one point on it — not a property of the superseded model.
    //
    // Pinned because the figure has already been restated without its condition
    // once. Conditions throughout: bake 1's inputs, so DDT 75 (the target that
    // day) rather than the 73.5 actually achieved.
    const gapAt = (balls: number) => {
      const f = computeFormula({ balls, ballWeightG: BAKE_1.ballG });
      return (
        computeWaterTempF(temps, computeThermal(f, BAKE_1.bowlMassG)) -
        computeWaterTempF(temps, computeThermal(f, 0))
      );
    };

    expect(gapAt(3)).toBeCloseTo(11.16, 1);
    expect(gapAt(6)).toBeCloseTo(5.58, 1);
    expect(gapAt(9)).toBeCloseTo(3.72, 1);

    // Exactly three-fold across the unsplit range, because the relationship is
    // 1/n. No single number covers it.
    expect(gapAt(3) / gapAt(9)).toBeCloseTo(3, 6);
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

  it.each(BOWL_DILUTION)('dilutes FF 14 to $apparentFF degF at a $ballsPerMix-ball mix', (d) => {
    // Keyed on MIX size, so this is a single mix of that many balls.
    const t = computeThermal(computeFormula({ balls: d.ballsPerMix, ballWeightG: 265 }), 965);
    within(t.bowlShare, d.bowlShare, 0.002, `bowl share at a ${d.ballsPerMix}-ball mix`);
    within(14 * (t.cTotal / t.cSystem), d.apparentFF, 0.05, `apparent FF`);
  });

  it('never lets the bowl share reach the floor the mixer cap implies', () => {
    // §5: the floor is set by MAX_DOUGH, not by a batch size. Sweeping EVERY
    // ball weight rather than a handful, because the minimum sits at an odd
    // count with a non-round weight — which is exactly where a sweep anchored
    // on "the largest single mix" does not look.
    let lowest = 1;
    let at = '';
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let g = 240; g <= 300; g++) {
        const share = calculate(vectorInputs(b, g)).thermal.bowlShare;
        expect(share, `bowl share at ${b} x ${g} g`).toBeGreaterThan(BOWL_SHARE_FLOOR);
        if (share < lowest) {
          lowest = share;
          at = `${b} x ${g} g`;
        }
      }
    }
    const { balls, ballG, share } = BOWL_SHARE_MINIMUM_CASE;
    expect(at, 'the closest approach to the cap').toBe(`${balls} x ${ballG} g`);
    within(lowest, share, 0.0001, 'minimum bowl share');
  });

  it('derives the floor from the mixer cap rather than a batch size', () => {
    // A split batch gets closer to the 2500 g cap than any unsplit one, so the
    // bound has to come from the cap. Reproduces 6.637%.
    const probe = calculate(vectorInputs(6, 265));
    const ctPerGram = probe.thermal.cTotal / probe.formula.doughTotal;
    const cBowl = bowlHeatCapacity(C.DEFAULT_BOWL_MASS_G);
    within(ctPerGram, 0.6516, 0.0005, 'Ct per gram of dough');
    within(cBowl / (ctPerGram * C.MAX_DOUGH + cBowl), BOWL_SHARE_FLOOR, 0.0001, 'infimum');
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
  it.each(ROOM_MINUTES)('DDT $ddtF, $finalTempF degF gives $roomMin min', ({ ddtF, finalTempF, roomMin }) => {
    expect(Math.round(computeRoomMinutes({ finalDoughTempF: finalTempF, ddtF }))).toBe(roomMin);
  });

  it('depends only on the offset from DDT', () => {
    // The property the DDT 74 rows pin. A 74 °F dough is ON TARGET at 9 balls
    // (DDT 74) and gets 90 min — read off a table keyed on dough temperature,
    // which assumed DDT 75, it got 100.
    for (let offset = -8; offset <= 6; offset += 0.5) {
      const at = (ddtF: number) => computeRoomMinutes({ finalDoughTempF: ddtF + offset, ddtF });
      expect(at(74), `offset ${offset}`).toBeCloseTo(at(75), 9);
    }
    expect(Math.round(computeRoomMinutes({ finalDoughTempF: 74, ddtF: 74 }))).toBe(90);
    expect(Math.round(computeRoomMinutes({ finalDoughTempF: 74, ddtF: 75 }))).toBe(100);
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

describe('§4.4 reaching the water temperature', () => {
  /**
   * The sweep that justifies deleting the ice model AND setting `MIN_BALLS`.
   * Both guards are asserted the way §5 asks: the cold one never fires, and the
   * hot one never fires *in this envelope* — not "is unreachable", because a
   * user-entered calibration FF can still reach it.
   */
  function sweep(fn: (waterTempF: number, at: { balls: number; ballG: number }) => void) {
    const { balls, ballG, bigaF, roomF } = WATER_REACHABILITY;
    for (let b = balls.min; b <= balls.max; b++) {
      for (const g of ballG) {
        for (let biga = bigaF.min; biga <= bigaF.max; biga += 1) {
          for (let room = roomF.min; room <= roomF.max; room += 1) {
            const { waterTempF } = calculate({
              ...vectorInputs(b, g),
              bigaTempF: biga,
              roomTempF: room,
              flourTempF: room,
            });
            fn(waterTempF, { balls: b, ballG: g });
          }
        }
      }
    }
  }

  it('pins both corners of the reachable span', () => {
    const { spans, spans265, floorF } = WATER_REACHABILITY;
    let lo = Infinity;
    let hi = -Infinity;
    let lo265 = Infinity;
    let hi265 = -Infinity;

    sweep((w, at) => {
      lo = Math.min(lo, w);
      hi = Math.max(hi, w);
      if (at.ballG === 265) {
        lo265 = Math.min(lo265, w);
        hi265 = Math.max(hi265, w);
      }
    });

    expect(lo, `coldest water required was ${lo.toFixed(1)} degF`).toBeGreaterThan(floorF);
    within(lo, spans.min, 0.2, 'coldest required water');
    within(hi, spans.max, 0.2, 'warmest required water');
    within(lo265, spans265.min, 0.2, 'coldest at the 265 g default');
    within(hi265, spans265.max, 0.2, 'warmest at the 265 g default');
  });

  it('raises neither water warning anywhere in the envelope', () => {
    const { balls, ballG, bigaF, roomF } = WATER_REACHABILITY;
    for (let b = balls.min; b <= balls.max; b += 3) {
      for (const g of ballG) {
        for (let biga = bigaF.min; biga <= bigaF.max; biga += 2) {
          for (let room = roomF.min; room <= roomF.max; room += 3) {
            const { warnings } = calculate({
              ...vectorInputs(b, g),
              bigaTempF: biga,
              roomTempF: room,
              flourTempF: room,
            });
            const water = warnings.filter(
              (w) => w.id === 'water-below-fridge' || w.id === 'water-above-tap',
            );
            expect(
              water.map((w) => w.id),
              `at ${b} x ${g} g, biga ${biga}, room ${room}`,
            ).toEqual([]);
          }
        }
      }
    }
  });

  it('matches the per-batch maxima, which are NOT monotonic in batch size', () => {
    const { bigaF, roomF } = WATER_REACHABILITY;
    for (const { balls, maxWaterF } of PER_BATCH_MAX_WATER) {
      let hi = -Infinity;
      for (let biga = bigaF.min; biga <= bigaF.max; biga += 0.5) {
        for (let room = roomF.min; room <= roomF.max; room += 0.5) {
          hi = Math.max(
            hi,
            calculate({
              ...vectorInputs(balls, 265),
              bigaTempF: biga,
              roomTempF: room,
              flourTempF: room,
            }).waterTempF,
          );
        }
      }
      within(hi, maxWaterF, 0.2, `max water at ${balls} balls`);
    }

    // The shape §5 warns about: 12 balls runs as two 6-ball mixes, and a
    // 6-ball mix wants hotter water than the 9-ball mix that 9 balls runs as.
    const at = (b: number) => PER_BATCH_MAX_WATER.find((r) => r.balls === b)!.maxWaterF;
    expect(at(12), '12 balls sits above 9 — do not assert monotonicity').toBeGreaterThan(at(9));
  });

  it('warns above 120 degF, which a calibration FF can still reach', () => {
    // §2: MIN_BALLS closes the door that is open today; the warning guards the
    // one the calibration panel can reopen. 3 x 240 g at FF 8 is the case.
    const { warnings, waterTempF } = calculate({
      ...vectorInputs(3, 240),
      frictionFactorF: 8,
      bigaTempF: 45,
      roomTempF: 60,
      flourTempF: 60,
    });
    expect(waterTempF).toBeGreaterThan(C.WATER_MAX_F);
    const warning = warnings.find((w) => w.id === 'water-above-tap');
    expect(warning?.severity).toBe('warn');
    // §2 predicted this exact figure for this exact case.
    within(waterTempF, 126.7, 0.1, 'water at 3 x 240 g with FF 8');
    // "Do not tell the user to heat water" — it must point upstream instead.
    expect(warning?.detail).toMatch(/temper/i);
    expect(warning?.detail).toMatch(/don't heat water/i);
  });

  it('still warns below 38 degF at the cold extreme', () => {
    const { warnings, waterTempF } = calculate({
      ...vectorInputs(6, 265),
      bigaTempF: 95,
      roomTempF: 100,
      flourTempF: 100,
    });
    expect(waterTempF).toBeLessThan(C.WATER_MIN_F);
    expect(warnings.find((w) => w.id === 'water-below-fridge')?.severity).toBe('warn');
  });

  it('records why MIN_BALLS exists rather than letting the figures vanish', () => {
    // MESSAGE-4 §13.3 asked that the 1- and 2-ball numbers stay recorded when
    // the sweeps were re-bounded. They are the whole reason for the floor.
    for (const { balls, ballG, maxWaterF } of BELOW_MIN_BALLS_WATER) {
      expect(balls, 'below the supported floor').toBeLessThan(C.MIN_BALLS);
      let hi = -Infinity;
      for (let biga = 45; biga <= 60; biga += 0.5) {
        for (let room = 60; room <= 84; room += 0.5) {
          hi = Math.max(
            hi,
            calculate({
              ...vectorInputs(balls, ballG),
              bigaTempF: biga,
              roomTempF: room,
              flourTempF: room,
            }).waterTempF,
          );
        }
      }
      within(hi, maxWaterF, 0.2, `max water at ${balls} x ${ballG} g`);
    }
  });
});

describe('§4.1 the yeast constant', () => {
  it('derives ADY from the published fresh-yeast dose rather than hardcoding it', () => {
    // The SOURCED number is 1% fresh; everything after is unit conversion, so
    // 0.00375 is exact and the old 0.0038 was a display rounding that leaked
    // into a constant. Same treatment as C_BIGA.
    expect(C.ADY_OF_BIGA_FLOUR).toBe(
      C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY * C.IDY_TO_ADY,
    );
    expect(C.ADY_OF_BIGA_FLOUR).toBeCloseTo(0.00375, 10);
    expect(C.IDY_OF_BIGA_FLOUR).toBeCloseTo(0.003, 10);
  });

  it('holds bigaADY / bigaFlour at exactly 0.00375 at every batch size', () => {
    for (const v of BATCH_VECTORS) {
      const f = computeFormula({ balls: v.balls, ballWeightG: v.ballG });
      within(f.bigaADY / f.bigaFlour, 0.00375, 1e-12, `ADY ratio at ${v.balls} balls`);
    }
  });

  it('moves no thermal figure — yeast carries no term in the heat balance', () => {
    // MESSAGE-4 §13.1 asks for this confirmation explicitly. The ADY column is
    // the only thing that may shift; if a thermal number moved, the constant
    // is not properly isolated.
    for (const v of BATCH_VECTORS) {
      const r = calculate(vectorInputs(v.balls, v.ballG));
      within(r.thermal.cTotal, v.Ct, 0.5, `Ct at ${v.balls} balls`);
      within(r.waterTempF, v.waterTempF, TOL.degF, `water at ${v.balls} balls`);
      within(r.probeTargetF, v.probeTargetF, TOL.degF, `probe at ${v.balls} balls`);
    }
  });
});

describe('§4.2 per-mix thermal weights', () => {
  it('leaves every nMix = 1 vector untouched', () => {
    // MESSAGE-4 §13.2: only the 12 and 18 rows should move. A single-mix row
    // shifting means something other than the per-mix change broke.
    for (const v of BATCH_VECTORS.filter((x) => x.nMix === 1)) {
      const r = calculate(vectorInputs(v.balls, v.ballG));
      within(r.thermal.cTotal, v.Ct, 0.5, `Ct at ${v.balls} balls`);
      within(r.waterTempF, v.waterTempF, TOL.degF, `water at ${v.balls} balls`);
    }
  });

  it('makes a split batch thermally identical to its own mix size', () => {
    // 12 balls IS a 6-ball mix twice over; 18 IS a 9-ball mix twice over.
    for (const { balls, sameAsBalls } of BOWL_DILUTION_SPLIT) {
      const split = calculate(vectorInputs(balls, 265));
      const single = calculate(vectorInputs(sameAsBalls, 265));
      within(split.thermal.cTotal, single.thermal.cTotal, 1e-9, `Ct ${balls} vs ${sameAsBalls}`);
      within(split.thermal.bowlShare, single.thermal.bowlShare, 1e-9, `bowl share ${balls}`);
    }
  });

  it('divides the component masses but not the ingredient totals', () => {
    const r = calculate(vectorInputs(12, 265));
    expect(r.capacity.nMix).toBe(2);
    // Ingredient cards still show the whole batch.
    within(r.formula.bigaMass, 1222.5 + 611.2, 0.5, 'batch biga mass');
    // The heat balance sees one mix.
    within(r.thermal.perMix.bigaMass, (1222.5 + 611.2) / 2, 0.5, 'per-mix biga mass');
  });

  it('lands 12 and 18 balls above the batch-total figures they replace', () => {
    // The bug this fixed: batch totals put the water 2.6 °F low at 12 balls
    // and 1.8 °F low at 18.
    within(calculate(vectorInputs(12, 265)).waterTempF - 62.1, 2.6, 0.15, '12-ball correction');
    within(calculate(vectorInputs(18, 265)).waterTempF - 61.3, 1.8, 0.15, '18-ball correction');
  });

  it('matches §4.2\'s closed form for the batch-total error, across the envelope', () => {
    // MESSAGE-26: every term but the bowl's is scale-invariant, so per-mix
    // minus batch-total is C_bowl (DDT − T_bowl)(nMix − 1) / (Cw per gram of
    // dough × batch dough). Derived from the heat capacities here, checked
    // against two runs of the engine's water formula — so a bowl term wired
    // differently in `computeWaterTempF` fails it. Room and flour are varied
    // because the closed form says they cancel.
    const cBowl = bowlHeatCapacity(C.DEFAULT_BOWL_MASS_G);
    const gap = (balls: number, ballWeightG: number, bigaTempF: number, roomTempF: number) => {
      const f = computeFormula({ balls, ballWeightG });
      const nMix = computeCapacity(f).nMix;
      const t = { ddtF: defaultDdtF(balls), frictionFactorF: 14, bigaTempF, flourTempF: roomTempF, roomTempF };
      const engine =
        computeWaterTempF(t, computeThermal(f, C.DEFAULT_BOWL_MASS_G, nMix)) -
        computeWaterTempF(t, computeThermal(f, C.DEFAULT_BOWL_MASS_G, 1));
      const cwPerGram = (f.freshWater * C.C_WATER) / f.doughTotal;
      const closed = (cBowl * (t.ddtF - bigaTempF) * (nMix - 1)) / (cwPerGram * f.doughTotal);
      return { engine, closed };
    };
    for (let balls = C.MIN_BALLS; balls <= 24; balls++) {
      for (const w of [240, 257, 265, 272, 288, 300]) {
        for (const [biga, room] of [[45, 60], [52, 72], [60, 84]] as const) {
          const { engine, closed } = gap(balls, w, biga, room);
          within(engine, closed, 1e-9, `${balls} x ${w} g, biga ${biga}, room ${room}`);
        }
      }
    }
    // The three-way tie at the maximum shares (nMix − 1) / batch dough, not a
    // per-mix dough (1250.93 g against 1667.90 g) — FINDINGS-26 said otherwise.
    const top = [[9, 272], [18, 272], [17, 288]].map(([b, w]) => gap(b!, w!, 45, 60).engine);
    for (const v of top) within(v, 6.1852, 0.0001, 'the maximum');
    within(top[0]! - top[1]!, 0, 1e-9, '9 x 272 = 18 x 272');
    within(computeFormula({ balls: 9, ballWeightG: 272 }).doughTotal / 2, 1250.93, 0.005, 'per mix, 9 x 272 g');
    within(computeFormula({ balls: 18, ballWeightG: 272 }).doughTotal / 3, 1667.9, 0.005, 'per mix, 18 x 272 g');
  });
});

describe('§4.6 observed vs dough-only rates', () => {
  it.each(OBSERVED_RATE_VECTORS)('$balls balls: Ct/TOT $ctOverTot, 30% reads $at30', (v) => {
    const { thermal } = calculate(vectorInputs(v.balls, 265));
    within(thermal.cTotal / thermal.cSystem, v.ctOverTot, 0.001, `Ct/TOT at ${v.balls}`);
    within(observedRate(30, thermal), v.at30, 0.01, `observed 30% at ${v.balls}`);
  });

  it('stays inside [0.86, 1.01] across every ball count and ball weight', () => {
    // §5, MESSAGE-25. Was [0.88, 1.05] at 265 g only: the upper bound was sized
    // to batch-total weights, and the lower one fails at 3 x 240 g. The
    // extremes are pinned too, so a bound that is merely loose can't pass.
    let lo = Infinity;
    let hi = -Infinity;
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let w = 240; w <= 300; w++) {
        const rate = observedRate(30, calculate(vectorInputs(b, w)).thermal);
        expect(rate, `observed 30% rate at ${b} x ${w} g`).toBeGreaterThanOrEqual(0.86);
        expect(rate, `observed 30% rate at ${b} x ${w} g`).toBeLessThanOrEqual(1.01);
        lo = Math.min(lo, rate);
        hi = Math.max(hi, rate);
      }
    }
    within(lo, 0.8699, 0.0001, 'minimum, 3 x 240 g');
    within(hi, 1.0082, 0.0001, 'maximum, a mix at the 2500 g cap');
  });

  it('reads per-mix masses on a split batch', () => {
    // MESSAGE-25 asked. `calculate` builds the thermal weights per mix, so 12
    // balls reads the 6-ball figure — not the 1.02 a batch-total 12-ball system
    // would give.
    const twelve = calculate(vectorInputs(12, 265));
    expect(twelve.capacity.nMix).toBe(2);
    within(observedRate(30, twelve.thermal), observedRate(30, calculate(vectorInputs(6, 265)).thermal), 1e-12, '12 reads 6');
  });

  it('always reads lower than the dough-only figure it comes from', () => {
    // The conflation that produced the DDT − 4 rule. A thermometer sees the
    // dough after it has equilibrated with the bowl, so observed < dough-only.
    for (const dial of [15, 20, 30] as const) {
      for (const b of [3, 6, 9, 12, 18]) {
        const { thermal } = calculate(vectorInputs(b, 265));
        expect(observedRate(dial, thermal)).toBeLessThan(C.FRICTION_RATE[dial]);
      }
    }
  });
});

describe('§4.6 the probe target has no flat shorthand', () => {
  it.each(PROBE_GAP_VECTORS)('$balls balls sits DDT − $belowDdt', (v) => {
    const r = calculate(vectorInputs(v.balls, 265));
    within(r.ddtF - r.probeTargetF, v.belowDdt, 0.02, `probe gap at ${v.balls} balls`);
  });

  it('gives 18 balls the same probe target as 9 — it is the same mix', () => {
    // ⚠️ §4.6 quotes 18 balls at DDT − 3.7 against 9 balls at DDT − 3.5, which
    // can only be true under batch-total weights. Under §4.2's per-mix weights
    // an 18-ball batch IS two 9-ball mixes, so the two must agree exactly —
    // and §5's vector table (70.5 for both) says they do.
    within(
      calculate(vectorInputs(18, 265)).probeTargetF,
      calculate(vectorInputs(9, 265)).probeTargetF,
      1e-9,
      '18-ball probe vs 9-ball',
    );
  });

  it('disagrees with a flat DDT − 4 by more than a degree at 3 balls', () => {
    // Why the shorthand was deleted rather than adjusted: Phase C's entire
    // authority is about −1.5 to +2.0 °F, so a 1.2 °F error in the target
    // spends most of the budget before the user starts, in the wrong direction.
    const r = calculate(vectorInputs(3, 265));
    expect(Math.abs(r.probeTargetF - (r.ddtF - 4))).toBeGreaterThan(1.1);
  });

  it('is strictly decreasing in PER-MIX ball count, not batch size', () => {
    // ⚠️ Asserting this on batch size was right before per-mix weights and is
    // wrong now: 12 balls is a 6-ball mix and sits above 9 balls.
    const gaps = [3, 6, 9].map((b) => calculate(vectorInputs(b, 265)).probeTargetF);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]!, 'probe target falls as the mix grows').toBeLessThan(gaps[i - 1]!);
    }
    const twelve = calculate(vectorInputs(12, 265)).probeTargetF;
    const nine = calculate(vectorInputs(9, 265)).probeTargetF;
    expect(twelve, '12 balls is a 6-ball mix, so it sits above 9').toBeGreaterThan(nine);
  });
});

describe('§4.2 bowl state', () => {
  it.each(BOWL_MODE_VECTORS)(
    '$balls balls: cold $cold, room $room, warm $warm',
    (v) => {
      for (const [state, expected] of [
        ['cold', v.cold],
        ['room', v.room],
        ['warm', v.warm],
      ] as const) {
        const r = calculate({ ...vectorInputs(v.balls, 265), bowlState: state });
        within(r.waterTempF, expected, TOL.degF, `${state} bowl at ${v.balls} balls`);
      }
    },
  );

  it('prefills each mode from a value already in the model', () => {
    const at = (state: 'cold' | 'room' | 'warm') =>
      calculate({ ...vectorInputs(6, 265), bowlState: state }).mixes[0]!.bowlTempF;
    expect(at('cold')).toBe(VECTOR_CONDITIONS.tBigaF);
    expect(at('room')).toBe(VECTOR_CONDITIONS.tRoomF);
    expect(at('warm')).toBe(75); // DDT at 6 balls
  });

  it('lets a measurement beat the selector', () => {
    const r = calculate({ ...vectorInputs(6, 265), bowlState: 'cold', bowlTempF: 63 });
    expect(r.mixes[0]!.bowlTempF).toBe(63);
    // And it moves the answer by C_bowl/Cw — cSystem/Cw times the dough sensitivity (3.2–3.7).
    const base = calculate({ ...vectorInputs(6, 265), bowlState: 'cold' });
    const perDegree = (r.waterTempF - base.waterTempF) / (63 - VECTOR_CONDITIONS.tBigaF);
    within(perDegree, -0.328, 0.005, 'C_bowl/Cw at 6 balls');
  });

  it('runs a split batch as separate mixes with a warm bowl for the second', () => {
    const r = calculate(vectorInputs(12, 265));
    expect(r.mixes).toHaveLength(2);
    expect(r.mixes[0]!.bowlState).toBe('cold');
    expect(r.mixes[1]!.bowlState).toBe('warm');
    within(r.mixes[0]!.waterTempF, 64.8, TOL.degF, 'mix 1 water');
    within(r.mixes[1]!.waterTempF, 59.5, TOL.degF, 'mix 2 water');
    // The headline figure is mix 1.
    within(r.waterTempF, r.mixes[0]!.waterTempF, 1e-9, 'headline is mix 1');
  });

  it('gives a single-mix batch exactly one target', () => {
    const r = calculate(vectorInputs(6, 265));
    expect(r.mixes).toHaveLength(1);
    expect(r.mixes[0]!.bowlState).toBe('cold');
  });
});

describe('§4.7 staggerUncentred', () => {
  const at = (balls: number, finalDoughTempF: number) =>
    calculate({ ...vectorInputs(balls, 265), finalDoughTempF }).staggerUncentredMin;

  it('is zero across every nMix = 1 case', () => {
    // MESSAGE-5 §9.1 asks for this explicitly. A single mix has no stagger, so
    // there is nothing for the clamp to fail to absorb — at any dough
    // temperature, including ones that peg the rise at either bound.
    for (let b = C.MIN_BALLS; b <= 24; b++) {
      for (let t = 60; t <= 90; t += 0.5) {
        const r = calculate({ ...vectorInputs(b, 265), finalDoughTempF: t });
        if (r.capacity.nMix !== 1) continue;
        expect(r.staggerUncentredMin, `${b} balls at ${t} degF`).toBe(0);
      }
    }
  });

  it('is zero at nMix = 2 for doughs at or below 75 degF', () => {
    // Also §9.1. 12 and 18 balls are the nMix = 2 cases in range.
    for (const b of [12, 18]) {
      for (let t = 60; t <= 75; t += 0.5) {
        expect(at(b, t), `${b} balls at ${t} degF`).toBe(0);
      }
    }
  });

  it('fires only once the rise is pinned to its floor', () => {
    // `roomMinutes` is the UNSTAGGERED rise — the input to the correction, not
    // its output. At 12 balls / 77 degF (DDT 74) it is 62.4 min; subtracting
    // 17.5 wants 44.9, which the floor lifts to 45, so a fraction of a minute
    // is left uncorrected.
    const warm = calculate({ ...vectorInputs(12, 265), finalDoughTempF: 77 });
    const target = warm.roomMinutes - (mixStaggerH(2) / 2) * 60;
    expect(target, 'the correction wants to go under the floor').toBeLessThan(45);
    within(warm.staggerUncentredMin, 45 - target, 1e-9, 'uncentred is exactly the shortfall');
    // Under 2 minutes it stays out of the warnings, per §7.3.
    expect(warm.staggerUncentredMin).toBeLessThan(2);
    expect(warm.warnings.some((w) => w.id === 'stagger-uncentred')).toBe(false);
  });

  it('warns, with the count, once more than 2 minutes go uncorrected', () => {
    // 24 balls is the only nMix = 3 case in range: stagger/2 is 35 min.
    const r = calculate({ ...vectorInputs(24, 265), finalDoughTempF: 77 });
    expect(r.capacity.nMix).toBe(3);
    expect(r.staggerUncentredMin).toBeGreaterThan(2);
    const warning = r.warnings.find((w) => w.id === 'stagger-uncentred');
    expect(warning?.severity).toBe('warn');
    expect(warning?.title).toMatch(/minutes of the spread could not be absorbed/);
    // Points upstream rather than at the floor.
    expect(warning?.detail).toMatch(/fewer, larger mixes/);
    expect(warning?.detail).not.toMatch(/lower the floor|below 45/i);
  });

  it('separates the clamp from the warning at the §4.8 table cells', () => {
    // §4.8, MESSAGE-25: "a clamp and a warning are different things — test
    // them separately." Rows at DDT 74, where 77 °F computes 62 min.
    const cell = (finalDoughTempF: number, nMix: number) => {
      const rise = computeRoomMinutes({ finalDoughTempF, ddtF: 74 });
      const target = rise - (mixStaggerH(nMix) / 2) * 60;
      return { target, uncentred: staggerUncentredMin(rise, nMix) };
    };
    // 75 °F / nMix 3: 45.4 — above the floor, NOT clamped; prints 45 by rounding.
    within(cell(75, 3).target, 45.41, 0.01, '75 / 3 target');
    expect(cell(75, 3).uncentred).toBe(0);
    // 77 °F / nMix 2: clamped, but by 0.13 min — under the > 2 warning.
    within(cell(77, 2).uncentred, 0.13, 0.01, '77 / 2 clamped by');
    // 77 °F / nMix 3: the one cell that warns.
    within(cell(77, 3).uncentred, 17.63, 0.01, '77 / 3 unabsorbed');
  });

  it('never reports a negative residual', () => {
    for (const b of [3, 6, 9, 12, 18, 24]) {
      for (let t = 60; t <= 90; t += 1) {
        expect(at(b, t), `${b} balls at ${t} degF`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('§5 the app-default flour offset', () => {
  it('is derived from the formula, not a literal', () => {
    // MESSAGE-9: 0.392 is only true of THIS formula. A literal would be correct
    // today and silently wrong the first time anyone moved hydration or the
    // biga fraction — the same shape as the yeast constant and `divideBall`.
    within(
      C.APP_DEFAULT_FLOUR_OFFSET_F,
      (C.FRESH_FLOUR_FRACTION * C.C_FLOUR) / (C.FRESH_WATER_FRACTION * C.C_WATER),
      1e-12,
      'offset is its own derivation',
    );
    within(C.FRESH_FLOUR_FRACTION, 0.35, 1e-12, 'fresh flour fraction');
    within(C.FRESH_WATER_FRACTION, 0.375, 1e-12, 'fresh water fraction');
    within(C.APP_DEFAULT_FLOUR_OFFSET_F, 0.392, 1e-12, 'offset as shipped');
  });

  it('tracks the formula rather than the number', () => {
    // The sensitivity that makes deriving it worth doing. Recomputed the same
    // way the constant is, against formulas this recipe does not use.
    const at = (bigaFrac: number, hyd: number, bigaHyd: number) =>
      ((1 - bigaFrac) * C.C_FLOUR) / ((hyd - bigaFrac * bigaHyd) * C.C_WATER);
    within(at(0.65, 0.7, 0.5), C.APP_DEFAULT_FLOUR_OFFSET_F, 1e-12, 'as shipped');
    within(at(0.65, 0.65, 0.5), 0.452, 0.0005, 'at 65% hydration');
    within(at(0.6, 0.7, 0.5), 0.42, 0.0005, 'at a 60% biga');
    within(at(0.65, 0.7, 0.45), 0.361, 0.0005, 'at 45% biga hydration');
  });

  it('is exactly Cf/Cw, and the same at every batch size', () => {
    // This constant is why a rendered water target sits 0.39 °F below its
    // vector value. It cost a round of correspondence, so it is pinned rather
    // than left as a note: the vectors use flour 69, the app defaults it to
    // room (70), and both are deliberate.
    const seen = new Set<string>();
    for (let balls = C.MIN_BALLS; balls <= 24; balls++) {
      for (const ballG of [240, 265, 300]) {
        const at69 = calculate({ ...vectorInputs(balls, ballG), flourTempF: 69 });
        const at70 = calculate({ ...vectorInputs(balls, ballG), flourTempF: 70 });
        seen.add((at69.waterTempF - at70.waterTempF).toFixed(6));
        // And it is the heat-capacity ratio, not a coincidence.
        within(
          at69.thermal.cFreshFlour / at69.thermal.cFreshWater,
          C.APP_DEFAULT_FLOUR_OFFSET_F,
          1e-9,
          `Cf/Cw at ${balls} x ${ballG} g`,
        );
      }
    }
    expect([...seen], 'one offset for the whole grid').toEqual([
      C.APP_DEFAULT_FLOUR_OFFSET_F.toFixed(6),
    ]);
  });

  it('accounts for the gap between a rendered target and its vector', () => {
    // The 12-ball case that prompted this: 59.505 at flour 69, 59.113 at 70.
    const at69 = calculate({ ...vectorInputs(12, 265), flourTempF: 69 });
    const at70 = calculate({ ...vectorInputs(12, 265), flourTempF: 70 });
    within(at69.mixes[1]!.waterTempF, 59.505, 0.002, 'mix 2 at vector conditions');
    within(at70.mixes[1]!.waterTempF, 59.113, 0.002, 'mix 2 at app defaults');
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

/**
 * §4.2's two biga sensitivities. The spec documents both and says **do not
 * reconcile them** — they are partial derivatives on different assumptions, and
 * a previous round quoted one from each basis as though they were a batch-size
 * range. This pins the distinction so that "fixing" the apparent disagreement
 * turns the suite red.
 *
 * `Cb/Cw`            bowl held at its own measured value — `mix-8`, where the
 *                    baker takes two readings and the bowl has drifted the other
 *                    way, toward DDT.
 * `(Cb + C_bowl)/Cw` bowl tracking the biga — `biga-6`, where the biga tempers
 *                    inside the bowl and the hour warms both together. This is
 *                    also what the engine computes, since `T_bowl` defaults to
 *                    `T_biga`.
 */
describe('§4.2 the two biga sensitivities are different quantities', () => {
  /**
   * Measured off `computeWaterTempF` by perturbing the biga a degree, NOT
   * re-derived from the heat capacities. The point is to check the engine
   * against §4.2's table rather than to check §4.2's algebra against itself —
   * a coefficient recomputed from `cBiga` and `cBowl` would agree with the
   * table even if the water formula had dropped the bowl entirely.
   */
  const sens = (balls: number, ballWeightG: number = C.DEFAULT_BALL_G, nMix = 1) => {
    const f = computeFormula({ balls, ballWeightG });
    const th = computeThermal(f, C.DEFAULT_BOWL_MASS_G, nMix);
    const base = {
      ddtF: 73.5,
      frictionFactorF: C.DEFAULT_FF,
      bigaTempF: 58,
      flourTempF: 70,
      roomTempF: 70,
    };
    const d = (extra: Partial<typeof base> & { bowlTempF?: number }) =>
      computeWaterTempF({ ...base, ...extra, bigaTempF: 59 }, th) -
      computeWaterTempF({ ...base, ...extra }, th);

    return {
      // T_bowl pinned: the bowl is measured separately and stays put.
      bowlHeld: -d({ bowlTempF: 58 }),
      // T_bowl left to default to T_biga, so both move together.
      bowlTracking: -d({}),
      bowlShare: th.bowlShare,
    };
  };

  it('holds Cb/Cw scale-invariant at 1.59', () => {
    // A dough-only ratio: 0.975 x C_BIGA over FRESH_WATER_FRACTION, with no
    // total-flour term and no bowl term, so it cannot vary with mix size — the
    // same rule that makes Cb/Ct invariant while anything over cSystem is not.
    for (const balls of [3, 6, 9]) {
      expect(sens(balls).bowlHeld, `${balls} balls`).toBeCloseTo(1.5947, 3);
    }
    expect(sens(12, C.DEFAULT_BALL_G, 2).bowlHeld).toBeCloseTo(1.5947, 3);
    expect(sens(3, 240).bowlHeld, 'smallest legal mix').toBeCloseTo(1.5947, 3);
  });

  it('reproduces the §4.2 table for a tracking bowl', () => {
    expect(sens(3).bowlTracking).toBeCloseTo(2.251, 3);
    expect(sens(6).bowlTracking).toBeCloseTo(1.923, 3);
    expect(sens(9).bowlTracking).toBeCloseTo(1.814, 3);
  });

  it('never lets the two bases coincide', () => {
    // (Cb + C_bowl)/Cw = Cb/Cw would require C_bowl = 0, which is the
    // superseded bowl-free model. The gap IS the bowl's share of the water term.
    for (const balls of [3, 6, 9]) {
      const { bowlHeld, bowlTracking } = sens(balls);
      expect(bowlTracking - bowlHeld, `${balls} balls`).toBeGreaterThan(0.2);
    }
  });

  it('spans 1.81 to 2.32 across every legal mix size', () => {
    let min = Infinity;
    let max = -Infinity;
    let minAt = '';
    let maxAt = '';
    for (let balls = C.MIN_BALLS; balls <= 24; balls += 1) {
      for (let w = 240; w <= 300; w += 1) {
        const f = computeFormula({ balls, ballWeightG: w });
        const nMix = computeCapacity(f).nMix;
        const v = sens(balls, w, nMix).bowlTracking;
        if (v < min) { min = v; minAt = `${balls} x ${w} g`; }
        if (v > max) { max = v; maxAt = `${balls} x ${w} g`; }
      }
    }
    expect(min).toBeCloseTo(1.809, 2);
    expect(max).toBeCloseTo(2.320, 2);
    // Every value rounds to "about two degrees", which is what biga-6 claims.
    expect(Math.round(min)).toBe(2);
    expect(Math.round(max)).toBe(2);
    // §4.2: the minimum sits at the largest per-mix dough, which is the same
    // configuration that sets the bowl-share floor — not a coincidence, since
    // both fall as per-mix dough rises, and a SPLIT batch gets closest to the
    // 2500 g cap. 19 x 257 g runs as two 2495 g mixes; 9 x 270 g is only 2483.
    expect(minAt).toBe('19 x 257 g');
    expect(maxAt).toBe('3 x 240 g');
  });

  it('puts the bowl-share floor at that same configuration', () => {
    // 6.8% is the 9 x 265 g ROW, not the floor. The floor is 6.6%, set by the
    // mixer cap - the distinction two earlier drafts got wrong.
    expect(sens(9, 265).bowlShare).toBeCloseTo(0.068, 3);
    expect(sens(9, 270).bowlShare).toBeCloseTo(0.0668, 3);
    expect(sens(19, 257, 2).bowlShare).toBeCloseTo(0.0665, 3);
  });
});

/**
 * The panel hint quotes `bigaReadingCost` on the basis `calculate` reports for
 * mix 1. It printed the tracking figure beside a measured bowl until
 * FINDINGS-25, so what is pinned here is the PAIRING: the flag must pick the
 * coefficient the engine actually applies. Measured by perturbing the biga
 * through `calculate` itself, the path the water card takes — a check against
 * the heat capacities would agree with a flag that pointed the wrong way.
 */
describe('§4.2 the biga hint quotes the basis the engine applies', () => {
  const BIGA_F = VECTOR_CONDITIONS.tBigaF;
  const base = { ...vectorInputs(3, 265), roomTempF: 70, ddtOverrideF: 75 };
  const ERROR_F = 6;

  const cases: [string, Partial<CalculatorInputs>, boolean][] = [
    ['cold, unmeasured', { bowlState: 'cold' }, true],
    ['cold, measured', { bowlState: 'cold', bowlTempF: [58] }, false],
    ['room, unmeasured', { bowlState: 'room' }, false],
    ['warm, unmeasured', { bowlState: 'warm' }, false],
  ];

  for (const [name, extra, tracks] of cases) {
    it(`${name}: ${tracks ? 'tracking' : 'held'}`, () => {
      const r = calculate({ ...base, ...extra });
      expect(r.mixes[0]!.bowlTracksBiga).toBe(tracks);
      const cost = bigaReadingCost(r.thermal, r.mixes[0]!.bowlTracksBiga, ERROR_F);

      // Water: what a warmer reading does to the card.
      const warmer = calculate({ ...base, ...extra, bigaTempF: BIGA_F + ERROR_F });
      within(r.waterTempF - warmer.waterTempF, cost.waterF, 1e-9, 'water moved');

      // Dough: mix at the guess's water when the truth was ERROR_F warmer.
      // The bowl the dough meets is the one `warmer` says it is.
      const m = warmer.mixes[0]!;
      const finalF = computeFinalTempF(
        { ...base, ddtF: r.ddtF, bigaTempF: BIGA_F + ERROR_F, bowlTempF: m.bowlTempF },
        r.thermal,
        r.waterTempF,
      );
      within(finalF - r.ddtF, cost.doughF, 1e-9, 'dough missed DDT by');
    });
  }

  it('reproduces FINDINGS-25 at 3 / 6 / 9 balls', () => {
    const at = (balls: number, bowlTempF?: number[]) => {
      const r = calculate({ ...vectorInputs(balls, 265), bowlState: 'cold', bowlTempF });
      return bigaReadingCost(r.thermal, r.mixes[0]!.bowlTracksBiga, ERROR_F);
    };
    // Tracking, the §4.2 table row. What the hint printed at every state.
    within(at(3).waterPerF, 2.251, 0.001, '3 tracking');
    within(at(6).waterPerF, 1.923, 0.001, '6 tracking');
    within(at(9).waterPerF, 1.814, 0.001, '9 tracking');
    within(at(3).waterF, 13.51, 0.01, '3 tracking, 6 °F of water');
    within(at(3).doughF, 3.69, 0.01, '3 tracking, 6 °F of dough');
    within(at(6).waterF, 11.54, 0.01, 'the typed "11 °F"');
    within(at(6).doughF, 3.46, 0.01, 'the typed "3.5 °F"');
    // Held: scale-invariant in water, not in dough (cSystem carries the bowl).
    for (const balls of [3, 6, 9]) {
      within(at(balls, [58]).waterPerF, 1.5947, 0.0001, `${balls} held`);
      within(at(balls, [58]).waterF, 9.57, 0.01, `${balls} held, water`);
    }
    within(at(3, [58]).doughF, 2.61, 0.01, '3 held, dough');
    within(at(9, [58]).doughF, 2.97, 0.01, '9 held, dough');
  });

  it('quotes the bowl ratio the engine applies, at every mix size', () => {
    // The hint prints waterOverDough rather than a worded "three times": the
    // wording rested on Ct/Cw = 3.0023, which MESSAGE-25 showed a 72%
    // hydration takes to 2.90. Measured by moving a MEASURED bowl a degree
    // through `calculate`, so a ratio computed on the wrong basis fails.
    for (const balls of [3, 6, 9, 12, 19]) {
      const inputs = { ...vectorInputs(balls, balls === 19 ? 257 : 265), bowlTempF: [58] };
      const r = calculate(inputs);
      const warmer = calculate({ ...inputs, bowlTempF: [59] });
      const water = r.waterTempF - warmer.waterTempF;
      const dough =
        computeFinalTempF({ ...inputs, ddtF: r.ddtF, bigaTempF: BIGA_F, bowlTempF: 59 }, r.thermal, r.waterTempF) - r.ddtF;
      const cost = bowlReadingCost(r.thermal);
      within(water, cost.waterPerF, 1e-9, `${balls}: water per °F of bowl`);
      within(dough, cost.doughPerF, 1e-9, `${balls}: dough per °F of bowl`);
      within(water / dough, cost.waterOverDough, 1e-9, `${balls}: the printed ratio`);
    }
    // 3.2–3.7 across the envelope at the default bowl, as MESSAGE-25 reproduced.
    within(bowlReadingCost(calculate(vectorInputs(3, 240)).thermal).waterOverDough, 3.728, 0.001, 'smallest mix');
    within(bowlReadingCost(calculate(vectorInputs(19, 257)).thermal).waterOverDough, 3.216, 0.001, 'mix at the cap');
  });
});

describe('§4.9 opening diameter', () => {
  it('reproduces the §4.9 table', () => {
    // Ball → open to, and how much thicker than the default ball on the full
    // stone. Whether the block SHOWS is decided on the printed percentage —
    // that half of the table is in bindTokens.test.ts.
    const rows = [
      { g: 240, open: '11.4', over: '0' },
      { g: 265, open: '12.0', over: '0' },
      { g: 266, open: '12.0', over: '0' },
      { g: 267, open: '12.0', over: '1' },
      { g: 300, open: '12.0', over: '13' },
    ];
    for (const r of rows) {
      const o = computeOpening(r.g);
      expect(formatInches(o.openDiameterIn), `${r.g} g open`).toBe(r.open);
      expect(formatWhole(o.thicknessPercentOver), `${r.g} g thicker`).toBe(r.over);
    }
  });

  it('references the default ball on the full stone, and nothing else', () => {
    // No thickness factor, no ounces, no π: stated as the default ball on the
    // full stone, they cancel. What's left is a square-root scaling.
    const o = computeOpening(C.DEFAULT_BALL_G);
    expect(o.openDiameterIn).toBe(C.TREAD_MAX_DIAMETER_IN);
    expect(o.thicknessPercentOver).toBe(0);
    for (let g = 240; g < C.DEFAULT_BALL_G; g++) {
      expect(computeOpening(g).openDiameterIn, `${g} g`).toBeCloseTo(
        C.TREAD_MAX_DIAMETER_IN * Math.sqrt(g / C.DEFAULT_BALL_G),
        12,
      );
    }
  });

  it('caps from the first gram above the default — 266 g is capped by 0.02 in', () => {
    // §4.9: at 266 g "the diameter *is* capped, by 0.02 inches, and the block
    // correctly stays hidden" — capped is not the same as visibly thicker.
    const uncapped266 = C.TREAD_MAX_DIAMETER_IN * Math.sqrt(266 / C.DEFAULT_BALL_G);
    expect(uncapped266 - C.TREAD_MAX_DIAMETER_IN).toBeCloseTo(0.0226, 4);
    expect(computeOpening(266).openDiameterIn).toBe(C.TREAD_MAX_DIAMETER_IN);
    expect(computeOpening(266).thicknessPercentOver).toBeGreaterThan(0);
  });

  it('never opens past the stone, and thickens exactly with weight once capped', () => {
    for (let g = 240; g <= 300; g++) {
      const o = computeOpening(g);
      expect(o.openDiameterIn, `${g} g`).toBeLessThanOrEqual(C.TREAD_MAX_DIAMETER_IN);
      // Same stone, same area: thickness goes as weight.
      if (g > C.DEFAULT_BALL_G) expect(o.thicknessPercentOver).toBeCloseTo((g / C.DEFAULT_BALL_G - 1) * 100, 12);
    }
  });
});

describe('§4.10 the probe target in parts', () => {
  const at = (balls: number, roomTempF: number, frictionFactorF = 14) => {
    const f = computeFormula({ balls, ballWeightG: 265 });
    const thermal = computeThermal(f, C.DEFAULT_BOWL_MASS_G, computeCapacity(f).nMix);
    return { parts: computeProbeParts({ ddtF: defaultDdtF(balls), frictionFactorF, roomTempF, thermal }), thermal };
  };

  it('satisfies the §4.10 identity before rounding', () => {
    for (const balls of [3, 6, 9, 12, 18]) {
      for (const room of [60, 62, 70, 78, 84]) {
        const { parts } = at(balls, room);
        expect(parts.gapF, `${balls} balls, room ${room}`).toBeCloseTo(parts.frictionRemainingF - parts.restSignedF, 12);
        expect(parts.targetF).toBeCloseTo(defaultDdtF(balls) - parts.gapF, 12);
      }
    }
  });

  it('is what computeProbeTargetF returns — one formula, not two copies', () => {
    const { parts, thermal } = at(6, 62);
    expect(computeProbeTargetF({ ddtF: 75, frictionFactorF: 14, roomTempF: 62, thermal })).toBe(parts.targetF);
  });

  it('still carries §4.6’s coefficients: 0.33 of FF after dilution, 0.2 per °F of room', () => {
    const { parts, thermal } = at(6, 70);
    expect(parts.frictionRemainingF).toBeCloseTo(0.33 * 14 * (thermal.cTotal / thermal.cSystem), 12);
    expect(parts.restSignedF).toBeCloseTo(0.2 * (75 - 70), 12);
  });

  it('shows the rest unsigned, whichever way the kitchen pulls', () => {
    // Prose says "toward room temperature" and lets the direction follow.
    expect(at(6, 62).parts.restSignedF).toBeGreaterThan(0); // cold kitchen: the rest cools
    expect(at(6, 84).parts.restSignedF).toBeLessThan(0); // warm kitchen: the rest warms
    for (const room of [62, 84]) {
      const { parts } = at(6, room);
      expect(parts.restExchangeF).toBe(Math.abs(parts.restSignedF));
    }
  });

  it('keeps the gap positive everywhere in the §5 envelope at FF 14', () => {
    // Outside it the gap can go negative — see the rendering edge pinned in
    // bindTokens.test.ts and FINDINGS-18.
    for (let balls = C.MIN_BALLS; balls <= 24; balls++) {
      for (const room of [60, 84]) expect(at(balls, room).parts.gapF, `${balls} balls, room ${room}`).toBeGreaterThan(0);
    }
  });
});
