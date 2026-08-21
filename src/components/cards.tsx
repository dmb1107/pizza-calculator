import { CopyButton } from './CopyButton';
import { Disclose } from './Disclose';
import { formatAdy, formatGrams, formatTempF } from '../lib/format';
import { buildRecipeText } from '../lib/recipeText';
import type { CalculatorResult, Warning } from '../lib/engine';

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

/** §7.2. The headline is the water temperature; the ice split sits under it. */
export function WaterIceCard({ result }: { result: CalculatorResult }) {
  const { ice, waterTempF, formula } = result;
  const warm = ice.status === 'warm-water';
  const unreachable = ice.status === 'unreachable';
  // Only the states that actually weigh out ice get the split and the
  // explanation of the effective temperature; elsewhere it explains a number
  // nobody is using.
  const usesIce = ice.status === 'ok' || ice.status === 'excessive';

  return (
    <Card title="Water & ice">
      <div>
        <p className="text-stone-600 dark:text-stone-400">
          {warm ? 'Warm the water to' : 'Water temperature'}
        </p>
        <p className="text-5xl font-bold tabular">
          {formatTempF(waterTempF)}
          <span className="ml-1 text-2xl font-normal text-stone-500">°F</span>
        </p>
      </div>

      {unreachable ? (
        <p className="mt-4 rounded-lg border border-red-400 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          Not reachable with ice — it would take {formatGrams(ice.iceRequiredG)} g against{' '}
          {formatGrams(formula.freshWater)} g of fresh water. Chill the biga instead; its thermal
          mass is the dominant term and a far more powerful lever.
        </p>
      ) : warm ? (
        <p className="mt-4 text-stone-700 dark:text-stone-300">
          No ice. The biga is cold enough that it, not the water, is doing the cooling — so all{' '}
          <span className="font-semibold tabular">{formatGrams(formula.freshWater)} g</span> goes in
          warmed.
        </p>
      ) : !usesIce ? (
        <p className="mt-4 text-stone-700 dark:text-stone-300">
          No ice needed — the target is already at tap temperature. Weigh out all{' '}
          <span className="font-semibold tabular">{formatGrams(formula.freshWater)} g</span> straight
          from the tap.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/40">
              <p className="text-sm text-sky-900 dark:text-sky-200">Ice</p>
              <p className="text-3xl font-bold tabular text-sky-950 dark:text-sky-100">
                {formatGrams(ice.iceG)}
                <span className="ml-1 text-lg font-normal">g</span>
              </p>
            </div>
            <div className="rounded-lg bg-stone-100 p-3 dark:bg-stone-800">
              <p className="text-sm text-stone-600 dark:text-stone-400">Tap</p>
              <p className="text-3xl font-bold tabular">
                {formatGrams(ice.tapG)}
                <span className="ml-1 text-lg font-normal">g</span>
              </p>
            </div>
          </div>
          {ice.status === 'excessive' && (
            <p className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              That's {Math.round(ice.iceFraction * 100)}% of the fresh water. Above about 35% it
              won't reliably melt during one mix — chill the biga or the fresh flour instead.
            </p>
          )}
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Weigh the ice into the bowl first, then top up with tap water. All of it must melt
            before you take a temperature reading.
          </p>
        </>
      )}

      {usesIce && (
      <div className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
        <Disclose
          label={
            <span>
              Effective ice temperature{' '}
              <span className="font-semibold tabular">{formatTempF(ice.iceEffF)} °F</span>
            </span>
          }
        >
          Melting absorbs 80 cal/g without changing temperature — the same energy it would take to
          heat that gram of water from 32 °F to 176 °F. Rather than adding a special term, that
          latent heat is folded into a fictitious starting temperature so ice slots into the same
          equation as water. Nothing in the bowl is ever remotely this cold; it is a bookkeeping
          device that produces exactly the right answer.
        </Disclose>
      </div>
      )}
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
