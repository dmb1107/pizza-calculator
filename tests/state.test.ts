import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { BOUNDS, DEFAULT_ENTERED, DEFAULT_INPUTS, DEFAULT_PERSISTED, clampField } from '../src/state/defaults';
import { decodeInputs, encodeInputs, hasInputs } from '../src/state/url';
import { STORAGE_KEY, loadPersisted, savePersisted, type StorageLike } from '../src/state/storage';
import type { Inputs } from '../src/state/types';

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
  coldFermentH: 30,
  schedule: 'classic',
  roomTempF: 66.5,
  flourSameAsRoom: false,
  flourTempF: 62,
  bigaTempF: [58.5, 61],
  bowlState: 'room',
  bowlTempF: [71.5, null],
  bigaFridgeH: 18.5,
  bigaRoomOnlyH: 14,
  temperH: 3,
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
      entered: { ...DEFAULT_ENTERED, roomTempF: 1_700_000_100_000, bowlTempF: [1_700_000_100_000, 0] },
      sessionStartedAt: 1_700_000_000_000,
      sessionBakeId: '2026-09-28-193000',
      sessionSavedAt: 1_700_000_300_000,
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

      expect(Array.isArray(loaded.entered.bigaTempF)).toBe(true);
      expect(typeof loaded.sessionBakeId).toBe('string');
    });

    it('drops a stop recorded before its start, and reads anything but a typing time as never typed', () => {
      // The dates an earlier build wrote included: "entered" is per bake now (§10).
      const raw = JSON.stringify({
        timers: [{ stepId: 'mix-2', startedAt: 2000, minMinutes: 3, maxMinutes: 4, stoppedAt: 1000 }],
        entered: { roomTempF: '2026-09-28', bigaTempF: ['2026-09-28', 42, -5] },
        sessionStartedAt: 'yesterday',
      });
      const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));
      expect(loaded.timers[0]).not.toHaveProperty('stoppedAt');
      expect(loaded.entered.roomTempF).toBe(0);
      expect(loaded.entered.bigaTempF).toEqual([0, 42, 0]);
      expect(loaded.sessionStartedAt).toBe(0);
    });

    it('keeps backward mode only with a bake time to hold', () => {
      const load = (extra: object) =>
        loadPersisted(fakeStorage({ [STORAGE_KEY]: JSON.stringify(extra) }));
      expect(load({ timelineMode: 'backward', bakeAtIso: '2026-10-03T22:00:00.000Z' }).timelineMode).toBe('backward');
      expect(load({ timelineMode: 'backward' }).timelineMode).toBe('forward');
      expect(load({ timelineMode: 'backward', bakeAtIso: 'Saturday' }).timelineMode).toBe('forward');
      expect(load({ timelineMode: 'sideways', bakeAtIso: '2026-10-03T22:00:00.000Z' }).timelineMode).toBe('forward');
      expect(load({}).timelineMode).toBe('forward');
    });

    it('ignores a bowl mass stored before MESSAGE-29 made it a constant', () => {
      const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ bowlMassG: 1100 }) }));
      expect('bowlMassG' in loaded).toBe(false);
    });

    it('decodes an old link carrying a bowl mass, and ignores it', () => {
      const decoded = decodeInputs('balls=9&bowl=1100');
      expect(decoded.balls).toBe(9);
      expect('bowlMassG' in decoded).toBe(false);
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

  it('leaves in-range values alone', () => {
    expect(clampField('balls', 9)).toBe(9);
    expect(clampField('roomTempF', 68.5)).toBe(68.5);
  });
});
