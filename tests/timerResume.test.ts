/**
 * §7.5 *A stopped timer resumes* (APP-4, MESSAGE-67; Dave's calls 4a–4d, 9 and
 * 10 Nov 2026). Resume carries the count on from where it stopped, as a
 * stopwatch does: the time between Stop and Resume doesn't count, on every
 * timer. Until then a stopped timer could only be cleared and started again
 * from 0:00, and the one button read Stop and then Clear in the same place,
 * so a quick second tap on Stop cleared a mixer phase's logged time.
 *
 * The behaviours below are MESSAGE-67's list, in its order.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BAKE_1_SEED, MIX_PHASES, loggedTimerTag } from '../src/lib/bakeLog';
import { calculate } from '../src/lib/engine';
import { instanceKey, timersAfterTick, timerSlots } from '../src/lib/stepInstances';
import {
  beepDecision,
  effectiveStartAt,
  formatElapsed,
  resumedTimer,
  stoppedTimer,
  timerDueAt,
  timerElapsedMs,
  timerState,
  type RunningTimer,
} from '../src/lib/timers';
import { DEFAULT_INPUTS, DEFAULT_PERSISTED } from '../src/state/defaults';
import { firstMixStartedAt, localDate, phaseSeconds, sessionBake } from '../src/state/sessionBake';
import { STORAGE_KEY, loadPersisted, savePersisted, type StorageLike } from '../src/state/storage';
import type { Inputs } from '../src/state/types';

const S = 1_000;
const MIN = 60 * S;
const T0 = Date.UTC(2026, 10, 12, 18, 0, 0);

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

/** Save the timers and read them back, as a reload does. */
function reload(timers: RunningTimer[]): RunningTimer[] {
  const s = fakeStorage();
  savePersisted(s, { ...DEFAULT_PERSISTED, timers });
  return loadPersisted(s).timers;
}

const phase = (key: string) => MIX_PHASES.find((p) => p.key === key)!;

describe('§7.5 a stopped timer resumes', () => {
  it('1. Phase C stopped at 3:00, resumed 20 s later, stopped 1:00 after: 4:00 everywhere', () => {
    const c = phase('c');
    const nMix = 1;
    const key = instanceKey(c.stepId, 1, nMix);
    let t: RunningTimer = { stepId: key, startedAt: T0, minMinutes: 3, maxMinutes: 4 };
    t = stoppedTimer(t, T0 + 3 * MIN);
    t = resumedTimer(t, T0 + 3 * MIN + 20 * S);

    // While it runs again the tag carries no time.
    expect(loggedTimerTag(c.stepId, t)).toBe('Logged');
    expect(formatElapsed(timerElapsedMs(t, T0 + 3 * MIN + 20 * S))).toBe('3:00');

    t = stoppedTimer(t, T0 + 4 * MIN + 20 * S);
    expect(formatElapsed(timerState(t, T0 + 99 * MIN).elapsedMs)).toBe('4:00');
    expect(phaseSeconds([t], c.stepId, 1, nMix)).toBe(240);
    expect(loggedTimerTag(c.stepId, t)).toBe('Logged · 4:00');

    // And on the bake the log saves.
    const inputs: Inputs = { ...DEFAULT_INPUTS };
    const result = calculate({ ...inputs, frictionFactorF: BAKE_1_SEED.value });
    const bake = sessionBake({ inputs, result, timers: [t] }, new Date(T0 + 99 * MIN), 'x');
    expect(bake.mixes[0]!.phase_seconds.c).toBe(240);
  });

  it('2. several Stop and Resume cycles add up their pauses', () => {
    let t: RunningTimer = { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10 };
    // Run 2 min, pause 1; run 3, pause 5; run 4, pause 30 s; run 1.
    t = stoppedTimer(t, T0 + 2 * MIN);
    t = resumedTimer(t, T0 + 3 * MIN);
    t = stoppedTimer(t, T0 + 6 * MIN);
    t = resumedTimer(t, T0 + 11 * MIN);
    t = stoppedTimer(t, T0 + 15 * MIN);
    t = resumedTimer(t, T0 + 15 * MIN + 30 * S);
    expect(t.pausedMs).toBe(6 * MIN + 30 * S);
    expect(timerElapsedMs(t, T0 + 16 * MIN + 30 * S)).toBe(10 * MIN);
  });

  it('Stop and Resume are idempotent: a second Stop or Resume changes nothing', () => {
    const t: RunningTimer = { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10 };
    const stopped = stoppedTimer(t, T0 + MIN);
    expect(stoppedTimer(stopped, T0 + 2 * MIN)).toBe(stopped);
    const resumed = resumedTimer(stopped, T0 + 3 * MIN);
    expect(resumedTimer(resumed, T0 + 4 * MIN)).toBe(resumed);
  });

  it('3. a 45–60 min timer stopped at 40:00 and resumed 5 min later turns to the window at 50 min', () => {
    let t: RunningTimer = { stepId: 'bulk-3', startedAt: T0, minMinutes: 45, maxMinutes: 60 };
    t = stoppedTimer(t, T0 + 40 * MIN);
    t = resumedTimer(t, T0 + 45 * MIN);
    expect(timerState(t, T0 + 45 * MIN).phase).toBe('running');
    expect(timerState(t, T0 + 50 * MIN - 1).phase).toBe('running');
    expect(timerState(t, T0 + 50 * MIN).phase).toBe('window');
    expect(timerState(t, T0 + 65 * MIN).phase).toBe('past');
    expect(timerDueAt(t)).toBe(T0 + 50 * MIN);
  });

  it('a 30:00 bulk rest resumed five minutes later carries on from 30:00', () => {
    let t: RunningTimer = { stepId: 'bulk-1', startedAt: T0, minMinutes: 60, maxMinutes: 90 };
    t = stoppedTimer(t, T0 + 30 * MIN);
    t = resumedTimer(t, T0 + 35 * MIN);
    expect(formatElapsed(timerElapsedMs(t, T0 + 35 * MIN))).toBe('30:00');
    expect(formatElapsed(timerElapsedMs(t, T0 + 36 * MIN))).toBe('31:00');
  });

  it("an exact-duration timer's printed start moves later by the pause", () => {
    let t: RunningTimer = { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10 };
    t = stoppedTimer(t, T0 + 4 * MIN);
    t = resumedTimer(t, T0 + 7 * MIN);
    expect(effectiveStartAt(t)).toBe(T0 + 3 * MIN);
    // Start plus the duration is when it gets there.
    expect(timerState(t, effectiveStartAt(t) + 10 * MIN - 1).phase).toBe('running');
    expect(timerState(t, effectiveStartAt(t) + 10 * MIN).phase).not.toBe('running');
    expect(effectiveStartAt({ stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10 })).toBe(T0);
  });
});

/** Run the beep decision every second from `from` to `to`, as the card would; count the beeps. */
function beepsBetween(stepId: string, t: RunningTimer, from: number, to: number, memory: { key: string | null }): number {
  let beeps = 0;
  for (let now = from; now <= to; now += S) {
    const d = beepDecision(stepId, t, now, memory.key);
    memory.key = d.key;
    if (d.beep) beeps += 1;
  }
  return beeps;
}

describe('4. the beep comes when the count crosses the lower bound while the timer runs', () => {
  const start = (): RunningTimer => ({ stepId: 'bulk-3', startedAt: T0, minMinutes: 10, maxMinutes: 15 });

  it('a timer that runs through its bound beeps once', () => {
    expect(beepsBetween('bulk-3', start(), T0, T0 + 20 * MIN, { key: null })).toBe(1);
  });

  it('a timer past its window resumes, stays past, and doesn’t beep', () => {
    const memory = { key: null as string | null };
    let t = start();
    expect(beepsBetween('bulk-3', t, T0, T0 + 20 * MIN, memory)).toBe(1);
    t = stoppedTimer(t, T0 + 20 * MIN);
    t = resumedTimer(t, T0 + 25 * MIN);
    expect(timerState(t, T0 + 25 * MIN).phase).toBe('past');
    expect(beepsBetween('bulk-3', t, T0 + 25 * MIN, T0 + 40 * MIN, memory)).toBe(0);
  });

  it('a timer resumed before its bound beeps once on reaching it', () => {
    const memory = { key: null as string | null };
    let t = stoppedTimer(start(), T0 + 4 * MIN);
    t = resumedTimer(t, T0 + 6 * MIN);
    // Not yet at 12 min wall clock (10 min run), then once.
    expect(beepsBetween('bulk-3', t, T0 + 6 * MIN, T0 + 12 * MIN - S, memory)).toBe(0);
    expect(beepsBetween('bulk-3', t, T0 + 12 * MIN, T0 + 30 * MIN, memory)).toBe(1);
  });

  it('a stopped timer never beeps', () => {
    const t = stoppedTimer(start(), T0 + 4 * MIN);
    expect(beepsBetween('bulk-3', t, T0 + 4 * MIN, T0 + 30 * MIN, { key: null })).toBe(0);
  });

  it('one that beeped, was stopped, survived a reload and was resumed past its bound doesn’t beep', () => {
    let t = start();
    expect(beepsBetween('bulk-3', t, T0, T0 + 12 * MIN, { key: null })).toBe(1);
    t = stoppedTimer(t, T0 + 12 * MIN);
    // A reload: the component's memory is gone and the timer comes from storage.
    [t] = reload([t]) as [RunningTimer];
    t = resumedTimer(t, T0 + 20 * MIN);
    [t] = reload([t]) as [RunningTimer];
    expect(beepsBetween('bulk-3', t, T0 + 20 * MIN, T0 + 40 * MIN, { key: null })).toBe(0);
  });

  it('one resumed before its bound and reloaded still beeps once on reaching it', () => {
    let t = stoppedTimer(start(), T0 + 4 * MIN);
    t = resumedTimer(t, T0 + 6 * MIN);
    [t] = reload([t]) as [RunningTimer];
    expect(beepsBetween('bulk-3', t, T0 + 7 * MIN, T0 + 30 * MIN, { key: null })).toBe(1);
  });
});

describe('5. unticking a step leaves its stopped timers stopped', () => {
  it('every dough’s included', () => {
    const nMix = 3;
    const slots = timerSlots('bulk-3', 'bulk-3', nMix);
    expect(slots).toHaveLength(3);
    const running: RunningTimer[] = slots.map((s, i) => ({
      stepId: s.key,
      startedAt: T0 + i * MIN,
      minMinutes: 45,
      maxMinutes: 60,
    }));
    const ticked = timersAfterTick(running, 'bulk-3', true, T0 + 30 * MIN);
    expect(ticked.every((t) => t.stoppedAt === T0 + 30 * MIN)).toBe(true);
    const unticked = timersAfterTick(ticked, 'bulk-3', false, T0 + 40 * MIN);
    expect(unticked).toEqual(ticked);
    // Each dough resumes on its own.
    const one = unticked.map((t) => (t.stepId === slots[1]!.key ? resumedTimer(t, T0 + 41 * MIN) : t));
    expect(one.filter((t) => t.stoppedAt == null).map((t) => t.stepId)).toEqual([slots[1]!.key]);
  });

  it('ticking stops only the step’s own timers, and leaves a stopped one’s time alone', () => {
    const timers: RunningTimer[] = [
      { stepId: 'bulk-1', startedAt: T0, minMinutes: 1, maxMinutes: 2 },
      { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10, stoppedAt: T0 + MIN },
    ];
    const after = timersAfterTick(timers, 'mix-6', true, T0 + 5 * MIN);
    expect(after[0]!.stoppedAt).toBeUndefined();
    expect(after[1]!.stoppedAt).toBe(T0 + MIN);
  });
});

describe('6. a resume doesn’t move the bake’s date', () => {
  it('Phase A started before midnight and resumed after it keeps the earlier date', () => {
    const a = phase('a');
    // 11:58 PM local (tests run in America/New_York).
    const before = new Date(2026, 10, 12, 23, 58).getTime();
    let t: RunningTimer = { stepId: instanceKey(a.stepId, 1, 1), startedAt: before, minMinutes: 3, maxMinutes: 4 };
    t = stoppedTimer(t, before + MIN);
    t = resumedTimer(t, before + 5 * MIN);
    t = stoppedTimer(t, before + 8 * MIN);
    expect(firstMixStartedAt([t], 1)).toBe(before);
    const inputs = { ...DEFAULT_INPUTS };
    const result = calculate({ ...inputs, frictionFactorF: BAKE_1_SEED.value });
    const bake = sessionBake({ inputs, result, timers: [t] }, new Date(before + 60 * MIN), 'x');
    expect(bake.date).toBe('2026-11-12');
    expect(localDate(new Date(before + 5 * MIN))).toBe('2026-11-13');
  });
});

describe('7 and 8. storage', () => {
  it('7. a resumed timer, running or stopped again, survives a reload with its time', () => {
    let running: RunningTimer = { stepId: 'mix-5', startedAt: T0, minMinutes: 3, maxMinutes: 4 };
    running = resumedTimer(stoppedTimer(running, T0 + MIN), T0 + 2 * MIN);
    const stoppedAgain = stoppedTimer({ ...running, stepId: 'mix-3' }, T0 + 3 * MIN);
    const back = reload([running, stoppedAgain]);
    expect(back).toEqual([running, stoppedAgain]);
    expect(timerElapsedMs(back[0]!, T0 + 5 * MIN)).toBe(4 * MIN);
    expect(timerElapsedMs(back[1]!, T0 + 99 * MIN)).toBe(2 * MIN);
  });

  it('8. a timer stored before this round loads as never paused', () => {
    const old = { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10, stoppedAt: T0 + 4 * MIN };
    const [t] = loadPersisted(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ timers: [old] }) })).timers;
    expect(t).toEqual(old);
    expect(timerElapsedMs(t!, 0)).toBe(4 * MIN);
  });

  it.each([
    ['a string pause', { pausedMs: 'lots' }],
    ['a negative pause', { pausedMs: -5 }],
    ['an infinite pause', { pausedMs: 'Infinity' }],
    ['a resume before the start', { resumedAt: T0 - MIN }],
    ['a resume after the stop', { resumedAt: T0 + 9 * MIN }],
    ['a resume that isn’t a number', { resumedAt: {} }],
  ])('8. %s doesn’t throw and is dropped', (_label, bad) => {
    const raw = JSON.stringify({
      timers: [{ stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10, stoppedAt: T0 + 4 * MIN, ...bad }],
    });
    const load = () => loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));
    expect(load).not.toThrow();
    const [t] = load().timers;
    expect(t).toEqual({ stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10, stoppedAt: T0 + 4 * MIN });
  });
});

describe('every elapsed reading goes through timerElapsedMs', () => {
  /**
   * MESSAGE-67 listed five places that subtracted a start from a stop on their
   * own. Any such subtraction left outside `timers.ts` would forget the pauses,
   * so none may remain. Comments are stripped.
   */
  it('no file outside timers.ts does start-and-stop arithmetic', () => {
    const files = (readdirSync('src', { recursive: true }) as string[]).filter(
      (f) => /\.tsx?$/.test(f) && !f.endsWith('lib/timers.ts'),
    );
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.filter((f) => {
      const code = readFileSync(join('src', f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      return /stoppedAt\s*-|\?\?\s*now\)\s*-|-\s*\w+\.startedAt\b/.test(code);
    });
    expect(offenders).toEqual([]);
  });
});
