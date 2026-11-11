import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ConceptDrawer } from './components/ConceptDrawer';
import { CopyButton } from './components/CopyButton';
import { AboutDrawer, ReferenceDrawer } from './components/ReferenceDrawers';
import { BakeLogPage } from './components/BakeLog';
import { NewBakeReset } from './components/NewBakeReset';
import { StepList } from './components/StepList';
import { TimerBeeper } from './components/StepTimer';
import { TabBar, panelId, tabId } from './components/TabBar';
import { ToppingsPage } from './components/Toppings';
import { IngredientsCard, TargetsCard, WarningsList } from './components/cards';
import { BatchPanel, CalibrationPanel } from './components/panels';
import { TimelineCard } from './components/TimelineCard';
import { useAppState } from './state/useAppState';
import { useToppings } from './state/useToppings';
import { C } from './lib/constants';
import { formatPercent } from './lib/format';
import { liveTimerKeys } from './lib/stepGroups';
import { expandSteps } from './lib/stepInstances';
import { recipeTabMark, type Tab } from './lib/tabs';

/**
 * Commit a reading still being typed before what holds it goes out of view
 * (§7.5, §13.1). iOS keeps a field focused through a tap (FINDINGS-67).
 */
function finishEdit(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

/**
 * Three tabs (§13.1, APP-6): Recipe (the §6 input panels, the §7 output
 * cards, the §4.7 timeline and the §8.2 step list, where the day's readings
 * and each mix's water target sit, in `mix-1`), Toppings (§13.2) and the
 * Bake log (§10). The concept, Reference and About drawers open over
 * whichever tab is showing.
 *
 * Every tab stays mounted and the hidden ones are hidden, so each keeps its
 * place: the Recipe tab's folded rows and open timers, a half-written idea.
 * The page scrolls as one, so the scroll is kept per tab and put back on the
 * way in.
 *
 * Warnings sit above the step list (§7.3) and are never inside a collapsed
 * panel.
 */
export default function App() {
  const state = useAppState();
  const { result, shareUrl, tab, setTab, timers, nowMs } = state;
  const toppings = useToppings(state.github);
  const [concept, setConcept] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'reference' | 'about' | null>(null);

  // --- §13.1 the tabs -----------------------------------------------------------

  const scrolls = useRef<Record<Tab, number>>({ recipe: 0, toppings: 0, log: 0 });
  const restoreScroll = useRef(false);
  const selectTab = useCallback(
    (next: Tab) => {
      // An edit in progress is recorded first, as a fold does (§7.5).
      finishEdit();
      if (next === tab) return;
      scrolls.current[tab] = window.scrollY;
      restoreScroll.current = true;
      setTab(next);
    },
    [tab, setTab],
  );
  // After the switch, before paint: the page comes back where it was left.
  // Not on load, where the browser restores the scroll itself.
  useLayoutEffect(() => {
    if (!restoreScroll.current) return;
    restoreScroll.current = false;
    window.scrollTo(0, scrolls.current[tab]);
  }, [tab]);
  const openLog = useCallback(() => selectTab('log'), [selectTab]);

  // The step instances at this size: the beeper and the Recipe tab's mark
  // read every timer the list renders, on whichever tab is open.
  const nMix = result.capacity.nMix;
  const instances = useMemo(() => expandSteps(nMix, state.inputs.schedule), [nMix, state.inputs.schedule]);
  const liveKeys = useMemo(() => liveTimerKeys(instances, nMix), [instances, nMix]);
  const mark = recipeTabMark(tab, instances, timers, nMix, nowMs);

  /**
   * Flag a due timer in the tab title: one past its lower bound, or its
   * duration for an exact timer.
   *
   * A static page can't wake a locked phone — that needs a service worker and a
   * push server, and §2 rules out a server. This is the honest middle ground:
   * a backgrounded tab still shows that something came due. It says "Check",
   * never "Ready": §7.5 has nothing label the lower bound ready, since a window
   * stage is judged by its cue.
   */
  const dueCount = state.dueTimerStepIds.length;
  useEffect(() => {
    const base = 'Biga Calculator';
    document.title =
      dueCount > 0 ? `(${dueCount}) Check ${dueCount === 1 ? 'timer' : 'timers'} — ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [dueCount]);

  const panelProps = (key: Tab) => ({
    role: 'tabpanel' as const,
    id: panelId(key),
    'aria-labelledby': tabId(key),
    hidden: tab !== key,
  });

  return (
    // The bottom padding keeps the end of every tab clear of the phone's tab
    // bar and the home indicator under it (§13.1).
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8">
      <header className="mb-6 md:mb-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Biga Neapolitan Dough</h1>
        <p className="mt-1 text-stone-600 dark:text-stone-400">
          {formatPercent(C.BIGA_FRACTION)} biga · {formatPercent(C.HYDRATION)} hydration · Grain Craft 00 · Halo Core ·
          Tread
        </p>
      </header>

      <TabBar tab={tab} onSelect={selectTab} mark={mark} />

      {/* §7.5, §13.1: the beep can't belong to anything that leaves the screen
          with the Recipe tab, so it sits above the tabs. */}
      <TimerBeeper timers={timers} now={nowMs} liveKeys={liveKeys} />

      <div {...panelProps('recipe')}>
        {/* minmax(0, 1fr), not the implicit auto column: an auto track grows to
            its widest card's min-content, and the timeline's date field plus
            "Now" pushed the whole page 15 px past a 375 px phone. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {/* §10: Reset starts a new bake, above the panels it clears.
              §13.1: "Share setup" shares this tab's setup, so it sits here. */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <NewBakeReset onReset={state.startNewBake} />
            <CopyButton text={shareUrl} label="Share setup" copiedLabel="Link copied" />
          </div>
          <BatchPanel {...state} onOpenConcept={setConcept} />
          <CalibrationPanel {...state} onOpenLog={openLog} onOpenConcept={setConcept} />
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3">
          <WarningsList warnings={state.alerts} />
          <IngredientsCard result={result} onOpenConcept={setConcept} />
          <TargetsCard result={result} />
          <TimelineCard {...state} />
        </div>

        <div className="mt-6">
          <StepList state={state} onOpenConcept={setConcept} onOpenLog={openLog} />
        </div>
      </div>

      <div {...panelProps('toppings')}>
        <ToppingsPage toppings={toppings} github={state.github} />
      </div>

      <div {...panelProps('log')}>
        <BakeLogPage state={state} toppings={toppings} />
      </div>

      <footer className="mt-8 flex flex-wrap gap-3 border-t border-stone-200 pt-4 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setSheet('reference')}
          className="min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
        >
          Reference tables
        </button>
        <button
          type="button"
          onClick={() => setSheet('about')}
          className="min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
        >
          About &amp; sources
        </button>
      </footer>

      <ConceptDrawer id={concept} onClose={() => setConcept(null)} />
      <ReferenceDrawer open={sheet === 'reference'} onClose={() => setSheet(null)} />
      <AboutDrawer open={sheet === 'about'} onClose={() => setSheet(null)} />
    </div>
  );
}
