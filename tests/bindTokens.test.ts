import { describe, expect, it } from 'vitest';
import { calculate, type CalculatorInputs } from '../src/lib/engine';
import { bindTokens, tokenValues, unboundTokens, type ScheduleTokens } from '../src/lib/bindTokens';
import { C } from '../src/lib/constants';
import { detailConditionContext } from '../src/lib/stepInstances';
import { formatTempF } from '../src/lib/format';
import { CONCEPTS } from '../src/content/concepts';
import { STEPS } from '../src/content/steps';
import { CAPACITY } from '../src/content/capacity';

/** {token} binding — WEBSITE-SPEC-biga-calculator.md §8.1. */

/** The §5 vector conditions. */
const INPUTS: CalculatorInputs = {
  balls: 6,
  ballWeightG: 265,
  roomTempF: 70,
  flourTempF: 69,
  bigaTempF: 58,
  frictionFactorF: 14.0,
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
  // §7.3 capacity messages bind through the same table (MESSAGE-29).
  for (const [key, text] of Object.entries(CAPACITY)) out.push({ where: `capacity:${key}`, text });
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

describe('§4.10 tokens', () => {
  /** The three §4.10 cases, at inputs a baker can enter. */
  const phraseAt = (over: Partial<CalculatorInputs>) =>
    tokenValues(calculate({ ...INPUTS, ...over }), SCHEDULE).probeGapPhrase;

  it('says below, above, or right at DDT — never a signed number', () => {
    // 6 balls, 70 °F room, FF 14: the usual case.
    expect(phraseAt({})).toBe('3.2 °F below DDT');
    // 3 balls, 60 °F room, FF 10: the rest cools the dough more than Phases C
    // and D warm it, so the target sits ABOVE DDT. Bake 2 is a 3-ball bake
    // that measures FF, in a kitchen that could be this cold.
    expect(phraseAt({ balls: 3, roomTempF: 60, flourTempF: 60, frictionFactorF: 10 })).toBe('0.3 °F above DDT');
    // Same kitchen at FF 11.1: the gap is +0.006, so the printed target is
    // 75.0 against a printed DDT of 75.0 — and the sentence must not say
    // "0.0 °F below".
    expect(phraseAt({ balls: 3, roomTempF: 60, flourTempF: 60, frictionFactorF: 11.1 })).toBe('right at DDT');
    // And from the other side of zero: at FF 11.0 the gap is −0.02.
    expect(phraseAt({ balls: 3, roomTempF: 60, flourTempF: 60, frictionFactorF: 11 })).toBe('right at DDT');
  });

  it('prints the magnitude of the printed DDT minus the printed target, exactly', () => {
    // §4.10: "The number must equal |printed DDT − printed target| exactly."
    // Swept across the directions and the zero crossing.
    for (const balls of [3, 6, 9, 12, 18]) {
      for (let room = 60; room <= 84; room += 0.5) {
        for (const ff of [8, 10, 11, 11.1, 12, 14, 14.03, 16]) {
          const inputs = { ...INPUTS, balls, roomTempF: room, flourTempF: room, frictionFactorF: ff };
          const v = tokenValues(calculate(inputs), SCHEDULE);
          const printed = Number(v.ddt) - Number(v.probeTarget);
          const at = `${balls} balls, room ${room}, FF ${ff}`;
          if (Math.abs(printed) < 0.05) {
            expect(v.probeGapPhrase, at).toBe('right at DDT');
          } else {
            const m = /^(\d+\.\d) °F (below|above) DDT$/.exec(v.probeGapPhrase ?? '');
            expect(m, `${at}: ${v.probeGapPhrase}`).not.toBeNull();
            expect(Number(m![1]), at).toBeCloseTo(Math.abs(printed), 9);
            expect(m![2], at).toBe(printed > 0 ? 'below' : 'above');
          }
        }
      }
    }
  });

  it('prints the parts rounded once each', () => {
    const r = calculate({ ...INPUTS, roomTempF: 62, flourTempF: 62 });
    const v = tokenValues(r, SCHEDULE);
    expect(v.frictionRemainingF).toBe(formatTempF(r.probe.frictionRemainingF));
    expect(v.restExchangeF).toBe(formatTempF(r.probe.restExchangeF));
  });

  it('prints the split from PHASE_A_FRACTION, with no scope', () => {
    // To one decimal, independently of floating point: 0.57 × 100 is 56.999…
    const pct = (f: number) => String(Math.round(f * 1000) / 10);
    expect(values.phaseAPercent).toBe(pct(C.PHASE_A_FRACTION));
    expect(values.phaseBPercent).toBe(pct(1 - C.PHASE_A_FRACTION));
  });

  it('binds the fixed bowl mass — MESSAGE-29 made it a constant, not an input', () => {
    expect(tokenValues(calculate(INPUTS), SCHEDULE).bowlMassG).toBe(String(C.BOWL_MASS_G));
  });
});

/**
 * §4.9: "a condition that triggers prose must be decided on the values the
 * prose will print." These replace the FINDINGS-18 pins: at 267 g the old
 * block fired on 12.02 > 12 and printed "12.0 inches" and "0.083 rather than
 * 0.083". Now it reads the number it prints.
 */
describe('§4.9 the capped block shows exactly when its printed number reaches THICKER_NOTE_MIN_PERCENT', () => {
  const at = (ballWeightG: number) => {
    const r = calculate({ ...INPUTS, ballWeightG });
    const v = tokenValues(r, SCHEDULE);
    return { printed: v.thicknessPercentOver, shows: detailConditionContext(r, v).thickerThanDefault };
  };

  it('stays hidden below 10%, as printed, and shows from it', () => {
    // 10 is Dave's call (MESSAGE-21): where the thickness is noticeable in the
    // bake. Before it the block fired from 1%, a floor against printing "0%".
    expect(at(240)).toEqual({ printed: '0', shows: false });
    expect(at(265)).toEqual({ printed: '0', shows: false });
    expect(at(266)).toEqual({ printed: '0', shows: false }); // capped by 0.02 in
    expect(at(267)).toEqual({ printed: '1', shows: false }); // capped, and below the note
    expect(at(290)).toEqual({ printed: '9', shows: false }); // 9.43% raw
    expect(at(291)).toEqual({ printed: '10', shows: true }); // 9.81% raw — the printed value decides
    expect(at(300)).toEqual({ printed: '13', shows: true });
  });

  it('never disagrees with its own sentence anywhere in the input range', () => {
    for (let g = 240; g <= 300; g++) {
      const { printed, shows } = at(g);
      expect(shows, `${g} g prints ${printed}%`).toBe(Number(printed) >= C.THICKER_NOTE_MIN_PERCENT);
    }
  });
});
