import { describe, expect, it } from 'vitest';
import { calculate, type CalculatorInputs } from '../src/lib/engine';
import { buildRecipeText } from '../src/lib/recipeText';

/** §7.1 "copy as text". The output has to be reproducible from itself. */

const BASE: CalculatorInputs = {
  balls: 6,
  ballWeightG: 265,
  roomTempF: 70,
  flourTempF: 69,
  bigaTempF: 58,
  tapTempF: 60,
  freezerTempF: 16,
  frictionFactorF: 14.0,
  bowlMassG: 965,
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

  it('carries the water target', () => {
    // §5 six-ball vector: 68.1 °F, which is above tap, so no ice.
    const out = text();
    expect(out).toContain('68.1 °F');
    expect(out).toContain('warm the water, no ice');
  });

  it('shows both bassinage additions as weighable grams', () => {
    // The bake-1 bug: "~60% of the water" caused a guess and cost a data point.
    const out = text();
    expect(out).toContain('211.6 g (weigh it)');
    expect(out).toContain('141.1 g in 3 additions');
  });

  it('records the bowl mass, since it is now part of the model', () => {
    expect(text()).toMatch(/Bowl\s+965 g/);
  });

  it('marks the room time as planned until a dough temperature is measured', () => {
    expect(text()).toContain('planned at DDT');
    const measured = text({ finalDoughTempF: 72 });
    expect(measured).toContain('121 min');
    expect(measured).toContain('final dough 72.0 °F');
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

  it('shows an ice split when the target is genuinely below tap', () => {
    const out = text({ bigaTempF: 90, roomTempF: 85, flourTempF: 85 });
    expect(out).toMatch(/Ice\s+[\d.]+ g/);
    expect(out).toMatch(/Tap\s+[\d.]+ g/);
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
