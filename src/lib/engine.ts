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

import { C, bowlHeatCapacity, defaultDdtF } from './constants';
import { formatGrams, formatTempF } from './format';

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
  const freshWater = flourTotal * C.HYDRATION - bigaWater;

  return {
    flourTotal,
    bigaFlour,
    bigaWater,
    bigaMass: bigaFlour + bigaWater,
    bigaADY: bigaFlour * C.ADY_OF_BIGA_FLOUR,
    freshFlour: flourTotal - bigaFlour,
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
  /** Heat capacity of the mixer bowl. 115.8 at the 965 g default. */
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
  /** cBowl / cSystem. 18.0% at 3 balls, 3.5% at 18. */
  bowlShare: number;
}

/**
 * §4.2. Derived from component heat capacities rather than hardcoded.
 *
 * ⚠️ THE MASSES ARE PER-MIX, NOT BATCH TOTALS. `C_bowl` is one bowl, and the
 * bowl only ever faces one mix at a time — so feeding a 12-ball batch total
 * into the heat balance models the whole batch sitting against a single bowl,
 * which never happens. That error landed the water target 2.6 °F low at 12
 * balls and 1.8 °F low at 18. Every `nMix = 1` batch is unaffected.
 *
 * FF is per-mix by the same argument: it is the rise the mixer produces in the
 * dough actually in the bowl, and 14.04 was measured on a single 6-ball mix.
 */
export function computeThermal(
  f: Formula,
  bowlMassG: number = C.DEFAULT_BOWL_MASS_G,
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
   * in the mixer bowl, so 19 h of contact leaves them at equilibrium. Pass
   * roomTempF for a bowl kept on the counter. The effect is about −0.3 °F,
   * which is why this is never a required measurement.
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
 * uses — `final − predicted_mix` omits the bowl and understates FF by 1.5–2.5 °F.
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
// §4.2 Bowl state
// ---------------------------------------------------------------------------

/**
 * How the bowl arrives at a given mix. Each option prefills the bowl
 * temperature from a value already in the model — deliberately no new
 * constants.
 */
export type BowlState =
  /** Held the biga. Default for mix 1 and for every single-mix batch. */
  | 'cold'
  /** Washed and left on the counter, or a second biga that fermented elsewhere. */
  | 'room'
  /** Straight off the previous mix. Default for mix 2 and later. */
  | 'warm';

/**
 * §4.2. The prefill only — the field stays editable and a measurement always
 * wins.
 *
 * `warm` uses DDT as a good estimate rather than merely a ceiling: the bowl is
 * not cleaned between mixes and the changeover is about 5 minutes, so it comes
 * off mix 1 near dough temperature with little time to shed. It runs a degree
 * or two high.
 */
export function bowlTempForState(
  state: BowlState,
  { bigaTempF, roomTempF, ddtF }: { bigaTempF: number; roomTempF: number; ddtF: number },
): number {
  switch (state) {
    case 'cold':
      return bigaTempF;
    case 'room':
      return roomTempF;
    case 'warm':
      return ddtF;
  }
}

// ---------------------------------------------------------------------------
// §4.5 Capacity splits
// ---------------------------------------------------------------------------

export interface Capacity {
  /** Number of separate final mixes the Halo Core needs. */
  nMix: number;
  /** Number of separate biga batches. */
  nBiga: number;
  doughPerMix: number;
  bigaMassPerBatch: number;
  bigaFlourPerBatch: number;
  /** Dough per mix is under the mixer's 500 g minimum — it can't grip. */
  belowMixerMinimum: boolean;
  /** A final mix lands within 5% of the 2500 g ceiling: workable but tight. */
  tightFinalMix: boolean;
  /** One biga divides by weight across several final mixes. The 12-ball case. */
  divideBigaAcrossMixes: boolean;
}

/** §4.5. */
export function computeCapacity(f: Formula): Capacity {
  const nMix = Math.max(
    1,
    Math.ceil(Math.max(f.doughTotal / C.MAX_DOUGH, f.flourTotal / C.FLOUR_CAP_66)),
  );
  const nBiga = Math.max(
    1,
    Math.ceil(Math.max(f.bigaFlour / C.FLOUR_CAP_55, f.bigaMass / C.MAX_DOUGH)),
  );
  const doughPerMix = f.doughTotal / nMix;

  return {
    nMix,
    nBiga,
    doughPerMix,
    bigaMassPerBatch: f.bigaMass / nBiga,
    bigaFlourPerBatch: f.bigaFlour / nBiga,
    belowMixerMinimum: doughPerMix < C.MIN_DOUGH,
    tightFinalMix: doughPerMix >= 0.95 * C.MAX_DOUGH,
    divideBigaAcrossMixes: nBiga < nMix,
  };
}

// ---------------------------------------------------------------------------
// §4.6 Probe target
// ---------------------------------------------------------------------------

/**
 * §4.6. The temperature to expect partway through the mix, before Phases C and
 * D add their friction.
 *
 * Two corrections from bake 1: the friction still to come is diluted by the
 * bowl's thermal mass, and the 10-minute rest sheds heat in proportion to the
 * dough-to-room gap rather than a flat 1 °F.
 *
 * At FF 14 in a 70 °F room: 3 balls 72.2 · 6 balls 71.8 · 9 balls 70.5.
 */
export function computeProbeTargetF({
  ddtF,
  frictionFactorF,
  roomTempF,
  thermal,
}: {
  ddtF: number;
  frictionFactorF: number;
  roomTempF: number;
  thermal: Thermal;
}): number {
  return (
    ddtF -
    0.33 * frictionFactorF * (thermal.cTotal / thermal.cSystem) +
    0.2 * (ddtF - roomTempF)
  );
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
 * alongside it. The model reaches 71 min for a warm dough and 144 min for a
 * cold one, so the old 1–2 h range was wrong at both ends.
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
// §4.7 Mix stagger
// ---------------------------------------------------------------------------

/** §4.7. One mix, excluding changeover. Includes the 10-minute rest. */
export const MIX_H = 0.5;

/** §4.8's [45, 180] minute floor and ceiling, applied in hours. */
export function clampRise(hours: number): number {
  const [minRise, maxRise] = C.ROOM_MIN_CLAMP;
  return Math.min(maxRise / 60, Math.max(minRise / 60, hours));
}

/**
 * §4.7. How much later the LAST mix finishes than the first, in hours.
 * 35 min at nMix 2 — 30 min of mixing plus a 5-minute changeover.
 */
export function mixStaggerH(nMix: number): number {
  return (MIX_H + C.CHANGEOVER_H) * Math.max(0, nMix - 1);
}

/**
 * §4.7. Minutes of the stagger the ball rise could NOT absorb, because
 * subtracting half of it hit §4.8's 45-minute floor. Zero in every unclamped
 * case, so it surfaces only when it is true.
 *
 * ⚠️ The clamp eats the correction exactly where the correction matters most.
 * The floor is reached by WARM doughs, and a warm dough ferments fastest — so a
 * given number of uncentred minutes costs more here than anywhere else in the
 * table. The floor is not worth overruling for it; the lever is upstream, which
 * is what the §7.3 warning says.
 */
export function staggerUncentredMin(roomMinutes: number, nMix: number): number {
  const target = roomMinutes / 60 - mixStaggerH(Math.max(1, nMix)) / 2;
  return (clampRise(target) - target) * 60;
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
 * §7.3. Warnings are derived data, so they belong here rather than in a
 * component — the UI just renders them, above the step list and never inside a
 * collapsed panel.
 */
function buildWarnings(
  f: Formula,
  capacity: Capacity,
  waterTempF: number,
  staggerUncentred: number,
): Warning[] {
  const w: Warning[] = [];

  if (capacity.nBiga > 1) {
    w.push({
      id: 'biga-split',
      severity: 'info',
      title: `Mix the biga in ${capacity.nBiga} batches`,
      detail: `${formatGrams(f.bigaFlour)} g of biga flour exceeds what the Halo Core handles at 50% hydration. Split into ${capacity.nBiga} batches of about ${formatGrams(capacity.bigaMassPerBatch)} g each.`,
    });
  }

  if (capacity.divideBigaAcrossMixes) {
    w.push({
      id: 'divide-biga',
      severity: 'info',
      title: `Mix one biga, then divide it for ${capacity.nMix} final mixes`,
      detail: `Mix one biga, then divide it by weight into ${capacity.nMix} portions for ${capacity.nMix} separate final mixes. That's a genuine convenience, not a compromise — the biga is stiff enough that one batch covers ${capacity.nMix === 2 ? 'both' : `all ${capacity.nMix}`} of them.`,
    });
  } else if (capacity.nMix > 1) {
    w.push({
      id: 'mix-split',
      severity: 'info',
      title: `${capacity.nMix} separate final mixes`,
      detail: `${formatGrams(f.doughTotal)} g of dough exceeds the mixer's ${C.MAX_DOUGH} g ceiling. Run ${capacity.nMix} final mixes of about ${formatGrams(capacity.doughPerMix)} g each.`,
    });
  }

  if (capacity.tightFinalMix) {
    w.push({
      id: 'tight-mix',
      severity: 'warn',
      title: 'Final mix is close to the mixer ceiling',
      detail: `${formatGrams(capacity.doughPerMix)} g is within 5% of the Halo Core's ${C.MAX_DOUGH} g limit. Workable, but tight — expect the motor to work hard during Phase A breakdown.`,
    });
  }

  if (capacity.belowMixerMinimum) {
    w.push({
      id: 'below-minimum',
      severity: 'warn',
      title: 'Batch is below the mixer minimum',
      detail: `${formatGrams(capacity.doughPerMix)} g is under the ${C.MIN_DOUGH} g the Halo Core needs to grip. Mix this one by hand, or scale the batch up. The biga is hand-mixed at every size, so only the final mix is affected.`,
    });
  }

  // §4.4. Two warnings, one at each end. They mirror each other: same failure
  // ("you cannot get there by blending"), opposite end, and both point the user
  // upstream rather than at the water card, which stays bare per §7.2.
  //
  // MESSAGE-3's "one warning, and only one" is withdrawn by MESSAGE-4 §2 — it
  // was written before anyone had swept the small-batch corner, so it guarded
  // the unreachable failure and left the reachable one bare.
  if (waterTempF < C.WATER_MIN_F) {
    w.push({
      id: 'water-below-fridge',
      severity: 'warn',
      title: `Target water is below ${C.WATER_MIN_F} °F`,
      detail: `${formatTempF(waterTempF)} °F is colder than fridge water reaches, so you cannot get there by blending. Chill the biga or the fresh flour instead — the biga is the dominant thermal term and a far more powerful lever. Failing that, this is the one case for ice.`,
    });
  }

  if (waterTempF > C.WATER_MAX_F) {
    w.push({
      id: 'water-above-tap',
      severity: 'warn',
      title: `Target water is above ${C.WATER_MAX_F} °F`,
      detail: `${formatTempF(waterTempF)} °F is hotter than a domestic tap delivers. Don't heat water to get there — fix it upstream. The cause is almost always a biga that skipped its 1-hour temper: each °F of biga temperature is worth about 2 °F of water, so an hour on the counter closes this faster than anything you can do at the sink.`,
    });
  }

  // §4.7 / §7.3. Only when the ball rise hit its floor with stagger left over.
  // Quantitative and conditional by design: a blanket caveat about a failure
  // that only happens on warm split batches trains the reader to skip it.
  if (staggerUncentred > 2) {
    w.push({
      id: 'stagger-uncentred',
      severity: 'warn',
      title: `${Math.round(staggerUncentred)} minutes of the spread could not be absorbed`,
      detail:
        'Your dough is warm enough that the ball rise is already at its 45-minute floor, so there is no room left to shorten it. The first dough will run that much long regardless. This bites hardest exactly where it matters most — a warm dough ferments fastest, so a given number of extra minutes costs more here than anywhere else. The floor is not worth overruling for it. If you want the spread back, the lever is upstream: fewer, larger mixes, or a cooler dough temperature.',
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
  /** Weigh once; persisted. */
  bowlMassG?: number;
  /**
   * §4.2. How the bowl arrives at MIX 1. Later mixes are always 'warm' — they
   * start in the bowl that just finished the previous mix.
   */
  bowlState?: BowlState;
  /**
   * §4.2. Measured bowl temperature at mix 1, overriding the selector's
   * prefill. A measurement always wins.
   *
   * Worth 0.66 °F of water per °F at 3 balls — three times the dough
   * sensitivity, because water is only 30% of the system. The biga gains ~5 °F
   * from tearing and the bowl does not, so this is a real reading, not a
   * formality.
   */
  bowlTempF?: PerMix<number | null>;
  /** null / undefined uses the §4.3 default: 75 °F for <=6 balls, 74 °F for 7+. */
  ddtOverrideF?: number | null;
  /**
   * Final dough temperature actually measured after mixing, §4.8. Null before
   * the mix, which puts the calculator in planning mode at DDT.
   */
  finalDoughTempF?: number | null;
}

/** One mix's water target. A split batch has genuinely different numbers per mix. */
export interface MixTarget {
  /** 1-based. */
  index: number;
  bowlState: BowlState;
  bowlTempF: number;
  waterTempF: number;
}

export interface CalculatorResult {
  inputs: CalculatorInputs;
  formula: Formula;
  thermal: Thermal;
  /** The DDT actually used, override or default. */
  ddtF: number;
  /** Mix 1's water target — the headline figure, and the only one when nMix is 1. */
  waterTempF: number;
  /** One entry per mix. §7.2 renders a card each when there is more than one. */
  mixes: MixTarget[];
  capacity: Capacity;
  probeTargetF: number;
  /** §4.8 room-temperature minutes before the fridge. */
  roomMinutes: number;
  /** True when roomMinutes came from DDT rather than a measurement. */
  roomMinutesIsPlanned: boolean;
  /**
   * §4.7. Minutes of the mix stagger the ball rise could not absorb. Zero
   * except on a warm split batch, where §4.8's floor blocks the correction.
   */
  staggerUncentredMin: number;
  /** The temperature §4.8 was computed from — measured, or DDT in planning mode. */
  effectiveFinalTempF: number;
  warnings: Warning[];
}

/** Composes §4.1–§4.8 into everything the UI needs. Nothing here is rounded. */
export function calculate(inputs: CalculatorInputs): CalculatorResult {
  const formula = computeFormula(inputs);

  // Capacity first: nMix feeds the thermal weights. §4.2 — the bowl faces one
  // mix at a time, so a 12-ball batch is a 6-ball thermal system twice over.
  const capacity = computeCapacity(formula);
  const thermal = computeThermal(
    formula,
    inputs.bowlMassG ?? C.DEFAULT_BOWL_MASS_G,
    capacity.nMix,
  );
  const ddtF = inputs.ddtOverrideF ?? defaultDdtF(inputs.balls);

  const baseTemps = {
    ddtF,
    frictionFactorF: inputs.frictionFactorF,
    bigaTempF: atMix(inputs.bigaTempF, 0),
    flourTempF: inputs.flourTempF,
    roomTempF: inputs.roomTempF,
  };

  // §4.2 / §10. Mix 1 takes the user's bowl state; every later mix starts in
  // the bowl that just finished the one before it.
  const mixes: MixTarget[] = Array.from({ length: capacity.nMix }, (_, i) => {
    const bowlState: BowlState = i === 0 ? (inputs.bowlState ?? 'cold') : 'warm';
    const bigaTempF = atMix(inputs.bigaTempF, i);
    const prefill = bowlTempForState(bowlState, {
      bigaTempF,
      roomTempF: inputs.roomTempF,
      ddtF,
    });
    // A measurement always wins, at every mix.
    const measured = inputs.bowlTempF == null ? null : atMix(inputs.bowlTempF, i);
    const bowlTempF = measured ?? prefill;
    return {
      index: i + 1,
      bowlState,
      bowlTempF,
      waterTempF: computeWaterTempF({ ...baseTemps, bigaTempF, bowlTempF }, thermal),
    };
  });

  const waterTempF = mixes[0]!.waterTempF;

  // Planning mode until a real final dough temperature is entered.
  const roomMinutesIsPlanned = inputs.finalDoughTempF == null;
  const effectiveFinalTempF = inputs.finalDoughTempF ?? ddtF;
  const roomMinutes = computeRoomMinutes({ finalDoughTempF: effectiveFinalTempF, ddtF });
  const uncentred = staggerUncentredMin(roomMinutes, capacity.nMix);

  return {
    inputs,
    formula,
    thermal,
    ddtF,
    waterTempF,
    mixes,
    capacity,
    probeTargetF: computeProbeTargetF({
      ddtF,
      frictionFactorF: inputs.frictionFactorF,
      roomTempF: inputs.roomTempF,
      thermal,
    }),
    roomMinutes,
    roomMinutesIsPlanned,
    staggerUncentredMin: uncentred,
    effectiveFinalTempF,
    // Warnings key off mix 1; a later mix is always warmer-bowled and so
    // never colder, and the hot end is what mix 1 already worst-cases.
    warnings: buildWarnings(formula, capacity, waterTempF, uncentred),
  };
}

