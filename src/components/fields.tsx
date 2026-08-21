import { useEffect, useId, useState, type ReactNode } from 'react';

/**
 * Input primitives.
 *
 * Kitchen rules (§1, priority 2): every target is at least 48 px, numeric
 * fields open a numeric keypad, and nothing is revealed by hover — this gets
 * used on a phone by someone with flour on their hands.
 */

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
      {children}
    </label>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{children}</p>;
}

/**
 * Number entry that commits on blur rather than on keystroke.
 *
 * Clamping mid-type is what makes a bounded number field unusable — typing "7"
 * on the way to "70" would snap to the minimum. So the raw text is held locally
 * and only parsed, clamped and committed when the field is left or Enter is
 * pressed.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step,
  unit,
  hint,
  disabled = false,
  badge,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  // Follow the value when it changes elsewhere (a link, the room-temp toggle),
  // but never while the field is being typed into.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {badge}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full min-h-touch rounded-lg border border-stone-300 bg-white px-3 py-2 text-2xl tabular text-stone-900 disabled:bg-stone-100 disabled:text-stone-500 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:disabled:bg-stone-900 dark:disabled:text-stone-500"
        />
        {unit && (
          <span className="shrink-0 text-lg text-stone-500 dark:text-stone-400" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/**
 * Big −/+ stepper. Easier than a keyboard when the count is small.
 *
 * Emits a delta rather than a computed value: two taps landing in the same
 * render would otherwise both resolve against the same captured number and the
 * second would be lost.
 */
export function Stepper({
  label,
  value,
  onStep,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  min: number;
  max: number;
  hint?: ReactNode;
}) {
  const id = useId();
  const button =
    'min-h-touch w-touch shrink-0 rounded-lg border border-stone-300 bg-white text-2xl font-medium text-stone-800 active:bg-stone-100 disabled:text-stone-300 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:active:bg-stone-800 dark:disabled:text-stone-700';

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          className={button}
          onClick={() => onStep(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <output
          id={id}
          className="min-h-touch flex-1 rounded-lg border border-stone-300 bg-white text-center text-3xl font-semibold leading-[3rem] tabular dark:border-stone-600 dark:bg-stone-950"
        >
          {value}
        </output>
        <button
          type="button"
          className={button}
          onClick={() => onStep(1)}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Range slider with the value spelled out — a thumb position is not a reading. */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-2xl font-semibold tabular">
          {value}
          {unit && <span className="ml-1 text-base font-normal text-stone-500">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-touch w-full accent-amber-700 dark:accent-amber-500"
      />
      <div className="flex justify-between text-xs text-stone-500 tabular dark:text-stone-400">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Two-or-more choice rendered as full-width buttons rather than radio dots. */
export function SegmentedField<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; description?: string }[];
  onChange: (value: T) => void;
  hint?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">{legend}</legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={selected}
              className={`min-h-touch rounded-lg border px-3 py-2 text-left ${
                selected
                  ? 'border-amber-700 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100'
                  : 'border-stone-300 bg-white text-stone-800 active:bg-stone-100 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-200 dark:active:bg-stone-800'
              }`}
            >
              <span className="block font-medium">{o.label}</span>
              {o.description && (
                <span className="mt-0.5 block text-sm opacity-75">{o.description}</span>
              )}
            </button>
          );
        })}
      </div>
      {hint && <Hint>{hint}</Hint>}
    </fieldset>
  );
}

/** Checkbox styled as a full-width row, so the whole thing is the target. */
export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-6 shrink-0 accent-amber-700 dark:accent-amber-500"
      />
      <label htmlFor={id} className="min-h-touch flex-1 py-3 text-stone-800 dark:text-stone-200">
        {label}
      </label>
    </div>
  );
}

/** Small pill for provenance, e.g. an uncalibrated friction factor. */
export function Badge({ tone, children }: { tone: 'estimate' | 'measured'; children: ReactNode }) {
  const styles =
    tone === 'estimate'
      ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
      : 'border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300';
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}
