import { useState } from 'react';
import { Panel } from './Panel';
import { Markdown } from './Markdown';
import { CAPACITY } from '../content/capacity';
import { ConceptLink } from './ConceptLink';
import { PAGE_CONCEPT_LINKS } from '../lib/conceptLinks';
import { Badge, NumberField, SegmentedField, SliderField, Stepper } from './fields';
import { BOUNDS, COLD_FERMENT_H } from '../state/defaults';
import { BIGA_ROOM_TEMP_H, PLANNING_RANGE_H } from '../lib/timeline';
import { formatBallsPerMix, formatTempF } from '../lib/format';
import type { AppState } from '../state/useAppState';
import type { Schedule } from '../state/types';

/**
 * The two input panels of §6, Batch and Calibration. The day's readings
 * aren't a panel: each sits in the step where it's taken (`MixReadings`).
 */

/**
 * §6 Panel 1. Each track's shape, read from the stage table and the input's
 * own bounds: the retarded biga's room stage and §4.7's fridge window, and the
 * classic biga's adjustable room-only range. The 61–65 °F band is published.
 */
const BIGA_FRIDGE_H = PLANNING_RANGE_H.bigaFridge!;
const SCHEDULE_OPTIONS: { value: Schedule; label: string; description: string }[] = [
  {
    value: 'retarded',
    label: 'Retarded biga',
    description: `${BIGA_ROOM_TEMP_H} h room, then ${BIGA_FRIDGE_H[0]}–${BIGA_FRIDGE_H[1]} h fridge`,
  },
  {
    value: 'classic',
    label: 'Classic RT',
    description: `${BOUNDS.bigaRoomOnlyH.min}–${BOUNDS.bigaRoomOnlyH.max} h at 61–65 °F`,
  },
];

/**
 * §6 Panel 1, the cold-ferment slider. Each track's reason for its length,
 * from `schedule-architecture` (MESSAGE-64, W6): the retarded biga arrives
 * less ripe and the balls make it up; the classic biga ripens fully, so the
 * dough's range is short. The classic range is the slider's own.
 */
const COLD_FERMENT_HINT: Record<Schedule, string> = {
  retarded: "The fridge slows the biga, so it arrives less ripe, and the balls' longer cold ferment makes up the difference.",
  classic: `The biga ripens fully at room temperature, so the dough gets only ${COLD_FERMENT_H.classic.min}–${COLD_FERMENT_H.classic.max} hours cold.`,
};

export function BatchPanel(s: AppState & { onOpenConcept: (id: string) => void }) {
  const { inputs, setInput, commitNumber, stepNumber, panels, togglePanel, ballsSplitHint, ballsRaisedNote, onOpenConcept } = s;
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
            ) : ballsRaisedNote ? (
              // §6 (MESSAGE-61): why the count isn't the one chosen, then the split.
              <>
                <span className="block text-amber-900 dark:text-amber-200">{ballsRaisedNote}</span>
                {ballsSplitHint}
              </>
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
        {/* §6 Panel 1: the slider links schedule-architecture, where the length is chosen. */}
        <div className="flex flex-col gap-2">
          <SliderField
            label="Cold ferment"
            unit=" h"
            value={inputs.coldFermentH}
            onChange={(v) => setInput('coldFermentH', v)}
            min={COLD_FERMENT_H[inputs.schedule].min}
            max={COLD_FERMENT_H[inputs.schedule].max}
            hint={COLD_FERMENT_HINT[inputs.schedule]}
          />
          <ConceptLink id={PAGE_CONCEPT_LINKS.coldFerment} onOpen={onOpenConcept} />
        </div>
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
  1: 'From your logged bakes at this mix size. Each bake is corrected for its Phase C time first.',
  2: 'No bakes at this mix size yet, so this sits on the line between the logged sizes either side.',
  3: 'No bakes at this mix size yet, so this is the nearest logged size, held flat.',
  4: 'Your bake log has no bake yet with every reading and phase time. The first one replaces this at every mix size.',
};

export function CalibrationPanel(s: AppState & { onOpenLog: () => void; onOpenConcept: (id: string) => void }) {
  const { panels, togglePanel, friction, calibration, setDdtOverride, autoDdtF, ddtF, mixSize, onOpenLog, onOpenConcept } = s;

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
            {/* §8.3: the Calibration panel links friction-factor. */}
            <ConceptLink id={PAGE_CONCEPT_LINKS.calibration} onOpen={onOpenConcept} />
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
            hint={`Automatic is ${formatTempF(autoDdtF)} °F for a ${formatBallsPerMix(mixSize)}-ball mix.`}
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
