import { useState } from 'react';
import { Markdown } from './Markdown';
import { NumberField } from './fields';
import { StepTimer } from './StepTimer';
import { BOUNDS } from '../state/defaults';
import { formatTempF } from '../lib/format';
import { parseTimerLabel } from '../lib/timers';
import { PHASE_LABELS, STEPS, type Phase, type Step, type StepTable } from '../content/steps';
import { bindTokens } from '../lib/bindTokens';
import type { AppState } from '../state/useAppState';

/**
 * §7.5 / §8.2 step list.
 *
 * "Each step: a checkbox that persists, a summary, computed values inlined, an
 * expandable 'Why', and a timer where a duration applies."
 *
 * Progressive disclosure is design priority 3: terse by default, with the full
 * §8 reasoning one tap away. The detail is collapsed, never cut.
 */

function Table({ table }: { table: StepTable }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[26rem] border-collapse text-sm">
        <thead className="border-b border-stone-300 dark:border-stone-600">
          <tr>
            {table.headers.map((h) => (
              <th key={h} className="px-2 py-2 text-left align-top font-semibold">
                <Markdown>{h}</Markdown>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b border-stone-200 px-2 py-2 align-top dark:border-stone-800"
                >
                  <Markdown>{cell}</Markdown>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepRow({
  step,
  summary,
  values,
  bind,
  checked,
  onToggleChecked,
  onOpenConcept,
  extra,
  timer,
}: {
  step: Step;
  summary: string;
  values: string[];
  bind: (text: string) => string;
  checked: boolean;
  onToggleChecked: () => void;
  onOpenConcept: (id: string) => void;
  /** Rendered inside the step, below the summary. Used by mix-7. */
  extra?: React.ReactNode;
  /** The timer control, when this step names a duration. */
  timer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(step.detail || step.watchFor || step.troubleshoot || step.concepts);

  return (
    <li
      // min-w-0: as a grid item this defaults to min-width:auto, which would
      // let the min-width on a wide table inside propagate all the way up and
      // push the whole page sideways instead of scrolling within its own
      // container. Every ancestor between here and an overflow-x-auto wrapper
      // needs to be allowed to shrink.
      className={`min-w-0 rounded-xl border p-4 ${
        checked
          ? 'border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/40'
          : 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900'
      }`}
    >
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleChecked}
          aria-label={`Mark "${step.title}" done`}
          className="mt-1 size-6 shrink-0 accent-amber-700 dark:accent-amber-500"
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-lg font-semibold ${checked ? 'text-stone-500 line-through dark:text-stone-500' : ''}`}
          >
            {step.title}
          </h3>

          <div className={checked ? 'opacity-60' : undefined}>
            <div className="mt-1">
              <Markdown>{summary}</Markdown>
            </div>

            {(values.length > 0 || step.speed || step.timerLabel) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.map((v) => (
                  <span
                    key={v}
                    className="rounded-lg bg-amber-100 px-2 py-1 text-sm font-medium text-amber-950 tabular dark:bg-amber-950/50 dark:text-amber-100"
                  >
                    {v}
                  </span>
                ))}
                {step.speed && (
                  <span className="rounded-lg bg-stone-200 px-2 py-1 text-sm font-medium tabular dark:bg-stone-800">
                    {step.speed.label}
                  </span>
                )}
                {step.timerLabel && (
                  <span className="rounded-lg bg-stone-200 px-2 py-1 text-sm font-medium tabular dark:bg-stone-800">
                    {bind(step.timerLabel)}
                  </span>
                )}
              </div>
            )}

            {step.watchFor && (
              // Markdown, not plain text: mix-7's cue ends "**and at DDT ±1 °F.**"
              // and rendering it raw put literal asterisks in front of the one
              // number §8 calls a pass/fail gate.
              <div className="mt-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                <span className="font-semibold">Watch for: </span>
                <span className="[&_div]:inline [&_p]:my-0 [&_p]:inline">
                  <Markdown>{step.watchFor}</Markdown>
                </span>
              </div>
            )}

            {timer}
            {extra}
          </div>

          {hasDetail && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mt-3 min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
              >
                {open ? 'Hide why' : 'Why'}
              </button>

              {open && (
                <div className="mt-2 border-t border-stone-200 pt-3 dark:border-stone-800">
                  {step.detail && <Markdown>{bind(step.detail)}</Markdown>}

                  {step.troubleshoot && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                        If it goes wrong
                      </h4>
                      <Table table={step.troubleshoot} />
                    </div>
                  )}

                  {step.concepts && step.concepts.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {step.concepts.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onOpenConcept(id)}
                          className="min-h-touch rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
                        >
                          Read more: {id.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Records the final dough temperature at the end of the mix.
 *
 * One number, two uses: it shapes the balls' room-temperature phase (§4.8) and
 * it is the input the bake log needs to solve for a real friction factor.
 * Placed here rather than in an input panel because this is the moment the
 * probe comes out of the dough.
 */
function FinalTempCapture({ state }: { state: AppState }) {
  const { inputs, setInput, result } = state;
  const measured = inputs.finalDoughTempF;

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
      <NumberField
        label="Final dough temperature"
        unit="°F"
        value={measured ?? result.ddtF}
        onCommit={(v) => setInput('finalDoughTempF', v)}
        min={BOUNDS.finalDoughTempF.min}
        max={BOUNDS.finalDoughTempF.max}
        step={BOUNDS.finalDoughTempF.step}
        hint={
          measured === null
            ? `Not measured yet — planning at DDT ${formatTempF(result.ddtF)} °F, which gives ${Math.round(result.roomMinutes)} min at room temperature.`
            : `Room temperature shortened or extended to ${Math.round(result.roomMinutes)} min to compensate. Every later stage moves with it.`
        }
      />
      {measured !== null && (
        <button
          type="button"
          onClick={() => setInput('finalDoughTempF', null)}
          className="mt-2 min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
        >
          Clear — back to planning
        </button>
      )}
    </div>
  );
}

export function StepList({
  state,
  onOpenConcept,
}: {
  state: AppState;
  onOpenConcept: (id: string) => void;
}) {
  const {
    tokens,
    checkedSteps,
    toggleStep,
    clearCheckedSteps,
    inputs,
    timers,
    startTimer,
    stopTimer,
    nowMs,
  } = state;
  const bind = (text: string) => bindTokens(text, tokens);

  const phases: Phase[] = ['biga', 'mix', 'bulk', 'bake'];
  const doneCount = STEPS.filter((s) => checkedSteps.has(s.id)).length;

  /**
   * A timer for any step whose label states a duration. The label is bound
   * first, so `{coldFerment} h` and `{temper} h` resolve to real numbers and no
   * step ids need special-casing. `biga-4`'s "per schedule" resolves to nothing,
   * which is right — the timeline owns that one.
   */
  const renderTimer = (step: Step) => {
    if (!step.timerLabel) return undefined;
    const spec = parseTimerLabel(bind(step.timerLabel));
    if (!spec) return undefined;
    return (
      <StepTimer
        stepId={step.id}
        spec={spec}
        timer={timers.find((t) => t.stepId === step.id)}
        now={nowMs}
        onStart={() => startTimer(step.id, spec)}
        onStop={() => stopTimer(step.id)}
      />
    );
  };

  const timerNote = timers.length > 0 && (
    <p className="mb-3 rounded-lg border border-stone-300 bg-stone-50 p-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
      Timers read the clock, so they stay right if your phone locks or you
      reload. They can only sound while this page is open, though — for a long
      stage, set a phone alarm as well.
    </p>
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Steps
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 tabular">
            {doneCount} / {STEPS.length} done
          </span>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={clearCheckedSteps}
              className="min-h-touch rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {timerNote}

      {phases.map((phase) => (
        <div key={phase} className="mb-5 last:mb-0">
          <h3 className="mb-2 text-base font-semibold text-stone-800 dark:text-stone-200">
            {PHASE_LABELS[phase]}
          </h3>
          <ol className="grid gap-2">
            {STEPS.filter((s) => s.phase === phase).map((step) => {
              // biga-4 reads differently depending on the schedule.
              const raw =
                step.summaryRetarded && step.summaryClassic
                  ? inputs.schedule === 'retarded'
                    ? step.summaryRetarded
                    : step.summaryClassic
                  : step.summary;
              return (
                <StepRow
                  key={step.id}
                  step={step}
                  summary={bind(raw)}
                  values={(step.values ?? []).map(bind)}
                  bind={bind}
                  checked={checkedSteps.has(step.id)}
                  onToggleChecked={() => toggleStep(step.id)}
                  onOpenConcept={onOpenConcept}
                  extra={step.id === 'mix-7' ? <FinalTempCapture state={state} /> : undefined}
                  timer={renderTimer(step)}
                />
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
