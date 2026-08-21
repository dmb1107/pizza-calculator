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
  ADY_OF_BIGA_FLOUR: 0.0038, // Giorilli standard: 1% fresh = 0.30% IDY = 0.38% ADY
  OVERAGE: 1.022, // 2.2% for scrap and bowl residue
  DOUGH_YIELD: 1.728, // 1 + HYDRATION + SALT

  // Specific heats, cal/g·°C (numerically equal to BTU/lb·°F)
  C_FLOUR: 0.42,
  C_WATER: 1.0,
  C_SALT: 0.21,

  // Ice
  LATENT_F: 144, // 80 cal/g expressed as °F of liquid-water equivalent
  C_ICE: 0.5, // ice specific heat relative to water

  // Ooni Halo Core limits
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
  DEFAULT_FF: 14, // °F, until the user measures their own
  DEFAULT_FREEZER_F: 16,
  DEFAULT_TAP_F: 60,
} as const;

/**
 * Specific heat of a 50%-hydration biga, cal/g·°C. Spec §3 quotes 0.6133;
 * it is derived here rather than hardcoded so it follows automatically if
 * BIGA_HYDRATION ever changes.
 */
const C_BIGA =
  (1 / (1 + BASE.BIGA_HYDRATION)) * BASE.C_FLOUR +
  (BASE.BIGA_HYDRATION / (1 + BASE.BIGA_HYDRATION)) * BASE.C_WATER;

export const C = { ...BASE, C_BIGA } as const;

/** DDT default: 75 °F for <=6 balls, 74 °F for 7+. Spec §4.3. User-overridable. */
export function defaultDdtF(balls: number): number {
  return balls <= 6 ? 75 : 74;
}

/** Measured dial-to-RPM mapping. Spec §9 — Ooni's published 5% = 15 RPM chart is wrong. */
export function rpmForDial(dialPercent: number): number {
  return C.RPM_INTERCEPT + C.RPM_SLOPE * dialPercent;
}
