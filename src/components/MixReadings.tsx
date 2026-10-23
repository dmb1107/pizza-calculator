import { NumberField, ToggleField } from './fields';
import { WarningItem } from './cards';
import { BOUNDS } from '../state/defaults';
import { atMix } from '../lib/engine';
import { formatTempF } from '../lib/format';
import type { AppState } from '../state/useAppState';

/**
 * §6 *Readings in the steps* and §7.2, in `mix-1`: the readings the water
 * target needs, then that mix's target directly under them, so it updates as
 * each reading goes in and the water is blended before Phase A.
 *
 * Room and flour sit on mix 1 only; biga and bowl on every mix. Each field
 * shows its value or the default the engine is using, so nothing is hidden
 * until a reading is entered. Labels and hints are §6's table, and only those:
 * no sensitivity figures beside the fields (Dave's call, MESSAGE-54).
 */
export function MixReadings({ state, mixIndex }: { state: AppState; mixIndex: number }) {
  const { inputs, result, setInput, commitReading } = state;
  const i = mixIndex - 1;
  const mix = result.mixes[i];
  if (!mix) return null;
  const split = result.mixes.length > 1;
  // Read by index (§6): a later mix with no reading of its own shows its
  // prefill, never an earlier mix's reading. The biga carries forward, as
  // the engine reads it.
  const measuredBowl = inputs.bowlTempF[i] ?? null;

  return (
    <div className="mt-4 rounded-lg border border-stone-300 p-3 dark:border-stone-700">
      <div className="grid gap-4">
        {mixIndex === 1 && (
          <>
            <NumberField
              label="Room"
              unit="°F"
              value={inputs.roomTempF}
              onCommit={(v) => commitReading('roomTempF', v)}
              min={BOUNDS.roomTempF.min}
              max={BOUNDS.roomTempF.max}
              step={BOUNDS.roomTempF.step}
            />
            <div>
              <NumberField
                label="Flour"
                unit="°F"
                value={inputs.flourSameAsRoom ? inputs.roomTempF : inputs.flourTempF}
                onCommit={(v) => commitReading('flourTempF', v)}
                min={BOUNDS.flourTempF.min}
                max={BOUNDS.flourTempF.max}
                step={BOUNDS.flourTempF.step}
                disabled={inputs.flourSameAsRoom}
              />
              <ToggleField
                label="Same as room"
                checked={inputs.flourSameAsRoom}
                onChange={(v) => setInput('flourSameAsRoom', v)}
              />
            </div>
          </>
        )}
        <NumberField
          label="Biga, after crumbling"
          unit="°F"
          value={atMix(inputs.bigaTempF, i)}
          onCommit={(v) => commitReading('bigaTempF', v, i)}
          min={BOUNDS.bigaTempF.min}
          max={BOUNDS.bigaTempF.max}
          step={BOUNDS.bigaTempF.step}
        />
        <NumberField
          label="Bowl"
          unit="°F"
          value={measuredBowl ?? mix.bowlTempF}
          onCommit={(v) => commitReading('bowlTempF', v, i)}
          min={BOUNDS.bowlTempF.min}
          max={BOUNDS.bowlTempF.max}
          step={BOUNDS.bowlTempF.step}
          hint={
            mixIndex === 1
              ? 'Hold the probe against the inside wall of the bowl for five seconds.'
              : 'The bowl is warm from the last mix. Read it again.'
          }
        />
      </div>

      {/* §7.2: one number, large, and one line. The water warnings (§4.4)
          render under it rather than in the strip (§7.3). */}
      <div className="mt-4 border-t border-stone-200 pt-3 dark:border-stone-800">
        <p className="text-stone-600 dark:text-stone-400">
          {split ? `Mix ${mixIndex} water target` : 'Water target'}
        </p>
        <p className="text-5xl font-bold tabular">
          {formatTempF(mix.waterTempF)}
          <span className="ml-1 text-2xl font-normal text-stone-500">°F</span>
        </p>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Blend fridge-cold and tap water to hit it, measuring as you pour.
        </p>
        {mix.warnings.length > 0 && (
          <div className="mt-3 grid gap-2">
            {mix.warnings.map((w) => (
              <WarningItem key={w.id} warning={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
