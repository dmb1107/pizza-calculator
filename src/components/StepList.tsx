import { useMemo, useState } from 'react';
import { Markdown } from './Markdown';
import { NumberField } from './fields';
import { StepTimer } from './StepTimer';
import { BOUNDS } from '../state/defaults';
import { formatTempF } from '../lib/format';
import { parseTimerLabel } from '../lib/timers';
import { PHASE_LABELS, STEPS, type Phase, type Step, type StepTable } from '../content/steps';
import { bindTokens, tokenValues } from '../lib/bindTokens';
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
  label,
  summary,
  values,
  bind,
  conditionHolds,
  showWarning,
  checked,
  onToggleChecked,
  onOpenConcept,
  extra,
  timer,
}: {
  step: Step;
  /** "Mix 2" on a repeated instance, so the list reads unambiguously. */
  label?: string;
  summary: string;
  values: string[];
  bind: (text: string) => string;
  /** Whether a `detailWhen` condition holds for the current batch. */
  conditionHolds?: (condition: 'nMix > 1' | 'nBiga > 1') => boolean;
  /** Whether the step-level warning applies. §8.2 bulk-1. */
  showWarning?: boolean;
  checked: boolean;
  onToggleChecked: () => void;
  onOpenConcept: (id: string) => void;
  /** Rendered inside the step, below the summary. Used by mix-7. */
  extra?: React.ReactNode;
  /** The timer control, when this step names a duration. */
  timer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const conditionalDetail =
    step.detailWhen && conditionHolds?.(step.detailWhen.condition)
      ? step.detailWhen.detail
      : undefined;
  const warning = step.warningWhen && showWarning ? step.warningWhen.text : undefined;
  const hasDetail = Boolean(
    step.detail || conditionalDetail || step.watchFor || step.troubleshoot || step.concepts,
  );

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
          aria-label={`Mark "${step.title}"${label ? ` (${label})` : ''} done`}
          className="mt-1 size-6 shrink-0 accent-amber-700 dark:accent-amber-500"
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-lg font-semibold ${checked ? 'text-stone-500 line-through dark:text-stone-500' : ''}`}
          >
            {step.title}
            {label && (
              <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 align-middle text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-200">
                {label}
              </span>
            )}
          </h3>

          <div className={checked ? 'opacity-60' : undefined}>
            <div className="mt-1">
              <Markdown>{summary}</Markdown>
            </div>

            {warning && (
              <div className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                <Markdown>{bind(warning)}</Markdown>
              </div>
            )}

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

                  {/* §8.2: extra detail that applies only to a split batch. */}
                  {conditionalDetail && (
                    <div className="mt-3 border-l-4 border-amber-400 pl-3 dark:border-amber-600">
                      <Markdown>{bind(conditionalDetail)}</Markdown>
                    </div>
                  )}

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
  const nMix = state.result.capacity.nMix;
  const nBiga = state.result.capacity.nBiga;

  /**
   * §8.2a. Expand the repeating steps to one instance per mix.
   *
   * At `nMix = 2` the baker runs `mix-1` through `mix-7`, changes over, then
   * runs them again — so every one of those steps needs its own checkbox and
   * its own timer on each pass. Phase A's 3–4 minute timer had exactly the
   * defect the changeover had, seven times over.
   *
   * The instance id is the whole point: checkbox and timer state key off
   * `mix-2#2` rather than `mix-2`. At `nMix = 1` there is one instance whose id
   * is the bare template id, so nothing changes for 3, 6 or 9 balls — including
   * both calibration bakes — and no persisted checkbox is orphaned.
   */
  const instances = useMemo(() => {
    const out: { key: string; step: Step; mixIndex: number }[] = [];
    for (const step of STEPS) {
      if (!step.repeatsPerMix || nMix === 1) {
        // `mix-8` is a changeover; with one mix there is nothing to change over.
        if (step.suppressOnFinal && nMix === 1) continue;
        out.push({ key: step.id, step, mixIndex: 1 });
        continue;
      }
      for (let i = 1; i <= nMix; i++) {
        // No changeover after the last mix.
        if (step.suppressOnFinal && i === nMix) continue;
        out.push({ key: `${step.id}#${i}`, step, mixIndex: i });
      }
    }
    return out;
  }, [nMix]);

  /** Token table per instance — `{mixIndex}` and `{waterTempNext}` differ. */
  const tokensFor = (mixIndex: number) =>
    mixIndex === 1 ? tokens : tokenValues(state.result, state.scheduleTokens, mixIndex);
  const phases: Phase[] = ['biga', 'mix', 'bulk', 'bake'];
  const doneCount = instances.filter((i) => checkedSteps.has(i.key)).length;

  /**
   * A timer for any step whose label states a duration. The label is bound
   * first, so `{coldFerment} h` and `{temper} h` resolve to real numbers and no
   * step ids need special-casing. `biga-4`'s "per schedule" resolves to nothing,
   * which is right — the timeline owns that one.
   */
  const renderTimer = (step: Step, key: string, bindHere: (t: string) => string) => {
    if (!step.timerLabel) return undefined;
    const spec = parseTimerLabel(bindHere(step.timerLabel));
    if (!spec) return undefined;
    return (
      <StepTimer
        stepId={key}
        spec={spec}
        timer={timers.find((t) => t.stepId === key)}
        now={nowMs}
        onStart={() => startTimer(key, spec)}
        onStop={() => stopTimer(key)}
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
            {doneCount} / {instances.length} done
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
            {instances
              .filter((i) => i.step.phase === phase)
              .map(({ key, step, mixIndex }) => {
                // biga-4 reads differently depending on the schedule.
                const raw =
                  step.summaryRetarded && step.summaryClassic
                    ? inputs.schedule === 'retarded'
                      ? step.summaryRetarded
                      : step.summaryClassic
                    : step.summary;
                const bindHere = (text: string) => bindTokens(text, tokensFor(mixIndex));
                const repeated = step.repeatsPerMix && nMix > 1;
                return (
                  <StepRow
                    key={key}
                    step={step}
                    label={repeated ? `Mix ${mixIndex}` : undefined}
                    summary={bindHere(raw)}
                    values={(step.values ?? []).map(bindHere)}
                    bind={bindHere}
                    conditionHolds={(condition: 'nMix > 1' | 'nBiga > 1') =>
                      condition === 'nMix > 1' ? nMix > 1 : nBiga > 1
                    }
                    showWarning={state.result.staggerUncentredMin > 2}
                    checked={checkedSteps.has(key)}
                    onToggleChecked={() => toggleStep(key)}
                    onOpenConcept={onOpenConcept}
                    // The final-temperature capture belongs to the LAST mix —
                    // it is the dough that goes into the bulk tub last.
                    extra={
                      step.id === 'mix-7' && mixIndex === nMix ? (
                        <FinalTempCapture state={state} />
                      ) : undefined
                    }
                    timer={renderTimer(step, key, bindHere)}
                  />
                );
              })}
          </ol>
        </div>
      ))}
    </section>
  );
}
