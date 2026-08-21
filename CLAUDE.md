# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A static, client-side dough calculator for one specific setup: **Grain Craft
Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven, and a
65% biga.** The user enters batch size, measured temperatures, and a cold-ferment
length; the app returns gram weights, a target water temperature, an ice/tap
split, a clock-time timeline, and a guided step list.

Deployed to GitHub Pages. No server, no API, no runtime data fetching.

## The two source documents

| File | Role |
|---|---|
| [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md) | **The build spec.** Formulas, constants, test vectors, step prose, build order. |
| [`docs/Biga-Neapolitan-HaloCore-GrainCraft.md`](docs/Biga-Neapolitan-HaloCore-GrainCraft.md) | The human-readable recipe the spec was derived from. |

Keep the two in sync if either changes.

## Rules that matter more than usual here

**Do not invent dough science.** Every formula, constant, and piece of step
content needed is in the spec. If something isn't specified there, ask rather
than guessing — the numbers are load-bearing and were derived carefully.

**Ask before deviating on any number.** The formulas were derived and
cross-checked. A plausible-looking simplification produces a wrong answer that
won't be obvious until 50 hours of fermentation later.

**Do not shorten the prose in spec §8.** The step `detail` blocks are the point
of the app, not decoration on it. They are the reasoning that makes the recipe
worth following rather than obeying. Use them verbatim: don't summarize, don't
rewrite in your own voice, don't trim for brevity. If a detail feels long for a
UI, that's what the disclosure is for — collapse it, don't cut it.

**Don't round intermediates.** Round only for display: flour/water/salt/dough to
1 decimal, ADY to 2, temperatures to 1.

**`C_BIGA` is derived, never hardcoded**, so it follows if `BIGA_HYDRATION`
changes. Same principle for the thermal weights — compute them from component
heat capacities.

## Design priorities, in order

1. **Correctness.** Verify against the spec §5 test vectors.
2. **Kitchen usability.** Read on a phone propped against a mixer by someone
   with flour on their hands. Large type, big touch targets, no hover-dependent
   UI, no tiny controls.
3. **Progressive disclosure.** Steps terse by default, every one expanding into
   the full explanation.
4. **Shareable/resumable state.** Survives a refresh, sends as a link.

## Commands

```bash
npm run dev        # dev server
npm test           # vitest, single run
npm run test:watch # vitest, watch mode
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ locally
```

## Layout

```
src/lib/          pure calculation — no UI imports, this is what gets unit-tested
src/content/      step and concept prose (steps.ts, concepts.ts)
src/components/   React components
src/state/        URL + localStorage persistence
tests/            vitest suites; vectors.ts holds the spec §5 acceptance data
docs/             the spec and its source recipe
```

`src/lib/` must stay importable from a plain Node test with no DOM. Keep React
out of it.

## Gotchas

- **`base` in `vite.config.ts`** is `/pizza-calculator/`. GitHub Pages serves
  from a subpath and asset links break silently without it. If the repo is
  renamed, change it there.
- **No router.** Concepts render as a drawer rather than routes, which avoids
  the Pages basename problem entirely. Adding a router later means a hash
  router or a configured basename.
- **Tailwind v4** — configured via the `@tailwindcss/vite` plugin and an
  `@theme` block in `src/index.css`. There is no `tailwind.config.js`.
- **Test tolerances.** Spec §5 quotes ±0.1 g / ±0.1 °F, but its table values are
  already rounded to 1 decimal, so assertions that sum several of them need a
  wider tolerance. `tests/vectors.ts` exports `TOL`; see the note in
  `tests/vectors.test.ts`.
- **Markdown must render tables.** Step `detail` and concept `body` contain GFM
  tables and multi-paragraph prose — `react-markdown` + `remark-gfm`, not a
  text renderer.

## Build order

Follow spec §12. Task list and status: [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md).

The first item is non-negotiable: **calculation module and unit tests green
before any UI.**
