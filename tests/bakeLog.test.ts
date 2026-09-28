import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { C } from '../src/lib/constants';
import {
  BADGE_TEMPLATES,
  BAKE_1_SEED,
  MIX_PHASES,
  PHASE_KEYS,
  bakeFrictionFactorF,
  compareMixSize,
  currentFormulaSnapshot,
  ffInUse,
  frictionBadge,
  mixStatus,
  normalizeFrictionFactorF,
  roomSlope,
  sameMixSize,
  type LoggedBake,
  type LoggedMix,
  type PhaseKey,
} from '../src/lib/bakeLog';
import {
  calculate,
  computeCapacity,
  computeFinalTempF,
  computeFormula,
  computeThermal,
  computeWaterTempF,
} from '../src/lib/engine';
import { BAKE_1 } from './vectors';

/**
 * §5 *Bake log* (MESSAGE-45): arithmetic pins for the log's rules. None of
 * them is a measurement.
 */

const SPEC = readFileSync(join(__dirname, '../docs/WEBSITE-SPEC-biga-calculator.md'), 'utf8');

const REFERENCE_SECONDS = Object.fromEntries(MIX_PHASES.map((p) => [p.key, p.referenceMin * 60])) as Record<
  PhaseKey,
  number
>;

const entered = (value: number) => ({ value, entered: true });

/** A mix whose readings all count. */
function mix(overrides: Partial<LoggedMix> = {}): LoggedMix {
  return {
    mix_index: 1,
    biga_temp_at_mix_f: entered(58),
    bowl_state: 'cold',
    bowl_temp_f: entered(58),
    water_temp_used_f: entered(63),
    final_dough_temp_f: entered(73.5),
    phase_seconds: { ...REFERENCE_SECONDS },
    excluded: false,
    ...overrides,
  };
}

let seq = 0;
function bake(overrides: Partial<LoggedBake> & { mixes?: LoggedMix[] } = {}): LoggedBake {
  const balls = overrides.balls ?? 6;
  const ball_g = overrides.ball_g ?? 265;
  const n_mix = overrides.n_mix ?? computeCapacity(computeFormula({ balls, ballWeightG: ball_g })).nMix;
  seq += 1;
  return {
    bake_id: `2026-09-${String(seq).padStart(2, '0')}-120000`,
    date: `2026-09-${String(seq).padStart(2, '0')}`,
    balls,
    ball_g,
    n_mix,
    formula: currentFormulaSnapshot(),
    room_temp_f: entered(70),
    flour_temp_f: entered(69),
    flour_follows_room: false,
    mixes: [mix()],
    ...overrides,
  };
}

/**
 * A mix at mid-range times whose readings solve to `ff`, at bake 1's other
 * readings. The final temperature is the engine's own prediction, so the
 * solve inverts it exactly.
 */
function mixSolvingTo(ff: number, balls: number, ballG: number, index = 1): LoggedMix {
  const f = computeFormula({ balls, ballWeightG: ballG });
  const thermal = computeThermal(f, C.BOWL_MASS_G, computeCapacity(f).nMix);
  const finalTempF = computeFinalTempF(
    { ddtF: 75, frictionFactorF: ff, bigaTempF: 58, bowlTempF: 58, flourTempF: 69, roomTempF: 70 },
    thermal,
    63,
  );
  return mix({ mix_index: index, final_dough_temp_f: entered(finalTempF) });
}

function bakeAt(balls: number, ballG: number, ffs: number[]): LoggedBake {
  return bake({ balls, ball_g: ballG, mixes: ffs.map((ff, i) => mixSolvingTo(ff, balls, ballG, i + 1)) });
}

describe('§4.3 the mix profile, derived from the step content', () => {
  it('reads the four speed steps of the mix phase, in order', () => {
    expect(MIX_PHASES.map((p) => p.stepId)).toEqual(['mix-2', 'mix-3', 'mix-5', 'mix-7']);
    expect(MIX_PHASES.map((p) => p.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(MIX_PHASES.map((p) => p.dial)).toEqual([15, 20, 30, 20]);
  });

  it('references the middle of each printed range: A 3.5, B 5.5, C 3.5, D 52.5 s', () => {
    expect(MIX_PHASES.map((p) => p.referenceMin)).toEqual([3.5, 5.5, 3.5, 52.5 / 60]);
  });

  it('adds up to 13.375 motor minutes at the references', () => {
    expect(MIX_PHASES.reduce((s, p) => s + p.referenceMin, 0)).toBeCloseTo(13.375, 12);
  });
});

describe('§5 Bake log: normalization', () => {
  const minutes = (m: Partial<Record<PhaseKey, number>>) =>
    Object.fromEntries(MIX_PHASES.map((p) => [p.key, m[p.key] ?? p.referenceMin])) as Record<PhaseKey, number>;

  it("solves bake 1's readings to 14.031045", () => {
    const status = mixStatus(bake(), mix());
    expect(status.ff).toBeCloseTo(14.031045, 6);
  });

  it('normalizes it to 10.791045 with Phase C at 6.5 min and A, B, D at their references', () => {
    const status = mixStatus(bake(), mix({ phase_seconds: { ...REFERENCE_SECONDS, c: BAKE_1.phaseCMin * 60 } }));
    expect(status.ffNominal).toBeCloseTo(10.791045, 6);
  });

  it('leaves an FF unchanged with every phase at its reference', () => {
    expect(normalizeFrictionFactorF(14, minutes({}))).toBe(14);
  });

  it('adds 0.7075 for A 4 min, B 6 min, C 2 min, D 60 s', () => {
    expect(normalizeFrictionFactorF(14, minutes({ a: 4, b: 6, c: 2, d: 1 })) - 14).toBeCloseTo(0.7075, 12);
  });

  it('applies no Ct/TOT factor: one minute of Phase C is FRICTION_RATE[30] at every mix size', () => {
    for (const balls of [3, 6, 9, 12]) {
      const b = bake({ balls });
      const base = mixStatus(b, mix()).ffNominal!;
      const long = mixStatus(b, mix({ phase_seconds: { ...REFERENCE_SECONDS, c: (3.5 + 1) * 60 } })).ffNominal!;
      expect(base - long).toBeCloseTo(C.FRICTION_RATE[30], 12);
    }
  });
});

describe('§10 which mixes count', () => {
  it('counts a mix with every reading entered and all four phase times', () => {
    expect(mixStatus(bake(), mix())).toMatchObject({ counted: true, reasons: [] });
  });

  it.each([
    ['room', { room_temp_f: { value: 70, entered: false } }, {}],
    ['flour', { flour_temp_f: { value: 69, entered: false } }, {}],
    ['biga', {}, { biga_temp_at_mix_f: { value: 58, entered: false } }],
    ['bowl', {}, { bowl_temp_f: { value: 58, entered: false } }],
    ['water', {}, { water_temp_used_f: { value: 63, entered: false } }],
    ['final', {}, { final_dough_temp_f: { value: 73.5, entered: false } }],
    ['phases', {}, { phase_seconds: { ...REFERENCE_SECONDS, d: null } }],
    ['excluded', {}, { excluded: true }],
  ] as const)('leaves a mix out for %s', (reason, bakeOver, mixOver) => {
    const status = mixStatus(bake(bakeOver as Partial<LoggedBake>), mix(mixOver as Partial<LoggedMix>));
    expect(status.counted).toBe(false);
    expect(status.reasons).toEqual([reason]);
  });

  it('lets flour follow the room: a room reading entered covers it', () => {
    const b = bake({ flour_temp_f: { value: 70, entered: false }, flour_follows_room: true });
    expect(mixStatus(b, mix()).counted).toBe(true);
  });

  it("leaves out a bake mixed under another formula, and doesn't solve it", () => {
    const other = { ...currentFormulaSnapshot(), hydration: 0.72 };
    const status = mixStatus(bake({ formula: other }), mix());
    expect(status).toMatchObject({ counted: false, ff: null, reasons: ['formula'] });
  });

  it('leaves out a bake mixed at other speeds', () => {
    const snap = currentFormulaSnapshot();
    const other = { ...snap, speeds: { ...snap.speeds, c: 35 } };
    expect(mixStatus(bake({ formula: other }), mix()).reasons).toEqual(['formula']);
  });

  it('still solves a mix that does not count, so the log can show it', () => {
    const status = mixStatus(bake(), mix({ bowl_temp_f: { value: 58, entered: false } }));
    expect(status.ff).toBeCloseTo(14.031045, 6);
  });

  it('shows why an unmeasured bowl is left out: 5 °F over reads FF 0.55 low at 6 balls, 1.09 at 3', () => {
    for (const [balls, drop] of [
      [6, 0.55],
      [3, 1.09],
    ] as const) {
      const b = bake({ balls });
      const low = mixStatus(b, mix({ bowl_temp_f: entered(58 + 5) })).ff!;
      expect(Number((mixStatus(b, mix()).ff! - low).toFixed(2))).toBe(drop);
    }
  });
});

describe('§5 Bake log: the FF in use', () => {
  it('averages a split batch once, then takes the last three bakes', () => {
    const bakes = [bakeAt(12, 265, [11.0, 11.4]), bakeAt(6, 265, [10.6]), bakeAt(6, 265, [11.0]), bakeAt(6, 265, [10.4])];
    expect(bakes.map((b) => bakeFrictionFactorF(b)!)).toEqual(
      [11.2, 10.6, 11.0, 10.4].map((x) => expect.closeTo(x, 9)),
    );
    const inUse = ffInUse(bakes, { balls: 6, nMix: 1 });
    expect(inUse.ff).toBeCloseTo(10.666667, 6);
    expect(inUse.source).toMatchObject({ step: 1, bakes: 3 });
    if (inUse.source.step !== 1) throw new Error('step 1');
    expect(inUse.source.spread).toBeCloseTo(0.6, 9);
  });

  it('interpolates between counted sizes, holds one side flat, never extrapolates', () => {
    const bakes = [bakeAt(3, 265, [11.0]), bakeAt(9, 265, [12.2])];
    // 13 × 265 g runs as two 6.5-ball mixes; 20 × 240 g as two 10-ball mixes.
    expect(computeCapacity(computeFormula({ balls: 13, ballWeightG: 265 })).nMix).toBe(2);
    expect(computeCapacity(computeFormula({ balls: 20, ballWeightG: 240 })).nMix).toBe(2);
    expect(ffInUse(bakes, { balls: 13, nMix: 2 }).ff).toBeCloseTo(11.7, 9);
    expect(ffInUse(bakes, { balls: 20, nMix: 2 })).toMatchObject({ ff: expect.closeTo(12.2, 9), source: { step: 3 } });
    expect(ffInUse(bakes, { balls: 3, nMix: 1 })).toMatchObject({ ff: expect.closeTo(11.0, 9), source: { step: 1 } });
  });

  it('reads the seed at 6 and DEFAULT_FF elsewhere with no counted bake', () => {
    expect(ffInUse([], { balls: 6, nMix: 1 })).toEqual({ ff: 14.03, source: { step: 4, seed: true } });
    expect(ffInUse([], { balls: 12, nMix: 2 }).ff).toBe(14.03);
    expect(ffInUse([], { balls: 9, nMix: 1 })).toEqual({ ff: C.DEFAULT_FF, source: { step: 4, seed: false } });
    expect(ffInUse([], { balls: 13, nMix: 2 }).ff).toBe(C.DEFAULT_FF);
  });

  it('retires the seed with the first counted bake at any size', () => {
    const inUse = ffInUse([bakeAt(9, 265, [12.2])], { balls: 6, nMix: 1 });
    expect(inUse).toMatchObject({ ff: expect.closeTo(12.2, 9), source: { step: 3 } });
  });

  it('ignores bakes with no counted mix', () => {
    const b = bakeAt(6, 265, [11]);
    b.mixes[0]!.excluded = true;
    expect(ffInUse([b], { balls: 6, nMix: 1 }).source).toEqual({ step: 4, seed: true });
  });

  it('is the seed, bake 1 solved and rounded to two places', () => {
    expect(BAKE_1_SEED.value).toBe(Number(mixStatus(bake(), mix()).ff!.toFixed(2)));
    expect(BAKE_1_SEED.value).toBe(BAKE_1.ff);
  });

  it('compares mix sizes as the pair, not a rounded float', () => {
    expect(sameMixSize({ balls: 12, nMix: 2 }, { balls: 6, nMix: 1 })).toBe(true);
    expect(sameMixSize({ balls: 13, nMix: 2 }, { balls: 6, nMix: 1 })).toBe(false);
    // 19 balls in 3 mixes and 6.333… are equal only as the pair.
    expect(compareMixSize({ balls: 19, nMix: 3 }, { balls: 20, nMix: 3 })).toBeLessThan(0);
  });
});

describe('§6 the badge', () => {
  /** The badge table from the spec, source → badge. */
  const specBadges = (() => {
    const start = SPEC.indexOf('**Badge** (a field message');
    const table = SPEC.slice(start, SPEC.indexOf('\n\n', SPEC.indexOf('|---|', start)));
    return table
      .split('\n')
      .filter((l) => l.startsWith('| ') && !l.startsWith('| Source'))
      .map((l) => l.split('|').map((c) => c.trim()))
      .map((cells) => cells[2]!.replace(/^`|`$/g, ''));
  })();

  it("matches §6's table, row for row", () => {
    expect(specBadges).toEqual([
      BADGE_TEMPLATES.oneBake,
      BADGE_TEMPLATES.twoBakes,
      BADGE_TEMPLATES.calibrated,
      BADGE_TEMPLATES.interpolated,
      BADGE_TEMPLATES.nearest,
      BADGE_TEMPLATES.seed,
      BADGE_TEMPLATES.estimated,
    ]);
  });

  it('prints the calibrated badge from three bakes, with the spread to one decimal', () => {
    const bakes = [bakeAt(6, 265, [10.6]), bakeAt(6, 265, [11.0]), bakeAt(6, 265, [10.4])];
    const badge = frictionBadge(ffInUse(bakes, { balls: 6, nMix: 1 }));
    expect(badge.text).toBe(`calibrated · mean of the last 3 bakes, latest ${bakes[2]!.date} · spread 0.6 °F`);
    expect(badge.tone).toBe('measured');
  });

  it('prints one and two bakes', () => {
    const one = [bakeAt(6, 265, [10.6])];
    expect(frictionBadge(ffInUse(one, { balls: 6, nMix: 1 })).text).toBe(`measured ${one[0]!.date}`);
    const two = [...one, bakeAt(6, 265, [11.0])];
    expect(frictionBadge(ffInUse(two, { balls: 6, nMix: 1 })).text).toBe(
      `mean of 2 bakes, latest ${two[1]!.date} · spread 0.4 °F`,
    );
  });

  it('says where a borrowed value came from', () => {
    const bakes = [bakeAt(3, 265, [11.0]), bakeAt(9, 265, [12.2])];
    expect(frictionBadge(ffInUse(bakes, { balls: 13, nMix: 2 })).text).toBe(
      'interpolated from 3 and 9 balls per mix',
    );
    expect(frictionBadge(ffInUse(bakes, { balls: 20, nMix: 2 })).text).toBe(
      'from 9 balls per mix, the nearest measured size',
    );
  });

  it('prints the seed and the fallback', () => {
    expect(frictionBadge(ffInUse([], { balls: 6, nMix: 1 })).text).toBe('bake 1, 2026-08-21 · not yet calibrated');
    expect(frictionBadge(ffInUse([], { balls: 9, nMix: 1 })).text).toBe('estimated — not yet calibrated');
  });
});

describe('§10 the room slope', () => {
  it('waits for REGRESSION_MIN_BAKES counted bakes at the size', () => {
    const bakes = Array.from({ length: C.REGRESSION_MIN_BAKES - 1 }, () => bakeAt(6, 265, [11]));
    expect(roomSlope(bakes, { balls: 6, nMix: 1 })).toBeNull();
  });

  it('fits FF = a + b × (room − 70) over every counted bake at the size', () => {
    // Synthetic: FF 11 + 0.1 per °F of room. Each bake's readings solve to it.
    const rooms = [62, 64, 66, 68, 70, 72, 74, 76];
    const bakes = rooms.map((room) => {
      const b = bakeAt(6, 265, [11 + 0.1 * (room - 70)]);
      // Room reaches the solve only through the salt, so re-solve at this room.
      const f = computeFormula({ balls: 6, ballWeightG: 265 });
      const thermal = computeThermal(f, C.BOWL_MASS_G, 1);
      const ff = 11 + 0.1 * (room - 70);
      const finalTempF = computeFinalTempF(
        { ddtF: 75, frictionFactorF: ff, bigaTempF: 58, bowlTempF: 58, flourTempF: 69, roomTempF: room },
        thermal,
        63,
      );
      return { ...b, room_temp_f: entered(room), mixes: [mix({ final_dough_temp_f: entered(finalTempF) })] };
    });
    const fit = roomSlope(bakes, { balls: 6, nMix: 1 })!;
    expect(fit.a).toBeCloseTo(11, 9);
    expect(fit.b).toBeCloseTo(0.1, 9);
    expect(fit).toMatchObject({ bakes: 8, roomMinF: 62, roomMaxF: 76 });
  });
});

describe('§4.8 split-batch T_actual (§5 Bake log)', () => {
  const at12 = (finalDoughTempF: (number | null)[]) =>
    calculate({ balls: 12, ballWeightG: 265, roomTempF: 70, flourTempF: 70, bigaTempF: 58, frictionFactorF: 14, finalDoughTempF });

  it('is the mean of the mixes: 73.0 and 75.0 give 74.0, roomMin 90 and a 72.5-minute rise', () => {
    const r = at12([73.0, 75.0]);
    expect(r.effectiveFinalTempF).toBeCloseTo(74.0, 12);
    expect(r.roomMinutes).toBeCloseTo(90, 9);
    expect(r.ballRoomMinutes).toBeCloseTo(72.5, 9);
    expect(r.roomMinutesIsPlanned).toBe(false);
  });

  it('counts a mix not yet read at DDT: the first alone gives 73.5 and 77.4', () => {
    const r = at12([73.0, null]);
    expect(r.effectiveFinalTempF).toBeCloseTo(73.5, 12);
    expect(Number(r.ballRoomMinutes.toFixed(1))).toBe(77.4);
    // A shorter array reads the same: the later mix is unread, not a copy.
    expect(at12([73.0]).effectiveFinalTempF).toBeCloseTo(73.5, 12);
  });

  it('differs from the last reading alone, which would give 80.4 and 62.9', () => {
    const lastOnly = at12([75.0, 75.0]);
    expect(Number(lastOnly.roomMinutes.toFixed(1))).toBe(80.4);
    expect(Number(lastOnly.ballRoomMinutes.toFixed(1))).toBe(62.9);
  });

  it('plans at DDT with no reading, and a scalar still applies to every mix', () => {
    expect(at12([null, null])).toMatchObject({ roomMinutesIsPlanned: true, roomMinutes: 90 });
    expect(at12([] as number[]).roomMinutesIsPlanned).toBe(true);
    const scalar = calculate({ balls: 12, ballWeightG: 265, roomTempF: 70, flourTempF: 70, bigaTempF: 58, frictionFactorF: 14, finalDoughTempF: 75 });
    expect(scalar.effectiveFinalTempF).toBe(75);
  });
});

describe('§4.4 the 120 °F warning under a low logged FF', () => {
  const hot = (ff: number) =>
    calculate({ balls: 3, ballWeightG: 240, roomTempF: 60, flourTempF: 60, bigaTempF: 45, frictionFactorF: ff });

  it('asks for 108.68 °F at the hottest corner at FF 14', () => {
    expect(hot(14).waterTempF.toFixed(2)).toBe('108.68');
    expect(hot(14).warnings.map((w) => w.id)).not.toContain('water-above-tap');
  });

  it('reaches 120 °F once the FF in use drops below 10.23', () => {
    let lo = 5;
    let hi = 14;
    for (let i = 0; i < 100; i++) {
      const m = (lo + hi) / 2;
      if (hot(m).waterTempF > C.WATER_MAX_F) lo = m;
      else hi = m;
    }
    expect(lo.toFixed(2)).toBe('10.23');
    expect(hot(10.22).warnings.map((w) => w.id)).toContain('water-above-tap');
    expect(hot(10.24).warnings.map((w) => w.id)).not.toContain('water-above-tap');
  });

  it('reads the same with the water formula directly', () => {
    const f = computeFormula({ balls: 3, ballWeightG: 240 });
    const thermal = computeThermal(f, C.BOWL_MASS_G, 1);
    expect(
      computeWaterTempF({ ddtF: 75, frictionFactorF: 14, bigaTempF: 45, bowlTempF: 45, flourTempF: 60, roomTempF: 60 }, thermal),
    ).toBeCloseTo(hot(14).waterTempF, 12);
  });
});

it('keeps PHASE_KEYS and MIX_PHASES aligned', () => {
  expect(PHASE_KEYS).toEqual(MIX_PHASES.map((p) => p.key));
});
