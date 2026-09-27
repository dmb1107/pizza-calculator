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

/** §4.9. Opening diameter, 1 decimal, rounded once from the unrounded value. */
export function formatInches(inches: number): string {
  return roundTo(inches, 1).toFixed(1);
}

/** A whole number, e.g. §4.9's percentage — the prose supplies the `%`. */
export function formatWhole(value: number): string {
  return roundTo(value, 0).toFixed(0);
}

/**
 * §4.10 `{probeGapPhrase}`: "1.6 °F below DDT" / "0.3 °F above DDT" /
 * "right at DDT".
 *
 * ⚠️ Computed FROM the printed DDT and the printed target, which §4.10 requires
 * ("must equal |printed DDT − printed target| exactly"). Rounding the gap on its
 * own agrees everywhere a sweep reaches but not by construction — at a rounding
 * tie it would print 3.2 beside a 75.0 and a 71.9. This is the one place where
 * working from displayed values is the specification rather than the error.
 * Direction goes in words because the gap goes negative in a cold kitchen at a
 * low FF, and "sits −0.3 °F below DDT" is nonsense.
 */
export function formatProbeGapPhrase(ddtF: number, targetF: number): string {
  const printedGap = roundTo(ddtF, 1) - roundTo(targetF, 1);
  const shown = formatTempF(Math.abs(printedGap));
  if (shown === '0.0') return 'right at DDT';
  return `${shown} °F ${printedGap > 0 ? 'below' : 'above'} DDT`;
}

/**
 * A percentage as a bare number, for prose that supplies its own `%` —
 * `({phaseAPercent}%)`. Up to one decimal, trailing zero dropped, so a split
 * of 0.6 reads "60" and a future 0.575 reads "57.5" rather than rounding to 58.
 */
export function formatPercentNumber(fraction: number): string {
  return String(roundTo(fraction * 100, 1));
}

/**
 * A dimensionless coefficient — °F of water per °F of an input. Callers pick
 * the decimals: the biga's runs 1.6–2.3 and reads at one, the bowl's runs
 * 0.2–0.7 and needs two.
 */
export function formatCoefficient(value: number, decimals: number): string {
  return roundTo(value, decimals).toFixed(decimals);
}

/**
 * §6 balls per mix, for the friction-factor label: "6", or "6.5" on an odd
 * split. The stored key stays exact (20/3 is not 6.7) — only the label rounds.
 */
export function formatBallsPerMix(value: number): string {
  return String(roundTo(value, 1));
}

/**
 * §7.5. The lit-segment count as the baker reads the indicator: "½", "1½",
 * "2". A setting number ("setting 4 of 20") is deliberately not offered — a
 * segment count and a dial-click count differ by 2×, and at the 40% ceiling a
 * 2× misread is 80%.
 */
export function formatSegmentCount(full: number, half: boolean): string {
  if (full === 0) return half ? '½' : '0';
  return `${full}${half ? '½' : ''}`;
}

/** "2 lit segments", "1½ lit segments", "½ lit segment". */
export function formatLitSegments(full: number, half: boolean): string {
  const count = formatSegmentCount(full, half);
  return `${count} lit segment${full === 1 && !half || count === '½' ? '' : 's'}`;
}

/**
 * §7.5 item 3, the speed chip's smaller line: "20% · 98 RPM". No duration:
 * since MESSAGE-32 every speed step has its own timer, which carries it.
 */
export function formatSpeedDetail(dial: number, rpm: number): string {
  return `${dial}% · ${rpm} RPM`;
}

/** "65%" from 0.65. */
export function formatPercent(fraction: number, decimals = 0): string {
  return `${roundTo(fraction * 100, decimals).toFixed(decimals)}%`;
}
