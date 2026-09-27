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
 * the dough is ready at the earliest moment, and a window stays open until the
 * latest. Collapsing that to one number would throw away the half of the
 * instruction that says how much slack you have.
 *
 * **The display counts up** (Dave, 27 September): the big number is how long
 * the step has been going, in every phase. Before, in or past the window is
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
 * Bound, not raw: `bulk-4` reads `{coldFerment} h` and `bake-1` `{temper} h`,
 * so the token has to be substituted first. Doing it this way keeps the step
 * ids out of here — anything whose label states a duration gets a timer, and
 * anything that doesn't (`per schedule`) gets none.
 */
export function parseTimerLabel(label: string): TimerSpec | null {
  const text = label.trim();

  // "3–6 min", "45–60 min", "10–15 min between rounds". En dash or hyphen.
  const range = /^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*(min|h)\b/.exec(text);
  if (range) {
    const scale = range[3] === 'h' ? 60 : 1;
    return {
      minMinutes: Number(range[1]) * scale,
      maxMinutes: Number(range[2]) * scale,
      isWindow: true,
    };
  }

  // "10 min", "24 h", "2.5 h".
  const single = /^(\d+(?:\.\d+)?)\s*(min|h)\b/.exec(text);
  if (single) {
    const minutes = Number(single[1]) * (single[2] === 'h' ? 60 : 1);
    return { minMinutes: minutes, maxMinutes: minutes, isWindow: false };
  }

  // "per schedule" and anything else the timeline owns rather than a timer.
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
  /** Between the earliest and latest — ready, with slack in hand. */
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
 * Short human label: "10 min", "3–6 min", "2 h 30 min", "45 min–1 h".
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

  if (!spec.isWindow) return one(spec.minMinutes);

  // <= 60, not < 60: the recipe writes "45–60 min", not "45 min–1 h".
  const readsAsMinutes = spec.minMinutes < 60 && spec.maxMinutes <= 60;
  if (readsAsMinutes) return `${spec.minMinutes}–${spec.maxMinutes} min`;

  const bothWholeHours = spec.minMinutes % 60 === 0 && spec.maxMinutes % 60 === 0;
  if (bothWholeHours) return `${spec.minMinutes / 60}–${spec.maxMinutes / 60} h`;

  return `${one(spec.minMinutes)}–${one(spec.maxMinutes)}`;
}
