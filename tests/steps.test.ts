import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONCEPTS } from '../src/content/concepts';
import { ABOUT_INTRO, REFERENCE, SOURCES } from '../src/content/reference';
import { CAPACITY } from '../src/content/capacity';
import { STEPS } from '../src/content/steps';

/**
 * Verbatim-fidelity check — WEBSITE-SPEC-biga-calculator.md §8.
 *
 * §8 says the detail prose IS the content: "Use it verbatim … Don't summarize
 * it, don't rewrite it in your own voice, don't trim it for brevity." §12 goes
 * further: "truncated explanations are the most likely way this build goes
 * wrong."
 *
 * So rather than diffing by eye once, this re-parses §8.2 and §8.3 out of the
 * spec on every run and compares character for character. Shortening a detail
 * block, dropping a table row, or letting the spec drift ahead of the content
 * files all turn the suite red.
 */

const SPEC = readFileSync('docs/WEBSITE-SPEC-biga-calculator.md', 'utf8');

/** Pull a `**name:** value` field out of a step chunk. */
function field(chunk: string, name: string): string | undefined {
  const re = new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.*)$`, 'm');
  return re.exec(chunk)?.[1]?.trim();
}

/** Pull the blockquote that follows a `**name:**` marker. */
function blockquote(chunk: string, marker: string): string | undefined {
  const lines = chunk.split('\n');
  const start = lines.findIndex((l) => l.trim() === marker);
  if (start < 0) return undefined;
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i] as string;
    if (l.startsWith('>')) out.push(l.replace(/^> ?/, ''));
    else if (l.trim() === '' && out.length && lines[i + 1]?.startsWith('>')) out.push('');
    else if (l.trim() === '' && out.length === 0) continue;
    // ⚠️ UNEXERCISED as of MESSAGE-8: §8.2 no longer carries editorial notes,
    // so nothing in the spec reaches this branch. Kept because a spec is
    // allowed to grow one again — but note what that means: **this branch will
    // not fail if it breaks.** It is indistinguishable from a working one until
    // the day it matters.
    //
    // What would actually catch a note reappearing is the bound-but-unused
    // token check in `bindTokens.test.ts`. A note swallows the blockquote after
    // it, which orphans that block's tokens, and a value with no consumer is
    // reported. That is how the vanished `bulk-1` warning was found.
    // §8.2 may place an italic editorial note between the marker and its
    // blockquote. Skip it rather than reading it as the end of the block.
    else if (out.length === 0 && l.trim().startsWith('*') && !l.trim().startsWith('**')) continue;
    else break;
  }
  while (out.length && out.at(-1) === '') out.pop();
  return out.join('\n');
}

/** Pull the markdown table that follows a `**name:**` marker. */
function table(chunk: string, marker: string): { headers: string[]; rows: string[][] } | undefined {
  const lines = chunk.split('\n');
  const start = lines.findIndex((l) => l.trim() === marker);
  if (start < 0) return undefined;
  const raw: string[][] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = (lines[i] as string).trim();
    if (!l.startsWith('|')) {
      if (l === '' && raw.length === 0) continue;
      break;
    }
    raw.push(
      l
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
  }
  if (raw.length < 3) return undefined;
  return { headers: raw[0] as string[], rows: raw.slice(2) };
}

/** §8.2's step-level warning blocks, e.g. "warning, shown when `staggerUncentred > 2`". */
function conditionalWarning(chunk: string): { condition: string; text: string } | undefined {
  const m = /^\*\*warning, shown when `([^`]+)`:\*\*$/m.exec(chunk);
  if (!m) return undefined;
  const text = blockquote(chunk, m[0]);
  return text ? { condition: m[1] as string, text } : undefined;
}

/**
 * §8.2's conditional detail blocks, e.g. "detail, shown only when `nMix > 1`".
 *
 * ⚠️ Matched GENERICALLY. This used to try a hard-coded ['nMix > 1', 'nBiga > 1']
 * — the same list the generator used — so `bulk-2`'s `openDiameterCapped` block
 * was dropped by both and this file still passed 42/42. Which conditions are
 * valid is decided where they are resolved (`detailConditionHolds`), and
 * asserted in stepInstances.test.ts.
 */
function conditionalDetails(chunk: string): { condition: string; detail: string }[] {
  return [...chunk.matchAll(/^\*\*detail, shown only when `([^`]+)`:\*\*$/gm)].map((m) => ({
    condition: m[1] as string,
    detail: blockquote(chunk, m[0]) ?? '',
  }));
}

/** §8.2's field markers. Mirrors KNOWN_MARKERS in scripts/generate-content.py. */
const KNOWN_MARKERS = [
  /^phase$/,
  /^summary$/,
  /^summary \((retarded|classic)\)$/,
  /^values$/,
  /^timer$/,
  /^timer \((retarded|classic)\)$/,
  /^speed$/,
  /^watchFor$/,
  /^concepts$/,
  /^detail$/,
  /^troubleshoot$/,
  /^repeatsPerMix$/,
  /^shown only when$/,
  /^detail, shown only when `[^`]+`$/,
  /^warning, shown when `[^`]+`$/,
];

const markersIn = (chunk: string) => [...chunk.matchAll(/^\*\*([^*\n]+?):\*\*/gm)].map((m) => m[1] as string);

const specSteps = SPEC.slice(SPEC.indexOf('### 8.2 Steps'), SPEC.indexOf('### 8.3 Concepts'))
  .split(/\n#### /)
  .slice(1)
  // A step ends at the next ### section as well as the next step: `mix-8`
  // otherwise swallows all of §8.2a, which sits between it and `bulk-1`.
  .map((chunk) => chunk.split(/\n### /)[0] as string)
  // §8.2 carries prose subheadings too, e.g. the scope-naming rule. A chunk is
  // a step only if it opens with the `id` — title form.
  .filter((chunk) => /^`([a-z0-9-]+)` — (.+)$/m.test(chunk))
  .map((chunk) => {
    const head = /^`([a-z0-9-]+)` — (.+)$/m.exec(chunk) as RegExpExecArray;
    return {
      id: head[1] as string,
      title: (head[2] as string).trim(),
      phase: field(chunk, 'phase'),
      // §8.2 "**shown only when:** `<condition>` — prose". Only the backticked
      // condition is content; what follows the em-dash is rationale.
      shownWhen: /^\*\*shown only when:\*\*\s*`([^`]+)`/m.exec(chunk)?.[1],
      summary: field(chunk, 'summary'),
      summaryRetarded: field(chunk, 'summary \\(retarded\\)'),
      summaryClassic: field(chunk, 'summary \\(classic\\)'),
      values: field(chunk, 'values'),
      timer: field(chunk, 'timer'),
      timerRetarded: field(chunk, 'timer \\(retarded\\)'),
      timerClassic: field(chunk, 'timer \\(classic\\)'),
      speed: field(chunk, 'speed'),
      watchFor: field(chunk, 'watchFor'),
      concepts: field(chunk, 'concepts'),
      detail: blockquote(chunk, '**detail:**'),
      detailWhen: conditionalDetails(chunk)[0],
      conditionalBlocks: conditionalDetails(chunk).length,
      markers: markersIn(chunk),
      warningWhen: conditionalWarning(chunk),
      troubleshoot: table(chunk, '**troubleshoot:**'),
      // §8.2a marks the WHOLE mix phase as repeating, in prose rather than
      // per-step, so it is derived from the phase. Only `mix-8` carries the
      // explicit marker, for `suppressOnFinal`.
      repeatsPerMix: field(chunk, 'phase') === 'mix',
      suppressOnFinal: /\*\*repeatsPerMix:\*\*.*suppress/i.test(chunk),
    };
  });

/**
 * ⚠️ BLOCKED — the spec currently defines `mix-7` twice: "Phase D, finish" and
 * the new "Changeover to the next mix" from MESSAGE-5 §2.
 *
 * Step ids are the primary key everywhere: `STEPS.find(s => s.id === …)`,
 * the persisted `checkedSteps` set, `RunningTimer.stepId`, and concept
 * cross-references all key off them. Two steps sharing one id means one
 * checkbox for two steps, and a timer started on one attaching to the other.
 *
 * MESSAGE-5 §9.2 asked to be told rather than worked around, so `steps.ts` is
 * deliberately left at the 18 pre-MESSAGE-5 steps and this one test carries the
 * blockage. Without the guard below, the duplicate id makes every per-step
 * comparison fail against whichever step `find` happened to return, which
 * reports the symptom instead of the cause.
 */
const SPEC_IDS_UNIQUE = new Set(specSteps.map((s) => s.id)).size === specSteps.length;

describe('§8.2 steps are reproduced verbatim', () => {
  it('understands every field marker in §8.2', () => {
    // A marker neither parser knows is prose that silently never renders —
    // the failure that dropped bulk-2's capped block. New grammar has to be
    // taught to BOTH parsers before it can pass.
    const unknown = specSteps.flatMap((s) =>
      s.markers.filter((m) => !KNOWN_MARKERS.some((k) => k.test(m))).map((m) => `${s.id}: **${m}:**`),
    );
    expect(unknown).toEqual([]);
  });

  it('gives no step more than one conditional detail block', () => {
    // `Step.detailWhen` holds one; a second would overwrite the first.
    expect(specSteps.filter((s) => s.conditionalBlocks > 1).map((s) => s.id)).toEqual([]);
  });

  it('carries every conditional detail block the spec writes', () => {
    // Counted from the raw §8.2 text, not from either parser.
    const raw = SPEC.slice(SPEC.indexOf('### 8.2 Steps'), SPEC.indexOf('### 8.3 Concepts'));
    const written = [...raw.matchAll(/^\*\*detail, shown only when `[^`]+`:\*\*$/gm)].length;
    expect(STEPS.filter((s) => s.detailWhen).length).toBe(written);
  });

  it('gives every step in the spec a unique id', () => {
    const seen = new Map<string, number>();
    for (const s of specSteps) seen.set(s.id, (seen.get(s.id) ?? 0) + 1);
    const duplicates = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
    expect(duplicates, 'step ids are the primary key for checkboxes and timers').toEqual([]);
  });

  it.runIf(SPEC_IDS_UNIQUE)('has every step, in spec order', () => {
    expect(STEPS.map((s) => s.id)).toEqual(specSteps.map((s) => s.id));
  });

  it.runIf(SPEC_IDS_UNIQUE).each(specSteps.map((s) => [s.id, s] as const))('%s matches the spec', (id, spec) => {
    const step = STEPS.find((s) => s.id === id);
    expect(step, `${id} is missing from steps.ts`).toBeDefined();
    if (!step) return;

    expect(step.title, `${id} title`).toBe(spec.title);
    expect(step.phase, `${id} phase`).toBe(spec.phase);
    expect(step.shownWhen, `${id} shownWhen`).toBe(spec.shownWhen);

    // The prose. This is the assertion the whole file exists for.
    expect(step.detail, `${id} detail`).toBe(spec.detail);

    if (spec.summary) expect(step.summary, `${id} summary`).toBe(spec.summary);
    expect(step.summaryRetarded, `${id} retarded summary`).toBe(spec.summaryRetarded);
    expect(step.summaryClassic, `${id} classic summary`).toBe(spec.summaryClassic);
    expect(step.watchFor, `${id} watchFor`).toBe(spec.watchFor);
    expect(step.timerLabel, `${id} timer`).toBe(spec.timer);
    expect(step.timerLabelRetarded, `${id} retarded timer`).toBe(spec.timerRetarded);
    expect(step.timerLabelClassic, `${id} classic timer`).toBe(spec.timerClassic);
    expect(step.speed?.label, `${id} speed`).toBe(spec.speed);

    expect(step.values?.join(' · '), `${id} values`).toBe(spec.values);
    expect(step.concepts?.join(' '), `${id} concepts`).toBe(spec.concepts);
    expect(step.troubleshoot, `${id} troubleshoot`).toEqual(spec.troubleshoot);
    expect(step.detailWhen, `${id} conditional detail`).toEqual(spec.detailWhen);
    expect(step.warningWhen, `${id} conditional warning`).toEqual(spec.warningWhen);
    expect(step.repeatsPerMix ?? false, `${id} repeatsPerMix`).toBe(spec.repeatsPerMix);
    expect(step.suppressOnFinal ?? false, `${id} suppressOnFinal`).toBe(spec.suppressOnFinal);
  });

  it.runIf(SPEC_IDS_UNIQUE)('loses no detail prose to truncation', () => {
    // Belt and braces: compare total character counts, so a silently dropped
    // block would show up even if an id somehow went missing above.
    const specChars = specSteps.reduce((n, s) => n + (s.detail?.length ?? 0), 0);
    const ourChars = STEPS.reduce((n, s) => n + (s.detail?.length ?? 0), 0);
    expect(ourChars).toBe(specChars);
    expect(specChars).toBeGreaterThan(10_000);
  });

  it('keeps mix-4 as a two-column table', () => {
    // §8.1 types troubleshoot as { symptom, cause, fix }, but this table is
    // "Probe reads" / "Do". Content wins over the interface sketch.
    const step = STEPS.find((s) => s.id === 'mix-4');
    expect(step?.troubleshoot?.headers).toEqual(['Probe reads', 'Do']);
    expect(step?.troubleshoot?.rows).toHaveLength(4);
  });

  it('gives biga-4 both schedule summaries and both schedule timers, and no plain timer', () => {
    // MESSAGE-31: a retarded biga has two timed stages, so biga-4 times the
    // first on each track and biga-4b times the fridge.
    const step = STEPS.find((s) => s.id === 'biga-4');
    expect(step?.summaryRetarded).toContain('**2 hours** at room temperature');
    expect(step?.summaryClassic).toContain('The Giorilli window is **16–18 hours**');
    expect(step?.timerLabelRetarded).toBe('2 h');
    expect(step?.timerLabelClassic).toBe('16–18 h');
    expect(step?.timerLabel).toBeUndefined();
  });

  it('has markdown in watchFor that a renderer must handle', () => {
    // mix-7's cue ends "**and at DDT ±1 °F.**" — the temperature gate §8 calls
    // pass/fail. Rendered as plain text it shows literal asterisks, so this
    // pins the fact that watchFor is markdown and not a bare string.
    const withEmphasis = STEPS.filter((s) => s.watchFor?.includes('**'));
    expect(withEmphasis.map((s) => s.id)).toEqual(['mix-7']);
    expect(withEmphasis[0]?.watchFor).toContain('**and at DDT ±1 °F.**');
  });

  it('covers every phase', () => {
    expect(new Set(STEPS.map((s) => s.phase))).toEqual(new Set(['biga', 'mix', 'bulk', 'bake']));
  });
});

const specConcepts = (() => {
  const body = SPEC.slice(SPEC.indexOf('### 8.3 Concepts'), SPEC.indexOf('## 9. Reference tables'));
  const lines = body.split('\n');
  const out: { id: string; title: string; body: string[] }[] = [];
  let cur: { id: string; title: string; body: string[] } | null = null;
  for (const l of lines) {
    const m = /^\*\*`([a-z0-9-]+)`\*\* — \*(.+)\*$/.exec(l.trim());
    if (m) {
      cur = { id: m[1] as string, title: m[2] as string, body: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if (l.startsWith('>')) cur.body.push(l.replace(/^> ?/, ''));
    else if (l.trim() === '' && cur.body.length) cur.body.push('');
    else if (l.trim() !== '') cur = null;
  }
  return out.map((c) => {
    while (c.body.length && c.body.at(-1) === '') c.body.pop();
    return { id: c.id, title: c.title, body: c.body.join('\n') };
  });
})();

describe('§8.3 concepts are reproduced verbatim', () => {
  it('has all 11 concepts, in spec order', () => {
    expect(specConcepts).toHaveLength(11);
    expect(CONCEPTS.map((c) => c.id)).toEqual(specConcepts.map((c) => c.id));
  });

  it.each(specConcepts.map((c) => [c.id, c] as const))('%s matches the spec', (id, spec) => {
    const concept = CONCEPTS.find((c) => c.id === id);
    expect(concept?.title, `${id} title`).toBe(spec.title);
    expect(concept?.body, `${id} body`).toBe(spec.body);
  });

  it('loses no concept prose to truncation', () => {
    const specChars = specConcepts.reduce((n, c) => n + c.body.length, 0);
    expect(CONCEPTS.reduce((n, c) => n + c.body.length, 0)).toBe(specChars);
    expect(specChars).toBeGreaterThan(9_000);
  });
});

/**
 * §9 and §11, re-derived a different way from the generator: split on the
 * headings rather than walked line by line, so a grammar bug in either shows
 * up as a mismatch.
 */
const specReference = (() => {
  const section = SPEC.slice(SPEC.indexOf('## 9. Reference tables'), SPEC.indexOf('## 10.'));
  // Everything before the first `###` is the instruction to the implementer.
  const [, ...parts] = section.split(/^### /m);
  return parts.map((part) => {
    const newline = part.indexOf('\n');
    const title = part.slice(0, newline).trim();
    const body = part.slice(newline + 1).split(/^---$/m)[0]!.trim();
    return { id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, body };
  });
})();

const specSources = (() => {
  const section = SPEC.slice(SPEC.indexOf('## 11. Sources'), SPEC.indexOf('## 12.'));
  const intro = section.split('\n\n')[1]!.trim();
  const items = [...section.matchAll(/^- \[([^\]]+)\]\(([^)\s]+)\) — (.+)$/gm)].map((m) => ({
    title: m[1]!,
    url: m[2]!,
    note: m[3]!,
  }));
  const bullets = section.split('\n').filter((l) => l.startsWith('- ')).length;
  return { intro, items, bullets };
})();

describe('§9 reference tables are reproduced verbatim', () => {
  it('has the three sections, in spec order', () => {
    expect(REFERENCE.map((r) => r.id)).toEqual(specReference.map((r) => r.id));
    expect(REFERENCE.map((r) => r.id)).toEqual(['mixer-speed', 'friction-rate', 'water-temperature']);
  });

  it.each(specReference.map((r) => [r.id, r] as const))('%s matches the spec', (id, spec) => {
    const section = REFERENCE.find((r) => r.id === id);
    expect(section?.title).toBe(spec.title);
    expect(section?.body).toBe(spec.body);
  });

  it('leaves out only the implementer instruction above the first heading', () => {
    expect(REFERENCE.map((r) => r.body).join('\n')).not.toContain('Put these on a secondary page');
  });
});

describe('§11 sources are reproduced verbatim', () => {
  it('parses every bullet — none dropped for an unexpected shape', () => {
    expect(specSources.items).toHaveLength(specSources.bullets);
    expect(SOURCES).toEqual(specSources.items);
  });

  it('keeps the intro but not its instruction to the implementer', () => {
    // The generator removes "Link these from an About page." by exact match
    // and fails if it is missing. What remains must be the rest, verbatim.
    expect(specSources.intro).toBe(`Link these from an About page. ${ABOUT_INTRO}`);
  });

  it('links only over https', () => {
    for (const s of SOURCES) expect(s.url, s.title).toMatch(/^https:\/\//);
  });
});

/**
 * §7.3 capacity messages and §6's split hint, re-derived by regex over the
 * whole section — the generator walks lines — so the two only agree if the
 * grammar is read the same way twice.
 */
describe('§7.3 capacity messages are reproduced verbatim', () => {
  const section = SPEC.slice(SPEC.indexOf('#### Capacity'), SPEC.indexOf('#### The stagger warning'));
  const panel1 = SPEC.slice(SPEC.indexOf('### Panel 1'), SPEC.indexOf('### Panel 2'));
  const blockquoteAfter = (label: string) => {
    const m = new RegExp(`^${label.replace(/[*.?()]/g, '\\$&')}[^\\n]*\\n> (.+)$`, 'm').exec(section);
    return m?.[1];
  };
  const quotedAfter = (text: string, lead: string) => {
    const at = text.indexOf(lead);
    return at < 0 ? undefined : /\*"(.+?)"\*/.exec(text.slice(at))?.[1];
  };

  it.each([
    ['split', blockquoteAfter('**Split required')],
    ['bigaSplit', blockquoteAfter('**Biga split required')],
    ['divideBiga', quotedAfter(section, "keep §4.5's line:")],
    ['nearLimit', blockquoteAfter('**Near the limit')],
    ['belowMinimum', blockquoteAfter('- **As a guard')],
    ['minimumAtInput', quotedAfter(section, 'shows, next to the field:')],
    ['splitHint', quotedAfter(panel1, 'show beside the field:')],
  ] as const)('%s matches the spec', (key, spec) => {
    expect(spec, `${key} not found in the spec`).toBeDefined();
    expect(CAPACITY[key]).toBe(spec);
  });

  it('has exactly the messages §7.3 defines — one blockquote per condition', () => {
    // Four conditions carry a blockquote; a fifth would be a message nothing renders.
    expect((section.match(/^> /gm) ?? []).length).toBe(4);
    expect(Object.keys(CAPACITY)).toHaveLength(7);
  });
});

describe('cross-references resolve', () => {
  it('every concept a step links to exists', () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const step of STEPS) {
      for (const id of step.concepts ?? []) {
        expect(ids.has(id), `${step.id} links to unknown concept "${id}"`).toBe(true);
      }
    }
  });

  it('names the two concepts §8.3 says the cards must link to', () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const id of ['thermal-model', 'friction-factor']) {
      expect(ids.has(id), `${id} is required by the calculator cards`).toBe(true);
    }
  });
});
