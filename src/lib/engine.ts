/**
 * Calculation engine — WEBSITE-SPEC-biga-calculator.md §4.
 *
 * Pure functions, no UI imports, no rounding. This is the part that gets
 * unit-tested against the §5 vectors, and it is the whole product: a wrong
 * number here ruins 50 hours of work.
 *
 * Two rules that are easy to violate by accident:
 *   - Nothing is rounded. Callers round at the display boundary via
 *     `src/lib/format.ts`.
 *   - Nothing derived is hardcoded. The thermal weights in particular are
 *     computed from component heat capacities, because their being derived is
 *     what makes them a meaningful assertion target (§4.2).
 */

import { C, bowlHeatCapacity, ddtForBallsPerMix } from './constants';
import { formatTempF } from './format';
import { FRICTION_AFTER_PROBE_F } from './mixPhases';

// ---------------------------------------------------------------------------
// §4.1 Formula
// ---------------------------------------------------------------------------

export interface BatchInputs {
  /** Number of dough balls. */
  balls: number;
  /** Finished weight of one ball, grams. */
  ballWeightG: number;
}

export interface Formula {
  /** Total flour, biga + fresh. */
  flourTotal: number;
  bigaFlour: number;
  bigaWater: number;
  /** bigaFlour + bigaWater. Excludes the ADY, which §5 counts separately. */
  bigaMass: number;
  bigaADY: number;
  freshFlour: number;
  freshWater: number;
  /**
   * Phase A water, 60% of the fresh water. In grams because "~60% of the
   * water" caused a guess on bake 1 and cost a data point.
   */
  phaseAWater: number;
  /** Phase B water, the remaining 40%, added across 3 additions. */
  phaseBWater: number;
  salt: number;
  doughTotal: number;
}

/** §4.1. Every mass scales linearly with total flour. */
export function computeFormula({ balls, ballWeightG }: BatchInputs): Formula {
  const flourTotal = (balls * ballWeightG * C.OVERAGE) / C.DOUGH_YIELD;
  const bigaFlour = flourTotal * C.BIGA_FRACTION;
  const bigaWater = bigaFlour * C.BIGA_HYDRATION;
  // Same quantities as `flourTotal × HYDRATION − bigaWater` and
  // `flourTotal − bigaFlour`, expressed through the named fractions so the
  // formula and the derived offset cannot drift apart.
  const freshWater = flourTotal * C.FRESH_WATER_FRACTION;

  return {
    flourTotal,
    bigaFlour,
    bigaWater,
    bigaMass: bigaFlour + bigaWater,
    bigaADY: bigaFlour * C.ADY_OF_BIGA_FLOUR,
    freshFlour: flourTotal * C.FRESH_FLOUR_FRACTION,
    freshWater,
    // Weighable grams, not a percentage to estimate. §8.2 mix-2 / mix-3.
    phaseAWater: freshWater * C.PHASE_A_FRACTION,
    phaseBWater: freshWater * (1 - C.PHASE_A_FRACTION),
    salt: flourTotal * C.SALT,
    doughTotal: flourTotal * C.DOUGH_YIELD,
  };
}

// ---------------------------------------------------------------------------
// §4.2 Thermal weights
// ---------------------------------------------------------------------------

export interface Thermal {
  /** Mixes this batch runs as. The weights below are for ONE of them. */
  nMix: number;
  /** The component masses of a single mix — batch totals divided by nMix. */
  perMix: { bigaMass: number; freshFlour: number; freshWater: number; salt: number };
  /** Heat capacity of the biga, cal/°C. */
  cBiga: number;
  cFreshFlour: number;
  cFreshWater: number;
  cSalt: number;
  /** Dough only: Cb + Cf + Cw + Cs. The friction work term uses THIS. */
  cTotal: number;
  /** Heat capacity of the mixer bowl. 115.56 at the 963 g bowl. */
  cBowl: number;
  /** cTotal + cBowl. The system the temperature is averaged over. */
  cSystem: number;
  /**
   * Fractions of the DOUGH-ONLY total. These stay scale-invariant at
   * ~0.5311 / 0.1306 / 0.3331 / 0.0052.
   *
   * Bowl-inclusive shares are NOT scale-invariant — the bowl is fixed mass
   * while the dough scales — so do not assert invariance on anything divided
   * by cSystem.
   */
  weights: { biga: number; flour: number; water: number; salt: number };
  /** cBowl / cSystem. 18.0% at a 3-ball mix, 6.8% at 9; never below 6.6%, the mixer cap's floor. */
  bowlShare: number;
}

/**
 * §4.2. Derived from component heat capacities rather than hardcoded.
 *
 * ⚠️ THE MASSES ARE PER-MIX, NOT BATCH TOTALS. `C_bowl` is one bowl, and the
 * bowl only ever faces one mix at a time — so feeding a 12-ball batch total
 * into the heat balance models the whole batch sitting against a single bowl,
 * which never happens. At the §5 vector conditions (biga and bowl 58 °F) that
 * error landed the water target 2.6 °F low at 12 balls and 1.8 °F low at 18;
 * across the envelope, 1.5–6.2 °F, largest with the coldest biga and
 * independent of room and flour. Every `nMix = 1` batch is unaffected.
 *
 * FF is per-mix by the same argument: it is the rise the mixer produces in the
 * dough actually in the bowl, and 14.03 was measured on a single 6-ball mix.
 */
export function computeThermal(
  f: Formula,
  bowlMassG: number = C.BOWL_MASS_G,
  nMix: number = 1,
): Thermal {
  const perMix = {
    bigaMass: f.bigaMass / nMix,
    freshFlour: f.freshFlour / nMix,
    freshWater: f.freshWater / nMix,
    salt: f.salt / nMix,
  };
  const cBiga = perMix.bigaMass * C.C_BIGA;
  const cFreshFlour = perMix.freshFlour * C.C_FLOUR;
  const cFreshWater = perMix.freshWater * C.C_WATER;
  const cSalt = perMix.salt * C.C_SALT;
  const cTotal = cBiga + cFreshFlour + cFreshWater + cSalt;
  const cBowl = bowlHeatCapacity(bowlMassG);

  return {
    nMix,
    perMix,
    cBiga,
    cFreshFlour,
    cFreshWater,
    cSalt,
    cTotal,
    cBowl,
    cSystem: cTotal + cBowl,
    weights: {
      biga: cBiga / cTotal,
      flour: cFreshFlour / cTotal,
      water: cFreshWater / cTotal,
      salt: cSalt / cTotal,
    },
    bowlShare: cBowl / (cTotal + cBowl),
  };
}

// ---------------------------------------------------------------------------
// §4.3 Required water temperature
// ---------------------------------------------------------------------------

export interface TempInputs {
  /** Desired dough temperature, °F. */
  ddtF: number;
  /**
   * Friction factor, °F.
   *
   * ⚠️ FF is the temperature rise the mixer produces in the DOUGH ALONE.
   * Covers mixer friction AND the hydration exotherm together.
   */
  frictionFactorF: number;
  /** Measured biga temperature at mix time, °F. The dominant term. */
  bigaTempF: number;
  flourTempF: number;
  roomTempF: number;
  /**
   * Bowl temperature, °F. Defaults to the biga temperature: the biga ferments
   * in the mixer bowl, so 19 h of contact leaves them at equilibrium when it
   * comes out of the fridge. The temper breaks that (§4.2, MESSAGE-63): on
   * bakes 2 and 3 the bowl read 9–10.5 °F above the biga at mix 1, so this
   * default runs low and the water target warm, by `C_bowl/Cw` times the gap.
   * The baker reads the bowl in every mix's prep step.
   */
  bowlTempF?: number;
}

/** T_bowl defaults to T_biga. §4.2. */
function bowlTemp(t: TempInputs): number {
  return t.bowlTempF ?? t.bigaTempF;
}

/**
 * §4.3. Water temperature required to land on DDT.
 *
 * ⚠️ THE TRAP: the work term is `FF × cTotal`, NOT `FF × cSystem`.
 *
 * FF is defined as the rise the mixer produces in the dough alone, so the
 * friction energy is `FF × cTotal` — that energy then spreads across the whole
 * system, dough plus bowl, which is why `cSystem` appears on the DDT side.
 * Using `FF × cSystem` returns a water temperature several degrees off while
 * looking entirely reasonable.
 *
 * The bowl is not a refinement. Omitting it made this output 5 °F wrong on the
 * first real bake.
 */
export function computeWaterTempF(t: TempInputs, thermal: Thermal): number {
  const { cBiga, cFreshFlour, cFreshWater, cSalt, cTotal, cBowl, cSystem } = thermal;
  return (
    (t.ddtF * cSystem -
      t.frictionFactorF * cTotal - // <- cTotal, never cSystem
      cBiga * t.bigaTempF -
      cFreshFlour * t.flourTempF -
      cSalt * t.roomTempF -
      cBowl * bowlTemp(t)) /
    cFreshWater
  );
}

/**
 * §4.3. Predicted final dough temperature for a water temperature actually used.
 *
 * The exact inverse of `computeWaterTempF`: feed that function's output back in
 * and this returns DDT.
 */
export function computeFinalTempF(
  t: TempInputs,
  thermal: Thermal,
  waterTempF: number,
): number {
  const { cBiga, cFreshFlour, cFreshWater, cSalt, cTotal, cBowl, cSystem } = thermal;
  return (
    (cBiga * t.bigaTempF +
      cFreshFlour * t.flourTempF +
      cFreshWater * waterTempF +
      cSalt * t.roomTempF +
      cBowl * bowlTemp(t) +
      t.frictionFactorF * cTotal) / // <- cTotal, never cSystem
    cSystem
  );
}

/**
 * §4.3. Solve FF from a bake that has been measured. This is what the bake log
 * uses — `final − predicted_mix` is the rise after the bowl diluted it, low by
 * `FF × C_bowl/(Ct + C_bowl)`: at FF 14, 2.5 °F at a 3-ball mix, 1.4 at 6,
 * 0.95 at 9 (§10).
 */
export function solveFrictionFactorF(
  t: Omit<TempInputs, 'frictionFactorF' | 'ddtF'>,
  thermal: Thermal,
  { waterTempF, finalTempF }: { waterTempF: number; finalTempF: number },
): number {
  const { cBiga, cFreshFlour, cFreshWater, cSalt, cTotal, cBowl, cSystem } = thermal;
  return (
    (finalTempF * cSystem -
      cBiga * t.bigaTempF -
      cFreshFlour * t.flourTempF -
      cFreshWater * waterTempF -
      cSalt * t.roomTempF -
      cBowl * bowlTemp({ ...t, ddtF: 0, frictionFactorF: 0 })) /
    cTotal
  );
}

// ---------------------------------------------------------------------------
// §4.4 Reaching the water temperature
// ---------------------------------------------------------------------------
//
// There is deliberately no ice calculation and no tap/ice split. The user
// blends fridge-cold water with tap water by hand, measuring as they pour, so
// the target temperature is the whole output.
//
// Ice bought precision that wasn't needed and cost reliability that was: its
// accuracy depended on the -120 °F equivalence being right AND on every gram
// melting before the temperature reading. Miss the second and the dough reads
// on target, then drifts cold, and the error propagates into the measured FF.
//
// The only thing left is the sub-38 °F warning in `buildWarnings` below.

// ---------------------------------------------------------------------------
// §4.2 Bowl prefill
// ---------------------------------------------------------------------------

/**
 * §4.2. The bowl's prefill at mix `index` (0-based), until the baker reads
 * it. Each row is a value already in the model — deliberately no new
 * constants — and a reading always wins.
 *
 * - **Mix 1:** that mix's biga reading. The biga ferments in the mixer bowl,
 *   so the bowl starts near it.
 * - **Later mixes:** `DDT`, an upper bound (§4.2, MESSAGE-25). The bowl can't
 *   come off a mix warmer than the dough it held, provided that mix finished
 *   at or below DDT. How far it cools during the changeover has never been
 *   measured, so it is not modelled; each later mix's prep step asks for a
 *   reading instead.
 *
 * ⚠️ There is no bowl-state selector (MESSAGE-54): with the bowl read in every
 * mix's prep step it was a second control for the same number.
 */
export function bowlPrefillF(index: number, { bigaTempF, ddtF }: { bigaTempF: number; ddtF: number }): number {
  return index === 0 ? bigaTempF : ddtF;
}

/**
 * §7.2's two bases for the biga's sensitivity. Nothing on the page prints
 * them (MESSAGE-54 removed the field hints); the tests pin both, and `mix-1`,
 * `mix-8` and `biga-6` explain them in prose. What a reading error costs
 * depends on whether the bowl figure moves with it:
 *
 * - **tracking** — the bowl is mix 1's prefill, i.e. the biga reading itself,
 *   so a wrong biga reading is a wrong bowl too: `(Cb + C_bowl)/Cw`. The
 *   other tracking case is a skipped temper, which leaves both at fridge
 *   temperature; the temper itself does not move them together (MESSAGE-63).
 * - **held** — the bowl is read, or prefilled from `DDT` on a later mix, so it
 *   stays put when the biga moves: `Cb/Cw`, scale-invariant.
 *
 * Quoting the tracking figure beside a measured bowl overstates the effect by
 * 41% at 3 balls of the default weight; the old panel hint did exactly that
 * until FINDINGS-25.
 *
 * Magnitudes: warmer biga means cooler water and warmer dough, and the prose
 * supplies the direction.
 */
export interface BigaReadingCost {
  /** °F of water per °F of biga. */
  waterPerF: number;
  /** °F of water a reading off by `errorF` moves the target. */
  waterF: number;
  /** °F the finished dough misses DDT by, having mixed with that water. */
  doughF: number;
}

export function bigaReadingCost(
  thermal: Thermal,
  bowlTracksBiga: boolean,
  errorF: number,
): BigaReadingCost {
  const moved = thermal.cBiga + (bowlTracksBiga ? thermal.cBowl : 0);
  const waterPerF = moved / thermal.cFreshWater;
  return {
    waterPerF,
    waterF: errorF * waterPerF,
    doughF: (errorF * moved) / thermal.cSystem,
  };
}

/**
 * §4.2. The bowl's own reading: °F of water per °F of bowl, what the same °F
 * does to the dough, and the ratio of the two — `cSystem/Cw`, 3.2–3.7 across
 * the legal envelope at the default bowl.
 *
 * The ratio is printed, not described. The hint said "three times" and then
 * "more than three times", resting on `cTotal/Cw` = 3.0023 — a margin of
 * 0.0023 that a 72% hydration (2.90) would erase for a light bowl. MESSAGE-25.
 */
export function bowlReadingCost(thermal: Thermal): {
  waterPerF: number;
  doughPerF: number;
  waterOverDough: number;
} {
  return {
    waterPerF: thermal.cBowl / thermal.cFreshWater,
    doughPerF: thermal.cBowl / thermal.cSystem,
    waterOverDough: thermal.cSystem / thermal.cFreshWater,
  };
}

// ---------------------------------------------------------------------------
// §4.5 Capacity splits
// ---------------------------------------------------------------------------

/**
 * §4.5. One biga at every size (MESSAGE-53, Dave's call): it is mixed by hand
 * and ferments in the mixer bowl, so no machine cap applies to it. At
 * `nMix > 1` it is divided by weight, once, in `mix-0`.
 */
export interface Capacity {
  /** Number of separate final mixes the Halo Core needs. */
  nMix: number;
  doughPerMix: number;
}

/** §4.5. */
export function computeCapacity(f: Formula): Capacity {
  const nMix = Math.max(
    1,
    Math.ceil(Math.max(f.doughTotal / C.MAX_DOUGH, f.flourTotal / C.FLOUR_CAP_66)),
  );
  return { nMix, doughPerMix: f.doughTotal / nMix };
}

/**
 * §6 Panel 2. The key the friction-factor map is stored under: FF is per-mix
 * by definition (§4.2), so a 12-ball batch — two 6-ball mixes — reads and
 * files under 6. A whole number for every count the app allows (MESSAGE-61);
 * deliberately not rounded, since a bake logged before then can carry 6.5 and
 * §6 is exact-match only.
 */
export function ballsPerMix(b: BatchInputs): number {
  return b.balls / computeCapacity(computeFormula(b)).nMix;
}

/** §4.2, §4.3: the default DDT for a batch, by its balls per mix (MESSAGE-61). */
export function defaultDdtFor(b: BatchInputs): number {
  return ddtForBallsPerMix(ballsPerMix(b));
}

// ---------------------------------------------------------------------------
// §4.6 Probe target
// ---------------------------------------------------------------------------

/**
 * §4.6. The temperature to expect partway through the mix, before Phases C and
 * D add their friction.
 *
 * The friction still to come is Phases C and D at their reference times and
 * friction rates (MESSAGE-52), diluted by the bowl's thermal mass. The
 * 10-minute rest sheds heat in proportion to the dough-to-room gap rather than
 * a flat 1 °F. No FF: it decides where the dough is when probed, which is what
 * the probe measures, and not what C and D still add.
 *
 * In a 70 °F room: 3 balls 72.3 · 6 balls 71.9 · 9 balls 70.6.
 */
export interface ProbeParts {
  /** `FRICTION_AFTER_PROBE_F × Ct/TOT` — friction still to come after the probe, as a probe reads it. */
  frictionRemainingF: number;
  /** `0.2 × (DDT − T_room)`, signed: positive when the rest cools the dough. */
  restSignedF: number;
  /** §4.10 `{restExchangeF}` — the same, unsigned. Prose says "toward room temperature". */
  restExchangeF: number;
  /** `DDT − target`, signed: negative when the target sits ABOVE DDT. §4.10 prints it as `{probeGapPhrase}`. */
  gapF: number;
  targetF: number;
}

/**
 * §4.6 decomposed, per §4.10. The ONE place the probe's formula lives —
 * `computeProbeTargetF` is built from this, so the parts the step prints and the
 * target the summary prints cannot come from two copies of the formula.
 *
 * Identity, before rounding: `gapF = frictionRemainingF − restSignedF`. The
 * parts are displayed rounded once each and may not visibly sum by 0.1; §4.10
 * says that is correct, since forcing them to add would mean rounding twice.
 */
export function computeProbeParts({
  ddtF,
  roomTempF,
  thermal,
}: {
  ddtF: number;
  roomTempF: number;
  thermal: Thermal;
}): ProbeParts {
  const frictionRemainingF = FRICTION_AFTER_PROBE_F * (thermal.cTotal / thermal.cSystem);
  const restSignedF = 0.2 * (ddtF - roomTempF);
  const gapF = frictionRemainingF - restSignedF;
  return {
    frictionRemainingF,
    restSignedF,
    restExchangeF: Math.abs(restSignedF),
    gapF,
    targetF: ddtF - gapF,
  };
}

export function computeProbeTargetF(args: Parameters<typeof computeProbeParts>[0]): number {
  return computeProbeParts(args).targetF;
}

/**
 * §4.6. Dough-only °F/min at a dial setting converted to what a THERMOMETER
 * will show.
 *
 * ⚠️ This is a unit convention, and conflating the two is the live failure mode
 * in this codebase. `FF` and `FRICTION_RATE` are dough-only quantities, to
 * match the `FF × Ct` work term. A probe reads the dough after it has
 * equilibrated with the bowl, so an observed rate is the dough-only rate times
 * `Ct / TOT` — 0.821 at 3 balls, 0.901 at 6, 0.932 at 9.
 *
 * Getting this backwards produced the old "probe at DDT − 4" rule, which was
 * 1.2 °F wrong at 3 balls. Every duration-to-temperature conversion in the app
 * routes through here so the two cannot drift apart again.
 */
export function observedRate(
  dialPercent: keyof typeof C.FRICTION_RATE,
  thermal: Thermal,
): number {
  return C.FRICTION_RATE[dialPercent] * (thermal.cTotal / thermal.cSystem);
}

// ---------------------------------------------------------------------------
// §4.8 Shaped rise time
// ---------------------------------------------------------------------------

/**
 * §4.8. Minutes the balls spend at room temperature before the fridge,
 * computed from the final dough temperature actually measured.
 *
 * This REPLACES the old fixed 1.5 h `ballRoomTemp` stage — it does not sit
 * alongside it. It drops under an hour from about 3.3 °F over DDT and passes
 * two hours from about 2.9 °F under, clamped to 45–180 min, so the old 1–2 h
 * range was wrong at both ends. It depends only on `T_actual − DDT`: key any
 * table of it on the offset, never on the dough temperature alone (MESSAGE-21).
 *
 * `COOLDOWN_EQUIV_MIN` is the cooldown's equivalent fermentation at DDT: a cool
 * dough loses ground on the counter AND on the way down to 40 °F, and this
 * compensates for the second. It is a modelling estimate, not a measurement.
 *
 * Planning mode: before mixing there is no measurement, so pass `ddtF` as
 * `finalDoughTempF` and this returns exactly BASE_ROOM_MIN.
 */
export function computeRoomMinutes({
  finalDoughTempF,
  ddtF,
}: {
  finalDoughTempF: number;
  ddtF: number;
}): number {
  const f = 2 ** ((finalDoughTempF - ddtF) / C.Q_DOUBLING_F);
  const raw = (C.BASE_ROOM_MIN + C.COOLDOWN_EQUIV_MIN) / f - C.COOLDOWN_EQUIV_MIN;
  const [min, max] = C.ROOM_MIN_CLAMP;
  return Math.min(max, Math.max(min, raw));
}

// ---------------------------------------------------------------------------
// §4.7 The mix
// ---------------------------------------------------------------------------

/** §4.7. One mix, excluding changeover. Includes the 10-minute rest. */
export const MIX_H = 0.5;

/**
 * §4.8 (MESSAGE-61). Hours from the start of the first mix to the end of mix
 * `index` (1-based): each mix is `MIX_H`, with a changeover before every one
 * after the first. Each dough's bulk starts here, on its own clock.
 */
export function mixEndsAtH(index: number): number {
  return MIX_H * index + C.CHANGEOVER_H * (index - 1);
}

// ---------------------------------------------------------------------------
// Warnings — §7.3
// ---------------------------------------------------------------------------

export type WarningSeverity = 'info' | 'warn' | 'error';

export interface Warning {
  id: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
}

/**
 * §4.4. One mix's water warnings, rendered under that mix's target in its
 * prep step (§7.3, MESSAGE-54) rather than in the strip. Two, one at each
 * end. They mirror each other: same failure ("you cannot get there by
 * blending"), opposite end, and both point the user upstream rather than at
 * the target, which stays bare per §7.2.
 *
 * Per mix, because each mix has its own target: a later mix starts in a
 * warmer bowl, so its target is lower and only it could cross 38 °F.
 *
 * MESSAGE-3's "one warning, and only one" is withdrawn by MESSAGE-4 §2 — it
 * was written before anyone had swept the small-batch corner, so it guarded
 * the unreachable failure and left the reachable one bare.
 */
export function waterWarnings(waterTempF: number): Warning[] {
  const w: Warning[] = [];
  if (waterTempF < C.WATER_MIN_F) {
    w.push({
      id: 'water-below-fridge',
      severity: 'warn',
      title: `Target water is below ${C.WATER_MIN_F} °F`,
      detail: `${formatTempF(waterTempF)} °F is colder than fridge water gets, so blending can't reach it. Chill the biga or the fresh flour instead; the biga moves the water target more than anything else you measure. If that isn't enough, this is the one case for ice.`,
    });
  }

  if (waterTempF > C.WATER_MAX_F) {
    w.push({
      id: 'water-above-tap',
      severity: 'warn',
      title: `Target water is above ${C.WATER_MAX_F} °F`,
      detail: `${formatTempF(waterTempF)} °F is hotter than a home tap delivers. Don't heat water to reach it; fix the cause. It's almost always a biga that skipped its 1-hour temper: each °F of biga temperature is worth about 2 °F of water, so an hour on the counter closes the gap faster than anything you can do at the sink.`,
    });
  }
  return w;
}

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

/**
 * A value that may differ per mix. A plain number applies to every mix, which
 * is both what a single-mix batch wants and what an older shared link decodes
 * to — see §7 of MESSAGE-5 on keeping length-1 parsing.
 */
export type PerMix<T> = T | readonly T[];

/** Read a per-mix value, falling back to the last supplied entry. */
export function atMix<T>(value: PerMix<T>, index: number): T {
  if (!Array.isArray(value)) return value as T;
  const arr = value as readonly T[];
  return (arr[index] ?? arr[arr.length - 1]) as T;
}

export interface CalculatorInputs extends BatchInputs {
  roomTempF: number;
  flourTempF: number;
  /**
   * §6. Biga temperature at mix, per mix. The waiting biga warms toward the
   * room while an earlier mix runs, and that drift is not modelled — `mix-8`
   * asks for a fresh reading instead. A scalar applies to every mix.
   */
  bigaTempF: PerMix<number>;
  frictionFactorF: number;
  /**
   * §4.2. Measured bowl temperature per mix, overriding that mix's prefill
   * (`bowlPrefillF`). A measurement always wins.
   *
   * ⚠️ Read by index (`bowlReadingAt`), never carried forward: mix 1's bowl
   * says nothing about mix 2's, which starts warm from mix 1. A scalar is
   * mix 1's reading.
   *
   * Worth `C_bowl/Cw` °F of water per °F — 0.66 at a 3-ball mix, 0.22 at 9 —
   * and `cSystem/Cw` times what it costs the dough (`bowlReadingCost`). The
   * biga gains ~5 °F from tearing and the bowl does not, so this is a real
   * reading, not a formality.
   */
  bowlTempF?: PerMix<number | null>;
  /** null / undefined uses the §4.3 default: 75 °F for <=6 balls, 74 °F for 7+. */
  ddtOverrideF?: number | null;
  /**
   * Final dough temperature actually measured after mixing, §4.8, per mix.
   * Null before the mix, which puts the calculator in planning mode at DDT.
   *
   * ⚠️ Read by index, unlike the other per-mix inputs: a missing or null entry
   * is a mix not yet read and counts at DDT (MESSAGE-45), so one reading on a
   * two-mix batch is not copied to the other. A scalar applies to every mix.
   */
  finalDoughTempF?: PerMix<number | null>;
}

/** One mix's water target. A split batch has genuinely different numbers per mix. */
export interface MixTarget {
  /** 1-based. */
  index: number;
  bowlTempF: number;
  /**
   * §4.2. True while the bowl figure is mix 1's prefill — the biga reading
   * itself — so the two move together. A reading, or a later mix's `DDT`
   * prefill, holds the bowl. Selects §7.2's basis for `bigaReadingCost`.
   */
  bowlTracksBiga: boolean;
  waterTempF: number;
  /** §4.4's water warnings for this mix's target, shown under it (§7.3). */
  warnings: Warning[];
}

export interface CalculatorResult {
  inputs: CalculatorInputs;
  formula: Formula;
  thermal: Thermal;
  /** The DDT actually used, override or default. */
  ddtF: number;
  /** Mix 1's water target, and the only one when nMix is 1. */
  waterTempF: number;
  /** One entry per mix. §7.2: each mix's prep step shows its own target. */
  mixes: MixTarget[];
  capacity: Capacity;
  probeTargetF: number;
  /** §4.10. The target's parts, per mix at the user's inputs. `probeTargetF === probe.targetF`. */
  probe: ProbeParts;
  /**
   * §4.8 room-temperature minutes before the fridge, one per dough in mix
   * order (MESSAGE-61): each from its own final reading, a dough not yet read
   * planning at DDT. Length `nMix`.
   */
  roomMinutesByDough: number[];
  /** The last dough's rise: the one the timeline plans (§4.8). */
  roomMinutes: number;
  /** True when no dough has a final reading, so every rise is planned at DDT. */
  roomMinutesIsPlanned: boolean;
  /** Each dough's `T_actual`, in mix order: its reading, or DDT until read. */
  finalTempByDoughF: number[];
}

/**
 * §4.2. The bowl measured at mix `index`, or null to use that mix's prefill.
 *
 * By index. `atMix` carried the last entry forward, so measuring mix 1's bowl
 * at 60 °F on a 12 × 265 g batch also set mix 2's to 60, overriding the warm
 * prefill (DDT, 74) and printing mix 2's water 4.6 °F too warm: 63.6 against
 * 59.0 at biga 58, room and flour 70, FF 14.03 (FINDINGS-46).
 */
export function bowlReadingAt(value: PerMix<number | null> | undefined, index: number): number | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return index === 0 ? (value as number) : null;
  return (value as readonly (number | null)[])[index] ?? null;
}

/**
 * §4.8. The final reading for each of `nMix` mixes, null where a mix hasn't
 * been read. By index: an array shorter than `nMix` leaves the later mixes
 * unread rather than copying its last entry forward, as `atMix` would.
 */
export function finalReadings(value: PerMix<number | null> | undefined, nMix: number): (number | null)[] {
  return Array.from({ length: nMix }, (_, i) => {
    if (value == null) return null;
    if (!Array.isArray(value)) return value as number;
    return (value as readonly (number | null)[])[i] ?? null;
  });
}

/** Composes §4.1–§4.8 into everything the UI needs. Nothing here is rounded. */
export function calculate(inputs: CalculatorInputs): CalculatorResult {
  const formula = computeFormula(inputs);

  // Capacity first: nMix feeds the thermal weights. §4.2 — the bowl faces one
  // mix at a time, so a 12-ball batch is a 6-ball thermal system twice over.
  const capacity = computeCapacity(formula);
  const thermal = computeThermal(
    formula,
    C.BOWL_MASS_G, // MESSAGE-29: fixed, not an input
    capacity.nMix,
  );
  // §4.2: by balls per mix (MESSAGE-61), so every mix of a batch shares it.
  const ddtF = inputs.ddtOverrideF ?? ddtForBallsPerMix(inputs.balls / capacity.nMix);

  const baseTemps = {
    ddtF,
    frictionFactorF: inputs.frictionFactorF,
    bigaTempF: atMix(inputs.bigaTempF, 0),
    flourTempF: inputs.flourTempF,
    roomTempF: inputs.roomTempF,
  };

  // §4.2. Mix 1's bowl held the biga; every later mix starts in the bowl
  // that just finished the one before it.
  const mixes: MixTarget[] = Array.from({ length: capacity.nMix }, (_, i) => {
    const bigaTempF = atMix(inputs.bigaTempF, i);
    // A measurement always wins, at every mix — its own mix's measurement.
    const measured = bowlReadingAt(inputs.bowlTempF, i);
    const bowlTempF = measured ?? bowlPrefillF(i, { bigaTempF, ddtF });
    const waterTempF = computeWaterTempF({ ...baseTemps, bigaTempF, bowlTempF }, thermal);
    return {
      index: i + 1,
      bowlTempF,
      bowlTracksBiga: measured == null && i === 0,
      waterTempF,
      warnings: waterWarnings(waterTempF),
    };
  });

  const waterTempF = mixes[0]!.waterTempF;

  // §4.8 (MESSAGE-61): each dough rises from its own final reading, and a
  // dough not yet read plans at DDT. The timeline plans the last dough's.
  const finals = finalReadings(inputs.finalDoughTempF, capacity.nMix);
  const roomMinutesIsPlanned = finals.every((t) => t == null);
  const finalTempByDoughF = finals.map((t) => t ?? ddtF);
  const roomMinutesByDough = finalTempByDoughF.map((t) => computeRoomMinutes({ finalDoughTempF: t, ddtF }));
  const probe = computeProbeParts({
    ddtF,
    roomTempF: inputs.roomTempF,
    thermal,
  });

  return {
    inputs,
    formula,
    thermal,
    ddtF,
    waterTempF,
    mixes,
    capacity,
    probeTargetF: probe.targetF,
    probe,
    roomMinutesByDough,
    roomMinutes: roomMinutesByDough[roomMinutesByDough.length - 1]!,
    roomMinutesIsPlanned,
    finalTempByDoughF,
  };
}

