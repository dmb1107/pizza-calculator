import { BatchPanel, CalibrationPanel, TemperaturesPanel } from './components/panels';
import { formatGrams, formatTempF } from './lib/format';
import { useAppState } from './state/useAppState';

/**
 * Task 2 shell: the §6 input panels wired to URL and localStorage state.
 *
 * The readout below is a placeholder so the panels are visibly driving the
 * engine. The real ingredients, water/ice and warnings cards are Task 3.
 */
export default function App() {
  const state = useAppState();
  const { result } = state;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Biga Neapolitan Dough
        </h1>
        <p className="mt-1 text-stone-600 dark:text-stone-400">
          65% biga · 70% hydration · Grain Craft 00 · Halo Core · Tread
        </p>
      </header>

      <div className="grid gap-3">
        <BatchPanel {...state} />
        <TemperaturesPanel {...state} />
        <CalibrationPanel {...state} />
      </div>

      <section className="mt-6 rounded-xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Live values — cards land in Task 3
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 tabular sm:grid-cols-3">
          {[
            ['Total flour', `${formatGrams(result.formula.flourTotal)} g`],
            ['Biga flour', `${formatGrams(result.formula.bigaFlour)} g`],
            ['Fresh water', `${formatGrams(result.formula.freshWater)} g`],
            ['Water temp', `${formatTempF(result.waterTempF)} °F`],
            ['Ice', `${formatGrams(result.ice.iceG)} g`],
            ['Probe target', `${formatTempF(result.probeTargetF)} °F`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
              <dd className="text-lg font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {result.warnings.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {result.warnings.map((w) => (
              <li
                key={w.id}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700"
              >
                <strong className="font-medium">{w.title}</strong> — {w.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
