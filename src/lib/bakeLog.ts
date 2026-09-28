/**
 * The bake log's rules — WEBSITE-SPEC-biga-calculator.md §4.3 (normalization),
 * §6 Panel 3 (the FF in use) and §10 (what a bake stores, which mixes count).
 *
 * Pure and DOM-free, like the rest of `src/lib`. Storage and sync live in
 * `src/state`; this file only reads records.
 *
 * **The log stores readings, never an FF.** Every FF here is solved on read,
 * so a corrected constant corrects every bake. The seed shows why: a stored
 * 14.04 couldn't be reproduced, and re-solving bake 1 from its logged inputs
 * gave 14.031 (MESSAGE-25).
 */

import { STEPS } from '../content/steps';
import { C } from './constants';
import { computeFormula, computeThermal, solveFrictionFactorF, type BowlState } from './engine';
import { formatBallsPerMix, formatTempF } from './format';

// ---------------------------------------------------------------------------
// §4.3 The mix profile and normalization
// ---------------------------------------------------------------------------

export type PhaseKey = 'a' | 'b' | 'c' | 'd';
export const PHASE_KEYS: readonly PhaseKey[] = ['a', 'b', 'c', 'd'];

export interface MixPhase {
  key: PhaseKey;
  /** The step that runs it: `mix-2`, `mix-3`, `mix-5`, `mix-7`. */
  stepId: string;
  /** Dial %, from the step's speed. Keys `FRICTION_RATE`. */
  dial: number;
  /** The printed range, minutes, from the step's timer. */
  rangeMin: readonly [number, number];
  /** The middle of the range: §4.3's reference. */
  referenceMin: number;
}

/**
 * The four mixer phases, derived from the step content rather than typed: the
 * speed steps of the mix phase, in order. §4.3 says to derive each reference
 * from its timer's range rather than typing 3.5, so extending a phase in §8.2
 * moves its reference, and every logged bake re-normalizes with it.
 */
export const MIX_PHASES: readonly MixPhase[] = (() => {
  const speedSteps = STEPS.filter((s) => s.phase === 'mix' && s.speed);
  if (speedSteps.length !== PHASE_KEYS.length) {
    throw new Error(`expected ${PHASE_KEYS.length} mixer phases, found ${speedSteps.length}`);
  }
  return speedSteps.map((s, i) => {
    const t = s.timerMinutes;
    if (t === undefined) throw new Error(`${s.id} has a speed but no timer`);
    const rangeMin: readonly [number, number] = Array.isArray(t) ? [t[0], t[1]] : [t, t];
    const dial = s.speed!.dial;
    if (!(dial in C.FRICTION_RATE)) throw new Error(`${s.id}: no friction rate at ${dial}%`);
    return {
      key: PHASE_KEYS[i]!,
      stepId: s.id,
      dial,
      rangeMin,
      referenceMin: (rangeMin[0] + rangeMin[1]) / 2,
    };
  });
})();

/** Phase by step id, for the timers that capture them. */
export function phaseForStep(stepId: string): MixPhase | undefined {
  return MIX_PHASES.find((p) => p.stepId === stepId);
}

const rateOf = (dial: number): number => C.FRICTION_RATE[dial as keyof typeof C.FRICTION_RATE];

/**
 * §4.3. `ffNominal = FF − Σ FRICTION_RATE[speed] × (actualMin − referenceMin)`.
 * Both sides are dough-only, so there is no `Ct/TOT` factor. Durations are not
 * clamped to their printed ranges: the recipe runs A, B and D to their cues.
 */
export function normalizeFrictionFactorF(ff: number, phaseMinutes: Readonly<Record<PhaseKey, number>>): number {
  return MIX_PHASES.reduce((acc, p) => acc - rateOf(p.dial) * (phaseMinutes[p.key] - p.referenceMin), ff);
}

// ---------------------------------------------------------------------------
// §10 What a bake stores
// ---------------------------------------------------------------------------

/** A reading, and whether it was entered on the day or left at a default or prefill. */
export interface Reading {
  value: number;
  entered: boolean;
}

/**
 * §10. The formula the bake was mixed under. Physical constants re-solve from
 * current code; these don't, because they set what was in the bowl.
 */
export interface FormulaSnapshot {
  hydration: number;
  salt: number;
  biga_fraction: number;
  biga_hydration: number;
  overage: number;
  /** Each mixer phase's dial %. */
  speeds: Record<PhaseKey, number>;
}

export interface LoggedMix {
  /** 1-based. */
  mix_index: number;
  /** After tearing: the model's `T_biga`. */
  biga_temp_at_mix_f: Reading;
  bowl_state: BowlState;
  bowl_temp_f: Reading;
  /** What was poured, not the target. */
  water_temp_used_f: Reading;
  final_dough_temp_f: Reading;
  /** Each phase's time from its timer, seconds. Null where none was captured. */
  phase_seconds: Record<PhaseKey, number | null>;
  /** Dave's switch. */
  excluded: boolean;
}

export interface LoggedBake {
  /** Sortable: the local date and time the bake was saved. Also the file name. */
  bake_id: string;
  /** YYYY-MM-DD, local. */
  date: string;
  balls: number;
  ball_g: number;
  /** Stored, not recomputed: it depends on the capacity constants. */
  n_mix: number;
  formula: FormulaSnapshot;
  room_temp_f: Reading;
  flour_temp_f: Reading;
  /** "Flour may follow room" (§10): then its reading is the room's. */
  flour_follows_room: boolean;
  mixes: LoggedMix[];
}

/** The formula and speeds the app mixes today. */
export function currentFormulaSnapshot(): FormulaSnapshot {
  const speeds = Object.fromEntries(MIX_PHASES.map((p) => [p.key, p.dial])) as Record<PhaseKey, number>;
  return {
    hydration: C.HYDRATION,
    salt: C.SALT,
    biga_fraction: C.BIGA_FRACTION,
    biga_hydration: C.BIGA_HYDRATION,
    overage: C.OVERAGE,
    speeds,
  };
}

export function snapshotMatches(a: FormulaSnapshot, b: FormulaSnapshot): boolean {
  return (
    a.hydration === b.hydration &&
    a.salt === b.salt &&
    a.biga_fraction === b.biga_fraction &&
    a.biga_hydration === b.biga_hydration &&
    a.overage === b.overage &&
    PHASE_KEYS.every((k) => a.speeds[k] === b.speeds[k])
  );
}

// ---------------------------------------------------------------------------
// §10 Solving a mix, and which mixes count
// ---------------------------------------------------------------------------

/** Why a mix doesn't feed the FF in use, in the order the log lists them. */
export type NotCountedReason = 'excluded' | 'formula' | 'room' | 'flour' | 'biga' | 'bowl' | 'water' | 'final' | 'phases';

export interface MixStatus {
  /**
   * The §4.3 solve on the mix's readings. Null only when the formula differs
   * from today's: the masses come from the formula, so solving under today's
   * would compute a mix nobody made.
   */
  ff: number | null;
  /** `ff` normalized to the reference profile; null without all four phase times. */
  ffNominal: number | null;
  counted: boolean;
  reasons: NotCountedReason[];
}

const flourReading = (bake: LoggedBake): Reading =>
  bake.flour_follows_room ? bake.room_temp_f : bake.flour_temp_f;

/** The four phase times in minutes, or null if any is missing. */
export function phaseMinutes(mix: LoggedMix): Record<PhaseKey, number> | null {
  const out = {} as Record<PhaseKey, number>;
  for (const k of PHASE_KEYS) {
    const s = mix.phase_seconds[k];
    if (s == null || !Number.isFinite(s) || s <= 0) return null;
    out[k] = s / 60;
  }
  return out;
}

export function mixStatus(bake: LoggedBake, mix: LoggedMix, current: FormulaSnapshot = currentFormulaSnapshot()): MixStatus {
  const reasons: NotCountedReason[] = [];
  if (mix.excluded) reasons.push('excluded');
  const sameFormula = snapshotMatches(bake.formula, current);
  if (!sameFormula) reasons.push('formula');
  if (!bake.room_temp_f.entered) reasons.push('room');
  if (!flourReading(bake).entered) reasons.push('flour');
  if (!mix.biga_temp_at_mix_f.entered) reasons.push('biga');
  if (!mix.bowl_temp_f.entered) reasons.push('bowl');
  if (!mix.water_temp_used_f.entered) reasons.push('water');
  if (!mix.final_dough_temp_f.entered) reasons.push('final');
  const minutes = phaseMinutes(mix);
  if (!minutes) reasons.push('phases');

  let ff: number | null = null;
  if (sameFormula) {
    const formula = computeFormula({ balls: bake.balls, ballWeightG: bake.ball_g });
    const thermal = computeThermal(formula, C.BOWL_MASS_G, bake.n_mix);
    ff = solveFrictionFactorF(
      {
        bigaTempF: mix.biga_temp_at_mix_f.value,
        flourTempF: flourReading(bake).value,
        roomTempF: bake.room_temp_f.value,
        bowlTempF: mix.bowl_temp_f.value,
      },
      thermal,
      { waterTempF: mix.water_temp_used_f.value, finalTempF: mix.final_dough_temp_f.value },
    );
  }
  const ffNominal = ff != null && minutes ? normalizeFrictionFactorF(ff, minutes) : null;
  return { ff, ffNominal, counted: reasons.length === 0, reasons };
}

/** A bake's FF: the mean of its counted mixes, so a split batch counts once. Null if none count. */
export function bakeFrictionFactorF(bake: LoggedBake, current: FormulaSnapshot = currentFormulaSnapshot()): number | null {
  const counted = bake.mixes
    .map((m) => mixStatus(bake, m, current))
    .filter((s) => s.counted)
    .map((s) => s.ffNominal!);
  if (counted.length === 0) return null;
  return counted.reduce((a, b) => a + b, 0) / counted.length;
}

// ---------------------------------------------------------------------------
// §6 Panel 3 The FF in use
// ---------------------------------------------------------------------------

/** A mix size as the pair it came from: 12 balls in 2 mixes is the same size as 6 in 1. */
export interface MixSize {
  balls: number;
  nMix: number;
}

export const mixSizeValue = (k: MixSize): number => k.balls / k.nMix;

/** Exact comparison on the pair, never on a rounded float. Negative when a < b. */
export function compareMixSize(a: MixSize, b: MixSize): number {
  return a.balls * b.nMix - b.balls * a.nMix;
}

export const sameMixSize = (a: MixSize, b: MixSize): boolean => compareMixSize(a, b) === 0;

export const bakeMixSize = (bake: LoggedBake): MixSize => ({ balls: bake.balls, nMix: bake.n_mix });

/**
 * §6. Bake 1's seed: shipped in the code rather than in the log's repository,
 * so a new device and a friend's browser both start from it. Not a counted
 * bake: its bowl was assumed, and of its phase times only Phase C's was
 * recorded. The first counted bake at any size retires it.
 */
export const BAKE_1_SEED = { k: 6, value: 14.03, date: '2026-08-21' } as const;

export type FfSource =
  /** Step 1: this size's own counted bakes. */
  | { step: 1; bakes: number; latestDate: string; spread: number }
  /** Step 2: interpolated between the nearest counted sizes either side. */
  | { step: 2; below: MixSize; above: MixSize }
  /** Step 3: the nearest counted size, held flat. */
  | { step: 3; nearest: MixSize }
  /** Step 4: nothing counted anywhere. `seed` at k = 6. */
  | { step: 4; seed: boolean };

export interface FfInUse {
  ff: number;
  source: FfSource;
}

interface SizeHistory {
  size: MixSize;
  ff: number;
  bakes: number;
  latestDate: string;
  spread: number;
}

const byBakeOrder = (a: LoggedBake, b: LoggedBake) =>
  a.date === b.date ? a.bake_id.localeCompare(b.bake_id) : a.date.localeCompare(b.date);

/** Step 1 at every size that has a counted bake. */
export function sizeHistories(bakes: readonly LoggedBake[], current: FormulaSnapshot = currentFormulaSnapshot()): SizeHistory[] {
  const groups: { size: MixSize; entries: { bake: LoggedBake; ff: number }[] }[] = [];
  for (const bake of [...bakes].sort(byBakeOrder)) {
    const ff = bakeFrictionFactorF(bake, current);
    if (ff == null) continue;
    const size = bakeMixSize(bake);
    let group = groups.find((g) => sameMixSize(g.size, size));
    if (!group) groups.push((group = { size, entries: [] }));
    group.entries.push({ bake, ff });
  }
  return groups.map(({ size, entries }) => {
    const last = entries.slice(-C.FF_HISTORY_BAKES);
    const ffs = last.map((e) => e.ff);
    return {
      size,
      ff: ffs.reduce((a, b) => a + b, 0) / ffs.length,
      bakes: last.length,
      latestDate: last[last.length - 1]!.bake.date,
      spread: Math.max(...ffs) - Math.min(...ffs),
    };
  });
}

/**
 * §6, Panel 3: the FF in use at mix size `k`.
 *
 * 1. Counted bakes at `k`: the mean of the last three bakes' FFs.
 * 2. None at `k`, counted sizes on both sides: linear interpolation.
 * 3. Counted sizes on one side only: the nearest, held flat. Never extrapolate.
 * 4. No counted bake anywhere: the seed at 6, `DEFAULT_FF` elsewhere.
 */
export function ffInUse(bakes: readonly LoggedBake[], k: MixSize, current: FormulaSnapshot = currentFormulaSnapshot()): FfInUse {
  const histories = sizeHistories(bakes, current);

  const own = histories.find((h) => sameMixSize(h.size, k));
  if (own) {
    return { ff: own.ff, source: { step: 1, bakes: own.bakes, latestDate: own.latestDate, spread: own.spread } };
  }

  const below = histories
    .filter((h) => compareMixSize(h.size, k) < 0)
    .sort((a, b) => compareMixSize(b.size, a.size))[0];
  const above = histories
    .filter((h) => compareMixSize(h.size, k) > 0)
    .sort((a, b) => compareMixSize(a.size, b.size))[0];

  if (below && above) {
    const x0 = mixSizeValue(below.size);
    const x1 = mixSizeValue(above.size);
    const ff = below.ff + ((mixSizeValue(k) - x0) / (x1 - x0)) * (above.ff - below.ff);
    return { ff, source: { step: 2, below: below.size, above: above.size } };
  }
  const nearest = below ?? above;
  if (nearest) return { ff: nearest.ff, source: { step: 3, nearest: nearest.size } };

  const seed = sameMixSize(k, { balls: BAKE_1_SEED.k, nMix: 1 });
  return { ff: seed ? BAKE_1_SEED.value : C.DEFAULT_FF, source: { step: 4, seed } };
}

// ---------------------------------------------------------------------------
// §6 Panel 3 The badge
// ---------------------------------------------------------------------------

/**
 * §6's badge table, verbatim. `bakeLog.test.ts` reads the table from the spec
 * and compares, so the wording can only change there.
 */
export const BADGE_TEMPLATES = {
  oneBake: 'measured {date}',
  twoBakes: 'mean of 2 bakes, latest {date} · spread {spread} °F',
  calibrated: 'calibrated · mean of the last 3 bakes, latest {date} · spread {spread} °F',
  interpolated: 'interpolated from {kBelow} and {kAbove} balls per mix',
  nearest: 'from {kNearest} balls per mix, the nearest measured size',
  seed: 'bake 1, {date} · not yet calibrated',
  estimated: 'estimated — not yet calibrated',
} as const;

export type BadgeTone = 'measured' | 'estimate';

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `⟨unknown token: ${name}⟩`);

/** The badge for an FF in use, and whether it reads as measured or as an estimate. */
export function frictionBadge(inUse: FfInUse): { text: string; tone: BadgeTone } {
  const s = inUse.source;
  const k = (m: MixSize) => formatBallsPerMix(mixSizeValue(m));
  switch (s.step) {
    case 1: {
      const values = { date: s.latestDate, spread: formatTempF(s.spread) };
      const template =
        s.bakes >= C.FF_HISTORY_BAKES
          ? BADGE_TEMPLATES.calibrated
          : s.bakes === 2
            ? BADGE_TEMPLATES.twoBakes
            : BADGE_TEMPLATES.oneBake;
      return { text: fill(template, values), tone: 'measured' };
    }
    case 2:
      return { text: fill(BADGE_TEMPLATES.interpolated, { kBelow: k(s.below), kAbove: k(s.above) }), tone: 'estimate' };
    case 3:
      return { text: fill(BADGE_TEMPLATES.nearest, { kNearest: k(s.nearest) }), tone: 'estimate' };
    case 4:
      return s.seed
        ? { text: fill(BADGE_TEMPLATES.seed, { date: BAKE_1_SEED.date }), tone: 'estimate' }
        : { text: BADGE_TEMPLATES.estimated, tone: 'estimate' };
  }
}

// ---------------------------------------------------------------------------
// §10 What the history tests: the room slope
// ---------------------------------------------------------------------------

export interface RoomSlope {
  /** FF at 70 °F. */
  a: number;
  /** °F of FF per °F of room. */
  b: number;
  bakes: number;
  roomMinF: number;
  roomMaxF: number;
}

/**
 * §10. `FF = a + b × (room_temp_f − 70)` over every counted bake at a size,
 * once there are `REGRESSION_MIN_BAKES`. Reported, never applied. Null below
 * the count, or when every bake shares one room temperature.
 */
export function roomSlope(bakes: readonly LoggedBake[], k: MixSize, current: FormulaSnapshot = currentFormulaSnapshot()): RoomSlope | null {
  const points = bakes
    .filter((b) => sameMixSize(bakeMixSize(b), k))
    .map((b) => ({ x: b.room_temp_f.value - 70, y: bakeFrictionFactorF(b, current) }))
    .filter((p): p is { x: number; y: number } => p.y != null);
  if (points.length < C.REGRESSION_MIN_BAKES) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const b = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
  const rooms = points.map((p) => p.x + 70);
  return { a: my - b * mx, b, bakes: n, roomMinF: Math.min(...rooms), roomMaxF: Math.max(...rooms) };
}
