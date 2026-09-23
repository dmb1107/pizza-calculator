import { describe, expect, it } from 'vitest';
import { DETAIL_CONDITION_NAMES, detailConditionHolds, expandSteps } from '../src/lib/stepInstances';
import { STEPS } from '../src/content/steps';
import type { Schedule } from '../src/state/types';

/**
 * §8.2a expansion. This logic decides how many checkboxes and timers exist and
 * in what order the baker meets them, and it used to live inside `StepList`
 * where nothing could assert against it.
 */

const mixKeys = (nMix: number, schedule: Schedule = 'retarded') =>
  expandSteps(nMix, schedule)
    .filter((i) => i.step.phase === 'mix')
    .map((i) => i.key);

describe('§8.2a golden sequence', () => {
  /**
   * §8.2a: "Assert the full rendered id sequence at `nMix` 1, 2 and 3 against an
   * expected sequence written out in the test" — and since MESSAGE-13, per
   * schedule too, because `biga-6` renders only on the retarded track.
   *
   * Every list below is written out by hand from the procedure, not generated
   * from `STEPS` or from `expandSteps`. That is the whole point: the property
   * tests further down are all correct AND all order-blind, and the broken
   * expansion satisfied every one of them for four rounds — same count, same
   * labels, same suppression, same per-instance content. Independence does not
   * help when every property is blind to the same thing.
   *
   * A golden sequence is the only assertion a plausible-looking reordering
   * cannot satisfy, because the expected list comes from a person reasoning
   * about the procedure rather than from the thing under test.
   *
   * Counts: retarded 19 / 27 / 35, classic 18 / 26 / 34 at nMix 1 / 2 / 3.
   */
  const allKeys = (nMix: number, schedule: Schedule) =>
    expandSteps(nMix, schedule).map((i) => i.key);

  it('retarded, nMix 1 — 19 bare ids', () => {
    expect(allKeys(1, 'retarded')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5',
      'biga-6', // temper — retarded only, and missing entirely before MESSAGE-13
      'mix-1', 'mix-2', 'mix-3', 'mix-4', 'mix-5', 'mix-6', 'mix-7',
      // no mix-8 — one mix, no changeover
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('classic, nMix 1 — 18 bare ids, no temper', () => {
    // The biga never went in the fridge, so there is nothing to temper.
    expect(allKeys(1, 'classic')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5',
      'mix-1', 'mix-2', 'mix-3', 'mix-4', 'mix-5', 'mix-6', 'mix-7',
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('retarded, nMix 2 — two complete passes', () => {
    // 12 balls. 27 instances.
    expect(allKeys(2, 'retarded')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5', 'biga-6',
      'mix-1#1', 'mix-2#1', 'mix-3#1', 'mix-4#1', 'mix-5#1', 'mix-6#1', 'mix-7#1',
      'mix-8#1', // changeover, BETWEEN the passes — never last
      'mix-1#2', 'mix-2#2', 'mix-3#2', 'mix-4#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('classic, nMix 2 — two complete passes', () => {
    expect(allKeys(2, 'classic')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5',
      'mix-1#1', 'mix-2#1', 'mix-3#1', 'mix-4#1', 'mix-5#1', 'mix-6#1', 'mix-7#1',
      'mix-8#1',
      'mix-1#2', 'mix-2#2', 'mix-3#2', 'mix-4#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('retarded, nMix 3 — three complete passes', () => {
    expect(allKeys(3, 'retarded')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5', 'biga-6',
      'mix-1#1', 'mix-2#1', 'mix-3#1', 'mix-4#1', 'mix-5#1', 'mix-6#1', 'mix-7#1',
      'mix-8#1',
      'mix-1#2', 'mix-2#2', 'mix-3#2', 'mix-4#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
      'mix-8#2',
      'mix-1#3', 'mix-2#3', 'mix-3#3', 'mix-4#3', 'mix-5#3', 'mix-6#3', 'mix-7#3',
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('classic, nMix 3 — three complete passes', () => {
    expect(allKeys(3, 'classic')).toEqual([
      'biga-1', 'biga-2', 'biga-3', 'biga-4', 'biga-5',
      'mix-1#1', 'mix-2#1', 'mix-3#1', 'mix-4#1', 'mix-5#1', 'mix-6#1', 'mix-7#1',
      'mix-8#1',
      'mix-1#2', 'mix-2#2', 'mix-3#2', 'mix-4#2', 'mix-5#2', 'mix-6#2', 'mix-7#2',
      'mix-8#2',
      'mix-1#3', 'mix-2#3', 'mix-3#3', 'mix-4#3', 'mix-5#3', 'mix-6#3', 'mix-7#3',
      'bulk-1', 'bulk-2', 'bulk-3', 'bulk-4',
      'bake-1', 'bake-2',
    ]);
  });

  it('matches the instance counts §8.2a publishes', () => {
    // The table in §8.2a, independently of the sequences above.
    expect(allKeys(1, 'retarded')).toHaveLength(19);
    expect(allKeys(2, 'retarded')).toHaveLength(27);
    expect(allKeys(3, 'retarded')).toHaveLength(35);
    expect(allKeys(1, 'classic')).toHaveLength(18);
    expect(allKeys(2, 'classic')).toHaveLength(26);
    expect(allKeys(3, 'classic')).toHaveLength(34);
  });

  it('differs between schedules by exactly the temper step', () => {
    for (const nMix of [1, 2, 3]) {
      const retarded = allKeys(nMix, 'retarded');
      const classic = allKeys(nMix, 'classic');
      expect(
        retarded.filter((k) => k !== 'biga-6'),
        `only biga-6 differs at nMix ${nMix}`,
      ).toEqual(classic);
    }
  });

  it('rejects the template-major expansion that shipped', () => {
    // §8.2a writes the wrong form out beside the right one because the wrong
    // form is the thing that needs to be recognisable. Pinned here so the
    // failure mode itself is documented in a test rather than only in prose:
    // it prepped both bowls, ran Phase A twice, and put the changeover last.
    const WRONG_MIX_ORDER = [
      'mix-1#1', 'mix-1#2', 'mix-2#1', 'mix-2#2', 'mix-3#1', 'mix-3#2',
      'mix-4#1', 'mix-4#2', 'mix-5#1', 'mix-5#2', 'mix-6#1', 'mix-6#2',
      'mix-7#1', 'mix-7#2', 'mix-8#1',
    ];
    const actual = mixKeys(2);

    expect(actual).not.toEqual(WRONG_MIX_ORDER);
    // ...and the reason a count-based check could not tell them apart.
    expect(actual).toHaveLength(WRONG_MIX_ORDER.length);
    expect([...actual].sort()).toEqual([...WRONG_MIX_ORDER].sort());
  });
});

describe('§8.2a expansion', () => {
  it('runs each mix as a complete pass, not each step twice', () => {
    // ⚠️ The order is the procedure. Repeating each template in turn gives the
    // same instance count and the same labels but tells the baker to prep both
    // bowls, then run Phase A twice — and puts the changeover last of all.
    expect(mixKeys(2)).toEqual([
      'mix-1#1',
      'mix-2#1',
      'mix-3#1',
      'mix-4#1',
      'mix-5#1',
      'mix-6#1',
      'mix-7#1',
      'mix-8#1', // changeover, between the passes
      'mix-1#2',
      'mix-2#2',
      'mix-3#2',
      'mix-4#2',
      'mix-5#2',
      'mix-6#2',
      'mix-7#2',
      // no mix-8#2 — nothing to change over to
    ]);
  });

  it('puts the changeover between passes at every nMix', () => {
    for (const nMix of [2, 3]) {
      const keys = mixKeys(nMix);
      const changeovers = keys.filter((k) => k.startsWith('mix-8'));
      expect(changeovers, `changeovers at nMix ${nMix}`).toHaveLength(nMix - 1);
      for (const key of changeovers) {
        // Every changeover is followed by the start of the NEXT pass.
        const pass = Number(key.split('#')[1]);
        expect(keys[keys.indexOf(key) + 1], `after ${key}`).toBe(`mix-1#${pass + 1}`);
      }
      // And the list never ends on one.
      expect(keys.at(-1)).toBe(`mix-7#${nMix}`);
    }
  });

  it('changes nothing at nMix 1', () => {
    // 3, 6 and 9 balls — both calibration bakes — must be untouched, and no
    // persisted checkbox orphaned. The ORDER at nMix 1 is pinned by the golden
    // sequences above; this derives from STEPS on purpose, to catch a template
    // being added or dropped rather than reordered.
    const keys = expandSteps(1, 'retarded').map((i) => i.key);
    expect(keys).toEqual(STEPS.filter((s) => s.id !== 'mix-8').map((s) => s.id));
    expect(keys.every((k) => !k.includes('#'))).toBe(true);
  });

  it('gives every instance a unique key', () => {
    for (const schedule of ['retarded', 'classic'] as const) {
      for (const nMix of [1, 2, 3]) {
        const keys = expandSteps(nMix, schedule).map((i) => i.key);
        expect(new Set(keys).size, `unique keys at nMix ${nMix} ${schedule}`).toBe(keys.length);
      }
    }
  });

  it('binds mixIndex to the pass, not the position', () => {
    const byKey = new Map(expandSteps(3, 'retarded').map((i) => [i.key, i.mixIndex]));
    expect(byKey.get('mix-2#1')).toBe(1);
    expect(byKey.get('mix-2#3')).toBe(3);
    expect(byKey.get('biga-1')).toBe(1);
  });

  it('shows the temper only on the retarded schedule', () => {
    // ⚠️ `bigaTemper` had a duration, a clock time and a water-temperature
    // consequence, and no step, for the whole build before MESSAGE-13. The
    // stage/step mapping test in timeline.test.ts is what stops that recurring;
    // this pins the schedule gating itself.
    expect(expandSteps(1, 'retarded').map((i) => i.key)).toContain('biga-6');
    expect(expandSteps(1, 'classic').map((i) => i.key)).not.toContain('biga-6');
  });
});

describe('§8.2 conditional detail conditions', () => {
  const ctx = { nMix: 1, nBiga: 1, openDiameterCapped: false };

  it('is exactly the closed set — openDiameterCapped added, nothing else', () => {
    expect([...DETAIL_CONDITION_NAMES].sort()).toEqual(['nBiga > 1', 'nMix > 1', 'openDiameterCapped']);
  });

  it('throws on anything outside it', () => {
    for (const bad of ['nMix > 2', 'openDiameterCaped', "schedule === 'retarded'", '']) {
      expect(() => detailConditionHolds(bad, ctx), JSON.stringify(bad)).toThrow(/unknown detail condition/);
    }
  });

  it('reads each condition from its own input', () => {
    // The ternary this replaced answered anything but `nMix > 1` with the
    // biga-split test, so a split biga would have shown the capped block.
    expect(detailConditionHolds('openDiameterCapped', { ...ctx, nBiga: 2 })).toBe(false);
    expect(detailConditionHolds('openDiameterCapped', { ...ctx, openDiameterCapped: true })).toBe(true);
    expect(detailConditionHolds('nBiga > 1', { ...ctx, openDiameterCapped: true })).toBe(false);
    expect(detailConditionHolds('nMix > 1', { ...ctx, nMix: 2 })).toBe(true);
  });

  it('covers every conditional block the content carries', () => {
    const used = STEPS.flatMap((s) => (s.detailWhen ? [s.detailWhen.condition] : []));
    expect(used.filter((c) => !DETAIL_CONDITION_NAMES.includes(c))).toEqual([]);
    expect(used).toContain('openDiameterCapped');
  });

  it('keeps it out of shownWhen, which gates whole steps', () => {
    // MESSAGE-18 called it a shownWhen condition, but §8.2 writes it as a
    // conditional DETAIL block inside bulk-2. Were it a step-level condition,
    // the whole divide-and-ball step would vanish below 267 g.
    const step = { ...STEPS[0]!, shownWhen: 'openDiameterCapped' as never };
    expect(() => expandSteps(1, 'retarded', [step])).toThrow(/unknown shownWhen/);
  });
});
