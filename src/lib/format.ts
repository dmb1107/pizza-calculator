/**
 * Display formatting — WEBSITE-SPEC-biga-calculator.md §4.1.
 *
 * "Do not round intermediates. Round only for display: flour/water/salt/dough
 * to 1 decimal, ADY to 2, temperatures to 1."
 *
 * Rounding lives in this module and nowhere else. The engine returns full
 * precision; anything that puts a number in front of a person comes through
 * here. Keeping the boundary in one place is what makes "don't round
 * intermediates" enforceable rather than aspirational.
 */

/** Round half away from zero, avoiding the float artefacts of `toFixed` alone. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  // Scale, nudge past the representation error, then round.
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

/** Flour, water, salt, dough. 1 decimal. */
export function formatGrams(grams: number): string {
  return roundTo(grams, 1).toFixed(1);
}

/** Dry yeast. 2 decimals — at these doses the second one is a real quantity. */
export function formatAdy(grams: number): string {
  return roundTo(grams, 2).toFixed(2);
}

/** Temperatures. 1 decimal. */
export function formatTempF(degF: number): string {
  return roundTo(degF, 1).toFixed(1);
}

/** Whole grams, for figures a scale can't resolve past anyway (tray weights). */
export function formatGramsWhole(grams: number): string {
  return String(Math.round(grams));
}

/** "65%" from 0.65. */
export function formatPercent(fraction: number, decimals = 0): string {
  return `${roundTo(fraction * 100, decimals).toFixed(decimals)}%`;
}
