import { describe, expect, it } from 'vitest';
import {
  BALLS_MAX,
  BALLS_MIN,
  mixesFor,
  roundUpToEvenSplit,
  splitsEvenly,
  stepToEvenSplit,
} from '../src/lib/ballCounts';
import { calculate } from '../src/lib/engine';
import { tokenValues } from '../src/lib/bindTokens';
import { raisedNote } from '../src/lib/capacity';
import { isTimerOf, PER_DOUGH_TIMER_STEPS, timerSlots } from '../src/lib/stepInstances';
import { STEPS } from '../src/content/steps';
import { applyInput, BOUNDS, DEFAULT_INPUTS } from '../src/state/defaults';
import { decodeInputsWithReport, encodeInputs } from '../src/state/url';

/** §6 Panel 1 (MESSAGE-61): ball counts split evenly between the mixes. */

const WEIGHTS = Array.from({ length: BOUNDS.ballWeightG.max - BOUNDS.ballWeightG.min + 1 }, (_, i) => BOUNDS.ballWeightG.min + i);
const COUNTS = Array.from({ length: BALLS_MAX - BALLS_MIN + 1 }, (_, i) => BALLS_MIN + i);
const SCHEDULE = { bigaFridgeH: 19, bigaRoomOnlyH: 16, coldFermentH: 24, temperH: 1.5 };

describe('§6 which counts are allowed', () => {
  it('drops 11, 13, 15, 17, 19, 20, 22 and 23 at 265 g', () => {
    expect(COUNTS.filter((b) => !splitsEvenly(b, 265))).toEqual([11, 13, 15, 17, 19, 20, 22, 23]);
  });

  it('drops 9 as well from 272 g, where it would be two mixes of 4½', () => {
    expect(splitsEvenly(9, 271)).toBe(true);
    for (const w of WEIGHTS.filter((g) => g >= 272)) {
      expect(mixesFor(9, w), `9 x ${w} g`).toBe(2);
      expect(splitsEvenly(9, w), `9 x ${w} g`).toBe(false);
    }
  });

  it('allows 24 at every weight, so rounding up always ends', () => {
    for (const w of WEIGHTS) expect(splitsEvenly(24, w), `24 x ${w} g`).toBe(true);
  });

  it('makes every mix size a whole number', () => {
    for (const w of WEIGHTS) {
      for (const b of COUNTS.filter((n) => splitsEvenly(n, w))) {
        expect(Number.isInteger(b / mixesFor(b, w)), `${b} x ${w} g`).toBe(true);
      }
    }
  });
});

describe('§6 every way in lands on an allowed count', () => {
  it('rounds up to the next allowed count, and never past one', () => {
    for (const w of WEIGHTS) {
      for (const b of COUNTS) {
        const up = roundUpToEvenSplit(b, w);
        expect(splitsEvenly(up, w), `${b} x ${w} g → ${up}`).toBe(true);
        expect(up, `${b} x ${w} g`).toBeGreaterThanOrEqual(b);
        for (let n = b; n < up; n++) expect(splitsEvenly(n, w), `${n} skipped at ${w} g`).toBe(false);
      }
    }
  });

  it('steps past a disallowed count in the direction of the step: 18 ↔ 21 at 265 g', () => {
    expect(stepToEvenSplit(18, 265, 1)).toBe(21);
    expect(stepToEvenSplit(21, 265, -1)).toBe(18);
    expect(stepToEvenSplit(10, 265, 1)).toBe(12);
    expect(stepToEvenSplit(12, 265, -1)).toBe(10);
    // At the ends it stays put.
    expect(stepToEvenSplit(24, 265, 1)).toBe(24);
    expect(stepToEvenSplit(3, 265, -1)).toBe(3);
  });

  it('never steps onto a disallowed count, from any allowed one, at any weight', () => {
    for (const w of WEIGHTS) {
      for (const b of COUNTS.filter((n) => splitsEvenly(n, w))) {
        for (const d of [1, -1]) {
          const next = stepToEvenSplit(b, w, d);
          expect(splitsEvenly(next, w), `${b} x ${w} g, step ${d}`).toBe(true);
          // It moves when there is somewhere to go.
          if ((d > 0 && b < BALLS_MAX) || (d < 0 && b > BALLS_MIN)) expect(next, `${b} x ${w} g, step ${d}`).not.toBe(b);
        }
      }
    }
  });

  it('rounds a ball-weight change up: 9 balls at 265 g becomes 10 at 272 g', () => {
    const at265 = { ...DEFAULT_INPUTS, balls: 9 };
    expect(applyInput(at265, 'ballWeightG', 272).balls).toBe(10);
    // An allowed count stays where it is.
    expect(applyInput(at265, 'ballWeightG', 266).balls).toBe(9);
    for (const w of WEIGHTS) {
      for (const b of COUNTS.filter((n) => splitsEvenly(n, 265))) {
        expect(splitsEvenly(applyInput({ ...DEFAULT_INPUTS, balls: b }, 'ballWeightG', w).balls, w), `${b} balls → ${w} g`).toBe(true);
      }
    }
  });

  it('rounds a count set directly, as a stored value would arrive', () => {
    expect(applyInput(DEFAULT_INPUTS, 'balls', 13).balls).toBe(14);
    expect(applyInput(DEFAULT_INPUTS, 'balls', 19).balls).toBe(21);
    expect(applyInput(DEFAULT_INPUTS, 'balls', 12).balls).toBe(12);
  });

  it('rounds a link up and reports the count it asked for', () => {
    expect(decodeInputsWithReport('?balls=13')).toMatchObject({ inputs: { balls: 14 }, ballsAskedFor: 13 });
    expect(decodeInputsWithReport('?balls=9&ball=280')).toMatchObject({ inputs: { balls: 10, ballWeightG: 280 }, ballsAskedFor: 9 });
    expect(decodeInputsWithReport('?balls=12')).toMatchObject({ inputs: { balls: 12 }, ballsAskedFor: null });
    expect(decodeInputsWithReport('')).toMatchObject({ ballsAskedFor: null });
    // What the page writes back is the allowed count.
    expect(encodeInputs(decodeInputsWithReport('?balls=13').inputs)).toContain('balls=14');
  });

  it('says so beside the field while the raise holds', () => {
    const r = calculate({ ...DEFAULT_INPUTS, balls: 14, frictionFactorF: 14 });
    const t = tokenValues(r, SCHEDULE);
    expect(raisedNote(13, r, t)).toBe('Raised to 14 balls so each mix makes whole balls.');
    expect(raisedNote(14, r, t)).toBeNull();
    expect(raisedNote(null, r, t)).toBeNull();
  });
});

describe('§4.2 a 12-ball batch is two 6-ball mixes, figure for figure (MESSAGE-61)', () => {
  const at = (balls: number, finalDoughTempF?: number) =>
    calculate({ balls, ballWeightG: 265, roomTempF: 70, flourTempF: 69, bigaTempF: 58, frictionFactorF: 14, finalDoughTempF });

  it('matches DDT, the first water target, the probe, the later bowl prefill and the rise', () => {
    for (const final of [undefined, 72, 75, 78]) {
      const six = at(6, final);
      const twelve = at(12, final);
      expect(twelve.ddtF).toBe(six.ddtF);
      expect(twelve.mixes[0]!.waterTempF).toBeCloseTo(six.mixes[0]!.waterTempF, 12);
      expect(twelve.probeTargetF).toBeCloseTo(six.probeTargetF, 12);
      expect(twelve.mixes[1]!.bowlTempF).toBe(six.ddtF);
      expect(twelve.roomMinutesByDough.every((m) => Math.abs(m - six.roomMinutes) < 1e-9), `final ${final}`).toBe(true);
    }
    expect(at(12).ddtF).toBe(75);
  });

  it('keeps 18 balls with 9, at 74', () => {
    expect(at(18).ddtF).toBe(74);
    expect(at(18).probeTargetF).toBeCloseTo(at(9).probeTargetF, 12);
  });
});

describe('§7.5 one timer per dough on bulk-1 to bulk-3 (MESSAGE-61)', () => {
  it('pins the three steps by id', () => {
    expect(PER_DOUGH_TIMER_STEPS).toEqual(['bulk-1', 'bulk-2', 'bulk-3']);
    for (const id of PER_DOUGH_TIMER_STEPS) expect(STEPS.find((s) => s.id === id)?.timerLabel, id).toBeDefined();
  });

  it('keys each dough on its own, in mix order, and the bare instance at one mix', () => {
    expect(timerSlots('bulk-3', 'bulk-3', 1)).toEqual([{ key: 'bulk-3' }]);
    expect(timerSlots('bulk-3', 'bulk-3', 3)).toEqual([
      { key: 'bulk-3~dough-1', dough: 1, label: 'Dough 1' },
      { key: 'bulk-3~dough-2', dough: 2, label: 'Dough 2' },
      { key: 'bulk-3~dough-3', dough: 3, label: 'Dough 3' },
    ]);
    // Any other step keeps one timer, keyed by its instance.
    expect(timerSlots('mix-2#2', 'mix-2', 2)).toEqual([{ key: 'mix-2#2' }]);
    expect(timerSlots('bake-1', 'bake-1', 2)).toEqual([{ key: 'bake-1' }]);
  });

  it("lets ticking a step stop every one of its doughs' timers, and no other step's", () => {
    expect(isTimerOf('bulk-1~dough-2', 'bulk-1')).toBe(true);
    expect(isTimerOf('bulk-1', 'bulk-1')).toBe(true);
    expect(isTimerOf('bulk-2~dough-1', 'bulk-1')).toBe(false);
    expect(isTimerOf('mix-1#1', 'mix-1')).toBe(false);
  });
});
