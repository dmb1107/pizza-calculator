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
  tapF: 60,
  freezerF: 16,
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
  /** Dough-only heat capacity. The friction work term uses this, not Ct + C_bowl. */
  Ct: number;
  ddtF: number;
  waterTempF: number;
  probeTargetF: number;
  nBiga: number;
  nMix: number;
}

export const BATCH_VECTORS: readonly BatchVector[] = [
  { balls: 3,  ballG: 265, F: 470.2,  bigaFlour: 305.6,  bigaWater: 152.8, bigaADY: 1.16, freshFlour: 164.6, freshWater: 176.3,  phaseA: 105.8, phaseB: 70.5,  salt: 13.2, Ct: 529.4,  ddtF: 75, waterTempF: 73.7, probeTargetF: 72.2, nBiga: 1, nMix: 1 },
  { balls: 6,  ballG: 265, F: 940.4,  bigaFlour: 611.2,  bigaWater: 305.6, bigaADY: 2.32, freshFlour: 329.1, freshWater: 352.6,  phaseA: 211.6, phaseB: 141.1, salt: 26.3, Ct: 1058.7, ddtF: 75, waterTempF: 68.1, probeTargetF: 71.8, nBiga: 1, nMix: 1 },
  { balls: 9,  ballG: 265, F: 1410.6, bigaFlour: 916.9,  bigaWater: 458.4, bigaADY: 3.48, freshFlour: 493.7, freshWater: 529.0,  phaseA: 317.4, phaseB: 211.6, salt: 39.5, Ct: 1588.1, ddtF: 74, waterTempF: 63.0, probeTargetF: 70.5, nBiga: 1, nMix: 1 },
  { balls: 12, ballG: 265, F: 1880.8, bigaFlour: 1222.5, bigaWater: 611.2, bigaADY: 4.65, freshFlour: 658.3, freshWater: 705.3,  phaseA: 423.2, phaseB: 282.1, salt: 52.7, Ct: 2117.5, ddtF: 74, waterTempF: 62.1, probeTargetF: 70.4, nBiga: 1, nMix: 2 },
  { balls: 18, ballG: 265, F: 2821.1, bigaFlour: 1833.7, bigaWater: 916.9, bigaADY: 6.97, freshFlour: 987.4, freshWater: 1057.9, phaseA: 634.8, phaseB: 423.2, salt: 79.0, Ct: 3176.2, ddtF: 74, waterTempF: 61.3, probeTargetF: 70.3, nBiga: 2, nMix: 2 },
  { balls: 5,  ballG: 270, F: 798.4,  bigaFlour: 519.0,  bigaWater: 259.5, bigaADY: 1.97, freshFlour: 279.5, freshWater: 299.4,  phaseA: 179.6, phaseB: 119.8, salt: 22.4, Ct: 898.9,  ddtF: 75, waterTempF: 69.1, probeTargetF: 71.9, nBiga: 1, nMix: 1 },
  { balls: 7,  ballG: 260, F: 1076.4, bigaFlour: 699.7,  bigaWater: 349.8, bigaADY: 2.66, freshFlour: 376.7, freshWater: 403.7,  phaseA: 242.2, phaseB: 161.5, salt: 30.1, Ct: 1211.9, ddtF: 74, waterTempF: 64.1, probeTargetF: 70.6, nBiga: 1, nMix: 1 },
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
export const BOWL_DILUTION: readonly { balls: number; bowlShare: number; apparentFF: number }[] = [
  { balls: 3, bowlShare: 0.18, apparentFF: 11.5 },
  { balls: 6, bowlShare: 0.099, apparentFF: 12.6 },
  { balls: 9, bowlShare: 0.068, apparentFF: 13.0 },
  { balls: 12, bowlShare: 0.052, apparentFF: 13.3 },
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

/** Ice effective temperature by freezer temperature. §5. */
export const ICE_EFF_VECTORS: readonly { freezerF: number; iceEffF: number }[] = [
  { freezerF: 32, iceEffF: -112 },
  { freezerF: 16, iceEffF: -120 },
  { freezerF: 0, iceEffF: -128 },
];

/**
 * DOUGH-ONLY thermal weights. These stay scale-invariant.
 *
 * ⚠️ Bowl-inclusive shares are NOT scale-invariant and must never be asserted
 * as such — §4.2 says any such test is to be deleted, not loosened.
 */
export const THERMAL_WEIGHTS = { biga: 0.5311, flour: 0.1306, water: 0.3331, salt: 0.0052 } as const;

/** Ice per 100 g water, 60 degF tap, 16 degF freezer ice. §9. */
export const ICE_PER_100G: readonly { waterTempF: number; iceG: number }[] = [
  { waterTempF: 55, iceG: 2.8 },
  { waterTempF: 50, iceG: 5.6 },
  { waterTempF: 45, iceG: 8.3 },
  { waterTempF: 40, iceG: 11.1 },
  { waterTempF: 35, iceG: 13.9 },
  { waterTempF: 30, iceG: 16.7 },
  { waterTempF: 25, iceG: 19.4 },
  { waterTempF: 20, iceG: 22.2 },
];

/** Assertion tolerances. §5: +/-0.1 g, +/-0.1 degF. */
export const TOL = { grams: 0.1, degF: 0.1, ady: 0.005, weight: 0.0001 } as const;
