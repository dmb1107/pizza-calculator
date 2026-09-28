import { describe, expect, it } from 'vitest';
import { MIX_PHASES, currentFormulaSnapshot, mixStatus, type LoggedBake } from '../src/lib/bakeLog';
import { calculate } from '../src/lib/engine';
import {
  EMPTY_LOG,
  GITHUB_KEY,
  LOG_KEY,
  loadGitHubConfig,
  loadLog,
  parseBake,
  parseRepoName,
  removeBake,
  saveGitHubConfig,
  saveLog,
  setMixExcluded,
  upsertBake,
  type GitHubConfig,
  type LocalLog,
} from '../src/state/bakeLogStore';
import { API, fromBase64, mergeAfterSync, serializeBake, syncLog, toBase64, type FetchLike } from '../src/state/githubSync';
import {
  firstMixStartedAt,
  localDate,
  newBakeId,
  phaseSeconds,
  runningPhases,
  saveConflict,
  sessionBake,
} from '../src/state/sessionBake';
import { DEFAULT_INPUTS } from '../src/state/defaults';
import { decodeInputs } from '../src/state/url';
import type { StorageLike } from '../src/state/storage';
import type { Inputs, RunningTimer } from '../src/state/types';

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function bake(id: string, overrides: Partial<LoggedBake> = {}): LoggedBake {
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
        bowl_state: 'cold',
        bowl_temp_f: 58,
        bowl_prefilled: false,
        water_temp_used_f: 63,
        final_dough_temp_f: 73.5,
        phase_seconds: { a: 210, b: 330, c: 210, d: 52.5 },
        excluded: false,
      },
    ],
    ...overrides,
  };
}

describe('the local log', () => {
  it('round-trips through storage', () => {
    const s = fakeStorage();
    const log = upsertBake(EMPTY_LOG, bake('2026-09-28-120000'));
    saveLog(s, log);
    expect(loadLog(s)).toEqual(log);
  });

  it('drops a malformed bake rather than solving it', () => {
    const good = bake('2026-09-28-120000');
    const cases: unknown[] = [
      { ...good, bake_id: '../../etc' },
      { ...good, date: 'Sunday' },
      { ...good, balls: 'six' },
      { ...good, mixes: [] },
      { ...good, mixes: [{ ...good.mixes[0], bowl_state: 'hot' }] },
      { ...good, room_temp_f: '70' },
      { ...good, formula: { ...good.formula, hydration: '70%' } },
      // The shape an earlier build stored: a reading with an "entered" flag.
      { ...good, room_temp_f: { value: 70, entered: true } },
      { ...good, mixes: [{ ...good.mixes[0], bowl_prefilled: undefined }] },
      { ...good, mixes: [{ ...good.mixes[0], final_dough_temp_f: 'hot' }] },
    ];
    for (const c of cases) expect(parseBake(c)).toBeNull();
    expect(parseBake(good)).toEqual(good);
    const s = fakeStorage();
    s.setItem(LOG_KEY, JSON.stringify({ bakes: [good, ...cases] }));
    expect(loadLog(s).bakes).toEqual([good]);
  });

  it('keeps a reading with no value as null', () => {
    const b = bake('2026-09-28-120000');
    const raw = { ...b, mixes: [{ ...b.mixes[0], water_temp_used_f: null, final_dough_temp_f: null }] };
    expect(parseBake(raw)!.mixes[0]).toMatchObject({ water_temp_used_f: null, final_dough_temp_f: null });
  });

  it('reads a phase time that is not a positive number as not captured', () => {
    const b = bake('2026-09-28-120000');
    const raw = { ...b, mixes: [{ ...b.mixes[0], phase_seconds: { a: 0, b: -3, c: 'x', d: 50 } }] };
    expect(parseBake(raw)!.mixes[0]!.phase_seconds).toEqual({ a: null, b: null, c: null, d: 50 });
  });

  it('degrades to an empty log on garbage', () => {
    for (const raw of ['{{{', '[]', 'null', '"x"']) {
      const s = fakeStorage();
      s.setItem(LOG_KEY, raw);
      expect(loadLog(s)).toEqual(EMPTY_LOG);
    }
  });

  it('marks edits for the next sync, and deletes remotely only what was pushed', () => {
    let log = upsertBake(EMPTY_LOG, bake('a-1'));
    expect(log.dirty).toEqual(['a-1']);
    log = removeBake(log, 'a-1');
    expect(log).toMatchObject({ bakes: [], dirty: [], deleted: [] });

    log = { ...upsertBake(EMPTY_LOG, bake('a-2')), dirty: [], shas: { 'a-2': 'sha' } };
    log = setMixExcluded(log, 'a-2', 1, true);
    expect(log.dirty).toEqual(['a-2']);
    expect(log.bakes[0]!.mixes[0]!.excluded).toBe(true);
    log = removeBake(log, 'a-2');
    expect(log).toMatchObject({ bakes: [], dirty: [], deleted: ['a-2'], shas: {} });
  });
});

describe('the repository and token', () => {
  it('reads a repository name as GitHub prints it, or its URL', () => {
    expect(parseRepoName('dave/bake-log')).toEqual({ owner: 'dave', repo: 'bake-log' });
    expect(parseRepoName(' https://github.com/dave/bake-log.git ')).toEqual({ owner: 'dave', repo: 'bake-log' });
    expect(parseRepoName('bake-log')).toBeNull();
    expect(parseRepoName('dave/bake log')).toBeNull();
  });

  it('keeps the token per device, and forgets it', () => {
    const s = fakeStorage();
    expect(loadGitHubConfig(s)).toBeNull();
    saveGitHubConfig(s, { owner: 'dave', repo: 'log', token: 't' });
    expect(loadGitHubConfig(s)).toEqual({ owner: 'dave', repo: 'log', token: 't' });
    saveGitHubConfig(s, null);
    expect(s.data.has(GITHUB_KEY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sync, against a fake repository
// ---------------------------------------------------------------------------

const CFG: GitHubConfig = { owner: 'dave', repo: 'bake-log', token: 'good' };

function fakeGitHub() {
  const files = new Map<string, { content: string; sha: string }>();
  let n = 0;
  const calls: string[] = [];
  const base = `${API}/repos/dave/bake-log`;
  const reply = (status: number, body: unknown = {}) =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

  const fetchFn: FetchLike = (url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push(`${method} ${url.replace(base, '')}`);
    if (init.headers?.['Authorization'] !== 'Bearer good') return reply(401);
    if (!url.startsWith(base)) return reply(404);
    const path = url.slice(base.length);
    if (path === '') return reply(200, { full_name: 'dave/bake-log' });
    if (path === '/contents/bakes') {
      const entries = [...files.keys()].map((p) => ({ type: 'file', name: p.slice('bakes/'.length), sha: files.get(p)!.sha }));
      return entries.length ? reply(200, entries) : reply(404);
    }
    const file = path.replace('/contents/', '');
    const body = init.body ? (JSON.parse(init.body) as { content?: string; sha?: string }) : {};
    if (method === 'GET') return files.has(file) ? reply(200, { ...files.get(file), content: files.get(file)!.content }) : reply(404);
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
  const put = (b: LoggedBake) => files.set(`bakes/${b.bake_id}.json`, { content: toBase64(serializeBake(b)), sha: `ext${++n}` });
  return { fetchFn, files, calls, put };
}

describe('sync with a private repository', () => {
  it('pushes a new bake as one indented JSON file under bakes/', async () => {
    const gh = fakeGitHub();
    const b = bake('2026-09-28-120000');
    const { log, error } = await syncLog(CFG, upsertBake(EMPTY_LOG, b), gh.fetchFn);
    expect(error).toBeUndefined();
    const file = gh.files.get('bakes/2026-09-28-120000.json')!;
    expect(JSON.parse(fromBase64(file.content))).toEqual(b);
    expect(fromBase64(file.content)).toContain('\n  "bake_id"');
    expect(log).toMatchObject({ dirty: [], shas: { '2026-09-28-120000': file.sha } });
    expect(log.lastSyncedAt).not.toBe('');
  });

  it('pulls a bake logged on the other device', async () => {
    const gh = fakeGitHub();
    const other = bake('2026-09-27-090000');
    gh.put(other);
    const { log } = await syncLog(CFG, EMPTY_LOG, gh.fetchFn);
    expect(log.bakes).toEqual([other]);
    expect(log.dirty).toEqual([]);
  });

  it('round-trips non-ASCII text through base64', () => {
    const text = 'Phase A — 60 °F ✓';
    expect(fromBase64(toBase64(text))).toBe(text);
  });

  it('writes an edit over the version it last saw, and a stale one over the current', async () => {
    const gh = fakeGitHub();
    const b = bake('2026-09-28-120000');
    let { log } = await syncLog(CFG, upsertBake(EMPTY_LOG, b), gh.fetchFn);
    // The other device edits it meanwhile, so our sha is stale.
    gh.put(setMixExcluded(log, b.bake_id, 1, true).bakes[0]!);
    log = setMixExcluded({ ...log, shas: { ...log.shas } }, b.bake_id, 1, false);
    const result = await syncLog(CFG, log, gh.fetchFn);
    expect(result.error).toBeUndefined();
    const saved = JSON.parse(fromBase64(gh.files.get(`bakes/${b.bake_id}.json`)!.content)) as LoggedBake;
    // The device pushing last wins.
    expect(saved.mixes[0]!.excluded).toBe(false);
  });

  it('deletes a pushed bake from the repository, and applies a deletion made elsewhere', async () => {
    const gh = fakeGitHub();
    const a = bake('2026-09-28-120000');
    const b = bake('2026-09-29-120000');
    let { log } = await syncLog(CFG, upsertBake(upsertBake(EMPTY_LOG, a), b), gh.fetchFn);
    log = (await syncLog(CFG, removeBake(log, a.bake_id), gh.fetchFn)).log;
    expect([...gh.files.keys()]).toEqual([`bakes/${b.bake_id}.json`]);
    expect(log.deleted).toEqual([]);
    // Deleted on the other device.
    gh.files.clear();
    log = (await syncLog(CFG, log, gh.fetchFn)).log;
    expect(log.bakes).toEqual([]);
  });

  it('leaves the log intact and says what to fix when the token is refused', async () => {
    const gh = fakeGitHub();
    const start = upsertBake(EMPTY_LOG, bake('2026-09-28-120000'));
    const { log, error } = await syncLog({ ...CFG, token: 'bad' }, start, gh.fetchFn);
    expect(error?.kind).toBe('auth');
    expect(log.bakes).toEqual(start.bakes);
    expect(log.dirty).toEqual(start.dirty);
  });

  it('treats an unreachable repository as a repository error, not an empty log', async () => {
    const gh = fakeGitHub();
    const { error } = await syncLog({ ...CFG, repo: 'other' }, EMPTY_LOG, gh.fetchFn);
    expect(error?.kind).toBe('repo');
  });

  it('keeps working offline: a failed request leaves every change marked', async () => {
    const offline: FetchLike = () => Promise.reject(new TypeError('Failed to fetch'));
    const start = upsertBake(EMPTY_LOG, bake('2026-09-28-120000'));
    const { log, error } = await syncLog(CFG, start, offline);
    expect(error?.kind).toBe('network');
    expect(log.dirty).toEqual(['2026-09-28-120000']);
  });

  it('skips a file that does not parse, and leaves it in the repository', async () => {
    const gh = fakeGitHub();
    gh.files.set('bakes/2026-09-28-120000.json', { content: toBase64('{"not": "a bake"}'), sha: 'x' });
    const { log, error } = await syncLog(CFG, EMPTY_LOG, gh.fetchFn);
    expect(error).toBeUndefined();
    expect(log.bakes).toEqual([]);
    expect(gh.files.size).toBe(1);
  });

  it('keeps an edit made while a sync ran', () => {
    const a = bake('2026-09-28-120000');
    const started: LocalLog = { ...upsertBake(EMPTY_LOG, a), dirty: [] };
    const synced: LocalLog = { ...started, shas: { [a.bake_id]: 's1' }, lastSyncedAt: 'now' };
    const b = bake('2026-09-29-120000');
    const current = setMixExcluded(upsertBake(started, b), a.bake_id, 1, true);
    const merged = mergeAfterSync(current, started, synced);
    expect(merged.bakes.map((x) => x.bake_id).sort()).toEqual([a.bake_id, b.bake_id]);
    expect(merged.bakes.find((x) => x.bake_id === a.bake_id)!.mixes[0]!.excluded).toBe(true);
    expect(merged.dirty.sort()).toEqual([a.bake_id, b.bake_id]);
    expect(merged.shas[a.bake_id]).toBe('s1');
  });

  it('deletes remotely a bake removed here while the sync was pushing it', () => {
    const a = bake('2026-09-28-120000');
    const started = upsertBake(EMPTY_LOG, a);
    const synced: LocalLog = { ...started, dirty: [], shas: { [a.bake_id]: 's1' } };
    const current = removeBake(started, a.bake_id);
    const merged = mergeAfterSync(current, started, synced);
    expect(merged).toMatchObject({ bakes: [], deleted: [a.bake_id], shas: {} });
  });
});

// ---------------------------------------------------------------------------
// The session as a bake
// ---------------------------------------------------------------------------

describe('the session as a bake (§10)', () => {
  const NOW = new Date(2026, 8, 28, 19, 30, 5);
  const START = NOW.getTime() - 30 * 60_000;

  /** Timers for each phase of each mix, stopped at the reference times. */
  const phaseTimers = (nMix: number, from = START): RunningTimer[] =>
    Array.from({ length: nMix }, (_, i) =>
      MIX_PHASES.map((p) => ({
        stepId: nMix === 1 ? p.stepId : `${p.stepId}#${i + 1}`,
        startedAt: from,
        minMinutes: p.rangeMin[0],
        maxMinutes: p.rangeMin[1],
        stoppedAt: from + p.referenceMin * 60_000,
      })),
    ).flat();

  const session = (inputs: Inputs, timers = phaseTimers(1)) => {
    const result = calculate({ ...inputs, frictionFactorF: 14.03, flourTempF: inputs.flourTempF });
    return sessionBake({ inputs, result, timers }, NOW, newBakeId(NOW));
  };

  const measured: Inputs = {
    ...DEFAULT_INPUTS,
    bowlTempF: [57],
    waterUsedF: [63],
    finalDoughTempF: [73.5],
  };

  it('names the bake by the local date and time it was saved', () => {
    expect(newBakeId(NOW)).toBe('2026-09-28-193005');
    expect(localDate(NOW)).toBe('2026-09-28');
  });

  it('records the inputs as they stand, and a measured session counts', () => {
    const b = session(measured);
    expect(b).toMatchObject({
      date: '2026-09-28',
      balls: 6,
      ball_g: 265,
      n_mix: 1,
      room_temp_f: 70,
      flour_temp_f: 70,
      flour_follows_room: true,
    });
    expect(b.mixes[0]).toMatchObject({ biga_temp_at_mix_f: 58, bowl_temp_f: 57, bowl_prefilled: false, water_temp_used_f: 63, final_dough_temp_f: 73.5 });
    expect(b.mixes[0]!.phase_seconds).toEqual({ a: 210, b: 330, c: 210, d: 52.5 });
    expect(mixStatus(b, b.mixes[0]!)).toMatchObject({ counted: true, reasons: [] });
  });

  it("counts defaults left in place, and values that arrived in a link (Dave's call, MESSAGE-47)", () => {
    // Room 70 and biga 58 are the defaults; a bowl in the link is a reading.
    const linked = decodeInputs('bowlt=57&water=63&dought=73.5');
    const b = session(linked);
    expect(b.room_temp_f).toBe(DEFAULT_INPUTS.roomTempF);
    expect(b.mixes[0]!.biga_temp_at_mix_f).toBe(DEFAULT_INPUTS.bigaTempF[0]);
    expect(mixStatus(b, b.mixes[0]!).counted).toBe(true);
  });

  it('records a bowl prefill as a prefill, a missing water or final as null', () => {
    const b = session({ ...measured, bowlTempF: [null], waterUsedF: [null], finalDoughTempF: [null] });
    expect(b.mixes[0]).toMatchObject({ bowl_temp_f: 58, bowl_prefilled: true, water_temp_used_f: null, final_dough_temp_f: null });
    expect(mixStatus(b, b.mixes[0]!).reasons).toEqual(['final', 'water', 'bowl']);
  });

  it("reads mix 2's bowl by index: mix 1's reading doesn't make mix 2's a measurement", () => {
    const b = session(
      { ...measured, balls: 12, bowlTempF: [57], waterUsedF: [63, 60], finalDoughTempF: [73, 75] },
      phaseTimers(2),
    );
    expect(b.mixes.map((m) => m.bowl_prefilled)).toEqual([false, true]);
  });

  it('dates a bake by the day its first mix started, so a split batch past midnight stays on one day', () => {
    const lateStart = new Date(2026, 8, 27, 23, 50).getTime();
    const b = session(
      { ...measured, balls: 12, bowlTempF: [57, 72], waterUsedF: [63, 60], finalDoughTempF: [73, 75] },
      phaseTimers(2, lateStart),
    );
    expect(b.date).toBe('2026-09-27');
    // Before Phase A's timer has started, the day it is saved.
    expect(session(measured, []).date).toBe('2026-09-28');
    expect(firstMixStartedAt(phaseTimers(2, lateStart), 2)).toBe(lateStart);
  });

  it('asks before saving over a bake from an earlier date', () => {
    const draft = session(measured);
    const earlier = { ...draft, bake_id: '2026-09-20-190000', date: '2026-09-20' };
    const log = upsertBake(EMPTY_LOG, earlier);
    expect(saveConflict(log, earlier.bake_id, draft)).toBe(earlier);
    // The same day's bake is this one: saving again replaces it.
    const sameDay = { ...draft, bake_id: '2026-09-28-120000' };
    expect(saveConflict(upsertBake(EMPTY_LOG, sameDay), sameDay.bake_id, draft)).toBeNull();
    // Nothing saved since the Reset, or the saved bake deleted.
    expect(saveConflict(log, '', draft)).toBeNull();
    expect(saveConflict(EMPTY_LOG, earlier.bake_id, draft)).toBeNull();
  });

  it('reads phase times by instance, and treats a running phase as not captured', () => {
    const timers = phaseTimers(2);
    const running = timers.map((t) => (t.stepId === 'mix-5#2' ? { ...t, stoppedAt: undefined } : t));
    expect(phaseSeconds(running, 'mix-5', 1, 2)).toBe(210);
    expect(phaseSeconds(running, 'mix-5', 2, 2)).toBeNull();
    expect(runningPhases(running, 2, 2)).toEqual(['c']);
    const b = session(
      { ...measured, balls: 12, bowlTempF: [57, 72], waterUsedF: [63, 60], finalDoughTempF: [73, 75], bigaTempF: [58, 59] },
      running,
    );
    expect(b.n_mix).toBe(2);
    expect(b.mixes.map((m) => mixStatus(b, m).reasons)).toEqual([[], ['phases']]);
  });

  it("carries mix 1's biga forward to mix 2 until re-read (§6)", () => {
    const b = session(
      { ...measured, balls: 12, bowlTempF: [57, 72], waterUsedF: [63, 60], finalDoughTempF: [73, 75] },
      phaseTimers(2),
    );
    expect(b.mixes[1]!.biga_temp_at_mix_f).toBe(58);
  });
});
