/**
 * State wiring — WEBSITE-SPEC-biga-calculator.md §2 and §6.
 *
 * Precedence on load is URL > localStorage > default. A shared link therefore
 * always shows the sender's setup, while the recipient's own calibration and
 * preferences still apply underneath it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculate, type CalculatorResult } from '../lib/engine';
import { defaultDdtF } from '../lib/constants';
import {
  buildTimeline,
  roundToNextQuarterHour,
  type ScheduleAdjustments,
  type Timeline,
} from '../lib/timeline';
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
import type { Calibration, EffectiveFriction, Inputs, PanelPrefs, Persisted } from './types';

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
  /** The friction factor in use for the current batch size, and its provenance. */
  friction: EffectiveFriction;
  setFrictionForCurrentBatch: (ff: number) => void;
  clearFrictionForCurrentBatch: () => void;
  setDdtOverride: (ddtF: number | null) => void;
  /** The DDT actually in use, whether overridden or automatic. */
  ddtF: number;
  autoDdtF: number;

  panels: PanelPrefs;
  togglePanel: (panel: keyof PanelPrefs) => void;

  /** Step ids ticked off, persisted across reloads. */
  checkedSteps: ReadonlySet<string>;
  toggleStep: (id: string) => void;
  clearCheckedSteps: () => void;
  /** {token} bindings for step and concept prose. */
  tokens: Record<string, string>;

  /** When the biga goes in. t = 0 for the timeline. */
  bigaStartAt: Date;
  setBigaStartAt: (at: Date) => void;
  /** Reset the start to now, for when a session actually begins. */
  startNow: () => void;
  timeline: Timeline;

  result: CalculatorResult;
  /** Absolute link reproducing the current inputs. */
  shareUrl: string;
}

export function useAppState(): AppState {
  const storage = useMemo(() => browserStorage(), []);

  // Read storage once, then URL on top of it, so a link wins per key while
  // unshared preferences (freezer temp) still come from this device.
  const initial = useMemo(() => {
    const persisted = loadPersisted(storage);
    const base: Inputs = {
      ...DEFAULT_INPUTS,
      freezerTempF: persisted.freezerTempF,
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

  const [checkedSteps, setCheckedSteps] = useState<Set<string>>(
    () => new Set(initial.persisted.checkedSteps),
  );

  // Re-ticks the "you are here" marker without re-rendering on every frame.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
      freezerTempF: inputs.freezerTempF,
      bigaStartAtIso: bigaStartAt.toISOString(),
      checkedSteps: [...checkedSteps],
      bowlMassG: inputs.bowlMassG,
    };
    savePersisted(storage, value);
  }, [
    storage,
    calibration,
    panels,
    inputs.freezerTempF,
    inputs.bowlMassG,
    bigaStartAt,
    checkedSteps,
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
    setInputs({ ...DEFAULT_INPUTS, freezerTempF: inputs.freezerTempF });
  }, [inputs.freezerTempF]);

  const friction = useMemo(
    () => effectiveFriction(calibration, inputs.balls),
    [calibration, inputs.balls],
  );

  const setFrictionForCurrentBatch = useCallback(
    (ff: number) => {
      if (!Number.isFinite(ff)) return;
      setCalibration((prev) => recordFriction(prev, inputs.balls, ff, todayIso()));
    },
    [inputs.balls],
  );

  const clearFrictionForCurrentBatch = useCallback(() => {
    setCalibration((prev) => clearFriction(prev, inputs.balls));
  }, [inputs.balls]);

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
        tapTempF: inputs.tapTempF,
        freezerTempF: inputs.freezerTempF,
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
    () => buildTimeline({ startAt: bigaStartAt, schedule: inputs.schedule, adjustments, now }),
    [bigaStartAt, inputs.schedule, adjustments, now],
  );

  const startNow = useCallback(() => setBigaStartAt(roundToNextQuarterHour(new Date())), []);

  const toggleStep = useCallback((id: string) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearCheckedSteps = useCallback(() => setCheckedSteps(new Set()), []);

  const tokens = useMemo(
    () =>
      tokenValues(result, {
        bigaFridgeH: inputs.bigaFridgeH,
        bigaRoomOnlyH: inputs.bigaRoomOnlyH,
        coldFermentH: inputs.coldFermentH,
        temperH: inputs.temperH,
      }),
    [result, inputs.bigaFridgeH, inputs.bigaRoomOnlyH, inputs.coldFermentH, inputs.temperH],
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
    setFrictionForCurrentBatch,
    clearFrictionForCurrentBatch,
    setDdtOverride,
    ddtF: result.ddtF,
    autoDdtF: defaultDdtF(inputs.balls),
    panels,
    togglePanel,
    checkedSteps,
    toggleStep,
    clearCheckedSteps,
    tokens,
    bigaStartAt,
    setBigaStartAt,
    startNow,
    timeline,
    result,
    shareUrl,
  };
}
