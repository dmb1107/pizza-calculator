import { useState } from 'react';
import { Markdown } from './Markdown';
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
}: {
  step: Step;
  summary: string;
  values: string[];
  bind: (text: string) => string;
  checked: boolean;
  onToggleChecked: () => void;
  onOpenConcept: (id: string) => void;
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
              <p className="mt-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/40">
                <span className="font-semibold">Watch for: </span>
                {step.watchFor}
              </p>
            )}
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

export function StepList({
  state,
  onOpenConcept,
}: {
  state: AppState;
  onOpenConcept: (id: string) => void;
}) {
  const { tokens, checkedSteps, toggleStep, clearCheckedSteps, inputs } = state;
  const bind = (text: string) => bindTokens(text, tokens);

  const phases: Phase[] = ['biga', 'mix', 'bulk', 'bake'];
  const doneCount = STEPS.filter((s) => checkedSteps.has(s.id)).length;

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
                />
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
