import { describe, expect, it } from 'vitest';
import { C } from '../src/lib/constants';
import { BOUNDS, DEFAULT_INPUTS, DEFAULT_PERSISTED, clampField } from '../src/state/defaults';
import { decodeInputs, encodeInputs, hasInputs } from '../src/state/url';
import { ballsPerMix } from '../src/lib/engine';
import {
  STORAGE_KEY,
  clearFriction,
  effectiveFriction,
  isMixSizeKey,
  loadPersisted,
  recordFriction,
  savePersisted,
  type StorageLike,
} from '../src/state/storage';
import { DEFAULT_CALIBRATION } from '../src/state/defaults';
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
  finalDoughTempF: 73.5,
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
      calibration: {
        frictionFactors: { 6: { ff: 13.2, measuredAt: '2026-08-21' } },
        ddtOverrideF: 73,
      },
      panels: { batch: true, temperatures: true, calibration: false },
      bigaStartAtIso: '2026-08-21T13:00:00.000Z',
      timelineMode: 'backward' as const,
      bakeAtIso: '2026-08-23T22:00:00.000Z',
      checkedSteps: ['biga-1', 'biga-2'],
          timers: [{ stepId: 'mix-6', startedAt: 1_700_000_000_000, minMinutes: 10, maxMinutes: 10 }],
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

      // Whatever survives must be well-formed. Note the map is NOT required to
      // be empty: a record too broken to parse falls back to DEFAULT_PERSISTED,
      // which carries the seeded bake-1 measurement — losing a real calibration
      // because localStorage got scrambled would be the worse failure.
      for (const [size, entry] of Object.entries(loaded.calibration.frictionFactors)) {
        expect(isMixSizeKey(Number(size))).toBe(true);
        expect(Number.isFinite(entry.ff)).toBe(true);
        expect(typeof entry.measuredAt).toBe('string');
      }
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

    it('drops corrupt friction entries but keeps the good ones', () => {
      const raw = JSON.stringify({
        calibration: {
          frictionFactors: {
            6: { ff: 13.5, measuredAt: '2026-08-01' },
            9: { ff: 'hot' },
            0: { ff: 12 },
            99: { ff: 12 },
            abc: { ff: 12 },
          },
          ddtOverrideF: null,
        },
      });
      const { frictionFactors } = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw })).calibration;
      expect(Object.keys(frictionFactors)).toEqual(['6']);
      expect(frictionFactors[6]?.ff).toBe(13.5);
    });

    it('clamps a stored friction factor into range', () => {
      const raw = JSON.stringify({
        calibration: { frictionFactors: { 6: { ff: 9999, measuredAt: '2026-08-01' } } },
      });
      const { frictionFactors } = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw })).calibration;
      expect(frictionFactors[6]?.ff).toBe(BOUNDS.frictionFactorF.max);
    });
  });
});

describe('§6 friction factor is per mix size', () => {
  it('ships the bake-1 measurement for 6 balls per mix', () => {
    // §6: seed with {6: {value: 14.03, date: '2026-08-21'}} — 14.04 before
    // MESSAGE-25 re-solved bake 1 from its logged inputs.
    const f = effectiveFriction(DEFAULT_CALIBRATION, 6);
    expect(f.ff).toBe(14.03);
    expect(f.isEstimate).toBe(false);
    expect(f.measuredAt).toBe('2026-08-21');
  });

  it('falls back to 14.0 and badges it as an estimate at uncalibrated sizes', () => {
    for (const balls of [3, 9, 6.5, 9.5]) {
      const f = effectiveFriction(DEFAULT_CALIBRATION, balls);
      expect(f.ff, `${balls} balls`).toBe(C.DEFAULT_FF);
      expect(f.isEstimate, `${balls} balls`).toBe(true);
      expect(f.measuredAt).toBeUndefined();
    }
  });

  it('uses a measurement for that batch size and reports its date', () => {
    const cal = recordFriction(DEFAULT_CALIBRATION, 9, 16.4, '2026-08-21');
    const f = effectiveFriction(cal, 9);
    expect(f.ff).toBe(16.4);
    expect(f.isEstimate).toBe(false);
    expect(f.measuredAt).toBe('2026-08-21');
  });

  it('does not apply one mix size’s measurement to another', () => {
    // Whether FF varies with mix size is untested (§6, MESSAGE-25); keeping a
    // value per size is how the bake log finds out, so one size's measurement
    // must not leak into another's.
    const cal = recordFriction(DEFAULT_CALIBRATION, 9, 16.4, '2026-08-21');
    expect(effectiveFriction(cal, 3).ff).toBe(C.DEFAULT_FF);
    expect(effectiveFriction(cal, 3).isEstimate).toBe(true);
    expect(effectiveFriction(cal, 9).ff).toBe(16.4);
  });

  it('keeps separate measurements side by side', () => {
    let cal = recordFriction(DEFAULT_CALIBRATION, 3, 12.1, '2026-08-01');
    cal = recordFriction(cal, 9, 16.4, '2026-08-21');
    expect(effectiveFriction(cal, 3).ff).toBe(12.1);
    expect(effectiveFriction(cal, 9).ff).toBe(16.4);
  });

  it('overwrites a measurement for the same size', () => {
    let cal = recordFriction(DEFAULT_CALIBRATION, 6, 12, '2026-08-01');
    cal = recordFriction(cal, 6, 13.8, '2026-08-21');
    expect(effectiveFriction(cal, 6)).toEqual({ ff: 13.8, isEstimate: false, measuredAt: '2026-08-21' });
  });

  it('returns to the estimate when cleared', () => {
    const cal = recordFriction(DEFAULT_CALIBRATION, 6, 13.8, '2026-08-21');
    expect(effectiveFriction(clearFriction(cal, 6), 6).isEstimate).toBe(true);
  });

  it('treats calibration as immutable', () => {
    const before = structuredClone(DEFAULT_CALIBRATION);
    recordFriction(DEFAULT_CALIBRATION, 6, 13.8, '2026-08-21');
    expect(DEFAULT_CALIBRATION).toEqual(before);
  });

  it('clamps a recorded value into range', () => {
    const cal = recordFriction(DEFAULT_CALIBRATION, 6, -20, '2026-08-21');
    expect(effectiveFriction(cal, 6).ff).toBe(BOUNDS.frictionFactorF.min);
  });

  // The key is what the engine says the batch's mix size is — so these go
  // through `ballsPerMix`, the function the app actually looks up with.
  const key = (balls: number, ballWeightG = 265) => ballsPerMix({ balls, ballWeightG });

  it('reads the 6 entry for a 12-ball batch, and files a 12-ball bake under 6', () => {
    expect(key(12)).toBe(6);
    expect(effectiveFriction(DEFAULT_CALIBRATION, key(12))).toEqual(effectiveFriction(DEFAULT_CALIBRATION, 6));
    const cal = recordFriction(DEFAULT_CALIBRATION, key(12), 14.6, '2026-10-01');
    expect(effectiveFriction(cal, key(6)).ff).toBe(14.6);
    expect(Object.keys(cal.frictionFactors)).toEqual(['6']);
  });

  it('keys on the mix, so ball weight can move a batch to another entry', () => {
    // 9 balls is one mix at 265 g and two at 280 g.
    expect(key(9, 265)).toBe(9);
    expect(key(9, 280)).toBe(4.5);
  });

  it('matches a fractional mix size exactly and never interpolates', () => {
    // §6: 13 balls -> 6.5 falls back rather than borrowing from 6 or 7.
    let cal = recordFriction(DEFAULT_CALIBRATION, 7, 15.0, '2026-10-01');
    expect(key(13)).toBe(6.5);
    expect(effectiveFriction(cal, key(13))).toEqual({ ff: C.DEFAULT_FF, isEstimate: true });
    // A bake at 13 balls files under 6.5 and is found there next time.
    cal = recordFriction(cal, key(13), 14.4, '2026-10-02');
    expect(effectiveFriction(cal, key(13)).ff).toBe(14.4);
    expect(effectiveFriction(cal, 6).ff).toBe(14.03);
  });

  it('round-trips a fractional key through localStorage', () => {
    const storage = fakeStorage();
    const cal = recordFriction(DEFAULT_CALIBRATION, 20 / 3, 14.2, '2026-10-01');
    savePersisted(storage, { ...DEFAULT_PERSISTED, calibration: cal });
    const loaded = loadPersisted(storage).calibration;
    expect(effectiveFriction(loaded, key(20, 265)).ff).toBe(14.2);
    expect(key(20, 265)).toBe(20 / 3);
  });

  it('replaces the untouched 14.04 seed on load, and nothing else', () => {
    const stored = (entry: object) =>
      loadPersisted(
        fakeStorage({ [STORAGE_KEY]: JSON.stringify({ calibration: { frictionFactors: { 6: entry }, ddtOverrideF: null } }) }),
      ).calibration.frictionFactors[6];
    expect(stored({ ff: 14.04, measuredAt: '2026-08-21' })).toEqual({ ff: 14.03, measuredAt: '2026-08-21' });
    // Typed by the baker — same value on another day, or another value on the seed's day.
    expect(stored({ ff: 14.04, measuredAt: '2026-09-30' })).toEqual({ ff: 14.04, measuredAt: '2026-09-30' });
    expect(stored({ ff: 14.1, measuredAt: '2026-08-21' })).toEqual({ ff: 14.1, measuredAt: '2026-08-21' });
  });

  it('accepts exactly the keys a batch can produce', () => {
    for (const k of [3, 6, 6.5, 9.5, 20 / 3, 8, 10]) expect(isMixSizeKey(k), String(k)).toBe(true);
    for (const k of [0, -6, 99, 6.4, NaN, Infinity]) expect(isMixSizeKey(k), String(k)).toBe(false);
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
