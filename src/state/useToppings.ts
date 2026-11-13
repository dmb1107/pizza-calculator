/**
 * The topping ideas' state — WEBSITE-SPEC §13.2 and §13.3 (APP-6).
 *
 * Kept apart from `useAppState` and the bake log on purpose: the ideas have
 * their own store, their own sync run and their own sync state, so a failed
 * toppings sync never holds up the log, and the reverse (§13.3). They share
 * only this device's sign-in. Reset never reaches them, and a
 * shared link never carries them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newIdeaId, photoName, photoTakenOnSave, savedIdea, type IdeaDraft, type ToppingIdea } from '../lib/toppings';
import { browserPhotoStore, photoOfKey, thumbKey, type PhotoStore } from './photoStore';
import type { FetchLike, SyncState } from './repoSync';
import { browserStorage } from './storage';
import {
  loadToppings,
  mergeToppingsAfterSync,
  removeIdea,
  saveToppings,
  syncToppings,
  upsertIdea,
  type ToppingStore,
} from './toppingsStore';

export interface ToppingsState {
  ideas: readonly ToppingIdea[];
  store: ToppingStore;
  /**
   * Save a valid draft as a new idea (`id` null) or over the idea with that
   * id. A new photo picked in the editor comes as `newPhoto` and is named
   * here, since a new idea has no id until now. Returns the idea.
   */
  saveIdea: (draft: IdeaDraft, id: string | null, newPhoto?: NewPhoto | null) => ToppingIdea;
  /** This device's photos (§13.3, APP-8). */
  photos: PhotoStore;
  deleteIdea: (id: string) => void;
  sync: SyncState;
  syncNow: () => void;
  /** Ideas changed or deleted here and not yet pushed. */
  waiting: number;
}

/** A photo picked and shrunk in the editor, not yet saved. */
export interface NewPhoto {
  blob: Blob;
  /** Hex SHA-256 of the JPEG. */
  sha256: string;
  /** The camera's date, or null when the file had none: Save then uses its own time. */
  taken: string | null;
}

/** Four characters that keep two devices' ideas apart when saved in the same second. */
function randomSuffix(): string {
  const bytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * `signedIn` is this device's sign-in (§14.3), held by `useAppState`;
 * `onSignedOut` tells it when this store's sync was answered 401.
 */
export function useToppings(signedIn: boolean, onSignedOut: () => void): ToppingsState {
  const storage = useMemo(() => browserStorage(), []);
  const photos = useMemo(() => browserPhotoStore(), []);
  // Photos saved this session, which a cleanup mustn't take before the
  // store that names them has rendered.
  const keepPhotos = useRef(new Set<string>());
  const [store, setStore] = useState<ToppingStore>(() => loadToppings(storage));
  const [sync, setSync] = useState<SyncState>(() => (signedIn ? { state: 'idle' } : { state: 'signedOut' }));

  useEffect(() => {
    saveToppings(storage, store);
  }, [storage, store]);

  const storeRef = useRef(store);
  storeRef.current = store;

  /** This device's copy of a photo no idea here names any more. */
  const dropLocalPhoto = useCallback(
    (name: string | null) => {
      if (name === null) return;
      void photos.delete(name);
      void photos.delete(thumbKey(name));
    },
    [photos],
  );

  const saveIdea = useCallback(
    (draft: IdeaDraft, id: string | null, newPhoto?: NewPhoto | null) => {
      const at = new Date();
      const previous = id === null ? null : (storeRef.current.items.find((i) => i.id === id) ?? null);
      const ideaId = id ?? newIdeaId(at, randomSuffix());
      let photo = draft.photo;
      if (newPhoto) {
        photo = photoName(ideaId, newPhoto.sha256);
        keepPhotos.current.add(photo);
        // The file before the idea that names it, here as in the repository.
        void photos.put(photo, newPhoto.blob);
      }
      const photo_taken = photoTakenOnSave(draft, photo, newPhoto ?? null, at);
      const idea = savedIdea({ ...draft, photo, photo_taken }, previous, ideaId, at);
      if (previous && previous.photo !== idea.photo) dropLocalPhoto(previous.photo);
      setStore((prev) => upsertIdea(prev, idea));
      return idea;
    },
    [photos, dropLocalPhoto],
  );

  const deleteIdea = useCallback(
    (id: string) => {
      dropLocalPhoto(storeRef.current.items.find((i) => i.id === id)?.photo ?? null);
      setStore((prev) => removeIdea(prev, id));
    },
    [dropLocalPhoto],
  );

  // --- §13.3 sync: the log's loop, run on this store alone ---------------------

  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const onSignedOutRef = useRef(onSignedOut);
  onSignedOutRef.current = onSignedOut;
  const syncing = useRef(false);
  const syncAgain = useRef(false);

  const syncNow = useCallback(async () => {
    if (!signedInRef.current) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSync({ state: 'syncing' });
    const started = storeRef.current;
    const fetchFn: FetchLike = (url, init) => globalThis.fetch(url, init);
    const { store: synced, error } = await syncToppings(started, fetchFn, photos);
    setStore((current) => mergeToppingsAfterSync(current, started, synced));
    // A photo another device replaced or removed: this device's copy goes too.
    void (async () => {
      const keys = await photos.keys();
      // What the sync ended on and what the page now holds: either may not
      // have reached the other yet.
      const named = new Set(
        [...synced.items, ...storeRef.current.items].flatMap((i) => (i.photo === null ? [] : [i.photo])),
      );
      for (const key of keys) {
        const name = photoOfKey(key);
        if (!named.has(name) && !keepPhotos.current.has(name)) void photos.delete(key);
      }
    })();
    syncing.current = false;
    // §14.3: a lapsed sign-in turns the page to signed out; the ideas stay here.
    if (error?.kind === 'signedOut') {
      setSync({ state: 'signedOut' });
      onSignedOutRef.current();
    } else {
      setSync(signedInRef.current ? (error ? { state: 'error', message: error.message } : { state: 'idle' }) : { state: 'signedOut' });
    }
    // A change made while this sync ran gets a sync of its own, once the
    // page has rendered this one's result: started any sooner, it would read
    // `storeRef` from before the merge, fetch every record again and mark each
    // one it pulled as changed here.
    if (syncAgain.current) {
      syncAgain.current = false;
      setRerun((n) => n + 1);
    }
  }, []);

  const [rerun, setRerun] = useState(0);
  useEffect(() => {
    if (rerun > 0) void syncNow();
  }, [rerun, syncNow]);

  // Signing in or out: pull now, or stop. Then pull whenever the page comes
  // back into view.
  useEffect(() => {
    if (!signedIn) {
      setSync({ state: 'signedOut' });
      return;
    }
    if (!syncing.current) setSync({ state: 'idle' });
    void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // Once per sign-in; syncNow is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Push local changes shortly after they happen, so a burst of edits is one sync.
  const waiting = store.dirty.length + store.deleted.length;
  useEffect(() => {
    if (!signedIn || waiting === 0) return;
    const id = setTimeout(() => void syncNow(), 1500);
    return () => clearTimeout(id);
  }, [signedIn, waiting, store, syncNow]);

  return {
    ideas: store.items,
    store,
    saveIdea,
    deleteIdea,
    photos,
    sync,
    syncNow: () => void syncNow(),
    waiting,
  };
}
