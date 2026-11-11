/**
 * §13.2 and §13.3 (APP-6, MESSAGE-70): the topping ideas. What an idea needs
 * before it saves, the two lists and their order, storage, and the sync,
 * against the same fake repository shape as the bake log's.
 */
import { readFileSync } from 'node:fs';
import { parseAst } from 'vite';
import { describe, expect, it } from 'vitest';
import { formatRating } from '../src/lib/format';
import {
  EMPTY_DRAFT,
  RATINGS,
  canRate,
  ideaProblem,
  isRating,
  newIdeaId,
  savedIdea,
  starParts,
  testedIdeas,
  untestedIdeas,
  type ToppingIdea,
} from '../src/lib/toppings';
import { EMPTY_LOG, upsertBake } from '../src/state/bakeLogStore';
import { syncLog } from '../src/state/githubSync';
import { API, fromBase64, serializeRecord, toBase64, type FetchLike, type GitHubConfig } from '../src/state/repoSync';
import { DEFAULT_PERSISTED, inputsForNewBake } from '../src/state/defaults';
import { STORAGE_KEY, savePersisted, type StorageLike } from '../src/state/storage';
import { persistedForNewBake } from '../src/state/storedInputs';
import {
  EMPTY_TOPPINGS,
  TOPPINGS_KEY,
  loadToppings,
  mergeToppingsAfterSync,
  parseIdea,
  removeIdea,
  saveToppings,
  syncToppings,
  upsertIdea,
  type ToppingStore,
} from '../src/state/toppingsStore';
import { encodeInputs } from '../src/state/url';
import { currentFormulaSnapshot, type LoggedBake } from '../src/lib/bakeLog';

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');
const SECTION_13 = SPEC.slice(SPEC.indexOf('## 13. Tabs, and the topping ideas'));

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

const at = (iso: string) => new Date(iso);

function idea(id: string, overrides: Partial<ToppingIdea> = {}): ToppingIdea {
  return {
    id,
    name: `Idea ${id}`,
    pre_bake: 'San Marzano, fior di latte',
    post_bake: '',
    notes: '',
    rating: null,
    created: '2026-11-01T18:00:00.000Z',
    updated: '2026-11-01T18:00:00.000Z',
    ...overrides,
  };
}

describe('§13.2 what an idea needs', () => {
  it('rates from 1 to 5 in steps of 0.5, as §13.2 says', () => {
    expect(SECTION_13).toContain('| `rating` | number or `null` | 1 to 5 in steps of 0.5; `null` is untested |');
    expect(RATINGS).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    for (const r of [0.5, 5.5, 3.7, 0, -1, Number.NaN, '4']) expect(isRating(r), String(r)).toBe(false);
    expect(RATINGS.map(formatRating)).toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']);
    expect(starParts(3.5)).toEqual({ full: 3, half: true });
    expect(starParts(4)).toEqual({ full: 4, half: false });
  });

  it('saves an untested idea with only a name (Dave, 10 Nov 2026)', () => {
    expect(ideaProblem({ ...EMPTY_DRAFT, name: 'Hot honey' })).toBeNull();
    expect(ideaProblem(EMPTY_DRAFT)).toBe('name');
    expect(ideaProblem({ ...EMPTY_DRAFT, name: '   ', pre_bake: 'Tomato' })).toBe('name');
  });

  it('refuses a rating without the pre-bake toppings', () => {
    const named = { ...EMPTY_DRAFT, name: 'Hot honey' };
    expect(canRate(named)).toBe(false);
    expect(canRate({ ...named, pre_bake: ' \n ' })).toBe(false);
    expect(ideaProblem({ ...named, rating: 3.5 })).toBe('preBake');
    expect(canRate({ ...named, pre_bake: 'Tomato' })).toBe(true);
    expect(ideaProblem({ ...named, pre_bake: 'Tomato', rating: 3.5 })).toBeNull();
    // Post-bake and notes may be empty on a rated idea.
    expect(ideaProblem({ ...named, pre_bake: 'Tomato', post_bake: '', notes: '', rating: 1 })).toBeNull();
  });

  it('keeps the first save as created and stamps every save as updated', () => {
    const first = savedIdea({ ...EMPTY_DRAFT, name: '  Hot honey ' }, null, 'id-1', at('2026-11-10T20:00:00Z'));
    expect(first).toMatchObject({ id: 'id-1', name: 'Hot honey', rating: null, created: '2026-11-10T20:00:00.000Z' });
    const second = savedIdea({ ...first, pre_bake: 'Tomato\nMozzarella\n', rating: 3.5 }, first, 'ignored', at('2026-11-11T09:00:00Z'));
    expect(second).toMatchObject({
      id: 'id-1',
      pre_bake: 'Tomato\nMozzarella',
      rating: 3.5,
      created: '2026-11-10T20:00:00.000Z',
      updated: '2026-11-11T09:00:00.000Z',
    });
  });

  it('names a new idea by when it was saved, file-name safe', () => {
    expect(newIdeaId(new Date(2026, 10, 10, 21, 4, 5), 'a1f0')).toBe('2026-11-10-210405-a1f0');
    expect(parseIdea(idea(newIdeaId(new Date(), 'beef')))).not.toBeNull();
  });
});

describe('§13.2 the two lists', () => {
  const ideas = [
    idea('a', { rating: 3.5, updated: '2026-11-05T00:00:00Z' }),
    idea('b', { rating: 4.5, updated: '2026-11-01T00:00:00Z' }),
    idea('c', { rating: 3.5, updated: '2026-11-09T00:00:00Z' }),
    // d was written down first and edited last: newest first goes by when it was written down.
    idea('d', { created: '2026-11-02T00:00:00Z', updated: '2026-11-10T12:00:00Z' }),
    idea('e', { created: '2026-11-08T00:00:00Z', updated: '2026-11-08T00:00:00Z' }),
    idea('f', { rating: 1, updated: '2026-11-10T00:00:00Z' }),
  ];

  it('sorts Tested by rating, ties by the most recently updated', () => {
    expect(testedIdeas(ideas).map((i) => i.id)).toEqual(['b', 'c', 'a', 'f']);
  });

  it('sorts Untested newest first', () => {
    expect(untestedIdeas(ideas).map((i) => i.id)).toEqual(['e', 'd']);
  });

  it('moves an idea to Tested when rated, and back when the rating is cleared', () => {
    const d = ideas.find((i) => i.id === 'd')!;
    const rated = savedIdea({ ...d, rating: 5 }, d, d.id, at('2026-11-11T00:00:00Z'));
    const after = ideas.map((i) => (i.id === 'd' ? rated : i));
    expect(testedIdeas(after)[0]!.id).toBe('d');
    expect(untestedIdeas(after).map((i) => i.id)).toEqual(['e']);
    const cleared = savedIdea({ ...rated, rating: null }, rated, d.id, at('2026-11-12T00:00:00Z'));
    const back = after.map((i) => (i.id === 'd' ? cleared : i));
    expect(untestedIdeas(back).map((i) => i.id)).toEqual(['e', 'd']);
  });
});

describe('§13.3 the local copy', () => {
  it('keeps a 3.5 a 3.5 through storage', () => {
    const s = fakeStorage();
    const store = upsertIdea(EMPTY_TOPPINGS, idea('a', { rating: 3.5 }));
    saveToppings(s, store);
    expect(loadToppings(s)).toEqual(store);
    expect(loadToppings(s).items[0]!.rating).toBe(3.5);
  });

  it('has its own storage key, apart from the page and the log', () => {
    expect(TOPPINGS_KEY).not.toBe(STORAGE_KEY);
    expect(TOPPINGS_KEY).not.toBe('biga-calculator:log:v1');
  });

  it('drops a malformed idea rather than guess at it', () => {
    const good = idea('2026-11-10-210405-a1f0', { rating: 4 });
    const cases: unknown[] = [
      { ...good, id: '../../etc' },
      { ...good, name: '' },
      { ...good, name: 7 },
      { ...good, rating: 3.7 },
      { ...good, rating: 6 },
      { ...good, rating: '4' },
      { ...good, notes: ['a'] },
      { ...good, created: 'Sunday' },
      { ...good, updated: undefined },
    ];
    for (const c of cases) expect(parseIdea(c), JSON.stringify(c)).toBeNull();
    expect(parseIdea(good)).toEqual(good);
    // A text field left out reads as empty, and a rated idea without
    // pre-bake toppings is read as it is (only the editor asks for them).
    const { post_bake: _p, notes: _n, ...sparse } = good;
    expect(parseIdea(sparse)).toEqual({ ...good, post_bake: '', notes: '' });
    expect(parseIdea({ ...good, pre_bake: '' })).toMatchObject({ rating: 4, pre_bake: '' });
  });

  it('degrades to no ideas on garbage', () => {
    for (const raw of ['{{{', '[]', 'null', '"x"']) {
      const s = fakeStorage();
      s.setItem(TOPPINGS_KEY, raw);
      expect(loadToppings(s)).toEqual(EMPTY_TOPPINGS);
    }
  });

  it("is untouched by Reset, and a shared link carries none of it", () => {
    const s = fakeStorage();
    saveToppings(s, upsertIdea(EMPTY_TOPPINGS, idea('a')));
    const before = s.data.get(TOPPINGS_KEY);
    // Reset writes the page's state, whose fields name no idea.
    savePersisted(s, persistedForNewBake({ ...DEFAULT_PERSISTED, inputsQuery: 'balls=12' }));
    expect(s.data.get(TOPPINGS_KEY)).toBe(before);
    expect(Object.keys(DEFAULT_PERSISTED).some((k) => /topping|idea/i.test(k))).toBe(false);
    // A link is the inputs alone.
    const link = encodeInputs(inputsForNewBake());
    expect(link).not.toMatch(/topping|idea/i);
  });

  it('marks edits for the next sync, and deletes remotely only what was pushed', () => {
    let store = upsertIdea(EMPTY_TOPPINGS, idea('a'));
    expect(store.dirty).toEqual(['a']);
    store = removeIdea(store, 'a');
    expect(store).toMatchObject({ items: [], dirty: [], deleted: [] });
    store = { ...upsertIdea(EMPTY_TOPPINGS, idea('b')), shas: { b: 's1' }, dirty: [] };
    store = removeIdea(store, 'b');
    expect(store).toMatchObject({ items: [], deleted: ['b'], shas: {} });
  });
});

// ---------------------------------------------------------------------------
// Sync, against a fake repository holding both folders
// ---------------------------------------------------------------------------

const CFG: GitHubConfig = { owner: 'dave', repo: 'bake-log', token: 'good' };

function fakeGitHub(options: { failing?: 'toppings' | 'bakes' } = {}) {
  const files = new Map<string, { content: string; sha: string }>();
  let n = 0;
  const base = `${API}/repos/dave/bake-log`;
  const reply = (status: number, body: unknown = {}) =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
  const fetchFn: FetchLike = (url, init = {}) => {
    const method = init.method ?? 'GET';
    if (init.headers?.['Authorization'] !== 'Bearer good') return reply(401);
    if (!url.startsWith(base)) return reply(404);
    const path = url.slice(base.length);
    if (path === '') return reply(200, { full_name: 'dave/bake-log' });
    const dir = /^\/contents\/(\w+)/.exec(path)?.[1];
    if (dir && dir === options.failing) return reply(500);
    if (path === `/contents/${dir}`) {
      const entries = [...files.keys()]
        .filter((p) => p.startsWith(`${dir}/`))
        .map((p) => ({ type: 'file', name: p.slice(dir!.length + 1), sha: files.get(p)!.sha }));
      return entries.length ? reply(200, entries) : reply(404);
    }
    const file = path.replace('/contents/', '');
    const body = init.body ? (JSON.parse(init.body) as { content?: string; sha?: string; message?: string }) : {};
    if (method === 'GET') return files.has(file) ? reply(200, { ...files.get(file) }) : reply(404);
    if (method === 'PUT') {
      const current = files.get(file);
      if (current && body.sha !== current.sha) return reply(409);
      if (!current && body.sha) return reply(422);
      const sha = `sha${++n}`;
      files.set(file, { content: body.content!, sha });
      return reply(201, { content: { sha } });
    }
    if (method === 'DELETE') {
      if (!files.has(file)) return reply(404);
      files.delete(file);
      return reply(200);
    }
    return reply(405);
  };
  const read = (path: string) => JSON.parse(fromBase64(files.get(path)!.content)) as ToppingIdea;
  const put = (i: ToppingIdea) => files.set(`toppings/${i.id}.json`, { content: toBase64(serializeRecord(i)), sha: `ext${++n}` });
  return { fetchFn, files, read, put };
}

function bake(id: string): LoggedBake {
  return {
    bake_id: id,
    date: id.slice(0, 10),
    balls: 6,
    ball_g: 265,
    n_mix: 1,
    formula: currentFormulaSnapshot(),
    room_temp_f: 70,
    flour_temp_f: 69,
    flour_follows_room: false,
    mixes: [
      {
        mix_index: 1,
        biga_temp_at_mix_f: 58,
        bowl_temp_f: 58,
        bowl_prefilled: false,
        water_temp_used_f: 63,
        final_dough_temp_f: 73.5,
        phase_seconds: { a: 210, b: 480, c: 210, d: 52.5 },
        excluded: false,
      },
    ],
  };
}

describe('§13.3 sync through the bake log repository', () => {
  it('pushes an idea as one indented JSON file under toppings/', async () => {
    const gh = fakeGitHub();
    const a = idea('2026-11-10-210405-a1f0', { rating: 3.5 });
    const { store, error } = await syncToppings(CFG, upsertIdea(EMPTY_TOPPINGS, a), gh.fetchFn);
    expect(error).toBeUndefined();
    expect([...gh.files.keys()]).toEqual([`toppings/${a.id}.json`]);
    expect(gh.read(`toppings/${a.id}.json`)).toEqual(a);
    expect(fromBase64(gh.files.get(`toppings/${a.id}.json`)!.content)).toContain('\n  "rating": 3.5');
    expect(store).toMatchObject({ dirty: [], shas: { [a.id]: 'sha1' } });
  });

  it('brings an idea added in one browser to another', async () => {
    const gh = fakeGitHub();
    const phone = upsertIdea(EMPTY_TOPPINGS, idea('p', { name: 'Hot honey' }));
    await syncToppings(CFG, phone, gh.fetchFn);
    const { store: laptop } = await syncToppings(CFG, EMPTY_TOPPINGS, gh.fetchFn);
    expect(laptop.items.map((i) => i.name)).toEqual(['Hot honey']);
    expect(laptop.dirty).toEqual([]);
  });

  it('keeps the last write to an idea, by when it was saved, whichever device syncs last', async () => {
    const gh = fakeGitHub();
    const a = idea('a', { notes: 'first' });
    const { store: synced } = await syncToppings(CFG, upsertIdea(EMPTY_TOPPINGS, a), gh.fetchFn);
    // The laptop saves a later edit and syncs it.
    gh.put({ ...a, notes: 'laptop, later', updated: '2026-11-03T00:00:00.000Z' });
    // The phone saved an earlier edit offline, and syncs after.
    const phone = upsertIdea(synced, { ...a, notes: 'phone, earlier', updated: '2026-11-02T00:00:00.000Z' });
    const { store, error } = await syncToppings(CFG, phone, gh.fetchFn);
    expect(error).toBeUndefined();
    expect(gh.read('toppings/a.json').notes).toBe('laptop, later');
    expect(store.items[0]!.notes).toBe('laptop, later');
    expect(store.dirty).toEqual([]);

    // The other way round: the phone's edit is the later one, so it is pushed.
    gh.put({ ...a, notes: 'laptop, earlier', updated: '2026-11-04T00:00:00.000Z' });
    const later = upsertIdea(store, { ...a, notes: 'phone, later', updated: '2026-11-05T00:00:00.000Z' });
    const second = await syncToppings(CFG, later, gh.fetchFn);
    expect(gh.read('toppings/a.json').notes).toBe('phone, later');
    expect(second.store.items[0]!.notes).toBe('phone, later');
  });

  it('removes a deleted idea from the repository, and applies a deletion made elsewhere', async () => {
    const gh = fakeGitHub();
    let { store } = await syncToppings(CFG, upsertIdea(upsertIdea(EMPTY_TOPPINGS, idea('a')), idea('b')), gh.fetchFn);
    store = (await syncToppings(CFG, removeIdea(store, 'a'), gh.fetchFn)).store;
    expect([...gh.files.keys()]).toEqual(['toppings/b.json']);
    expect(store.deleted).toEqual([]);
    gh.files.delete('toppings/b.json');
    store = (await syncToppings(CFG, store, gh.fetchFn)).store;
    expect(store.items).toEqual([]);
  });

  it('leaves the bake log syncing when the toppings sync fails, and the reverse', async () => {
    const ideas = upsertIdea(EMPTY_TOPPINGS, idea('a'));
    const log = upsertBake(EMPTY_LOG, bake('2026-11-10-190000'));

    const toppingsDown = fakeGitHub({ failing: 'toppings' });
    const t1 = await syncToppings(CFG, ideas, toppingsDown.fetchFn);
    const l1 = await syncLog(CFG, log, toppingsDown.fetchFn);
    expect(t1.error?.kind).toBe('other');
    expect(t1.store.dirty).toEqual(['a']);
    expect(l1.error).toBeUndefined();
    expect([...toppingsDown.files.keys()]).toEqual(['bakes/2026-11-10-190000.json']);

    const bakesDown = fakeGitHub({ failing: 'bakes' });
    const l2 = await syncLog(CFG, log, bakesDown.fetchFn);
    const t2 = await syncToppings(CFG, ideas, bakesDown.fetchFn);
    expect(l2.error?.kind).toBe('other');
    expect(l2.log.dirty).toEqual(['2026-11-10-190000']);
    expect(t2.error).toBeUndefined();
    expect([...bakesDown.files.keys()]).toEqual(['toppings/a.json']);
  });

  it('says the ideas are safe on this device when GitHub is out of reach', async () => {
    const offline: FetchLike = () => Promise.reject(new TypeError('Failed to fetch'));
    const { store, error } = await syncToppings(CFG, upsertIdea(EMPTY_TOPPINGS, idea('a')), offline);
    expect(error?.kind).toBe('network');
    expect(error?.message).toBe("Couldn't reach GitHub. The ideas are saved on this device and will sync later.");
    expect(store.dirty).toEqual(['a']);
  });

  it('leaves a file that does not parse in the repository', async () => {
    const gh = fakeGitHub();
    gh.files.set('toppings/x.json', { content: toBase64('{"name": ""}'), sha: 'x' });
    const { store, error } = await syncToppings(CFG, EMPTY_TOPPINGS, gh.fetchFn);
    expect(error).toBeUndefined();
    expect(store.items).toEqual([]);
    expect(gh.files.size).toBe(1);
  });

  it('keeps an edit made while a sync ran', () => {
    const a = idea('a');
    const started: ToppingStore = { ...upsertIdea(EMPTY_TOPPINGS, a), dirty: [] };
    const synced: ToppingStore = { ...started, shas: { a: 's1' }, lastSyncedAt: 'now' };
    const current = upsertIdea(started, { ...a, rating: 2 });
    const merged = mergeToppingsAfterSync(current, started, synced);
    expect(merged.items[0]!.rating).toBe(2);
    expect(merged.dirty).toEqual(['a']);
    expect(merged.shas['a']).toBe('s1');
  });
});

describe("§13.2's rendered copy is the app's", () => {
  /** Every piece of copy the component carries: JSX text, string literals, templates with `{}` for each value. */
  function copyIn(file: string): Set<string> {
    const out = new Set<string>();
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const n = node as { type?: string; value?: unknown; quasis?: { value: { cooked: string } }[] };
      if (n.type === 'JSXText' && typeof n.value === 'string') {
        const t = n.value.replace(/\s+/g, ' ').trim();
        if (t) out.add(t);
      }
      if (n.type === 'Literal' && typeof n.value === 'string') out.add(n.value);
      if (n.type === 'TemplateLiteral' && n.quasis) out.add(n.quasis.map((q) => q.value.cooked).join('{}'));
      Object.values(node).forEach(visit);
    };
    visit(parseAst(readFileSync(file, 'utf8'), { lang: 'tsx' }));
    return out;
  }

  const block = SECTION_13.slice(SECTION_13.indexOf('**Rendered copy**'), SECTION_13.indexOf('### 13.3'));
  const phrases = [...block.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!).filter((p) => p !== 'Rendered copy');

  it('reads every phrase §13.2 words', () => {
    expect(phrases).toEqual([
      'Toppings',
      'Tested',
      'Untested',
      'Name',
      'Pre-bake',
      'Post-bake',
      'Notes',
      'Rating',
      'Add idea',
      'Save',
      'Delete',
      'Cancel',
      'Delete "{name}"?',
      'Delete',
      'Cancel',
      'Add the pre-bake toppings before rating it.',
    ]);
  });

  it('puts each one on the page in those words', async () => {
    const { TABS } = await import('../src/lib/tabs');
    const copy = copyIn('src/components/Toppings.tsx');
    for (const p of phrases) {
      if (p === 'Toppings') {
        expect(TABS.map((t) => t.label)).toContain(p);
        continue;
      }
      expect(copy.has(p.replace('{name}', '{}')), p).toBe(true);
    }
  });
});
