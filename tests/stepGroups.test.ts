import { describe, expect, it } from 'vitest';
import { expandSteps, timersAfterTick } from '../src/lib/stepInstances';
import {
  closedGroupsIn,
  groupProgress,
  groupSteps,
  groupTimerMark,
  hasRunningTimer,
  lastMixGroupKey,
  liveTimerKeys,
  prepMixesIn,
  stepFolded,
  toggledClosedGroups,
} from '../src/lib/stepGroups';
import { resumedTimer, stoppedTimer, type RunningTimer } from '../src/lib/timers';
import { PHASE_LABELS } from '../src/content/steps';

/**
 * §7.5 *Finished steps and groups fold away* (APP-5, MESSAGE-68): the groups,
 * their counts, which are closed, the mark a running timer puts on a closed
 * heading, and which ticked steps fold. The drawing is checked in the iPhone
 * suite (e2e/), which runs MESSAGE-68's done-when.
 */

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 10, 15, 0);

const groupsAt = (nMix: number, schedule: 'retarded' | 'classic' = 'retarded') =>
  groupSteps(expandSteps(nMix, schedule), nMix);

describe('the groups', () => {
  it('are the four phases at one mix, under their phase labels', () => {
    const groups = groupsAt(1);
    expect(groups.map((g) => g.key)).toEqual(['biga', 'mix', 'bulk', 'bake']);
    expect(groups.map((g) => g.label)).toEqual([
      PHASE_LABELS.biga, PHASE_LABELS.mix, PHASE_LABELS.bulk, PHASE_LABELS.bake,
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Biga', 'Final mix', 'Bulk, ball, cold', 'Temper and bake']);
    // Every instance in exactly one group, in list order.
    expect(groups.flatMap((g) => g.instances.map((i) => i.key))).toEqual(expandSteps(1, 'retarded').map((i) => i.key));
  });

  it('split the mix phase into one group per mix at nMix 2, with mix-0 opening Mix 1', () => {
    const groups = groupsAt(2);
    expect(groups.map((g) => g.key)).toEqual(['biga', 'mix#1', 'mix#2', 'bulk', 'bake']);
    expect(groups.map((g) => g.label)).toEqual(['Biga', 'Mix 1', 'Mix 2', 'Bulk, ball, cold', 'Temper and bake']);
    const [, mix1, mix2] = groups;
    // mix-0 (split the biga) first, then mix 1's pass, changeover included.
    expect(mix1!.instances.map((i) => i.key)).toEqual([
      'mix-0', 'mix-1#1', 'mix-2#1', 'mix-3#1', 'mix-4#1', 'mix-5#1', 'mix-6#1', 'mix-7#1', 'mix-8#1',
    ]);
    // No changeover after the last mix.
    expect(mix2!.instances.map((i) => i.key)).toEqual([
      'mix-1#2', 'mix-2#2', 'mix-3#2', 'mix-4#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
    ]);
    expect(groups.flatMap((g) => g.instances.map((i) => i.key))).toEqual(expandSteps(2, 'retarded').map((i) => i.key));
  });

  it('count each group over its own steps', () => {
    const groups = groupsAt(2);
    const checked = new Set(['biga-1', 'mix-0', 'mix-1#1', 'mix-1#2', 'bulk-1']);
    expect(groups.map((g) => groupProgress(g, checked))).toEqual([
      { done: 1, total: groups[0]!.instances.length },
      { done: 2, total: 9 },
      { done: 1, total: 7 },
      { done: 1, total: groups[3]!.instances.length },
      { done: 0, total: groups[4]!.instances.length },
    ]);
    // The group counts add up to the list's own count.
    const total = groups.reduce((n, g) => n + groupProgress(g, checked).total, 0);
    expect(total).toBe(expandSteps(2, 'retarded').length);
  });

  it('hold every mix at nMix 3, on both tracks', () => {
    for (const schedule of ['retarded', 'classic'] as const) {
      const groups = groupsAt(3, schedule);
      expect(groups.map((g) => g.key)).toEqual(['biga', 'mix#1', 'mix#2', 'mix#3', 'bulk', 'bake']);
      expect(groups.flatMap((g) => g.instances.map((i) => i.key))).toEqual(expandSteps(3, schedule).map((i) => i.key));
    }
  });

  it("put each mix's prep step in its own group, for the water warnings", () => {
    expect(groupsAt(1).map(prepMixesIn)).toEqual([[], [1], [], []]);
    expect(groupsAt(3).map(prepMixesIn)).toEqual([[], [1], [2], [3], [], []]);
  });

  it('put the log card after the last mix group, outside every group', () => {
    expect(lastMixGroupKey(groupsAt(1))).toBe('mix');
    expect(lastMixGroupKey(groupsAt(2))).toBe('mix#2');
    expect(lastMixGroupKey(groupsAt(3))).toBe('mix#3');
  });
});

describe('closing a group', () => {
  it('toggles from its heading, and a closed list round-trips', () => {
    let stored: string[] = [];
    stored = toggledClosedGroups(stored, 'biga');
    stored = toggledClosedGroups(stored, 'mix#2');
    expect(stored).toEqual(['biga', 'mix#2']);
    expect([...closedGroupsIn(stored, groupsAt(2))]).toEqual(['biga', 'mix#2']);
    stored = toggledClosedGroups(stored, 'biga');
    expect(stored).toEqual(['mix#2']);
  });

  it('ignores a stored group that this batch size has no group for', () => {
    // Mix 2 closed at two mixes, then the batch drops to one mix.
    const stored = ['biga', 'mix#2', 'mix#3', 'nonsense', ''];
    expect([...closedGroupsIn(stored, groupsAt(1))]).toEqual(['biga']);
    expect([...closedGroupsIn(stored, groupsAt(2))]).toEqual(['biga', 'mix#2']);
    // One mix's "Final mix" doesn't close Mix 1 at two mixes, or the reverse.
    expect([...closedGroupsIn(['mix'], groupsAt(2))]).toEqual([]);
    expect([...closedGroupsIn(['mix#1'], groupsAt(1))]).toEqual([]);
  });

  it('keeps a stored group from another size, so it applies again at that size (§7.5, MESSAGE-69)', () => {
    // Mix 2 closed at two mixes; the batch drops to one mix and Biga closes.
    let stored = toggledClosedGroups([], 'mix#2');
    expect([...closedGroupsIn(stored, groupsAt(1))]).toEqual([]);
    stored = toggledClosedGroups(stored, 'biga');
    expect(stored).toEqual(['mix#2', 'biga']);
    // Back at two mixes, Mix 2 is closed again.
    expect([...closedGroupsIn(stored, groupsAt(2))].sort()).toEqual(['biga', 'mix#2']);
  });

  it("isn't done by ticking the group's last step: nothing here reads the ticks", () => {
    // The closed set is whatever the headings made it. Ticking every step in a
    // group changes its count and nothing else (5c).
    const groups = groupsAt(1);
    const biga = groups[0]!;
    const all = new Set(biga.instances.map((i) => i.key));
    expect(groupProgress(biga, all)).toEqual({ done: biga.instances.length, total: biga.instances.length });
    expect([...closedGroupsIn([], groups)]).toEqual([]);
  });
});

describe('a ticked step folds', () => {
  it('to one line when ticked, unless reopened or a timer in it runs', () => {
    expect(stepFolded(false, false, false)).toBe(false);
    expect(stepFolded(false, true, true)).toBe(false);
    expect(stepFolded(true, false, false)).toBe(true);
    expect(stepFolded(true, true, false)).toBe(false);
    expect(stepFolded(true, false, true)).toBe(false);
  });

  it('only after a Resume has a running timer, since ticking stops them (§7.5)', () => {
    const running: RunningTimer = { stepId: 'mix-3', startedAt: T0, minMinutes: 3, maxMinutes: 4 };
    expect(hasRunningTimer('mix-3', [running])).toBe(true);
    const ticked = timersAfterTick([running], 'mix-3', true, T0 + MIN);
    expect(hasRunningTimer('mix-3', ticked)).toBe(false);
    const resumed = ticked.map((t) => resumedTimer(t, T0 + 2 * MIN));
    expect(hasRunningTimer('mix-3', resumed)).toBe(true);
    // A per-dough timer counts for its step, and no other step's timer does.
    const dough: RunningTimer = { stepId: 'bulk-3~dough-2', startedAt: T0, minMinutes: 45, maxMinutes: 45 };
    expect(hasRunningTimer('bulk-3', [dough])).toBe(true);
    expect(hasRunningTimer('bulk-2', [dough])).toBe(false);
    expect(hasRunningTimer('mix-3#1', [{ ...running, stepId: 'mix-3#10' }])).toBe(false);
  });
});

describe("a closed group's timer mark", () => {
  const bulk = (nMix: number) => groupsAt(nMix).find((g) => g.key === 'bulk')!;
  // bulk-1's rest is 30–45 min at every size (a window).
  const rest = (stepId: string, startedAt = T0): RunningTimer => ({ stepId, startedAt, minMinutes: 30, maxMinutes: 45 });

  it('is absent with no timer running in the group', () => {
    expect(groupTimerMark(bulk(1), [], 1, T0)).toBeNull();
    expect(groupTimerMark(bulk(1), [stoppedTimer(rest('bulk-1'), T0 + MIN)], 1, T0 + 2 * MIN)).toBeNull();
    // A timer in another group marks nothing here.
    expect(groupTimerMark(bulk(1), [{ ...rest('mix-3'), minMinutes: 3, maxMinutes: 4 }], 1, T0)).toBeNull();
  });

  it('changes when the timer reaches its lower bound, and again past its upper', () => {
    const timers = [rest('bulk-1')];
    expect(groupTimerMark(bulk(1), timers, 1, T0 + 30 * MIN - 1)).toMatchObject({ phase: 'running', isWindow: true });
    expect(groupTimerMark(bulk(1), timers, 1, T0 + 30 * MIN)).toMatchObject({ phase: 'window', elapsedMs: 30 * MIN });
    expect(groupTimerMark(bulk(1), timers, 1, T0 + 45 * MIN)).toMatchObject({ phase: 'past' });
  });

  it('follows the timer that comes due first, a per-dough one included', () => {
    const timers = [rest('bulk-1~dough-1', T0), rest('bulk-1~dough-2', T0 + 10 * MIN)];
    expect(groupTimerMark(bulk(2), timers, 2, T0 + 31 * MIN)).toMatchObject({ phase: 'window', elapsedMs: 31 * MIN });
    // At one mix those keys aren't this size's timers.
    expect(groupTimerMark(bulk(1), timers, 1, T0 + 31 * MIN)).toBeNull();
  });
});

describe('the beeper', () => {
  it("listens to every timer the list renders at this size, and no other", () => {
    const keys = liveTimerKeys(expandSteps(2, 'retarded'), 2);
    expect(keys.has('mix-3#2')).toBe(true);
    expect(keys.has('bulk-3~dough-2')).toBe(true);
    expect(keys.has('bulk-3')).toBe(false);
    expect(keys.has('mix-3')).toBe(false);
  });
});
