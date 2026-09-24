/**
 * State wiring — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * Precedence on load is URL > localStorage > default. A shared link therefore
 * always shows the sender's setup, while the recipient's own calibration and
 * preferences still apply underneath it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ballsPerMix, calculate, type CalculatorResult } from '../lib/engine';
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
import { DEFAULT_INPUTS, clampField, type BoundedField } from './defaults';
import {
  browserStorage,
  clearFriction,
  effectiveFriction,
  loadPersisted,
  recordFriction,
  savePersisted,
} from './storage';
import { decodeInputs, encodeInputs } from './url';
import { tokenValues } from '../lib/bindTokens';
import type { Calibration, EffectiveFriction, Inputs, PanelPrefs, Persisted, TimelineMode } from './types';

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  /** The friction factor in use for the current mix size, and its provenance. */
  friction: EffectiveFriction;
  /** §6: the key `friction` was looked up under — balls per mix, possibly fractional. */
  mixSize: number;
  setFrictionForCurrentMix: (ff: number) => void;
  clearFrictionForCurrentMix: () => void;
  setDdtOverride: (ddtF: number | null) => void;
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
  stopTimer: (stepId: string) => void;
  /** Step ids whose timer has passed its earliest moment since being started. */
  dueTimerStepIds: string[];

  /** Step ids ticked off, persisted across reloads. */
  checkedSteps: ReadonlySet<string>;
  toggleStep: (id: string) => void;
  clearCheckedSteps: () => void;
  /** {token} bindings for step and concept prose. */
  tokens: Record<string, string>;
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

  // Read storage once, then URL on top of it, so a link wins per key while
  // unshared preferences (the weighed bowl mass) still come from this device.
  const initial = useMemo(() => {
    const persisted = loadPersisted(storage);
    const base: Inputs = {
      ...DEFAULT_INPUTS,
      bowlMassG: persisted.bowlMassG,
    };
    return { persisted, inputs: decodeInputs(currentSearch(), base) };
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

  /**
   * The clock everything time-based reads from.
   *
   * One second while a timer is running, one minute otherwise. Timers need the
   * finer resolution; the timeline's "you are here" marker does not, and a
   * permanent 1 Hz re-render would be pure waste on a page left open for two
   * days.
   */
  const [now, setNow] = useState<Date>(() => new Date());
  const hasTimers = timers.length > 0;
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
      bowlMassG: inputs.bowlMassG,
      timers,
    };
    savePersisted(storage, value);
  }, [
    storage,
    calibration,
    panels,
    inputs.bowlMassG,
    bigaStartAt,
    timelineMode,
    bakeAt,
    checkedSteps,
    timers,
  ]);

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
    setInputs({ ...DEFAULT_INPUTS, bowlMassG: inputs.bowlMassG });
  }, [inputs.bowlMassG]);

  // §6: FF is looked up and filed by balls per mix, not total balls.
  const mixSize = useMemo(
    () => ballsPerMix({ balls: inputs.balls, ballWeightG: inputs.ballWeightG }),
    [inputs.balls, inputs.ballWeightG],
  );

  const friction = useMemo(() => effectiveFriction(calibration, mixSize), [calibration, mixSize]);

  const setFrictionForCurrentMix = useCallback(
    (ff: number) => {
      if (!Number.isFinite(ff)) return;
      setCalibration((prev) => recordFriction(prev, mixSize, ff, todayIso()));
    },
    [mixSize],
  );

  const clearFrictionForCurrentMix = useCallback(() => {
    setCalibration((prev) => clearFriction(prev, mixSize));
  }, [mixSize]);

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
        bowlMassG: inputs.bowlMassG,
        ddtOverrideF: calibration.ddtOverrideF,
        finalDoughTempF: inputs.finalDoughTempF,
      }),
    [inputs, friction.ff, calibration.ddtOverrideF],
  );

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

  const toggleStep = useCallback((id: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearCheckedSteps = useCallback(() => setCheckedSteps(new Set()), []);

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
    setTimers((prev) => prev.filter((t) => t.stepId !== stepId));
  }, []);

  const dueTimerStepIds = useMemo(
    () => timers.filter((t) => now.getTime() >= timerDueAt(t)).map((t) => t.stepId),
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
    setFrictionForCurrentMix,
    clearFrictionForCurrentMix,
    setDdtOverride,
    ddtF: result.ddtF,
    autoDdtF: defaultDdtF(inputs.balls),
    panels,
    togglePanel,
    nowMs: now.getTime(),
    timers,
    startTimer,
    stopTimer,
    dueTimerStepIds,
    checkedSteps,
    toggleStep,
    clearCheckedSteps,
    tokens,
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
