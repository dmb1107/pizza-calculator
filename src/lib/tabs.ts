/**
 * §13.1 *The tabs* (APP-6, MESSAGE-70): Recipe, Toppings and Bake log, in
 * that order, and the mark the Recipe tab carries while a timer runs and
 * another tab is open. Pure, so the rules are tested here and the tab bar
 * only draws them.
 */

import { groupTimerMark, type GroupTimerMark } from './stepGroups';
import type { StepInstance } from './stepInstances';
import type { RunningTimer } from './timers';

export type Tab = 'recipe' | 'toppings' | 'log';

/** §13.1: the order is fixed, and so are the labels. */
export const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'recipe', label: 'Recipe' },
  { key: 'toppings', label: 'Toppings' },
  { key: 'log', label: 'Bake log' },
];

export const DEFAULT_TAB: Tab = 'recipe';

/** A stored tab, or Recipe for anything this build doesn't know. */
export function parseTab(raw: unknown): Tab {
  return TABS.some((t) => t.key === raw) ? (raw as Tab) : DEFAULT_TAB;
}

/**
 * §13.1: the mark on the Recipe tab while another tab is open. It is the
 * closed group heading's mark (§7.5) taken over the whole list: the running
 * timer that comes due first, and where it stands, so it turns at that
 * timer's lower bound. Null on the Recipe tab itself, and with nothing
 * running. Only timers the list renders at this size count, as for the
 * heading.
 */
export function recipeTabMark(
  open: Tab,
  instances: readonly StepInstance[],
  timers: readonly RunningTimer[],
  nMix: number,
  now: number,
): GroupTimerMark | null {
  if (open === 'recipe') return null;
  return groupTimerMark({ key: 'recipe', label: 'Recipe', instances: [...instances] }, timers, nMix, now);
}
