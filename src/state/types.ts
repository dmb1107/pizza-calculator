/** Application state shapes — WEBSITE-SPEC-biga-calculator.md §6. */

/**
 * §4.7. `retarded` is 2 h at room temperature then ~19 h in the fridge — the
 * Ooni/Marco Fuso schedule, and the answer for a kitchen that won't hold a
 * band. `classic` is 12–18 h at 61–65 °F, which gives the truer acid profile.
 */
export type Schedule = 'retarded' | 'classic';

/**
 * Per-session inputs. These serialize to the URL so a setup can be shared or
 * survive a refresh (§2). Derived values never live here — they come from the
 * engine.
 */
export interface Inputs {
  // Panel 1 — Batch
  balls: number;
  ballWeightG: number;
  coldFermentH: number;
  schedule: Schedule;

  // Panel 2 — Today's temperatures
  roomTempF: number;
  /** When true, flour temperature tracks the room and the field is disabled. */
  flourSameAsRoom: boolean;
  flourTempF: number;
  /** Measured at mix time, not assumed. The dominant term in the water calc. */
  bigaTempF: number;
  tapTempF: number;
  freezerTempF: number;
  /** Weigh once; persisted. Its MASS is what matters, not its temperature. */
  bowlMassG: number;

  // Schedule fine-tuning — §4.7 marks each of these user-adjustable.
  /** Retarded only. 18–20 h. */
  bigaFridgeH: number;
  /** Classic only. 12–18 h at 61–65 °F. */
  bigaRoomOnlyH: number;
  /** 2–3 h. */
  temperH: number;

  /**
   * Final dough temperature measured after mixing, §4.8. null before the mix,
   * which puts the calculator in planning mode at DDT. One number, two uses:
   * it also drives the room-temperature phase and the bake log.
   */
  finalDoughTempF: number | null;
}

/** One recorded friction-factor measurement. */
export interface FrictionMeasurement {
  ff: number;
  /** ISO date (YYYY-MM-DD) the measurement was recorded. */
  measuredAt: string;
}

/**
 * Calibration and preferences. These persist to localStorage rather than the
 * URL (§2) — a friction factor is a property of your mixer, your profile and
 * your room, so it shouldn't ride along on a shared link.
 */
export interface Calibration {
  /**
   * §6: "Friction factor is not one number." Keyed by batch size in balls,
   * because a 9-ball batch runs hotter than a 3-ball — more total work, less
   * surface area per unit mass to shed it.
   */
  frictionFactors: Record<number, FrictionMeasurement>;
  /** null uses the §4.3 default: 75 °F for <=6 balls, 74 °F for 7+. */
  ddtOverrideF: number | null;
}

/** A started timer. Mirrors `RunningTimer` in `src/lib/timers.ts`. */
export interface RunningTimer {
  stepId: string;
  startedAt: number;
  minMinutes: number;
  maxMinutes: number;
}

/** Which panels are open. Batch is open by default; the others are collapsed. */
export interface PanelPrefs {
  batch: boolean;
  temperatures: boolean;
  calibration: boolean;
}

/** Everything that persists to localStorage. */
export interface Persisted {
  calibration: Calibration;
  panels: PanelPrefs;
  /** §6: freezer temp "rarely changes; persist it". */
  freezerTempF: number;
  /**
   * When the biga was mixed, ISO. Persisted rather than serialized to the URL:
   * design priority 4 wants a session to survive a refresh, but a fixed
   * timestamp in a shared link goes stale the moment it is sent.
   */
  bigaStartAtIso: string;
  /** Ids of steps ticked off. §7.5: "a checkbox that persists". */
  checkedSteps: string[];
  /** Weighed once, then never again. */
  bowlMassG: number;
  /**
   * Timers the user has started, as absolute start timestamps. Persisted so a
   * reload — or a phone locking its screen mid-mix — doesn't lose one.
   */
  timers: RunningTimer[];
}

/** The resolved friction factor and where it came from. */
export interface EffectiveFriction {
  ff: number;
  /** true when falling back to 14 — badge it "estimated — not yet calibrated". */
  isEstimate: boolean;
  /** Set when measured: the date it was recorded. */
  measuredAt?: string;
}
