/**
 * §7.3 *Capacity* — tell the baker when the Halo Core can't take the batch in
 * one go, and what the app has done about it (MESSAGE-29).
 *
 * The engine already splits (§4.5) and every step is per mix, so nothing here
 * changes a number. It decides which of the spec's messages show; the wording
 * is §7.3's, generated into `src/content/capacity.ts` and bound like step
 * prose.
 *
 * ⚠️ §7.3: "Each condition below is evaluated on the values the app
 * displays." The two that compare a mass against a limit read the PRINTED
 * per-mix dough — otherwise a mix of 2374.96 g would print "2375.0 g per mix is
 * within 5%" beside a condition that said it wasn't, or the reverse.
 */

import { C } from './constants';
import { bindTokens } from './bindTokens';
import { formatGrams } from './format';
import { CAPACITY } from '../content/capacity';
import type { CalculatorResult, Warning } from './engine';

/**
 * §7.3 "within 5% of the maximum": `doughPerMix ≥ 0.95 × MAX_DOUGH`. Named here
 * because the rendered "5%" is claimed against it.
 */
export const NEAR_LIMIT_FRACTION = 0.95;

/** The per-mix dough exactly as the app prints it. */
const printedPerMix = (result: CalculatorResult) => Number(formatGrams(result.capacity.doughPerMix));

/**
 * Split a message into the strip's title and body: §7.3 opens each with a
 * bold sentence. A message without one is all body.
 */
function asWarning(id: string, severity: Warning['severity'], markdown: string): Warning {
  const m = /^\*\*(.+?)\*\* ([\s\S]*)$/.exec(markdown);
  return m ? { id, severity, title: m[1]!, detail: m[2]! } : { id, severity, title: '', detail: markdown };
}

/**
 * The capacity messages that apply, in strip order. §7.3: the split "always
 * shown, first in the strip". `tokens` is mix 1's table — every figure these
 * messages name is a batch or per-mix quantity, the same for every mix.
 */
export function capacityAlerts(result: CalculatorResult, tokens: Record<string, string>): Warning[] {
  const { nMix, nBiga } = result.capacity;
  const say = (text: string) => bindTokens(text, tokens);
  const out: Warning[] = [];

  if (nMix > 1) out.push(asWarning('capacity-split', 'warn', say(CAPACITY.split)));
  if (nBiga > 1) out.push(asWarning('capacity-biga-split', 'warn', say(CAPACITY.bigaSplit)));
  // §4.5's line, kept by §7.3 for the case one biga feeds several mixes.
  if (nBiga < nMix) out.push(asWarning('capacity-divide-biga', 'info', say(CAPACITY.divideBiga)));
  if (printedPerMix(result) >= NEAR_LIMIT_FRACTION * C.MAX_DOUGH) {
    out.push(asWarning('capacity-near-limit', 'warn', say(CAPACITY.nearLimit)));
  }
  // Unreachable inside the input ranges (§7.3); kept so a range change
  // can't make it silently reachable. `capacity.test.ts` sweeps it.
  if (printedPerMix(result) < C.MIN_DOUGH) {
    out.push(asWarning('capacity-below-minimum', 'error', say(CAPACITY.belowMinimum)));
  }
  return out;
}

/** §6 Panel 1: "→ {nMix} mixes of {doughPerMix} g" beside the ball count, when the batch splits. */
export function splitHint(result: CalculatorResult, tokens: Record<string, string>): string | null {
  return result.capacity.nMix > 1 ? bindTokens(CAPACITY.splitHint, tokens) : null;
}
