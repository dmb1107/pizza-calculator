import { describe, expect, it } from 'vitest';
import { calculate, type CalculatorInputs } from '../src/lib/engine';
import { bindTokens, tokenValues, unboundTokens, type ScheduleTokens } from '../src/lib/bindTokens';
import { CONCEPTS } from '../src/content/concepts';
import { STEPS } from '../src/content/steps';

/** {token} binding — WEBSITE-SPEC-biga-calculator.md §8.1. */

const INPUTS: CalculatorInputs = {
  balls: 6,
  ballWeightG: 265,
  roomTempF: 70,
  flourTempF: 70,
  bigaTempF: 64,
  tapTempF: 60,
  freezerTempF: 16,
  frictionFactorF: 14,
};

const SCHEDULE: ScheduleTokens = {
  bigaFridgeH: 19,
  bigaRoomOnlyH: 16,
  ballRoomTempH: 1.5,
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
      for (const m of text.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)) used.add(m[1] as string);
    }
    expect([...Object.keys(values)].filter((k) => !used.has(k))).toEqual([]);
  });
});

describe('bound values', () => {
  it('matches the §5 six-ball vector', () => {
    expect(values['bigaFlour']).toBe('611.2');
    expect(values['bigaWater']).toBe('305.6');
    expect(values['bigaADY']).toBe('2.32');
    expect(values['freshFlour']).toBe('329.1');
    expect(values['salt']).toBe('26.3');
  });

  it('splits the bassinage water 60/40', () => {
    const sixty = Number(values['freshWater60']);
    const forty = Number(values['freshWater40']);
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
    expect(values['ballRoomTemp']).toBe('1.5');
    expect(values['coldFerment']).toBe('24');
    expect(values['bigaFlour']).toContain('.');
  });

  it('carries the probe target and DDT as temperatures', () => {
    expect(values['ddt']).toBe('75.0');
    expect(values['probeTarget']).toBe('71.4');
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
    expect(unboundTokens('{a} and {bigaFlour} and {b}', values)).toEqual(['a', 'b']);
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
    expect(bindTokens(step?.summary ?? '', values)).toContain('71.4 °F');
  });
});
