/**
 * §14 on the page's side (APP-10, MESSAGE-75): this device's sign-in, what
 * each Worker answer tells the baker, §14.3's rendered copy, and a page that
 * holds no token and names no repository.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseAst } from 'vite';
import { describe, expect, it } from 'vitest';
import {
  AUTH_MESSAGES,
  SIGNED_IN_KEY,
  checkSession,
  createPasskey,
  loadSignedIn,
  saveSignedIn,
  signInWithPasskey,
  signOutOfWorker,
  type AuthFetch,
  type WebAuthnCalls,
} from '../src/state/auth';
import type { StorageLike } from '../src/state/storage';

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');
const SECTION_14 = SPEC.slice(SPEC.indexOf('## 14. Hosting and sign-in'));

function fakeStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

/** A Worker that answers each path with what the test says, and records the calls. */
function worker(answers: Record<string, { status: number; body?: unknown; retryAfter?: string } | 'offline'>) {
  const calls: { url: string; body?: unknown }[] = [];
  const fetchFn: AuthFetch = async (url, init) => {
    calls.push({ url, ...(init?.body ? { body: JSON.parse(init.body) as unknown } : {}) });
    const a = answers[url];
    if (!a || a === 'offline') throw new TypeError('Failed to fetch');
    return {
      ok: a.status >= 200 && a.status < 300,
      status: a.status,
      json: async () => a.body ?? {},
      headers: { get: (name: string) => (name === 'Retry-After' ? (a.retryAfter ?? null) : null) },
    };
  };
  return { fetchFn, calls };
}

const passkey = (failWith?: string): WebAuthnCalls & { asked: number } => {
  const calls = {
    asked: 0,
    async startRegistration() {
      calls.asked += 1;
      if (failWith) throw Object.assign(new Error(failWith), { name: failWith });
      return { id: 'p', rawId: 'p', type: 'public-key', response: { clientDataJSON: '', attestationObject: '' }, clientExtensionResults: {} } as never;
    },
    async startAuthentication() {
      calls.asked += 1;
      if (failWith) throw Object.assign(new Error(failWith), { name: failWith });
      return { id: 'p', rawId: 'p', type: 'public-key', response: { clientDataJSON: '', authenticatorData: '', signature: '' }, clientExtensionResults: {} } as never;
    },
  };
  return calls;
};

describe("§14.3 this device's note of its sign-in", () => {
  it('is one flag, set and cleared, never a token', () => {
    const s = fakeStorage();
    expect(loadSignedIn(s)).toBe(false);
    saveSignedIn(s, true);
    expect(loadSignedIn(s)).toBe(true);
    expect([...s.data]).toEqual([[SIGNED_IN_KEY, '1']]);
    saveSignedIn(s, false);
    expect(s.data.size).toBe(0);
    expect(loadSignedIn(null)).toBe(false);
  });

  it("takes the Worker's answer, and none when it can't be asked", async () => {
    expect(await checkSession(worker({ '/api/session': { status: 200, body: { signedIn: true } } }).fetchFn)).toBe(true);
    expect(await checkSession(worker({ '/api/session': { status: 200, body: { signedIn: false } } }).fetchFn)).toBe(false);
    expect(await checkSession(worker({ '/api/session': 'offline' }).fetchFn)).toBeNull();
    // `npm run dev` and `vite preview` have no Worker, and answer with the page.
    const html: AuthFetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse('<!doctype html>') as unknown });
    expect(await checkSession(html)).toBeNull();
  });
});

describe('§14.3 signing in asks for the passkey and nothing else', () => {
  it('signs in: options, the passkey, then the answer', async () => {
    const w = worker({
      '/api/passkey/login/options': { status: 200, body: { challenge: 'c' } },
      '/api/passkey/login/verify': { status: 200, body: { signedIn: true } },
    });
    const pk = passkey();
    expect(await signInWithPasskey(w.fetchFn, pk)).toEqual({ ok: true });
    expect(pk.asked).toBe(1);
    expect(w.calls.map((c) => c.url)).toEqual(['/api/passkey/login/options', '/api/passkey/login/verify']);
    expect(w.calls[0]!.body).toEqual({});
  });

  it('says what went wrong, in §14.3 words', async () => {
    const ok = { '/api/passkey/login/options': { status: 200, body: { challenge: 'c' } } };
    const cases: [Parameters<typeof worker>[0], WebAuthnCalls, string][] = [
      [{ '/api/passkey/login/options': 'offline' }, passkey(), AUTH_MESSAGES.offline],
      [ok, passkey('NotAllowedError'), AUTH_MESSAGES.cancelled],
      [ok, passkey('NotSupportedError'), AUTH_MESSAGES.noPasskeys],
      [{ ...ok, '/api/passkey/login/verify': { status: 400, body: { error: 'unknown_passkey' } } }, passkey(), AUTH_MESSAGES.unknownPasskey],
      [{ ...ok, '/api/passkey/login/verify': { status: 400, body: { error: 'not_verified' } } }, passkey(), AUTH_MESSAGES.refused],
    ];
    for (const [answers, pk, message] of cases) {
      expect(await signInWithPasskey(worker(answers).fetchFn, pk)).toEqual({ ok: false, message });
    }
  });
});

describe('§14.3 creating a passkey takes the setup code', () => {
  const verify = { '/api/passkey/register/verify': { status: 200, body: { signedIn: true } } };

  it('sends the code, then asks for the passkey only once the code passes', async () => {
    const w = worker({ '/api/passkey/register/options': { status: 200, body: { challenge: 'c' } }, ...verify });
    const pk = passkey();
    expect(await createPasskey(w.fetchFn, pk, 'the code')).toEqual({ ok: true });
    expect(w.calls[0]).toEqual({ url: '/api/passkey/register/options', body: { setupCode: 'the code' } });
    expect(pk.asked).toBe(1);

    const wrong = worker({ '/api/passkey/register/options': { status: 403, body: { error: 'wrong_setup_code' } } });
    const pk2 = passkey();
    expect(await createPasskey(wrong.fetchFn, pk2, 'nope')).toEqual({ ok: false, message: AUTH_MESSAGES.wrongCode });
    expect(pk2.asked).toBe(0);
  });

  it('gives the wait at the limit in whole minutes, from the Worker', async () => {
    const limited = (retryAfter?: string) =>
      worker({ '/api/passkey/register/options': { status: 429, body: { error: 'too_many_tries' }, ...(retryAfter ? { retryAfter } : {}) } });
    expect(await createPasskey(limited('600').fetchFn, passkey(), 'x')).toEqual({ ok: false, message: 'Too many wrong setup codes. Try again in 10 minutes.' });
    expect(await createPasskey(limited('61').fetchFn, passkey(), 'x')).toEqual({ ok: false, message: 'Too many wrong setup codes. Try again in 2 minutes.' });
    expect(await createPasskey(limited('5').fetchFn, passkey(), 'x')).toEqual({ ok: false, message: 'Too many wrong setup codes. Try again in 1 minute.' });
  });

  it('says so when this device already holds a passkey for the app, or none is set up', async () => {
    const opts = { '/api/passkey/register/options': { status: 200, body: { challenge: 'c' } } };
    expect(await createPasskey(worker(opts).fetchFn, passkey('InvalidStateError'), 'x')).toEqual({ ok: false, message: AUTH_MESSAGES.alreadyHere });
    const none = worker({ '/api/passkey/register/options': { status: 503, body: { error: 'no_setup_code' } } });
    expect(await createPasskey(none.fetchFn, passkey(), 'x')).toEqual({ ok: false, message: AUTH_MESSAGES.noSetupCode });
  });
});

describe('§14.3 Sign out', () => {
  it("ends the session on the Worker, and without an answer this device stays signed in", async () => {
    const w = worker({ '/api/sign-out': { status: 200, body: { signedIn: false } } });
    expect(await signOutOfWorker(w.fetchFn)).toEqual({ ok: true });
    expect(w.calls.map((c) => c.url)).toEqual(['/api/sign-out']);
    expect(await signOutOfWorker(worker({ '/api/sign-out': 'offline' }).fetchFn)).toEqual({ ok: false, message: AUTH_MESSAGES.signOutFailed });
  });
});

describe("§14.3's rendered copy is the app's", () => {
  function copyIn(file: string): Set<string> {
    const out = new Set<string>();
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const n = node as { type?: string; value?: unknown };
      if (n.type === 'JSXText' && typeof n.value === 'string') {
        const t = n.value.replace(/\s+/g, ' ').trim();
        if (t) out.add(t);
      }
      if (n.type === 'Literal' && typeof n.value === 'string') out.add(n.value);
      Object.values(node).forEach(visit);
    };
    visit(parseAst(readFileSync(file, 'utf8'), { lang: 'tsx' }));
    return out;
  }

  const block = SECTION_14.slice(SECTION_14.indexOf('**Rendered copy**'), SECTION_14.indexOf('**No engine'));
  const phrases = [...block.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!).filter((p) => p !== 'Rendered copy');

  it('reads every phrase §14.3 words', () => {
    expect(phrases).toEqual(['Sign in', 'Sign out', 'Create a passkey', 'Setup code']);
  });

  it('puts each one on the Bake log tab in those words', () => {
    const copy = copyIn('src/components/BakeLog.tsx');
    for (const p of phrases) expect(copy.has(p), p).toBe(true);
  });
});

describe('§14.2 the page holds no token and names no repository', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  const page = files('src')
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.startsWith(join('src', 'content')))
    .map((f) => [f, readFileSync(f, 'utf8')] as const);

  it('sends nothing to GitHub itself, and builds no Authorization header', () => {
    for (const [f, text] of page) {
      expect(text, f).not.toContain('api.github.com');
      expect(text, f).not.toMatch(/Authorization|Bearer /);
    }
  });

  it('names no repository: the Worker fixes it', () => {
    for (const [f, text] of page) {
      expect(text, f).not.toContain('pizza-bake-log');
      expect(text, f).not.toMatch(/\/repos\//);
    }
  });

  it('has no token or repository field left on the page', () => {
    const copy = readFileSync('src/components/BakeLog.tsx', 'utf8');
    expect(copy).not.toMatch(/>\s*Token\s*</);
    expect(copy).not.toMatch(/>\s*Repository\s*</);
    expect(copy).not.toContain('Save and sync');
  });
});
