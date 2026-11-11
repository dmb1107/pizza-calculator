import { useEffect, useMemo, useState } from 'react';
import { Markdown } from './Markdown';
import { StepTimer, TimerBeeper } from './StepTimer';
import { WarningItem } from './cards';
import { BakeLogCard, FinalTempCapture } from './BakeLog';
import { MixReadings } from './MixReadings';
import { ConceptLink } from './ConceptLink';
import { formatElapsed, parseTimerLabel, timerPhaseLabel, type TimerPhase } from '../lib/timers';
import {
  closedGroupsIn,
  groupProgress,
  groupSteps,
  groupTimerMark,
  hasRunningTimer,
  lastMixGroupKey,
  liveTimerKeys,
  prepMixesIn,
  stepFolded,
  type GroupTimerMark,
  type StepGroup,
} from '../lib/stepGroups';
import type { Warning } from '../lib/engine';
import { loggedTimerTag } from '../lib/bakeLog';
import { SpeedIndicator } from './SpeedIndicator';
import { type DetailCondition, type Step, type StepTable } from '../content/steps';
import { bindTokens, tokenValues } from '../lib/bindTokens';
import {
  detailConditionContext,
  detailConditionHolds,
  timerSlots,
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
  checked,
  onToggleChecked,
  onOpenConcept,
  extra,
  timer,
  timerRunning,
  foldedWarnings,
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
  checked: boolean;
  onToggleChecked: () => void;
  onOpenConcept: (id: string) => void;
  /** Rendered inside the step, below the summary: the readings in mix-1 and mix-7. */
  extra?: React.ReactNode;
  /** The timer control, when this step names a duration. */
  timer?: React.ReactNode;
  /** Whether one of this step's timers is running: a ticked step stays open while it is. */
  timerRunning: boolean;
  /** `mix-1`'s water warnings, kept in sight while the step is folded (§7.3). */
  foldedWarnings?: readonly Warning[];
}) {
  const [open, setOpen] = useState(false);
  // §7.5 (APP-5): a ticked step reopened by a tap on its row. In memory only,
  // as the "Why" is: after a reload every ticked step is one line again.
  const [reopened, setReopened] = useState(false);
  // A running timer holds a ticked step open (after a Resume, or a reload with
  // one running), and it stays open once the timer stops, as if the baker had
  // opened it. Folding on Stop would pull the next step up under a second tap,
  // and Stop and Resume share a spot so that a double tap is safe.
  useEffect(() => {
    if (checked && timerRunning) setReopened(true);
  }, [checked, timerRunning]);
  const folded = stepFolded(checked, reopened, timerRunning);
  const conditionalDetail =
    step.detailWhen && conditionHolds?.(step.detailWhen.condition)
      ? step.detailWhen.detail
      : undefined;
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
            onChange={() => {
              // Ticking folds the step, so finish a reading still being typed
              // in it first: iOS keeps a field focused through a tap.
              if (!checked) {
                finishEdit();
                setReopened(false);
              }
              onToggleChecked();
            }}
            aria-label={`Mark "${step.title}"${label ? ` (${label})` : ''} done`}
            className="mt-1 size-6 accent-amber-700 dark:accent-amber-500"
          />
        </label>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-lg font-semibold ${checked ? 'text-stone-500 line-through dark:text-stone-500' : ''}`}
          >
            {checked && !timerRunning ? (
              // §7.5: the row of a ticked step opens and folds it, without
              // unticking it. 48 px tall; the negative margin keeps the title
              // where it sits unticked, so nothing moves when it becomes a button.
              <button
                type="button"
                onClick={() => {
                  if (!folded) finishEdit();
                  setReopened(folded);
                }}
                aria-expanded={!folded}
                className="-my-2.5 block min-h-touch w-full py-2.5 text-left line-through"
              >
                {step.title}
                {label && <MixLabel label={label} />}
              </button>
            ) : (
              <>
                {step.title}
                {label && <MixLabel label={label} />}
              </>
            )}
          </h3>

          {folded ? (
            foldedWarnings && foldedWarnings.length > 0 && (
              <div className="mt-3 grid gap-2">
                {foldedWarnings.map((w) => (
                  <WarningItem key={w.id} warning={w} />
                ))}
              </div>
            )
          ) : (
          <>
          <div className={checked ? 'opacity-60' : undefined}>
            <div className="mt-1">
              <Markdown>{summary}</Markdown>
            </div>

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
                        <ConceptLink key={id} id={id} onOpen={onOpenConcept} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>
      </div>
    </li>
  );
}

function MixLabel({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 align-middle text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-200">
      {label}
    </span>
  );
}

/**
 * Commit a reading still being typed, before the step or group holding it
 * folds away. iOS keeps a field focused through a tap (FINDINGS-67), so
 * without this the field would unmount with its edit and record nothing.
 */
function finishEdit(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

const MARK_TONES: Record<TimerPhase, string> = {
  running: 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200',
  window: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  past: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
};

function markText(mark: GroupTimerMark): string {
  return `Timer · ${timerPhaseLabel(mark.phase, false, mark.isWindow)} · ${formatElapsed(mark.elapsedMs)}`;
}

/**
 * §7.5 (APP-5): a group heading is its toggle. It shows the group's count in
 * the list count's form, and, while closed, a mark for a running timer in it,
 * worded and toned as the timer card is, so it turns at the lower bound.
 * The mark sits under the label inside the button: it appears below the
 * point of the tap that closed the group.
 */
function GroupHeading({
  group,
  done,
  total,
  closed,
  mark,
  onToggle,
}: {
  group: StepGroup;
  done: number;
  total: number;
  closed: boolean;
  mark: GroupTimerMark | null;
  onToggle: () => void;
}) {
  const shownMark = closed ? mark : null;
  return (
    <h3 className="mb-2">
      <button
        type="button"
        onClick={() => {
          if (!closed) finishEdit();
          onToggle();
        }}
        aria-expanded={!closed}
        aria-controls={`steps-${group.key}`}
        // The phase without the running time, which would change the label every second.
        aria-label={`${group.label}, ${done} of ${total} done${shownMark ? `, timer ${timerPhaseLabel(shownMark.phase, false, shownMark.isWindow).toLowerCase()}` : ''}`}
        className="flex min-h-touch w-full flex-col justify-center text-left"
      >
        <span className="flex w-full items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`size-5 shrink-0 text-stone-500 transition-transform ${closed ? '-rotate-90' : ''}`}
          >
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="min-w-0 flex-1 text-base font-semibold text-stone-800 dark:text-stone-200">{group.label}</span>
          <span className="shrink-0 text-sm text-stone-500 tabular">
            {done} / {total} done
          </span>
        </span>
        {shownMark && (
          <span className={`mt-1 ml-7 self-start rounded-full px-2 py-0.5 text-sm font-medium tabular ${MARK_TONES[shownMark.phase]}`}>
            {markText(shownMark)}
          </span>
        )}
      </button>
    </h3>
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
    resumeTimer,
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

  /** Token table per instance — `{mixIndex}` and `{nextMixIndex}` differ. */
  // A dough, on a per-dough timer: `{roomMin}` binds that dough's rise (§7.5).
  const tokensFor = (mixIndex: number, dough?: number) =>
    mixIndex === 1 && dough === undefined ? tokens : tokenValues(state.result, state.scheduleTokens, mixIndex, dough);
  const doneCount = instances.filter((i) => checkedSteps.has(i.key)).length;
  // §7.5 (APP-5): the groups, which are closed, and where the log card goes.
  const groups = useMemo(() => groupSteps(instances, nMix), [instances, nMix]);
  const closed = closedGroupsIn(state.closedGroups, groups);
  const logAfter = lastMixGroupKey(groups);
  const liveKeys = useMemo(() => liveTimerKeys(instances, nMix), [instances, nMix]);
  /** §7.3: a mix's water warnings, shown wherever its prep step is folded away. */
  const waterWarnings = (mixIndex: number) => state.result.mixes[mixIndex - 1]?.warnings ?? [];

  /**
   * A timer for any step whose label states a duration. The label is bound
   * first, so `{coldFerment} h` and `{roomMin} min` resolve to real numbers. A
   * range ("18–20 h") is a window (§7.5).
   *
   * At `nMix > 1` the three per-dough steps get one timer per dough, labelled
   * in mix order, each bound with its own dough's tokens and keyed on its own
   * (`timerSlots`, MESSAGE-61). They stack, so starting one grows its card
   * downward and moves nothing above the tap.
   */
  const renderTimers = (rawLabel: string | undefined, instanceKey: string, stepId: string, mixIndex: number) => {
    if (rawLabel === undefined) return undefined;
    const slots = timerSlots(instanceKey, stepId, nMix);
    const rendered = slots.map((slot) => {
      const spec = parseTimerLabel(bindTokens(rawLabel, tokensFor(mixIndex, slot.dough)));
      if (!spec) return null;
      const timer = timers.find((t) => t.stepId === slot.key);
      const control = (
        <StepTimer
          spec={spec}
          timer={timer}
          tag={loggedTimerTag(stepId, timer)}
          note={timers[0]?.stepId === slot.key ? timerNote : undefined}
          now={nowMs}
          onStart={() => startTimer(slot.key, spec)}
          onStop={() => stopTimer(slot.key)}
          onResume={() => resumeTimer(slot.key)}
          onClear={() => clearTimer(slot.key)}
        />
      );
      return slot.label ? (
        <div key={slot.key} className="mt-3">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{slot.label}</p>
          {control}
        </div>
      ) : (
        <div key={slot.key}>{control}</div>
      );
    });
    return rendered.some(Boolean) ? <>{rendered}</> : undefined;
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

      {/* Beeps for every live timer, whatever is folded or closed. */}
      <TimerBeeper timers={timers} now={nowMs} liveKeys={liveKeys} />

      {groups.map((group) => {
        const isClosed = closed.has(group.key);
        const { done, total } = groupProgress(group, checkedSteps);
        // A closed group keeps its mixes' water warnings in sight (§7.3).
        const closedWarnings = isClosed ? prepMixesIn(group).flatMap(waterWarnings) : [];
        return (
          <div key={group.key} className="mb-5 last:mb-0">
            <GroupHeading
              group={group}
              done={done}
              total={total}
              closed={isClosed}
              mark={isClosed ? groupTimerMark(group, timers, nMix, nowMs) : null}
              onToggle={() => state.toggleGroup(group.key)}
            />
            {closedWarnings.length > 0 && (
              <div className="grid gap-2">
                {closedWarnings.map((w, n) => (
                  <WarningItem key={`${w.id}-${n}`} warning={w} />
                ))}
              </div>
            )}
            {!isClosed && (
            <ol id={`steps-${group.key}`} className="grid gap-2">
            {group.instances.map(({ key, step, mixIndex }) => {
                const bindHere = (text: string) => bindTokens(text, tokensFor(mixIndex));
                // biga-4 reads and times differently depending on the schedule.
                const timerLabel = timerLabelFor(step, inputs.schedule, inputs.bigaRoomOnlyH);
                // The chip beside the values: one label, or none when the doughs'
                // differ (bulk-3's rises at a split batch), since each per-dough
                // timer then states its own (§7.5, MESSAGE-61).
                const slotLabels =
                  timerLabel === undefined
                    ? []
                    : timerSlots(key, step.id, nMix).map((slot) => bindTokens(timerLabel, tokensFor(mixIndex, slot.dough)));
                const boundTimer = slotLabels.length > 0 && slotLabels.every((l) => l === slotLabels[0]) ? slotLabels[0] : undefined;
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
                      detailConditionHolds(condition, detailConditionContext(state.result))
                    }
                    checked={checkedSteps.has(key)}
                    onToggleChecked={() => toggleStep(key)}
                    onOpenConcept={onOpenConcept}
                    // §6 / §10: each reading is captured in the step where it
                    // is taken — room, flour, biga and bowl with the water
                    // target in the prep step, each mix's final temperature
                    // at its end. The log takes the target as the water used.
                    extra={
                      step.id === 'mix-1' ? (
                        // Keyed on Reset, so every field remounts from the
                        // reset values (`resetCount`).
                        <MixReadings key={state.resetCount} state={state} mixIndex={mixIndex} />
                      ) : step.id === 'mix-7' ? (
                        <FinalTempCapture key={state.resetCount} state={state} mixIndex={mixIndex} />
                      ) : undefined
                    }
                    timer={renderTimers(timerLabel, key, step.id, mixIndex)}
                    timerRunning={hasRunningTimer(key, timers)}
                    foldedWarnings={step.id === 'mix-1' ? waterWarnings(mixIndex) : undefined}
                  />
                );
              })}
            </ol>
            )}
            {/* The log card follows the last mix's group, outside every group,
                so closing them all never hides Save (§7.5, APP-5). */}
            {group.key === logAfter && (
              <div className="mt-2 min-w-0">
                <BakeLogCard state={state} onOpenLog={onOpenLog} />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
