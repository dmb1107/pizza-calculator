/**
 * Test vectors — WEBSITE-SPEC-biga-calculator.md §5, transcribed verbatim.
 *
 * Regenerated after bake 1 (21 Aug 2026), which showed the mixer bowl is a
 * thermal mass that has to be in the model. Ingredient columns are unchanged;
 * every thermal output moved.
 *
 * Tolerance +/-0.1 g, +/-0.1 degF. These are the acceptance criteria for the
 * calculation engine: get them green before writing any UI (§12).
 */

/** All BATCH_VECTORS rows share these conditions. */
export const VECTOR_CONDITIONS = {
  ff: 14.0,
  tBigaF: 58,
  /** T_bowl defaults to T_biga — the biga ferments in the mixer bowl. */
  tBowlF: 58,
  tFlourF: 69,
  tRoomF: 70,
  bowlMassG: 965,
} as const;

export interface BatchVector {
  balls: number;
  ballG: number;
  F: number;
  bigaFlour: number;
  bigaWater: number;
  bigaADY: number;
  freshFlour: number;
  freshWater: number;
  phaseA: number;
  phaseB: number;
  salt: number;
  /**
   * Dough-only heat capacity of ONE MIX — the friction work term uses this,
   * not Ct + C_bowl, and not the batch total. §4.2: a 12-ball batch is a
   * 6-ball thermal system twice over, so its Ct equals the 6-ball row's.
   */
  Ct: number;
  ddtF: number;
  waterTempF: number;
  probeTargetF: number;
  nBiga: number;
  nMix: number;
}

export const BATCH_VECTORS: readonly BatchVector[] = [
  { balls: 3,  ballG: 265, F: 470.2,  bigaFlour: 305.6,  bigaWater: 152.8, bigaADY: 1.15, freshFlour: 164.6, freshWater: 176.3,  phaseA: 105.8, phaseB: 70.5,  salt: 13.2, Ct: 529.4,  ddtF: 75, waterTempF: 73.7, probeTargetF: 72.2, nBiga: 1, nMix: 1 },
  { balls: 6,  ballG: 265, F: 940.4,  bigaFlour: 611.2,  bigaWater: 305.6, bigaADY: 2.29, freshFlour: 329.1, freshWater: 352.6,  phaseA: 211.6, phaseB: 141.1, salt: 26.3, Ct: 1058.8, ddtF: 75, waterTempF: 68.1, probeTargetF: 71.8, nBiga: 1, nMix: 1 },
  { balls: 9,  ballG: 265, F: 1410.6, bigaFlour: 916.9,  bigaWater: 458.4, bigaADY: 3.44, freshFlour: 493.7, freshWater: 529.0,  phaseA: 317.4, phaseB: 211.6, salt: 39.5, Ct: 1588.1, ddtF: 74, waterTempF: 63.0, probeTargetF: 70.5, nBiga: 1, nMix: 1 },
  { balls: 12, ballG: 265, F: 1880.8, bigaFlour: 1222.5, bigaWater: 611.2, bigaADY: 4.58, freshFlour: 658.3, freshWater: 705.3,  phaseA: 423.2, phaseB: 282.1, salt: 52.7, Ct: 1058.8, ddtF: 74, waterTempF: 64.8, probeTargetF: 70.6, nBiga: 1, nMix: 2 },
  { balls: 18, ballG: 265, F: 2821.1, bigaFlour: 1833.7, bigaWater: 916.9, bigaADY: 6.88, freshFlour: 987.4, freshWater: 1057.9, phaseA: 634.8, phaseB: 423.2, salt: 79.0, Ct: 1588.1, ddtF: 74, waterTempF: 63.0, probeTargetF: 70.5, nBiga: 2, nMix: 2 },
  { balls: 5,  ballG: 270, F: 798.4,  bigaFlour: 519.0,  bigaWater: 259.5, bigaADY: 1.95, freshFlour: 279.5, freshWater: 299.4,  phaseA: 179.6, phaseB: 119.8, salt: 22.4, Ct: 898.9,  ddtF: 75, waterTempF: 69.1, probeTargetF: 71.9, nBiga: 1, nMix: 1 },
  { balls: 7,  ballG: 260, F: 1076.4, bigaFlour: 699.7,  bigaWater: 349.8, bigaADY: 2.62, freshFlour: 376.7, freshWater: 403.7,  phaseA: 242.2, phaseB: 161.5, salt: 30.1, Ct: 1211.9, ddtF: 74, waterTempF: 64.1, probeTargetF: 70.6, nBiga: 1, nMix: 1 },
];

/**
 * Bake 1, 21 Aug 2026 — the real bake this model was corrected against.
 *
 * The 5 °F gap between the water used and the water needed, times water's ~30%
 * share of the system, is exactly the 1.5 °F the dough finished low.
 * **If this fails, the bowl term is wired wrong.**
 */
export const BAKE_1 = {
  balls: 6,
  ballG: 265,
  ff: 14.04,
  tBigaF: 58,
  tBowlF: 58,
  tFlourF: 69,
  tRoomF: 70,
  bowlMassG: 965,
  ddtF: 75,
  /** What was actually used on the day. */
  waterUsedF: 63.0,
  /** What the corrected model says it should have been. */
  waterRequiredF: 67.97,
  /** Predicted, and measured on the day. */
  finalTempF: 73.5,
} as const;

/**
 * Same FF, different apparent rise by batch size. The bowl is fixed mass while
 * the dough scales, which is why the bowl cannot be folded into FF: the
 * per-batch-size table would drift for no physical reason.
 */
export const BOWL_DILUTION: readonly {
  ballsPerMix: number;
  bowlShare: number;
  apparentFF: number;
}[] = [
  { ballsPerMix: 3, bowlShare: 0.179, apparentFF: 11.5 },
  { ballsPerMix: 6, bowlShare: 0.099, apparentFF: 12.6 },
  { ballsPerMix: 9, bowlShare: 0.068, apparentFF: 13.0 },
];

/**
 * §5. The bowl's share has a floor, and it is set by the **2500 g mixer cap**
 * rather than by any batch size:
 *
 *     C_bowl / (Ct_per_gram × MAX_DOUGH + C_bowl)
 *     115.8  / (0.6516      × 2500      + 115.8)  = 6.637%
 *
 * An infimum, approached but never reached, since a mix cannot sit exactly at
 * the cap.
 *
 * ⚠️ Both earlier attempts anchored on a configuration and both were wrong.
 * 6.8% was the 9 × 265 g figure; my 6.68% was 9 × 270 g, the largest UNSPLIT
 * mix — but a SPLIT batch gets closer to the cap than any unsplit one. 19 × 257 g
 * runs as two mixes of 2495.2 g and reaches 6.649%, and it is the true minimum
 * over the whole 3–24 × 240–300 g grid. My sweep missed it by only trying four
 * ball weights. Anchoring on the cap is the only form that survives a change to
 * the ball-weight range or the nMix rule.
 */
export const BOWL_SHARE_FLOOR = 0.06637;

/** §5. The configuration that comes closest to the cap, and so to the infimum. */
export const BOWL_SHARE_MINIMUM_CASE = { balls: 19, ballG: 257, share: 0.06649 } as const;

/**
 * §5. A split batch reads off its own mix size: 12 balls off the 6 row, 18 off
 * the 9. Settled by MESSAGE-5 §5 — the batch-keyed 12-ball row is gone from the
 * spec and the concept prose is corrected to 6.8% / 13.0 °F.
 */
export const BOWL_DILUTION_SPLIT: readonly { balls: number; sameAsBalls: number }[] = [
  { balls: 12, sameAsBalls: 6 },
  { balls: 18, sameAsBalls: 9 },
];

/**
 * §5. `Ct / TOT` per mix — the factor converting a dough-only rate into what a
 * thermometer reads. 12 and 18 share values with 6 and 9 because they ARE 6-
 * and 9-ball mixes.
 */
export const OBSERVED_RATE_VECTORS: readonly { balls: number; ctOverTot: number; at30: number }[] = [
  { balls: 3, ctOverTot: 0.821, at30: 0.89 },
  { balls: 6, ctOverTot: 0.901, at30: 0.97 },
  { balls: 9, ctOverTot: 0.932, at30: 1.01 },
  { balls: 12, ctOverTot: 0.901, at30: 0.97 },
  { balls: 18, ctOverTot: 0.932, at30: 1.01 },
];

/** §5 bowl-mode vectors — 265 g, FF 14, biga 58, room 70, flour 69. */
export const BOWL_MODE_VECTORS: readonly {
  balls: number;
  cold: number;
  room: number;
  warm: number;
}[] = [
  { balls: 3, cold: 73.7, room: 65.8, warm: 62.5 },
  { balls: 6, cold: 68.1, room: 64.1, warm: 62.5 },
  { balls: 9, cold: 63.0, room: 60.4, warm: 59.5 },
  { balls: 12, cold: 64.8, room: 60.8, warm: 59.5 },
  { balls: 18, cold: 63.0, room: 60.4, warm: 59.5 },
];

/**
 * §4.6. The probe gap is mix-size dependent; there is no flat `DDT − 4`.
 *
 * Settled by MESSAGE-5 §3: §4.6 now agrees with §5 at 70.6 / 70.5. 12 and 6
 * differ despite sharing a mix size because mix size sets the friction term
 * while TOTAL balls sets DDT (74 vs 75), and the gap also carries
 * `0.2 × (DDT − T_room)`.
 */
export const PROBE_GAP_VECTORS: readonly { balls: number; belowDdt: number }[] = [
  { balls: 3, belowDdt: 2.79 },
  { balls: 6, belowDdt: 3.16 },
  { balls: 9, belowDdt: 3.51 },
  { balls: 12, belowDdt: 3.36 },
  { balls: 18, belowDdt: 3.51 },
];

/** §4.8 shaped rise time, at DDT 75. */
export const ROOM_MINUTES: readonly { finalTempF: number; roomMin: number }[] = [
  { finalTempF: 77, roomMin: 71 },
  { finalTempF: 76, roomMin: 80 },
  { finalTempF: 75, roomMin: 90 },
  { finalTempF: 74, roomMin: 100 },
  { finalTempF: 73, roomMin: 110 },
  { finalTempF: 72, roomMin: 121 },
  { finalTempF: 71, roomMin: 133 },
  { finalTempF: 70, roomMin: 144 },
];

/**
 * DOUGH-ONLY thermal weights. These stay scale-invariant.
 *
 * ⚠️ Bowl-inclusive shares are NOT scale-invariant and must never be asserted
 * as such — §4.2 says any such test is to be deleted, not loosened.
 */
export const THERMAL_WEIGHTS = { biga: 0.5311, flour: 0.1306, water: 0.3331, salt: 0.0052 } as const;

/**
 * §5 water-temperature reachability, re-swept under per-mix weights (§4.2).
 *
 * Both ends are pinned. The cold end is what makes the ice deletion safe; the
 * hot end is what `MIN_BALLS = 3` exists to keep tractable.
 *
 * ⚠️ The minimum moved from 51.2 to 53.2 when the weights went per-mix, and the
 * reason is worth holding onto: the coldest requirement comes from the LARGEST
 * thermal system, and per-mix weights cap that at mixer capacity. The biggest
 * single mix in the permitted range is 9 × 270 g — a 24-ball batch is three
 * 8-ball mixes, not one 6500 g monster.
 */
export const WATER_REACHABILITY = {
  balls: { min: 3, max: 24 },
  ballG: [240, 265, 270, 300],
  bigaF: { min: 45, max: 60 },
  roomF: { min: 60, max: 84 },
  /** Across the whole permitted envelope. */
  spans: { min: 53.2, max: 108.7 },
  /** At the 265 g default ball weight. */
  spans265: { min: 53.3, max: 106.6 },
  /** §4.4 guard thresholds. Neither fires anywhere in the envelope at FF 14. */
  floorF: 38,
  ceilingF: 120,
} as const;

/**
 * §5 per-batch maxima at 265 g.
 *
 * ⚠️ NOT monotonic in total balls — 12 (93.4) sits above 9 (90.3), because 12
 * runs as two 6-ball mixes and a 6-ball mix wants hotter water than a 9-ball
 * one. The requirement tracks the MIX, and mix size does not fall smoothly with
 * batch size. Do not assert monotonicity on batch size.
 */
export const PER_BATCH_MAX_WATER: readonly { balls: number; maxWaterF: number }[] = [
  { balls: 3, maxWaterF: 106.6 },
  { balls: 5, maxWaterF: 98.7 },
  { balls: 6, maxWaterF: 96.8 },
  { balls: 7, maxWaterF: 92.1 },
  { balls: 9, maxWaterF: 90.3 },
  { balls: 12, maxWaterF: 93.4 },
  { balls: 18, maxWaterF: 90.3 },
  { balls: 24, maxWaterF: 91.1 },
];

/**
 * §5. Had `MIN_BALLS` stayed at 1 the maximum would be 152.2 °F at 1 × 240 g.
 * Kept because it is the reason the minimum exists — MESSAGE-4 §13 asked that
 * these not simply vanish when the sweeps were re-bounded.
 */
export const BELOW_MIN_BALLS_WATER: readonly { balls: number; ballG: number; maxWaterF: number }[] = [
  { balls: 1, ballG: 240, maxWaterF: 152.2 },
  { balls: 1, ballG: 265, maxWaterF: 146.0 },
  { balls: 2, ballG: 265, maxWaterF: 116.5 },
];

/**
 * §5. The app and the vectors deliberately use different flour temperatures,
 * and the gap between them is a constant.
 *
 * The vectors pin flour at 69 °F so the flour term stays independently
 * observable — a bug swapping `Cf` and `Cs` fails a test rather than hiding.
 * The app defaults flour to room (70 °F), because that is what a bag of flour
 * in the kitchen actually is. Both are correct; **a number quoted without its
 * conditions is the defect.**
 *
 * The offset is `Cf/Cw` = (0.35 × 0.42) / (0.375 × 1.00), which has no `F` in
 * it — so it is exactly 0.392 at every batch size and every ball weight, and
 * the per-mix division cancels. Verified as a single distinct value across
 * balls 3–24 × 240/265/300 g.
 */
export const APP_DEFAULT_FLOUR_OFFSET_F = 0.392;

/** Assertion tolerances. §5: +/-0.1 g, +/-0.1 degF. */
export const TOL = { grams: 0.1, degF: 0.1, ady: 0.005, weight: 0.0001 } as const;
