import { Panel } from './Panel';
import { Badge, NumberField, SegmentedField, SliderField, Stepper, ToggleField } from './fields';
import { BOUNDS } from '../state/defaults';
import { formatTempF } from '../lib/format';
import type { AppState } from '../state/useAppState';
import type { Schedule } from '../state/types';

/** The three input panels of §6. */

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
  const { inputs, setInput, commitNumber, panels, togglePanel } = s;

  return (
    <Panel
      title="Today's temperatures"
      summary={`Room ${formatTempF(inputs.roomTempF)} · Biga ${formatTempF(inputs.bigaTempF)} °F · Bowl ${Math.round(inputs.bowlMassG)} g`}
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
        <NumberField
          label="Biga temperature at mix"
          unit="°F"
          value={inputs.bigaTempF}
          onCommit={(v) => commitNumber('bigaTempF', v)}
          min={BOUNDS.bigaTempF.min}
          max={BOUNDS.bigaTempF.max}
          step={BOUNDS.bigaTempF.step}
          hint="Measure it. This is the largest single term in the water calculation."
        />
        <NumberField
          label="Mixer bowl mass"
          unit="g"
          value={inputs.bowlMassG}
          onCommit={(v) => commitNumber('bowlMassG', v)}
          min={BOUNDS.bowlMassG.min}
          max={BOUNDS.bowlMassG.max}
          step={BOUNDS.bowlMassG.step}
          hint="Weigh it once. The bowl absorbs friction energy alongside the dough — leaving it out of the model put the water 5 °F wrong on the first bake. There is no bowl-temperature field: it sits at the biga's temperature after fermenting in it, and the difference is worth about 0.3 °F."
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
