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
 * §4.2. Derived from component heat capacities rather than hardcoded — the
 * weights are scale-invariant, which is precisely what makes them a good
 * assertion target.
 */
export function computeThermal(f: Formula, bowlMassG: number = C.DEFAULT_BOWL_MASS_G): Thermal {
  const cBiga = f.bigaMass * C.C_BIGA;
  const cFreshFlour = f.freshFlour * C.C_FLOUR;
  const cFreshWater = f.freshWater * C.C_WATER;
  const cSalt = f.salt * C.C_SALT;
  const cTotal = cBiga + cFreshFlour + cFreshWater + cSalt;
  const cBowl = bowlHeatCapacity(bowlMassG);

  return {
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
// §4.4 Ice
// ---------------------------------------------------------------------------

export type IceStatus =
  /** Normal case: some ice, comfortably under the 35% ceiling. */
  | 'ok'
  /** Target is at or just below tap temperature — plain tap water is fine. */
  | 'none'
  /** Target is above tap temperature. Heat the water instead. */
  | 'warm-water'
  /** Over 35% of the fresh water — won't reliably melt in one mix. */
  | 'excessive'
  /** Over 100% — the target is not reachable with ice at all. */
  | 'unreachable';

export interface IceResult {
  /**
   * Effective temperature of ice, °F. Fictitious and deliberately so: it folds
   * the 80 cal/g latent heat into a fake starting temperature so ice slots into
   * the same linear equation as water. A 16 °F freezer gives −120 °F.
   */
  iceEffF: number;
  /** Ice to weigh out, grams. Clamped to [0, freshWater]. */
  iceG: number;
  /** Tap water to weigh out, grams. */
  tapG: number;
  /** Unclamped requirement, so the UI can say how far out of reach a target is. */
  iceRequiredG: number;
  /** iceRequiredG / freshWater. */
  iceFraction: number;
  status: IceStatus;
  /** Set when status is 'warm-water': heat the water to this temperature. */
  warmToF?: number;
}

export interface IceInputs {
  waterTempF: number;
  freshWater: number;
  tapTempF: number;
  freezerTempF: number;
}

/** §4.4. Sub-freezing ice must first warm to 32 °F at half water's specific heat. */
export function computeIce({
  waterTempF,
  freshWater,
  tapTempF,
  freezerTempF,
}: IceInputs): IceResult {
  const iceEffF = -112 - C.C_ICE * (32 - freezerTempF);
  const iceRequiredG = (freshWater * (tapTempF - waterTempF)) / (tapTempF - iceEffF);
  const iceFraction = freshWater > 0 ? iceRequiredG / freshWater : 0;

  // Target at or above tap temperature: no ice, and past +0.5 °F say so plainly.
  if (waterTempF >= tapTempF) {
    const status: IceStatus = waterTempF > tapTempF + 0.5 ? 'warm-water' : 'none';
    return {
      iceEffF,
      iceG: 0,
      tapG: freshWater,
      iceRequiredG,
      iceFraction,
      status,
      ...(status === 'warm-water' ? { warmToF: waterTempF } : {}),
    };
  }

  const iceG = Math.min(iceRequiredG, freshWater);
  let status: IceStatus = 'ok';
  if (iceRequiredG > freshWater) status = 'unreachable';
  else if (iceRequiredG > 0.35 * freshWater) status = 'excessive';

  return { iceEffF, iceG, tapG: freshWater - iceG, iceRequiredG, iceFraction, status };
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
function buildWarnings(f: Formula, capacity: Capacity, ice: IceResult): Warning[] {
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
      detail: `Mix one biga, then divide it by weight into ${capacity.nMix} portions for ${capacity.nMix} separate final mixes. That's a genuine convenience, not a compromise — the biga is stiff enough that one batch covers both mixes.`,
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

  switch (ice.status) {
    case 'warm-water':
      w.push({
        id: 'warm-water',
        severity: 'info',
        title: `Warm the water to ${formatTempF(ice.warmToF ?? 0)} °F`,
        detail:
          'The biga is cold enough that it, not the water, is doing the cooling. No ice — heat the water instead. This is normal with a fridge-retarded biga taken straight out.',
      });
      break;
    case 'excessive':
      w.push({
        id: 'ice-excessive',
        severity: 'warn',
        title: `Ice is ${Math.round(ice.iceFraction * 100)}% of the fresh water`,
        detail:
          'Above about 35% the ice will not reliably melt during one mix. Undissolved ice keeps absorbing heat after you take your temperature reading, so the dough reads on target and then drifts cold — which poisons your friction factor. Chill the biga or the fresh flour instead.',
      });
      break;
    case 'unreachable':
      w.push({
        id: 'ice-unreachable',
        severity: 'error',
        title: 'Target temperature is not reachable with ice',
        detail: `Hitting this DDT would need ${formatGrams(ice.iceRequiredG)} g of ice against only ${formatGrams(f.freshWater)} g of fresh water. Chill the biga — its thermal mass is the dominant term and a far more powerful lever than ice.`,
      });
      break;
    case 'ok':
    case 'none':
      break;
  }

  return w;
}

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

export interface CalculatorInputs extends BatchInputs {
  roomTempF: number;
  flourTempF: number;
  bigaTempF: number;
  tapTempF: number;
  freezerTempF: number;
  frictionFactorF: number;
  /** Weigh once; persisted. Its mass matters far more than its temperature. */
  bowlMassG?: number;
  /** Defaults to bigaTempF — the biga ferments in the bowl. §4.2. */
  bowlTempF?: number | null;
  /** null / undefined uses the §4.3 default: 75 °F for <=6 balls, 74 °F for 7+. */
  ddtOverrideF?: number | null;
  /**
   * Final dough temperature actually measured after mixing, §4.8. Null before
   * the mix, which puts the calculator in planning mode at DDT.
   */
  finalDoughTempF?: number | null;
}

export interface CalculatorResult {
  inputs: CalculatorInputs;
  formula: Formula;
  thermal: Thermal;
  /** The DDT actually used, override or default. */
  ddtF: number;
  waterTempF: number;
  ice: IceResult;
  capacity: Capacity;
  probeTargetF: number;
  /** §4.8 room-temperature minutes before the fridge. */
  roomMinutes: number;
  /** True when roomMinutes came from DDT rather than a measurement. */
  roomMinutesIsPlanned: boolean;
  /** The temperature §4.8 was computed from — measured, or DDT in planning mode. */
  effectiveFinalTempF: number;
  warnings: Warning[];
}

/** Composes §4.1–§4.8 into everything the UI needs. Nothing here is rounded. */
export function calculate(inputs: CalculatorInputs): CalculatorResult {
  const formula = computeFormula(inputs);
  const thermal = computeThermal(formula, inputs.bowlMassG ?? C.DEFAULT_BOWL_MASS_G);
  const ddtF = inputs.ddtOverrideF ?? defaultDdtF(inputs.balls);

  const temps: TempInputs = {
    ddtF,
    frictionFactorF: inputs.frictionFactorF,
    bigaTempF: inputs.bigaTempF,
    flourTempF: inputs.flourTempF,
    roomTempF: inputs.roomTempF,
    ...(inputs.bowlTempF != null ? { bowlTempF: inputs.bowlTempF } : {}),
  };

  const waterTempF = computeWaterTempF(temps, thermal);

  const ice = computeIce({
    waterTempF,
    freshWater: formula.freshWater,
    tapTempF: inputs.tapTempF,
    freezerTempF: inputs.freezerTempF,
  });

  const capacity = computeCapacity(formula);

  // Planning mode until a real final dough temperature is entered.
  const roomMinutesIsPlanned = inputs.finalDoughTempF == null;
  const effectiveFinalTempF = inputs.finalDoughTempF ?? ddtF;

  return {
    inputs,
    formula,
    thermal,
    ddtF,
    waterTempF,
    ice,
    capacity,
    probeTargetF: computeProbeTargetF({
      ddtF,
      frictionFactorF: inputs.frictionFactorF,
      roomTempF: inputs.roomTempF,
      thermal,
    }),
    roomMinutes: computeRoomMinutes({ finalDoughTempF: effectiveFinalTempF, ddtF }),
    roomMinutesIsPlanned,
    effectiveFinalTempF,
    warnings: buildWarnings(formula, capacity, ice),
  };
}
