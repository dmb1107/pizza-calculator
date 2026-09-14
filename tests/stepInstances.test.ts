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
    // persisted checkbox orphaned.
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
