import { describe, expect, it } from 'vitest';
import { expandSteps } from '../src/lib/stepInstances';
import { STEPS } from '../src/content/steps';

/**
 * §8.2a expansion. This logic decides how many checkboxes and timers exist and
 * in what order the baker meets them, and it used to live inside `StepList`
 * where nothing could assert against it.
 */

const mixKeys = (nMix: number) =>
  expandSteps(nMix)
    .filter((i) => i.step.phase === 'mix')
    .map((i) => i.key);

describe('§8.2a golden sequence', () => {
  /**
   * §8.2a: "Assert the full rendered id sequence at `nMix` 1, 2 and 3 against
   * an expected sequence written out in the test."
   *
   * Every list below is written out by hand from the procedure, not generated
   * from `STEPS` or from `expandSteps`. That is the whole point: the six
   * property tests above are all correct AND all order-blind, and the broken
   * expansion satisfied every one of them for four rounds — same count, same
   * labels, same suppression, same per-instance content. Independence does not
   * help when every property is blind to the same thing.
   *
   * A golden sequence is the only assertion a plausible-looking reordering
   * cannot satisfy, because the expected list comes from a person reasoning
   * about the procedure rather than from the thing under test.
   */
  const allKeys = (nMix: number) => expandSteps(nMix).map((i) => i.key);

  it('renders 18 bare ids at nMix 1', () => {
    expect(allKeys(1)).toEqual([
      'biga-1',
      'biga-2',
      'biga-3',
      'biga-4',
      'biga-5',
      'mix-1',
      'mix-2',
      'mix-3',
      'mix-4',
      'mix-5',
      'mix-6',
      'mix-7',
      // no mix-8 — one mix, no changeover
      'bulk-1',
      'bulk-2',
      'bulk-3',
      'bulk-4',
      'bake-1',
      'bake-2',
    ]);
  });

  it('runs two complete passes at nMix 2', () => {
    // 12 balls. 26 instances — which the WRONG expansion also produced.
    expect(allKeys(2)).toEqual([
      'biga-1',
      'biga-2',
      'biga-3',
      'biga-4',
      'biga-5',
      'mix-1#1',
      'mix-2#1',
      'mix-3#1',
      'mix-4#1',
      'mix-5#1',
      'mix-6#1',
      'mix-7#1',
      'mix-8#1', // changeover, BETWEEN the passes — never last
      'mix-1#2',
      'mix-2#2',
      'mix-3#2',
      'mix-4#2',
      'mix-5#2',
      'mix-6#2',
      'mix-7#2',
      'bulk-1',
      'bulk-2',
      'bulk-3',
      'bulk-4',
      'bake-1',
      'bake-2',
    ]);
  });

  it('runs three complete passes at nMix 3', () => {
    expect(allKeys(3)).toEqual([
      'biga-1',
      'biga-2',
      'biga-3',
      'biga-4',
      'biga-5',
      'mix-1#1',
      'mix-2#1',
      'mix-3#1',
      'mix-4#1',
      'mix-5#1',
      'mix-6#1',
      'mix-7#1',
      'mix-8#1',
      'mix-1#2',
      'mix-2#2',
      'mix-3#2',
      'mix-4#2',
      'mix-5#2',
      'mix-6#2',
      'mix-7#2',
      'mix-8#2',
      'mix-1#3',
      'mix-2#3',
      'mix-3#3',
      'mix-4#3',
      'mix-5#3',
      'mix-6#3',
      'mix-7#3',
      'bulk-1',
      'bulk-2',
      'bulk-3',
      'bulk-4',
      'bake-1',
      'bake-2',
    ]);
  });

  it('rejects the template-major expansion that shipped', () => {
    // §8.2a writes the wrong form out beside the right one because the wrong
    // form is the thing that needs to be recognisable. Pinned here so the
    // failure mode itself is documented in a test rather than only in prose:
    // it prepped both bowls, ran Phase A twice, and put the changeover last.
    const WRONG_MIX_ORDER = [
      'mix-1#1',
      'mix-1#2',
      'mix-2#1',
      'mix-2#2',
      'mix-3#1',
      'mix-3#2',
      'mix-4#1',
      'mix-4#2',
      'mix-5#1',
      'mix-5#2',
      'mix-6#1',
      'mix-6#2',
      'mix-7#1',
      'mix-7#2',
      'mix-8#1',
    ];
    const actual = allKeys(2).filter((k) => k.startsWith('mix-'));

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
    // sequence above; this derives from STEPS on purpose, to catch a template
    // being added or dropped rather than reordered.
    const keys = expandSteps(1).map((i) => i.key);
    expect(keys).toEqual(STEPS.filter((s) => s.id !== 'mix-8').map((s) => s.id));
    expect(keys.every((k) => !k.includes('#'))).toBe(true);
  });

  it('gives every instance a unique key', () => {
    for (const nMix of [1, 2, 3]) {
      const keys = expandSteps(nMix).map((i) => i.key);
      expect(new Set(keys).size, `unique keys at nMix ${nMix}`).toBe(keys.length);
    }
  });

  it('binds mixIndex to the pass, not the position', () => {
    const byKey = new Map(expandSteps(3).map((i) => [i.key, i.mixIndex]));
    expect(byKey.get('mix-2#1')).toBe(1);
    expect(byKey.get('mix-2#3')).toBe(3);
    expect(byKey.get('biga-1')).toBe(1);
  });
});
