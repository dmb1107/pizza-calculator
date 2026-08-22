import { useEffect, useState } from 'react';
import { ConceptDrawer } from './components/ConceptDrawer';
import { CopyButton } from './components/CopyButton';
import { StepList } from './components/StepList';
import { IngredientsCard, TargetsCard, WarningsList, WaterIceCard } from './components/cards';
import { BatchPanel, CalibrationPanel, TemperaturesPanel } from './components/panels';
import { TimelineCard } from './components/TimelineCard';
import { useAppState } from './state/useAppState';

/**
 * Tasks 2–6: the §6 input panels, the §7 output cards, the §4.7 timeline, the
 * §8.2 step list and the §8.3 concept drawer.
 *
 * Warnings sit above the step list (§7.3) and are never inside a collapsed
 * panel. Timers are Task 7.
 */
export default function App() {
  const state = useAppState();
  const { result, shareUrl } = state;
  const [concept, setConcept] = useState<string | null>(null);

  /**
   * Flag a finished timer in the tab title.
   *
   * A static page can't wake a locked phone — that needs a service worker and a
   * push server, and §2 rules out a server. This is the honest middle ground:
   * a backgrounded tab still shows that something came due.
   */
  const dueCount = state.dueTimerStepIds.length;
  useEffect(() => {
    const base = 'Biga Calculator';
    document.title = dueCount > 0 ? `(${dueCount}) Ready — ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [dueCount]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Biga Neapolitan Dough
          </h1>
          <p className="mt-1 text-stone-600 dark:text-stone-400">
            65% biga · 70% hydration · Grain Craft 00 · Halo Core · Tread
          </p>
        </div>
        <CopyButton text={shareUrl} label="Share setup" copiedLabel="Link copied" />
      </header>

      <div className="grid gap-3">
        <BatchPanel {...state} />
        <TemperaturesPanel {...state} />
        <CalibrationPanel {...state} />
      </div>

      <div className="mt-6 grid gap-3">
        <WarningsList warnings={result.warnings} />
        <IngredientsCard result={result} />
        <WaterIceCard result={result} />
        <TargetsCard result={result} />
        <TimelineCard {...state} />
      </div>

      <div className="mt-6">
        <StepList state={state} onOpenConcept={setConcept} />
      </div>

      <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700">
        Step timers land in Task 7.
      </p>

      <ConceptDrawer id={concept} onClose={() => setConcept(null)} />
    </div>
  );
}
