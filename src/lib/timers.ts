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
 * is how long the timer has run, in every phase. Before, in or past the window is
 * shown by the phase — tone, label and a bar with the window marked on it —
 * rather than by a number that runs down and then flips direction.
 *
 * **A stopped timer resumes** (§7.5, APP-4, MESSAGE-67): the time between Stop
 * and Resume doesn't count, as on a stopwatch. `startedAt` stays the first
 * start (§10 dates a bake by it), the pauses add up in `pausedMs`, and every
 * elapsed reading goes through `timerElapsedMs`, so nothing can subtract the
 * start from a stop on its own and forget the pauses.
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
  /**
   * Epoch ms, once stopped. The elapsed time then holds, and for a mixer
   * phase it is the phase time the bake log records (§10).
   */
  stoppedAt?: number;
  /**
   * §7.5 (APP-4): the time between Stop and Resume, summed over every resume,
   * ms. Absent is never paused. A pause still open (stopped, not resumed) isn't
   * in it: the count is frozen at `stoppedAt` meanwhile.
   */
  pausedMs?: number;
  /**
   * Epoch ms of the latest Resume; absent if never resumed. It marks where the
   * current run began, which decides the beep (`beepDecision`), and survives a
   * reload so a timer that was resumed past its bound stays quiet.
   */
  resumedAt?: number;
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
  /** True once stopped: the clock no longer advances it. */
  stopped: boolean;
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

/**
 * §7.5: how long the timer has run, ms, pauses left out. The one elapsed
 * reading: the card, the due time, the Logged tag and the bake log's phase
 * times all go through it. A stopped timer reads at its stop, whatever `now` is.
 */
export function timerElapsedMs(
  timer: Pick<RunningTimer, 'startedAt' | 'stoppedAt' | 'pausedMs'>,
  now: number,
): number {
  return Math.max(0, (timer.stoppedAt ?? now) - timer.startedAt - (timer.pausedMs ?? 0));
}

/** Stop: the count freezes. Already stopped, unchanged. */
export function stoppedTimer<T extends RunningTimer>(timer: T, at: number): T {
  return timer.stoppedAt == null ? { ...timer, stoppedAt: at } : timer;
}

/**
 * §7.5 (APP-4): Resume carries the count on from where it stopped. The pause
 * is added to `pausedMs`, so the elapsed time picks up where it froze. Running,
 * unchanged.
 */
export function resumedTimer<T extends RunningTimer>(timer: T, at: number): T {
  if (timer.stoppedAt == null) return timer;
  const { stoppedAt, ...rest } = timer;
  const pause = Math.max(0, at - stoppedAt);
  return { ...rest, pausedMs: (timer.pausedMs ?? 0) + pause, resumedAt: at } as T;
}

/**
 * The clock time the count would have started from with no pauses: the first
 * start moved later by every pause. An exact-duration timer prints it ("10 min
 * from 2:15 PM"), so the printed start plus the duration is when it gets there.
 */
export function effectiveStartAt(timer: RunningTimer): number {
  return timer.startedAt + (timer.pausedMs ?? 0);
}

/**
 * §7.5: the beep comes when the count crosses the lower bound while the timer
 * runs. Only the current run can do that: one resumed at or past the bound
 * crossed it in an earlier run and stays quiet; one resumed before it beeps
 * when it gets there. `lastKey` is the run already beeped for (a component's
 * memory), and the returned key replaces it.
 *
 * A run is the time since the start or the latest resume. Its key carries both
 * timestamps, so a new run is a new key and the memory needs no reset. A reload
 * empties the memory, but the decision doesn't rest on it: a timer resumed past
 * its bound has a run that began past it, which is stored (`resumedAt`).
 */
export function beepDecision(
  stepId: string,
  timer: RunningTimer,
  now: number,
  lastKey: string | null,
): { beep: boolean; key: string | null } {
  if (timer.stoppedAt != null) return { beep: false, key: lastKey };
  const key = `${stepId}:${timer.startedAt}:${timer.resumedAt ?? ''}`;
  const minMs = timer.minMinutes * MINUTE_MS;
  // Elapsed when this run began: 0 from a start; at a resume, where it stopped.
  const runBeganAtMs = timer.resumedAt == null ? 0 : timerElapsedMs(timer, timer.resumedAt);
  if (runBeganAtMs >= minMs) return { beep: false, key: lastKey };
  if (timerElapsedMs(timer, now) < minMs) return { beep: false, key: lastKey === key ? null : lastKey };
  if (lastKey === key) return { beep: false, key };
  return { beep: true, key };
}

export function timerState(timer: RunningTimer, now: number): TimerState {
  const stopped = timer.stoppedAt != null;
  const elapsedMs = timerElapsedMs(timer, now);
  const minMs = timer.minMinutes * MINUTE_MS;
  const maxMs = timer.maxMinutes * MINUTE_MS;

  const phase: TimerPhase = elapsedMs < minMs ? 'running' : elapsedMs < maxMs ? 'window' : 'past';

  return {
    phase,
    stopped,
    elapsedMs,
    progress: maxMs > 0 ? Math.min(1, elapsedMs / maxMs) : 1,
    windowStart: maxMs > 0 ? minMs / maxMs : 1,
  };
}

/**
 * The timer's phase in words: the timer card's label, and the mark on a
 * closed group's heading (§7.5, APP-5), so the two read alike. The phase
 * alone, with no bounds: a longer label wrapped at phone width. Nothing calls
 * the lower bound "ready" (§7.5): a window stage is judged by its cue.
 */
export function timerPhaseLabel(phase: TimerPhase, stopped: boolean, isWindow: boolean): string {
  if (stopped) return 'Stopped';
  if (isWindow) return phase === 'running' ? 'Before the window' : phase === 'window' ? 'In the window' : 'Past the window';
  return phase === 'running' ? 'Running' : "Time's up";
}

/**
 * When this timer reaches its earliest moment, if it runs on from now without
 * stopping: the first start, every pause and the lower bound. Used for the
 * tab title's "Check timer".
 */
export function timerDueAt(timer: RunningTimer): number {
  return effectiveStartAt(timer) + timer.minMinutes * MINUTE_MS;
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
