import { describe, expect, it } from 'vitest';
import {
  describeSpec,
  formatCountdown,
  parseTimerLabel,
  timerDueAt,
  timerState,
  type RunningTimer,
} from '../src/lib/timers';
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

  it('covers every timer label in the step content', () => {
    // Bound labels: {coldFerment} and {temper} are substituted before parsing,
    // which is what keeps step ids out of the parser.
    const bound: Record<string, string> = {
      '{coldFerment} h': '24 h',
      '{temper} h': '2.5 h',
    };
    const labels = STEPS.map((s) => s.timerLabel).filter((l): l is string => Boolean(l));
    expect(labels.length).toBe(7);

    const parsed = labels.map((l) => parseTimerLabel(bound[l] ?? l));
    // Six resolve to a duration; only "per schedule" does not.
    expect(parsed.filter(Boolean)).toHaveLength(6);
    expect(labels[parsed.findIndex((p) => p === null)]).toBe('per schedule');
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
  ])('describes %o as %s', (spec, expected) => {
    expect(describeSpec(spec)).toBe(expected);
  });
});
