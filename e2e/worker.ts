/**
 * The Worker at this address, as the WebKit suite sees it (§14, APP-10).
 *
 * `stubWorker` answers the page's `/api/` requests as `worker/app.ts` does:
 * the session, the passkey routes, Sign out, and the pass through to one
 * in-memory repository shared by every profile in a test. A device is signed
 * in once it has signed in through the page; the sign-in is kept per profile,
 * so it survives a force close as the real cookie does. The Worker's own
 * checks are tested in `tests/worker.test.ts`; this stands in for it so the
 * page can be driven.
 *
 * `fakePasskeys` stands in for the passkey: WebKit can't make one in the
 * suite (a virtual authenticator needs Chromium's DevTools protocol), so
 * `navigator.credentials` answers at once with a credential the stub
 * accepts. What it can't reach: Face ID, Touch ID, Bitwarden, and iOS
 * copying Safari's cookie to an icon when it is added.
 */
import type { BrowserContext } from '@playwright/test';

export interface FakeRepo {
  files: Map<string, { content: string; sha: string }>;
  /** Requests that reached the repository, as "METHOD /api/github/…". */
  requests: string[];
  /** Every other `/api/` request, as "METHOD /api/…". */
  authRequests: string[];
  /** Folders that answer 500. */
  failing: Set<string>;
  /** Profiles signed in, by the name each was stubbed with. */
  sessions: Set<string>;
  /** Any request that carried a token, which the page must never send. */
  tokensSeen: string[];
}

export const newRepo = (): FakeRepo => ({
  files: new Map(),
  requests: [],
  authRequests: [],
  failing: new Set(),
  sessions: new Set(),
  tokensSeen: [],
});

/** The setup code the stub accepts. A test value, for the stub only. */
export const TEST_SETUP_CODE = 'test-setup-code';

export async function stubWorker(context: BrowserContext, repo: FakeRepo, device: string) {
  let n = 0;
  await context.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const json = (status: number, body: unknown = {}) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.headers()['authorization']) repo.tokensSeen.push(`${method} ${url.pathname}`);

    if (!url.pathname.startsWith('/api/github')) {
      repo.authRequests.push(`${method} ${url.pathname}`);
      const body = (req.postDataJSON() ?? {}) as { setupCode?: string };
      switch (`${method} ${url.pathname}`) {
        case 'GET /api/session':
          return json(200, { signedIn: repo.sessions.has(device) });
        case 'POST /api/passkey/login/options':
          return json(200, { challenge: 'Y2hhbGxlbmdl', rpId: url.hostname, userVerification: 'required', timeout: 300000 });
        case 'POST /api/passkey/register/options':
          if (body.setupCode !== TEST_SETUP_CODE) return json(403, { error: 'wrong_setup_code' });
          return json(200, {
            challenge: 'Y2hhbGxlbmdl',
            rp: { id: url.hostname, name: 'Pizza calculator' },
            user: { id: 'dXNlcg', name: 'baker', displayName: '' },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            timeout: 300000,
            attestation: 'none',
            excludeCredentials: [],
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
          });
        case 'POST /api/passkey/login/verify':
        case 'POST /api/passkey/register/verify':
          repo.sessions.add(device);
          return json(200, { signedIn: true });
        case 'POST /api/sign-out':
          repo.sessions.delete(device);
          return json(200, { signedIn: false });
        default:
          return json(404, { error: 'not_found' });
      }
    }

    if (!repo.sessions.has(device)) return json(401, { error: 'signed_out' });
    repo.requests.push(`${method} ${url.pathname}`);
    const path = url.pathname.slice('/api/github'.length);
    if (path === '') return json(200, { full_name: 'dave/pizza-bake-log' });
    // The git blobs API, which the photos are fetched through (APP-8).
    const blob = /^\/git\/blobs\/(.+)$/.exec(path)?.[1];
    if (blob) {
      const f = [...repo.files.values()].find((x) => x.sha === decodeURIComponent(blob));
      return f ? json(200, { sha: f.sha, content: f.content, encoding: 'base64' }) : json(404);
    }
    const dir = /^\/contents\/(\w+)/.exec(path)?.[1];
    if (dir && repo.failing.has(dir)) return json(500);
    const file = path.replace('/contents/', '');
    const body = (req.postDataJSON() ?? {}) as { content?: string; sha?: string };
    if (method === 'GET' && !repo.files.has(file)) {
      // A folder: its files, and its subfolders as GitHub lists them.
      const entries = new Map<string, { type: string; name: string; sha: string }>();
      for (const [p, f] of repo.files) {
        if (!p.startsWith(`${file}/`)) continue;
        const rest = p.slice(file.length + 1);
        const slash = rest.indexOf('/');
        if (slash === -1) entries.set(rest, { type: 'file', name: rest, sha: f.sha });
        else entries.set(rest.slice(0, slash), { type: 'dir', name: rest.slice(0, slash), sha: 'tree' });
      }
      return entries.size ? json(200, [...entries.values()]) : json(404);
    }
    if (method === 'GET') return json(200, repo.files.get(file));
    if (method === 'PUT') {
      const current = repo.files.get(file);
      if (current && !body.sha) return json(422);
      if (current && body.sha !== current.sha) return json(409);
      const sha = `sha${++n}`;
      repo.files.set(file, { content: body.content!, sha });
      return json(201, { content: { sha } });
    }
    if (method === 'DELETE') {
      repo.files.delete(file);
      return json(200);
    }
    return json(405);
  });
}

/**
 * A passkey that answers at once: `navigator.credentials.create` and `get`
 * return a credential shaped as a browser's, which `@simplewebauthn/browser`
 * reads and the stub accepts.
 */
export async function fakePasskeys(context: BrowserContext) {
  await context.addInitScript(installFakePasskeys);
  // Pages already open get it now, without a reload.
  for (const page of context.pages()) await page.evaluate(installFakePasskeys);
}

function installFakePasskeys() {
    const bytes = (s: string) => new TextEncoder().encode(s).buffer;
    const credential = (response: Record<string, unknown>) => ({
      id: 'ZmFrZS1wYXNza2V5',
      rawId: bytes('fake-passkey'),
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response,
      getClientExtensionResults: () => ({}),
    });
    if (typeof window.PublicKeyCredential !== 'function') {
      (window as unknown as { PublicKeyCredential: unknown }).PublicKeyCredential = function PublicKeyCredential() {};
    }
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        create: async () =>
          credential({
            clientDataJSON: bytes('{}'),
            attestationObject: bytes('att'),
            getTransports: () => ['internal'],
            getAuthenticatorData: () => bytes('auth'),
            getPublicKey: () => null,
            getPublicKeyAlgorithm: () => -7,
          }),
        get: async () =>
          credential({
            clientDataJSON: bytes('{}'),
            authenticatorData: bytes('auth'),
            signature: bytes('sig'),
            userHandle: bytes('user'),
          }),
      },
    });
}
