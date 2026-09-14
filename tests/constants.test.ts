import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { STEPS, type Step } from '../src/content/steps';
import { expandSteps } from '../src/lib/stepInstances';

/**
 * Structural checks on the constants — WEBSITE-SPEC-biga-calculator.md §3.
 *
 * These assert PROPERTIES rather than values, which is the shape that has
 * repeatedly caught things careful reading missed. The bound-but-unused token
 * check found a silently vanished spec block by noticing a value with no
 * consumer; these are the same idea applied to `C`.
 */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/**
 * Everything that could read a constant: the app, the constants module itself
 * (several are inputs to a derivation or to a helper), and the suite.
 */
const ALL_READERS = [...sourceFiles('src'), ...sourceFiles('tests')]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

describe('every constant has a consumer', () => {
  /**
   * A constant nothing reads is either dead weight or — far worse — evidence
   * that something upstream was renamed and its reader now silently uses a
   * different value. Same failure mode as an orphaned token, and the check
   * that found a silently vanished spec block.
   *
   * "Consumer" is deliberately generous: `HYDRATION` is read only by the
   * `FRESH_WATER_FRACTION` derivation and `RPM_SLOPE` only by `rpmForDial`,
   * and both are load-bearing. What this catches is a constant read by
   * *nothing at all*.
   */
  it('finds a reader for each one', () => {
    const orphans = Object.keys(C).filter((key) => {
      const uses = ALL_READERS.split(key).length - 1;
      // One occurrence is its own declaration in constants.ts.
      return uses <= 1;
    });
    expect(orphans, 'constants nothing reads').toEqual([]);
  });
});

describe('derived constants are derived', () => {
  /**
   * Four constants are computed from others rather than written down, because
   * a literal is correct today and silently wrong the first time the formula
   * moves. Three of them got that treatment only after going wrong: the yeast
   * dose, `divideBall`, and the flour offset.
   */
  it('recomputes each one from its inputs', () => {
    expect(C.C_BIGA).toBeCloseTo(
      (1 / (1 + C.BIGA_HYDRATION)) * C.C_FLOUR +
        (C.BIGA_HYDRATION / (1 + C.BIGA_HYDRATION)) * C.C_WATER,
      12,
    );
    expect(C.ADY_OF_BIGA_FLOUR).toBeCloseTo(
      C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY * C.IDY_TO_ADY,
      12,
    );
    expect(C.FRESH_FLOUR_FRACTION).toBeCloseTo(1 - C.BIGA_FRACTION, 12);
    expect(C.FRESH_WATER_FRACTION).toBeCloseTo(
      C.HYDRATION - C.BIGA_FRACTION * C.BIGA_HYDRATION,
      12,
    );
    expect(C.APP_DEFAULT_FLOUR_OFFSET_F).toBeCloseTo(
      (C.FRESH_FLOUR_FRACTION * C.C_FLOUR) / (C.FRESH_WATER_FRACTION * C.C_WATER),
      12,
    );
  });

  it('keeps DOUGH_YIELD consistent with hydration and salt', () => {
    // §3 states the relationship; nothing enforced it.
    expect(C.DOUGH_YIELD).toBeCloseTo(1 + C.HYDRATION + C.SALT, 12);
  });

  it('holds no duration as a rounded decimal', () => {
    // The `divideBall = 0.33` failure: a displayed figure used as an input.
    // Both of these are whole minutes, so they must divide exactly by 60.
    expect((C.DIVIDE_BALL_H * 60) % 1).toBe(0);
    expect((C.CHANGEOVER_H * 60) % 1).toBe(0);
  });
});

describe('§5 the mix profile fits the mixer', () => {
  /**
   * The longest continuous run the recipe can produce, against the Halo Core's
   * limit. Phases A, B and C run back to back — the ~30-second probe pause
   * between B and C is treated as NOT resetting motor thermal load, which is
   * the conservative reading. `mix-6`'s ten-minute rest unambiguously breaks
   * the run, so Phase D starts fresh and is not in the sum.
   *
   * ⚠️ Deliberately a build-time assertion rather than a runtime warning. A
   * warning here could never fire — the profile is fixed and minutes clear —
   * and that is exactly the point: this catches a future phase extension
   * quietly eating the margin, which is the only route by which the limit ever
   * gets breached.
   */
  const MIX_STEPS = STEPS.filter((s) => s.phase === 'mix');

  /**
   * The run boundary is the ten-minute rest, `mix-6`.
   *
   * ⚠️ **Identified by id, deliberately.** `mix-8` shares its shape — a pause
   * with a timer and no speed — and the tempting general rule is "a pause with
   * a speed step still ahead of it." That rule is TEMPLATE-SCOPED AND DOES NOT
   * SURVIVE §8.2a EXPANSION: the rendered order is
   *
   *     … mix-7#1, mix-8#1, mix-1#2, mix-2#2 …
   *
   * so after expansion `mix-8#1` *is* followed by a speed step, and the rule
   * classifies the changeover as interrupting a run rather than ending one —
   * the exact misclassification it was written to prevent, one layer up. The
   * test below pins that failure so the rule cannot be quietly adopted.
   *
   * **A new pause in the mix phase is something a person has to classify.** Do
   * not replace this pinning with the general form.
   */
  const restIndex = MIX_STEPS.findIndex((s) => s.id === 'mix-6');

  it('identifies the rest as the pause that bounds the run', () => {
    const pauses = MIX_STEPS.filter((s) => s.timerLabel && !s.speed);
    expect(pauses.map((s) => s.id), 'mix steps that pause the motor').toEqual([
      'mix-6', // the ten-minute rest, mid-run
      'mix-8', // the changeover, after Phase D
    ]);
    expect(MIX_STEPS[restIndex]?.id, 'the one that bounds the continuous run').toBe('mix-6');
  });

  it('pins why the general boundary rule cannot be used', () => {
    // On the TEMPLATES the rule happens to work: mix-8 is last, so nothing
    // with a speed follows it.
    const templatePauses = MIX_STEPS.filter((s) => s.timerLabel && !s.speed);
    const followedBySpeed = (list: { step: Step }[], i: number) =>
      list.slice(i + 1).some((x) => x.step.speed);

    const asTemplates = MIX_STEPS.map((step) => ({ step }));
    const mix8Template = asTemplates.findIndex((x) => x.step.id === 'mix-8');
    expect(followedBySpeed(asTemplates, mix8Template), 'templates: rule holds').toBe(false);

    // After expansion it does not. mix-8#1 is followed by the whole of mix 2.
    const expanded = expandSteps(2);
    const mix8First = expanded.findIndex((x) => x.key === 'mix-8#1');
    expect(expanded[mix8First]?.key).toBe('mix-8#1');
    expect(
      followedBySpeed(expanded, mix8First),
      'expanded: the rule would misclassify the changeover as mid-run',
    ).toBe(true);

    // Which is why `restIndex` is pinned by id rather than derived.
    expect(templatePauses.length, 'two pauses share the shape').toBe(2);
  });

  it('keeps A + B + C inside the continuous limit, with headroom', () => {
    // Derived from the step content rather than transcribed, so extending a
    // phase in §8.2 moves this sum automatically — which is the whole purpose.
    const continuousMin = MIX_STEPS.slice(0, restIndex).reduce((total, step) => {
      if (!step.speed) return total;
      // Phase C's reachable ceiling is its §4.6 temperature authority (5.5 min),
      // not the 3–4 printed on the card. Assert against what a user can produce.
      const reachable =
        step.speed.dial === 30
          ? Math.max(step.speed.minutes[1], C.PHASE_C_MAX_MIN)
          : step.speed.minutes[1];
      return total + reachable;
    }, 0);

    expect(continuousMin, 'A + B + C at their maxima').toBeCloseTo(15.5, 6);
    expect(continuousMin).toBeLessThanOrEqual(C.MAX_RUN_MIN);
    expect(C.MAX_RUN_MIN - continuousMin, 'headroom, minutes').toBeCloseTo(4.5, 6);
  });

  it('shows how sharp the margin is', () => {
    // §5: stretching Phase C to 10 minutes lands on exactly 20.0 and still
    // passes. Anything beyond that is the failure this assertion exists for.
    const aPlusB = MIX_STEPS.slice(0, restIndex)
      .filter((s) => s.speed && s.speed.dial !== 30)
      .reduce((total, s) => total + s.speed!.minutes[1], 0);
    expect(aPlusB + 10).toBeCloseTo(C.MAX_RUN_MIN, 6);
    expect(aPlusB + 10.5).toBeGreaterThan(C.MAX_RUN_MIN);
  });

  it('leaves Phase D out, because the rest breaks the run', () => {
    const afterRest = MIX_STEPS.slice(restIndex + 1).filter((s) => s.speed);
    expect(afterRest.map((s) => s.id), 'speed steps after the rest').toEqual(['mix-7']);
  });
});
