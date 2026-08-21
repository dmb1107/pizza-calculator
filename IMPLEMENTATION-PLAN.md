# Implementation Plan

Derived from [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md).
Task order follows spec §12; the spec is the authority wherever this document
is thinner.

**Status:** Tasks 0–3 complete. Task 4 next.

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

## Task 2 — Input panels + state ✅

`src/state/` — types, defaults and bounds, URL codec, localStorage, and the
`useAppState` hook. `src/components/` — `Panel`, the field primitives, and the
three §6 panels.

- [x] Single `Inputs` object; all mutation goes through the hook
- [x] Three panels per §6: **Batch** open by default, the other two collapsed
      with a live summary line
- [x] URL query-param serialization, inputs only. Defaults are omitted, so
      `?balls=9` is the whole link for a nine-ball batch
- [x] `localStorage` for calibration, panel state and the freezer temperature
- [x] Precedence URL > localStorage > default, applied per key
- [x] "Flour temp same as room" toggle, tracking in both directions
- [x] Friction factor as a `batchSize → { ff, measuredAt }` map, badged
      "estimated — not yet calibrated" on the fallback and with the recorded
      date when measured
- [x] DDT override with a "back to automatic" escape

**110 tests green.** URL round-trips, per-key fallback, and a `rejects hostile
or truncated links` block: `balls=abc`, `balls=NaN`, `balls=Infinity`,
`freezer=80` and friends all clamp or fall back, and no decode can produce a
non-finite number. Storage degrades to defaults on malformed JSON, wrong-typed
fields or corrupt friction entries, and never throws when the quota is full.

### Kitchen-usability decisions

| Decision | Why |
|---|---|
| **Number fields commit on blur, not keystroke** | Clamping mid-type makes a bounded field unusable — typing "7" on the way to "70" would snap to the minimum. |
| **Stepper emits a delta, not a value** | Two taps inside one render frame would otherwise both resolve against the same captured number and the second would be lost. Found while testing; fixed. |
| **Native spinners removed** | A ~10 px target inside a field meant to be tapped. `inputMode` already brings up a numeric keypad. |
| **Whole panel header is the toggle** | Easy to hit with a knuckle. |
| **`replaceState`, not `pushState`** | Dragging the cold-ferment slider must not fill the back stack. |

### Verified in a browser, not only in tests

Checked at 375 px and desktop, light and dark: values match the §5 vectors live
(6-ball 940.4 / 611.2 / 352.6 / 52.5 °F / 14.6 g; 18-ball 2821.1 / 1833.7 /
1057.9), the 12-ball case renders "mix one biga, divide for 2 final mixes", and
a 42 °F biga produces **"Warm the water to 86.3 °F"** rather than a clamped ice
figure — the case §5 singles out as the one a wrong UI cannot express.

Calibration persistence was exercised end to end: recording 16.4 °F against a
9-ball batch stores it keyed by size, badges it with the date, moves the probe
target to 69.6 °F, survives a reload, and correctly does **not** apply to a
3-ball batch, which falls back to the estimate.

`shareUrl` is computed and exposed by the hook but not yet surfaced as a button;
it lands next to the "copy as text" control in Task 3. The address bar already
updates live, so setups are shareable today.

---

## Task 3 — Ingredients, water/ice, warnings ✅

`src/components/cards.tsx`, `Disclose.tsx`, `CopyButton.tsx`, and
`src/lib/recipeText.ts` for the plain-text export.

- [x] **Ingredients card** (§7.1) — Biga and Final mix, gram weights at
      `text-2xl`, with a "copy as text" button
- [x] **Water & ice card** (§7.2) — water temperature as the headline, ice/tap
      split below, `iceEffF` with an explanation
- [x] **Warnings** (§7.3) — above where the step list will go, never inside a
      collapsed panel, sorted error → warn → info
- [x] **Mix targets card** — probe target and DDT, with the reminder that the
      probe is not aiming at DDT
- [x] Share button copying a link that reproduces the current inputs

**119 tests green** (9 new, on the text export).

### All four water-card states verified in a browser

| State | Renders |
|---|---|
| `ok` | 52.5 °F · ice 14.6 g / tap 338.0 g — matches the §5 six-ball vector |
| `excessive` | "Ice is 37% of the fresh water", inline and as a top warning |
| `warm-water` | **"Warm the water to 87.6 °F"** — headline, no ice, no split |
| `none` | "No ice needed — the target is already at tap temperature" |

`unreachable` is covered by unit test; reaching it needs inputs absurd enough
(a 120 °F kitchen, FF 40, DDT 60) that they can't arise from the bounded UI.

### Two deliberate departures from a literal reading of §7

**§7.2 says "tooltip"; this is tap-to-reveal.** Design priority 2 rules out
hover-dependent UI — the page is read on a phone. `Disclose` is a button that
toggles the text inline, which works with a finger, a mouse and a screen reader.

**§7.1 says "two columns"; below 640 px they stack.** Two columns of `text-2xl`
gram weights on a 375 px screen gives each about 165 px — "Fresh flour  329.1 g"
does not fit, and shrinking the type contradicts "large enough to read at arm's
length". Both sections stay clearly headed, and the two-column layout appears at
`sm` and above. Priority 2 outranks the literal layout here; flagging it in case
you disagree.

### Clipboard

Two paths: `navigator.clipboard.writeText`, falling back to a hidden textarea
and `execCommand` for non-secure origins — a phone pointed at a dev server over
`http://192.168.x.x` is not a secure context, and the modern API is simply
absent there. A failure reports "Copy failed" rather than claiming success.

Not verified end to end: both clipboard paths require transient user activation,
which a scripted click cannot supply, so the automated check only exercises the
failure path. The success path needs a human click.

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
