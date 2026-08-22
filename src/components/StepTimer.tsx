import { useEffect, useRef } from 'react';
import {
  describeSpec,
  formatCountdown,
  timerState,
  type RunningTimer,
  type TimerSpec,
} from '../lib/timers';

/**
 * Per-step timer — WEBSITE-SPEC-biga-calculator.md §7.5.
 *
 * Reads a clock rather than counting down, so it stays correct across a screen
 * lock, a backgrounded tab or a reload. See `src/lib/timers.ts`.
 */

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
}: {
  stepId: string;
  spec: TimerSpec;
  timer: RunningTimer | undefined;
  now: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const state = timer ? timerState(timer, now) : null;
  const phase = state?.phase;

  // Beep once, on the transition out of `running`.
  const alerted = useRef<string | null>(null);
  useEffect(() => {
    if (!timer || !phase) return;
    const key = `${stepId}:${timer.startedAt}`;
    if (phase === 'running') {
      if (alerted.current === key) alerted.current = null;
      return;
    }
    if (alerted.current !== key) {
      alerted.current = key;
      beep();
    }
  }, [stepId, timer, phase]);

  if (!timer || !state) {
    return (
      <div className="mt-3 flex items-center gap-3">
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
      </div>
    );
  }

  const tone =
    state.phase === 'running'
      ? 'border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50'
      : state.phase === 'window'
        ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
        : 'border-amber-500 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40';

  return (
    <div className={`mt-3 rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {state.phase === 'running'
              ? spec.isWindow
                ? 'Ready in'
                : 'Remaining'
              : state.phase === 'window'
                ? 'Ready — window closes in'
                : 'Over by'}
          </p>
          <p className="text-4xl font-bold tabular">
            {formatCountdown(
              state.phase === 'running'
                ? state.remainingMs
                : state.phase === 'window'
                  ? state.windowRemainingMs
                  : -state.windowRemainingMs,
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="min-h-touch shrink-0 rounded-lg border border-stone-400 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-500 dark:active:bg-stone-800"
        >
          {state.phase === 'running' ? 'Cancel' : 'Clear'}
        </button>
      </div>

      {state.phase === 'running' && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"
          role="progressbar"
          aria-valuenow={Math.round(state.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-amber-600 transition-[width] duration-1000 ease-linear"
            style={{ width: `${state.progress * 100}%` }}
          />
        </div>
      )}

      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        {spec.isWindow
          ? `${describeSpec(spec)} — the second number is how long you have, not a deadline you missed.`
          : `${describeSpec(spec)} from ${new Date(timer.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
      </p>
    </div>
  );
}
