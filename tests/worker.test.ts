/**
 * The Worker's routes — WEBSITE-SPEC §14, MESSAGE-75 §6 tests 2, 3, 4 and 5.
 *
 * `handleApi` runs here as it runs in the Durable Object, against an
 * in-memory store, a fake GitHub that records every call, and a clock the
 * tests move. The passkeys are `FakeAuthenticator`'s real ES256 signatures.
 */

import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_MS,
  MAX_CHALLENGES,
  RENEW_AFTER_MS,
  SESSION_COOKIE,
  SESSION_MS,
  SETUP_TRIES,
  SETUP_WINDOW_MS,
  allowedGitHubPath,
  handleApi,
  sameSecret,
  type ApiDeps,
  type KvStore,
} from '../worker/app';
import { FakeAuthenticator } from './fakeAuthenticator';

const ORIGIN = 'https://pizza.dave-becker.com';
const TOKEN = 'github_pat_TEST_ONLY_not_a_real_token_0123456789';
const SETUP = 'correct horse battery staple';
const BLOB = 'a'.repeat(40);

class MemoryStore implements KvStore {
  readonly data = new Map<string, unknown>();
  async get<T>(key: string) {
    return this.data.has(key) ? (structuredClone(this.data.get(key)) as T) : undefined;
  }
  async put<T>(key: string, value: T) {
    this.data.set(key, structuredClone(value));
  }
  async delete(key: string) {
    return this.data.delete(key);
  }
  async list<T>({ prefix }: { prefix: string }) {
    const out = new Map<string, T>();
    for (const [k, v] of [...this.data].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (k.startsWith(prefix)) out.set(k, structuredClone(v) as T);
    }
    return out;
  }
}

interface GitHubCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function harness(over: Partial<ApiDeps> = {}) {
  let now = Date.UTC(2026, 10, 12, 18, 0, 0);
  const calls: GitHubCall[] = [];
  let answer: () => Response = () =>
    new Response(
      JSON.stringify([
        {
          name: '2026-11-01.json',
          sha: 'b'.repeat(40),
          type: 'file',
          download_url: 'https://raw.githubusercontent.com/dmb1107/pizza-bake-log/main/bakes/2026-11-01.json?token=TEMPREAD',
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  const store = new MemoryStore();
  const deps: ApiDeps = {
    store,
    githubFetch: async (url, init) => {
      calls.push({
        url,
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
        ...(typeof init.body === 'string' ? { body: init.body } : {}),
      });
      return answer();
    },
    now: () => now,
    githubToken: TOKEN,
    setupCode: SETUP,
    owner: 'dmb1107',
    repo: 'pizza-bake-log',
    ...over,
  };
  let cookie: string | null = null;

  /** Sends a request as the page at ORIGIN would, carrying its cookie. */
  async function send(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extra };
    if (method !== 'GET' && !('Origin' in extra)) headers['Origin'] = ORIGIN;
    if (cookie && !('Cookie' in extra)) headers['Cookie'] = `${SESSION_COOKIE}=${cookie}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const url = /^https?:/.test(path) ? path : `${ORIGIN}${path}`;
    const res = await handleApi(
      new Request(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }),
      deps,
    );
    const set = res.headers.get('Set-Cookie');
    if (set) {
      const m = new RegExp(`${SESSION_COOKIE}=([^;]*)`).exec(set);
      cookie = m && m[1] ? m[1] : null;
    }
    return res;
  }

  async function createPasskey(auth = new FakeAuthenticator(), code = SETUP) {
    const opts = await send('POST', '/api/passkey/register/options', { setupCode: code });
    expect(opts.status).toBe(200);
    const response = await auth.create(await opts.json(), ORIGIN);
    return send('POST', '/api/passkey/register/verify', { response });
  }

  async function signIn(auth: FakeAuthenticator, origin = ORIGIN, rpID?: string) {
    const opts = await send('POST', '/api/passkey/login/options');
    expect(opts.status).toBe(200);
    const response = await auth.get(await opts.json(), origin, rpID);
    return send('POST', '/api/passkey/login/verify', { response });
  }

  return {
    deps,
    store,
    calls,
    send,
    createPasskey,
    signIn,
    advance: (ms: number) => {
      now += ms;
    },
    get cookie() {
      return cookie;
    },
    set cookie(v: string | null) {
      cookie = v;
    },
    answerWith(fn: () => Response) {
      answer = fn;
    },
  };
}

const signedIn = async (h: ReturnType<typeof harness>) =>
  ((await (await h.send('GET', '/api/session')).json()) as { signedIn: boolean }).signedIn;

// ---------------------------------------------------------------------------

describe('§14.3 creating a passkey takes the setup code', () => {
  it('refuses without the code, or with a wrong one, and makes nothing', async () => {
    const h = harness();
    for (const body of [{}, { setupCode: '' }, { setupCode: 'wrong' }, { setupCode: `${SETUP} ` }]) {
      const res = await h.send('POST', '/api/passkey/register/options', body);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'wrong_setup_code' });
    }
    expect([...h.store.data.keys()].filter((k) => k.startsWith('challenge:'))).toEqual([]);
    expect(await signedIn(h)).toBe(false);
  });

  it(`limits wrong tries to ${SETUP_TRIES} in ${SETUP_WINDOW_MS / 60000} minutes, the right code included`, async () => {
    const h = harness();
    for (let i = 0; i < SETUP_TRIES; i++) {
      expect((await h.send('POST', '/api/passkey/register/options', { setupCode: `guess ${i}` })).status).toBe(403);
    }
    const limited = await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBe(SETUP_WINDOW_MS / 1000);
    h.advance(SETUP_WINDOW_MS - 1);
    expect((await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP })).status).toBe(429);
    h.advance(1);
    expect((await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP })).status).toBe(200);
  });

  it('counts tries over every address, so a new address starts no new count', async () => {
    const h = harness();
    for (let i = 0; i < SETUP_TRIES; i++) {
      await h.send('POST', '/api/passkey/register/options', { setupCode: 'x' }, { 'CF-Connecting-IP': `198.51.100.${i}` });
    }
    const res = await h.send('POST', '/api/passkey/register/options', { setupCode: 'x' }, { 'CF-Connecting-IP': '203.0.113.9' });
    expect(res.status).toBe(429);
  });

  it('refuses every code when no setup code is set', async () => {
    const h = harness({ setupCode: '' });
    expect((await h.send('POST', '/api/passkey/register/options', { setupCode: '' })).status).toBe(503);
  });

  it('compares codes in constant time over their hashes', async () => {
    expect(await sameSecret(SETUP, SETUP)).toBe(true);
    expect(await sameSecret(SETUP, `${SETUP}x`)).toBe(false);
    expect(await sameSecret('', SETUP)).toBe(false);
  });

  it('makes a passkey with the right code, and that signs this device in', async () => {
    const h = harness();
    const res = await h.createPasskey();
    expect(res.status).toBe(200);
    const set = res.headers.get('Set-Cookie')!;
    expect(set).toContain(`${SESSION_COOKIE}=`);
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', `Max-Age=${SESSION_MS / 1000}`]) {
      expect(set).toContain(attr);
    }
    expect(set).not.toMatch(/Domain=/i);
    expect(await signedIn(h)).toBe(true);
  });

  it('stores only a hash of the session, never the cookie itself', async () => {
    const h = harness();
    await h.createPasskey();
    const stored = JSON.stringify([...h.store.data]);
    expect(stored).not.toContain(h.cookie!);
  });

  it('uses a challenge once, and not after five minutes', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    const opts = await (await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP })).json();
    const response = await auth.create(opts, ORIGIN);
    expect((await h.send('POST', '/api/passkey/register/verify', { response })).status).toBe(200);
    expect((await h.send('POST', '/api/passkey/register/verify', { response })).status).toBe(400);

    const late = await (await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP })).json();
    const lateResponse = await new FakeAuthenticator().create(late, ORIGIN);
    h.advance(CHALLENGE_MS);
    expect((await h.send('POST', '/api/passkey/register/verify', { response: lateResponse })).status).toBe(400);
  });

  it('refuses a passkey made without user verification', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    auth.verifiesUser = false;
    const opts = await (await h.send('POST', '/api/passkey/register/options', { setupCode: SETUP })).json();
    const res = await h.send('POST', '/api/passkey/register/verify', { response: await auth.create(opts, ORIGIN) });
    expect(res.status).toBe(400);
    expect(await signedIn(h)).toBe(false);
  });

  it('refuses a sign-in challenge answered as a registration', async () => {
    const h = harness();
    const login = await (await h.send('POST', '/api/passkey/login/options')).json();
    const response = await new FakeAuthenticator().create(
      { ...login, rp: { id: 'pizza.dave-becker.com', name: 'x' }, user: { id: 'eA', name: 'x', displayName: 'x' }, pubKeyCredParams: [] },
      ORIGIN,
    );
    expect((await h.send('POST', '/api/passkey/register/verify', { response })).status).toBe(400);
  });
});

describe('§14.3 signing in asks for the passkey and nothing else', () => {
  it('signs in with a passkey made here, without the setup code', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    await h.createPasskey(auth);
    h.cookie = null;
    expect(await signedIn(h)).toBe(false);
    const res = await h.signIn(auth);
    expect(res.status).toBe(200);
    expect(await signedIn(h)).toBe(true);
  });

  it('refuses a passkey this Worker never made', async () => {
    const h = harness();
    await h.createPasskey();
    h.cookie = null;
    const stranger = new FakeAuthenticator();
    await stranger.create(
      { challenge: 'eA', rp: { id: 'pizza.dave-becker.com', name: 'x' }, user: { id: 'eA', name: 'x', displayName: 'x' }, pubKeyCredParams: [] },
      ORIGIN,
    );
    expect((await h.signIn(stranger)).status).toBe(400);
    expect(await signedIn(h)).toBe(false);
  });

  it('refuses an answer signed for another address or page', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    await h.createPasskey(auth);
    h.cookie = null;
    expect((await h.signIn(auth, 'https://evil.example')).status).toBe(400);
    expect((await h.signIn(auth, ORIGIN, 'evil.example')).status).toBe(400);
    expect(await signedIn(h)).toBe(false);
  });

  it('keeps a passkey to the address it was made at', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    await h.createPasskey(auth);
    h.cookie = null;
    const opts = await (
      await h.send('POST', 'https://pizza-calculator-preview.example.workers.dev/api/passkey/login/options', undefined, {
        Origin: 'https://pizza-calculator-preview.example.workers.dev',
      })
    ).json();
    const response = await auth.get(opts, 'https://pizza-calculator-preview.example.workers.dev', 'pizza.dave-becker.com');
    const res = await h.send('POST', 'https://pizza-calculator-preview.example.workers.dev/api/passkey/login/verify', { response }, {
      Origin: 'https://pizza-calculator-preview.example.workers.dev',
    });
    expect(res.status).toBe(400);
  });

  it('uses a sign-in challenge once', async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    await h.createPasskey(auth);
    h.cookie = null;
    const opts = await (await h.send('POST', '/api/passkey/login/options')).json();
    const response = await auth.get(opts, ORIGIN);
    expect((await h.send('POST', '/api/passkey/login/verify', { response })).status).toBe(200);
    h.cookie = null;
    expect((await h.send('POST', '/api/passkey/login/verify', { response })).status).toBe(400);
  });

  it('refuses a write from another page, before anything is checked', async () => {
    const h = harness();
    for (const extra of [{}, { Origin: 'https://evil.example' }, { Origin: 'null' }] as Record<string, string>[]) {
      const headers: Record<string, string> = { ...extra };
      const res = await handleApi(
        new Request(`${ORIGIN}/api/passkey/register/options`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ setupCode: 'x' }),
        }),
        h.deps,
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'origin' });
    }
    // None of them counted as a wrong code.
    expect(h.store.data.has('setup-fails')).toBe(false);
  });

  it('refuses plain http anywhere but a local run', async () => {
    const h = harness();
    expect((await h.send('GET', 'http://pizza.dave-becker.com/api/session')).status).toBe(400);
    expect((await h.send('GET', 'http://localhost:8787/api/session')).status).toBe(200);
  });
});

describe('§14.3 a sign-in lasts 90 days and renews each time it is used', () => {
  it('renews on use, at most once a day, and lapses after 90 days unused', async () => {
    const h = harness();
    await h.createPasskey();
    const first = h.cookie;

    // Within a day: still signed in, no new cookie.
    h.advance(RENEW_AFTER_MS - 1);
    const quiet = await h.send('GET', '/api/session');
    expect(quiet.headers.get('Set-Cookie')).toBeNull();

    // A day on: renewed, and the cookie sent again for another 90 days.
    h.advance(1);
    const renewed = await h.send('GET', '/api/session');
    expect(renewed.headers.get('Set-Cookie')).toContain(`Max-Age=${SESSION_MS / 1000}`);
    expect(h.cookie).toBe(first);

    // 89 days unused after that renewal: still signed in.
    h.advance(SESSION_MS - RENEW_AFTER_MS);
    expect(await signedIn(h)).toBe(true);

    // 90 days unused: lapsed, and the session is gone from the Worker.
    h.advance(SESSION_MS);
    expect(await signedIn(h)).toBe(false);
    expect([...h.store.data.keys()].some((k) => k.startsWith('session:'))).toBe(false);
  });

  it('counts a sync as a use', async () => {
    const h = harness();
    await h.createPasskey();
    h.advance(SESSION_MS - 1);
    const res = await h.send('GET', '/api/github/contents/bakes');
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain(`${SESSION_COOKIE}=`);
    h.advance(SESSION_MS - 1);
    expect(await signedIn(h)).toBe(true);
  });

  it('Sign out ends the session on the Worker, not only in the browser', async () => {
    const h = harness();
    await h.createPasskey();
    const kept = h.cookie;
    const res = await h.send('POST', '/api/sign-out');
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    // A copy of the old cookie no longer works.
    h.cookie = kept;
    expect(await signedIn(h)).toBe(false);
    expect((await h.send('GET', '/api/github/contents/bakes')).status).toBe(401);
  });
});

describe('§14.2 the Worker passes only what the sync uses', () => {
  it('refuses every request without a sign-in, and none reaches GitHub', async () => {
    const h = harness();
    for (const [method, path] of [
      ['GET', '/api/github'],
      ['GET', '/api/github/contents/bakes'],
      ['PUT', '/api/github/contents/bakes/2026-11-01.json'],
      ['GET', `/api/github/git/blobs/${BLOB}`],
    ] as const) {
      const res = await h.send(method, path, method === 'PUT' ? { message: 'x', content: '' } : undefined);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'signed_out' });
    }
    h.cookie = 'made-up';
    expect((await h.send('GET', '/api/github/contents/bakes')).status).toBe(401);
    expect(h.calls).toEqual([]);
  });

  it('passes what the sync uses to the one repository, with the token added', async () => {
    const h = harness();
    await h.createPasskey();
    const allowed = [
      ['GET', '/api/github', ''],
      ['GET', '/api/github/contents/bakes', '/contents/bakes'],
      ['GET', '/api/github/contents/toppings', '/contents/toppings'],
      ['GET', '/api/github/contents/toppings/images', '/contents/toppings/images'],
      ['GET', '/api/github/contents/bakes/2026-11-01.json', '/contents/bakes/2026-11-01.json'],
      ['PUT', '/api/github/contents/bakes/2026-11-01.json', '/contents/bakes/2026-11-01.json'],
      ['DELETE', '/api/github/contents/bakes/2026-11-01.json', '/contents/bakes/2026-11-01.json'],
      ['PUT', '/api/github/contents/toppings/20261112-180000-ab12.json', '/contents/toppings/20261112-180000-ab12.json'],
      ['DELETE', '/api/github/contents/toppings/20261112-180000-ab12.json', '/contents/toppings/20261112-180000-ab12.json'],
      ['PUT', '/api/github/contents/toppings/images/20261112-180000-ab12-0123456789ab.jpg', '/contents/toppings/images/20261112-180000-ab12-0123456789ab.jpg'],
      ['DELETE', '/api/github/contents/toppings/images/20261112-180000-ab12-0123456789ab.jpg', '/contents/toppings/images/20261112-180000-ab12-0123456789ab.jpg'],
      ['GET', `/api/github/git/blobs/${BLOB}`, `/git/blobs/${BLOB}`],
    ] as const;
    for (const [method, path, upstream] of allowed) {
      // What the sync sends: content with a PUT, never with a DELETE.
      const body =
        method === 'GET'
          ? undefined
          : method === 'PUT'
            ? { message: 'm', content: 'e30=', sha: 'c'.repeat(40) }
            : { message: 'm', sha: 'c'.repeat(40) };
      const res = await h.send(method, path, body);
      expect(res.status, `${method} ${path}`).toBe(200);
      const call = h.calls.at(-1)!;
      expect(call.url).toBe(`https://api.github.com/repos/dmb1107/pizza-bake-log${upstream}`);
      expect(call.method).toBe(method);
      expect(call.headers['Authorization']).toBe(`Bearer ${TOKEN}`);
      // Nothing from the page's own request goes on but the body.
      expect(Object.keys(call.headers).map((k) => k.toLowerCase())).not.toContain('cookie');
      if (body) expect(JSON.parse(call.body!)).toEqual(body);
    }
    expect(h.calls).toHaveLength(allowed.length);
  });

  it('refuses another repository, other paths, other methods, ".." and encoded slashes, and none reaches GitHub', async () => {
    const h = harness();
    await h.createPasskey();
    const refused: [string, string][] = [
      // Another repository, named any way.
      ['GET', '/api/github/repos/dmb1107/other/contents/bakes'],
      ['GET', '/api/github/repos/dmb1107/pizza-bake-log/contents/bakes'],
      ['GET', '/api/github/../repos/dmb1107/other'],
      // Outside the three folders.
      ['GET', '/api/github/contents'],
      ['GET', '/api/github/contents/README.md'],
      ['GET', '/api/github/contents/secrets'],
      ['GET', '/api/github/contents/bakes/archive'],
      ['GET', '/api/github/contents/toppings/images/thumbs'],
      ['PUT', '/api/github/contents/.github/workflows/x.yml'],
      ['PUT', '/api/github/contents/bakes/sub/2026-11-01.json'],
      ['PUT', '/api/github/contents/bakes/2026-11-01.txt'],
      ['PUT', '/api/github/contents/toppings/images/a.png'],
      ['GET', '/api/github/git/trees/main'],
      ['GET', '/api/github/git/blobs/not-a-sha'],
      ['GET', '/api/github/branches'],
      ['GET', '/api/github/collaborators'],
      // Methods the sync never sends.
      ['POST', '/api/github/contents/bakes/2026-11-01.json'],
      ['PATCH', '/api/github/contents/bakes/2026-11-01.json'],
      ['DELETE', '/api/github'],
      ['PUT', '/api/github/contents/bakes'],
      ['DELETE', `/api/github/git/blobs/${BLOB}`],
      // Encoded slashes, dots and the rest: refused, not decoded.
      ['GET', '/api/github/contents/bakes%2F..%2F..%2Fsecrets'],
      ['PUT', '/api/github/contents/bakes%2f2026-11-01.json'],
      ['PUT', '/api/github/contents/bakes/%2e%2e%2fx.json'],
      ['GET', '/api/github/contents/bakes/2026%2D11.json'],
      ['GET', '/api/github/contents/bakes/.hidden.json'],
      ['GET', '/api/github/contents//bakes'],
      ['GET', '/api/github/contents/bakes?ref=other-branch'],
      ['GET', '/api/githubx/contents/bakes'],
    ];
    for (const [method, path] of refused) {
      const res = await h.send(method, path, method === 'GET' ? undefined : { message: 'x', content: '' });
      expect([403, 404], `${method} ${path}`).toContain(res.status);
    }
    expect(h.calls).toEqual([]);
  });

  it('refuses a raw "..", a backslash or a percent escape before parsing the address', () => {
    for (const raw of [
      'https://pizza.dave-becker.com/api/github/contents/bakes/../../x',
      'https://pizza.dave-becker.com/api/github/contents/bakes/..%2fx.json',
      'https://pizza.dave-becker.com/api/github/contents/bakes%5cx.json',
      'https://pizza.dave-becker.com/api/github/contents/bakes/a\\b.json',
    ]) {
      expect(allowedGitHubPath('GET', raw), raw).toBeNull();
    }
    expect(allowedGitHubPath('GET', 'https://pizza.dave-becker.com/api/github/contents/bakes/2026-11-01.json')).toBe(
      '/contents/bakes/2026-11-01.json',
    );
  });

  it("never sends the token back: GitHub's refusal isn't a 401, and download links go", async () => {
    const h = harness();
    await h.createPasskey();
    const listing = await h.send('GET', '/api/github/contents/bakes');
    const text = await listing.text();
    expect(text).not.toContain('download_url');
    expect(text).not.toContain('TEMPREAD');
    expect(JSON.parse(text)).toEqual([{ name: '2026-11-01.json', sha: 'b'.repeat(40), type: 'file' }]);

    for (const status of [401, 403]) {
      h.answerWith(() => new Response(JSON.stringify({ message: 'Bad credentials' }), { status }));
      const res = await h.send('GET', '/api/github/contents/bakes');
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: 'github_refused', status });
      // Still signed in: GitHub refusing the Worker's token isn't this device's sign-in.
      expect(await signedIn(h)).toBe(true);
    }
    h.answerWith(() => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }));
    expect((await h.send('GET', '/api/github/contents/toppings')).status).toBe(404);
    h.answerWith(() => {
      throw new Error('offline');
    });
    expect(await (await h.send('GET', '/api/github/contents/toppings')).json()).toEqual({ error: 'github_unreachable' });

    // Every answer the page could see, headers included, is free of the token.
    h.answerWith(() => new Response(JSON.stringify({ content: { sha: 'd'.repeat(40) } }), { status: 201 }));
    const put = await h.send('PUT', '/api/github/contents/bakes/x.json', { message: 'm', content: '' });
    const seen = JSON.stringify([...put.headers]) + (await put.text());
    expect(seen).not.toContain(TOKEN);
  });

  it('passes a write\'s message, content and sha, and refuses a branch, an author or anything else', async () => {
    const h = harness();
    await h.createPasskey();
    const path = '/api/github/contents/bakes/2026-11-01.json';
    for (const body of [
      { message: 'm', content: 'e30=', branch: 'other' },
      { message: 'm', content: 'e30=', committer: { name: 'x', email: 'x@example.com' } },
      { message: 'm', content: 'e30=', author: { name: 'x', email: 'x@example.com' } },
      { message: 'm', content: 'e30=', sha: 42 },
      { content: 'e30=' },
      ['message', 'content'],
      'not an object',
    ]) {
      const res = await h.send('PUT', path, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect((await h.send('DELETE', path, { message: 'm' })).status).toBe(400);
    expect((await h.send('DELETE', path, { message: 'm', sha: 'c'.repeat(40), content: 'x' })).status).toBe(400);
    expect(h.calls).toEqual([]);
    expect((await h.send('PUT', path, { message: 'm', content: 'e30=' })).status).toBe(200);
    expect((await h.send('DELETE', path, { message: 'm', sha: 'c'.repeat(40) })).status).toBe(200);
    expect(h.calls).toHaveLength(2);
  });

  it(`holds at most ${MAX_CHALLENGES} challenges, dropping the oldest`, async () => {
    const h = harness();
    const auth = new FakeAuthenticator();
    await h.createPasskey(auth);
    h.cookie = null;
    const first = await (await h.send('POST', '/api/passkey/login/options')).json();
    for (let i = 0; i < MAX_CHALLENGES * 3; i++) {
      h.advance(1);
      await h.send('POST', '/api/passkey/login/options');
    }
    expect([...h.store.data.keys()].filter((k) => k.startsWith('challenge:')).length).toBe(MAX_CHALLENGES);
    // The flood pushed out the first one, so it no longer signs in.
    const late = await auth.get(first, ORIGIN);
    expect((await h.send('POST', '/api/passkey/login/verify', { response: late })).status).toBe(400);
    // A fresh one does.
    expect((await h.signIn(auth)).status).toBe(200);
  });

  it('refuses the sync when no token is set', async () => {
    const h = harness({ githubToken: undefined });
    await h.createPasskey();
    expect((await h.send('GET', '/api/github/contents/bakes')).status).toBe(503);
    expect(h.calls).toEqual([]);
  });

  it('answers 404 for any other /api/ path', async () => {
    const h = harness();
    expect((await h.send('GET', '/api/whatever')).status).toBe(404);
    expect((await h.send('GET', '/api/passkey/register/options')).status).toBe(404);
  });
});
