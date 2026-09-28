import { useState } from 'react';
import { Panel } from './Panel';
import { Markdown } from './Markdown';
import { CAPACITY } from '../content/capacity';
import { Badge, NumberField, SegmentedField, SliderField, Stepper, ToggleField } from './fields';
import { BOUNDS } from '../state/defaults';
import { bigaReadingCost, bowlReadingCost } from '../lib/engine';
import { formatBallsPerMix, formatCoefficient, formatInches, formatTempF } from '../lib/format';
import type { AppState } from '../state/useAppState';
import type { BowlState, Schedule } from '../state/types';

/** The three input panels of §6. */

/**
 * §4.2. Each option prefills the bowl temperature from a value already in the
 * model — deliberately no new constants. This selects MIX 1; a split batch
 * always runs later mixes in the bowl that just finished the previous one.
 */
const BOWL_STATE_OPTIONS: { value: BowlState; label: string; description: string }[] = [
  { value: 'cold', label: 'Held the biga', description: 'Cold — the usual case' },
  { value: 'room', label: 'Room temperature', description: 'Washed and left out' },
  { value: 'warm', label: 'Warm from a previous mix', description: 'Straight off the last mix' },
];

/**
 * The biga hint's worked example, §6's "a 6 °F miss": how far off a guessed
 * reading might be. An illustration, not a model input — the figures it
 * produces are computed, on the basis the bowl field is actually on.
 */
const BIGA_GUESS_EXAMPLE_F = 6;

const SCHEDULE_OPTIONS: { value: Schedule; label: string; description: string }[] = [
  { value: 'retarded', label: 'Retarded biga', description: '2 h room, then 18–20 h fridge' },
  { value: 'classic', label: 'Classic RT', description: '12–18 h at 61–65 °F' },
];

export function BatchPanel(s: AppState) {
  const { inputs, setInput, commitNumber, stepNumber, panels, togglePanel, ballsSplitHint } = s;
  const scheduleLabel = inputs.schedule === 'retarded' ? 'Retarded' : 'Classic RT';
  // §7.3: stepping below 3 shows why, next to the field. Cleared by the next step up.
  const [belowMin, setBelowMin] = useState(false);

  return (
    <Panel
      title="Batch"
      summary={`${inputs.balls} × ${inputs.ballWeightG} g · ${inputs.coldFermentH} h cold · ${scheduleLabel}`}
      open={panels.batch}
      onToggle={() => togglePanel('batch')}
    >
      <div className="grid gap-6">
        <Stepper
          label="Number of balls"
          value={inputs.balls}
          onStep={(d) => {
            setBelowMin(false);
            stepNumber('balls', d);
          }}
          onBelowMin={() => setBelowMin(true)}
          hint={
            belowMin ? (
              <Markdown className="text-amber-900 dark:text-amber-200">{CAPACITY.minimumAtInput}</Markdown>
            ) : (
              ballsSplitHint
            )
          }
          min={BOUNDS.balls.min}
          max={BOUNDS.balls.max}
        />
        <NumberField
          label="Ball weight"
          unit="g"
          value={inputs.ballWeightG}
          onCommit={(v) => commitNumber('ballWeightG', v)}
          min={BOUNDS.ballWeightG.min}
          max={BOUNDS.ballWeightG.max}
          step={BOUNDS.ballWeightG.step}
          // §4.9's figure for the weight entered, never a typed one: this hint
          // said "265 g opens to about 11.5–12 inches" for three rounds after
          // §4.9 retracted it, invisible to the §8 gate because it isn't §8.
          hint={`Opens to about ${formatInches(s.result.opening.openDiameterIn)} inches.`}
        />
        <SliderField
          label="Cold ferment"
          unit=" h"
          value={inputs.coldFermentH}
          onChange={(v) => setInput('coldFermentH', v)}
          min={BOUNDS.coldFermentH.min}
          max={BOUNDS.coldFermentH.max}
          hint="The biga does nearly all the fermentation, so extra time goes into the biga and the ball proof stays short."
        />
        <SegmentedField
          legend="Schedule"
          value={inputs.schedule}
          options={SCHEDULE_OPTIONS}
          onChange={(v) => setInput('schedule', v)}
        />
      </div>
    </Panel>
  );
}

export function TemperaturesPanel(s: AppState) {
  const { inputs, setInput, commitReading, panels, togglePanel, result } = s;

  // §4.2 / §6: show the coefficient that makes each field worth measuring,
  // from the engine and on the right basis — see `bigaReadingCost`.
  const { thermal } = result;
  const bigaCost = bigaReadingCost(thermal, result.mixes[0]!.bowlTracksBiga, BIGA_GUESS_EXAMPLE_F);
  const bowlCost = bowlReadingCost(thermal);
  const bigaAt = (i: number) => inputs.bigaTempF[i] ?? inputs.bigaTempF[0]!;

  // Every field here is a §10 reading, saved with the bake as it stands.
  // Per-mix lists grow on first edit, so a single-mix setup keeps serializing
  // as one value.

  return (
    <Panel
      title="Today's temperatures"
      summary={`Room ${formatTempF(inputs.roomTempF)} · Biga ${formatTempF(inputs.bigaTempF[0]!)} °F`}
      open={panels.temperatures}
      onToggle={() => togglePanel('temperatures')}
    >
      <div className="grid gap-6">
        <NumberField
          label="Room temperature"
          unit="°F"
          value={inputs.roomTempF}
          onCommit={(v) => commitReading('roomTempF', v)}
          min={BOUNDS.roomTempF.min}
          max={BOUNDS.roomTempF.max}
          step={BOUNDS.roomTempF.step}
        />
        <div>
          <NumberField
            label="Flour temperature"
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
        {result.mixes.map((mix) => {
          const many = result.mixes.length > 1;
          // "at mix" reads as the mix event on a single-mix batch, and as a
          // label collision once each mix has its own pair.
          const bigaLabel = many ? `Biga temperature — mix ${mix.index}` : 'Biga temperature at mix';
          const bowlLabel = many ? `Bowl temperature — mix ${mix.index}` : 'Bowl temperature at mix';
          const measuredBowl = inputs.bowlTempF[mix.index - 1] ?? null;
          return (
            <div key={mix.index} className="grid gap-6">
              <NumberField
                label={bigaLabel}
                unit="°F"
                value={bigaAt(mix.index - 1)}
                onCommit={(v) => commitReading('bigaTempF', v, mix.index - 1)}
                min={BOUNDS.bigaTempF.min}
                max={BOUNDS.bigaTempF.max}
                step={BOUNDS.bigaTempF.step}
                hint={
                  mix.index === 1
                    ? `Measure it: of the temperatures you measure, this one moves the water target most. Each °F warmer here means about ${formatCoefficient(bigaCost.waterPerF, 1)} °F cooler water, so a ${BIGA_GUESS_EXAMPLE_F} °F guess costs ${formatTempF(bigaCost.waterF)} °F of water and ${formatTempF(bigaCost.doughF)} °F of finished dough. Take the reading after tearing the biga, not at the pull: handling gains about 5 °F that the bowl does not share.`
                    : `Re-read it before this mix. The waiting biga has been warming toward room temperature while the previous mix ran. The app doesn't model that drift, because there's no data for it.`
                }
              />
              {mix.index === 1 && (
                <SegmentedField
                  legend={many ? 'Bowl state at mix 1' : 'Bowl state at mix'}
                  value={inputs.bowlState}
                  options={BOWL_STATE_OPTIONS}
                  onChange={(v) => setInput('bowlState', v)}
                  hint="The biga always ferments in the mixer bowl, so the bowl is normally cold. Later mixes start in the bowl the previous mix just left. If a target comes out awkward, rinsing brings the bowl to about the rinse water's temperature in under a minute."
                />
              )}
              <NumberField
                label={bowlLabel}
                unit="°F"
                value={measuredBowl ?? mix.bowlTempF}
                onCommit={(v) => commitReading('bowlTempF', v, mix.index - 1)}
                min={BOUNDS.bowlTempF.min}
                max={BOUNDS.bowlTempF.max}
                step={BOUNDS.bowlTempF.step}
                hint={`${measuredBowl == null ? `Prefilled from ${mix.index === 1 ? 'the bowl state above' : 'the previous mix'}. ` : 'Measured, which replaces the prefill. '}At this mix size each °F of bowl is worth ${formatCoefficient(bowlCost.waterPerF, 2)} °F of water, ${formatCoefficient(bowlCost.waterOverDough, 1)} times its effect on the dough, so it's worth measuring even though the dough barely changes.`}
              />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/**
 * §6 Panel 3. The FF is shown, not typed: it comes from the bake log by §6's
 * rule, and the badge says which step of the rule produced it. There is no
 * manual override (MESSAGE-45): a typed value would outrank the measurements.
 */
const FRICTION_HINT: Record<1 | 2 | 3 | 4, string> = {
  1: 'From your logged bakes at this mix size. Each bake is corrected to the middle of every phase time first.',
  2: 'No bakes at this mix size yet, so this sits on the line between the logged sizes either side.',
  3: 'No bakes at this mix size yet, so this is the nearest logged size, held flat.',
  4: 'Your bake log has no bake yet with every reading and phase time. The first one replaces this at every mix size.',
};

export function CalibrationPanel(s: AppState & { onOpenLog: () => void }) {
  const { inputs, panels, togglePanel, friction, calibration, setDdtOverride, autoDdtF, ddtF, mixSize, onOpenLog } = s;

  const ddtIsAuto = calibration.ddtOverrideF === null;
  const estimated = friction.badge.tone === 'estimate';

  return (
    <Panel
      title="Calibration"
      summary={`FF ${formatTempF(friction.ff)} °F${estimated ? ' (estimated)' : ''} · DDT ${formatTempF(ddtF)} °F${ddtIsAuto ? ' (auto)' : ''}`}
      open={panels.calibration}
      onToggle={() => togglePanel('calibration')}
    >
      <div className="grid gap-6">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {`Friction factor · ${formatBallsPerMix(mixSize)}-ball mix`}
            </span>
            <Badge tone={friction.badge.tone}>{friction.badge.text}</Badge>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular">{`${formatTempF(friction.ff)} °F`}</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{FRICTION_HINT[friction.source.step]}</p>
          <button
            type="button"
            onClick={onOpenLog}
            className="mt-2 min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
          >
            Open the bake log
          </button>
        </div>

        <div>
          <NumberField
            label="Desired dough temperature"
            unit="°F"
            value={ddtF}
            onCommit={setDdtOverride}
            min={BOUNDS.ddtOverrideF.min}
            max={BOUNDS.ddtOverrideF.max}
            step={BOUNDS.ddtOverrideF.step}
            badge={ddtIsAuto ? <Badge tone="measured">auto</Badge> : undefined}
            hint={`Automatic is ${formatTempF(autoDdtF)} °F for a ${inputs.balls}-ball batch.`}
          />
          {!ddtIsAuto && (
            <button
              type="button"
              onClick={() => setDdtOverride(null)}
              className="mt-2 min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
            >
              Back to automatic
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
