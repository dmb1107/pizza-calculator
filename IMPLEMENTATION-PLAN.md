# Implementation Plan

Derived from [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md).
Task order follows spec §12; the spec is the authority wherever this document
is thinner.

**Status:** Tasks 0–7 complete, on the bowl-aware thermal model with the ice
calculation removed. Task 8 (backward timeline) next.

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

## Model revision — bowl thermal mass (bake 1, 21 Aug 2026) ✅

The first real bake invalidated the old thermal model. Applied per
`docs/MESSAGE-to-calculator-agent.md`; every new vector was reproduced from the
formulas before any code changed.

- [x] **Mixer bowl as a thermal mass.** `C_bowl = bowlMassG × 0.12`, 115.8 at
      the 965 g default. `T_bowl` defaults to `T_biga` with an override, and
      there is deliberately **no required bowl-temperature input**
- [x] `computeWaterTempF` / `computeFinalTempF` / `solveFrictionFactorF`, all
      three round-tripping exactly
- [x] **The `3.00 ×` shortcut is gone**, not kept as a fallback
- [x] FF is now measured: 14.04 °F at 6 balls, seeded into the calibration map
- [x] §4.8 shaped rise time replacing the fixed `ballRoomTemp` stage
- [x] §4.6 probe target with bowl dilution and the room-gap term
- [x] Phase A/B water as weighable grams behind a named constant
- [x] Bowl mass input (persisted) and a final-dough-temperature capture

**250 tests green.**

### The two traps, both given dedicated tests

§12 names them: "The bowl term and the `FF × Ct` work term are the two places
this goes wrong silently."

`§4.3 the FF x Ct trap` computes the correct and the reversed forms side by side
and asserts the engine matches the first — then asserts the difference exceeds
4 °F, so the test fails loudly rather than drifting if someone swaps them.

The bake-1 regression pins the whole model to reality: predicted 73.51 °F
against 73.5 measured, required water 67.97 °F against the 63.0 actually used,
and the 5 °F gap times water's share of the system reproducing the 1.5 °F the
dough finished low. Zeroing the bowl mass reconstructs the superseded model and
shows the gap it caused.

### The deleted assertion

§4.2: "Any test asserting scale-invariance must be **deleted, not loosened**."
The old suite asserted the water temperature was identical at every batch size.
That test is gone, replaced by its opposite — `is NOT scale-invariant once the
bowl is included`, plus a check that the spread across batch sizes exceeds 5 °F.
Dough-only weights are still asserted invariant, because those genuinely are.

---

## Model revision — ice removed (MESSAGE-3, 22 Aug 2026) ✅

Applied per `docs/MESSAGE-3-remove-ice.md`. The whole of the old §4.4 is gone:
the app outputs a target water temperature and nothing else, and the user
blends fridge-cold and tap water by hand, measuring as they pour.

- [x] **Constants** — `LATENT_F`, `C_ICE`, `DEFAULT_FREEZER_F`, `DEFAULT_TAP_F`
      deleted; `COLD_WATER_FLOOR_F: 38` added for the one surviving warning
- [x] **Engine** — `computeIce`, `iceEffF` and all five `IceStatus` branches
      deleted. Not flagged, not behind a toggle: deleted
- [x] **Inputs** — the tap and freezer fields are gone from Panel 2, from
      `Inputs`, from the URL codec and from `localStorage`
- [x] **Water card** — one number and one line, per the rewritten §7.2
- [x] **Warnings** — the four ice warnings replaced by the single sub-38 °F one
- [x] `ice-physics` concept deleted; `thermal-model`'s closing line changed with
      it, so `concepts.ts` was regenerated from the spec rather than hand-edited
- [x] `Disclose.tsx` deleted — it existed only for the ice-temperature tooltip
      §7.2 no longer asks for, and had no other caller

**267 tests green**, typecheck clean, production build clean.

### The sweep that justifies the deletion

MESSAGE-3 asks for a test proving the warning is unreachable, and that test is
the whole argument for dropping ice: if the model never asks for water colder
than a fridge delivers, blending by hand is strictly better than latent-heat
arithmetic. Sweeping the retarded-biga envelope — every batch size, biga
45–60 °F, room 60–84 °F — the coldest requirement is **51.7 °F**, which
reproduces §5 exactly, at 18 balls with a 60 °F biga in an 84 °F kitchen. A
second test asserts no water warning fires anywhere in that envelope.

### ⚠️ One §5 number does not reproduce

§5 gives the span as 51.7–90.6 °F. **The minimum is exact; the maximum is not.**
The sweep tops out at **106.6 °F**, at 3 balls with a 45 °F biga in a 60 °F
kitchen.

The cause is structural rather than a rounding difference: the requirement rises
as the batch gets *smaller*, because the bowl is a fixed cold mass and a much
larger share of a small batch — 18% at 3 balls against 3.5% at 18.

| Balls | Max required water |
|---:|---:|
| 3 | **106.6 °F** |
| 5 | 98.5 |
| 6 | 96.8 |
| 9 | 90.3 |
| 12 | 88.7 |
| 18 | 87.1 |

90.6 sits just above the 9-ball maximum, so the published sweep looks not to
have gone below about 9 balls. **Raised with the recipe agent; not resolved.**
`WATER_REACHABILITY.max` records what the model actually does, with the
disagreement written down beside it rather than silently adopted — the same
handling the 30.2 h overhead finding got before §4.7 was corrected.

This does not affect the ice decision, which rests only on the minimum.

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

## Task 4 — Timeline, forward mode ✅

`src/lib/timeline.ts` (pure) and `src/components/TimelineCard.tsx`.

- [x] §4.7 stage durations for both schedules; inapplicable stages are absent
      rather than shown as zero
- [x] Forward mode: biga start time → cumulative clock times, weekday included
      because the schedule runs over two nights
- [x] Midnight-to-06:00 flagging, per stage and for the bake itself
- [x] "Now" marker on the current stage, re-ticking each minute
- [x] The four §4.7-adjustable durations exposed behind "Adjust the schedule",
      each clamped to the range the spec allows
- [x] `solveBigaStart` for backward mode — same arithmetic, UI in Task 8

**160 tests green** (41 new).

### Two interpretation calls

**"Flag when a stage lands between midnight and 6 AM" — flagged on the stage's
start, not its span.** Read as overlap, the 19-hour fridge rest would flag every
schedule ever produced and the warning would carry no information. What makes a
schedule unusable is having to *get up* at 3 a.m., and every stage boundary is
an action — so the flag marks the moment work is required.

**Start time persists to localStorage, not the URL.** Design priority 4 wants a
session to survive a refresh, and if you mixed the biga at 2 p.m. and reload at
3 p.m. the timeline must still say 2 p.m. But a fixed timestamp inside a shared
link is stale the moment it is sent. The recipe travels in the URL; the session
stays on the device. The four schedule adjustments *are* in the URL, since those
are recipe parameters and transfer meaningfully.

### Daylight saving is handled by construction

All arithmetic is in absolute milliseconds, never calendar fields. Fermentation
follows the thermometer, not the clock, so 19 hours is 19 real hours and the
wall-clock time shown after a spring-forward is correctly an hour later than
naive calendar addition gives. Tests pin `TZ=America/New_York` and assert both
that elapsed real time is exactly preserved across the March and November
transitions, and that the displayed clock moves as it should.

### A finding worth acting on

Enumerating every start hour showed the schedule is completely clean — every
action and the bake in daylight — for any biga start between **09:00 and
20:00**, and that outside it the damage is immediate: a 23:00 start buries the
fridging, the cold ferment, the temper *and* the bake in the small hours. The
warning banner names that window rather than just reporting a problem.

### Three findings raised, all confirmed and corrected upstream

Surfaced during the bowl revision and settled in
`docs/REPLY-to-calculator-agent.md`:

| Finding | Outcome |
|---|---|
| `thermal-model` claimed the bowl contributes "more than the fresh flour does" — true only below ~5 balls | Prose corrected to "comparable to the fresh flour, and larger than it below about 5 balls" |
| The −0.3 °F and 2.0 °F bowl-temperature figures looked irreconcilable | Same coefficient, different inputs. Both documents now state the coefficient `C_bowl/TOT` instead |
| The 25.5–30 h overhead band was exceeded at 30.2 h | Band recomputed to **25.3–30.8 h**, defaults **27.8 h** |

The tests follow the corrected numbers rather than recording the old ones. The
bowl-temperature test now asserts the **coefficient** (0.18 / 0.10 / 0.07 °F per
°F at 3 / 6 / 9 balls) and the claim resting on it — a 10 °F misestimate costs
under 1 °F — rather than either endpoint. The test that encoded "the spec says
30 but it's really 30.2" is gone.

The band's minimum was then corrected a second time. 25.3 h had come from
flexing `bulkRest` to 0.75 h and `divideBall` to 0.25 h, both of which §4.7
fixes. Held fixed, the answer is **25.58 h**, and the documented band is now
**25.6–30.8 h** — tight at both ends, with the defaults unchanged at 27.83 h.

Both stages stay fixed by design: the recipe's "45–60 min" bulk rest is guidance
to the baker rather than a scheduling variable, and 60 min is the planning
number.

**One known simplification, recorded and deliberately not built.** §4.7 models
`divideBall` as a flat 20 min; real handling scales at roughly 1 min per ball on
top of a fixed rest, so 3 balls takes ~15 min and 18 takes ~30. The worst case
is ~10 min inside a 52-hour schedule — 0.3% — and modelling it would change no
decision. A test pins the flat behaviour so a future scaling rule would be a
conscious change rather than an accident.

### The document discrepancy, resolved

Raised during this task and since settled: the recipe document's §7 summary
table was **wrong**, not a rounding difference. It collapsed three distinct
stages (bulk rest, divide-and-ball, balls at room temperature) into a single
"~1.5 h" row and omitted the final mix entirely, so it was out of sync with the
§8 procedure it was summarising. §8's own steps total 25.5–30 h of fixed
overhead, which matches §4.7's 27.83 h default.

The recipe document has been corrected — §7 now lists all nine stages with
cross-references to their §8 steps, and its totals read ~34 h / ~52 h / ~64 h.
Spec §4.7 now carries an explicit precedence note: "These are authoritative …
If the two ever disagree again, these win."

**No code changed.** The timeline was built from §4.7 and was already right.

§4.7 also gained an assertion requirement, now covered by six new tests:
totals of ~34 / ~52 / ~64 h at 6 / 24 / 36 h cold ferment (±2 h), fixed
overhead inside 25.5–30 h, and overhead held constant so total is always
`coldFerment + ~28 h` — which would catch a stage accidentally scaling with the
cold ferment. Worth noting the band is exactly what the adjustment ranges
produce: 25.83 h with every adjustable at its minimum, 29.83 h at its maximum.

---

## Task 5 — Step list ✅  ·  Task 6 — Concepts drawer ✅

Built together: the step list carries "read more" concept links, and shipping
those pointing at nothing would have been worse than doing both.

`src/content/steps.ts` (18 steps), `src/content/concepts.ts` (12 concepts),
`src/lib/bindTokens.ts`, and `StepList` / `Markdown` / `ConceptDrawer`.

- [x] All 18 §8.2 steps, all 12 §8.3 concepts, verbatim
- [x] `{brace}` bindings for all 16 tokens
- [x] GFM markdown with real tables
- [x] Per-step checkbox, persisted; progress counter and a reset
- [x] `watchFor` and `troubleshoot` rendered distinctly from `detail`
- [x] `biga-4`'s two schedule-dependent summaries
- [x] Concept drawer, reachable from step links

**219 tests green** (53 new).

### The prose is guarded by a test, not by a one-time read-through

§12 warns that "truncated explanations are the most likely way this build goes
wrong", so rather than diffing by eye once, `tests/steps.test.ts` **re-parses
§8.2 and §8.3 out of the spec on every run** and compares every field character
for character. The content files were generated from the spec rather than
transcribed, and the test is what keeps them honest afterwards.

Mutation-tested to confirm it is not vacuous. All three caught:

| Deliberate break | Result |
|---|---|
| One paragraph removed from `bulk-3` | 2 tests fail |
| One `troubleshoot` row dropped | 1 test fails |
| One sentence reworded "in my own voice" | 2 tests fail |

To change the prose, edit the spec and regenerate. Hand-editing the content
files turns the suite red, which is the intent.

### Departures worth knowing

**`troubleshoot` is a table, not `{ symptom, cause, fix }[]`.** §8.1 sketches
three fixed fields, but `mix-4`'s table is two columns ("Probe reads" / "Do")
while `biga-5` and `bake-2` are three. Headers are carried through as written,
because forcing the three-field shape would mean distorting content §8 says to
reproduce verbatim. A test pins `mix-4` at two columns.

**An unbound `{token}` renders `⟨unknown token: name⟩`, never an empty string.**
A step reading "Weigh  g of flour" looks like the app is working. A test proves
no token in any step or concept is currently unbindable, and a second test
proves no binding is unused — which catches a token renamed in the spec.

### A layout bug the tests could not have caught

Expanding a step with a wide table pushed the whole page to 526 px inside a
375 px viewport and clipped every paragraph. Cause: the `<li>` is a grid item,
and grid items default to `min-width: auto`, so the table's `min-width`
propagated up through the ancestor chain instead of scrolling inside its own
`overflow-x-auto` wrapper. Fixed with `min-w-0` on the item.

Worth recording that the first fix attempt was wrong: a remaining 15 px looked
like more overflow, and removing the table wrappers' negative margins did not
shift it. It was the vertical scrollbar — `scrollWidth === innerWidth`, and
`clientWidth` excludes the scrollbar. The margins were restored once the real
cause was clear.

---

## Task 7 — Timers ✅

`src/lib/timers.ts` (pure) and `src/components/StepTimer.tsx`.

- [x] A timer on every step whose label states a duration — six of them
- [x] Ranges held as windows, not deadlines
- [x] Survives a screen lock, a backgrounded tab and a reload
- [x] Audible completion, synthesised rather than loaded
- [x] Tab title flags a finished timer for a backgrounded page

**285 tests green** (34 new).

### Two decisions

**A timer is an end time, not a countdown.** Everything derives from an absolute
`startedAt` against a `now` passed in. A ticking counter loses time the moment a
phone locks — which it will, mid-mix, every time. Reading the clock means the
answer is right whenever you look at it. The timer is persisted, so it also
survives a reload; verified by rewinding a stored start time and reloading.

**Ranges are windows.** "45–60 min" is not a 45-minute timer. It counts down to
the earliest useful moment, then holds a window open until the latest —
"Ready — window closes in 9:55" — and only then reads "Over by". Collapsing that
to one number would throw away the half of the instruction that says how much
slack you have.

### Durations are parsed from the bound label

No step ids appear in the timer code. `parseTimerLabel` runs on the label
*after* token binding, so `{coldFerment} h` and `{temper} h` resolve to real
durations, and `biga-4`'s "per schedule" resolves to nothing — correctly, since
the timeline owns that one.

### What it cannot do, stated in the UI

A static page cannot wake a locked phone; that needs a service worker and a push
server, and §2 rules out a server. The app says so where the timers are rather
than implying otherwise: *"They can only sound while this page is open, though —
for a long stage, set a phone alarm as well."*

### A bug the screenshot caught

`mix-7`'s success cue ends `**and at DDT ±1 °F.**` — the temperature gate §8
calls pass/fail — and `watchFor` was being rendered as plain text, so it showed
literal asterisks around exactly the number that matters most. Now rendered as
markdown, inline. A test pins `watchFor` as markdown so it can't regress.

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
