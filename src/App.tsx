import { CopyButton } from './components/CopyButton';
import { IngredientsCard, TargetsCard, WarningsList, WaterIceCard } from './components/cards';
import { BatchPanel, CalibrationPanel, TemperaturesPanel } from './components/panels';
import { TimelineCard } from './components/TimelineCard';
import { useAppState } from './state/useAppState';

/**
 * Tasks 2–4: the §6 input panels, the §7 output cards, and the §4.7 timeline.
 *
 * Warnings sit above where the step list will go (§7.3) and are never inside a
 * collapsed panel. The steps land in Task 5.
 */
export default function App() {
  const state = useAppState();
  const { result, shareUrl } = state;

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

      <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700">
        The guided step list lands in Task 5.
      </p>
    </div>
  );
}
