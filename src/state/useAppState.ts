/**
 * State wiring — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * Precedence on load is URL > localStorage > default. A shared link therefore
 * always shows the sender's setup, while the recipient's own calibration and
 * preferences still apply underneath it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculate, computeCapacity, computeFormula, type CalculatorResult, type Warning } from '../lib/engine';
import {
  ffInUse,
  frictionBadge,
  mixSizeValue,
  type BadgeTone,
  type FfInUse,
  type LoggedBake,
  type MixSize,
} from '../lib/bakeLog';
import { roundTo } from '../lib/format';
import { capacityAlerts, splitHint } from '../lib/capacity';
import { defaultDdtF } from '../lib/constants';
import {
  roundToNextQuarterHour,
  socialWindows,
  timelineFor,
  type ClockWindow,
  type ScheduleAdjustments,
  type Timeline,
} from '../lib/timeline';
import { timerDueAt, type RunningTimer, type TimerSpec } from '../lib/timers';
import { DEFAULT_INPUTS, clampField, inputsForNewBake, type BoundedField } from './defaults';
import { browserStorage, loadPersisted, savePersisted } from './storage';
import {
  loadGitHubConfig,
  loadLog,
  removeBake,
  saveGitHubConfig,
  saveLog,
  setMixExcluded as setLogMixExcluded,
  upsertBake,
  type GitHubConfig,
  type LocalLog,
} from './bakeLogStore';
import { mergeAfterSync, syncLog, type FetchLike } from './githubSync';
import { newBakeId, saveConflict, sessionBake } from './sessionBake';
import { decodeInputs, encodeInputs } from './url';
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

/** The FF in use and the badge Panel 3 shows for it (§6). */
export type FrictionInUse = FfInUse & { badge: { text: string; tone: BadgeTone } };

export type SyncState =
  /** No token on this device: the log stays in browser storage. */
  | { state: 'off' }
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'error'; message: string };

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
  resetInputs: () => void;

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
  /** §10: "Poured at the target" fills the water poured with the mix's target. */
  pourAtTarget: (index: number, targetF: number) => void;
  /** Clear a per-mix reading back to unread (the final temperature's "Clear"). */
  clearReading: (field: PerMixReading, index: number) => void;
  /**
   * §10: the page's Reset. Puts the day's temperatures back to their defaults
   * and clears the step checkboxes and the timers; the batch settings and the
   * saved bakes stay, and the next save is a new bake.
   */
  startNewBake: () => void;

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
  /** This device's repository and token, or null for browser storage only. */
  github: GitHubConfig | null;
  setGitHub: (config: GitHubConfig | null) => void;
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
  /** Remove a timer, running or stopped. */
  clearTimer: (stepId: string) => void;
  /** Step ids whose timer has passed its earliest moment since being started. */
  dueTimerStepIds: string[];

  /** Step ids ticked off, persisted across reloads. */
  checkedSteps: ReadonlySet<string>;
  toggleStep: (id: string) => void;
  clearCheckedSteps: () => void;
  /** {token} bindings for step and concept prose. */
  tokens: Record<string, string>;
  /** §7.3 capacity messages, then the engine's warnings — what the strip shows, in order. */
  alerts: Warning[];
  /** §6 Panel 1: "→ {nMix} mixes of {doughPerMix} g", or null for a single mix. */
  ballsSplitHint: string | null;
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
}

export function useAppState(): AppState {
  const storage = useMemo(() => browserStorage(), []);

  // Read storage once, then the URL for the inputs. The bowl mass used to be
  // the one unshared input here; it is a constant now (MESSAGE-29), and a
  // stored value from before is ignored.
  const initial = useMemo(() => {
    const persisted = loadPersisted(storage);
    return { persisted, inputs: decodeInputs(currentSearch(), DEFAULT_INPUTS) };
  }, [storage]);

  const [inputs, setInputs] = useState<Inputs>(initial.inputs);
  const [calibration, setCalibration] = useState<Calibration>(initial.persisted.calibration);
  const [panels, setPanels] = useState<PanelPrefs>(initial.persisted.panels);
  const [bigaStartAt, setBigaStartAt] = useState<Date>(() => {
    const stored = initial.persisted.bigaStartAtIso;
    // A resumed session keeps the time the biga actually went in; a fresh one
    // starts from now, since that is when you are standing at the counter.
    return stored ? new Date(stored) : roundToNextQuarterHour(new Date());
  });

  const [timelineMode, setTimelineModeRaw] = useState<TimelineMode>(initial.persisted.timelineMode);
  const [bakeAt, setBakeAt] = useState<Date | null>(() =>
    initial.persisted.bakeAtIso ? new Date(initial.persisted.bakeAtIso) : null,
  );

  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(
    () => new Set(initial.persisted.checkedSteps),
  );
  const [timers, setTimers] = useState<RunningTimer[]>(initial.persisted.timers);
  const [sessionBakeId, setSessionBakeId] = useState<string>(initial.persisted.sessionBakeId);

  // §2 / §10: the log's local copy, written first; the repository follows.
  const [log, setLog] = useState<LocalLog>(() => loadLog(storage));
  const [github, setGitHubState] = useState<GitHubConfig | null>(() => loadGitHubConfig(storage));
  const [sync, setSync] = useState<SyncState>(() => (github ? { state: 'idle' } : { state: 'off' }));

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

  // Skip the first persist: it would only write back what we just read.
  const hydrated = useRef(false);

  useEffect(() => {
    syncUrl(inputs);
  }, [inputs]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const value: Persisted = {
      calibration,
      panels,
      bigaStartAtIso: bigaStartAt.toISOString(),
      timelineMode,
      bakeAtIso: bakeAt ? bakeAt.toISOString() : '',
      checkedSteps: [...checkedSteps],
      timers,
      sessionBakeId,
    };
    savePersisted(storage, value);
  }, [
    storage,
    calibration,
    panels,
    bigaStartAt,
    timelineMode,
    bakeAt,
    checkedSteps,
    timers,
    sessionBakeId,
  ]);

  useEffect(() => {
    saveLog(storage, log);
  }, [storage, log]);

  const setInput = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      // The flour tracks the room while the toggle is on, in both directions.
      if (key === 'roomTempF' && next.flourSameAsRoom) next.flourTempF = next.roomTempF;
      if (key === 'flourSameAsRoom' && value === true) next.flourTempF = next.roomTempF;
      return next;
    });
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
    setInputs((prev) => {
      const current = prev[key];
      if (typeof current !== 'number') return prev;
      return { ...prev, [key]: clampField(key, current + delta) };
    });
  }, []);

  const resetInputs = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
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

  /** The target, to the tenth a thermometer shows, becomes the water poured. */
  const pourAtTarget = useCallback(
    (index: number, targetF: number) => {
      if (!Number.isFinite(targetF)) return;
      writeReading('waterUsedF', roundTo(targetF, 1), index);
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
        bowlState: inputs.bowlState,
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
    const started = logRef.current;
    const fetchFn: FetchLike = (url, init) => globalThis.fetch(url, init);
    const { log: synced, error } = await syncLog(cfg, started, fetchFn);
    // A token forgotten mid-sync keeps whatever the sync fetched, and stops.
    setLog((current) => mergeAfterSync(current, started, synced));
    setSync(githubRef.current ? (error ? { state: 'error', message: error.message } : { state: 'idle' }) : { state: 'off' });
    syncing.current = false;
    if (syncAgain.current) {
      syncAgain.current = false;
      void syncNow();
    }
  }, []);

  const setGitHub = useCallback(
    (config: GitHubConfig | null) => {
      saveGitHubConfig(storage, config);
      setGitHubState(config);
      githubRef.current = config;
      setSync(config ? { state: 'idle' } : { state: 'off' });
      if (config) void syncNow();
    },
    [storage, syncNow],
  );

  // Pull on load, and whenever the page comes back into view: the other
  // device may have logged a bake since.
  useEffect(() => {
    if (!github) return;
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
  const pending = log.dirty.length + log.deleted.length;
  useEffect(() => {
    if (!github || pending === 0) return;
    const id = setTimeout(() => void syncNow(), 1500);
    return () => clearTimeout(id);
  }, [github, pending, log, syncNow]);

  const adjustments = useMemo<ScheduleAdjustments>(
    () => ({
      bigaFridgeH: inputs.bigaFridgeH,
      bigaRoomOnlyH: inputs.bigaRoomOnlyH,
      // §4.8: computed from the measured dough temperature, not chosen.
      ballRoomTempH: result.roomMinutes / 60,
      nMix: result.capacity.nMix,
      coldFermentH: inputs.coldFermentH,
      temperH: inputs.temperH,
    }),
    [
      inputs.bigaFridgeH,
      inputs.bigaRoomOnlyH,
      result.roomMinutes,
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
      // Ticking a step off ends it: a running timer stops there, which is how
      // a mixer phase's time reaches the log without a second tap.
      if (checking) {
        const at = Date.now();
        setTimers((prev) => prev.map((t) => (t.stepId === id && t.stoppedAt == null ? { ...t, stoppedAt: at } : t)));
      }
    },
    [checkedSteps],
  );

  // The Steps header's own Reset: the checkboxes only.
  const clearCheckedSteps = useCallback(() => setCheckedSteps(new Set()), []);

  /**
   * §10: Reset starts a new bake. The day's temperatures go back to their
   * defaults (`inputsForNewBake`); the DDT override and the log stay.
   */
  const startNewBake = useCallback(() => {
    setInputs(inputsForNewBake);
    setCheckedSteps(new Set());
    setTimers([]);
    setSessionBakeId('');
  }, []);

  const startTimer = useCallback((stepId: string, spec: TimerSpec) => {
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
    setTimers((prev) => prev.map((t) => (t.stepId === stepId && t.stoppedAt == null ? { ...t, stoppedAt: at } : t)));
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

  // §7.3: capacity first — the split "always shown, first in the strip" —
  // then the engine's water and stagger warnings.
  const alerts = useMemo(() => [...capacityAlerts(result, tokens), ...result.warnings], [result, tokens]);
  const ballsSplitHint = useMemo(() => splitHint(result, tokens), [result, tokens]);

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
    resetInputs,
    calibration,
    friction,
    mixSize,
    mixSizeKey,
    setDdtOverride,
    commitReading,
    pourAtTarget,
    clearReading,
    startNewBake,
    log,
    sessionDraft,
    sessionBakeId,
    saveConflict: conflict,
    saveSessionBake,
    setMixExcluded,
    deleteBake,
    github,
    setGitHub,
    sync,
    syncNow: () => void syncNow(),
    ddtF: result.ddtF,
    autoDdtF: defaultDdtF(inputs.balls),
    panels,
    togglePanel,
    nowMs: now.getTime(),
    timers,
    startTimer,
    stopTimer,
    clearTimer,
    dueTimerStepIds,
    checkedSteps,
    toggleStep,
    clearCheckedSteps,
    tokens,
    alerts,
    ballsSplitHint,
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
  };
}
