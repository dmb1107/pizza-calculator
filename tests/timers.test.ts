import { describe, expect, it } from 'vitest';
import {
  describeSpec,
  formatCountdown,
  parseTimerLabel,
  timerDueAt,
  timerState,
  type RunningTimer,
} from '../src/lib/timers';
import { calculate } from '../src/lib/engine';
import { bindTokens, tokenValues } from '../src/lib/bindTokens';
import { expandSteps, timerLabelFor } from '../src/lib/stepInstances';
import { DEFAULT_INPUTS } from '../src/state/defaults';
import { STEPS } from '../src/content/steps';

/** Step timers — WEBSITE-SPEC-biga-calculator.md §7.5. */

const MIN = 60_000;

describe('parsing timer labels', () => {
  it.each([
    ['3–6 min', 3, 6, true],
    ['45–60 min', 45, 60, true],
    ['10–15 min between rounds', 10, 15, true],
    ['10 min', 10, 10, false],
    ['24 h', 1440, 1440, false],
    ['2.5 h', 150, 150, false],
    ['2 h', 120, 120, false],
    // MESSAGE-32: Phase D's timer, in seconds.
    ['45–60 s', 0.75, 1, true],
  ] as const)('reads "%s"', (label, min, max, isWindow) => {
    expect(parseTimerLabel(label)).toEqual({ minMinutes: min, maxMinutes: max, isWindow });
  });

  it('returns null for a label the timeline owns rather than a timer', () => {
    expect(parseTimerLabel('per schedule')).toBeNull();
    expect(parseTimerLabel('')).toBeNull();
    expect(parseTimerLabel('when it looks right')).toBeNull();
  });

  it('accepts a hyphen as well as an en dash', () => {
    expect(parseTimerLabel('3-6 min')).toEqual(parseTimerLabel('3–6 min'));
  });

  it('resolves every step timer to a duration on both schedules, and none says "per schedule"', () => {
    // §7.5 (MESSAGE-31): a step with a duration names it. Resolved per schedule
    // and bound with the real token table, the way the step list does it, so a
    // label the parser can't read shows up here rather than as a missing timer.
    const i = DEFAULT_INPUTS;
    const tokens = tokenValues(calculate({ ...i, frictionFactorF: 14 }), i);
    const timed = (schedule: 'retarded' | 'classic') =>
      expandSteps(2, schedule).flatMap(({ key, step }) => {
        const label = timerLabelFor(step, schedule, i.bigaRoomOnlyH);
        if (label === undefined) return [];
        const bound = bindTokens(label, tokens);
        expect(parseTimerLabel(bound), `${key} on ${schedule}: "${bound}"`).not.toBeNull();
        return [key];
      });
    // At nMix 2, so mix-8's changeover renders once. Every mixer phase is
    // timed on both passes since MESSAGE-32.
    const mixes = [
      'mix-2#1', 'mix-3#1', 'mix-5#1', 'mix-6#1', 'mix-7#1', 'mix-8#1',
      'mix-2#2', 'mix-3#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
    ];
    expect(timed('retarded')).toEqual([
      'biga-3', 'biga-4', 'biga-4b', 'biga-6', ...mixes, 'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4', 'bake-1',
    ]);
    expect(timed('classic')).toEqual([
      'biga-3', 'biga-4', ...mixes, 'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4', 'bake-1',
    ]);
  });

  it('parses each fixed label the same way the generator did', () => {
    // Two parsers of one label: scripts/generate-content.py writes
    // timerMinutes, parseTimerLabel reads the label at runtime. Seconds are
    // where they could part (mix-7's 45–60 s is [0.75, 1]).
    const fixed = STEPS.filter((s) => s.timerMinutes !== undefined);
    expect(fixed.map((s) => s.id)).toEqual(['biga-3', 'mix-2', 'mix-3', 'mix-5', 'mix-6', 'mix-7', 'mix-8', 'bulk-1', 'bulk-2']);
    for (const s of fixed) {
      const [lo, hi] = Array.isArray(s.timerMinutes) ? s.timerMinutes : [s.timerMinutes, s.timerMinutes];
      const spec = parseTimerLabel(s.timerLabel ?? '');
      expect([spec?.minMinutes, spec?.maxMinutes], `${s.id} "${s.timerLabel}"`).toEqual([lo, hi]);
    }
  });
});

describe('timer state is derived from the clock, not a counter', () => {
  const start = 1_000_000;
  const exact: RunningTimer = { stepId: 'mix-6', startedAt: start, minMinutes: 10, maxMinutes: 10 };
  const window: RunningTimer = { stepId: 'bulk-1', startedAt: start, minMinutes: 45, maxMinutes: 60 };

  it('counts down an exact duration', () => {
    const s = timerState(exact, start + 4 * MIN);
    expect(s.phase).toBe('running');
    expect(s.remainingMs).toBe(6 * MIN);
    expect(s.progress).toBeCloseTo(0.4, 6);
  });

  it('reaches the window exactly at the earliest moment', () => {
    expect(timerState(exact, start + 10 * MIN - 1).phase).toBe('running');
    expect(timerState(exact, start + 10 * MIN).phase).toBe('past');
  });

  it('holds a window open between the two bounds', () => {
    expect(timerState(window, start + 44 * MIN).phase).toBe('running');
    expect(timerState(window, start + 45 * MIN).phase).toBe('window');
    expect(timerState(window, start + 59 * MIN).phase).toBe('window');
    expect(timerState(window, start + 60 * MIN).phase).toBe('past');
  });

  it('reports how much of the window is left', () => {
    const s = timerState(window, start + 50 * MIN);
    expect(s.phase).toBe('window');
    expect(s.remainingMs).toBe(-5 * MIN); // past the earliest
    expect(s.windowRemainingMs).toBe(10 * MIN); // still 10 min of slack
  });

  /**
   * The property the whole design rests on: state is a function of the wall
   * clock, so a phone that locked for twenty minutes returns to the right
   * answer rather than to a counter that stopped.
   */
  it('is unaffected by how long the page was in the background', () => {
    const observedContinuously = timerState(exact, start + 7 * MIN);
    const lookedAtOnceAfterALock = timerState({ ...exact }, start + 7 * MIN);
    expect(lookedAtOnceAfterALock).toEqual(observedContinuously);

    // And a timer started before a reload still reads correctly afterwards.
    const restored: RunningTimer = { ...exact, startedAt: start };
    expect(timerState(restored, start + 30 * MIN).phase).toBe('past');
    expect(timerState(restored, start + 30 * MIN).elapsedMs).toBe(30 * MIN);
  });

  it('clamps a start time in the future to zero elapsed', () => {
    // Clock changes and daylight saving can move `now` backwards.
    const s = timerState(exact, start - 5 * MIN);
    expect(s.elapsedMs).toBe(0);
    expect(s.phase).toBe('running');
  });

  it('keeps progress inside 0 to 1', () => {
    expect(timerState(exact, start).progress).toBe(0);
    expect(timerState(exact, start + 5 * MIN).progress).toBeCloseTo(0.5, 6);
    expect(timerState(exact, start + 99 * MIN).progress).toBe(1);
  });

  it('reports when it comes due', () => {
    expect(timerDueAt(window)).toBe(start + 45 * MIN);
    expect(timerDueAt(exact)).toBe(start + 10 * MIN);
  });
});

describe('formatting', () => {
  it.each([
    [0, '0:00'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [9 * MIN + 5_000, '9:05'],
    [65 * MIN, '1:05:00'],
    [24 * 60 * MIN, '24:00:00'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it('formats an overrun by magnitude, so the caller can add the sign', () => {
    expect(formatCountdown(-90_000)).toBe('1:30');
  });

  it.each([
    [{ minMinutes: 10, maxMinutes: 10, isWindow: false }, '10 min'],
    [{ minMinutes: 150, maxMinutes: 150, isWindow: false }, '2 h 30 min'],
    [{ minMinutes: 1440, maxMinutes: 1440, isWindow: false }, '24 h'],
    // Matching units collapse, the way the recipe writes them.
    [{ minMinutes: 3, maxMinutes: 6, isWindow: true }, '3–6 min'],
    [{ minMinutes: 10, maxMinutes: 15, isWindow: true }, '10–15 min'],
    [{ minMinutes: 120, maxMinutes: 180, isWindow: true }, '2–3 h'],
    // The recipe writes this one as "45–60 min", so that is what it says.
    [{ minMinutes: 45, maxMinutes: 60, isWindow: true }, '45–60 min'],
    // Genuinely mixed units keep both sides.
    [{ minMinutes: 45, maxMinutes: 90, isWindow: true }, '45 min–1 h 30 min'],
    // Under a minute reads in seconds, as the recipe writes Phase D.
    [{ minMinutes: 0.75, maxMinutes: 1, isWindow: true }, '45–60 s'],
  ])('describes %o as %s', (spec, expected) => {
    expect(describeSpec(spec)).toBe(expected);
  });
});
