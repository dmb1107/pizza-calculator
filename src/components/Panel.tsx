import { useId, type ReactNode } from 'react';

/**
 * Collapsible section — §6: "Batch open by default; the other two collapsed
 * with a summary line, since most sessions only touch the first."
 *
 * The whole header is the control, so it stays easy to hit with a knuckle.
 */
export function Panel({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  /** Shown when collapsed, so the panel can be skipped without opening it. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <section className="overflow-hidden rounded-xl border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center gap-3 px-4 py-4 text-left min-h-touch active:bg-stone-100 dark:active:bg-stone-800"
        >
          <span
            aria-hidden="true"
            className={`shrink-0 text-stone-400 transition-transform ${open ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span className="flex-1">
            <span className="block text-lg font-semibold">{title}</span>
            {!open && (
              <span className="mt-0.5 block text-sm text-stone-600 tabular dark:text-stone-400">
                {summary}
              </span>
            )}
          </span>
        </button>
      </h2>
      {open && (
        <div id={id} className="border-t border-stone-200 px-4 py-5 dark:border-stone-800">
          {children}
        </div>
      )}
    </section>
  );
}
