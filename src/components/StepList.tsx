import { useMemo, useState } from 'react';
import { Markdown } from './Markdown';
import { StepTimer } from './StepTimer';
import { BakeLogCard, FinalTempCapture, WaterPouredCapture } from './BakeLog';
import { parseTimerLabel } from '../lib/timers';
import { loggedTimerTag } from '../lib/bakeLog';
import { SpeedIndicator } from './SpeedIndicator';
import {
  PHASE_LABELS,
  type DetailCondition,
  type Phase,
  type Step,
  type StepTable,
} from '../content/steps';
import { bindTokens, tokenValues } from '../lib/bindTokens';
import {
  detailConditionContext,
  detailConditionHolds,
  expandSteps,
  summaryFor,
  timerLabelFor,
} from '../lib/stepInstances';
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
  timerLabel,
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
  /** The bound timer chip, resolved for the schedule by `timerLabelFor`. */
  timerLabel?: string;
  bind: (text: string) => string;
  /** Whether a `detailWhen` condition holds for the current batch. */
  conditionHolds?: (condition: DetailCondition) => boolean;
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
        {/* The box is 24 px; the label around it is the 48 px touch target
            (Task 10 — the most-tapped control, with floury fingers). The
            negative margin keeps the layout where the bare box had it.
            self-start: a flex item stretches by default, which made the
            whole left edge of an expanded step — 381 px of it — a tap that
            ticks the step, exactly where a thumb rests while scrolling. */}
        <label className="-m-3 flex shrink-0 cursor-pointer self-start p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleChecked}
            aria-label={`Mark "${step.title}"${label ? ` (${label})` : ''} done`}
            className="mt-1 size-6 accent-amber-700 dark:accent-amber-500"
          />
        </label>
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

            {(values.length > 0 || timerLabel) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.map((v) => (
                  <span
                    key={v}
                    className="rounded-lg bg-amber-100 px-2 py-1 text-sm font-medium text-amber-950 tabular dark:bg-amber-950/50 dark:text-amber-100"
                  >
                    {v}
                  </span>
                ))}
                {timerLabel && (
                  <span className="rounded-lg bg-stone-200 px-2 py-1 text-sm font-medium tabular dark:bg-stone-800">
                    {timerLabel}
                  </span>
                )}
              </div>
            )}

            {step.speed && (
              <SpeedIndicator dial={step.speed.dial} rpm={step.speed.rpm} />
            )}

            {step.watchFor && (
              // Markdown, not plain text: mix-7's cue ends "and **DDT ±1 °F.**"
              // and rendering it raw put literal asterisks around the one number
              // that decides whether the mix is done.
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

export function StepList({
  state,
  onOpenConcept,
  onOpenLog,
}: {
  state: AppState;
  onOpenConcept: (id: string) => void;
  onOpenLog: () => void;
}) {
  const {
    tokens,
    checkedSteps,
    toggleStep,
    inputs,
    timers,
    startTimer,
    stopTimer,
    clearTimer,
    nowMs,
  } = state;
  const nMix = state.result.capacity.nMix;

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
  const instances = useMemo(
    () => expandSteps(nMix, inputs.schedule),
    [nMix, inputs.schedule],
  );

  /** Token table per instance — `{mixIndex}` and `{waterTempNext}` differ. */
  const tokensFor = (mixIndex: number) =>
    mixIndex === 1 ? tokens : tokenValues(state.result, state.scheduleTokens, mixIndex);
  const phases: Phase[] = ['biga', 'mix', 'bulk', 'bake'];
  const doneCount = instances.filter((i) => checkedSteps.has(i.key)).length;

  /**
   * A timer for any step whose label states a duration. The label is bound
   * first, so `{coldFerment} h` and `{ballRoomMin} min` resolve to real numbers and
   * no step ids need special-casing. A range ("18–20 h") is a window (§7.5).
   */
  const renderTimer = (label: string | undefined, key: string, stepId: string) => {
    if (!label) return undefined;
    const spec = parseTimerLabel(label);
    if (!spec) return undefined;
    const timer = timers.find((t) => t.stepId === key);
    return (
      <StepTimer
        stepId={key}
        spec={spec}
        timer={timer}
        tag={loggedTimerTag(stepId, timer)}
        note={timers[0]?.stepId === key ? timerNote : undefined}
        now={nowMs}
        onStart={() => startTimer(key, spec)}
        onStop={() => stopTimer(key)}
        onClear={() => clearTimer(key)}
      />
    );
  };

  /**
   * Shown inside the earliest-started running timer, not above the list: at
   * the top it appeared with the first Start and pushed the step you had just
   * tapped 118 px down the page (Task 10). Below the tap point, nothing the
   * finger is on moves.
   */
  const timerNote = (
    <>
      Timers run from the clock, so they stay correct if the phone locks or the
      page reloads. They can only sound while this page is open, so for a long
      stage, set a phone alarm as well.
    </>
  );

  return (
    <section>
      {/* §10: no Reset here. The page's Reset, above the panels, clears the
          checkboxes along with the rest of the bake. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Steps
        </h2>
        <span className="text-sm text-stone-500 tabular">
          {doneCount} / {instances.length} done
        </span>
      </div>

      {phases.map((phase) => (
        <div key={phase} className="mb-5 last:mb-0">
          <h3 className="mb-2 text-base font-semibold text-stone-800 dark:text-stone-200">
            {PHASE_LABELS[phase]}
          </h3>
          <ol className="grid gap-2">
            {instances
              .filter((i) => i.step.phase === phase)
              .map(({ key, step, mixIndex }) => {
                const bindHere = (text: string) => bindTokens(text, tokensFor(mixIndex));
                // biga-4 reads and times differently depending on the schedule.
                const timerLabel = timerLabelFor(step, inputs.schedule, inputs.bigaRoomOnlyH);
                const boundTimer = timerLabel === undefined ? undefined : bindHere(timerLabel);
                const repeated = step.repeatsPerMix && nMix > 1;
                return (
                  <StepRow
                    key={key}
                    step={step}
                    label={repeated ? `Mix ${mixIndex}` : undefined}
                    summary={bindHere(summaryFor(step, inputs.schedule))}
                    values={(step.values ?? []).map(bindHere)}
                    timerLabel={boundTimer}
                    bind={bindHere}
                    conditionHolds={(condition) =>
                      detailConditionHolds(condition, detailConditionContext(state.result, tokens))
                    }
                    showWarning={state.result.staggerUncentredMin > 2}
                    checked={checkedSteps.has(key)}
                    onToggleChecked={() => toggleStep(key)}
                    onOpenConcept={onOpenConcept}
                    // §10: each reading is captured in the step where it is
                    // taken — the poured water in Phase A, each mix's final
                    // temperature at its end.
                    extra={
                      step.id === 'mix-2' ? (
                        <WaterPouredCapture state={state} mixIndex={mixIndex} />
                      ) : step.id === 'mix-7' ? (
                        <FinalTempCapture state={state} mixIndex={mixIndex} />
                      ) : undefined
                    }
                    timer={renderTimer(boundTimer, key, step.id)}
                  />
                );
              })}
            {/* The log card follows the last mix, once every mix has been
                read. Its own item, so ticking mix-7 doesn't dim it. */}
            {phase === 'mix' && (
              <li className="min-w-0">
                <BakeLogCard state={state} onOpenLog={onOpenLog} />
              </li>
            )}
          </ol>
        </div>
      ))}
    </section>
  );
}
