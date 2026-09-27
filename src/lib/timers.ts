/**
 * Step timers — WEBSITE-SPEC-biga-calculator.md §7.5.
 *
 * "a timer where a duration applies."
 *
 * Pure and DOM-free. Two decisions shape everything here:
 *
 * **A timer is an end time, not a countdown.** Everything is derived from an
 * absolute `startedAt` timestamp against a `now` that is passed in. A ticking
 * counter would lose time the moment a phone locks its screen — which it will,
 * mid-mix, every time. Reading the clock instead means a timer is correct
 * whenever you look at it, however long the page was in the background.
 *
 * **Ranges are windows, not deadlines.** "45–60 min" is not a 45-minute timer:
 * anywhere from the earliest moment to the latest is on time, and the cue, not
 * the clock, decides when the stage is done (§7.5, MESSAGE-36). Collapsing that
 * to one number would throw away the half of the instruction that says how
 * much slack you have.
 *
 * **The display counts up** (§7.5, Dave's ask on 27 September): the big number
 * is how long the step has been going, in every phase. Before, in or past the window is
 * shown by the phase — tone, label and a bar with the window marked on it —
 * rather than by a number that runs down and then flips direction.
 */

/** A duration a step can be timed against, in minutes. */
export interface TimerSpec {
  /** Earliest useful moment. Equal to `maxMinutes` for an exact duration. */
  minMinutes: number;
  /** Latest useful moment. */
  maxMinutes: number;
  /** True when the two differ — the step names a window rather than a point. */
  isWindow: boolean;
}

/**
 * Parse a bound timer label into minutes.
 *
 * Bound, not raw: `bulk-4` reads `{coldFerment} h` and `bulk-3` `{roomMin} min`,
 * so the token has to be substituted first. Doing it this way keeps the step
 * ids out of here — anything whose label states a duration gets a timer. Since
 * MESSAGE-31 every step's label does: §7.5 retired "per schedule", and
 * `timers.test.ts` requires every resolved label to parse.
 */
/** Minutes per unit. Seconds since MESSAGE-32: `mix-7`'s Phase D is 45–60 s. */
const UNIT_MINUTES = { h: 60, min: 1, s: 1 / 60 } as const;

export function parseTimerLabel(label: string): TimerSpec | null {
  const text = label.trim();

  // "3–6 min", "45–60 min", "10–15 min between rounds", "45–60 s". En dash or hyphen.
  const range = /^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*(min|h|s)\b/.exec(text);
  if (range) {
    const scale = UNIT_MINUTES[range[3] as keyof typeof UNIT_MINUTES];
    return {
      minMinutes: Number(range[1]) * scale,
      maxMinutes: Number(range[2]) * scale,
      isWindow: true,
    };
  }

  // "10 min", "24 h", "2.5 h".
  const single = /^(\d+(?:\.\d+)?)\s*(min|h|s)\b/.exec(text);
  if (single) {
    const minutes = Number(single[1]) * UNIT_MINUTES[single[2] as keyof typeof UNIT_MINUTES];
    return { minMinutes: minutes, maxMinutes: minutes, isWindow: false };
  }

  // Not a duration. No step label reaches here any more (§7.5).
  return null;
}

/** A timer the user has started. Persisted, so it survives a reload. */
export interface RunningTimer {
  stepId: string;
  /** Epoch ms. The single source of truth — nothing counts down in memory. */
  startedAt: number;
  minMinutes: number;
  maxMinutes: number;
}

export type TimerPhase =
  /** Before the earliest moment. */
  | 'running'
  /** Between the earliest and latest — on time, with slack in hand. */
  | 'window'
  /** Past the latest moment. */
  | 'past';

export interface TimerState {
  phase: TimerPhase;
  elapsedMs: number;
  /** 0 to 1 against the latest moment, clamped. For a progress bar. */
  progress: number;
  /**
   * Where the window opens on that bar, 0 to 1: the earliest moment over the
   * latest. 1 for an exact duration, which has no window to draw.
   */
  windowStart: number;
}

const MINUTE_MS = 60_000;

export function timerState(timer: RunningTimer, now: number): TimerState {
  const elapsedMs = Math.max(0, now - timer.startedAt);
  const minMs = timer.minMinutes * MINUTE_MS;
  const maxMs = timer.maxMinutes * MINUTE_MS;

  const phase: TimerPhase = elapsedMs < minMs ? 'running' : elapsedMs < maxMs ? 'window' : 'past';

  return {
    phase,
    elapsedMs,
    progress: maxMs > 0 ? Math.min(1, elapsedMs / maxMs) : 1,
    windowStart: maxMs > 0 ? minMs / maxMs : 1,
  };
}

/** When this timer reaches its earliest moment. Used to schedule the alert. */
export function timerDueAt(timer: RunningTimer): number {
  return timer.startedAt + timer.minMinutes * MINUTE_MS;
}

/**
 * Elapsed time: "4:32", "1:05:00". Always at least M:SS so the shape doesn't
 * jump around as the numbers tick, which is hard to read at arm's length.
 *
 * Floored, as a stopwatch is: the display reaches "45:00" at the instant the
 * phase turns to `window`, never half a second before it.
 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Short human label: "10 min", "3–6 min", "2 h 30 min", "45 min–1 h", "45–60 s".
 *
 * A window whose bounds share a unit collapses to one — "3–6 min" rather than
 * "3 min–6 min", which is what the recipe says and what reads at arm's length.
 */
export function describeSpec(spec: TimerSpec): string {
  const one = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  };

  // Under a minute reads in seconds, as the recipe writes Phase D: "45–60 s".
  const seconds = (minutes: number) => Math.round(minutes * 60);
  if (spec.maxMinutes <= 1) {
    return spec.isWindow ? `${seconds(spec.minMinutes)}–${seconds(spec.maxMinutes)} s` : `${seconds(spec.minMinutes)} s`;
  }

  if (!spec.isWindow) return one(spec.minMinutes);

  // <= 60, not < 60: the recipe writes "45–60 min", not "45 min–1 h".
  const readsAsMinutes = spec.minMinutes < 60 && spec.maxMinutes <= 60;
  if (readsAsMinutes) return `${spec.minMinutes}–${spec.maxMinutes} min`;

  const bothWholeHours = spec.minMinutes % 60 === 0 && spec.maxMinutes % 60 === 0;
  if (bothWholeHours) return `${spec.minMinutes / 60}–${spec.maxMinutes / 60} h`;

  return `${one(spec.minMinutes)}–${one(spec.maxMinutes)}`;
}
