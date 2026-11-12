import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { GroupTimerMark } from '../lib/stepGroups';
import { TABS, type Tab } from '../lib/tabs';
import { formatElapsed, timerPhaseLabel, type TimerPhase } from '../lib/timers';

/**
 * §13.1 (APP-6): the three tabs. One element in two forms, decided by the
 * width, not the device: below 768 px a bar fixed to the bottom of the
 * screen, clear of the home indicator; from 768 px a strip at the top of the
 * page's column that stays in view as the page scrolls. Labels, order and
 * behaviour are the same in both.
 *
 * The bar hides while a field that takes typing has focus, so it never sits
 * over a reading being typed: the on-screen keyboard comes up with that
 * focus, and nothing reports the keyboard itself reliably.
 */

/** Ids the tab panels use, so each tab names its panel and each panel its tab. */
export const tabId = (tab: Tab) => `tab-${tab}`;
export const panelId = (tab: Tab) => `panel-${tab}`;

const NOT_TYPED = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** A field the on-screen keyboard (or iOS's picker) comes up for. */
function takesTyping(el: EventTarget | null): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !NOT_TYPED.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Whether a field that takes typing has focus. */
export function useTypingFocus(): boolean {
  const [typing, setTyping] = useState(() => typeof document !== 'undefined' && takesTyping(document.activeElement));
  useEffect(() => {
    const onIn = (e: FocusEvent) => setTyping(takesTyping(e.target));
    // Focus moving between two fields keeps it hidden: the field gaining focus decides.
    const onOut = (e: FocusEvent) => setTyping(takesTyping(e.relatedTarget));
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  // A focused field removed from the page fires no blur in WebKit: Save on a
  // topping idea unmounts its editor with the field still focused (iOS keeps
  // it through the tap), and the bar stayed hidden. While a field has focus,
  // watch the page for it going.
  useEffect(() => {
    if (!typing) return;
    const check = () => {
      if (!takesTyping(document.activeElement)) setTyping(false);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [typing]);
  return typing;
}

// ---------------------------------------------------------------------------
// Icons: 24 px, stroked in the label's colour.
// ---------------------------------------------------------------------------

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0 md:size-5"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<Tab, ReactNode> = {
  // A clipboard with the steps on it.
  recipe: (
    <Icon>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" />
    </Icon>
  ),
  // A slice, crust at the top.
  toppings: (
    <Icon>
      <path d="M3 7.2Q12 1.8 21 7.2L12 22z" />
      <path d="M4.9 10.2Q12 6 19.1 10.2" />
      <circle cx="9.6" cy="13" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="13.4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.4" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  ),
  // A notebook with a spine.
  log: (
    <Icon>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M12 8h4M12 11.5h4" />
    </Icon>
  ),
};

// ---------------------------------------------------------------------------
// The Recipe tab's timer mark
// ---------------------------------------------------------------------------

/**
 * Outlined before the lower bound, filled from it: a change of shape as well
 * as colour, so it reads without the colour. Green in the window, amber past
 * it, as the timer card's tones go.
 */
const MARK_TONES: Record<TimerPhase, string> = {
  running: 'border border-stone-400 bg-white text-stone-800 dark:border-stone-500 dark:bg-stone-900 dark:text-stone-100',
  window: 'border border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600',
  past: 'border border-amber-700 bg-amber-700 text-white dark:border-amber-500 dark:bg-amber-600',
};

function Mark({ mark, className }: { mark: GroupTimerMark; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-full px-1.5 text-xs leading-[18px] font-semibold whitespace-nowrap tabular ${MARK_TONES[mark.phase]} ${className}`}
    >
      {formatElapsed(mark.elapsedMs)}
    </span>
  );
}

export function TabBar({
  tab,
  onSelect,
  mark,
}: {
  tab: Tab;
  onSelect: (tab: Tab) => void;
  /** §13.1: the Recipe tab's mark, or null. */
  mark: GroupTimerMark | null;
}) {
  const typing = useTypingFocus();

  // The tabs pattern: arrows move between tabs, Home and End to either end.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const to =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (to === null) return;
    e.preventDefault();
    const next = TABS[to]!.key;
    onSelect(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <nav
      aria-label="Sections"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-stone-800 dark:bg-stone-900 md:sticky md:top-0 md:bottom-auto md:z-30 md:mb-6 md:border-t-0 md:border-b md:bg-stone-50 md:dark:bg-stone-950 ${typing ? 'max-md:hidden' : ''}`}
    >
      <div
        role="tablist"
        aria-label="Sections"
        className="mx-auto flex max-w-2xl pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:max-w-none md:gap-1 md:p-0"
      >
        {TABS.map(({ key, label }, index) => {
          const selected = key === tab;
          const shownMark = key === 'recipe' ? mark : null;
          return (
            <button
              key={key}
              id={tabId(key)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(key)}
              tabIndex={selected ? 0 : -1}
              aria-label={
                shownMark
                  ? `${label}, timer ${timerPhaseLabel(shownMark.phase, false, shownMark.isWindow).toLowerCase()}`
                  : undefined
              }
              onClick={() => onSelect(key)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 md:min-h-touch md:flex-none md:flex-row md:gap-2 md:border-b-[3px] md:px-4 ${
                selected
                  ? 'text-amber-800 md:border-amber-700 dark:text-amber-400 dark:md:border-amber-500'
                  : 'text-stone-500 active:text-stone-800 md:border-transparent dark:text-stone-400 dark:active:text-stone-100'
              }`}
            >
              <span className="relative">
                {ICONS[key]}
                {/* On the bar, a badge on the icon; on the strip, beside the label. */}
                {shownMark && <Mark mark={shownMark} className="absolute -top-1.5 left-[calc(100%-6px)] md:hidden" />}
              </span>
              <span className={`text-sm md:text-base ${selected ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              {shownMark && <Mark mark={shownMark} className="hidden md:inline-block" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
