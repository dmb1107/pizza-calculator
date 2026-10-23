import { useState } from 'react';
import { Panel } from './Panel';
import { Markdown } from './Markdown';
import { CAPACITY } from '../content/capacity';
import { conceptById } from '../content/concepts';
import { Badge, NumberField, SegmentedField, SliderField, Stepper } from './fields';
import { BOUNDS, COLD_FERMENT_H } from '../state/defaults';
import { formatBallsPerMix, formatTempF } from '../lib/format';
import type { AppState } from '../state/useAppState';
import type { Schedule } from '../state/types';

/**
 * The two input panels of §6, Batch and Calibration. The day's readings
 * aren't a panel: each sits in the step where it's taken (`MixReadings`).
 */

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
        />
        <SliderField
          label="Cold ferment"
          unit=" h"
          value={inputs.coldFermentH}
          onChange={(v) => setInput('coldFermentH', v)}
          min={COLD_FERMENT_H[inputs.schedule].min}
          max={COLD_FERMENT_H[inputs.schedule].max}
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

/**
 * §6 Panel 2. The FF is shown, not typed: it comes from the bake log by §6's
 * rule, and the badge says which step of the rule produced it. There is no
 * manual override (MESSAGE-45): a typed value would outrank the measurements.
 */
const FRICTION_HINT: Record<1 | 2 | 3 | 4, string> = {
  1: 'From your logged bakes at this mix size. Each bake is corrected to the middle of every phase time first.',
  2: 'No bakes at this mix size yet, so this sits on the line between the logged sizes either side.',
  3: 'No bakes at this mix size yet, so this is the nearest logged size, held flat.',
  4: 'Your bake log has no bake yet with every reading and phase time. The first one replaces this at every mix size.',
};

/** §8.3: the calibration panel links `friction-factor`. */
const FRICTION_CONCEPT_ID = 'friction-factor';

export function CalibrationPanel(s: AppState & { onOpenLog: () => void; onOpenConcept: (id: string) => void }) {
  const { inputs, panels, togglePanel, friction, calibration, setDdtOverride, autoDdtF, ddtF, mixSize, onOpenLog, onOpenConcept } = s;

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
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenLog}
              className="min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
            >
              Open the bake log
            </button>
            {/* §7.5: a concept link reads "Read more: {title}". */}
            <button
              type="button"
              onClick={() => onOpenConcept(FRICTION_CONCEPT_ID)}
              className="min-h-touch rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
            >
              Read more: {conceptById(FRICTION_CONCEPT_ID)?.title ?? FRICTION_CONCEPT_ID}
            </button>
          </div>
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
