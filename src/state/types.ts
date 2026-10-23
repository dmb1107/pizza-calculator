/** Application state shapes — WEBSITE-SPEC-biga-calculator.md §6. */

/**
 * §4.7. `retarded` is 2 h at room temperature then ~19 h in the fridge — the
 * retarded schedule, and the answer for a kitchen that won't hold a band. `classic` is 12–18 h at 61–65 °F, which gives the truer acid profile.
 */
export type Schedule = 'retarded' | 'classic';

/**
 * §4.7. Forward: the user gives the biga start. Backward: the user gives the
 * bake time and the start is solved.
 */
export type TimelineMode = 'forward' | 'backward';

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

  // §6 *Readings in the steps*: room and flour on mix 1's `mix-1`, biga and
  // bowl on every mix's.
  roomTempF: number;
  /** When true, flour temperature tracks the room and the field is disabled. */
  flourSameAsRoom: boolean;
  flourTempF: number;
  /**
   * Measured at mix time, not assumed. Of the temperatures the baker measures,
   * the one that moves the water target most (FF and DDT move it more per °F):
   * d(T_water)/d(T_biga) is −1.92 at 6 balls and −2.25 at 3, so a 6 °F miss
   * moves the required water 11.5 °F and the finished dough 3.5 °F.
   *
   * ⚠️ One entry per mix. The waiting biga warms toward the room while an
   * earlier mix runs and that drift is not modelled, so each later mix's prep
   * step asks for a fresh reading. Index 0 is mix 1; a missing entry carries
   * the previous mix's reading forward, and a length-1 array is what an older
   * shared link decodes to.
   */
  bigaTempF: number[];
  /**
   * §4.2. Measured bowl temperature, overriding the prefill (mix 1: its biga
   * reading; later mixes: DDT). null uses the prefill. A measurement always
   * wins — the biga gains ~5 °F from tearing and the bowl does not.
   *
   * ⚠️ One entry per mix, read by index: null at any index uses that mix's
   * prefill, never an earlier mix's reading.
   */
  bowlTempF: (number | null)[];

  // Schedule fine-tuning — §4.7 marks each of these user-adjustable.
  /** Retarded only. 18–20 h. */
  bigaFridgeH: number;
  /** Classic only. 12–18 h at 61–65 °F. */
  bigaRoomOnlyH: number;
  /** 1.5–2 h (MESSAGE-53). */
  temperH: number;

  /**
   * Final dough temperature measured after each mix, §4.8. null before a mix
   * is read. Two uses: §4.8 times the ball rise from the mean of the mixes, a
   * mix not yet read counting at DDT, and the bake log solves each mix's FF
   * from its own reading.
   *
   * ⚠️ Read by index (`finalReadings` in the engine): a short list leaves the
   * later mixes unread rather than copying its last entry forward.
   */
  finalDoughTempF: (number | null)[];
  // §10 (MESSAGE-56): there is no water-poured input. The log takes each
  // mix's water target as the water used.
}

/**
 * Preferences that aren't inputs. These persist to browser storage rather than
 * the URL (§2). The FF isn't here: it is computed from the bake log each time
 * (§6, Panel 2), and a map stored by an earlier version is ignored.
 */
export interface Calibration {
  /** null uses the §4.3 default: 75 °F for <=6 balls, 74 °F for 7+. */
  ddtOverrideF: number | null;
}

/** A started timer. Mirrors `RunningTimer` in `src/lib/timers.ts`. */
export interface RunningTimer {
  stepId: string;
  startedAt: number;
  minMinutes: number;
  maxMinutes: number;
  /** When it was stopped, epoch ms. A stopped mixer phase is a logged phase time (§10). */
  stoppedAt?: number;
}

/** A temperature the bake log records (§10), set through `commitReading`. */
export type ReadingField = 'roomTempF' | 'flourTempF' | 'bigaTempF' | 'bowlTempF' | 'finalDoughTempF';

/** Which panels are open. Batch is open by default; Calibration is collapsed. */
export interface PanelPrefs {
  batch: boolean;
  calibration: boolean;
}

/** Everything that persists to localStorage. */
export interface Persisted {
  calibration: Calibration;
  panels: PanelPrefs;
  /**
   * When the biga was mixed, ISO. Persisted rather than serialized to the URL:
   * design priority 4 wants a session to survive a refresh, but a fixed
   * timestamp in a shared link goes stale the moment it is sent.
   */
  bigaStartAtIso: string;
  /** §4.7: which end of the schedule is held. Persisted with the times it holds. */
  timelineMode: TimelineMode;
  /** Backward mode's target bake time, ISO. Empty until backward mode is first used. */
  bakeAtIso: string;
  /** Ids of steps ticked off. §7.5: "a checkbox that persists". */
  checkedSteps: string[];
  /**
   * Timers the user has started, as absolute start timestamps. Persisted so a
   * reload — or a phone locking its screen mid-mix — doesn't lose one.
   */
  timers: RunningTimer[];
  /**
   * The bake saved since the page's Reset (§10), '' before it saves. Saving
   * again replaces that bake rather than adding a second.
   */
  sessionBakeId: string;
}
