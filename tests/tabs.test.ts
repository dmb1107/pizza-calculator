/**
 * §13.1 *The tabs* (APP-6, MESSAGE-70): three, in order; the open one stored
 * and restored; a link opens on Recipe; Reset keeps the tab; and the Recipe
 * tab's mark while a timer runs on another tab.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAst } from 'vite';
import { expandSteps } from '../src/lib/stepInstances';
import { DEFAULT_TAB, TABS, parseTab, recipeTabMark } from '../src/lib/tabs';
import type { RunningTimer } from '../src/lib/timers';
import { DEFAULT_PERSISTED } from '../src/state/defaults';
import { STORAGE_KEY, loadPersisted, savePersisted, type StorageLike } from '../src/state/storage';
import { initialTab, persistedForNewBake, resolveInitialInputs } from '../src/state/storedInputs';
import { encodeInputs } from '../src/state/url';
import { DEFAULT_INPUTS } from '../src/state/defaults';

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');
const SECTION_13 = SPEC.slice(SPEC.indexOf('## 13. Tabs, and the topping ideas'));

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('§13.1 the three tabs', () => {
  it("are Recipe, Toppings and Bake log, in §13.1's order and words", () => {
    const line = /\*\*Three tabs, in this order: ([^*]+)\.\*\*/.exec(SECTION_13);
    expect(line, '§13.1 names the tabs').not.toBeNull();
    expect(TABS.map((t) => t.label)).toEqual(line![1]!.split(', '));
    expect(DEFAULT_TAB).toBe('recipe');
  });

  it('stores the open tab, and reads anything else as Recipe', () => {
    const s = fakeStorage();
    savePersisted(s, { ...DEFAULT_PERSISTED, tab: 'toppings' });
    expect(loadPersisted(s).tab).toBe('toppings');
    for (const raw of ['"settings"', '3', 'null', '{"x":1}']) {
      const bad = fakeStorage({ [STORAGE_KEY]: `{"tab":${raw}}` });
      expect(loadPersisted(bad).tab).toBe('recipe');
    }
    expect(parseTab('log')).toBe('log');
    expect(loadPersisted(fakeStorage()).tab).toBe('recipe');
  });

  it('keeps the tab through Reset (§10 Kept)', () => {
    for (const tab of ['recipe', 'toppings', 'log'] as const) {
      expect(persistedForNewBake({ ...DEFAULT_PERSISTED, tab }).tab).toBe(tab);
    }
  });
});

describe('§13.1 which tab the page opens on', () => {
  const stored = encodeInputs({ ...DEFAULT_INPUTS, balls: 12, roomTempF: 66.5 });
  const open = (search: string, standalone: boolean, storedQuery: string | null) =>
    initialTab('toppings', resolveInitialInputs({ search, stored: storedQuery, standalone }), storedQuery);

  it('opens a link with input keys on Recipe (§6, rule 2)', () => {
    expect(open('?balls=9', false, stored)).toBe('recipe');
    expect(open('?balls=9', false, null)).toBe('recipe');
  });

  it('opens a bare URL on the stored tab (rule 3), and with nothing stored (rule 4)', () => {
    expect(open('', false, stored)).toBe('toppings');
    expect(open('', false, null)).toBe('toppings');
  });

  it('opens a home-screen app on the stored tab whatever its launch URL carries (rule 1)', () => {
    expect(open('?balls=9', true, stored)).toBe('toppings');
    // With nothing stored the launch URL is read as a link (rule 2), so Recipe.
    expect(open('?balls=9', true, null)).toBe('recipe');
  });

  it("reads a reload, whose address carries the page's own inputs, as a reload", () => {
    // The page writes its inputs to the address bar, so a reload in a browser
    // is a URL with input keys. It comes back to the stored tab.
    expect(open(`?${stored}`, false, stored)).toBe('toppings');
    // The same setup with its keys in another order is the same setup.
    const reordered = `?${stored.split('&').reverse().join('&')}`;
    expect(open(reordered, false, stored)).toBe('toppings');
    // One reading different is another setup: a link.
    expect(open(`?${stored.replace('room=66.5', 'room=67')}`, false, stored)).toBe('recipe');
  });
});

describe('§13.1 the Recipe tab carries a mark while a timer runs on another tab', () => {
  const MIN = 60_000;
  const T0 = 1_800_000_000_000;
  const instances = expandSteps(1, 'retarded');
  // mix-6's rest, an exact 10 minutes, and biga-3, a 3–6 minute window.
  const rest: RunningTimer = { stepId: 'mix-6', startedAt: T0, minMinutes: 10, maxMinutes: 10 };
  const chunks: RunningTimer = { stepId: 'biga-3', startedAt: T0, minMinutes: 3, maxMinutes: 6 };

  it('shows nothing on the Recipe tab itself, or with no timer running', () => {
    expect(recipeTabMark('recipe', instances, [chunks], 1, T0 + MIN)).toBeNull();
    expect(recipeTabMark('toppings', instances, [], 1, T0 + MIN)).toBeNull();
    const stopped = { ...chunks, stoppedAt: T0 + MIN };
    expect(recipeTabMark('log', instances, [stopped], 1, T0 + 2 * MIN)).toBeNull();
  });

  it('changes when the timer due first reaches its lower bound', () => {
    const before = recipeTabMark('toppings', instances, [rest, chunks], 1, T0 + 2 * MIN);
    expect(before).toEqual({ phase: 'running', isWindow: true, elapsedMs: 2 * MIN });
    const at = recipeTabMark('toppings', instances, [rest, chunks], 1, T0 + 3 * MIN);
    expect(at).toMatchObject({ phase: 'window', isWindow: true });
    expect(recipeTabMark('log', instances, [rest], 1, T0 + 10 * MIN)).toMatchObject({ phase: 'past', isWindow: false });
  });

  it('ignores a stored timer the list has no card for at this size', () => {
    const fromTwoMixes: RunningTimer = { ...chunks, stepId: 'mix-3#2' };
    expect(recipeTabMark('toppings', instances, [fromTwoMixes], 1, T0 + MIN)).toBeNull();
    expect(recipeTabMark('toppings', expandSteps(2, 'retarded'), [fromTwoMixes], 2, T0 + MIN)).not.toBeNull();
  });
});

describe('§13.1 the page around the tabs', () => {
  /** Every string a component's JSX renders as text, in order. */
  function jsxText(file: string): string[] {
    const out: string[] = [];
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== 'object' || node === null) return;
      const n = node as { type?: string; value?: unknown };
      if (n.type === 'JSXText' && typeof n.value === 'string') {
        const t = n.value.replace(/\s+/g, ' ').trim();
        if (t) out.push(t);
        return;
      }
      Object.values(node).forEach(visit);
    };
    visit(parseAst(readFileSync(file, 'utf8'), { lang: 'tsx' }));
    return out;
  }

  it('has no Bake log button: the tab replaces the header\'s and the footer\'s', () => {
    expect(jsxText('src/App.tsx')).not.toContain('Bake log');
    expect(readFileSync('src/App.tsx', 'utf8')).not.toMatch(/BakeLogDrawer|<Drawer/);
  });

  it('opens the log from the Calibration panel and the log card only, through the tab', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    // openLog selects the tab, and it goes to exactly those two places.
    expect(app).toMatch(/const openLog = useCallback\(\(\) => selectTab\('log'\)/);
    expect(app.match(/onOpenLog=\{openLog\}/g)).toHaveLength(2);
    expect(app).toMatch(/<CalibrationPanel[^>]*onOpenLog=\{openLog\}/);
    expect(app).toMatch(/<StepList[^>]*onOpenLog=\{openLog\}/);
    const list = readFileSync('src/components/StepList.tsx', 'utf8');
    expect(list).toMatch(/<BakeLogCard state=\{state\} onOpenLog=\{onOpenLog\} \/>/);
  });

  it('mounts the beep above the tabs, and nowhere else', () => {
    const files = ['src/App.tsx', 'src/components/StepList.tsx', 'src/components/Toppings.tsx', 'src/components/BakeLog.tsx'];
    const mounts = files.filter((f) => /<TimerBeeper\b/.test(readFileSync(f, 'utf8')));
    expect(mounts).toEqual(['src/App.tsx']);
    const app = readFileSync('src/App.tsx', 'utf8');
    // Outside every tab panel: before the first one.
    expect(app.indexOf('<TimerBeeper')).toBeLessThan(app.indexOf("panelProps('recipe')"));
  });
});
