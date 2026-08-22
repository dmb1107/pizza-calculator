/**
 * Plain-text rendering of a batch — WEBSITE-SPEC-biga-calculator.md §7.1's
 * "copy as text" button.
 *
 * The output goes into a notes app, a message to whoever is baking with you, or
 * a bake log. It carries the conditions as well as the weights, because a gram
 * figure without the temperatures it was computed from can't be reproduced.
 */

import { formatAdy, formatGrams, formatGramsWhole, formatTempF } from './format';
import type { CalculatorResult } from './engine';

/** Pad a label so the numbers line up in a monospaced viewer. */
function row(label: string, value: string): string {
  return `  ${label.padEnd(14)}${value}`;
}

export function buildRecipeText(result: CalculatorResult): string {
  const { inputs, formula, capacity } = result;
  const lines: string[] = [];

  lines.push(`Biga Neapolitan — ${inputs.balls} × ${formatGrams(inputs.ballWeightG)} g`);
  lines.push(`65% biga · 70% hydration · 2.8% salt · ${formatGrams(formula.doughTotal)} g total`);
  lines.push('');

  lines.push('BIGA');
  lines.push(row('Flour', `${formatGrams(formula.bigaFlour)} g`));
  lines.push(row('Water', `${formatGrams(formula.bigaWater)} g (room temperature)`));
  lines.push(row('ADY', `${formatAdy(formula.bigaADY)} g`));
  if (capacity.nBiga > 1) {
    lines.push(row('Split', `${capacity.nBiga} batches of ~${formatGrams(capacity.bigaMassPerBatch)} g`));
  }
  lines.push('');

  lines.push('FINAL MIX');
  lines.push(row('Biga', `${formatGrams(formula.bigaMass)} g (all of it)`));
  lines.push(row('Fresh flour', `${formatGrams(formula.freshFlour)} g`));
  lines.push(row('Fresh water', `${formatGrams(formula.freshWater)} g`));
  // Weighable grams for each addition — "~60% of the water" caused a guess on
  // bake 1 and cost a data point.
  lines.push(row('  Phase A', `${formatGrams(formula.phaseAWater)} g (weigh it)`));
  lines.push(row('  Phase B', `${formatGrams(formula.phaseBWater)} g in 3 additions`));
  lines.push(row('Salt', `${formatGrams(formula.salt)} g`));
  if (capacity.nMix > 1) {
    const how = capacity.divideBigaAcrossMixes
      ? `${capacity.nMix} mixes of ~${formatGrams(capacity.doughPerMix)} g — divide the one biga by weight`
      : `${capacity.nMix} mixes of ~${formatGrams(capacity.doughPerMix)} g`;
    lines.push(row('Split', how));
  }
  lines.push('');

  lines.push('WATER');
  lines.push(row('Target', `${formatTempF(result.waterTempF)} °F`));
  lines.push(row('', 'blend fridge-cold and tap water to hit it'));
  lines.push('');

  lines.push('TARGETS');
  lines.push(row('DDT', `${formatTempF(result.ddtF)} °F`));
  lines.push(row('Probe at B', `${formatTempF(result.probeTargetF)} °F`));
  lines.push(
    row(
      'Room time',
      `${Math.round(result.roomMinutes)} min` +
        (result.roomMinutesIsPlanned
          ? ' (planned at DDT — recompute once you measure)'
          : ` (final dough ${formatTempF(result.effectiveFinalTempF)} °F)`),
    ),
  );
  lines.push('');

  lines.push('CONDITIONS');
  lines.push(row('Room', `${formatTempF(inputs.roomTempF)} °F`));
  lines.push(row('Flour', `${formatTempF(inputs.flourTempF)} °F`));
  lines.push(row('Biga at mix', `${formatTempF(inputs.bigaTempF)} °F`));
  lines.push(row('Friction', `${formatTempF(inputs.frictionFactorF)} °F`));
  lines.push(row('Bowl', `${formatGramsWhole(inputs.bowlMassG ?? 965)} g`));

  return lines.join('\n');
}
