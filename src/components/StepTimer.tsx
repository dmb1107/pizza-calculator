import { useEffect, useRef, type ReactNode } from 'react';
import {
  beepDecision,
  describeSpec,
  effectiveStartAt,
  formatElapsed,
  timerState,
  type RunningTimer,
  type TimerSpec,
} from '../lib/timers';
import { formatTimeOfDay } from '../lib/timeline';

/**
 * Per-step timer — WEBSITE-SPEC-biga-calculator.md §7.5.
 *
 * Reads a clock rather than counting down, so it stays correct across a screen
 * lock, a backgrounded tab or a reload. See `src/lib/timers.ts`.
 *
 * The number counts up — how long the timer has run — in every phase.
 * Before, in or past the window is carried by the card's tone, the label and
 * the bar, which marks the window and stays up throughout so the card doesn't
 * change height as the phase turns.
 *
 * Stop freezes the time where it is. A stopped timer shows Resume in Stop's
 * place, which carries the count on with the pause left out, and Clear in the
 * card's far corner, which removes it (§7.5, APP-4). One spot for Stop and
 * Resume means a double tap stops and resumes, which loses nothing; with
 * Clear in that spot it cleared the timer and a mixer phase lost its logged
 * time. A stopped mixer phase is the phase time the bake log records (§10),
 * and ticking the step off stops its timer too, so the time is captured
 * without a second tap. Those four timers carry the "Logged" tag (§7.5); no
 * other timer does.
 */

/** §7.5's tag: which timers the bake log reads. Not a control. */
function LoggedTag({ text }: { text: string }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-sm font-medium text-sky-900 tabular dark:bg-sky-950 dark:text-sky-200">
      {text}
    </span>
  );
}

/**
 * A short two-tone beep, synthesised rather than loaded.
 *
 * §2 rules out CDN dependencies and an audio file would be one more thing to
 * ship; the Web Audio API is already in the browser. The context is created on
 * the Start click because iOS will not let audio play without a user gesture
 * behind it.
 */
let audioContext: AudioContext | null = null;

export function primeAudio(): void {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  } catch {
    // No Web Audio here. The visual alert still fires.
  }
}

function beep(): void {
  const ctx = audioContext;
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const [at, freq] of [
      [0, 880],
      [0.18, 1170],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      // A short envelope — a raw square edge clicks unpleasantly.
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.18);
    }
  } catch {
    // Ignore — a missed beep must never break the step list.
  }
}

export function StepTimer({
  stepId,
  spec,
  timer,
  now,
  onStart,
  onStop,
  onResume,
  onClear,
  note,
  tag,
}: {
  stepId: string;
  spec: TimerSpec;
  timer: RunningTimer | undefined;
  now: number;
  onStart: () => void;
  /** Freeze the time. */
  onStop: () => void;
  /** Carry a stopped timer on; the pause doesn't count. */
  onResume: () => void;
  /** Remove the timer. */
  onClear: () => void;
  /** Shown under a running timer's controls — growth below the tap point, never above it. */
  note?: ReactNode;
  /** §7.5: "Logged", or "Logged · 3:42" once stopped, on the timers the log reads. */
  tag?: string | null;
}) {
  const state = timer ? timerState(timer, now) : null;
  const phase = state?.phase;

  // Beep once, when the count crosses the lower bound while the timer runs
  // (§7.5). A stopped timer never beeps, and one resumed at or past its bound
  // stays quiet, a reload included: `beepDecision` reads that from the timer.
  const alerted = useRef<string | null>(null);
  useEffect(() => {
    if (!timer || !phase) return;
    const decision = beepDecision(stepId, timer, now, alerted.current);
    alerted.current = decision.key;
    if (decision.beep) beep();
    // `phase` stands in for `now`: the decision can only change when it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, timer, phase]);

  if (!timer || !state) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            primeAudio();
            onStart();
          }}
          className="min-h-touch rounded-lg border border-stone-400 px-4 font-medium active:bg-stone-100 dark:border-stone-500 dark:active:bg-stone-800"
        >
          Start {describeSpec(spec)} timer
        </button>
        {tag && <LoggedTag text={tag} />}
      </div>
    );
  }

  const tone = state.stopped
    ? 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900'
    : state.phase === 'running'
      ? 'border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50'
      : state.phase === 'window'
        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
        : 'border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40';

  const fill =
    state.phase === 'running'
      ? 'bg-stone-500 dark:bg-stone-400'
      : state.phase === 'window'
        ? 'bg-emerald-600 dark:bg-emerald-500'
        : 'bg-amber-600 dark:bg-amber-500';

  // The phase alone: the bounds are in the line under the bar, and a longer
  // label wrapped at phone width, so the card changed height as it turned.
  const label = state.stopped
    ? 'Stopped'
    : spec.isWindow
    ? state.phase === 'running'
      ? 'Before the window'
      : state.phase === 'window'
        ? 'In the window'
        : 'Past the window'
    : state.phase === 'running'
      ? 'Running'
      : "Time's up";

  return (
    <div className={`mt-3 rounded-lg border p-3 ${tone}`}>
      {/* Its own line: beside the label it wrapped "Before the window" at
          phone width and not "In the window", so the card changed height as
          the phase turned. One line in every state keeps the height fixed. */}
      {tag && (
        <div className="mb-2 flex">
          <LoggedTag text={tag} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</p>
          <p className="text-4xl font-bold tabular">{formatElapsed(state.elapsedMs)}</p>
        </div>
        {/* Stop and Resume share this spot, so a double tap stops and resumes. */}
        <button
          type="button"
          onClick={
            state.stopped
              ? () => {
                  // As Start does: after a reload the audio waits for a tap.
                  primeAudio();
                  onResume();
                }
              : onStop
          }
          className="min-h-touch min-w-touch shrink-0 rounded-lg border border-stone-400 px-4 text-sm font-medium active:bg-stone-100 dark:border-stone-500 dark:active:bg-stone-800"
        >
          {state.stopped ? 'Resume' : 'Stop'}
        </button>
      </div>

      <div
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
        role="progressbar"
        aria-valuenow={Math.round(state.progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {spec.isWindow && (
          <div
            className="absolute inset-y-0 right-0 bg-emerald-200 dark:bg-emerald-900"
            style={{ left: `${state.windowStart * 100}%` }}
          />
        )}
        <div
          className={`relative h-full rounded-full transition-[width] duration-1000 ease-linear ${fill}`}
          style={{ width: `${state.progress * 100}%` }}
        />
      </div>

      {/* Clear sits in the far corner from Resume, out of reach of a slip.
          Its slot is held while the timer runs, so the card keeps one height
          from running to stopped. */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={!state.stopped}
          aria-hidden={!state.stopped}
          tabIndex={state.stopped ? 0 : -1}
          className={`min-h-touch shrink-0 rounded-lg border border-stone-400 px-4 text-sm font-medium active:bg-stone-100 dark:border-stone-500 dark:active:bg-stone-800 ${
            state.stopped ? '' : 'invisible'
          }`}
        >
          Clear
        </button>
        <p className="min-w-0 text-sm text-stone-600 dark:text-stone-400">
          {spec.isWindow
            ? `${describeSpec(spec)}: anywhere in this window is on time.`
            : // Moved later by any pause, so start plus duration is when it gets there.
              `${describeSpec(spec)} from ${formatTimeOfDay(new Date(effectiveStartAt(timer)))}`}
        </p>
      </div>
      {note && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{note}</p>}
    </div>
  );
}
