/**
 * The Worker's own routes — WEBSITE-SPEC §14 (APP-10, MESSAGE-75).
 *
 * Everything under `/api/`: the passkey sign-in, the session, and the pass
 * through to GitHub for the bake log's and the topping ideas' sync. The page's
 * static assets never reach this file (`run_worker_first` is `/api/*`).
 *
 * This file uses only web-standard APIs (Request, Response, WebCrypto) and
 * takes its storage, clock and GitHub `fetch` as arguments, so the whole of
 * it runs in a plain Node test (`tests/worker.test.ts`). `index.ts` wires it
 * to the Durable Object that holds the passkeys and sessions.
 *
 * What each route checks is listed in FINDINGS-76, to be read against §14.
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { decodeClientDataJSON, isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** §14.3: a sign-in lasts 90 days from its last use. */
export const SESSION_MS = 90 * 24 * 60 * 60 * 1000;
/** The cookie is re-issued at most once a day as it's used (MESSAGE-75 §5). */
export const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
/** A challenge is good for one try within five minutes. */
export const CHALLENGE_MS = 5 * 60 * 1000;
/** §14.3: wrong setup codes allowed in any window, counted over all addresses. */
export const SETUP_TRIES = 5;
export const SETUP_WINDOW_MS = 10 * 60 * 1000;
/**
 * Challenges held at once. Asking for one needs no sign-in, so past this the
 * oldest goes, and a flood can't grow the store.
 */
export const MAX_CHALLENGES = 20;
/** The largest body passed to GitHub: a photo's JSON is under 1 MB. */
export const MAX_BODY_BYTES = 10 * 1024 * 1024;

/** `__Host-`: Secure, Path=/, no Domain, so it is sent to this address only. */
export const SESSION_COOKIE = '__Host-pizza-session';

const GITHUB_API = 'https://api.github.com';
const RP_NAME = 'Pizza calculator';
const USER_NAME = 'baker';
const USER_ID = isoUint8Array.fromUTF8String('pizza-calculator-baker');

// ---------------------------------------------------------------------------
// What the handler is given
// ---------------------------------------------------------------------------

/** The slice of a Durable Object's storage used here. */
export interface KvStore {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(options: { prefix: string }): Promise<Map<string, T>>;
}

export interface ApiDeps {
  store: KvStore;
  /** Reaches GitHub. Only the proxy calls it. */
  githubFetch: (url: string, init: RequestInit) => Promise<Response>;
  /** Milliseconds since the epoch. */
  now: () => number;
  /** The Worker's secrets (§14.2, §14.3). Empty or absent: the route refuses. */
  githubToken: string | undefined;
  setupCode: string | undefined;
  /** The one repository the proxy reaches. */
  owner: string;
  repo: string;
  /** Tests point this at a fake; production leaves it unset. */
  githubApi?: string | undefined;
}

// ---------------------------------------------------------------------------
// Stored records
// ---------------------------------------------------------------------------

interface StoredPasskey {
  id: string;
  /** COSE public key, base64url. */
  publicKey: string;
  counter: number;
  transports?: string[];
  /** The address it was made at. A passkey works at that address only. */
  rpID: string;
  createdAt: number;
}

interface StoredSession {
  credentialId: string;
  createdAt: number;
  lastUsedAt: number;
}

interface StoredChallenge {
  kind: 'register' | 'login';
  origin: string;
  rpID: string;
  expiresAt: number;
}

const passkeyKey = (id: string) => `passkey:${id}`;
const sessionKey = (hash: string) => `session:${hash}`;
const challengeKey = (challenge: string) => `challenge:${challenge}`;
const SETUP_FAILS_KEY = 'setup-fails';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Every answer is JSON the page reads, and none is cached. */
function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

const refuse = (status: number, error: string, headers?: Record<string, string>) => json(status, { error }, headers);

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Compares two strings in time that depends on neither: both are hashed to
 * 32 bytes first, so their lengths don't show either.
 */
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return isoBase64URL.fromBuffer(bytes);
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=Strict`;
}

const CLEAR_COOKIE = `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

/** This address, as WebAuthn names it. Plain http only for a local `wrangler dev`. */
function relyingParty(url: URL): { origin: string; rpID: string } | null {
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
  return { origin: url.origin, rpID: url.hostname };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * The session this request carries, or null. A live one used more than a day
 * ago is renewed: its last use moves to now and the cookie is sent again.
 * One unused for 90 days is deleted.
 */
async function currentSession(
  request: Request,
  deps: ApiDeps,
): Promise<{ key: string; setCookie: string | null } | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const key = sessionKey(hex(await sha256(token)));
  const session = await deps.store.get<StoredSession>(key);
  if (!session) return null;
  const now = deps.now();
  if (now - session.lastUsedAt >= SESSION_MS) {
    await deps.store.delete(key);
    return null;
  }
  if (now - session.lastUsedAt < RENEW_AFTER_MS) return { key, setCookie: null };
  await deps.store.put<StoredSession>(key, { ...session, lastUsedAt: now });
  return { key, setCookie: sessionCookie(token) };
}

/** Starts a session for a passkey just verified. Only a hash of the cookie is stored. */
async function startSession(deps: ApiDeps, credentialId: string): Promise<string> {
  const token = randomToken();
  const now = deps.now();
  await deps.store.put<StoredSession>(sessionKey(hex(await sha256(token))), {
    credentialId,
    createdAt: now,
    lastUsedAt: now,
  });
  return sessionCookie(token);
}

/** Drops lapsed sessions and challenges. Run on each sign-in, so nothing piles up. */
async function sweep(deps: ApiDeps): Promise<void> {
  const now = deps.now();
  for (const [key, s] of await deps.store.list<StoredSession>({ prefix: 'session:' })) {
    if (now - s.lastUsedAt >= SESSION_MS) await deps.store.delete(key);
  }
  for (const [key, c] of await deps.store.list<StoredChallenge>({ prefix: 'challenge:' })) {
    if (now >= c.expiresAt) await deps.store.delete(key);
  }
}

/**
 * Takes the challenge a WebAuthn response answers, once: it is deleted before
 * the response is checked, so a failed try uses it up too.
 */
async function takeChallenge(
  deps: ApiDeps,
  response: { response?: { clientDataJSON?: unknown } },
  kind: StoredChallenge['kind'],
  rp: { origin: string; rpID: string },
): Promise<string | null> {
  const clientDataJSON = response.response?.clientDataJSON;
  if (typeof clientDataJSON !== 'string') return null;
  let challenge: string;
  try {
    challenge = decodeClientDataJSON(clientDataJSON).challenge;
  } catch {
    return null;
  }
  const key = challengeKey(challenge);
  const stored = await deps.store.get<StoredChallenge>(key);
  if (!stored) return null;
  await deps.store.delete(key);
  if (stored.kind !== kind || stored.origin !== rp.origin || stored.rpID !== rp.rpID) return null;
  if (deps.now() >= stored.expiresAt) return null;
  return challenge;
}

async function saveChallenge(deps: ApiDeps, challenge: string, kind: StoredChallenge['kind'], rp: { origin: string; rpID: string }) {
  const held = [...(await deps.store.list<StoredChallenge>({ prefix: 'challenge:' }))].sort(
    ([, a], [, b]) => a.expiresAt - b.expiresAt,
  );
  for (const [key] of held.slice(0, Math.max(0, held.length - MAX_CHALLENGES + 1))) await deps.store.delete(key);
  await deps.store.put<StoredChallenge>(challengeKey(challenge), {
    kind,
    origin: rp.origin,
    rpID: rp.rpID,
    expiresAt: deps.now() + CHALLENGE_MS,
  });
}

async function passkeysAt(deps: ApiDeps, rpID: string): Promise<StoredPasskey[]> {
  return [...(await deps.store.list<StoredPasskey>({ prefix: 'passkey:' })).values()].filter((p) => p.rpID === rpID);
}

// ---------------------------------------------------------------------------
// The setup code's limit (§14.3)
// ---------------------------------------------------------------------------

/** Wrong tries inside the window, oldest first. */
async function recentFails(deps: ApiDeps): Promise<number[]> {
  const now = deps.now();
  const fails = (await deps.store.get<number[]>(SETUP_FAILS_KEY)) ?? [];
  return fails.filter((t) => now - t < SETUP_WINDOW_MS);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function registerOptions(request: Request, deps: ApiDeps, rp: { origin: string; rpID: string }) {
  const body = await readJson(request);
  const code = body?.['setupCode'];
  if (!deps.setupCode) return refuse(503, 'no_setup_code');
  // Over the limit, every try is refused, the right code included, until the
  // oldest wrong one leaves the window.
  const fails = await recentFails(deps);
  if (fails.length >= SETUP_TRIES) {
    const retryS = Math.ceil((fails[0]! + SETUP_WINDOW_MS - deps.now()) / 1000);
    return refuse(429, 'too_many_tries', { 'Retry-After': String(Math.max(1, retryS)) });
  }
  if (typeof code !== 'string' || !(await sameSecret(code, deps.setupCode))) {
    await deps.store.put(SETUP_FAILS_KEY, [...fails, deps.now()]);
    return refuse(403, 'wrong_setup_code');
  }
  await sweep(deps);
  const existing = await passkeysAt(deps, rp.rpID);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName: USER_NAME,
    userID: USER_ID,
    attestationType: 'none',
    timeout: CHALLENGE_MS,
    // A device that already holds one of these says so, rather than making a second.
    excludeCredentials: existing.map((p) => ({ id: p.id, ...(p.transports ? { transports: p.transports } : {}) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  await saveChallenge(deps, options.challenge, 'register', rp);
  return json(200, options);
}

async function registerVerify(request: Request, deps: ApiDeps, rp: { origin: string; rpID: string }) {
  const body = await readJson(request);
  const response = body?.['response'] as RegistrationResponseJSON | undefined;
  if (!response || typeof response !== 'object') return refuse(400, 'bad_request');
  // The challenge was only issued after the setup code passed.
  const challenge = await takeChallenge(deps, response, 'register', rp);
  if (!challenge) return refuse(400, 'challenge');
  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
  } catch {
    return refuse(400, 'not_verified');
  }
  if (!verified.verified) return refuse(400, 'not_verified');
  const { credential } = verified.registrationInfo;
  await deps.store.put<StoredPasskey>(passkeyKey(credential.id), {
    id: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    ...(credential.transports ? { transports: credential.transports } : {}),
    rpID: rp.rpID,
    createdAt: deps.now(),
  });
  // Making a passkey signs this device in.
  const cookie = await startSession(deps, credential.id);
  return json(200, { signedIn: true }, { 'Set-Cookie': cookie });
}

async function loginOptions(deps: ApiDeps, rp: { origin: string; rpID: string }) {
  await sweep(deps);
  // No list of passkeys: the device offers the ones it holds for this address.
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: 'required',
    timeout: CHALLENGE_MS,
  });
  await saveChallenge(deps, options.challenge, 'login', rp);
  return json(200, options);
}

async function loginVerify(request: Request, deps: ApiDeps, rp: { origin: string; rpID: string }) {
  const body = await readJson(request);
  const response = body?.['response'] as AuthenticationResponseJSON | undefined;
  if (!response || typeof response !== 'object' || typeof response.id !== 'string') return refuse(400, 'bad_request');
  const challenge = await takeChallenge(deps, response, 'login', rp);
  if (!challenge) return refuse(400, 'challenge');
  const passkey = await deps.store.get<StoredPasskey>(passkeyKey(response.id));
  if (!passkey || passkey.rpID !== rp.rpID) return refuse(400, 'unknown_passkey');
  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: passkey.counter,
        ...(passkey.transports ? { transports: passkey.transports } : {}),
      },
      requireUserVerification: true,
    });
  } catch {
    return refuse(400, 'not_verified');
  }
  if (!verified.verified) return refuse(400, 'not_verified');
  await deps.store.put<StoredPasskey>(passkeyKey(passkey.id), {
    ...passkey,
    counter: verified.authenticationInfo.newCounter,
  });
  const cookie = await startSession(deps, passkey.id);
  return json(200, { signedIn: true }, { 'Set-Cookie': cookie });
}

// ---------------------------------------------------------------------------
// The pass through to GitHub (§14.2)
// ---------------------------------------------------------------------------

const NAME = '[A-Za-z0-9][A-Za-z0-9_.-]{0,127}';
const FOLDERS = '(?:bakes|toppings|toppings/images)';

/**
 * What the sync uses, and nothing else, relative to the one repository:
 * the repository itself, a listing of each folder, a file in each, and a blob.
 */
const ALLOWED: { methods: readonly string[]; path: RegExp }[] = [
  { methods: ['GET'], path: /^$/ },
  { methods: ['GET'], path: new RegExp(`^/contents/${FOLDERS}$`) },
  { methods: ['GET', 'PUT', 'DELETE'], path: new RegExp(`^/contents/(?:bakes|toppings)/${NAME}\\.json$`) },
  { methods: ['GET', 'PUT', 'DELETE'], path: new RegExp(`^/contents/toppings/images/${NAME}\\.jpg$`) },
  { methods: ['GET'], path: /^\/git\/blobs\/(?:[0-9a-f]{40}|[0-9a-f]{64})$/ },
];

/**
 * The repository-relative path a proxy request asks for, or null if it is
 * outside what the sync uses. Refused, never normalized: a `..`, any percent
 * escape (an encoded slash among them), a backslash, a doubled slash, or a
 * query.
 */
export function allowedGitHubPath(method: string, rawUrl: string): string | null {
  if (rawUrl.includes('..') || rawUrl.includes('%') || rawUrl.includes('\\')) return null;
  const url = new URL(rawUrl);
  if (url.search !== '' || url.hash !== '') return null;
  const m = /^\/api\/github(\/.*)?$/.exec(url.pathname);
  if (!m) return null;
  const rest = m[1] ?? '';
  if (rest.includes('//') || rest.includes('/.')) return null;
  const rule = ALLOWED.find((r) => r.path.test(rest));
  if (!rule || !rule.methods.includes(method)) return null;
  // `..` inside a name can't pass NAME's pattern, but say so plainly.
  if (rest.split('/').some((seg) => seg === '.' || seg === '..')) return null;
  return rest;
}

/**
 * A private repository's contents answers carry `download_url`s with a
 * short-lived read token in them. The page never reads them, so they go.
 */
function withoutDownloadUrls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutDownloadUrls);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === 'download_url') continue;
    out[k] = withoutDownloadUrls(v);
  }
  return out;
}

/**
 * The fields the sync writes, and nothing else: no `branch`, `committer` or
 * `author`, so every write lands on the default branch under the token's own
 * name. Null when the body is anything else.
 */
export function allowedWriteBody(method: string, text: string): string | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const fields: Record<string, unknown> = body as Record<string, unknown>;
  const allowed = method === 'PUT' ? ['message', 'content', 'sha'] : ['message', 'sha'];
  const required = method === 'PUT' ? ['message', 'content'] : ['message', 'sha'];
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k) || typeof v !== 'string') return null;
  }
  if (!required.every((k) => k in fields)) return null;
  return JSON.stringify(fields);
}

async function proxy(request: Request, deps: ApiDeps, path: string): Promise<Response> {
  if (!deps.githubToken) return refuse(503, 'no_github_token');
  let body: string | undefined;
  if (request.method === 'PUT' || request.method === 'DELETE') {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return refuse(413, 'too_large');
    const checked = allowedWriteBody(request.method, text);
    if (checked === null) return refuse(400, 'bad_body');
    body = checked;
  }
  const base = deps.githubApi ?? GITHUB_API;
  const target = `${base}/repos/${encodeURIComponent(deps.owner)}/${encodeURIComponent(deps.repo)}${path}`;
  let upstream: Response;
  try {
    // Nothing from the page's request is passed on but its method, path and body.
    upstream = await deps.githubFetch(target, {
      method: request.method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${deps.githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'pizza-calculator-worker',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body }),
    });
  } catch {
    return refuse(502, 'github_unreachable');
  }
  // GitHub refusing the Worker's token isn't this device's sign-in lapsing,
  // so it never comes back as a 401.
  if (upstream.status === 401 || upstream.status === 403) {
    return json(502, { error: 'github_refused', status: upstream.status });
  }
  const text = await upstream.text();
  let out: unknown;
  try {
    out = text === '' ? null : JSON.parse(text);
  } catch {
    return json(502, { error: 'github_unreadable', status: upstream.status });
  }
  return json(upstream.status, withoutDownloadUrls(out));
}

// ---------------------------------------------------------------------------
// The router
// ---------------------------------------------------------------------------

/** Every `/api/` request. Anything this doesn't name is a 404. */
export async function handleApi(request: Request, deps: ApiDeps): Promise<Response> {
  const url = new URL(request.url);
  const rp = relyingParty(url);
  if (!rp) return refuse(400, 'insecure');
  const method = request.method;

  // A write must come from this address's own page.
  if (method !== 'GET' && method !== 'HEAD' && request.headers.get('Origin') !== rp.origin) {
    return refuse(403, 'origin');
  }

  const path = url.pathname;
  if (path === '/api/session' && method === 'GET') {
    const session = await currentSession(request, deps);
    return json(200, { signedIn: session !== null }, session?.setCookie ? { 'Set-Cookie': session.setCookie } : {});
  }
  if (path === '/api/passkey/register/options' && method === 'POST') return registerOptions(request, deps, rp);
  if (path === '/api/passkey/register/verify' && method === 'POST') return registerVerify(request, deps, rp);
  if (path === '/api/passkey/login/options' && method === 'POST') return loginOptions(deps, rp);
  if (path === '/api/passkey/login/verify' && method === 'POST') return loginVerify(request, deps, rp);
  if (path === '/api/sign-out' && method === 'POST') {
    const session = await currentSession(request, deps);
    if (session) await deps.store.delete(session.key);
    return json(200, { signedIn: false }, { 'Set-Cookie': CLEAR_COOKIE });
  }

  if (path === '/api/github' || path.startsWith('/api/github/')) {
    const session = await currentSession(request, deps);
    if (!session) return refuse(401, 'signed_out', { 'Set-Cookie': CLEAR_COOKIE });
    const repoPath = allowedGitHubPath(method, request.url);
    const res = repoPath === null ? refuse(403, 'not_allowed') : await proxy(request, deps, repoPath);
    if (session.setCookie) res.headers.append('Set-Cookie', session.setCookie);
    return res;
  }

  return refuse(404, 'not_found');
}
