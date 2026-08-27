import { Panel } from './Panel';
import { Badge, NumberField, SegmentedField, SliderField, Stepper, ToggleField } from './fields';
import { BOUNDS } from '../state/defaults';
import { formatTempF } from '../lib/format';
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

const SCHEDULE_OPTIONS: { value: Schedule; label: string; description: string }[] = [
  { value: 'retarded', label: 'Retarded biga', description: '2 h room, then 18–20 h fridge' },
  { value: 'classic', label: 'Classic RT', description: '12–18 h at 61–65 °F' },
];

export function BatchPanel(s: AppState) {
  const { inputs, setInput, commitNumber, stepNumber, panels, togglePanel } = s;
  const scheduleLabel = inputs.schedule === 'retarded' ? 'Retarded' : 'Classic RT';

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
          onStep={(d) => stepNumber('balls', d)}
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
          hint="265 g opens to about 11.5–12 inches."
        />
        <SliderField
          label="Cold ferment"
          unit=" h"
          value={inputs.coldFermentH}
          onChange={(v) => setInput('coldFermentH', v)}
          min={BOUNDS.coldFermentH.min}
          max={BOUNDS.coldFermentH.max}
          hint="A classic biga front-loads the fermentation, so the ball proof stays short."
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
  const { inputs, setInput, commitNumber, panels, togglePanel, result } = s;

  // §4.2 / §6: show the coefficient that makes each field worth measuring.
  // d(T_water)/d(T_biga) and C_bowl/Cw both scale with batch size, so they are
  // computed rather than quoted — a fixed number would be wrong at most sizes.
  const { thermal } = result;
  // Quoted as magnitudes: both move the water the OTHER way, and the prose
  // says so, so a signed number here would read as a double negative.
  const bigaSensitivity = ((thermal.cBiga + thermal.cBowl) / thermal.cFreshWater).toFixed(1);
  const bowlSensitivity = (thermal.cBowl / thermal.cFreshWater).toFixed(2);
  const bigaAt = (i: number) => inputs.bigaTempF[i] ?? inputs.bigaTempF[0]!;

  /**
   * §7. Per-mix arrays grow to `nMix` on first edit rather than being resized
   * eagerly, so a single-mix setup keeps serializing as one bare value and old
   * links stay short.
   */
  function withAt<T extends number | null>(
    list: T[],
    index: number,
    value: number,
    bounds: { min: number; max: number },
  ): T[] {
    const next = [...list];
    while (next.length <= index) next.push((next[next.length - 1] ?? null) as T);
    next[index] = Math.min(bounds.max, Math.max(bounds.min, value)) as T;
    return next;
  }

  return (
    <Panel
      title="Today's temperatures"
      summary={`Room ${formatTempF(inputs.roomTempF)} · Biga ${formatTempF(inputs.bigaTempF[0]!)} °F · Bowl ${Math.round(inputs.bowlMassG)} g`}
      open={panels.temperatures}
      onToggle={() => togglePanel('temperatures')}
    >
      <div className="grid gap-6">
        <NumberField
          label="Room temperature"
          unit="°F"
          value={inputs.roomTempF}
          onCommit={(v) => commitNumber('roomTempF', v)}
          min={BOUNDS.roomTempF.min}
          max={BOUNDS.roomTempF.max}
          step={BOUNDS.roomTempF.step}
        />
        <div>
          <NumberField
            label="Flour temperature"
            unit="°F"
            value={inputs.flourSameAsRoom ? inputs.roomTempF : inputs.flourTempF}
            onCommit={(v) => commitNumber('flourTempF', v)}
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
                onCommit={(v) => setInput('bigaTempF', withAt(inputs.bigaTempF, mix.index - 1, v, BOUNDS.bigaTempF))}
                min={BOUNDS.bigaTempF.min}
                max={BOUNDS.bigaTempF.max}
                step={BOUNDS.bigaTempF.step}
                hint={
                  mix.index === 1
                    ? `Measure it — this is the highest-leverage input in the model. Every °F warmer here means about ${bigaSensitivity} °F cooler water, so a 6 °F guess is 11 °F of water and 3.5 °F of finished dough. Take the reading after tearing the biga, not at the pull: handling gains about 5 °F that the bowl does not share.`
                    : `Re-read it before this mix. The waiting biga has been warming toward the room the whole time the previous mix ran, and that drift is not modelled — there is no data for it.`
                }
              />
              {mix.index === 1 && (
                <SegmentedField
                  legend={many ? 'Bowl state at mix 1' : 'Bowl state at mix'}
                  value={inputs.bowlState}
                  options={BOWL_STATE_OPTIONS}
                  onChange={(v) => setInput('bowlState', v)}
                  hint="The biga always ferments in the mixer bowl, so it is normally cold. Later mixes start in the bowl that just finished the one before. Rinsing resets it to about the rinse temperature in under a minute if a target lands awkwardly."
                />
              )}
              <NumberField
                label={bowlLabel}
                unit="°F"
                value={measuredBowl ?? mix.bowlTempF}
                onCommit={(v) => setInput('bowlTempF', withAt(inputs.bowlTempF, mix.index - 1, v, BOUNDS.bowlTempF))}
                min={BOUNDS.bowlTempF.min}
                max={BOUNDS.bowlTempF.max}
                step={BOUNDS.bowlTempF.step}
                hint={`${measuredBowl == null ? `Prefilled from ${mix.index === 1 ? 'the bowl state above' : 'the previous mix'}. ` : 'Measured — a reading always beats the prefill. '}Worth ${bowlSensitivity} °F of water per °F at this mix size, which is three times what it costs the dough. That gap is why it earns a measurement even though the dough barely notices.`}
              />
            </div>
          );
        })}
        <NumberField
          label="Mixer bowl mass"
          unit="g"
          value={inputs.bowlMassG}
          onCommit={(v) => commitNumber('bowlMassG', v)}
          min={BOUNDS.bowlMassG.min}
          max={BOUNDS.bowlMassG.max}
          step={BOUNDS.bowlMassG.step}
          hint="Weigh it once. The bowl absorbs friction energy alongside the dough — leaving it out of the model put the water 5 °F wrong on the first bake. Its mass matters far more than its temperature, which is why this one is weighed once and the temperature above is read every time."
        />
      </div>
    </Panel>
  );
}

export function CalibrationPanel(s: AppState) {
  const {
    inputs,
    panels,
    togglePanel,
    friction,
    setFrictionForCurrentBatch,
    clearFrictionForCurrentBatch,
    calibration,
    setDdtOverride,
    autoDdtF,
    ddtF,
  } = s;

  const ddtIsAuto = calibration.ddtOverrideF === null;

  return (
    <Panel
      title="Calibration"
      summary={`FF ${formatTempF(friction.ff)} °F${friction.isEstimate ? ' (estimated)' : ''} · DDT ${formatTempF(ddtF)} °F${ddtIsAuto ? ' (auto)' : ''}`}
      open={panels.calibration}
      onToggle={() => togglePanel('calibration')}
    >
      <div className="grid gap-6">
        <div>
          <NumberField
            label={`Friction factor · ${inputs.balls}-ball batch`}
            unit="°F"
            value={friction.ff}
            onCommit={setFrictionForCurrentBatch}
            min={BOUNDS.frictionFactorF.min}
            max={BOUNDS.frictionFactorF.max}
            step={BOUNDS.frictionFactorF.step}
            badge={
              friction.isEstimate ? (
                <Badge tone="estimate">estimated — not yet calibrated</Badge>
              ) : (
                <Badge tone="measured">measured {friction.measuredAt}</Badge>
              )
            }
            hint={
              friction.isEstimate
                ? 'Stored separately for each batch size. A 9-ball batch runs hotter than a 3-ball, so one number will not do.'
                : `Recorded for ${inputs.balls} balls. Other batch sizes keep their own value.`
            }
          />
          {!friction.isEstimate && (
            <button
              type="button"
              onClick={clearFrictionForCurrentBatch}
              className="mt-2 min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
            >
              Clear this measurement
            </button>
          )}
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
