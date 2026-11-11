/**
 * The topping ideas' state — WEBSITE-SPEC §13.2 and §13.3 (APP-6).
 *
 * Kept apart from `useAppState` and the bake log on purpose: the ideas have
 * their own store, their own sync run and their own sync state, so a failed
 * toppings sync never holds up the log, and the reverse (§13.3). They share
 * only this device's repository and token. Reset never reaches them, and a
 * shared link never carries them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newIdeaId, savedIdea, type IdeaDraft, type ToppingIdea } from '../lib/toppings';
import type { FetchLike, GitHubConfig, SyncState } from './repoSync';
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
  /** Save a valid draft as a new idea (`id` null) or over the idea with that id. Returns it. */
  saveIdea: (draft: IdeaDraft, id: string | null) => ToppingIdea;
  deleteIdea: (id: string) => void;
  sync: SyncState;
  syncNow: () => void;
  /** Ideas changed or deleted here and not yet pushed. */
  waiting: number;
}

/** Four characters that keep two devices' ideas apart when saved in the same second. */
function randomSuffix(): string {
  const bytes = new Uint8Array(2);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function useToppings(github: GitHubConfig | null): ToppingsState {
  const storage = useMemo(() => browserStorage(), []);
  const [store, setStore] = useState<ToppingStore>(() => loadToppings(storage));
  const [sync, setSync] = useState<SyncState>(() => (github ? { state: 'idle' } : { state: 'off' }));

  useEffect(() => {
    saveToppings(storage, store);
  }, [storage, store]);

  const storeRef = useRef(store);
  storeRef.current = store;

  const saveIdea = useCallback((draft: IdeaDraft, id: string | null) => {
    const at = new Date();
    const previous = id === null ? null : (storeRef.current.items.find((i) => i.id === id) ?? null);
    const idea = savedIdea(draft, previous, id ?? newIdeaId(at, randomSuffix()), at);
    setStore((prev) => upsertIdea(prev, idea));
    return idea;
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setStore((prev) => removeIdea(prev, id));
  }, []);

  // --- §13.3 sync: the log's loop, run on this store alone ---------------------

  const githubRef = useRef(github);
  githubRef.current = github;
  const syncing = useRef(false);
  const syncAgain = useRef(false);

  const syncNow = useCallback(async () => {
    const cfg = githubRef.current;
    if (!cfg) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSync({ state: 'syncing' });
    const started = storeRef.current;
    const fetchFn: FetchLike = (url, init) => globalThis.fetch(url, init);
    const { store: synced, error } = await syncToppings(cfg, started, fetchFn);
    setStore((current) => mergeToppingsAfterSync(current, started, synced));
    setSync(githubRef.current ? (error ? { state: 'error', message: error.message } : { state: 'idle' }) : { state: 'off' });
    syncing.current = false;
    if (syncAgain.current) {
      syncAgain.current = false;
      void syncNow();
    }
  }, []);

  // A token saved or forgotten on the Bake log tab: pull now, or stop.
  // Then pull whenever the page comes back into view.
  useEffect(() => {
    if (!github) {
      setSync({ state: 'off' });
      return;
    }
    if (!syncing.current) setSync({ state: 'idle' });
    void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // Once per token; syncNow is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [github?.token, github?.owner, github?.repo]);

  // Push local changes shortly after they happen, so a burst of edits is one sync.
  const waiting = store.dirty.length + store.deleted.length;
  useEffect(() => {
    if (!github || waiting === 0) return;
    const id = setTimeout(() => void syncNow(), 1500);
    return () => clearTimeout(id);
  }, [github, waiting, store, syncNow]);

  return {
    ideas: store.items,
    store,
    saveIdea,
    deleteIdea,
    sync,
    syncNow: () => void syncNow(),
    waiting,
  };
}
