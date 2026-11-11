/**
 * Local-first sync of one folder of JSON records through a private GitHub
 * repository — WEBSITE-SPEC §2, §10 and §13.3.
 *
 * The bake log (`bakes/`) and the topping ideas (`toppings/`, MESSAGE-70) run
 * the same sync on their own stores: each device writes its own copy first
 * and syncs after; changed and deleted records are tracked; one JSON file per
 * record, read and written through GitHub's contents API with a token that
 * can reach only that repository. Separate stores, separate runs, so a
 * failure in one never holds up the other (§13.3).
 *
 * `fetch` is passed in, so the whole exchange is testable in Node against a
 * fake repository.
 *
 * Conflicts: a stale write (GitHub refuses it because the file moved) re-reads
 * the file's current version and writes again, so the device pushing last
 * wins. A kind with `keepRemote` first compares the two copies when the
 * repository's changed since this device last synced it, and keeps the
 * repository's when it says so.
 */

export const API = 'https://api.github.com';

/** The repository and token, per device. */
export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

/** Where a store's sync stands, for the page. */
export type SyncState =
  /** No token on this device: the store stays in browser storage. */
  | { state: 'off' }
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'error'; message: string };

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

/** A local copy of one folder, with what the next sync has to do. */
export interface RecordStore<T> {
  items: T[];
  /** The repository blob each record was last synced at. Absent: never pushed. */
  shas: Record<string, string>;
  /** Records changed on this device and not yet pushed. */
  dirty: string[];
  /** Records deleted on this device and not yet removed from the repository. */
  deleted: string[];
  /** ISO instant of the last complete sync, '' for never. */
  lastSyncedAt: string;
}

/** What one kind of record needs from the sync. */
export interface RecordKind<T> {
  /** The repository folder, `bakes` or `toppings`. */
  dir: string;
  idOf(item: T): string;
  /** A record as stored, or null if any part of it is malformed. */
  parse(raw: unknown): T | null;
  /** Commit messages. */
  putMessage(id: string): string;
  deleteMessage(id: string): string;
  /** Said when GitHub can't be reached: what is safe, and what happens next. */
  offline: string;
  /** "the bake", for "GitHub saved the bake but returned no version." */
  noun: string;
  /**
   * Both copies changed since this device's last sync: true keeps the
   * repository's, false pushes this device's. Absent, the push wins.
   */
  keepRemote?(remote: T, local: T): boolean;
}

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

/** A record as its file holds it: indented, so it reads in the repository. */
export function serializeRecord(item: unknown): string {
  return `${JSON.stringify(item, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Local edits. Each marks what the next sync has to push.
// ---------------------------------------------------------------------------

const without = (list: readonly string[], id: string) => list.filter((x) => x !== id);
const withId = (list: readonly string[], id: string) => (list.includes(id) ? [...list] : [...list, id]);

/** Add a record, or replace the one with its id, and mark it for the next sync. */
export function upsertRecord<T>(kind: Pick<RecordKind<T>, 'idOf'>, store: RecordStore<T>, item: T): RecordStore<T> {
  const id = kind.idOf(item);
  const exists = store.items.some((x) => kind.idOf(x) === id);
  return {
    ...store,
    items: exists ? store.items.map((x) => (kind.idOf(x) === id ? item : x)) : [...store.items, item],
    dirty: withId(store.dirty, id),
    deleted: without(store.deleted, id),
  };
}

/** Remove a record. Only one the repository has needs deleting there. */
export function removeRecord<T>(kind: Pick<RecordKind<T>, 'idOf'>, store: RecordStore<T>, id: string): RecordStore<T> {
  const shas = { ...store.shas };
  const wasPushed = id in shas;
  delete shas[id];
  return {
    ...store,
    items: store.items.filter((x) => kind.idOf(x) !== id),
    shas,
    dirty: without(store.dirty, id),
    deleted: wasPushed ? withId(store.deleted, id) : without(store.deleted, id),
  };
}

// ---------------------------------------------------------------------------
// The repository
// ---------------------------------------------------------------------------

const idFromName = (name: string) => (name.endsWith('.json') ? name.slice(0, -'.json'.length) : null);

class Client<T> {
  constructor(
    private readonly cfg: GitHubConfig,
    private readonly kind: RecordKind<T>,
    private readonly fetchFn: FetchLike,
  ) {}

  private url(path: string) {
    return `${API}/repos/${encodeURIComponent(this.cfg.owner)}/${encodeURIComponent(this.cfg.repo)}${path}`;
  }

  private pathFor(id: string) {
    return `${this.kind.dir}/${id}.json`;
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
      throw new SyncError('network', `Couldn't reach GitHub. ${this.kind.offline}`);
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

  /** Checks the repository is reachable, so a missing folder can be read as empty. */
  async checkRepo(): Promise<void> {
    const res = await this.request('GET', '');
    if (!res.ok) this.fail(res.status);
  }

  /** Every record file, by id. An absent folder is an empty store. */
  async list(): Promise<Map<string, string>> {
    const res = await this.request('GET', `/contents/${this.kind.dir}`);
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

  async get(id: string): Promise<{ item: T | null; sha: string } | null> {
    const res = await this.request('GET', `/contents/${this.pathFor(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) this.fail(res.status);
    const body = (await res.json()) as Record<string, unknown>;
    if (typeof body['content'] !== 'string' || typeof body['sha'] !== 'string') return null;
    let item: T | null = null;
    try {
      item = this.kind.parse(JSON.parse(fromBase64(body['content'])));
    } catch {
      item = null;
    }
    // A file named for one record that holds another is not that record.
    if (item && this.kind.idOf(item) !== id) item = null;
    return { item, sha: body['sha'] };
  }

  async put(item: T, sha: string | undefined): Promise<string> {
    const id = this.kind.idOf(item);
    const attempt = (currentSha: string | undefined) =>
      this.request('PUT', `/contents/${this.pathFor(id)}`, {
        message: this.kind.putMessage(id),
        content: toBase64(serializeRecord(item)),
        ...(currentSha ? { sha: currentSha } : {}),
      });
    let res = await attempt(sha);
    // 409 / 422: the file moved since we listed it. Re-read and write again.
    if (res.status === 409 || res.status === 422) {
      const current = await this.get(id);
      res = await attempt(current?.sha);
    }
    if (!res.ok) this.fail(res.status);
    const body = (await res.json()) as { content?: { sha?: unknown } };
    const newSha = body.content?.sha;
    if (typeof newSha !== 'string') throw new SyncError('other', `GitHub saved ${this.kind.noun} but returned no version.`);
    return newSha;
  }

  async remove(id: string, sha: string): Promise<void> {
    const res = await this.request('DELETE', `/contents/${this.pathFor(id)}`, {
      message: this.kind.deleteMessage(id),
      sha,
    });
    if (res.status === 404) return;
    if (!res.ok) this.fail(res.status);
  }
}

export interface RecordSyncResult<T> {
  store: RecordStore<T>;
  /** Set when the sync stopped partway. `store` holds whatever finished before it. */
  error?: SyncError;
}

/**
 * Push this device's changes, then pull everything the repository has that
 * this device hasn't seen. Deletions made on another device are applied here.
 */
export async function syncRecords<T>(
  cfg: GitHubConfig,
  kind: RecordKind<T>,
  start: RecordStore<T>,
  fetchFn: FetchLike,
  now: Date = new Date(),
): Promise<RecordSyncResult<T>> {
  const client = new Client(cfg, kind, fetchFn);
  let store: RecordStore<T> = {
    ...start,
    shas: { ...start.shas },
    dirty: [...start.dirty],
    deleted: [...start.deleted],
  };
  const settle = (id: string, sha: string) => {
    store = { ...store, shas: { ...store.shas, [id]: sha }, dirty: store.dirty.filter((x) => x !== id) };
  };
  try {
    await client.checkRepo();
    const remote = await client.list();

    for (const id of start.deleted) {
      const sha = remote.get(id);
      if (sha) await client.remove(id, sha);
      remote.delete(id);
      store = { ...store, deleted: store.deleted.filter((x) => x !== id) };
    }

    for (const id of start.dirty) {
      const item = store.items.find((x) => kind.idOf(x) === id);
      if (!item) {
        store = { ...store, dirty: store.dirty.filter((x) => x !== id) };
        continue;
      }
      // Changed there as well as here since this device last synced it.
      const remoteSha = remote.get(id);
      if (kind.keepRemote && remoteSha !== undefined && remoteSha !== store.shas[id]) {
        const file = await client.get(id);
        if (file?.item && kind.keepRemote(file.item, item)) {
          const pulled = upsertRecord(kind, store, file.item);
          store = pulled;
          settle(id, file.sha);
          remote.set(id, file.sha);
          continue;
        }
      }
      const sha = await client.put(item, remoteSha);
      remote.set(id, sha);
      settle(id, sha);
    }

    for (const [id, sha] of remote) {
      if (store.shas[id] === sha) continue;
      const file = await client.get(id);
      if (!file) continue;
      store = { ...store, shas: { ...store.shas, [id]: file.sha } };
      // A file that doesn't parse is left in the repository and not read.
      if (file.item) {
        store = upsertRecord(kind, store, file.item);
        store = { ...store, dirty: store.dirty.filter((x) => x !== id) };
      }
    }

    // Deleted on another device: once pushed here, now missing there.
    const gone = store.items.filter((x) => {
      const id = kind.idOf(x);
      return id in store.shas && !remote.has(id) && !store.dirty.includes(id);
    });
    if (gone.length) {
      const shas = { ...store.shas };
      for (const x of gone) delete shas[kind.idOf(x)];
      store = { ...store, items: store.items.filter((x) => !gone.includes(x)), shas };
    }

    return { store: { ...store, lastSyncedAt: now.toISOString() } };
  } catch (e) {
    const error = e instanceof SyncError ? e : new SyncError('other', e instanceof Error ? e.message : String(e));
    return { store, error };
  }
}

/**
 * Fold a finished sync into a store that may have changed while it ran: the
 * sync's result is the base, and any record edited, added or deleted here in
 * the meantime is applied on top and left marked for the next sync.
 */
export function mergeRecordsAfterSync<T>(
  kind: Pick<RecordKind<T>, 'idOf'>,
  current: RecordStore<T>,
  started: RecordStore<T>,
  synced: RecordStore<T>,
): RecordStore<T> {
  let out = synced;
  const before = new Map(started.items.map((x) => [kind.idOf(x), x]));
  for (const item of current.items) {
    if (before.get(kind.idOf(item)) !== item) out = upsertRecord(kind, out, item);
  }
  const dropHere = (id: string) => {
    const shas = { ...out.shas };
    const pushed = id in shas;
    delete shas[id];
    out = {
      ...out,
      items: out.items.filter((x) => kind.idOf(x) !== id),
      shas,
      dirty: out.dirty.filter((x) => x !== id),
      deleted: pushed && !out.deleted.includes(id) ? [...out.deleted, id] : out.deleted,
    };
  };
  for (const id of current.deleted) {
    if (started.deleted.includes(id)) continue;
    dropHere(id);
  }
  // A record removed here before it was ever pushed leaves no `deleted`
  // entry. If the sync pushed it in the meantime, the repository now has it,
  // so it needs deleting there too.
  for (const x of started.items) {
    const id = kind.idOf(x);
    if (!current.items.some((c) => kind.idOf(c) === id) && !current.deleted.includes(id)) dropHere(id);
  }
  return out;
}
