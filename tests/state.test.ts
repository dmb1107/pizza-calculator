import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import {
  BOUNDS,
  COLD_FERMENT_H,
  DEFAULT_CALIBRATION,
  DEFAULT_INPUTS,
  DEFAULT_PERSISTED,
  applyInput,
  clampField,
  inputsForNewBake,
  persistedForNewBake,
} from '../src/state/defaults';
import { decodeInputs, encodeInputs, hasInputs } from '../src/state/url';
import { STORAGE_KEY, loadPersisted, savePersisted, type StorageLike } from '../src/state/storage';
import type { Inputs, Persisted } from '../src/state/types';

/** In-memory Storage stand-in, so these run without a DOM. */
function fakeStorage(seed: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

const CUSTOM: Inputs = {
  balls: 12,
  ballWeightG: 280,
  // Inside the classic track's 6–8 (MESSAGE-53).
  coldFermentH: 7,
  schedule: 'classic',
  roomTempF: 66.5,
  flourSameAsRoom: false,
  flourTempF: 62,
  bigaTempF: [58.5, 61],
  bowlState: 'room',
  bowlTempF: [71.5, null],
  bigaFridgeH: 18.5,
  bigaRoomOnlyH: 14,
  temperH: 1.75,
  finalDoughTempF: [73.5, 74],
  waterUsedF: [64.2, null],
};

describe('URL serialization', () => {
  it('round-trips per-mix temperature lists', () => {
    // §7: a shared split-batch link that silently dropped the mix-2 readings
    // would be worse than the field not existing.
    const decoded = decodeInputs(encodeInputs(CUSTOM));
    expect(decoded.bigaTempF).toEqual([58.5, 61]);
    expect(decoded.bowlTempF).toEqual([71.5, null]);
  });

  it('reads a pre-per-mix link as a length-1 list', () => {
    // Links shared before the per-mix fields existed carry a bare value.
    expect(decodeInputs('biga=57').bigaTempF).toEqual([57]);
    expect(decodeInputs('bowlt=66').bowlTempF).toEqual([66]);
  });

  it('reads final and poured-water readings by index, padded to the mixes', () => {
    // 12 × 265 g is two mixes. Mix 1 read, mix 2 not yet: "73~", which can't
    // be mistaken for a bare value.
    const twoMix = { ...DEFAULT_INPUTS, balls: 12, finalDoughTempF: [73], waterUsedF: [null, 60.5] };
    const encoded = encodeInputs(twoMix);
    expect(new URLSearchParams(encoded).get('dought')).toBe('73~');
    expect(new URLSearchParams(encoded).get('water')).toBe('~60.5');
    const decoded = decodeInputs(encoded);
    expect(decoded.finalDoughTempF).toEqual([73, null]);
    expect(decoded.waterUsedF).toEqual([null, 60.5]);
  });

  it('reads a link from before per-mix finals as the batch reading, so its rise is unchanged', () => {
    // It was the one reading §4.8 used; at two mixes it applies to both, and
    // their mean is the same value.
    expect(decodeInputs('balls=12&dought=73.5').finalDoughTempF).toEqual([73.5, 73.5]);
    expect(decodeInputs('dought=73.5').finalDoughTempF).toEqual([73.5]);
  });

  it('clamps and rejects garbage inside a list without dropping the rest', () => {
    expect(decodeInputs('biga=57~999~abc').bigaTempF).toEqual([
      57,
      BOUNDS.bigaTempF.max,
      DEFAULT_INPUTS.bigaTempF[0],
    ]);
    // An empty bowl entry means "no measurement", not a fallback.
    expect(decodeInputs('bowlt=~64').bowlTempF).toEqual([null, 64]);
  });

  it('round-trips a fully customised setup', () => {
    expect(decodeInputs(encodeInputs(CUSTOM))).toEqual(CUSTOM);
  });

  it('round-trips the defaults', () => {
    expect(decodeInputs(encodeInputs(DEFAULT_INPUTS))).toEqual(DEFAULT_INPUTS);
  });

  it('omits defaults so a lightly-changed link stays short', () => {
    expect(encodeInputs(DEFAULT_INPUTS)).toBe('');
    expect(encodeInputs({ ...DEFAULT_INPUTS, balls: 9 })).toBe('balls=9');
  });

  it('accepts a leading question mark', () => {
    expect(decodeInputs('?balls=9').balls).toBe(9);
  });

  it('reports whether a query string carries inputs', () => {
    expect(hasInputs('')).toBe(false);
    expect(hasInputs('?utm_source=x')).toBe(false);
    expect(hasInputs('?balls=9')).toBe(true);
  });

  it('leaves the flour temperature out while it tracks the room', () => {
    const encoded = encodeInputs({ ...DEFAULT_INPUTS, roomTempF: 64, flourSameAsRoom: true });
    expect(encoded).not.toContain('flour=');
    // ...and decoding pulls the flour along with the room.
    expect(decodeInputs(encoded).flourTempF).toBe(64);
  });

  it('keeps a separately measured flour temperature', () => {
    const encoded = encodeInputs({
      ...DEFAULT_INPUTS,
      roomTempF: 72,
      flourSameAsRoom: false,
      flourTempF: 61,
    });
    expect(decodeInputs(encoded).flourTempF).toBe(61);
  });

  it('falls back per key, not wholesale', () => {
    const decoded = decodeInputs('balls=9');
    expect(decoded.balls).toBe(9);
    expect(decoded.ballWeightG).toBe(DEFAULT_INPUTS.ballWeightG);
    expect(decoded.schedule).toBe(DEFAULT_INPUTS.schedule);
  });

  it('accepts a supplied base for the fallbacks', () => {
    const base = { ...DEFAULT_INPUTS, roomTempF: 64 };
    expect(decodeInputs('balls=9', base).roomTempF).toBe(64);
  });

  describe('rejects hostile or truncated links', () => {
    it.each([
      ['balls=abc', 'balls', DEFAULT_INPUTS.balls],
      ['balls=NaN', 'balls', DEFAULT_INPUTS.balls],
      ['balls=', 'balls', DEFAULT_INPUTS.balls],
      ['balls=Infinity', 'balls', DEFAULT_INPUTS.balls],
      ['room=nonsense', 'roomTempF', DEFAULT_INPUTS.roomTempF],
    ] as const)('%s falls back', (search, field, expected) => {
      expect(decodeInputs(search)[field]).toBe(expected);
    });

    it('clamps out-of-range values into the §6 ranges', () => {
      expect(decodeInputs('balls=9999').balls).toBe(BOUNDS.balls.max);
      expect(decodeInputs('balls=-5').balls).toBe(BOUNDS.balls.min);
      expect(decodeInputs('ball=10').ballWeightG).toBe(BOUNDS.ballWeightG.min);
      expect(decodeInputs('cold=500').coldFermentH).toBe(BOUNDS.coldFermentH.max);
    });

    it('clamps the temper into 1.5–2 h, stored or linked (MESSAGE-53)', () => {
      // A link from before carried 2–3 h.
      expect(decodeInputs('temper=3').temperH).toBe(2);
      expect(decodeInputs('temper=2.5').temperH).toBe(2);
      expect(decodeInputs('temper=1').temperH).toBe(1.5);
      expect(decodeInputs('temper=1.75').temperH).toBe(1.75);
      expect(DEFAULT_INPUTS.temperH).toBe(1.5);
    });

    it("clamps the cold ferment into the track's range, and defaults by track", () => {
      // §4.7, §6 Panel 1: retarded 6–36 (24), classic 6–8 (6).
      expect(COLD_FERMENT_H).toEqual({
        retarded: { min: 6, max: 36, step: 1, default: 24 },
        classic: { min: 6, max: 8, step: 1, default: 6 },
      });
      expect(decodeInputs('sched=c&cold=24').coldFermentH).toBe(8);
      expect(decodeInputs('sched=c&cold=4').coldFermentH).toBe(6);
      expect(decodeInputs('sched=c').coldFermentH).toBe(6);
      expect(decodeInputs('').coldFermentH).toBe(24);
      expect(decodeInputs('cold=30').coldFermentH).toBe(30);
      // Each track's default is left out of the link, and read back.
      const classic = { ...DEFAULT_INPUTS, schedule: 'classic' as const, coldFermentH: 6 };
      expect(encodeInputs(classic)).toBe('sched=c');
      expect(decodeInputs(encodeInputs(classic)).coldFermentH).toBe(6);
      expect(decodeInputs(encodeInputs({ ...classic, coldFermentH: 7 })).coldFermentH).toBe(7);
    });

    it('rounds a fractional ball count', () => {
      expect(decodeInputs('balls=6.7').balls).toBe(7);
    });

    it('never yields a non-finite number', () => {
      const decoded = decodeInputs('balls=NaN&ball=Infinity&room=-Infinity&biga=abc&bowl=&cold=x');
      for (const [key, value] of Object.entries(decoded)) {
        if (typeof value === 'number') {
          expect(Number.isFinite(value), `${key} is finite`).toBe(true);
        }
      }
    });

    it('ignores an unknown schedule', () => {
      expect(decodeInputs('sched=weekly').schedule).toBe(DEFAULT_INPUTS.schedule);
    });
  });
});

describe('localStorage persistence', () => {
  it('returns defaults with no storage available', () => {
    expect(loadPersisted(null)).toEqual(DEFAULT_PERSISTED);
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadPersisted(fakeStorage())).toEqual(DEFAULT_PERSISTED);
  });

  it('round-trips', () => {
    const s = fakeStorage();
    const value = {
      calibration: { ddtOverrideF: 73 },
      panels: { batch: true, temperatures: true, calibration: false },
      bigaStartAtIso: '2026-08-21T13:00:00.000Z',
      timelineMode: 'backward' as const,
      bakeAtIso: '2026-08-23T22:00:00.000Z',
      checkedSteps: ['biga-1', 'biga-2'],
      timers: [
        { stepId: 'mix-6', startedAt: 1_700_000_000_000, minMinutes: 10, maxMinutes: 10 },
        { stepId: 'mix-5', startedAt: 1_700_000_000_000, minMinutes: 3, maxMinutes: 4, stoppedAt: 1_700_000_210_000 },
      ],
      sessionBakeId: '2026-09-28-193000',
    };
    savePersisted(s, value);
    expect(loadPersisted(s)).toEqual(value);
  });

  it('never throws on a write failure', () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => savePersisted(failing, DEFAULT_PERSISTED)).not.toThrow();
  });

  describe('degrades rather than breaking on bad stored data', () => {
    it.each([
      ['not json at all', '{{{'],
      ['a JSON array', '[]'],
      ['a JSON string', '"hello"'],
      ['null', 'null'],
      ['an empty object', '{}'],
      ['wrong-typed fields', '{"calibration":42,"panels":"open","bowlMassG":"heavy"}'],
    ])('%s', (_label, raw) => {
      const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));

      // Every field is a usable value rather than a crash or a NaN.
      expect(typeof loaded.panels.batch).toBe('boolean');
      expect(Array.isArray(loaded.checkedSteps)).toBe(true);
      expect(Array.isArray(loaded.timers)).toBe(true);
      expect(typeof loaded.sessionBakeId).toBe('string');
    });

    it('drops a stop recorded before its start, and ignores typing times an earlier build stored', () => {
      const raw = JSON.stringify({
        timers: [{ stepId: 'mix-2', startedAt: 2000, minMinutes: 3, maxMinutes: 4, stoppedAt: 1000 }],
        entered: { roomTempF: 1_700_000_000_000 },
        sessionStartedAt: 1_700_000_000_000,
      });
      const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));
      expect(loaded.timers[0]).not.toHaveProperty('stoppedAt');
      expect(loaded).not.toHaveProperty('entered');
      expect(loaded).not.toHaveProperty('sessionStartedAt');
    });

    it('ignores a friction map stored before the log (§6: the FF is never typed)', () => {
      const raw = JSON.stringify({
        calibration: { frictionFactors: { 6: { ff: 13.2, measuredAt: '2026-08-01' } }, ddtOverrideF: 73 },
      });
      const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));
      expect(loaded.calibration).toEqual({ ddtOverrideF: 73 });
    });
  });
});

describe('§10 Reset starts a new bake', () => {
  it("puts the day's temperatures back to their defaults and keeps the batch settings", () => {
    const next = inputsForNewBake(CUSTOM);
    // The day's temperatures: Panel 2, the water poured, the final readings.
    expect(next).toMatchObject({
      roomTempF: DEFAULT_INPUTS.roomTempF,
      flourSameAsRoom: DEFAULT_INPUTS.flourSameAsRoom,
      flourTempF: DEFAULT_INPUTS.flourTempF,
      bigaTempF: DEFAULT_INPUTS.bigaTempF,
      bowlState: DEFAULT_INPUTS.bowlState,
      bowlTempF: DEFAULT_INPUTS.bowlTempF,
      finalDoughTempF: DEFAULT_INPUTS.finalDoughTempF,
      waterUsedF: DEFAULT_INPUTS.waterUsedF,
    });
    // Balls, ball weight, schedule, cold ferment, and the schedule's adjustments.
    expect(next).toMatchObject({
      balls: CUSTOM.balls,
      ballWeightG: CUSTOM.ballWeightG,
      schedule: CUSTOM.schedule,
      coldFermentH: CUSTOM.coldFermentH,
      bigaFridgeH: CUSTOM.bigaFridgeH,
      bigaRoomOnlyH: CUSTOM.bigaRoomOnlyH,
      temperH: CUSTOM.temperH,
    });
    // Nothing else: every key of the inputs is one of the two lists above.
    const reset = ['roomTempF', 'flourSameAsRoom', 'flourTempF', 'bigaTempF', 'bowlState', 'bowlTempF', 'finalDoughTempF', 'waterUsedF'];
    const kept = ['balls', 'ballWeightG', 'schedule', 'coldFermentH', 'bigaFridgeH', 'bigaRoomOnlyH', 'temperH'];
    expect(Object.keys(DEFAULT_INPUTS).sort()).toEqual([...reset, ...kept].sort());
  });

  // A session mid-bake: overridden DDT, both anchors set, ticks, a stopped
  // timer, a saved bake, and panels that differ from their defaults.
  const MID_BAKE: Persisted = {
    calibration: { ddtOverrideF: 73 },
    panels: { batch: false, temperatures: true, calibration: true },
    bigaStartAtIso: '2026-09-26T15:00:00.000Z',
    timelineMode: 'backward',
    bakeAtIso: '2026-09-28T23:30:00.000Z',
    checkedSteps: ['biga-1', 'mix-2#1'],
    timers: [{ stepId: 'mix-3#1', startedAt: 1_000, minMinutes: 3, maxMinutes: 4, stoppedAt: 200_000 }],
    sessionBakeId: 'bake-2026-09-28-1',
  };

  it('puts the DDT override and the timeline anchor back to their defaults, and clears the bake in progress', () => {
    const next = persistedForNewBake(MID_BAKE);
    // Reset to defaults (MESSAGE-48): per-bake choices. '' is the biga start a
    // fresh session reads as now.
    expect(next.calibration).toEqual(DEFAULT_CALIBRATION);
    expect(next.calibration.ddtOverrideF).toBeNull();
    expect(next.bigaStartAtIso).toBe(DEFAULT_PERSISTED.bigaStartAtIso);
    expect(next.bakeAtIso).toBe(DEFAULT_PERSISTED.bakeAtIso);
    // Cleared.
    expect(next.checkedSteps).toEqual([]);
    expect(next.timers).toEqual([]);
    expect(next.sessionBakeId).toBe('');
    // Kept (§10, MESSAGE-49): which panels are open, and which end of the
    // timeline is held. The anchor is the held time, not the mode.
    expect(next.panels).toEqual(MID_BAKE.panels);
    expect(next.timelineMode).toBe(MID_BAKE.timelineMode);
    // Nothing else: every persisted field is in one of the three lists, and
    // the calibration holds the override alone.
    const resetToDefault = ['calibration', 'bigaStartAtIso', 'bakeAtIso'];
    const cleared = ['checkedSteps', 'timers', 'sessionBakeId'];
    const kept = ['panels', 'timelineMode'];
    expect(Object.keys(DEFAULT_PERSISTED).sort()).toEqual([...resetToDefault, ...cleared, ...kept].sort());
    expect(Object.keys(DEFAULT_CALIBRATION)).toEqual(['ddtOverrideF']);
  });
});

describe('field clamping', () => {
  it('holds the §6 ranges', () => {
    // §4.4: the floor is 3, not 1. A 2-ball batch clears the mixer's 500 g
    // minimum on paper but won't let a spiral hook grip, and asks for 116 °F
    // water. Two independent reasons, so this is an input constraint rather
    // than a warning.
    expect(clampField('balls', 0)).toBe(C.MIN_BALLS);
    expect(clampField('balls', 2)).toBe(C.MIN_BALLS);
    expect(clampField('balls', 99)).toBe(24);
    expect(clampField('ballWeightG', 200)).toBe(240);
    expect(clampField('ballWeightG', 400)).toBe(300);
    expect(clampField('coldFermentH', 0)).toBe(6);
    expect(clampField('coldFermentH', 100)).toBe(36);
  });

  it('clamps the cold ferment when the schedule changes (§4.7)', () => {
    const retarded = { ...DEFAULT_INPUTS, coldFermentH: 24 };
    const classic = applyInput(retarded, 'schedule', 'classic');
    expect(classic.coldFermentH).toBe(8);
    // Back to retarded, the value is inside 6–36 and stays.
    expect(applyInput(classic, 'schedule', 'retarded').coldFermentH).toBe(8);
    // A cold ferment set past the classic range is held to it.
    expect(applyInput(classic, 'coldFermentH', 30).coldFermentH).toBe(8);
    expect(applyInput(retarded, 'coldFermentH', 30).coldFermentH).toBe(30);
  });

  it('keeps the flour on the room while the toggle is on', () => {
    const on = { ...DEFAULT_INPUTS, flourSameAsRoom: true };
    expect(applyInput(on, 'roomTempF', 64).flourTempF).toBe(64);
    const off = { ...DEFAULT_INPUTS, flourSameAsRoom: false, flourTempF: 60 };
    expect(applyInput(off, 'roomTempF', 64).flourTempF).toBe(60);
    expect(applyInput({ ...off, roomTempF: 66 }, 'flourSameAsRoom', true).flourTempF).toBe(66);
  });

  it('leaves in-range values alone', () => {
    expect(clampField('balls', 9)).toBe(9);
    expect(clampField('roomTempF', 68.5)).toBe(68.5);
  });
});
