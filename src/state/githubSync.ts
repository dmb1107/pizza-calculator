/**
 * Bake-log sync through a private GitHub repository — WEBSITE-SPEC §2 and §10.
 *
 * One JSON file per bake under `bakes/`, read and written from the browser
 * through GitHub's contents API with a token that can reach only that
 * repository. This is the one network call the app makes (§2).
 *
 * `fetch` is passed in, so the whole exchange is testable in Node against a
 * fake repository.
 *
 * Conflicts: a bake is written by one device at a time in practice, so a stale
 * write (GitHub refuses it because the file moved) re-reads the file's
 * current version and writes again. The device pushing last wins.
 */

import type { LoggedBake } from '../lib/bakeLog';
import { parseBake, upsertBake, type GitHubConfig, type LocalLog } from './bakeLogStore';

export const API = 'https://api.github.com';
export const BAKES_DIR = 'bakes';

/** The slice of `fetch` used here. */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; cache?: 'no-store' },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type SyncErrorKind = 'auth' | 'repo' | 'network' | 'other';

export class SyncError extends Error {
  constructor(
    readonly kind: SyncErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const pathFor = (bakeId: string) => `${BAKES_DIR}/${bakeId}.json`;
const idFromName = (name: string) => (name.endsWith('.json') ? name.slice(0, -'.json'.length) : null);

/** UTF-8 safe base64, as the contents API wants it. */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** A bake as its file holds it: indented, so it reads in the repository. */
export function serializeBake(bake: LoggedBake): string {
  return `${JSON.stringify(bake, null, 2)}\n`;
}

class Client {
  constructor(
    private readonly cfg: GitHubConfig,
    private readonly fetchFn: FetchLike,
  ) {}

  private url(path: string) {
    return `${API}/repos/${encodeURIComponent(this.cfg.owner)}/${encodeURIComponent(this.cfg.repo)}${path}`;
  }

  async request(method: string, path: string, body?: unknown) {
    let res;
    try {
      res = await this.fetchFn(this.url(path), {
        method,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.cfg.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new SyncError('network', "Couldn't reach GitHub. The log is saved on this device and will sync later.");
    }
    return res;
  }

  /** Throws a SyncError naming what the baker can do about it. */
  fail(status: number): never {
    if (status === 401) throw new SyncError('auth', 'GitHub refused the token. It may have expired or been revoked.', status);
    if (status === 403) {
      throw new SyncError('auth', "The token can't write to this repository. It needs Contents: read and write.", status);
    }
    if (status === 404) throw new SyncError('repo', "The token can't see that repository. Check its name and the token's access.", status);
    throw new SyncError('other', `GitHub answered ${status}.`, status);
  }

  /** Checks the repository is reachable, so a missing `bakes/` folder can be read as empty. */
  async checkRepo(): Promise<void> {
    const res = await this.request('GET', '');
    if (!res.ok) this.fail(res.status);
  }

  /** Every bake file, by id. An absent folder is an empty log. */
  async list(): Promise<Map<string, string>> {
    const res = await this.request('GET', `/contents/${BAKES_DIR}`);
    if (res.status === 404) return new Map();
    if (!res.ok) this.fail(res.status);
    const body = await res.json();
    const out = new Map<string, string>();
    if (!Array.isArray(body)) return out;
    for (const entry of body) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { name, sha, type } = entry as Record<string, unknown>;
      if (type !== 'file' || typeof name !== 'string' || typeof sha !== 'string') continue;
      const id = idFromName(name);
      if (id) out.set(id, sha);
    }
    return out;
  }

  async get(bakeId: string): Promise<{ bake: LoggedBake | null; sha: string } | null> {
    const res = await this.request('GET', `/contents/${pathFor(bakeId)}`);
    if (res.status === 404) return null;
    if (!res.ok) this.fail(res.status);
    const body = (await res.json()) as Record<string, unknown>;
    if (typeof body['content'] !== 'string' || typeof body['sha'] !== 'string') return null;
    let bake: LoggedBake | null = null;
    try {
      bake = parseBake(JSON.parse(fromBase64(body['content'])));
    } catch {
      bake = null;
    }
    // A file named for one bake that holds another is not that bake.
    if (bake && bake.bake_id !== bakeId) bake = null;
    return { bake, sha: body['sha'] };
  }

  async put(bake: LoggedBake, sha: string | undefined): Promise<string> {
    const attempt = (currentSha: string | undefined) =>
      this.request('PUT', `/contents/${pathFor(bake.bake_id)}`, {
        message: `Log bake ${bake.bake_id}`,
        content: toBase64(serializeBake(bake)),
        ...(currentSha ? { sha: currentSha } : {}),
      });
    let res = await attempt(sha);
    // 409 / 422: the file moved since we listed it. Re-read and write again.
    if (res.status === 409 || res.status === 422) {
      const current = await this.get(bake.bake_id);
      res = await attempt(current?.sha);
    }
    if (!res.ok) this.fail(res.status);
    const body = (await res.json()) as { content?: { sha?: unknown } };
    const newSha = body.content?.sha;
    if (typeof newSha !== 'string') throw new SyncError('other', 'GitHub saved the bake but returned no version.');
    return newSha;
  }

  async remove(bakeId: string, sha: string): Promise<void> {
    const res = await this.request('DELETE', `/contents/${pathFor(bakeId)}`, {
      message: `Delete bake ${bakeId}`,
      sha,
    });
    if (res.status === 404) return;
    if (!res.ok) this.fail(res.status);
  }
}

export interface SyncResult {
  log: LocalLog;
  /** Set when the sync stopped partway. `log` holds whatever finished before it. */
  error?: SyncError;
}

/**
 * Push this device's changes, then pull everything the repository has that
 * this device hasn't seen. Deletions made on another device are applied here.
 */
export async function syncLog(cfg: GitHubConfig, start: LocalLog, fetchFn: FetchLike, now: Date = new Date()): Promise<SyncResult> {
  const client = new Client(cfg, fetchFn);
  let log: LocalLog = { ...start, shas: { ...start.shas }, dirty: [...start.dirty], deleted: [...start.deleted] };
  try {
    await client.checkRepo();
    const remote = await client.list();

    for (const id of start.deleted) {
      const sha = remote.get(id);
      if (sha) await client.remove(id, sha);
      remote.delete(id);
      log = { ...log, deleted: log.deleted.filter((x) => x !== id) };
    }

    for (const id of start.dirty) {
      const bake = log.bakes.find((b) => b.bake_id === id);
      if (bake) {
        const sha = await client.put(bake, remote.get(id));
        remote.set(id, sha);
        log = { ...log, shas: { ...log.shas, [id]: sha } };
      }
      log = { ...log, dirty: log.dirty.filter((x) => x !== id) };
    }

    for (const [id, sha] of remote) {
      if (log.shas[id] === sha) continue;
      const file = await client.get(id);
      if (!file) continue;
      log = { ...log, shas: { ...log.shas, [id]: file.sha } };
      // A file that doesn't parse is left in the repository and not solved.
      if (file.bake) {
        const pulled = upsertBake(log, file.bake);
        log = { ...pulled, dirty: pulled.dirty.filter((x) => x !== id) };
      }
    }

    // Deleted on another device: once pushed here, now missing there.
    const gone = log.bakes.filter((b) => b.bake_id in log.shas && !remote.has(b.bake_id) && !log.dirty.includes(b.bake_id));
    if (gone.length) {
      const shas = { ...log.shas };
      for (const b of gone) delete shas[b.bake_id];
      log = { ...log, bakes: log.bakes.filter((b) => !gone.includes(b)), shas };
    }

    return { log: { ...log, lastSyncedAt: now.toISOString() } };
  } catch (e) {
    const error = e instanceof SyncError ? e : new SyncError('other', e instanceof Error ? e.message : String(e));
    return { log, error };
  }
}

/**
 * Fold a finished sync into a log that may have changed while it ran: the
 * sync's result is the base, and any bake edited, added or deleted here in the
 * meantime is applied on top and left marked for the next sync.
 */
export function mergeAfterSync(current: LocalLog, started: LocalLog, synced: LocalLog): LocalLog {
  let out = synced;
  const before = new Map(started.bakes.map((b) => [b.bake_id, b]));
  for (const bake of current.bakes) {
    if (before.get(bake.bake_id) !== bake) out = upsertBake(out, bake);
  }
  for (const id of current.deleted) {
    if (started.deleted.includes(id)) continue;
    const shas = { ...out.shas };
    const wasPushed = id in shas;
    delete shas[id];
    out = {
      ...out,
      bakes: out.bakes.filter((b) => b.bake_id !== id),
      shas,
      dirty: out.dirty.filter((x) => x !== id),
      deleted: wasPushed && !out.deleted.includes(id) ? [...out.deleted, id] : out.deleted,
    };
  }
  // A bake removed here before it was ever pushed leaves no `deleted` entry.
  const removedLocally = started.bakes.filter(
    (b) => !current.bakes.some((c) => c.bake_id === b.bake_id) && !current.deleted.includes(b.bake_id),
  );
  // If the sync pushed it in the meantime, the repository now has it, so it
  // needs deleting there too.
  for (const { bake_id: id } of removedLocally) {
    const shas = { ...out.shas };
    const pushed = id in shas;
    delete shas[id];
    out = {
      ...out,
      bakes: out.bakes.filter((b) => b.bake_id !== id),
      shas,
      dirty: out.dirty.filter((x) => x !== id),
      deleted: pushed && !out.deleted.includes(id) ? [...out.deleted, id] : out.deleted,
    };
  }
  return out;
}
