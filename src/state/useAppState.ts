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
    const base: Inputs = { ...DEFAULT_INPUTS, freezerTempF: persisted.freezerTempF };
    return { persisted, inputs: decodeInputs(currentSearch(), base) };
  }, [storage]);

  const [inputs, setInputs] = useState<Inputs>(initial.inputs);
  const [calibration, setCalibration] = useState<Calibration>(initial.persisted.calibration);
  const [panels, setPanels] = useState<PanelPrefs>(initial.persisted.panels);

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
    const value: Persisted = { calibration, panels, freezerTempF: inputs.freezerTempF };
    savePersisted(storage, value);
  }, [storage, calibration, panels, inputs.freezerTempF]);

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
        ddtOverrideF: calibration.ddtOverrideF,
      }),
    [inputs, friction.ff, calibration.ddtOverrideF],
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
    result,
    shareUrl,
  };
}
