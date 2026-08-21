/**
 * Test vectors — WEBSITE-SPEC-biga-calculator.md §5, transcribed verbatim.
 *
 * "Generated from a verified reference implementation." Tolerance +/-0.1 g,
 * +/-0.1 degF. These are the acceptance criteria for the calculation engine:
 * get them green before writing any UI (spec §12).
 *
 * All BATCH_VECTORS rows use FF = 14, T_biga = 64, T_flour = 70, T_room = 70,
 * tap = 60, freezer = 16, and default DDT (75 for <=6 balls, 74 for 7+).
 */

export const VECTOR_CONDITIONS = {
  ff: 14,
  tBigaF: 64,
  tFlourF: 70,
  tRoomF: 70,
  tapF: 60,
  freezerF: 16,
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
  salt: number;
  doughTotal: number;
  nBiga: number;
  nMix: number;
  waterTempF: number;
  iceG: number;
  tapG: number;
}

export const BATCH_VECTORS: readonly BatchVector[] = [
  // balls ballG      F  bigaFlour bigaWater bigaADY freshFlour freshWater  salt doughTotal nBiga nMix waterTemp   ice    tap
  { balls: 3,  ballG: 265, F: 470.2,  bigaFlour: 305.6,  bigaWater: 152.8, bigaADY: 1.16, freshFlour: 164.6, freshWater: 176.3,  salt: 13.2, doughTotal: 812.5,  nBiga: 1, nMix: 1, waterTempF: 52.5, iceG: 7.3,  tapG: 169.0 },
  { balls: 6,  ballG: 265, F: 940.4,  bigaFlour: 611.2,  bigaWater: 305.6, bigaADY: 2.32, freshFlour: 329.1, freshWater: 352.6,  salt: 26.3, doughTotal: 1625.0, nBiga: 1, nMix: 1, waterTempF: 52.5, iceG: 14.6, tapG: 338.0 },
  { balls: 9,  ballG: 265, F: 1410.6, bigaFlour: 916.9,  bigaWater: 458.4, bigaADY: 3.48, freshFlour: 493.7, freshWater: 529.0,  salt: 39.5, doughTotal: 2437.5, nBiga: 1, nMix: 1, waterTempF: 49.5, iceG: 30.7, tapG: 498.2 },
  { balls: 12, ballG: 265, F: 1880.8, bigaFlour: 1222.5, bigaWater: 611.2, bigaADY: 4.65, freshFlour: 658.3, freshWater: 705.3,  salt: 52.7, doughTotal: 3250.0, nBiga: 1, nMix: 2, waterTempF: 49.5, iceG: 41.0, tapG: 664.3 },
  { balls: 18, ballG: 265, F: 2821.1, bigaFlour: 1833.7, bigaWater: 916.9, bigaADY: 6.97, freshFlour: 987.4, freshWater: 1057.9, salt: 79.0, doughTotal: 4874.9, nBiga: 2, nMix: 2, waterTempF: 49.5, iceG: 61.5, tapG: 996.5 },
  { balls: 5,  ballG: 270, F: 798.4,  bigaFlour: 519.0,  bigaWater: 259.5, bigaADY: 1.97, freshFlour: 279.5, freshWater: 299.4,  salt: 22.4, doughTotal: 1379.7, nBiga: 1, nMix: 1, waterTempF: 52.5, iceG: 12.4, tapG: 287.0 },
  { balls: 7,  ballG: 260, F: 1076.4, bigaFlour: 699.7,  bigaWater: 349.8, bigaADY: 2.66, freshFlour: 376.7, freshWater: 403.7,  salt: 30.1, doughTotal: 1860.0, nBiga: 1, nMix: 1, waterTempF: 49.5, iceG: 23.4, tapG: 380.2 },
];

/**
 * Water temperature under varied conditions, 9 balls x 265 g. Spec §5.
 * The T_biga = 42 row is important: a fridge-retarded biga requires WARM
 * water. If the UI cannot express that, it is wrong.
 */
export interface WaterTempVector {
  ddtF: number;
  ff: number;
  tBigaF: number;
  tRoomF: number;
  waterTempF: number;
}

export const WATER_TEMP_VECTORS: readonly WaterTempVector[] = [
  { ddtF: 74, ff: 12, tBigaF: 64, tRoomF: 70, waterTempF: 55.5 },
  { ddtF: 74, ff: 12, tBigaF: 68, tRoomF: 70, waterTempF: 49.2 },
  { ddtF: 74, ff: 18, tBigaF: 72, tRoomF: 78, waterTempF: 21.5 },
  { ddtF: 74, ff: 12, tBigaF: 42, tRoomF: 70, waterTempF: 90.6 }, // warm water
  { ddtF: 74, ff: 12, tBigaF: 62, tRoomF: 64, waterTempF: 61.2 },
];

/** Ice effective temperature by freezer temperature. Spec §5. */
export const ICE_EFF_VECTORS: readonly { freezerF: number; iceEffF: number }[] = [
  { freezerF: 32, iceEffF: -112 },
  { freezerF: 16, iceEffF: -120 },
  { freezerF: 0, iceEffF: -128 },
];

/** Scale-invariant thermal weights, identical at every batch size. Spec §4.2. */
export const THERMAL_WEIGHTS = { biga: 0.5311, flour: 0.1306, water: 0.3331, salt: 0.0052 } as const;

/** Ice per 100 g water, 60 degF tap, 16 degF freezer ice. Spec §9. */
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

/** Assertion tolerances. Spec §5: +/-0.1 g, +/-0.1 degF. */
export const TOL = { grams: 0.1, degF: 0.1, ady: 0.005, weight: 0.0001 } as const;
