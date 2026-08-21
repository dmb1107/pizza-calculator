import { describe, expect, it } from 'vitest';
import { calculate, type CalculatorInputs } from '../src/lib/engine';
import { buildRecipeText } from '../src/lib/recipeText';

/** §7.1 "copy as text". The output has to be reproducible from itself. */

const BASE: CalculatorInputs = {
  balls: 6,
  ballWeightG: 265,
  roomTempF: 70,
  flourTempF: 70,
  bigaTempF: 64,
  tapTempF: 60,
  freezerTempF: 16,
  frictionFactorF: 14,
};

function text(overrides: Partial<CalculatorInputs> = {}): string {
  return buildRecipeText(calculate({ ...BASE, ...overrides }));
}

describe('recipe text', () => {
  it('carries every weight from the §5 six-ball vector', () => {
    const out = text();
    for (const value of ['611.2', '305.6', '2.32', '916.9', '329.1', '352.6', '26.3', '1625.0']) {
      expect(out, `missing ${value}`).toContain(value);
    }
  });

  it('carries the water target and the ice split', () => {
    const out = text();
    expect(out).toContain('52.5 °F');
    expect(out).toContain('14.6 g');
    expect(out).toContain('338.0 g');
  });

  it('records the conditions, so the numbers can be reproduced', () => {
    // A gram figure without the temperatures behind it is not reproducible.
    const out = text({ roomTempF: 66, bigaTempF: 58, tapTempF: 55, freezerTempF: 4 });
    expect(out).toContain('CONDITIONS');
    for (const value of ['66.0', '58.0', '55.0', '4.0', '14.0']) {
      expect(out, `missing condition ${value}`).toContain(value);
    }
  });

  it('names the split when one biga feeds several mixes', () => {
    const out = text({ balls: 12 });
    expect(out).toContain('2 mixes');
    expect(out).toContain('divide the one biga by weight');
  });

  it('names the biga split at 18 balls', () => {
    const out = text({ balls: 18 });
    expect(out).toMatch(/Split\s+2 batches/);
  });

  it('says warm the water rather than printing a zero ice figure', () => {
    const out = text({ bigaTempF: 42 });
    expect(out).toContain('warm the water, no ice');
    expect(out).not.toMatch(/Ice\s+0\.0 g/);
  });

  it('flags an unreachable target instead of a plausible number', () => {
    // Deliberately absurd — a 120 °F kitchen with a 40 °F friction factor and a
    // 60 °F DDT needs water at -180 °F, past what ice can deliver. The point is
    // that the guard prints a refusal rather than a number you might act on.
    const out = text({
      ddtOverrideF: 60,
      frictionFactorF: 40,
      bigaTempF: 120,
      flourTempF: 120,
      roomTempF: 120,
    });
    expect(out).toContain('NOT REACHABLE');
    expect(out).toContain('chill the biga');
  });

  it('states both targets', () => {
    const out = text();
    expect(out).toContain('DDT');
    expect(out).toContain('Probe at B');
  });

  it('is plain text with no trailing whitespace on any line', () => {
    for (const line of text().split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });
});
