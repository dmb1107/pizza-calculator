/**
 * §13.2 and §13.3, APP-8 (MESSAGE-73): a photo on each idea. The pure parts
 * (the field, its name, the shrink's size) and the photo half of the ideas'
 * sync, against a fake repository with real folders and the git blobs API.
 *
 * Decoding and encoding a photo need a browser; the WebKit suite does those.
 */
import { describe, expect, it } from 'vitest';
import {
  PHOTO_MAX_EDGE,
  SQUARE_EDGE,
  base64ToBytes,
  bytesToBase64,
  centreSquare,
  fitWithin,
  photoNameFromFile,
  photoNameFromSquareFile,
  photoPath,
  sha256Hex,
  squarePath,
} from '../src/lib/photos';
import { draftOf, isPhotoName, photoName, savedIdea, type ToppingIdea } from '../src/lib/toppings';
import { memoryPhotoStore, photoOfKey, squareKey, thumbKey, type PhotoStore } from '../src/state/photoStore';
import { API, READS_AT_ONCE, fromBase64, serializeRecord, settleInPool, toBase64, type FetchLike } from '../src/state/repoSync';
import {
  EMPTY_TOPPINGS,
  loadToppings,
  mergeToppingsAfterSync,
  parseIdea,
  removeIdea,
  saveToppings,
  syncToppings,
  upsertIdea,
  type ToppingStore,
} from '../src/state/toppingsStore';

function idea(id: string, overrides: Partial<ToppingIdea> = {}): ToppingIdea {
  return {
    id,
    name: `Idea ${id}`,
    pre_bake: 'Tomato',
    post_bake: '',
    notes: '',
    comments: '',
    rating: null,
    photo: null,
    dessert: false,
    portfolio: 'follow',
    photo_taken: null,
    created: '2026-11-01T18:00:00.000Z',
    updated: '2026-11-01T18:00:00.000Z',
    ...overrides,
  };
}

const jpeg = (label: string) => new Blob([`JPEG ${label}`], { type: 'image/jpeg' });
const text = async (b: Blob | null) => (b ? await b.text() : null);

/** A repository with folders: a listing shows files and subfolders, as GitHub's does. */
function fakeRepo() {
  const files = new Map<string, { content: string; sha: string }>();
  const log: string[] = [];
  let n = 0;
  // The Worker's pass through: the page names no repository (§14.2).
  const base = API;
  const reply = (status: number, body: unknown = {}) =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
  const fetchFn: FetchLike = (url, init = {}) => {
    const method = init.method ?? 'GET';
    // The page holds no token, so it never sends one (§14.2).
    if (init.headers && 'Authorization' in init.headers) return reply(400);
    const path = url.slice(base.length);
    log.push(`${method} ${path}`);
    if (path === '') return reply(200, { full_name: 'dave/bake-log' });
    const blob = /^\/git\/blobs\/(.+)$/.exec(path);
    if (blob) {
      const f = [...files.values()].find((x) => x.sha === decodeURIComponent(blob[1]!));
      return f ? reply(200, { sha: f.sha, content: f.content, encoding: 'base64' }) : reply(404);
    }
    const p = path.replace('/contents/', '');
    const body = init.body ? (JSON.parse(init.body) as { content?: string; sha?: string }) : {};
    if (method === 'GET') {
      if (files.has(p)) {
        // Like GitHub past 1 MB: the contents API leaves `content` empty for a photo.
        const f = files.get(p)!;
        return reply(200, p.endsWith('.jpg') ? { sha: f.sha, content: '', encoding: 'none' } : { ...f });
      }
      const entries = new Map<string, { type: string; name: string; sha: string }>();
      for (const [fp, f] of files) {
        if (!fp.startsWith(`${p}/`)) continue;
        const rest = fp.slice(p.length + 1);
        const slash = rest.indexOf('/');
        if (slash === -1) entries.set(rest, { type: 'file', name: rest, sha: f.sha });
        else entries.set(rest.slice(0, slash), { type: 'dir', name: rest.slice(0, slash), sha: 'tree' });
      }
      return entries.size ? reply(200, [...entries.values()]) : reply(404);
    }
    if (method === 'PUT') {
      const current = files.get(p);
      if (current && body.sha !== current.sha) return reply(current && !body.sha ? 422 : 409);
      const sha = `sha${++n}`;
      files.set(p, { content: body.content!, sha });
      return reply(201, { content: { sha } });
    }
    if (method === 'DELETE') {
      if (!files.has(p)) return reply(404);
      files.delete(p);
      return reply(200);
    }
    return reply(405);
  };
  const read = (id: string) => JSON.parse(fromBase64(files.get(`toppings/${id}.json`)!.content)) as ToppingIdea;
  const photo = (name: string) => {
    const f = files.get(photoPath(name));
    return f ? new TextDecoder().decode(base64ToBytes(f.content)) : null;
  };
  const writes = () => log.filter((l) => !l.startsWith('GET'));
  const put = (i: ToppingIdea) => files.set(`toppings/${i.id}.json`, { content: toBase64(serializeRecord(i)), sha: `ext${++n}` });
  return { fetchFn, files, log, read, photo, writes, put };
}

/** A device: its store and its photos. */
async function withPhoto(store: ToppingStore, photos: PhotoStore, base: ToppingIdea, label: string, at: string) {
  const sha = await sha256Hex(new TextEncoder().encode(label));
  const name = photoName(base.id, sha);
  await photos.put(name, jpeg(label));
  const saved = savedIdea({ ...draftOf(base), photo: name }, base, base.id, new Date(at));
  return { store: upsertIdea(store, saved), name };
}

describe('§13.2 the photo field', () => {
  it('reads a missing or null photo as none, and refuses one that is not a safe name', () => {
    const { photo: _p, ...before } = idea('a');
    expect(parseIdea(before)!.photo).toBeNull();
    expect(parseIdea({ ...before, photo: null })!.photo).toBeNull();
    const good = idea('a', { photo: 'a-0123456789ab' });
    expect(parseIdea(good)).toEqual(good);
    for (const photo of ['../a', 'a/b', 'a.jpg', '', 'a b', 7, {}, 'x'.repeat(121)]) {
      expect(parseIdea({ ...good, photo }), JSON.stringify(photo)).toBeNull();
    }
  });

  it("names a photo by its idea and its JPEG's hash, so each new photo is a new name", async () => {
    const one = await sha256Hex(new TextEncoder().encode('one'));
    const two = await sha256Hex(new TextEncoder().encode('two'));
    const id = '2026-11-11-190000-a1f0';
    expect(photoName(id, one)).toBe(`${id}-${one.slice(0, 12)}`);
    expect(photoName(id, one)).not.toBe(photoName(id, two));
    expect(isPhotoName(photoName(id, one))).toBe(true);
    expect(photoPath(photoName(id, one))).toBe(`toppings/images/${id}-${one.slice(0, 12)}.jpg`);
  });

  it('shrinks to 1600 px on the long side, keeping proportions, and never enlarges', () => {
    expect(PHOTO_MAX_EDGE).toBe(1600);
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('round-trips bytes through base64 in chunks', () => {
    const bytes = Uint8Array.from({ length: 200_000 }, (_, i) => (i * 7) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('queues the old photo for deletion on replace, remove and delete, and keeps the queue in storage', () => {
    let store = upsertIdea(EMPTY_TOPPINGS, idea('a', { photo: 'a-111111111111' }));
    expect(store.deletedPhotos).toEqual([]);
    store = upsertIdea(store, idea('a', { photo: 'a-222222222222' }));
    expect(store.deletedPhotos).toEqual(['a-111111111111']);
    store = upsertIdea(store, idea('a', { photo: null }));
    expect(store.deletedPhotos).toEqual(['a-111111111111', 'a-222222222222']);
    store = upsertIdea(store, idea('b', { photo: 'b-333333333333' }));
    store = removeIdea(store, 'b');
    expect(store.deletedPhotos).toEqual(['a-111111111111', 'a-222222222222', 'b-333333333333']);
    const data = new Map<string, string>();
    const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: () => {} };
    saveToppings(s, store);
    expect(loadToppings(s).deletedPhotos).toEqual(store.deletedPhotos);
  });
});

describe('§13.3 photos in the sync', () => {
  it('pushes the photo before the idea that names it', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const { store, name } = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    const { error } = await syncToppings(store, repo.fetchFn, photos);
    expect(error).toBeUndefined();
    expect(repo.writes()).toEqual([`PUT /contents/${photoPath(name)}`, 'PUT /contents/toppings/a.json']);
    expect(repo.photo(name)).toBe('JPEG first');
    expect(repo.read('a').photo).toBe(name);
  });

  it('on a replace: the new photo, then the idea, then the old photo deleted', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const first = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    let { store } = await syncToppings(first.store, repo.fetchFn, photos);
    repo.log.length = 0;
    const second = await withPhoto(store, photos, store.items[0]!, 'second', '2026-11-11T19:10:00Z');
    ({ store } = await syncToppings(second.store, repo.fetchFn, photos));
    expect(repo.writes()).toEqual([
      `PUT /contents/${photoPath(second.name)}`,
      'PUT /contents/toppings/a.json',
      `DELETE /contents/${photoPath(first.name)}`,
    ]);
    expect(repo.photo(first.name)).toBeNull();
    expect(store.deletedPhotos).toEqual([]);

    // Remove: the idea first, then its file.
    repo.log.length = 0;
    store = upsertIdea(store, savedIdea({ ...draftOf(store.items[0]!), photo: null }, store.items[0]!, 'a', new Date('2026-11-11T19:20:00Z')));
    ({ store } = await syncToppings(store, repo.fetchFn, photos));
    expect(repo.writes()).toEqual(['PUT /contents/toppings/a.json', `DELETE /contents/${photoPath(second.name)}`]);
    expect(repo.read('a').photo).toBeNull();
    expect([...repo.files.keys()]).toEqual(['toppings/a.json']);
  });

  it('deletes an idea and its photo', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const first = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    let { store } = await syncToppings(first.store, repo.fetchFn, photos);
    ({ store } = await syncToppings(removeIdea(store, 'a'), repo.fetchFn, photos));
    expect([...repo.files.keys()]).toEqual([]);
    expect(store.deletedPhotos).toEqual([]);
  });

  it('brings a photo to another device through the blobs API, once, and again only when it changes', async () => {
    const repo = fakeRepo();
    const phone = memoryPhotoStore();
    const first = await withPhoto(EMPTY_TOPPINGS, phone, idea('a'), 'first', '2026-11-11T19:00:00Z');
    let { store: phoneStore } = await syncToppings(first.store, repo.fetchFn, phone);

    const laptop = memoryPhotoStore();
    let { store: laptopStore } = await syncToppings(EMPTY_TOPPINGS, repo.fetchFn, laptop);
    expect(laptopStore.items[0]!.photo).toBe(first.name);
    expect(await text(await laptop.get(first.name))).toBe('JPEG first');
    const blobs = () => repo.log.filter((l) => l.startsWith('GET /git/blobs/')).length;
    expect(blobs()).toBe(1);

    ({ store: laptopStore } = await syncToppings(laptopStore, repo.fetchFn, laptop));
    expect(blobs()).toBe(1);

    const second = await withPhoto(phoneStore, phone, phoneStore.items[0]!, 'second', '2026-11-11T19:10:00Z');
    ({ store: phoneStore } = await syncToppings(second.store, repo.fetchFn, phone));
    ({ store: laptopStore } = await syncToppings(laptopStore, repo.fetchFn, laptop));
    expect(blobs()).toBe(2);
    expect(await text(await laptop.get(second.name))).toBe('JPEG second');
  });

  it('a photo follows its idea: two devices replace it, and both end on the copy saved last', async () => {
    const repo = fakeRepo();
    const a = memoryPhotoStore();
    const b = memoryPhotoStore();
    const start = await withPhoto(EMPTY_TOPPINGS, a, idea('x'), 'start', '2026-11-11T18:00:00Z');
    let { store: storeA } = await syncToppings(start.store, repo.fetchFn, a);
    let { store: storeB } = await syncToppings(EMPTY_TOPPINGS, repo.fetchFn, b);

    // A replaces it at 19:00 and is offline; B replaces it at 19:30 and syncs first.
    const fromA = await withPhoto(storeA, a, storeA.items[0]!, 'from A', '2026-11-11T19:00:00Z');
    const fromB = await withPhoto(storeB, b, storeB.items[0]!, 'from B', '2026-11-11T19:30:00Z');
    ({ store: storeB } = await syncToppings(fromB.store, repo.fetchFn, b));
    ({ store: storeA } = await syncToppings(fromA.store, repo.fetchFn, a));

    // B's copy is later, so A keeps it and never uploads its own photo.
    expect(storeA.items[0]!.photo).toBe(fromB.name);
    expect(repo.read('x').photo).toBe(fromB.name);
    expect(await text(await a.get(fromB.name))).toBe('JPEG from B');
    expect(repo.photo(fromA.name)).toBeNull();
    expect(repo.photo(start.name)).toBeNull();
    expect([...repo.files.keys()].sort()).toEqual([photoPath(fromB.name), 'toppings/x.json']);
    expect(storeA.deletedPhotos).toEqual([]);
  });

  it("doesn't delete a photo the winning copy still names", async () => {
    const repo = fakeRepo();
    const a = memoryPhotoStore();
    const start = await withPhoto(EMPTY_TOPPINGS, a, idea('x'), 'start', '2026-11-11T18:00:00Z');
    let { store } = await syncToppings(start.store, repo.fetchFn, a);
    // Another device edits the text at 19:30, keeping the photo.
    repo.put({ ...store.items[0]!, notes: 'later', updated: '2026-11-11T19:30:00.000Z' });
    // This one removed the photo at 19:00, offline.
    store = upsertIdea(store, savedIdea({ ...draftOf(store.items[0]!), photo: null }, store.items[0]!, 'x', new Date('2026-11-11T19:00:00Z')));
    expect(store.deletedPhotos).toEqual([start.name]);
    ({ store } = await syncToppings(store, repo.fetchFn, a));
    expect(store.items[0]!.photo).toBe(start.name);
    expect(repo.photo(start.name)).toBe('JPEG start');
    expect(store.deletedPhotos).toEqual([]);
  });

  it('a photo saved without a token uploads at the first sync after one is set', async () => {
    const photos = memoryPhotoStore();
    const { store, name } = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'offline', '2026-11-11T19:00:00Z');
    const data = new Map<string, string>();
    const s = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: () => {} };
    saveToppings(s, store);
    const repo = fakeRepo();
    const { error } = await syncToppings(loadToppings(s), repo.fetchFn, photos);
    expect(error).toBeUndefined();
    expect(repo.photo(name)).toBe('JPEG offline');
  });

  it('pushes an idea whose photo this device has lost, and shows none for it', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const store = upsertIdea(EMPTY_TOPPINGS, idea('a', { photo: 'a-0123456789ab' }));
    const result = await syncToppings(store, repo.fetchFn, photos);
    expect(result.error).toBeUndefined();
    expect(repo.read('a').photo).toBe('a-0123456789ab');
    expect(await photos.get('a-0123456789ab')).toBeNull();
  });

  it('keeps a photo queued for deletion while a sync ran', () => {
    const started = upsertIdea(EMPTY_TOPPINGS, idea('a', { photo: 'a-111111111111' }));
    const synced = { ...started, dirty: [], shas: { a: 'sha1' } };
    const current = upsertIdea(started, idea('a', { photo: 'a-222222222222', updated: '2026-11-02T00:00:00.000Z' }));
    const merged = mergeToppingsAfterSync(current, started, synced);
    expect(merged.deletedPhotos).toEqual(['a-111111111111']);
    expect(merged.items[0]!.photo).toBe('a-222222222222');
    expect(merged.dirty).toEqual(['a']);
  });

  it('makes no photo requests while no idea has a photo', async () => {
    const repo = fakeRepo();
    await syncToppings(upsertIdea(EMPTY_TOPPINGS, idea('a')), repo.fetchFn, memoryPhotoStore());
    expect(repo.log.some((l) => l.includes('images'))).toBe(false);
  });
});

/** A square copy that names what it was made from, so a test can see which photo it came from. */
const fakeSquare = async (photo: Blob) => new Blob([`SQUARE ${await photo.text()}`], { type: 'image/jpeg' });

describe('§13.3 the square copy', () => {
  it('is the centre of the frame, 600 px a side, never enlarged', () => {
    expect(SQUARE_EDGE).toBe(600);
    expect(centreSquare(1200, 1600, SQUARE_EDGE)).toEqual({ sx: 0, sy: 200, side: 1200, edge: 600 });
    expect(centreSquare(1600, 1200, SQUARE_EDGE)).toEqual({ sx: 200, sy: 0, side: 1200, edge: 600 });
    expect(centreSquare(400, 300, SQUARE_EDGE)).toEqual({ sx: 50, sy: 0, side: 300, edge: 300 });
  });

  it("has a file name an older app doesn't read as a photo, and keys that belong to the photo", () => {
    expect(squarePath('a-0123456789ab')).toBe('toppings/images/a-0123456789ab.square.jpg');
    expect(photoNameFromSquareFile('a-0123456789ab.square.jpg')).toBe('a-0123456789ab');
    expect(photoNameFromSquareFile('a-0123456789ab.jpg')).toBeNull();
    expect(photoNameFromFile('a-0123456789ab.square.jpg')).toBeNull();
    for (const key of ['a-0123456789ab', thumbKey('a-0123456789ab'), squareKey('a-0123456789ab')]) {
      expect(photoOfKey(key)).toBe('a-0123456789ab');
    }
  });

  it('is uploaded after the photo and the idea, and kept on the device', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const { store, name } = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    const { error } = await syncToppings(store, repo.fetchFn, photos, new Date(), fakeSquare);
    expect(error).toBeUndefined();
    expect(repo.writes()).toEqual([
      `PUT /contents/${photoPath(name)}`,
      'PUT /contents/toppings/a.json',
      `PUT /contents/${squarePath(name)}`,
    ]);
    expect(new TextDecoder().decode(base64ToBytes(repo.files.get(squarePath(name))!.content))).toBe('SQUARE JPEG first');
    expect(await text(await photos.get(squareKey(name)))).toBe('SQUARE JPEG first');

    repo.log.length = 0;
    await syncToppings(store, repo.fetchFn, photos, new Date(), fakeSquare);
    expect(repo.writes().filter((w) => w.includes('square'))).toEqual([]);
  });

  it('is made for a photo the repository has without one, by a device holding the photo, once', async () => {
    const repo = fakeRepo();
    const phone = memoryPhotoStore();
    const { store, name } = await withPhoto(EMPTY_TOPPINGS, phone, idea('a'), 'first', '2026-11-11T19:00:00Z');
    await syncToppings(store, repo.fetchFn, phone);
    expect(repo.files.has(squarePath(name))).toBe(false);

    // Another device fetches the photo, then makes the square copy from it.
    const laptop = memoryPhotoStore();
    repo.log.length = 0;
    const { store: laptopStore } = await syncToppings(EMPTY_TOPPINGS, repo.fetchFn, laptop, new Date(), fakeSquare);
    expect(repo.writes()).toEqual([`PUT /contents/${squarePath(name)}`]);
    repo.log.length = 0;
    await syncToppings(laptopStore, repo.fetchFn, laptop, new Date(), fakeSquare);
    expect(repo.writes()).toEqual([]);
  });

  it('goes with its photo, on a replace and on a delete', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const first = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    let { store } = await syncToppings(first.store, repo.fetchFn, photos, new Date(), fakeSquare);
    const second = await withPhoto(store, photos, store.items[0]!, 'second', '2026-11-11T19:10:00Z');
    repo.log.length = 0;
    ({ store } = await syncToppings(second.store, repo.fetchFn, photos, new Date(), fakeSquare));
    expect(repo.writes()).toEqual([
      `PUT /contents/${photoPath(second.name)}`,
      'PUT /contents/toppings/a.json',
      `DELETE /contents/${photoPath(first.name)}`,
      `DELETE /contents/${squarePath(first.name)}`,
      `PUT /contents/${squarePath(second.name)}`,
    ]);
    ({ store } = await syncToppings(removeIdea(store, 'a'), repo.fetchFn, photos, new Date(), fakeSquare));
    expect([...repo.files.keys()]).toEqual([]);
  });

  it('goes when another device deleted its photo without it', async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const { store } = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    repo.files.set(squarePath('gone-0123456789ab'), { content: bytesToBase64(new Uint8Array([1])), sha: 'orphan' });
    await syncToppings(store, repo.fetchFn, photos, new Date(), fakeSquare);
    expect(repo.writes()).toContain(`DELETE /contents/${squarePath('gone-0123456789ab')}`);
    expect(repo.files.has(squarePath('gone-0123456789ab'))).toBe(false);
  });

  it("never fails the sync when one can't be made", async () => {
    const repo = fakeRepo();
    const photos = memoryPhotoStore();
    const { store, name } = await withPhoto(EMPTY_TOPPINGS, photos, idea('a'), 'first', '2026-11-11T19:00:00Z');
    const { store: synced, error } = await syncToppings(store, repo.fetchFn, photos, new Date(), () => Promise.reject(new Error('no canvas')));
    expect(error).toBeUndefined();
    expect(synced.dirty).toEqual([]);
    expect(repo.read('a').photo).toBe(name);
    expect(repo.files.has(squarePath(name))).toBe(false);
  });
});

describe('§13.3 reading several at once', () => {
  it('keeps at most READS_AT_ONCE running, and each result at its index', async () => {
    let running = 0;
    let most = 0;
    const results = await settleInPool([...Array(20).keys()], async (i) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, (i * 7) % 5));
      running--;
      return i * 2;
    });
    expect(most).toBe(READS_AT_ONCE);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : null))).toEqual([...Array(20).keys()].map((i) => i * 2));
  });

  it('starts nothing new after a failure', async () => {
    const started: number[] = [];
    const results = await settleInPool(
      [...Array(20).keys()],
      async (i) => {
        started.push(i);
        if (i === 2) throw new Error('offline');
        await new Promise((r) => setTimeout(r, 1));
        return i;
      },
      3,
    );
    expect(results[2]?.status).toBe('rejected');
    expect(started.length).toBeLessThan(20);
  });

  it('brings a new device every idea and photo with reads in flight together', async () => {
    const repo = fakeRepo();
    const phone = memoryPhotoStore();
    let store = EMPTY_TOPPINGS;
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      ({ store } = await withPhoto(store, phone, idea(id), `photo ${id}`, '2026-11-11T19:00:00Z'));
    }
    await syncToppings(store, repo.fetchFn, phone);

    let running = 0;
    let most = 0;
    const slow: FetchLike = async (url, init) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 2));
      try {
        return await repo.fetchFn(url, init);
      } finally {
        running--;
      }
    };
    const laptop = memoryPhotoStore();
    const { store: laptopStore, error } = await syncToppings(EMPTY_TOPPINGS, slow, laptop);
    expect(error).toBeUndefined();
    expect(laptopStore.items.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    for (const i of laptopStore.items) expect(await text(await laptop.get(i.photo!))).toBe(`JPEG photo ${i.id}`);
    expect(most).toBe(READS_AT_ONCE);
  });

  it('keeps the ideas read before a failed read', async () => {
    const repo = fakeRepo();
    for (const id of ['a', 'b', 'c', 'd']) repo.put(idea(id));
    const failing: FetchLike = (url, init) =>
      url.endsWith('/contents/toppings/c.json') ? Promise.reject(new TypeError('Failed to fetch')) : repo.fetchFn(url, init);
    const { store, error } = await syncToppings(EMPTY_TOPPINGS, failing, memoryPhotoStore());
    expect(error).toBeDefined();
    expect(store.items.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });
});
