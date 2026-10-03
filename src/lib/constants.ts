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
  /**
   * The Halo Core's bowl, measured once on a kitchen scale. FIXED, not an input
   * (MESSAGE-29): the app supports only this mixer, and its bowl never changes.
   * Renamed from DEFAULT_BOWL_MASS_G because it is no longer a default.
   */
  BOWL_MASS_G: 965,
  /**
   * §7.5. The Core has no number display: its LED indicator shows speed in
   * segments, a fully lit one 10% and a half-lit one 5% (Ooni help center).
   */
  INDICATOR_PCT_PER_SEGMENT: 10,

  // Ooni Halo Core limits — from Ooni's help center, "min/max capacity and
  // hydration limits" (§3, §11 since MESSAGE-34). MIN_BALLS is ours (§4.4).
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
  // No FLOUR_CAP_55 since MESSAGE-53: it only ever split the biga, which is
  // mixed by hand, and Phase A's 55% dough is under FLOUR_CAP_66's tighter cap.
  /**
   * Ooni's published maximum continuous operating time for the spiral hook,
   * minutes (help center, §11). Read by the profile assertion in
   * `tests/constants.test.ts` and bound into `mix-6` / `mix-7` prose as
   * `{maxRunMin}`, so the number lives in one place.
   */
  MAX_RUN_MIN: 20,

  /**
   * §4.6. The ceiling of Phase C's temperature authority, minutes — the longest
   * run the recipe actually lets a user produce, against the 3–4 min printed on
   * the card. Stretching past this trades gluten development for temperature
   * and loses both, so it is the number the run-time assertion must use.
   */
  PHASE_C_MAX_MIN: 5.5,

  // Speed. Two anchors, one measured and one published; the line through them
  // is DERIVED below (MESSAGE-28).
  RPM_AT_5_PCT: 60, // MEASURED: 20 hook revolutions in 20 s at 5% (first-bake calibration)
  RPM_AT_100_PCT: 300, // Ooni's published maximum at 100%

  // Friction rate by dial %, °F per minute of run time
  FRICTION_RATE: { 15: 0.75, 20: 0.86, 30: 1.08 },

  // Defaults
  DEFAULT_BALL_G: 265,
  // No DEFAULT_FF since MESSAGE-52: before the log has a counted bake, the FF
  // in use at every mix size is bake 1's normalized FF, solved from its
  // readings (`BAKE_1_SEED` in bakeLog.ts).

  /**
   * §6, Panel 3. The FF in use at a mix size is the mean of its last three
   * counted bakes, and a size counts as calibrated at three: the upper end of
   * the recipe's two to three per size, which give a mean and a spread.
   */
  FF_HISTORY_BAKES: 3,
  /**
   * §10. Counted bakes at one mix size before the room-temperature slope is
   * fitted and reported. Reported only; §10 says why it isn't applied.
   */
  REGRESSION_MIN_BAKES: 8,

  /**
   * §4.4. Below this the target is colder than fridge water reaches, which is
   * the one and only case where ice gets mentioned. On the retarded-biga
   * schedule the model never asks for it anywhere in the supported envelope.
   *
   * The envelope's actual span is deliberately NOT restated here. It lives in
   * §5 and is asserted by `WATER_REACHABILITY` in tests/vectors.ts; this
   * comment used to carry 51.7-90.6 °F, the pre-per-mix figure from a sweep
   * that never went below ~9 balls, for several rounds after §5 corrected it.
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
   * which was unsourced. Of the temperatures the baker measures, this one moves
   * the water target most (FF and DDT move it more per °F, but aren't measured
   * at the bench): d(T_water)/d(T_biga) is -1.92 at 6 balls and -2.25 at 3, so a 6 °F miss
   * moves the required water 11.5 °F.
   */
  DEFAULT_BIGA_TEMP_F: 58,

  /**
   * §4.7. Hours between the end of one mix and the start of the next on a split
   * batch. Dave's estimate of his own workflow, NOT a measurement, and it
   * assumes every mix is weighed out before the first starts (§8 mix-1). Time
   * it on the first split bake: every 5 min here moves the rise correction by
   * 2.5 min per changeover.
   */
  CHANGEOVER_H: 5 / 60,

  /**
   * §4.7 (MESSAGE-53). Divide and ball, in MINUTES: `DIVIDE_BASE_MIN +
   * DIVIDE_PER_BALL_MIN × balls`, divided by 60 once (`divideBallH` in
   * timeline.ts). ESTIMATES: Dave hasn't timed a divide. The base is the middle
   * of `bulk-2`'s 10–15 min rest; the per-ball figure keeps 6 balls at the
   * flat 20 minutes this replaced.
   *
   * ⚠️ Minutes, not hours. A rounded hour figure is the "displayed value as an
   * input" error §4.7 warns about: 0.33 for 20/60 was the whole of the
   * 28.41-vs-28.42 disagreement at nMix 3.
   */
  DIVIDE_BASE_MIN: 12.5,
  DIVIDE_PER_BALL_MIN: 1.25,
  /**
   * §4.7. Biga out of the fridge before mixing, in hours. Retarded only — on
   * the classic track the biga is already at room temperature and this stage is
   * zero.
   *
   * Named rather than inlined because `biga-6` binds it as `{bigaTemper}` in
   * both its summary and its timer. A literal in `stageDurations` and another
   * in `bindTokens` is the shape that put `divideBall` at 0.33.
   */
  BIGA_TEMPER_H: 1,

  /** Split of the fresh water between Phase A and Phase B. §5 of the update. */
  PHASE_A_FRACTION: 0.6,

  // Shaped rise time — §4.8
  BASE_ROOM_MIN: 90, // at DDT
  /**
   * Minutes at DDT: the extra fermentation a ball gets on its way down to
   * fridge temperature, beyond what the fridge itself gives. ESTIMATED, not
   * measured (MESSAGE-52): `Q_DOUBLING_F` applied to a 265 g ball cooling
   * 75 → 40 °F in 3–4 h gives 29–39. It depends on how fast the fridge cools
   * the balls, so a new fridge or a move means measuring it again.
   */
  COOLDOWN_EQUIV_MIN: 35,
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

/**
 * Fresh flour as a fraction of total flour: 0.350. Named rather than inlined
 * because it appears in the formula, the batch table and the offset below —
 * and because 0.35 and 0.375 are the pair most easily mistaken for each other.
 */
const FRESH_FLOUR_FRACTION = 1 - BASE.BIGA_FRACTION;

/**
 * Fresh water as a fraction of total flour: 0.375.
 *
 * ⚠️ Numerically equal to 100 × `ADY_OF_BIGA_FLOUR`, which is a coincidence and
 * nothing more. They share no inputs; do not let one stand in for the other.
 */
const FRESH_WATER_FRACTION = BASE.HYDRATION - BASE.BIGA_FRACTION * BASE.BIGA_HYDRATION;

/**
 * §5. The flour part of the gap between a rendered water target and its
 * vector value, in °F: the app's flour at room (70) against the vectors' 69.
 * The FF in use supplies the rest. Before the log has a counted bake that is
 * bake 1's normalized 10.791045 against the vectors' 14, which adds
 * `(14 − FF) × Ct/Cw` = 9.634 the other way: the app sits 9.242 °F above the
 * vectors (engine.test.ts, 'adds the FF in use at every mix size').
 *
 * The vectors pin flour at 69 °F so the flour term stays independently
 * observable; the app defaults flour to room (70 °F), which is what a bag of
 * flour actually is. Both are deliberate — a number quoted without its
 * conditions is the defect, not either convention.
 *
 * DERIVED, not hardcoded, for the same reason as `C_BIGA` and
 * `ADY_OF_BIGA_FLOUR`. It is `Cf/Cw`, which has no total-flour term in it and
 * so is identical at every batch size — but it very much has the formula in it,
 * and 0.392 is only true of THIS formula:
 *
 *     as shipped 0.392 · hydration 65% 0.452 · biga 60% 0.420 · biga hyd 45% 0.361
 *
 * A literal 0.392 would be correct today and silently wrong the first time
 * anyone moved the formula.
 */
const APP_DEFAULT_FLOUR_OFFSET_F =
  (FRESH_FLOUR_FRACTION * BASE.C_FLOUR) / (FRESH_WATER_FRACTION * BASE.C_WATER);

/**
 * §3. The dial-to-RPM line through its two anchors: 2.5263… RPM per dial %,
 * from 47.368… at zero. It assumes the 20 dial levels are evenly spaced; only
 * the 5% end is measured.
 *
 * DERIVED, not hardcoded. It was `RPM_INTERCEPT: 47.4, RPM_SLOPE: 2.526` — the
 * same line rounded in this file, which put the measured point itself at
 * 60.03. No displayed RPM moved when it was derived (25% is the closest call,
 * 110.53 against 110.55); prose prints the line as `47.4 + 2.526 × dial%`,
 * which is display rounding of these.
 */
const RPM_SLOPE = (BASE.RPM_AT_100_PCT - BASE.RPM_AT_5_PCT) / (100 - 5);
const RPM_INTERCEPT = BASE.RPM_AT_5_PCT - 5 * RPM_SLOPE;

export const C = {
  ...BASE,
  RPM_SLOPE,
  RPM_INTERCEPT,
  C_BIGA,
  ADY_OF_BIGA_FLOUR,
  IDY_OF_BIGA_FLOUR,
  FRESH_FLOUR_FRACTION,
  FRESH_WATER_FRACTION,
  APP_DEFAULT_FLOUR_OFFSET_F,
} as const;

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

/**
 * Dial to RPM, on the line through the measured 5% and Ooni's published 100%.
 * Spec §9 — Ooni's help-center chart, which puts 5% at 15 RPM, is wrong.
 */
export function rpmForDial(dialPercent: number): number {
  return C.RPM_INTERCEPT + C.RPM_SLOPE * dialPercent;
}

/** One indicator segment as the Core shows it: lit, dimmed (the half step), or off. */
export type SegmentState = 'lit' | 'dim' | 'off';

/**
 * §7.5, per segment in fill order. Dave, at the mixer (25 Sep 2026): a half
 * step is the next segment DIMMED, not half of it filled — so 15% is one lit
 * and one dim, and 5% is the first segment dim.
 */
export function indicatorSegments(dialPercent: number): SegmentState[] {
  const { full, half, total } = indicatorForDial(dialPercent);
  return Array.from({ length: total }, (_, i) => (i < full ? 'lit' : i === full && half ? 'dim' : 'off'));
}

/**
 * §7.5. What the Core's LED indicator shows at a dial percentage:
 * `floor(dial / INDICATOR_PCT_PER_SEGMENT)` segments lit, the next one dimmed
 * when the remainder is 5, out of `100 / INDICATOR_PCT_PER_SEGMENT`.
 */
export function indicatorForDial(dialPercent: number): { full: number; half: boolean; total: number } {
  const per = C.INDICATOR_PCT_PER_SEGMENT;
  return {
    full: Math.floor(dialPercent / per),
    half: dialPercent % per === per / 2,
    total: 100 / per,
  };
}
