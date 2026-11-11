/**
 * Where the inputs are kept — WEBSITE-SPEC-biga-calculator.md §6 (MESSAGE-65).
 *
 * Every input is stored in the browser and written to the URL. Storage brings
 * a session back; the URL is for sharing. Storage holds exactly what the URL
 * codec writes (`Persisted.inputsQuery`), so a stored value is read by the
 * same rules as a link's with nothing restated here.
 *
 * Pure, apart from `isStandalone`, whose globals are passed in or guarded, so
 * the load rule runs in a plain Node test.
 */

import { DEFAULT_CALIBRATION, DEFAULT_PERSISTED, inputsForNewBake } from './defaults';
import { decodeInputsWithReport, encodeInputs, hasInputs } from './url';
import type { Tab } from '../lib/tabs';
import type { Inputs, Persisted } from './types';

/** Which of §6's four load cases applied. */
export type InputsSource =
  /** 1: a home-screen app with inputs stored. */
  | 'stored-standalone'
  /** 2: a URL carrying an input key, or a home-screen app's launch URL with nothing stored. */
  | 'link'
  /** 3: a bare URL with inputs stored. */
  | 'stored'
  /** 4: nothing stored and a bare URL. */
  | 'defaults';

export interface InitialInputs {
  inputs: Inputs;
  /** §6 (MESSAGE-61): the ball count asked for when the even split raised it, else null. */
  ballsAskedFor: number | null;
  source: InputsSource;
}

/**
 * §6 *Where the inputs are kept*, "On load, the first of these that applies".
 *
 * 1. A home-screen app takes the stored inputs and ignores the launch URL,
 *    which is the address its icon was saved with (Dave's call).
 * 2. A URL that carries any input key is a link, and the link wins (Dave's
 *    call). A key it leaves out takes its default: a link is a whole setup,
 *    never merged with what was stored.
 * 3. A bare URL takes the stored inputs.
 * 4. With nothing stored, the defaults.
 *
 * `stored` is `Persisted.inputsQuery`: null when nothing is stored.
 */
export function resolveInitialInputs(args: {
  search: string;
  stored: string | null;
  standalone: boolean;
}): InitialInputs {
  const { search, stored, standalone } = args;
  const from = (query: string, source: InputsSource): InitialInputs => ({
    ...decodeInputsWithReport(query),
    source,
  });
  if (standalone && stored !== null) return from(stored, 'stored-standalone');
  if (hasInputs(search)) return from(search, 'link');
  if (stored !== null) return from(stored, 'stored');
  return from('', 'defaults');
}

/**
 * §13.1: the tab the page opens on. The stored one, except that a link opens
 * on Recipe (§6, rule 2), since it was sent to show a setup.
 *
 * "A link" here is a URL whose input keys name a setup other than the one
 * stored. The page writes its own inputs to the address bar, so a reload in
 * a browser is a URL with input keys too, and reading every such URL as a
 * link would send a reload back to Recipe. A shared link carrying the setup
 * already stored shows nothing new, so it takes the stored tab as a reload
 * does. A home-screen app ignores its launch URL (rule 1), so it always takes
 * the stored tab.
 */
export function initialTab(stored: Tab, initial: InitialInputs, storedQuery: string | null): Tab {
  if (initial.source !== 'link') return stored;
  return storedQuery !== null && storedInputsOf(initial.inputs) === storedQuery ? stored : 'recipe';
}

/** What storage holds for a set of inputs: the URL codec's query string. */
export function storedInputsOf(inputs: Inputs): string {
  return encodeInputs(inputs);
}

/**
 * §6: the page is a home-screen app when `navigator.standalone` is true (iOS)
 * or `(display-mode: standalone)` matches. False wherever neither can be read.
 */
export function isStandalone(env: { navigator?: unknown; matchMedia?: unknown } = globalThis): boolean {
  try {
    const nav = env.navigator as { standalone?: unknown } | undefined;
    if (nav?.standalone === true) return true;
    const mm = env.matchMedia as ((q: string) => { matches: boolean }) | undefined;
    return typeof mm === 'function' && mm.call(env, '(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

/**
 * §10: the rest of Reset. The DDT override goes back to auto and the
 * timeline's anchor to its default, since both are per-bake choices: a stale
 * override moves the water target and the rise, and a stale anchor puts every
 * stage in the past. The biga start's default is '', read as "now" the same
 * way a fresh session reads it. The checkboxes, the timers and the link to the
 * saved bake are cleared, so the next save is a new bake.
 *
 * Kept (§10, MESSAGE-49): which panels are open, and which end of the
 * timeline is held; and since MESSAGE-70, which tab is open (§13.1). The
 * topping ideas have a store of their own, which Reset never touches. The
 * anchor is the held time, not the mode, so in backward
 * mode the hook takes the bake time the reset start implies, as switching
 * modes does.
 *
 * The stored inputs follow `inputsForNewBake` (MESSAGE-65): every input is
 * stored at its default, so a reopened app doesn't bring back the last
 * bake's. Nothing stored stays nothing stored.
 */
export function persistedForNewBake(prev: Persisted): Persisted {
  return {
    ...prev,
    calibration: DEFAULT_CALIBRATION,
    bigaStartAtIso: DEFAULT_PERSISTED.bigaStartAtIso,
    bakeAtIso: DEFAULT_PERSISTED.bakeAtIso,
    checkedSteps: [],
    // §10 (APP-5): every group opens.
    closedGroups: [],
    timers: [],
    sessionBakeId: '',
    inputsQuery:
      prev.inputsQuery === null ? null : storedInputsOf(inputsForNewBake()),
  };
}
