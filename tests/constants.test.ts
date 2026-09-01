import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';

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
  /**
   * ⚠️ The one constant nothing reads, and it is deliberate rather than dead.
   *
   * §3 lists the Halo Core's 20-minute continuous limit, but nothing in the app
   * computes against it: the nominal profile is ~15 min of run time and the
   * 10-minute rest breaks it up, so there is no state in which the app could
   * warn. §8's `mix-6` and `mix-7` state the limit as prose instead — which
   * means the number lives in two places, once as a constant nobody reads and
   * once as a literal in verbatim content.
   *
   * Kept rather than deleted because §3 is transcribed from the spec, and
   * listed here rather than filtered silently so it stays visible. Raised with
   * the recipe agent.
   */
  const DELIBERATELY_UNREAD = ['MAX_RUN_MIN'];

  it('finds a reader for each one', () => {
    const orphans = Object.keys(C).filter((key) => {
      if (DELIBERATELY_UNREAD.includes(key)) return false;
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
