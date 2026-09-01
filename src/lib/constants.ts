/**
 * Constants — WEBSITE-SPEC-biga-calculator.md §3.
 *
 * These numbers are load-bearing and were derived and cross-checked by hand.
 * Do not "simplify" one because it looks like a rounding artifact: a plausible
 * wrong answer here is not obvious until 50 hours of fermentation later.
 * Ask before deviating on any value.
 */

const BASE = {
  // Formula
  HYDRATION: 0.7, // total water / total flour
  SALT: 0.028, // of total flour
  BIGA_FRACTION: 0.65, // of total flour
  BIGA_HYDRATION: 0.5, // water / flour within the biga
  /**
   * Giorilli standard. The PUBLISHED anchor is the fresh-yeast dose; everything
   * after it is unit conversion, so `ADY_OF_BIGA_FLOUR` is derived below rather
   * than hardcoded as a rounded 0.0038. Earlier drafts printed 0.38% in prose
   * while computing at 0.375%, so the two documents disagreed by 1.3% of the
   * yeast. 0.00375 is exact.
   */
  FRESH_YEAST_OF_BIGA_FLOUR: 0.01,
  FRESH_TO_IDY: 0.3, // 1% fresh -> 0.30% IDY
  IDY_TO_ADY: 1.25,
  OVERAGE: 1.022, // 2.2% for scrap and bowl residue
  DOUGH_YIELD: 1.728, // 1 + HYDRATION + SALT

  // Specific heats, cal/g·°C (numerically equal to BTU/lb·°F)
  C_FLOUR: 0.42,
  C_WATER: 1.0,
  C_SALT: 0.21,

  // Mixer bowl — REQUIRED thermal mass, do not omit.
  // Omitting it made the water temperature 5 degF wrong on bake 1.
  C_BOWL_SPECIFIC_HEAT: 0.12, // stainless, cal/g·°C
  DEFAULT_BOWL_MASS_G: 965, // measured; user-editable, persisted

  // Ooni Halo Core limits
  /**
   * §4.4. Smallest supported MACHINE batch. Two independent reasons point here:
   * 2 balls is 542 g, which clears the 500 g floor on paper but won't let a
   * spiral hook grip, AND it asks for 116 °F water because the fixed-mass bowl
   * is such a large share of a small system. The arithmetic still scales below
   * 3 for hand mixing — it is the machine batch that has a floor.
   */
  MIN_BALLS: 3,
  MAX_DOUGH: 2500, // g
  MIN_DOUGH: 500, // g
  FLOUR_CAP_66: 1505, // g, at 66%+ hydration (final mix)
  FLOUR_CAP_55: 1610, // g, at 55-59% hydration (biga)
  MAX_RUN_MIN: 20, // continuous

  // Speed
  RPM_INTERCEPT: 47.4, // RPM = 47.4 + 2.526 * dial%   (measured: 5% = 60 RPM)
  RPM_SLOPE: 2.526,

  // Friction rate by dial %, °F per minute of run time
  FRICTION_RATE: { 15: 0.75, 20: 0.86, 30: 1.08 },

  // Defaults
  DEFAULT_BALL_G: 265,
  /**
   * °F, MEASURED at 6 balls on bake 1 (21 Aug 2026).
   * This is the rise the mixer produces in the DOUGH ALONE — see §4.3.
   */
  DEFAULT_FF: 14.0,

  /**
   * §4.4. Below this the target is colder than fridge water reaches, which is
   * the one and only case where ice gets mentioned. On the retarded-biga
   * schedule the model never asks for it: the required water spans 51.7-90.6 °F
   * across every batch size and kitchen temperature.
   */
  WATER_MIN_F: 38,

  /**
   * §4.4. Above what a domestic tap delivers — 120 °F is where scald limits
   * start. With MIN_BALLS = 3 this fires nowhere in the temperature grid at the
   * default FF; it guards a user-entered calibration FF or an out-of-band
   * reading. Reachable, just not from the temperatures alone.
   */
  WATER_MAX_F: 120,

  /**
   * §6. The one biga temperature ever measured (bake 1, after tearing). Was 64,
   * which was unsourced. This is the highest-leverage input in the model:
   * d(T_water)/d(T_biga) is -1.92 at 6 balls and -2.25 at 3, so a 6 °F miss
   * moves the required water 11.5 °F.
   */
  DEFAULT_BIGA_TEMP_F: 58,

  /**
   * §4.7. Hours between the end of one mix and the start of the next on a split
   * batch. Dave's estimate of his own workflow, NOT a measurement, and it
   * assumes mix 2 is weighed out before mix 1 starts (§8 mix-1). Time it on the
   * first split bake: every 5 min here moves the rise correction by 2.5 min.
   */
  CHANGEOVER_H: 5 / 60,

  /**
   * §4.7. Divide-and-ball, in hours. The quantity is **20 minutes**; the 0.33
   * the spec table displays is a rounded rendering of it.
   *
   * ⚠️ Expressed as 20/60 rather than 0.33 deliberately. Baking the displayed
   * figure into the source is exactly the "never treat a displayed value as an
   * input" error §4.7 warns about — and it is worth 0.0033 h, which is the
   * whole of the 28.41-vs-28.42 disagreement at nMix 3.
   */
  DIVIDE_BALL_H: 20 / 60,

  /** Split of the fresh water between Phase A and Phase B. §5 of the update. */
  PHASE_A_FRACTION: 0.6,

  // Shaped rise time — §4.8
  BASE_ROOM_MIN: 90, // at DDT
  COOLDOWN_EQUIV_MIN: 150, // cooldown's equivalent fermentation at DDT (a modelling estimate)
  Q_DOUBLING_F: 17,
  ROOM_MIN_CLAMP: [45, 180],
} as const;

/**
 * Specific heat of a 50%-hydration biga, cal/g·°C. Spec §3 quotes 0.6133;
 * it is derived here rather than hardcoded so it follows automatically if
 * BIGA_HYDRATION ever changes.
 */
const C_BIGA =
  (1 / (1 + BASE.BIGA_HYDRATION)) * BASE.C_FLOUR +
  (BASE.BIGA_HYDRATION / (1 + BASE.BIGA_HYDRATION)) * BASE.C_WATER;

/**
 * ADY as a fraction of biga flour: 0.00375 exactly. Derived, not hardcoded, for
 * the same reason as C_BIGA — the sourced figure is the 1% fresh-yeast dose and
 * the rest is unit conversion.
 */
const ADY_OF_BIGA_FLOUR =
  BASE.FRESH_YEAST_OF_BIGA_FLOUR * BASE.FRESH_TO_IDY * BASE.IDY_TO_ADY;

/** IDY as a fraction of biga flour: 0.00300. Reference only; the recipe uses ADY. */
const IDY_OF_BIGA_FLOUR = BASE.FRESH_YEAST_OF_BIGA_FLOUR * BASE.FRESH_TO_IDY;

export const C = { ...BASE, C_BIGA, ADY_OF_BIGA_FLOUR, IDY_OF_BIGA_FLOUR } as const;

/**
 * Heat capacity of the mixer bowl, cal/°C. 115.8 at the 965 g default —
 * comparable to the fresh flour, and larger than it below about 5 balls.
 *
 * The bowl absorbs friction energy alongside the dough. It is fixed mass while
 * everything else scales with flour, which is why the thermal model is no
 * longer scale-independent and why the bowl cannot simply be folded into the
 * friction factor.
 */
export function bowlHeatCapacity(bowlMassG: number): number {
  return bowlMassG * C.C_BOWL_SPECIFIC_HEAT;
}

/** DDT default: 75 °F for <=6 balls, 74 °F for 7+. Spec §4.3. User-overridable. */
export function defaultDdtF(balls: number): number {
  return balls <= 6 ? 75 : 74;
}

/** Measured dial-to-RPM mapping. Spec §9 — Ooni's published 5% = 15 RPM chart is wrong. */
export function rpmForDial(dialPercent: number): number {
  return C.RPM_INTERCEPT + C.RPM_SLOPE * dialPercent;
}
