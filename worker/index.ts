/**
 * The Cloudflare Worker at pizza.dave-becker.com — WEBSITE-SPEC §14.
 *
 * Static assets (the built page in `dist/`) are served by Cloudflare before
 * this code runs; only `/api/*` reaches it (`run_worker_first` in
 * `wrangler.jsonc`). Every `/api/` request goes to one Durable Object, which
 * holds the passkeys, the sessions and the setup code's wrong tries, and
 * handles one request at a time, so a challenge can't be used twice and the
 * limit can't be raced. The routes themselves are `app.ts`.
 */

import { DurableObject } from 'cloudflare:workers';
import { MAX_BODY_BYTES, handleApi, type KvStore } from './app';

export interface Env {
  ASSETS: Fetcher;
  AUTH: DurableObjectNamespace<AuthStore>;
  /** Secrets, set by Dave with `wrangler secret put` (FINDINGS-76). */
  GITHUB_TOKEN?: string;
  SETUP_CODE?: string;
  /** The one repository the sync reaches (`vars` in `wrangler.jsonc`). */
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  /** Local runs only: a fake GitHub. Unset in every deploy. */
  GITHUB_API?: string;
}

export class AuthStore extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const storage = this.ctx.storage;
    const store: KvStore = {
      get: (key) => storage.get(key),
      put: (key, value) => storage.put(key, value),
      delete: (key) => storage.delete(key),
      list: (options) => storage.list(options),
    };
    return handleApi(request, {
      store,
      githubFetch: (url, init) => fetch(url, init),
      now: () => Date.now(),
      githubToken: this.env.GITHUB_TOKEN,
      setupCode: this.env.SETUP_CODE,
      owner: this.env.GITHUB_OWNER,
      repo: this.env.GITHUB_REPO,
      githubApi: this.env.GITHUB_API || undefined,
    });
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      // The body is read here, whole, so a route that answers without
      // reading it leaves no stream half-sent between Worker and object.
      let body: ArrayBuffer | null = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const declared = Number(request.headers.get('Content-Length') ?? '0');
        if (declared > MAX_BODY_BYTES) return Response.json({ error: 'too_large' }, { status: 413 });
        body = await request.arrayBuffer();
        if (body.byteLength > MAX_BODY_BYTES) return Response.json({ error: 'too_large' }, { status: 413 });
      }
      const forwarded = new Request(request.url, { method: request.method, headers: request.headers, body });
      return env.AUTH.get(env.AUTH.idFromName('auth')).fetch(forwarded);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
