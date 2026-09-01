import { describe, expect, it } from 'vitest';
import { calculate, type CalculatorInputs } from '../src/lib/engine';
import { bindTokens, tokenValues, unboundTokens, type ScheduleTokens } from '../src/lib/bindTokens';
import { CONCEPTS } from '../src/content/concepts';
import { STEPS } from '../src/content/steps';

/** {token} binding — WEBSITE-SPEC-biga-calculator.md §8.1. */

/** The §5 vector conditions. */
const INPUTS: CalculatorInputs = {
  balls: 6,
  ballWeightG: 265,
  roomTempF: 70,
  flourTempF: 69,
  bigaTempF: 58,
  frictionFactorF: 14.0,
  bowlMassG: 965,
};

const SCHEDULE: ScheduleTokens = {
  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  coldFermentH: 24,
  temperH: 2.5,
};

const values = tokenValues(calculate(INPUTS), SCHEDULE);

/** Every piece of bindable prose in the app. */
function allContent(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const s of STEPS) {
    for (const [field, text] of [
      ['summary', s.summary],
      ['summaryRetarded', s.summaryRetarded],
      ['summaryClassic', s.summaryClassic],
      ['detail', s.detail],
      // §8.2's conditional blocks carry tokens of their own — {nBiga},
      // {bigaFlourTotal}, {staggerUncentred} — and are rendered to the user,
      // so they belong in every scan the unconditional detail belongs in.
      ['detailWhen', s.detailWhen?.detail],
      ['warningWhen', s.warningWhen?.text],
      ['watchFor', s.watchFor],
      ['timerLabel', s.timerLabel],
    ] as const) {
      if (text) out.push({ where: `${s.id}.${field}`, text });
    }
    for (const v of s.values ?? []) out.push({ where: `${s.id}.values`, text: v });
    if (s.troubleshoot) {
      for (const row of s.troubleshoot.rows) {
        for (const cell of row) out.push({ where: `${s.id}.troubleshoot`, text: cell });
      }
    }
  }
  for (const c of CONCEPTS) out.push({ where: `concept:${c.id}`, text: c.body });
  return out;
}

describe('every token in the content resolves', () => {
  it('leaves nothing unbound anywhere', () => {
    const misses: string[] = [];
    for (const { where, text } of allContent()) {
      for (const token of unboundTokens(text, values)) misses.push(`${where}: {${token}}`);
    }
    expect(misses, `unbound tokens:\n${misses.join('\n')}`).toEqual([]);
  });

  it('leaves no brace behind after binding', () => {
    for (const { where, text } of allContent()) {
      const bound = bindTokens(text, values);
      expect(bound, `${where} still has a token`).not.toMatch(/\{[a-zA-Z][a-zA-Z0-9]*\}/);
      expect(bound, `${where} rendered an unknown-token marker`).not.toContain('⟨unknown token');
    }
  });

  it('binds every token the values table declares', () => {
    // Guards the other direction: a binding nothing uses is dead weight, and
    // usually means a token was renamed in the spec.
    const used = new Set<string>();
    for (const { text } of allContent()) {
      // Must match the binder's own regex, which §8.2 widened beyond bare
      // identifiers: `{mixIndex + 1}` and the nBiga ternary are literal keys.
      for (const m of text.matchAll(/\{([^{}]+)\}/g)) used.add(m[1] as string);
    }
    expect([...Object.keys(values)].filter((k) => !used.has(k))).toEqual([]);
  });
});

describe('expressions in prose are a parse error', () => {
  // §8.1: every token is a bare identifier, no expressions, ever. This is
  // stronger than "they happen not to bind" — an expression must be REPORTED,
  // because `bindTokens` leaves it as literal braces, which reads as a
  // template bug rather than a content one.
  it.each([
    '{mixIndex + 1}',
    '{nBiga > 1 ? " × " + nBiga + " bigas" : ""}',
    '{salt * 2}',
    '{some.property}',
  ])('rejects %s', (expr) => {
    expect(unboundTokens(`Weigh ${expr} g`, values)).not.toEqual([]);
  });

  it('still accepts every bare identifier the content uses', () => {
    for (const { where, text } of allContent()) {
      expect(unboundTokens(text, values), where).toEqual([]);
    }
  });

  it('leaves no brace behind once bound', () => {
    // The belt to the parse error's braces: if an expression ever did slip
    // through, this catches it in the rendered output.
    for (const { where, text } of allContent()) {
      expect(bindTokens(text, values), where).not.toMatch(/[{}]/);
    }
  });
});

describe('per-mix scope', () => {
  it('gives the mix steps per-mix water and salt, not batch totals', () => {
    // The bug this guards: at 12 balls the baker runs two 6-ball mixes. Showing
    // the batch total on `mix-2` would have them pour 423.2 g into the first
    // mix instead of 211.6 — double.
    const split = tokenValues(
      calculate({ ...INPUTS, balls: 12 }),
      SCHEDULE,
    );
    const single = tokenValues(calculate({ ...INPUTS, balls: 6 }), SCHEDULE);
    for (const key of ['phaseAWaterPerMix', 'phaseBWaterPerMix', 'saltPerMix']) {
      expect(split[key], `${key} at 12 balls`).toBe(single[key]);
    }
    // And the ingredients card still gets the batch total from the engine.
    expect(calculate({ ...INPUTS, balls: 12 }).formula.salt).toBeCloseTo(52.7, 1);
  });
});

describe('bound values', () => {
  it('matches the §5 six-ball vector', () => {
    // Per-biga and per-mix at 6 balls, where nBiga and nMix are both 1, so
    // these equal the batch totals from the §5 vector.
    expect(values['bigaFlourPerBiga']).toBe('611.2');
    expect(values['bigaWaterPerBiga']).toBe('305.6');
    expect(values['bigaADYPerBiga']).toBe('2.29');
    expect(values['freshFlourPerMix']).toBe('329.1');
    expect(values['saltPerMix']).toBe('26.3');
  });

  it('splits the bassinage water 60/40', () => {
    const sixty = Number(values['phaseAWaterPerMix']);
    const forty = Number(values['phaseBWaterPerMix']);
    // Each half is rounded to 1 dp independently, so the two can sum to 0.1 g
    // more than the rounded whole (211.6 + 141.1 = 352.7 vs 352.6). That is
    // display rounding, not a formula error, and 0.1 g of water is below what
    // a kitchen scale resolves — so the tolerance allows it rather than
    // distorting one of the two numbers to make them tally.
    expect(Math.abs(sixty + forty - 352.6)).toBeLessThanOrEqual(0.15);
    expect(sixty / (sixty + forty)).toBeCloseTo(0.6, 3);
    // The underlying split is exact even though the display is not.
    expect(sixty).toBeGreaterThan(forty);
  });

  it('trims trailing zeros on inputs but keeps display precision on weights', () => {
    // "Divide to 265 g", not "265.0 g" — but "611.2 g" keeps its decimal.
    expect(values['ballWeight']).toBe('265');
    expect(values['balls']).toBe('6');
    expect(values['temper']).toBe('2.5');
    expect(values['coldFerment']).toBe('24');
    expect(values['bigaFlourPerBiga']).toContain('.');
  });

  it('carries the probe target and DDT as temperatures', () => {
    expect(values['ddt']).toBe('75.0');
    // §5: 6 balls at FF 14 in a 70 °F room.
    expect(values['probeTarget']).toBe('71.8');
  });

  it('plans the room time at 90 min until a dough temperature is measured', () => {
    expect(values['roomMin']).toBe('90');
    expect(values['finalDoughTemp']).toBe('75.0');

    const measured = tokenValues(calculate({ ...INPUTS, finalDoughTempF: 73 }), SCHEDULE);
    expect(measured['roomMin']).toBe('110');
    expect(measured['finalDoughTemp']).toBe('73.0');
  });

  it('tracks the schedule adjustments', () => {
    const v = tokenValues(calculate(INPUTS), { ...SCHEDULE, bigaFridgeH: 18, temperH: 3 });
    expect(v['bigaFridge']).toBe('18');
    expect(v['temper']).toBe('3');
  });
});

describe('unknown tokens fail loudly', () => {
  it('renders a visible marker rather than an empty string', () => {
    // "Weigh  g of flour" would look like the app is working. It is not.
    const out = bindTokens('Weigh {nosuchthing} g of flour', values);
    expect(out).toBe('Weigh ⟨unknown token: nosuchthing⟩ g of flour');
    expect(out).not.toBe('Weigh  g of flour');
  });

  it('reports them', () => {
    expect(unboundTokens('{a} and {bigaFlourPerBiga} and {b}', values)).toEqual(['a', 'b']);
  });

  it('leaves text with no tokens alone', () => {
    expect(bindTokens('No tokens here.', values)).toBe('No tokens here.');
  });
});

describe('step summaries bind to real numbers', () => {
  it('fills biga-1 with the weight to put on the scale', () => {
    const step = STEPS.find((s) => s.id === 'biga-1');
    expect(bindTokens(step?.summary ?? '', values)).toContain('611.2 g of flour');
  });

  it('fills both of biga-4’s schedule summaries', () => {
    const step = STEPS.find((s) => s.id === 'biga-4');
    expect(bindTokens(step?.summaryRetarded ?? '', values)).toContain('19 hours in the fridge');
    expect(bindTokens(step?.summaryClassic ?? '', values)).toContain('16 hours at 61–65 °F');
  });

  it('fills mix-4 with the probe target', () => {
    const step = STEPS.find((s) => s.id === 'mix-4');
    expect(bindTokens(step?.summary ?? '', values)).toContain('71.8 °F');
  });
});
