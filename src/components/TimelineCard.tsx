import { useId, useState } from 'react';
import { SliderField } from './fields';
import { BOUNDS } from '../state/defaults';
import {
  formatClock,
  formatDuration,
  fromDatetimeLocal,
  toDatetimeLocal,
} from '../lib/timeline';
import type { AppState } from '../state/useAppState';

/**
 * §4.7 / §7.4. Forward mode: the user gives a biga start time and gets clock
 * times for every stage.
 *
 * Stages that begin between midnight and 06:00 are flagged, because having to
 * get up at 3 a.m. is the main reason a schedule turns out to be unusable —
 * and knowing before you start is the whole point.
 */
export function TimelineCard(s: AppState) {
  const { timeline, bigaStartAt, setBigaStartAt, startNow, inputs, setInput } = s;
  const startId = useId();
  const [tuning, setTuning] = useState(false);
  const retarded = inputs.schedule === 'retarded';

  return (
    <section className="rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Timeline
        </h2>
        <span className="text-sm text-stone-500 tabular">
          {formatDuration(timeline.totalH)} total
        </span>
      </div>

      <div className="mb-4">
        <label htmlFor={startId} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Biga goes in
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={startId}
            type="datetime-local"
            value={toDatetimeLocal(bigaStartAt)}
            onChange={(e) => {
              const parsed = fromDatetimeLocal(e.target.value);
              if (parsed) setBigaStartAt(parsed);
            }}
            className="min-h-touch w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-lg tabular dark:border-stone-600 dark:bg-stone-950 dark:[color-scheme:dark]"
          />
          <button
            type="button"
            onClick={startNow}
            className="min-h-touch shrink-0 rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
          >
            Now
          </button>
        </div>
      </div>

      {timeline.hasUnsocialHours && (
        <p className="mb-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          Some of this schedule wants you awake between midnight and 6 a.m. Shifting the start time
          moves everything with it — starting between 9 a.m. and 8 p.m. keeps every step in
          daylight.
        </p>
      )}

      <ol className="relative border-l-2 border-stone-200 pl-4 dark:border-stone-700">
        {timeline.stages.map((stage) => (
          <li key={stage.key} className="relative pb-4 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.4rem] top-1.5 size-3 rounded-full border-2 ${
                stage.current
                  ? 'border-amber-600 bg-amber-500'
                  : 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900'
              }`}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold tabular">{formatClock(stage.startsAt)}</span>
              <span className="text-stone-800 dark:text-stone-200">{stage.title}</span>
              <span className="text-sm text-stone-500 tabular">
                {formatDuration(stage.durationH)}
              </span>
              {stage.current && (
                <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-medium text-white">
                  now
                </span>
              )}
              {stage.unsocialStart && (
                <span className="rounded-full border border-amber-500 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                  overnight
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">{stage.description}</p>
          </li>
        ))}

        <li className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.4rem] top-1.5 size-3 rounded-full bg-stone-800 dark:bg-stone-200"
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-semibold tabular">{formatClock(timeline.bakeAt)}</span>
            <span className="font-semibold">Bake</span>
            {timeline.bakeIsUnsocial && (
              <span className="rounded-full border border-amber-500 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                overnight
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            750 °F, full flame, 60–90 s, turning every 15–20 s.
          </p>
        </li>
      </ol>

      <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setTuning((v) => !v)}
          aria-expanded={tuning}
          className="min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
        >
          {tuning ? 'Hide schedule adjustments' : 'Adjust the schedule'}
        </button>

        {tuning && (
          <div className="mt-3 grid gap-5">
            {retarded ? (
              <SliderField
                label="Biga in the fridge"
                unit=" h"
                value={inputs.bigaFridgeH}
                onChange={(v) => setInput('bigaFridgeH', v)}
                min={BOUNDS.bigaFridgeH.min}
                max={BOUNDS.bigaFridgeH.max}
                step={BOUNDS.bigaFridgeH.step}
              />
            ) : (
              <SliderField
                label="Biga at 61–65 °F"
                unit=" h"
                value={inputs.bigaRoomOnlyH}
                onChange={(v) => setInput('bigaRoomOnlyH', v)}
                min={BOUNDS.bigaRoomOnlyH.min}
                max={BOUNDS.bigaRoomOnlyH.max}
                step={BOUNDS.bigaRoomOnlyH.step}
              />
            )}
            <SliderField
              label="Temper"
              unit=" h"
              value={inputs.temperH}
              onChange={(v) => setInput('temperH', v)}
              min={BOUNDS.temperH.min}
              max={BOUNDS.temperH.max}
              step={BOUNDS.temperH.step}
            />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Cold ferment is set in the Batch panel. The balls' room-temperature phase is not
              adjustable — it is computed from the dough temperature you actually hit.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
