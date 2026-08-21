# Implementation Plan

Derived from [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md).
Task order follows spec §12; the spec is the authority wherever this document
is thinner.

**Status:** Task 0 complete. Task 1 next.

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

## Task 1 — Calculation engine + tests

**The spec is emphatic: get this green before writing any UI.** Everything else
is presentation over these numbers.

`src/lib/engine.ts`, pure functions, no UI imports.

- [ ] `computeFormula({ balls, ballWeightG })` → §4.1 masses. No rounded
      intermediates.
- [ ] `computeThermal(formula)` → `Cb / Cf / Cw / Cs / Ct` from component heat
      capacities per §4.2. Do not hardcode the weights — they are the assertion
      target precisely because they're derived.
- [ ] `computeWaterTemp({ ddtF, ff, tBigaF, tFlourF, tRoomF }, thermal)` → §4.3.
- [ ] `computeIce({ waterTempF, tapF, freezerF, freshWater })` → §4.4, including
      all three explicit cases:
      - `waterTempF >= tapF` → `ice = 0`; above `tapF + 0.5`, "warm the water to X °F"
      - `ice > 0.35 × freshWater` → warn, won't melt in one mix
      - `ice > freshWater` → error, unreachable; suggest chilling the biga
- [ ] `computeCapacity(formula)` → `nMix`, `nBiga` per §4.5, plus the
      below-minimum and within-5%-of-max warnings, and the `nBiga < nMix`
      "mix one biga, divide by weight" case.
- [ ] `computeProbeTarget({ ddtF, ff, balls })` → §4.6, with the small-batch
      `+1` for ≤3 balls.
- [ ] `formatGrams` / `formatTempF` in `src/lib/format.ts` — rounding lives
      here and nowhere else (§4.1: 1 dp for masses, 2 for ADY, 1 for temps).

`tests/engine.test.ts`, against `tests/vectors.ts`:

- [ ] All 7 batch rows, ±0.1 g / ±0.1 °F
- [ ] 5 water-temperature rows — **including `T_biga = 42 → 90.6 °F`**, the
      fridge-retarded case that requires *warm* water
- [ ] Thermal weights ≈ `0.5311 / 0.1306 / 0.3331 / 0.0052`, asserted identical
      at 3, 6, 9, 12 and 18 balls
- [ ] Ice effective temp at 32 / 16 / 0 °F freezer → −112 / −120 / −128
- [ ] §9 ice-per-100 g table (8 rows) as an independent cross-check
- [ ] Invariants at every batch size: hydration 0.700, salt 0.028, biga 0.650,
      component sum ≈ `doughTotal`
- [ ] Each ice edge case, asserted on the returned status rather than the number

**Done when:** `npm test` green with the engine suite included.

---

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
