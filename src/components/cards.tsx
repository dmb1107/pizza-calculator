import { CopyButton } from './CopyButton';
import { formatAdy, formatGrams, formatTempF } from '../lib/format';
import { buildRecipeText } from '../lib/recipeText';
import type { BowlState, CalculatorResult, Warning } from '../lib/engine';

/** Output cards — WEBSITE-SPEC-biga-calculator.md §7. */

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A weight, sized to be read from across the kitchen. */
function Weight({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 py-2 last:border-0 dark:border-stone-800">
      <span className="text-stone-600 dark:text-stone-400">{label}</span>
      <span className="text-right">
        <span className="text-2xl font-semibold tabular">{value}</span>
        {note && <span className="block text-xs text-stone-500">{note}</span>}
      </span>
    </div>
  );
}

/** §7.1. Two columns, Biga and Final mix, at arm's-length size. */
export function IngredientsCard({ result }: { result: CalculatorResult }) {
  const { formula, capacity } = result;

  return (
    <Card title="Ingredients" action={<CopyButton text={buildRecipeText(result)} label="Copy as text" />}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 font-semibold">
            Biga
            {capacity.nBiga > 1 && (
              <span className="ml-2 text-sm font-normal text-stone-500">
                × {capacity.nBiga} batches
              </span>
            )}
          </h3>
          <Weight label="Flour" value={`${formatGrams(formula.bigaFlour)} g`} />
          <Weight
            label="Water"
            value={`${formatGrams(formula.bigaWater)} g`}
            note="room temperature"
          />
          <Weight label="ADY" value={`${formatAdy(formula.bigaADY)} g`} />
        </div>

        <div>
          <h3 className="mb-1 font-semibold">
            Final mix
            {capacity.nMix > 1 && (
              <span className="ml-2 text-sm font-normal text-stone-500">
                × {capacity.nMix} mixes
              </span>
            )}
          </h3>
          <Weight label="Biga" value={`${formatGrams(formula.bigaMass)} g`} note="all of it" />
          <Weight label="Fresh flour" value={`${formatGrams(formula.freshFlour)} g`} />
          <Weight label="Fresh water" value={`${formatGrams(formula.freshWater)} g`} />
          <Weight label="Salt" value={`${formatGrams(formula.salt)} g`} note="never in the biga" />
        </div>
      </div>

      <p className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-600 tabular dark:border-stone-800 dark:text-stone-400">
        Total dough {formatGrams(formula.doughTotal)} g · {result.inputs.balls} ×{' '}
        {formatGrams(result.inputs.ballWeightG)} g plus 2.2% for scrap
      </p>
    </Card>
  );
}

const BOWL_STATE_LABEL: Record<BowlState, string> = {
  cold: 'cold bowl, held the biga',
  room: 'bowl at room temperature',
  warm: 'bowl warm from the previous mix',
};

/**
 * §7.2. One number, large: the target water temperature. Plus a single line of
 * instruction, and nothing else.
 *
 * There is deliberately no ice/tap split, no grams, and no note about whether
 * the number is warm or cold — the last of those would need a tap temperature,
 * which is no longer an input. The user reads the number and blends to it.
 *
 * When a batch runs as several mixes there is one card per mix, because they
 * are genuinely different numbers: mix 2 starts in the bowl that just finished
 * mix 1. Each card stays as bare as a single one — the reasoning lives in the
 * step content, not here.
 */
export function WaterCard({ result }: { result: CalculatorResult }) {
  const split = result.mixes.length > 1;

  return (
    <Card title={split ? `Water — ${result.mixes.length} mixes` : 'Water'}>
      <div className={split ? 'grid gap-4 sm:grid-cols-2' : undefined}>
        {result.mixes.map((mix) => (
          <div key={mix.index} className={split ? 'min-w-0' : undefined}>
            <p className="text-stone-600 dark:text-stone-400">
              {split ? `Mix ${mix.index}` : 'Water temperature'}
            </p>
            <p className="text-5xl font-bold tabular">
              {formatTempF(mix.waterTempF)}
              <span className="ml-1 text-2xl font-normal text-stone-500">°F</span>
            </p>
            {split && (
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                {BOWL_STATE_LABEL[mix.bowlState]}, {formatTempF(mix.bowlTempF)} °F
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-stone-700 dark:text-stone-300">
        Blend fridge-cold and tap water to hit it, measuring as you pour.
      </p>
    </Card>
  );
}

const WARNING_STYLES: Record<Warning['severity'], string> = {
  error:
    'border-red-400 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200',
  warn: 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
  info: 'border-stone-300 bg-stone-50 text-stone-800 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200',
};

/**
 * §7.3. "Render above the step list, never hidden in a collapsed panel."
 *
 * Errors first, then warnings, then information — a batch that can't be made
 * should not be reported below a note about splitting the mix.
 */
export function WarningsList({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;

  const order: Warning['severity'][] = ['error', 'warn', 'info'];
  const sorted = [...warnings].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  );

  return (
    <section aria-label="Warnings" className="grid gap-2">
      {sorted.map((w) => (
        <div key={w.id} className={`rounded-xl border p-3 ${WARNING_STYLES[w.severity]}`}>
          <p className="font-semibold">{w.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{w.detail}</p>
        </div>
      ))}
    </section>
  );
}

/** Targets that belong to the mix rather than the shopping list. */
export function TargetsCard({ result }: { result: CalculatorResult }) {
  return (
    <Card title="Mix targets">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-stone-600 dark:text-stone-400">Probe after Phase B</p>
          <p className="text-3xl font-bold tabular">
            {formatTempF(result.probeTargetF)}
            <span className="ml-1 text-lg font-normal text-stone-500">°F</span>
          </p>
        </div>
        <div>
          <p className="text-stone-600 dark:text-stone-400">Final dough</p>
          <p className="text-3xl font-bold tabular">
            {formatTempF(result.ddtF)}
            <span className="ml-1 text-lg font-normal text-stone-500">°F</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
        You are not aiming at the final temperature when you probe — Phases C and D still have
        about 3.7 °F to add.
      </p>
    </Card>
  );
}
