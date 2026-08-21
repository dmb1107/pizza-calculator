import { useId, useState, type ReactNode } from 'react';

/**
 * Tap-to-reveal explanation.
 *
 * §7.2 asks for a "tooltip" on the effective ice temperature, but design
 * priority 2 rules out hover-dependent UI — this is read on a phone. So it is a
 * button that toggles the text inline, which works with a finger, a mouse and a
 * screen reader alike.
 */
export function Disclose({
  label,
  children,
}: {
  /** The thing being explained, rendered as the trigger. */
  label: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1 rounded text-left underline decoration-dotted decoration-from-font underline-offset-4"
      >
        {label}
        <span
          aria-hidden="true"
          className="grid size-4 shrink-0 place-items-center rounded-full border border-current text-[10px] leading-none"
        >
          ?
        </span>
      </button>
      {open && (
        <p
          id={id}
          className="mt-2 rounded-lg bg-stone-100 p-3 text-sm leading-relaxed text-stone-700 dark:bg-stone-800 dark:text-stone-300"
        >
          {children}
        </p>
      )}
    </>
  );
}
