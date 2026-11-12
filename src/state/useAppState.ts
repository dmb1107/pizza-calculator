/**
 * State wiring — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * The inputs are stored and written to the URL (§6 *Where the inputs are
 * kept*, MESSAGE-65). Which wins on load is `resolveInitialInputs`: a
 * home-screen app takes what is stored, a browser takes a link over what is
 * stored, and a bare URL takes what is stored. A shared link shows the
 * sender's setup, while the recipient's own calibration and preferences still
 * apply underneath it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculate, computeCapacity, computeFormula, defaultDdtFor, type CalculatorResult, type Warning } from '../lib/engine';
import {
  ffInUse,
  frictionBadge,
  mixSizeValue,
  type BadgeTone,
  type FfInUse,
  type LoggedBake,
  type MixSize,
} from '../lib/bakeLog';
import { capacityAlerts, raisedNote, splitHint } from '../lib/capacity';
import { stepToEvenSplit } from '../lib/ballCounts';
import { timersAfterTick } from '../lib/stepInstances';
import { toggledClosedGroups } from '../lib/stepGroups';
import {
  roundToNextQuarterHour,
  socialWindows,
  timelineFor,
  type ClockWindow,
  type ScheduleAdjustments,
  type Timeline,
} from '../lib/timeline';
import { resumedTimer, stoppedTimer, timerDueAt, type RunningTimer, type TimerSpec } from '../lib/timers';
import {
  applyInput,
  clampField,
  inputsForNewBake,
  type BoundedField,
} from './defaults';
import { browserStorage, loadPersisted, savePersisted } from './storage';
import {
  loadLog,
  removeBake,
  saveLog,
  setMixExcluded as setLogMixExcluded,
  upsertBake,
  type LocalLog,
} from './bakeLogStore';
import { mergeAfterSync, syncLog, type FetchLike } from './githubSync';
import type { SyncState } from './repoSync';
import {
  checkSession,
  createPasskey as createPasskeyAt,
  loadSignedIn,
  saveSignedIn,
  signInWithPasskey,
  signOutOfWorker,
  type AuthFetch,
  type AuthOutcome,
  type WebAuthnCalls,
} from './auth';
import { newBakeId, saveConflict, sessionBake } from './sessionBake';
import { encodeInputs } from './url';
import { initialTab, isStandalone, persistedForNewBake, resolveInitialInputs, storedInputsOf } from './storedInputs';
import type { Tab } from '../lib/tabs';
import { tokenValues } from '../lib/bindTokens';
import type {
  Calibration,
  Inputs,
  PanelPrefs,
  Persisted,
  ReadingField,
  TimelineMode,
} from './types';

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/** The FF in use and the badge Panel 2 shows for it (§6). */
export type FrictionInUse = FfInUse & { badge: { text: string; tone: BadgeTone } };

export type { SyncState } from './repoSync';

/** Per-mix readings, as opposed to the two that belong to the whole bake. */
type PerMixReading = Exclude<ReadingField, 'roomTempF' | 'flourTempF'>;
const isPerMix = (f: ReadingField): f is PerMixReading => f !== 'roomTempF' && f !== 'flourTempF';

/**
 * Set one entry of a per-mix list, padding any gap with `blank`. Biga readings
 * pad by carrying the last entry forward (§6: the same biga, until re-read);
 * the rest are read by index, so a gap stays unread.
 */
function withEntry<T>(list: readonly T[], index: number, value: T, blank: T, carry = false): T[] {
  const next = [...list];
  while (next.length <= index) next.push(carry && next.length > 0 ? next[next.length - 1]! : blank);
  next[index] = value;
  return next;
}

/**
 * The biga start a stored value names, or now if it names none: a resumed
 * session keeps the time the biga actually went in, and a fresh one (or one
 * just Reset) starts from now, since that is when the baker is at the counter.
 */
function bigaStartFrom(iso: string): Date {
  return iso ? new Date(iso) : roundToNextQuarterHour(new Date());
}

/** Push the inputs into the address bar without adding a history entry. */
function syncUrl(inputs: Inputs): void {
  if (typeof window === 'undefined') return;
  const qs = encodeInputs(inputs);
  const { pathname, hash } = window.location;
  const next = qs ? `${pathname}?${qs}${hash}` : `${pathname}${hash}`;
  // replaceState, not pushState: dragging a slider must not fill the back stack.
  window.history.replaceState(null, '', next);
}

export interface AppState {
  inputs: Inputs;
  setInput: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void;
  /** Commit a numeric field, clamped to its bounds. Call on blur, not keystroke. */
  commitNumber: (key: BoundedField & keyof Inputs, value: number) => void;
  /** Nudge a numeric field by a delta, applied to current state and clamped. */
  stepNumber: (key: BoundedField & keyof Inputs, delta: number) => void;

  calibration: Calibration;
  /** §6: the FF in use for the current mix size, from the bake log, with its badge. */
  friction: FrictionInUse;
  /** §6: balls per mix, possibly fractional. For labels; compare `mixSizeKey`. */
  mixSize: number;
  /** §6: the mix size as the pair it comes from, compared exactly. */
  mixSizeKey: MixSize;
  setDdtOverride: (ddtF: number | null) => void;

  /** §10: set a reading. `index` is the mix (0-based) for per-mix readings. */
  commitReading: (field: ReadingField, value: number, index?: number) => void;
  /** Clear a per-mix reading back to unread (the final temperature's "Clear"). */
  clearReading: (field: PerMixReading, index: number) => void;
  /**
   * §10: the page's Reset, and its only one. Puts every input (the batch
   * settings, the schedule's adjustments and today's readings), the DDT
   * override and the timeline's anchor back to their defaults and clears the
   * step checkboxes and the timers; the saved bakes stay, and the next save
   * is a new bake.
   */
  startNewBake: () => void;
  /**
   * How many times Reset has run. The fields Reset changes are keyed on it,
   * so they remount with the reset values: a field's text follows its value
   * only when the value changes, so a reading still being edited when Reset
   * ran (iOS keeps a field focused through a button tap) kept its typed text
   * and recorded it on leaving.
   */
  resetCount: number;

  /** The bake log's local copy. */
  log: LocalLog;
  /** The session as it would be logged now (§10). */
  sessionDraft: LoggedBake;
  /** The bake saved since the last Reset, '' before it saves. */
  sessionBakeId: string;
  /**
   * §10: the saved bake when it is dated before the draft, so a save would
   * overwrite a finished bake after a forgotten Reset. The card asks.
   */
  saveConflict: LoggedBake | null;
  /**
   * Save the inputs as they stand. 'replace' writes over the bake saved since
   * the last Reset, if there is one; 'new' saves a bake of its own.
   */
  saveSessionBake: (mode?: 'replace' | 'new') => void;
  /** §10: Dave's switch. */
  setMixExcluded: (bakeId: string, mixIndex: number, excluded: boolean) => void;
  deleteBake: (bakeId: string) => void;
  /**
   * §14.3: whether this device is signed in to the Worker. Signed out, the
   * log and the ideas stay in this browser and nothing syncs.
   */
  signedIn: boolean;
  /** A sync answered 401: the sign-in lapsed or ended elsewhere. Local copies stay. */
  markSignedOut: () => void;
  signIn: () => Promise<AuthOutcome>;
  createPasskey: (setupCode: string) => Promise<AuthOutcome>;
  signOut: () => Promise<AuthOutcome>;
  sync: SyncState;
  syncNow: () => void;
  /** The DDT actually in use, whether overridden or automatic. */
  ddtF: number;
  autoDdtF: number;

  panels: PanelPrefs;
  togglePanel: (panel: keyof PanelPrefs) => void;

  /** The shared clock, epoch ms. Ticks each second while a timer runs. */
  nowMs: number;
  /** Timers the user has started, keyed by step. */
  timers: RunningTimer[];
  startTimer: (stepId: string, spec: TimerSpec) => void;
  /** Freeze a running timer. A stopped mixer phase is a logged phase time (§10). */
  stopTimer: (stepId: string) => void;
  /** §7.5 (APP-4): carry a stopped timer on; the time it was stopped doesn't count. */
  resumeTimer: (stepId: string) => void;
  /** Remove a timer, running or stopped. */
  clearTimer: (stepId: string) => void;
  /** Step ids whose timer has passed its earliest moment since being started. */
  dueTimerStepIds: string[];

  /** Step ids ticked off, persisted across reloads. */
  checkedSteps: ReadonlySet<string>;
  toggleStep: (id: string) => void;
  /**
   * §7.5 (APP-5): the step groups closed from their headings, as stored. Keys
   * for groups this batch size doesn't have are in here too, and are ignored
   * where the list is drawn (`closedGroupsIn`).
   */
  closedGroups: readonly string[];
  toggleGroup: (key: string) => void;
  /** {token} bindings for step and concept prose. */
  tokens: Record<string, string>;
  /** §7.3's capacity messages: what the strip shows, in order. */
  alerts: Warning[];
  /** §6 Panel 1: "→ {nMix} mixes of {ballsPerMix} balls ({doughPerMix} g each)", or null for a single mix. */
  ballsSplitHint: string | null;
  /** §6 Panel 1 (MESSAGE-61): "Raised to {balls} balls…" while the app's round-up holds, else null. */
  ballsRaisedNote: string | null;
  /** The schedule inputs behind `tokens`, so per-instance tables can be rebuilt. */
  scheduleTokens: {
    bigaFridgeH: number;
    bigaRoomOnlyH: number;
    coldFermentH: number;
    temperH: number;
  };

  /** Forward mode's anchor: when the biga goes in. In backward mode read `timeline.startsAt`. */
  bigaStartAt: Date;
  setBigaStartAt: (at: Date) => void;
  /**
   * The biga is going in now. Always lands in forward mode: once it has gone
   * in, the start is a fact, and a measured dough temperature should move the
   * bake rather than rewrite the start.
   */
  startNow: () => void;
  /** §4.7: which end is held. */
  timelineMode: TimelineMode;
  /** Switches mode without moving anything: the held end is taken from the schedule as shown. */
  setTimelineMode: (mode: TimelineMode) => void;
  /** Backward mode's anchor. Null until backward mode is first used. */
  bakeAt: Date | null;
  setBakeAt: (at: Date) => void;
  timeline: Timeline;
  /** Anchor times on the anchor's own day that keep every step out of 00:00–06:00. */
  daylightWindows: ClockWindow[];
  /** The clock time-based UI reads from. */
  now: Date;

  result: CalculatorResult;
  /** Absolute link reproducing the current inputs. */
  shareUrl: string;

  /** §13.1 (APP-6): the open tab, stored. */
  tab: Tab;
  setTab: (tab: Tab) => void;
}

export function useAppState(): AppState {
  const storage = useMemo(() => browserStorage(), []);

  // Read storage once, then decide the inputs by §6's load rule: the stored
  // ones, the URL's, or the defaults. The bowl mass is a constant
  // (MESSAGE-29), and a stored or linked value from before is ignored.
  const initial = useMemo(() => {
    const persisted = loadPersisted(storage);
    const resolved = resolveInitialInputs({
      search: currentSearch(),
      stored: persisted.inputsQuery,
      standalone: isStandalone(),
    });
    return {
      persisted,
      inputs: resolved.inputs,
      ballsAskedFor: resolved.ballsAskedFor,
      tab: initialTab(persisted.tab, resolved, persisted.inputsQuery),
    };
  }, [storage]);

  const [inputs, setInputs] = useState<Inputs>(initial.inputs);
  /**
   * §6 (MESSAGE-61). The ball count the baker (or a link) chose, when the app
   * has since raised it to split evenly; null when the count in use is the one
   * chosen. Derived by comparison, so no updater needs a side effect: the
   * stepper clears it, and a ball-weight change records the count it started
   * from.
   */
  const [ballsChosen, setBallsChosen] = useState<number | null>(initial.ballsAskedFor);
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const [calibration, setCalibration] = useState<Calibration>(initial.persisted.calibration);
  const [panels, setPanels] = useState<PanelPrefs>(initial.persisted.panels);
  const [bigaStartAt, setBigaStartAt] = useState<Date>(() => bigaStartFrom(initial.persisted.bigaStartAtIso));

  const [timelineMode, setTimelineModeRaw] = useState<TimelineMode>(initial.persisted.timelineMode);
  const [bakeAt, setBakeAt] = useState<Date | null>(() =>
    initial.persisted.bakeAtIso ? new Date(initial.persisted.bakeAtIso) : null,
  );

  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(
    () => new Set(initial.persisted.checkedSteps),
  );
  const [closedGroups, setClosedGroups] = useState<string[]>(initial.persisted.closedGroups);
  const [timers, setTimers] = useState<RunningTimer[]>(initial.persisted.timers);
  const [sessionBakeId, setSessionBakeId] = useState<string>(initial.persisted.sessionBakeId);
  const [tab, setTab] = useState<Tab>(initial.tab);

  // §2 / §10: the log's local copy, written first; the repository follows.
  const [log, setLog] = useState<LocalLog>(() => loadLog(storage));
  // §14.3: the sign-in is the Worker's cookie; this is the page's note of it.
  const [signedIn, setSignedInState] = useState<boolean>(() => loadSignedIn(storage));
  const [sync, setSync] = useState<SyncState>(() => (signedIn ? { state: 'idle' } : { state: 'signedOut' }));

  /**
   * The clock everything time-based reads from.
   *
   * One second while a timer is running, one minute otherwise. Timers need the
   * finer resolution; the timeline's "you are here" marker does not, and a
   * permanent 1 Hz re-render would be pure waste on a page left open for two
   * days.
   */
  const [now, setNow] = useState<Date>(() => new Date());
  // A stopped timer holds its time, so only a running one needs the fast tick.
  const hasTimers = timers.some((t) => t.stoppedAt == null);
  useEffect(() => {
    const period = hasTimers ? 1_000 : 60_000;
    const id = setInterval(() => setNow(new Date()), period);
    return () => clearInterval(id);
  }, [hasTimers]);

  // The first persist writes only the inputs and the tab, and only when they
  // differ from what was stored: a link is stored when it loads (MESSAGE-65),
  // not at the first edit after it, and so is the Recipe tab it opened on
  // (§13.1), or a reload straight after would return to the stored tab. The
  // rest would only write back what we just read, and writing it would fix a
  // fresh session's biga start ('' reads as now).
  const hydrated = useRef(false);

  useEffect(() => {
    syncUrl(inputs);
  }, [inputs]);

  const persisted = useMemo<Persisted>(
    () => ({
      calibration,
      panels,
      bigaStartAtIso: bigaStartAt.toISOString(),
      timelineMode,
      bakeAtIso: bakeAt ? bakeAt.toISOString() : '',
      checkedSteps: [...checkedSteps],
      closedGroups,
      timers,
      sessionBakeId,
      // §6: every change to an input writes storage and the URL together.
      inputsQuery: storedInputsOf(inputs),
      tab,
    }),
    [calibration, panels, bigaStartAt, timelineMode, bakeAt, checkedSteps, closedGroups, timers, sessionBakeId, inputs, tab],
  );

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      if (persisted.inputsQuery !== initial.persisted.inputsQuery || persisted.tab !== initial.persisted.tab) {
        savePersisted(storage, { ...initial.persisted, inputsQuery: persisted.inputsQuery, tab: persisted.tab });
      }
      return;
    }
    savePersisted(storage, persisted);
  }, [storage, persisted, initial]);

  useEffect(() => {
    saveLog(storage, log);
  }, [storage, log]);

  const setInput = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    if (key === 'ballWeightG') {
      const before = inputsRef.current.balls;
      setBallsChosen((chosen) => chosen ?? before);
    }
    if (key === 'balls') setBallsChosen(typeof value === 'number' ? value : null);
    setInputs((prev) => applyInput(prev, key, value));
  }, []);

  const commitNumber = useCallback(
    (key: BoundedField & keyof Inputs, value: number) => {
      if (!Number.isFinite(value)) return;
      setInput(key, clampField(key, value) as Inputs[typeof key]);
    },
    [setInput],
  );

  /**
   * Applied against current state rather than a captured value, so a fast
   * double-tap on the stepper can't resolve twice to the same number and
   * silently drop a step.
   */
  const stepNumber = useCallback((key: BoundedField & keyof Inputs, delta: number) => {
    // §6 (MESSAGE-61): the stepper skips a count that doesn't split evenly,
    // in the direction of the step, so it never raises one.
    if (key === 'balls') setBallsChosen(null);
    setInputs((prev) => {
      const current = prev[key];
      if (typeof current !== 'number') return prev;
      const next = key === 'balls' ? stepToEvenSplit(current, prev.ballWeightG, delta) : clampField(key, current + delta);
      return applyInput(prev, key, next as Inputs[typeof key]);
    });
  }, []);

  // --- §10 readings ---------------------------------------------------------

  const writeReading = useCallback((field: ReadingField, value: number, index: number) => {
    const v = clampField(field, value);
    setInputs((prev) => {
      if (!isPerMix(field)) {
        const next = { ...prev, [field]: v };
        if (field === 'roomTempF' && next.flourSameAsRoom) next.flourTempF = v;
        return next;
      }
      if (field === 'bigaTempF') return { ...prev, bigaTempF: withEntry(prev.bigaTempF, index, v, v, true) };
      return { ...prev, [field]: withEntry<number | null>(prev[field], index, v, null) };
    });
  }, []);

  const commitReading = useCallback(
    (field: ReadingField, value: number, index = 0) => {
      if (!Number.isFinite(value)) return;
      writeReading(field, value, index);
    },
    [writeReading],
  );

  const clearReading = useCallback((field: PerMixReading, index: number) => {
    setInputs((prev) => ({ ...prev, [field]: withEntry<number | null>(prev[field], index, null, null) }));
  }, []);

  // --- §6 the FF in use, from the log -----------------------------------------

  // Keyed on the pair, compared exactly: 12 balls in two mixes reads the 6 entry.
  const mixSizeKey = useMemo<MixSize>(
    () => ({
      balls: inputs.balls,
      nMix: computeCapacity(computeFormula({ balls: inputs.balls, ballWeightG: inputs.ballWeightG })).nMix,
    }),
    [inputs.balls, inputs.ballWeightG],
  );
  const mixSize = mixSizeValue(mixSizeKey);

  const friction = useMemo<FrictionInUse>(() => {
    const inUse = ffInUse(log.bakes, mixSizeKey);
    return { ...inUse, badge: frictionBadge(inUse) };
  }, [log.bakes, mixSizeKey]);

  const setDdtOverride = useCallback((ddtF: number | null) => {
    setCalibration((prev) => ({
      ...prev,
      ddtOverrideF: ddtF === null ? null : clampField('ddtOverrideF', ddtF),
    }));
  }, []);

  const togglePanel = useCallback((panel: keyof PanelPrefs) => {
    setPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const result = useMemo(
    () =>
      calculate({
        balls: inputs.balls,
        ballWeightG: inputs.ballWeightG,
        roomTempF: inputs.roomTempF,
        flourTempF: inputs.flourSameAsRoom ? inputs.roomTempF : inputs.flourTempF,
        bigaTempF: inputs.bigaTempF,
        bowlTempF: inputs.bowlTempF,
        frictionFactorF: friction.ff,
        ddtOverrideF: calibration.ddtOverrideF,
        finalDoughTempF: inputs.finalDoughTempF,
      }),
    [inputs, friction.ff, calibration.ddtOverrideF],
  );

  // --- §10 the session as a bake, and the log ---------------------------------

  // The draft is the inputs as they stand (§10). When saving it would write
  // over a bake from an earlier date, the card asks first.
  const sessionDraft = useMemo(
    () => sessionBake({ inputs, result, timers }, now, sessionBakeId || newBakeId(now)),
    [inputs, result, timers, now, sessionBakeId],
  );
  const conflict = useMemo(() => saveConflict(log, sessionBakeId, sessionDraft), [log, sessionBakeId, sessionDraft]);

  const saveSessionBake = useCallback(
    (mode: 'replace' | 'new' = 'replace') => {
      const at = new Date();
      const id = mode === 'new' || !sessionBakeId ? newBakeId(at) : sessionBakeId;
      const bake = sessionBake({ inputs, result, timers }, at, id);
      setLog((prev) => upsertBake(prev, bake));
      setSessionBakeId(id);
    },
    [inputs, result, timers, sessionBakeId],
  );

  const setMixExcluded = useCallback((bakeId: string, mixIndex: number, excluded: boolean) => {
    setLog((prev) => setLogMixExcluded(prev, bakeId, mixIndex, excluded));
  }, []);

  const deleteBake = useCallback(
    (bakeId: string) => {
      setLog((prev) => removeBake(prev, bakeId));
      if (bakeId === sessionBakeId) setSessionBakeId('');
    },
    [sessionBakeId],
  );

  // --- §2 sync ----------------------------------------------------------------

  const logRef = useRef(log);
  logRef.current = log;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const syncing = useRef(false);
  const syncAgain = useRef(false);

  const setSignedIn = useCallback(
    (value: boolean) => {
      saveSignedIn(storage, value);
      signedInRef.current = value;
      setSignedInState(value);
      if (!value) setSync({ state: 'signedOut' });
      else if (!syncing.current) setSync({ state: 'idle' });
    },
    [storage],
  );
  const markSignedOut = useCallback(() => setSignedIn(false), [setSignedIn]);

  const syncNow = useCallback(async () => {
    if (!signedInRef.current) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSync({ state: 'syncing' });
    const started = logRef.current;
    const fetchFn: FetchLike = (url, init) => globalThis.fetch(url, init);
    const { log: synced, error } = await syncLog(started, fetchFn);
    // Whatever the sync fetched is kept, even when it stopped partway.
    setLog((current) => mergeAfterSync(current, started, synced));
    syncing.current = false;
    // §14.3: a 401 is a lapsed sign-in. The local copies stay and sync after
    // the next sign-in.
    if (error?.kind === 'signedOut') setSignedIn(false);
    else setSync(signedInRef.current ? (error ? { state: 'error', message: error.message } : { state: 'idle' }) : { state: 'signedOut' });
    if (syncAgain.current) {
      syncAgain.current = false;
      void syncNow();
    }
  }, [setSignedIn]);

  // The Worker's answer replaces the page's note of the sign-in, on load and
  // whenever the page comes back into view. No answer (offline, or no Worker
  // under `npm run dev`) leaves the note as it is.
  useEffect(() => {
    const fetchFn: AuthFetch = (url, init) => globalThis.fetch(url, init);
    const check = async () => {
      const answer = await checkSession(fetchFn);
      if (answer !== null && answer !== signedInRef.current) setSignedIn(answer);
    };
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [setSignedIn]);

  const webauthn = useMemo<WebAuthnCalls>(
    () => ({
      startRegistration: async (args) => (await import('@simplewebauthn/browser')).startRegistration(args),
      startAuthentication: async (args) => (await import('@simplewebauthn/browser')).startAuthentication(args),
    }),
    [],
  );
  const authFetch = useCallback<AuthFetch>((url, init) => globalThis.fetch(url, init), []);

  const signIn = useCallback(async () => {
    const outcome = await signInWithPasskey(authFetch, webauthn);
    if (outcome.ok) setSignedIn(true);
    return outcome;
  }, [authFetch, webauthn, setSignedIn]);

  const createPasskey = useCallback(
    async (setupCode: string) => {
      const outcome = await createPasskeyAt(authFetch, webauthn, setupCode);
      if (outcome.ok) setSignedIn(true);
      return outcome;
    },
    [authFetch, webauthn, setSignedIn],
  );

  const signOut = useCallback(async () => {
    const outcome = await signOutOfWorker(authFetch);
    if (outcome.ok) setSignedIn(false);
    return outcome;
  }, [authFetch, setSignedIn]);

  // Pull on signing in, and whenever the page comes back into view: the other
  // device may have logged a bake since.
  useEffect(() => {
    if (!signedIn) return;
    void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [signedIn, syncNow]);

  // Push local changes shortly after they happen, so a burst of edits is one sync.
  const pending = log.dirty.length + log.deleted.length;
  useEffect(() => {
    if (!signedIn || pending === 0) return;
    const id = setTimeout(() => void syncNow(), 1500);
    return () => clearTimeout(id);
  }, [signedIn, pending, log, syncNow]);

  const adjustments = useMemo<ScheduleAdjustments>(
    () => ({
      bigaFridgeH: inputs.bigaFridgeH,
      bigaRoomOnlyH: inputs.bigaRoomOnlyH,
      // §4.8: computed from each dough's final reading, not chosen. The
      // timeline plans the last dough's; the earlier ones print beside it.
      ballRoomTempH: result.roomMinutes / 60,
      earlierRisesH: result.roomMinutesByDough.slice(0, -1).map((m) => m / 60),
      nMix: result.capacity.nMix,
      ballsPerMix: inputs.balls / result.capacity.nMix,
      coldFermentH: inputs.coldFermentH,
      temperH: inputs.temperH,
    }),
    [
      inputs.bigaFridgeH,
      inputs.bigaRoomOnlyH,
      result.roomMinutes,
      result.roomMinutesByDough,
      result.capacity.nMix,
      inputs.balls,
      inputs.coldFermentH,
      inputs.temperH,
    ],
  );

  const timeline = useMemo(
    () =>
      timelineFor({ mode: timelineMode, bigaStartAt, bakeAt, schedule: inputs.schedule, adjustments, now }),
    [timelineMode, bigaStartAt, bakeAt, inputs.schedule, adjustments, now],
  );

  // Keyed on the anchor's calendar day, not the instant, so dragging the time
  // within a day doesn't rescan.
  const anchor = timelineMode === 'backward' ? timeline.bakeAt : timeline.startsAt;
  const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).getTime();
  const daylightWindows = useMemo(
    () => socialWindows({ mode: timelineMode, day: new Date(anchorDay), schedule: inputs.schedule, adjustments }),
    [timelineMode, anchorDay, inputs.schedule, adjustments],
  );

  const setTimelineMode = useCallback(
    (mode: TimelineMode) => {
      if (mode === timelineMode) return;
      // Hand the other end over exactly as it is shown, so the switch itself
      // moves nothing; only what happens next differs.
      if (mode === 'backward') setBakeAt(timeline.bakeAt);
      else setBigaStartAt(timeline.startsAt);
      setTimelineModeRaw(mode);
    },
    [timelineMode, timeline.bakeAt, timeline.startsAt],
  );

  // Backward mode holds a bake time. Reset clears it, so take the one the reset
  // start implies, exactly as switching to backward mode hands it over.
  useEffect(() => {
    if (timelineMode === 'backward' && bakeAt === null) setBakeAt(timeline.bakeAt);
  }, [timelineMode, bakeAt, timeline.bakeAt]);

  const startNow = useCallback(() => {
    setBigaStartAt(roundToNextQuarterHour(new Date()));
    setTimelineModeRaw('forward');
  }, []);

  const toggleStep = useCallback(
    (id: string) => {
      // Read from the render's set, not inside the updater: React runs an
      // updater later, so a flag set there is still false when read here.
      const checking = !checkedSteps.has(id);
      setCheckedSteps((prev) => {
        const next = new Set(prev);
        if (checking) next.add(id);
        else next.delete(id);
        return next;
      });
      // Ticking a step off ends it: every timer it carries stops there, which
      // is how a mixer phase's time reaches the log without a second tap.
      // Unticking resumes nothing: Resume is always a tap (§7.5, APP-4).
      if (checking) {
        const at = Date.now();
        setTimers((prev) => timersAfterTick(prev, id, true, at));
      }
    },
    [checkedSteps],
  );

  /**
   * §10: Reset starts a new bake. `inputsForNewBake` and `persistedForNewBake`
   * decide every field; this applies all of them, kept ones included, so the
   * decision lives in one place. The log stays.
   */
  const [resetCount, setResetCount] = useState(0);
  const startNewBake = useCallback(() => {
    const next = persistedForNewBake(persisted);
    setResetCount((n) => n + 1);
    setInputs(inputsForNewBake());
    // The balls are back at their default, so no raise is in force.
    setBallsChosen(null);
    setCalibration(next.calibration);
    setPanels(next.panels);
    setBigaStartAt(bigaStartFrom(next.bigaStartAtIso));
    setTimelineModeRaw(next.timelineMode);
    setBakeAt(next.bakeAtIso ? new Date(next.bakeAtIso) : null);
    setCheckedSteps(new Set(next.checkedSteps));
    setClosedGroups(next.closedGroups);
    setTimers(next.timers);
    setSessionBakeId(next.sessionBakeId);
    // Kept (§13.1): applied, like the rest, so the decision stays in one place.
    setTab(next.tab);
  }, [persisted]);

  /** §7.5 (APP-5): a group closes and opens only from its heading. */
  const toggleGroup = useCallback((key: string) => {
    setClosedGroups((prev) => toggledClosedGroups(prev, key));
  }, []);

  const startTimer = useCallback((stepId: string, spec: TimerSpec) => {
    // As on Resume: a stale `now` would hold the new timer at 0:00 until the next tick.
    setNow(new Date());
    setTimers((prev) => [
      ...prev.filter((t) => t.stepId !== stepId),
      {
        stepId,
        startedAt: Date.now(),
        minMinutes: spec.minMinutes,
        maxMinutes: spec.maxMinutes,
      },
    ]);
  }, []);

  const stopTimer = useCallback((stepId: string) => {
    const at = Date.now();
    setTimers((prev) => prev.map((t) => (t.stepId === stepId ? stoppedTimer(t, at) : t)));
  }, []);

  /** §7.5 (APP-4): carry a stopped timer on from where it stopped; the pause doesn't count. */
  const resumeTimer = useCallback((stepId: string) => {
    const at = Date.now();
    setTimers((prev) => prev.map((t) => (t.stepId === stepId ? resumedTimer(t, at) : t)));
    // With every timer stopped the clock ticks once a minute, so `now` can be
    // that far behind: the card would show less than the time it stopped at
    // until the next tick. Found by the iPhone suite (e2e/).
    setNow(new Date(at));
  }, []);

  const clearTimer = useCallback((stepId: string) => {
    setTimers((prev) => prev.filter((t) => t.stepId !== stepId));
  }, []);

  // A stopped timer is done with: the tab title shouldn't ask for it.
  const dueTimerStepIds = useMemo(
    () => timers.filter((t) => t.stoppedAt == null && now.getTime() >= timerDueAt(t)).map((t) => t.stepId),
    [timers, now],
  );

  /** §8.2a: StepList rebuilds this per mix instance, so it needs the inputs too. */
  const scheduleTokens = useMemo(
    () => ({
      bigaFridgeH: inputs.bigaFridgeH,
      bigaRoomOnlyH: inputs.bigaRoomOnlyH,
      coldFermentH: inputs.coldFermentH,
      temperH: inputs.temperH,
    }),
    [inputs.bigaFridgeH, inputs.bigaRoomOnlyH, inputs.coldFermentH, inputs.temperH],
  );

  const tokens = useMemo(
    () => tokenValues(result, scheduleTokens),
    [result, scheduleTokens],
  );

  // §7.3: the strip's sources are capacity and the overnight stages; the
  // water warnings sit under each mix's target (MESSAGE-54).
  const alerts = useMemo(() => capacityAlerts(result, tokens), [result, tokens]);
  const ballsSplitHint = useMemo(() => splitHint(result, tokens), [result, tokens]);
  const ballsRaisedNote = useMemo(() => raisedNote(ballsChosen, result, tokens), [ballsChosen, result, tokens]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const qs = encodeInputs(inputs);
    const { origin, pathname } = window.location;
    return qs ? `${origin}${pathname}?${qs}` : `${origin}${pathname}`;
  }, [inputs]);

  return {
    inputs,
    setInput,
    commitNumber,
    stepNumber,
    calibration,
    friction,
    mixSize,
    mixSizeKey,
    setDdtOverride,
    commitReading,
    clearReading,
    startNewBake,
    resetCount,
    log,
    sessionDraft,
    sessionBakeId,
    saveConflict: conflict,
    saveSessionBake,
    setMixExcluded,
    deleteBake,
    signedIn,
    markSignedOut,
    signIn,
    createPasskey,
    signOut,
    sync,
    syncNow: () => void syncNow(),
    ddtF: result.ddtF,
    autoDdtF: defaultDdtFor(inputs),
    panels,
    togglePanel,
    nowMs: now.getTime(),
    timers,
    startTimer,
    stopTimer,
    resumeTimer,
    clearTimer,
    dueTimerStepIds,
    checkedSteps,
    toggleStep,
    closedGroups,
    toggleGroup,
    tokens,
    alerts,
    ballsSplitHint,
    ballsRaisedNote,
    scheduleTokens,
    bigaStartAt,
    setBigaStartAt,
    timelineMode,
    setTimelineMode,
    bakeAt,
    setBakeAt,
    daylightWindows,
    now,
    startNow,
    timeline,
    result,
    shareUrl,
    tab,
    setTab,
  };
}
