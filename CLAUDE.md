# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A static, client-side dough calculator for one specific setup: **Grain Craft
Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven, and a
65% biga.** The user enters batch size, measured temperatures, and a cold-ferment
length; the app returns gram weights, a target water temperature, an ice/tap
split, a clock-time timeline, and a guided step list.

Deployed to GitHub Pages. No server, no API, no runtime data fetching.

## The documents

| File | Role |
|---|---|
| [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md) | **The build spec.** Formulas, constants, test vectors, step prose, build order. |
| [`docs/Biga-Neapolitan-HaloCore-GrainCraft.md`](docs/Biga-Neapolitan-HaloCore-GrainCraft.md) | The human-readable recipe the spec was derived from. |

Keep those two in sync if either changes. **The spec wins** where they disagree
— §4.7 says so explicitly, and they have disagreed twice.

The remaining files in `docs/` are correspondence, kept because they record
*why* several numbers are what they are. Read them before re-opening a settled
question:

| File | Settles |
|---|---|
| `MESSAGE-to-calculator-agent.md` | The bake-1 revision: bowl thermal mass, measured FF, shaped rise time, Phase A/B water in grams |
| `REPLY-to-calculator-agent.md` | Bowl-vs-flour crossover, the bowl-temperature coefficient, the first overhead-band correction |
| `REPLY-2-to-calculator-agent.md` | `bulkRest` and `divideBall` stay fixed; final band 25.6–30.8 h |

## Rules that matter more than usual here

**Do not invent dough science.** Every formula, constant, and piece of step
content needed is in the spec. If something isn't specified there, ask rather
than guessing — the numbers are load-bearing and were derived carefully.

**Ask before deviating on any number.** The formulas were derived and
cross-checked. A plausible-looking simplification produces a wrong answer that
won't be obvious until 50 hours of fermentation later.

**The §8 prose is generated from the spec and guarded by a test.**
`src/content/steps.ts` and `concepts.ts` were generated from §8.2/§8.3, and
`tests/steps.test.ts` re-parses the spec on every run and compares character for
character. To change step or concept prose, edit the spec and regenerate — hand
editing those files turns the suite red, which is deliberate.

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

**The mixer bowl is part of the thermal model and is not optional.** Any
formula without a `C_bowl` term is the superseded version; omitting it put the
water temperature 5 °F wrong on bake 1. Two traps:

- **`FF × cTotal`, never `FF × cSystem`.** FF is defined as the rise the mixer
  produces in the *dough alone*. Reversing this returns a plausible-looking
  water temperature several degrees off.
- **Nothing bowl-inclusive is scale-invariant.** The bowl is fixed mass while
  the dough scales. Dough-only ratios (`Cb/Ct` etc.) still are; anything divided
  by `cSystem` is not, and the old `3.00 ×` shortcut is dead — don't reintroduce
  it as a fast path.

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
                  engine.ts (§4 formulas incl. the bowl), timeline.ts (§4.7),
                  timers.ts (§7.5), bindTokens.ts ({token} substitution),
                  recipeText.ts (copy-as-text), format.ts (display rounding),
                  constants.ts (§3)
src/content/      step and concept prose (steps.ts, concepts.ts)
src/components/   React components
src/state/        URL + localStorage persistence
tests/            vitest suites; vectors.ts holds the spec §5 acceptance data
docs/             the spec, its source recipe, and the correspondence
                  that settled the revisions
```

`src/lib/` must stay importable from a plain Node test with no DOM. Keep React
out of it.

**All rounding lives in `format.ts`.** The engine returns full precision;
anything that puts a number in front of a person goes through a formatter. That
is what makes "don't round intermediates" enforceable rather than aspirational —
don't inline a `toFixed` somewhere else.

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
- **Timeline arithmetic is in absolute milliseconds, never calendar fields.**
  Fermentation follows the thermometer, not the clock, so a stage lasts its
  stated number of real hours across a daylight-saving change. Tests pin
  `TZ=America/New_York` (set in `vite.config.ts`) so those cases are
  deterministic.
- **Markdown must render tables.** Step `detail` and concept `body` contain GFM
  tables and multi-paragraph prose — `react-markdown` + `remark-gfm`, not a
  text renderer. **`watchFor` is markdown too** — `mix-7`'s cue ends
  `**and at DDT ±1 °F.**`, and rendering it as plain text put literal asterisks
  around the one number §8 calls a pass/fail gate.
- **Timers are end times, not counters.** Everything derives from an absolute
  `startedAt` against a `now` passed in, so a locked phone or a reload returns
  the right answer. Never introduce a decrementing counter. Ranges are windows
  (earliest → latest), not deadlines.
- **`ballRoomTemp` is computed, not an input.** §4.8 derives it from the
  measured final dough temperature. It used to be a fixed 1.5 h with a 1–2 h
  slider; both are gone deliberately, because the model reaches 71–144 min.
- **An unbound `{token}` renders `⟨unknown token: name⟩`, never an empty
  string.** "Weigh  g of flour" looks like the app working. Tests prove no token
  is unbindable and no binding unused.
- **Grid and flex children need `min-w-0` around wide tables.** Items default to
  `min-width: auto`, so a table's `min-width` propagates up and pushes the whole
  page sideways instead of scrolling inside its own `overflow-x-auto` wrapper.
- **Number fields commit on blur, not on keystroke.** Clamping mid-type makes a
  bounded field unusable — typing "7" on the way to "70" would snap to the
  minimum. The stepper emits a delta rather than a computed value for the same
  class of reason.
- **The friction-factor map ships seeded** with `{6: 14.04, measured 2026-08-21}`
  from bake 1. Other batch sizes fall back to 14.0 and badge as estimated.

## Build order

Follow spec §12. Task list and status: [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md),
which is kept current — check its status line first.

Tasks 0–7 are done (engine, state, cards, forward timeline, steps, concepts,
timers). Remaining: backward timeline, reference drawer and About, Pages
deploy, bake log.

**Verify §5 before changing any formula**, including the bake-1 regression. §12
names the two places this goes wrong silently: the `C_bowl` term and the
`FF × Ct` work term. Both have dedicated tests.
