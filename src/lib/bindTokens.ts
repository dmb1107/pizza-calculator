/**
 * {token} binding for step content — WEBSITE-SPEC-biga-calculator.md §8.1.
 *
 * "values?: string[]  // computed, "{braces}" bind to engine output"
 *
 * An unknown token must never render as an empty string. A step reading
 * "Weigh  g of flour" is worse than useless in a kitchen — it looks like the
 * app is working. Unbound tokens render as a visible marker instead, and
 * `unboundTokens` lets the test suite prove there are none.
 */

import { formatAdy, formatGrams, formatTempF } from './format';
import { mixStaggerH, observedRate, type CalculatorResult } from './engine';

/** Trim trailing zeros: 1.5 stays 1.5, 2.0 becomes 2, 265 stays 265. */
function trim(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Build the binding table.
 *
 * Computed masses and temperatures go through the §4.1 display rounding.
 * User inputs are trimmed instead — "Divide to 265 g" rather than "265.0 g".
 */
export interface ScheduleTokens {
  bigaFridgeH: number;
  bigaRoomOnlyH: number;
  coldFermentH: number;
  temperH: number;
}

export function tokenValues(
  result: CalculatorResult,
  schedule: ScheduleTokens,
  /** §8.2a. Which mix instance this text belongs to, 1-based. */
  mixIndex = 1,
): Record<string, string> {
  const { formula, inputs, capacity } = result;
  // §8.2a. Instances are 1-based; a non-repeating step is instance 1.
  const mix = Math.min(mixIndex, capacity.nMix);
  return {
    // Computed — §4.1 display rounding.
    //
    // ⚠️ There is deliberately no bare `bigaFlour` / `freshFlour` here. §8.2
    // binds the per-biga and per-mix forms instead, because `biga-1` is a
    // per-biga step and `mix-1` a per-mix one — a batch total on either is a
    // weight the user must not put on the scale.
    /**
     * ⚠️ PER MIX, not batch totals. `mix-2`, `mix-3` and the rest of the mix
     * phase are per-mix steps — at 12 balls the baker runs two 6-ball mixes and
     * pours 211.6 g into each, not 423.2 g into the first. §8.2a says these are
     * "identical across instances by construction, since every mix is the same
     * size", which is only true of the per-mix figure.
     *
     * The ingredients card still shows batch totals; that is the shopping list.
     */
    phaseAWaterPerMix: formatGrams(formula.phaseAWater / capacity.nMix),
    phaseBWaterPerMix: formatGrams(formula.phaseBWater / capacity.nMix),
    saltPerMix: formatGrams(formula.salt / capacity.nMix),
    probeTarget: formatTempF(result.probeTargetF),
    ddt: formatTempF(result.ddtF),
    /**
     * §4.6. Phase C's rate AS A THERMOMETER READS IT — the dough-only 1.08
     * °F/min times `Ct/TOT`. "About 1 °F per minute" is only true at 6 balls
     * and up; at 3 it is 0.89. Routed through `observedRate` so this and the
     * Phase C authority figures cannot drift apart.
     */
    observedRate30: formatTempF(observedRate(30, result.thermal)),

    // §8.2a per-instance bindings. Bound the same way whether or not they vary
    // — hard-coding which ones differ is a trap the next change springs.
    mixIndex: String(mix),
    nextMixIndex: String(mix + 1),
    /** Mix 2's target while standing at the end of mix 1. */
    waterTempNext: formatTempF(
      (result.mixes[mix] ?? result.mixes[result.mixes.length - 1]!).waterTempF,
    ),
    /** " × 2 bigas" when the biga splits, empty otherwise. §8.2 `biga-1`. */
    bigaCountSuffix: capacity.nBiga > 1 ? ` × ${capacity.nBiga} bigas` : '',
    // §4.8 — computed from the measured final dough temperature, or from DDT
    // while the calculator is still in planning mode.
    roomMin: String(Math.round(result.roomMinutes)),
    finalDoughTemp: formatTempF(result.effectiveFinalTempF),

    // §8.2 per-biga values. `biga-1` and `biga-2` are per-biga steps: at 18
    // balls the batch total is 1833.7 g, which is above the 1610 g the machine
    // handles at this hydration — which is *why* it splits, so showing it as
    // one weight to scale out would be actively wrong.
    bigaFlourPerBiga: formatGrams(formula.bigaFlour / capacity.nBiga),
    bigaWaterPerBiga: formatGrams(formula.bigaWater / capacity.nBiga),
    bigaADYPerBiga: formatAdy(formula.bigaADY / capacity.nBiga),
    bigaFlourTotal: formatGrams(formula.bigaFlour),
    nBiga: String(capacity.nBiga),

    // §8.2 per-mix values. Same class of error one scope down.
    freshFlourPerMix: formatGrams(formula.freshFlour / capacity.nMix),
    bigaMassPerMix: formatGrams(formula.bigaMass / capacity.nMix),
    nMix: String(capacity.nMix),

    // §4.7 stagger figures, in whole minutes for prose.
    staggerMinutes: String(Math.round(mixStaggerH(capacity.nMix) * 60)),
    staggerHalfMinutes: String(Math.round((mixStaggerH(capacity.nMix) / 2) * 60)),
    staggerUncentred: String(Math.round(result.staggerUncentredMin)),

    // Inputs — trimmed, since the prose supplies the unit.
    balls: String(inputs.balls),
    ballWeight: trim(inputs.ballWeightG),
    coldFerment: trim(schedule.coldFermentH),
    bigaFridge: trim(schedule.bigaFridgeH),
    bigaRoomOnly: trim(schedule.bigaRoomOnlyH),
    temper: trim(schedule.temperH),
  };
}

/**
 * §8.1: **every token is a bare identifier. No expressions, ever.**
 *
 * ⚠️ Deliberately strict. An earlier §8.2 carried `{mixIndex + 1}` and a
 * ternary; those are now `{nextMixIndex}` and `{bigaCountSuffix}`, computed
 * here where every other value lives. Keeping the pattern narrow means a
 * convenient expression in prose is a *parse error* rather than something that
 * quietly works and invites the next one — §8 prose is edited often, and an
 * evaluator there is a code-execution surface that grows by accretion.
 */
const TOKEN_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/**
 * Anything brace-delimited that is NOT a bare identifier. `unboundTokens` uses
 * this to fail loudly on an expression rather than leaving it in the output,
 * where it would render as literal braces and read as a template bug.
 */
const MALFORMED_TOKEN_RE = /\{(?![a-zA-Z][a-zA-Z0-9]*\})([^{}]*)\}/g;

/** Substitute every {token}. Unknown ones become a visible marker. */
export function bindTokens(text: string, values: Record<string, string>): string {
  return text.replace(TOKEN_RE, (_whole, name: string) =>
    Object.hasOwn(values, name) ? (values[name] as string) : `⟨unknown token: ${name}⟩`,
  );
}

/** Every token in `text` with no binding. Used by the tests to prove there are none. */
export function unboundTokens(text: string, values: Record<string, string>): string[] {
  const missing: string[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const name = m[1] as string;
    if (!Object.hasOwn(values, name)) missing.push(name);
  }
  // An expression is not an unknown token, it is malformed content. Reported
  // here so the "nothing unbound" test catches it: `bindTokens` would leave it
  // in the output as literal braces, which reads as a template bug.
  for (const m of text.matchAll(MALFORMED_TOKEN_RE)) missing.push(m[1] as string);
  return missing;
}
