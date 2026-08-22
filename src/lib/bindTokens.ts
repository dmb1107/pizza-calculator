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
import type { CalculatorResult } from './engine';

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
  ballRoomTempH: number;
  coldFermentH: number;
  temperH: number;
}

export function tokenValues(
  result: CalculatorResult,
  schedule: ScheduleTokens,
): Record<string, string> {
  const { formula, inputs } = result;
  return {
    // Computed — §4.1 display rounding.
    bigaFlour: formatGrams(formula.bigaFlour),
    bigaWater: formatGrams(formula.bigaWater),
    bigaADY: formatAdy(formula.bigaADY),
    freshFlour: formatGrams(formula.freshFlour),
    freshWater60: formatGrams(formula.freshWater60),
    freshWater40: formatGrams(formula.freshWater40),
    salt: formatGrams(formula.salt),
    probeTarget: formatTempF(result.probeTargetF),
    ddt: formatTempF(result.ddtF),

    // Inputs — trimmed, since the prose supplies the unit.
    balls: String(inputs.balls),
    ballWeight: trim(inputs.ballWeightG),
    coldFerment: trim(schedule.coldFermentH),
    bigaFridge: trim(schedule.bigaFridgeH),
    bigaRoomOnly: trim(schedule.bigaRoomOnlyH),
    ballRoomTemp: trim(schedule.ballRoomTempH),
    temper: trim(schedule.temperH),
  };
}

const TOKEN_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

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
  return missing;
}
