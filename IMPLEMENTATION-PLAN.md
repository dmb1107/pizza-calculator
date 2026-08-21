# Implementation Plan

Derived from [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md).
Task order follows spec §12; the spec is the authority wherever this document
is thinner.

**Status:** Tasks 0 and 1 complete. Task 2 next.

---

## Task 0 — Scaffold ✅

Done in the initial commit.

- Vite 8 + React 19 + TypeScript 7 + Tailwind v4 + Vitest 4
- `base: '/pizza-calculator/'` set in `vite.config.ts`
- `src/lib/constants.ts` — spec §3 verbatim, `C_BIGA` derived
- `tests/vectors.ts` — spec §5 acceptance data as a typed fixture
- `tests/vectors.test.ts` — 17 tests validating the transcription
- GitHub Actions workflow: test → build → deploy to Pages on push to `main`
- `CLAUDE.md`

Verified: `npm test` green, `npm run typecheck` clean, `npm run build` emits
correctly-prefixed asset URLs.

### Stack decisions worth knowing

| Decision | Why |
|---|---|
| **No router** | Spec §8.3 allows concepts as "a drawer, modal, or `/concepts/:id` route". A drawer avoids the GitHub Pages basename problem entirely. Adding routes later means a hash router. |
| **`react-markdown` + `remark-gfm`** | Step `detail` and concept `body` contain GFM tables. A plain text renderer would silently drop them. |
| **Tailwind v4 via `@tailwindcss/vite`** | No `tailwind.config.js`; theme lives in an `@theme` block in `src/index.css`. |
| **Vitest `environment: 'node'`** | `src/lib` is pure and must stay DOM-free. A component-test task can add a jsdom project later. |

### Pre-flight check on the spec

Before scaffolding, all of §5 was checked against §4's formulas in a throwaway
script. **Every vector reproduces**: 7 batch rows, 5 water-temperature rows,
3 ice effective temperatures, the thermal weights (confirmed scale-invariant to
machine precision), and the §5 invariants. The spec is internally consistent —
a failure in Task 1 is an implementation bug, not a bad vector.

---

## Task 1 — Calculation engine + tests ✅

`src/lib/engine.ts` — pure functions, no UI imports, nothing rounded.
`src/lib/format.ts` — the display-rounding boundary, and the only place
rounding is allowed to happen.

- [x] `computeFormula` → §4.1 masses, plus the `freshWater60` / `freshWater40`
      bassinage split that §8.2 mix-2 and mix-3 bind to
- [x] `computeThermal` → `cBiga / cFreshFlour / cFreshWater / cSalt / cTotal`
      and the derived weights, computed from component heat capacities
- [x] `computeWaterTempF` → §4.3
- [x] `computeIce` → §4.4 with all five statuses: `ok`, `none`, `warm-water`,
      `excessive`, `unreachable`
- [x] `computeCapacity` → §4.5 including `belowMixerMinimum`, `tightFinalMix`
      and the `divideBigaAcrossMixes` case
- [x] `computeProbeTargetF` → §4.6 with the ≤3-ball bonus
- [x] `calculate` composes all of it and assembles the §7.3 warnings, which are
      derived data and so belong in the engine rather than a component
- [x] `formatGrams` / `formatAdy` / `formatTempF` in `format.ts`

**70 tests green** across `tests/vectors.test.ts` and `tests/engine.test.ts`:
all 7 batch rows, the 5 water-temperature rows, the §9 ice-per-100 g table,
thermal weights asserted scale-invariant to 1e-12, every ice edge case, and the
formula invariants across 7 batch sizes x 5 ball weights.

### Verified by mutation testing, not just by passing

A green suite over vectors you already trust proves little. Fifteen deliberate
breaks were introduced into the engine to check the tests actually catch them —
rounded intermediates, swapped flour caps, `ceil`→`round`, the salt term reading
flour temperature instead of room, a dropped overage, a shifted ice threshold.
All are caught. Two rounds of gaps found this way were closed by adding tests.

**One mutation is undetectable, by construction.** §4.5 computes
`nMix = ceil(max(doughTotal / MAX_DOUGH, F / FLOUR_CAP_66))`, but the first term
always wins: the 2500 g dough ceiling implies 2500 / 1.728 = 1446.8 g of flour,
below the 1505 g flour cap. At 70% hydration the flour term is unreachable and
no input can exercise it. The `max()` is kept — it is correct defensive form and
becomes live if `MAX_DOUGH`, `DOUGH_YIELD` or `HYDRATION` move — and a test now
asserts the relationship so the dead branch is documented rather than invisible.
The biga's flour cap does bind, and is tested on a case that isolates it.

## Task 2 — Input panels + state

- [ ] `src/state/` — a single `Inputs` object, one reducer.
- [ ] Three panels per §6: **Batch** open by default; **Today's temperatures**
      and **Calibration** collapsed with a summary line.
- [ ] URL query-param serialization (shareable) — inputs only, not derived
      values. Round-trip test.
- [ ] `localStorage` for calibration and preferences. Freezer temp persists
      (§6: "rarely changes").
- [ ] Precedence: URL param > localStorage > default. Test it.
- [ ] "Flour temp same as room" toggle.
- [ ] **Friction factor is a map, not a number.** `batchSize → { ff, measuredAt }`
      in localStorage, selected by current batch size, falling back to 14.
      Badge the fallback "estimated — not yet calibrated"; when measured, show
      the date recorded.

**Kitchen usability applies from here on:** ≥48 px touch targets, no
hover-only affordances, numeric inputs that open a numeric keypad.

---

## Task 3 — Ingredients, water/ice, warnings

- [ ] **Ingredients card** (§7.1) — two columns, Biga and Final mix, gram
      weights readable at arm's length. "Copy as text" button.
- [ ] **Water & ice card** (§7.2) — target water temperature as the headline,
      ice/tap split below. Show `iceEffF` with a tooltip, since −120 °F looks
      absurd without one. Link to `thermal-model` and `ice-physics`.
- [ ] **Warnings** (§7.3) — rendered *above* the step list, never inside a
      collapsed panel. Sources: capacity splits, ice over 35%, unreachable
      water temp, dough below mixer minimum, overnight timeline stages.
- [ ] The warm-water case must be expressible: "warm the water to X °F", not a
      silently clamped ice figure.

---

## Task 4 — Timeline, forward mode

- [ ] `src/lib/timeline.ts` — pure, stage durations per §4.7 for both the
      retarded and classic RT schedules.
- [ ] Forward mode: user gives biga start time → cumulative clock times per
      stage, plus total elapsed.
- [ ] Flag any stage landing between midnight and 06:00. Per the spec this is
      the main reason a schedule is unusable in practice.
- [ ] Highlight "now" when a session is in progress.
- [ ] Tests: DST boundary, midnight wrap, the user-adjustable ranges
      (`bigaFridge` 18–20, `ballRoomTemp` 1–2, `temper` 2.5–3, `coldFerment` 6–36).

---

## Task 5 — Step list

**The highest-risk task for content fidelity, not for code.**

- [ ] `src/content/steps.ts` — the `Step` interface from §8.1, all 18 steps
      from §8.2 (`biga-1..5`, `mix-1..7`, `bulk-1..4`, `bake-1..2`).
- [ ] `{brace}` tokens bind to engine output. Needed bindings: `bigaFlour`,
      `bigaWater`, `bigaADY`, `freshFlour`, `freshWater`, `freshWater60`,
      `freshWater40`, `salt`, `probeTarget`, `ddt`, `balls`, `ballWeight`,
      `bigaFridge`, `bigaRoomOnly`, `ballRoomTemp`, `coldFerment`, `temper`.
      Unknown token → loud failure, never a silent empty string.
- [ ] `biga-4` has schedule-dependent summaries (retarded vs classic).
- [ ] Markdown renderer handling **tables** — `biga-5`, `mix-4`, `bulk-3` and
      `bake-2` all contain them.
- [ ] Checkbox per step, persisted.
- [ ] `watchFor` and `troubleshoot` rendered distinctly from `detail`.
- [ ] `concepts` links open the Task 6 drawer.

> **Before moving on, diff `steps.ts` against spec §8 line by line.** The spec
> names truncated explanations as the most likely way this build goes wrong.
> Verbatim means verbatim.

---

## Task 6 — Concepts drawer

- [ ] `src/content/concepts.ts` — all 12 from §8.3: `why-biga`,
      `formula-rationale`, `schedule-architecture`, `thermal-model`,
      `ice-physics`, `friction-factor`, `giorilli-standard`, `mix-dont-knead`,
      `why-61-65`, `no-creep-speed`, `oil-not-flour`, `burn-ring`.
- [ ] Drawer opens from step links *and* from the calculator cards
      (`thermal-model` + `ice-physics` from the water card, `friction-factor`
      from the calibration panel).
- [ ] Verbatim prose, GFM tables rendered.

---

## Task 7 — Timers

- [ ] Per-step timers where `timerMinutes` applies, including ranges
      (`3–6 min` → count up, flag the window).
- [ ] Survives backgrounding — store the target timestamp, don't tick a
      counter. A phone screen locks mid-mix.
- [ ] Audible + visible completion. No hover-dependent controls.

---

## Task 8 — Timeline backward mode

- [ ] User gives a target bake time → solve for biga start.
- [ ] Same overnight flagging. Per §4.7 this is the single most useful thing
      backward mode solves.

---

## Task 9 — Reference drawer + About

- [ ] §9 tables: mixer speed (`RPM = 47.4 + 2.526 × dial%`), friction rate,
      ice per 100 g. Secondary page or drawer — needed occasionally, not every
      session.
- [ ] **Do not reproduce Ooni's published 5% = 15 RPM chart. It is wrong.**
      The measured mapping is the one in `constants.ts`.
- [ ] About page with the §11 source links.

---

## Task 10 — Deploy

- [ ] Push to GitHub, enable Pages (Settings → Pages → Source: GitHub Actions).
- [ ] Confirm the workflow runs and assets resolve under the subpath.
- [ ] Check on an actual phone, in a kitchen, at arm's length.

---

## Task 11 — Bake log (phase 2)

Not required for v1, but §10 says design the data layer so it can be added.

- [ ] localStorage-backed log, the §10 schema, JSON export.
- [ ] Auto-populate from the current session so only measured values get typed.
- [ ] `ff_measured = final_dough_temp_f − predicted_mix_temp_f`.
- [ ] The payoff: with 8–10 logged bakes, regress
      `FF = a + b × (room_temp_f − 70)` per batch size. Generic calculators use
      one fixed FF; modeling it is the thing this app can do that they can't.

---

## Standing rules

- **Ask before deviating on any number.** Cross-checked formulas; a plausible
  simplification produces a wrong answer that surfaces 50 hours later.
- **Don't shorten §8 prose.** Collapse it, don't cut it.
- **Round only at the display boundary.**
- Keep `src/lib` free of React so it stays testable in plain Node.
- Keep the spec and `docs/Biga-Neapolitan-HaloCore-GrainCraft.md` in sync if
  either changes.
