import { describe, expect, it } from 'vitest';
import { leaveField } from '../src/lib/fieldCommit';
import { BAKE_1_SEED, MIX_PHASES, mixStatus } from '../src/lib/bakeLog';
import { calculate } from '../src/lib/engine';
import { BOUNDS, DEFAULT_INPUTS } from '../src/state/defaults';
import { newBakeId, sessionBake } from '../src/state/sessionBake';
import type { Inputs, RunningTimer } from '../src/state/types';

/**
 * §6 *Readings in the steps* (MESSAGE-58): a typed reading counts, even when
 * it matches what the field shows. The bowl field shows its prefill and the
 * final field shows DDT until read; the first build committed a value only
 * when it differed from the one shown, so a bowl read at its prefill saved as
 * `bowl_prefilled` and a dough finished on DDT saved with no final. Found on
 * 23 Oct 2026, the day of bake 2.
 *
 * `NumberField` makes this decision on blur through `leaveField`; these tests
 * take the value each field shows from the engine, as the page does, and
 * carry the commit through to what Save stores.
 */

const NOW = new Date(2026, 9, 23, 12, 0);
const BOWL = { min: BOUNDS.bowlTempF.min, max: BOUNDS.bowlTempF.max };
const FINAL = { min: BOUNDS.finalDoughTempF.min, max: BOUNDS.finalDoughTempF.max };
const READING = { edited: true, recordsReading: true };

const result = (inputs: Inputs) =>
  calculate({ ...inputs, frictionFactorF: BAKE_1_SEED.value, flourTempF: inputs.flourTempF });

/** Every mixer phase stopped at its reference time, so only the readings decide. */
const phaseTimers = (nMix: number): RunningTimer[] =>
  Array.from({ length: nMix }, (_, i) =>
    MIX_PHASES.map((p) => ({
      stepId: nMix === 1 ? p.stepId : `${p.stepId}#${i + 1}`,
      startedAt: NOW.getTime() - 60 * 60_000,
      minMinutes: p.rangeMin[0],
      maxMinutes: p.rangeMin[1],
      stoppedAt: NOW.getTime() - 60 * 60_000 + p.referenceMin * 60_000,
    })),
  ).flat();

const save = (inputs: Inputs) =>
  sessionBake({ inputs, result: result(inputs), timers: phaseTimers(result(inputs).capacity.nMix) }, NOW, newBakeId(NOW));

/** The value a per-mix list holds after a commit at `index`, as the page writes it. */
const at = (list: readonly (number | null)[], index: number, v: number) =>
  Array.from({ length: Math.max(list.length, index + 1) }, (_, i) => (i === index ? v : (list[i] ?? null)));

describe('§6 a typed reading counts, even when it matches the field (MESSAGE-58)', () => {
  it("records mix 1's bowl typed at its prefill, the biga's 58, and Save counts the mix", () => {
    const inputs: Inputs = { ...DEFAULT_INPUTS, balls: 6, finalDoughTempF: [74.5] };
    const shown = result(inputs).mixes[0]!.bowlTempF;
    expect(shown).toBe(58);
    const left = leaveField('58', shown, { ...BOWL, ...READING });
    expect(left.commit).toBe(58);

    const read = { ...inputs, bowlTempF: at(inputs.bowlTempF, 0, left.commit!) };
    const bake = save(read);
    expect(bake.mixes[0]).toMatchObject({ bowl_temp_f: 58, bowl_prefilled: false });
    expect(mixStatus(bake, bake.mixes[0]!).counted).toBe(true);
    // Before the fix the commit was dropped, and the mix stayed out.
    expect(mixStatus(save(inputs), save(inputs).mixes[0]!).reasons).toEqual(['bowl']);
  });

  it("records mix 2's bowl typed at its DDT prefill, 74 at 12 × 265 g", () => {
    const inputs: Inputs = { ...DEFAULT_INPUTS, balls: 12, bowlTempF: [57], finalDoughTempF: [74, 74] };
    const shown = result(inputs).mixes[1]!.bowlTempF;
    expect(shown).toBe(74);
    const left = leaveField('74', shown, { ...BOWL, ...READING });
    expect(left.commit).toBe(74);

    const bake = save({ ...inputs, bowlTempF: at(inputs.bowlTempF, 1, left.commit!) });
    expect(bake.mixes.map((m) => m.bowl_prefilled)).toEqual([false, false]);
    expect(bake.mixes.map((m) => mixStatus(bake, m).counted)).toEqual([true, true]);
  });

  it('records a final typed at DDT, 75 at 6 balls, so the rise is timed from a reading', () => {
    const inputs: Inputs = { ...DEFAULT_INPUTS, balls: 6, bowlTempF: [57] };
    const shown = result(inputs).ddtF;
    expect(shown).toBe(75);
    const left = leaveField('75', shown, { ...FINAL, ...READING });
    expect(left.commit).toBe(75);

    const read = { ...inputs, finalDoughTempF: at(inputs.finalDoughTempF, 0, left.commit!) };
    // The hint and "Clear and plan at DDT" follow a recorded reading: the
    // field's `measured` is no longer null, and planning mode is off.
    expect(read.finalDoughTempF[0]).toBe(75);
    expect(result(read).roomMinutesIsPlanned).toBe(false);
    const bake = save(read);
    expect(bake.mixes[0]!.final_dough_temp_f).toBe(75);
    expect(mixStatus(bake, bake.mixes[0]!).counted).toBe(true);
  });

  it('records nothing when a field is focused and left without an edit', () => {
    // A glance at the bowl field mustn't turn its prefill, biased high, into
    // a reading.
    expect(leaveField('58', 58, { ...BOWL, edited: false, recordsReading: true }).commit).toBeNull();
    expect(leaveField('75', 75, { ...FINAL, edited: false, recordsReading: true }).commit).toBeNull();
  });

  it('records a changed value as before, whether or not the field holds a reading', () => {
    expect(leaveField('60', 58, { ...BOWL, ...READING }).commit).toBe(60);
    expect(leaveField('60', 58, { ...BOWL, edited: true, recordsReading: false }).commit).toBe(60);
    // Clamped to the field's bounds, and the text shows the clamped value.
    expect(leaveField('500', 58, { ...BOWL, ...READING })).toEqual({ draft: String(BOWL.max), commit: BOWL.max });
  });

  it('leaves a field that holds no reading as it was: an unchanged edit commits nothing', () => {
    // Ball weight and the DDT override keep their old rule. Typing the auto DDT
    // into the override must not pin it, or a change of ball count would no
    // longer move it.
    expect(leaveField('265', 265, { min: 240, max: 300, edited: true, recordsReading: false }).commit).toBeNull();
  });

  it('puts an empty or unparseable field back to what it showed, committing nothing', () => {
    expect(leaveField('', 58, { ...BOWL, ...READING })).toEqual({ draft: '58', commit: null });
    expect(leaveField('5x', 58, { ...BOWL, ...READING })).toEqual({ draft: '58', commit: null });
  });
});
