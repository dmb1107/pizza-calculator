/**
 * §6 *Where the inputs are kept* (MESSAGE-65): every input is stored in the
 * browser and written to the URL; storage brings a session back, the URL
 * shares it. The load rule's four cases, the round-trip through storage,
 * the codec's rules applied to a stored value, Reset, and bad stored data.
 *
 * Until MESSAGE-65 the inputs lived only in the URL, and a home-screen app
 * on iOS reopened at the address its icon was saved with: default inputs
 * beside the stored ticks and timers (Dave, 9 Nov 2026).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS, DEFAULT_PERSISTED, inputsForNewBake } from '../src/state/defaults';
import { STORAGE_KEY, loadPersisted, savePersisted, type StorageLike } from '../src/state/storage';
import {
  isStandalone,
  persistedForNewBake,
  resolveInitialInputs,
  storedInputsOf,
} from '../src/state/storedInputs';
import { encodeInputs, URL_KEYS } from '../src/state/url';
import type { Inputs, Persisted } from '../src/state/types';

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

/** Store a session the way the hook does, then reopen it: a fresh read of storage, then the load rule. */
function reopen(
  persisted: Persisted,
  { search = '', standalone = false }: { search?: string; standalone?: boolean } = {},
) {
  const s = fakeStorage();
  savePersisted(s, persisted);
  const loaded = loadPersisted(s);
  return resolveInitialInputs({ search, stored: loaded.inputsQuery, standalone });
}

const stored = (inputs: Inputs): Persisted => ({ ...DEFAULT_PERSISTED, inputsQuery: storedInputsOf(inputs) });

/**
 * One change away from the defaults for each input. Keyed by every input, so a
 * new input fails to compile until it has one; the walk below then checks
 * that the change survives storage. Some inputs need a companion to be
 * observable: a flour reading only means something with "Same as room" off,
 * and a second mix's readings need a batch that splits.
 */
const ONE_CHANGE = {
  balls: { balls: 9 },
  ballWeightG: { ballWeightG: 250 },
  coldFermentH: { coldFermentH: 48 },
  schedule: { schedule: 'classic', coldFermentH: 7 },
  roomTempF: { roomTempF: 66.5, flourTempF: 66.5 },
  flourSameAsRoom: { flourSameAsRoom: false },
  flourTempF: { flourSameAsRoom: false, flourTempF: 62 },
  bigaTempF: { balls: 12, bigaTempF: [57, 61.5] },
  bowlTempF: { balls: 12, bowlTempF: [72, 74.5] },
  bigaFridgeH: { bigaFridgeH: 18.5 },
  bigaRoomOnlyH: { bigaRoomOnlyH: 14 },
  temperH: { temperH: 1.75 },
  finalDoughTempF: { balls: 12, finalDoughTempF: [73.5, null] },
} satisfies Record<keyof Inputs, Partial<Inputs>>;

describe('§6 every input round-trips through storage', () => {
  it.each(Object.keys(DEFAULT_INPUTS) as (keyof Inputs)[])('%s', (key) => {
    const inputs: Inputs = { ...DEFAULT_INPUTS, ...ONE_CHANGE[key] };
    // The change is a change, so the walk can't pass on a default.
    expect(inputs[key]).not.toEqual(DEFAULT_INPUTS[key]);
    const back = reopen(stored(inputs));
    expect(back.source).toBe('stored');
    expect(back.inputs).toEqual(inputs);
  });

  it('every input the URL codec carries is walked', () => {
    expect(Object.keys(ONE_CHANGE).sort()).toEqual(Object.keys(URL_KEYS).sort());
  });

  it('a whole mid-bake session, every input moved at once', () => {
    const midBake: Inputs = {
      balls: 12,
      ballWeightG: 250,
      coldFermentH: 48,
      schedule: 'retarded',
      roomTempF: 68,
      flourSameAsRoom: false,
      flourTempF: 64.5,
      bigaTempF: [59, 62],
      bowlTempF: [69, null],
      bigaFridgeH: 20,
      bigaRoomOnlyH: 17,
      temperH: 2,
      finalDoughTempF: [74.2, null],
    };
    expect(reopen(stored(midBake)).inputs).toEqual(midBake);
    // MESSAGE-65's "done when", as far as storage goes: from the home-screen
    // icon, whatever address it was saved with.
    expect(reopen(stored(midBake), { standalone: true, search: '?balls=6' }).inputs).toEqual(midBake);
  });
});

describe('§6 the load rule, case by case', () => {
  const STORED: Inputs = { ...DEFAULT_INPUTS, balls: 12, ballWeightG: 250, coldFermentH: 48, roomTempF: 67, flourTempF: 67 };
  const LINK = '?balls=9&ball=270&room=72';
  const LINKED: Inputs = { ...DEFAULT_INPUTS, balls: 9, ballWeightG: 270, roomTempF: 72, flourTempF: 72 };

  it.each([
    // [page, URL, stored, loads, source]
    ['browser', LINK, STORED, LINKED, 'link'],
    ['browser', '', STORED, STORED, 'stored'],
    ['browser', '', null, DEFAULT_INPUTS, 'defaults'],
    ['home-screen app', LINK, STORED, STORED, 'stored-standalone'],
    ['home-screen app', LINK, null, LINKED, 'link'],
    ['home-screen app', '', null, DEFAULT_INPUTS, 'defaults'],
    ['home-screen app', '', STORED, STORED, 'stored-standalone'],
  ] as const)('%s, URL "%s"', (page, search, storedInputs, loads, source) => {
    const got = resolveInitialInputs({
      search,
      stored: storedInputs === null ? null : storedInputsOf(storedInputs),
      standalone: page === 'home-screen app',
    });
    expect(got.inputs).toEqual(loads);
    expect(got.source).toBe(source);
  });

  it('a link is a whole setup: a key it leaves out takes its default, never the stored value', () => {
    const got = resolveInitialInputs({ search: '?balls=9', stored: storedInputsOf(STORED), standalone: false });
    expect(got.inputs.ballWeightG).toBe(DEFAULT_INPUTS.ballWeightG);
    expect(got.inputs.coldFermentH).toBe(DEFAULT_INPUTS.coldFermentH);
    expect(got.inputs.roomTempF).toBe(DEFAULT_INPUTS.roomTempF);
  });

  it('a query string with no input key is a bare URL', () => {
    const got = resolveInitialInputs({ search: '?utm_source=x', stored: storedInputsOf(STORED), standalone: false });
    expect(got).toMatchObject({ inputs: STORED, source: 'stored' });
  });

  it('stored defaults are stored inputs: a home-screen app with them ignores its launch URL', () => {
    // '' is every input at its default, which differs from nothing stored.
    const got = resolveInitialInputs({ search: LINK, stored: storedInputsOf(DEFAULT_INPUTS), standalone: true });
    expect(storedInputsOf(DEFAULT_INPUTS)).toBe('');
    expect(got).toMatchObject({ inputs: DEFAULT_INPUTS, source: 'stored-standalone' });
  });

  it('a link replaces the stored inputs at once: what the hook stores on load is the link’s', () => {
    // The hook stores `storedInputsOf(inputs)` on its first pass when it
    // differs from what was read; this is the value it compares.
    const got = resolveInitialInputs({ search: LINK, stored: storedInputsOf(STORED), standalone: false });
    expect(storedInputsOf(got.inputs)).toBe(encodeInputs(LINKED));
    expect(storedInputsOf(got.inputs)).not.toBe(storedInputsOf(STORED));
  });
});

describe('§6 stored inputs are read by the same rules as a link’s', () => {
  it('19 balls at 265 g loads as 21 (the even split), and says what was asked for', () => {
    const got = resolveInitialInputs({ search: '', stored: 'balls=19&ball=265', standalone: true });
    expect(got.inputs.balls).toBe(21);
    expect(got.ballsAskedFor).toBe(19);
  });

  it('a 30 h cold ferment stored on the classic track loads as 8', () => {
    const got = resolveInitialInputs({ search: '', stored: 'sched=c&cold=30', standalone: false });
    expect(got.inputs).toMatchObject({ schedule: 'classic', coldFermentH: 8 });
  });

  it('a temper outside 1.5–2 h clamps', () => {
    expect(resolveInitialInputs({ search: '', stored: 'temper=3', standalone: false }).inputs.temperH).toBe(2);
  });

  it('the retired keys are ignored: bowlst, water, a bowl mass', () => {
    const got = resolveInitialInputs({
      search: '',
      stored: 'bowlst=cold&water=81.3&bowl=965&bowlg=965',
      standalone: false,
    });
    expect(got.inputs).toEqual(DEFAULT_INPUTS);
  });
});

describe('§10 Reset, then a reload', () => {
  it('the readings come back at their defaults and the batch settings as they were', () => {
    const before: Inputs = {
      ...DEFAULT_INPUTS,
      balls: 12,
      ballWeightG: 250,
      coldFermentH: 48,
      bigaFridgeH: 18.5,
      roomTempF: 66,
      flourSameAsRoom: false,
      flourTempF: 61,
      bigaTempF: [57, 60],
      bowlTempF: [70, 73],
      finalDoughTempF: [74, 75.5],
    };
    const afterReset = persistedForNewBake(stored(before));
    for (const standalone of [false, true]) {
      const back = reopen(afterReset, { standalone }).inputs;
      expect(back).toEqual(inputsForNewBake(before));
      expect(back).toMatchObject({
        balls: 12,
        ballWeightG: 250,
        coldFermentH: 48,
        bigaFridgeH: 18.5,
        roomTempF: DEFAULT_INPUTS.roomTempF,
        flourSameAsRoom: DEFAULT_INPUTS.flourSameAsRoom,
        bigaTempF: DEFAULT_INPUTS.bigaTempF,
        bowlTempF: DEFAULT_INPUTS.bowlTempF,
        finalDoughTempF: DEFAULT_INPUTS.finalDoughTempF,
      });
    }
  });

  it('nothing stored stays nothing stored', () => {
    expect(persistedForNewBake(DEFAULT_PERSISTED).inputsQuery).toBeNull();
  });
});

describe('§6 a stored value that doesn’t parse takes its default and never blocks the page', () => {
  it.each([
    ['storage that isn’t JSON', '{{{'],
    ['inputs that aren’t a string', JSON.stringify({ inputsQuery: 42 })],
    ['inputs that are an object', JSON.stringify({ inputsQuery: { balls: 12 } })],
    ['keys whose values don’t parse', JSON.stringify({ inputsQuery: 'balls=abc&ball=&cold=NaN&sched=x&biga=a~b&dought=~~&room=Infinity' })],
    ['a string that isn’t a query', JSON.stringify({ inputsQuery: '%%%&&==\u0000' })],
  ])('%s', (_label, raw) => {
    for (const standalone of [false, true]) {
      const run = () => {
        const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: raw }));
        return resolveInitialInputs({ search: '', stored: loaded.inputsQuery, standalone });
      };
      expect(run).not.toThrow();
      // A garbled per-mix list keeps its length and takes the default entry
      // by entry (`a~b` is two bigas at 58, `~~` three unread mixes), as a
      // link's does; every value is still a default.
      const { bigaTempF, bowlTempF, finalDoughTempF, ...rest } = run().inputs;
      const { bigaTempF: b0, bowlTempF: w0, finalDoughTempF: f0, ...restDefault } = DEFAULT_INPUTS;
      expect(rest).toEqual(restDefault);
      expect(bigaTempF.every((v) => v === b0[0])).toBe(true);
      expect(bowlTempF.every((v) => v === w0[0])).toBe(true);
      expect(finalDoughTempF.every((v) => v === f0[0])).toBe(true);
    }
  });

  it('inputs that aren’t a string are stored defaults, not nothing stored', () => {
    // So a home-screen app doesn't fall through to its launch URL.
    const loaded = loadPersisted(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ inputsQuery: 42 }) }));
    expect(loaded.inputsQuery).toBe('');
    expect(loadPersisted(fakeStorage({ [STORAGE_KEY]: '{}' })).inputsQuery).toBeNull();
  });
});

describe('§6 isStandalone', () => {
  const noMatch = () => ({ matches: false });
  it.each([
    ['iOS navigator.standalone', { navigator: { standalone: true }, matchMedia: noMatch }, true],
    ['display-mode: standalone', { navigator: {}, matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' }) }, true],
    ['a browser tab', { navigator: { standalone: false }, matchMedia: noMatch }, false],
    ['no navigator or matchMedia (Node)', {}, false],
    ['a matchMedia that throws', { navigator: {}, matchMedia: () => { throw new Error('blocked'); } }, false],
  ])('%s', (_label, env, want) => {
    expect(isStandalone(env)).toBe(want);
  });
});
