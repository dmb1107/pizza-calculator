import { useState } from 'react';

/**
 * §10 *Capture and saving*: "Reset starts a new bake." Near the top of the
 * page, above the panels. It asks first, then puts the day's temperatures
 * back to their defaults and clears the step checkboxes and the timers; the
 * batch settings and the saved bakes stay.
 *
 * The question takes the button's place and grows downward, so nothing moves
 * above the tap, and its own Reset sits lower than the one tapped, so a second
 * tap in the same spot can't confirm by accident.
 */
export function NewBakeReset({ onReset }: { onReset: () => void }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="min-h-touch justify-self-start rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
      >
        Reset
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="new-bake-title" className="rounded-xl border border-amber-400 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
      <p className="text-amber-950 dark:text-amber-100">
        <strong id="new-bake-title">Start a new bake?</strong> This clears today&apos;s temperatures, the step checkboxes
        and the timers. Your batch settings and saved bakes stay.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            onReset();
            setAsking(false);
          }}
          className="min-h-touch rounded-lg bg-amber-700 px-4 font-medium text-white active:bg-amber-800 dark:bg-amber-600"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="min-h-touch rounded-lg border border-stone-300 bg-white px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:active:bg-stone-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
