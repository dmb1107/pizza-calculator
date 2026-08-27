# Build Spec — Biga Neapolitan Dough Calculator

**For a Claude Code session.** Build a static, client-side web app that presents this dough recipe as a live calculator plus a step-by-step guide. Hosted on GitHub Pages.

Every formula, constant, and piece of step content you need is in this document. **Do not invent dough science.** If something isn't specified here, ask rather than guessing — the numbers are load-bearing and were derived carefully.

---

## 1. What this is

A single-page tool that replaces a generic dough app with one tuned to a specific setup: **Grain Craft Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven, and a 65% biga.**

The user enters batch size, their measured temperatures, and how long they want the cold ferment. The app returns exact gram weights, the water temperature to hit, a timeline with real clock times, and a guided step list.

### Design priorities, in order

1. **Correctness.** Verify against the test vectors in §5. A wrong number here ruins 50 hours of work.
2. **Kitchen usability.** This gets read on a phone propped against a mixer, by someone with flour on their hands. Large type, big touch targets, no hover-dependent UI, no tiny controls.
3. **Progressive disclosure.** Steps are terse by default. Every step expands into a full explanation — multiple paragraphs, tables, the actual reasoning. §8 contains that prose written out; **use it verbatim rather than summarizing it.** The explanations are the point of the app, not decoration on top of it.
4. **Shareable/resumable state.** Settings survive a refresh and can be sent as a link.

---

## 2. Tech constraints

- **Static only.** GitHub Pages — no server, no API, no build-time data fetching.
- **Recommended stack:** Vite + React + TypeScript + Tailwind. Use something else if you have a strong reason, but it must build to static assets.
- ⚠️ **Set `base: '/<repo-name>/'` in `vite.config.ts`.** GitHub Pages serves from a subpath and asset links break silently without this. Same for the router — use a hash router or configure the basename.
- Include a GitHub Actions workflow that builds and deploys to Pages on push to `main`.
- **State:** inputs serialize to URL query params (shareable), and calibration + preferences persist to `localStorage`. `localStorage` works fine on GitHub Pages.
- No analytics, no external fonts that block render, no CDN dependencies that can disappear.

---

## 3. Constants

```ts
export const C = {
  // Formula
  HYDRATION: 0.70,            // total water / total flour
  SALT: 0.028,                // of total flour
  BIGA_FRACTION: 0.65,        // of total flour
  BIGA_HYDRATION: 0.50,       // water / flour within the biga
  // Giorilli standard. The PUBLISHED anchor is 1% fresh yeast; everything after
  // is unit conversion, so derive it rather than hardcoding a rounded 0.0038.
  FRESH_YEAST_OF_BIGA_FLOUR: 0.01,
  FRESH_TO_IDY: 0.30,         // 1% fresh -> 0.30% IDY
  IDY_TO_ADY: 1.25,
  // => ADY_OF_BIGA_FLOUR = 0.00375 exactly. NOT 0.0038.
  OVERAGE: 1.022,             // 2.2% for scrap and bowl residue
  DOUGH_YIELD: 1.728,         // 1 + HYDRATION + SALT

  // Specific heats, cal/g·°C (numerically equal to BTU/lb·°F)
  C_FLOUR: 0.42,
  C_WATER: 1.00,
  C_SALT: 0.21,
  C_BIGA: 0.6133,             // derived: (1/1.5)*0.42 + (0.5/1.5)*1.00

  // Mixer bowl - REQUIRED thermal mass, do not omit
  C_BOWL_SPECIFIC_HEAT: 0.12, // stainless, cal/g·°C
  DEFAULT_BOWL_MASS_G: 965,   // measured; user-editable, persist

  // Ooni Halo Core limits
  MAX_DOUGH: 2500,            // g
  MIN_DOUGH: 500,             // g
  MIN_BALLS: 3,               // smallest supported machine batch - see 4.4
  FLOUR_CAP_66: 1505,         // g, at 66%+ hydration (final mix)
  FLOUR_CAP_55: 1610,         // g, at 55-59% hydration (biga)
  MAX_RUN_MIN: 20,            // continuous

  // Speed
  RPM_INTERCEPT: 47.4,        // RPM = 47.4 + 2.526 * dial%   (measured: 5% = 60 RPM)
  RPM_SLOPE: 2.526,

  // Friction rate by dial %, °F per minute of run time
  FRICTION_RATE: { 15: 0.75, 20: 0.86, 30: 1.08 },

  // Defaults
  DEFAULT_BALL_G: 265,
  DEFAULT_FF: 14.0,           // °F, MEASURED at 6 balls (bake 1). Rise in the DOUGH ALONE.
  DEFAULT_BIGA_TEMP_F: 58,    // the one measured value (bake 1, after tearing). Prompt to override.

  // Water reachability guards
  WATER_MIN_F: 38,            // below what fridge water reaches
  WATER_MAX_F: 120,           // above what a domestic tap delivers

  // Shaped rise time
  BASE_ROOM_MIN: 90,          // at DDT
  COOLDOWN_EQUIV_MIN: 150,    // cooldown's equivalent fermentation at DDT (modelling estimate)
  Q_DOUBLING_F: 17,
  ROOM_MIN_CLAMP: [45, 180],
} as const;
```

**`C_BIGA` must be derived, not hardcoded**, so it follows if `BIGA_HYDRATION` ever changes:
```ts
const cBiga = (1/(1+C.BIGA_HYDRATION))*C.C_FLOUR + (C.BIGA_HYDRATION/(1+C.BIGA_HYDRATION))*C.C_WATER;
```

**`ADY_OF_BIGA_FLOUR` must be derived the same way**, for the same reason — the sourced number is the fresh-yeast dose, not the ADY figure:
```ts
const adyOfBigaFlour = C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY * C.IDY_TO_ADY;  // 0.00375
const idyOfBigaFlour = C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY;                 // 0.00300
```

⚠️ **Changed from 0.0038.** Earlier drafts of both documents printed a rounded 0.38% in the prose while the recipe's own tables were computed at 0.375%, so the two disagreed by 1.3% of the yeast. 0.375% is now canonical in both. The ADY column of §5 moves accordingly (see the vectors); nothing thermal changes, because yeast carries no term in the heat balance.

---

## 4. Calculation engine

Implement as pure functions in one module with no UI imports. This is the part to unit-test.

### 4.1 Formula

```
F           = (balls × ballWeight × OVERAGE) / DOUGH_YIELD    // total flour
bigaFlour   = F × BIGA_FRACTION
bigaWater   = bigaFlour × BIGA_HYDRATION
bigaMass    = bigaFlour + bigaWater
bigaADY     = bigaFlour × ADY_OF_BIGA_FLOUR      // derived = 0.00375
freshFlour  = F − bigaFlour
freshWater  = F × HYDRATION − bigaWater
salt        = F × SALT
doughTotal  = F × DOUGH_YIELD
```

**Do not round intermediates.** Round only for display: flour/water/salt/dough to 1 decimal, ADY to 2, temperatures to 1.

### 4.2 Thermal weights

Compute from component heat capacities. **These are NOT scale-invariant** — the bowl is fixed mass while the dough scales, so the weights shift with batch size. Any test asserting scale-invariance must be **deleted, not loosened.**

⚠️ **Compute them from PER-MIX masses, not batch totals.** This is a correction — the previous version divided the batch for the ingredient cards but fed whole-batch masses into the heat balance, which puts the entire batch against a single bowl even when it runs as two mixes. The bowl only ever faces one mix at a time.

```
perMix = { bigaMass, freshFlour, freshWater, salt } ÷ nMix

Cb = perMix.bigaMass   × C_BIGA
Cf = perMix.freshFlour × C_FLOUR
Cw = perMix.freshWater × C_WATER
Cs = perMix.salt       × C_SALT
Ct = Cb + Cf + Cw + Cs
```

**FF is per-mix by definition** — it is the rise the mixer produces in the dough in the bowl, and 14.04 was measured on a single 6-ball mix. Using it against a whole 12-ball batch was the same category error.

Effect of the fix: **12 balls +2.6 °F of water, 18 balls +1.8 °F.** Every `nMix = 1` batch is unchanged.

```
C_bowl = bowlMassG × 0.12          // 115.8 at the 965 g default
TOT    = Ct + C_bowl
```

**`T_bowl` defaults to `T_biga`** — the biga always ferments in the mixer bowl (this is now a fixed procedure, not a per-bake choice), so 19 h of contact leaves them at equilibrium.

⚠️ **Promote the override to a first-class input.** The equilibrium argument holds through fermentation and breaks in the last ten minutes: bake 1 recorded the biga at 53 °F at pull and 58 °F after tearing, a 5 °F gain from handling that the bowl did not share, corroborated by the Phase C friction rate climbing 0.82 → 1.00 °F/min as the bowl caught up.

The old guidance said not to require a measurement, on the grounds that `C_bowl/TOT` is only 0.10 °F per °F at 6 balls. **That was the wrong coefficient for the question.** Dough sensitivity is what a bowl error *costs*; `C_bowl/Cw` is how much it *moves the number the user acts on*, and it is three times larger:

| Balls | `C_bowl/TOT` (dough) | `C_bowl/Cw` (water) |
|---:|---:|---:|
| 3 | 0.179 | **0.657** |
| 6 | 0.099 | 0.328 |
| 9 | 0.068 | 0.219 |
| 12 | 0.052 | 0.164 |
| 18 | 0.035 | 0.109 |

Keep `T_biga` as the default value so nothing silently moves, but label the field as wanting a measurement and show the water sensitivity inline, the same treatment as biga temperature. **Do not invent a "tearing gain" constant** — 5 °F is a single observation and hardcoding it would be exactly the extrapolation this project has been burned by before. It is a quantity to be measured, not modelled.

#### Bowl state — a three-way selector, per mix

The bowl is not always cold. A split batch runs the second mix in a bowl that just finished the first, and above one biga only one of them can occupy the bowl at all. Offer a selector whose options **prefill from values already in the model** — no new constants:

| Mode | `T_bowl` prefill | When it applies |
|---|---|---|
| **Cold — held the biga** | `T_biga` | Default for mix 1, and for every `nMix = 1` batch |
| **Room temperature** | `T_room` | Bowl washed and left out; or a second biga that fermented elsewhere |
| **Warm from the previous mix** | `DDT` | Default for mix 2 and later. **Upper bound, not an estimate** |

The prefill is a starting point and the field stays editable — a measurement always wins.

**"Warm from the previous mix" is a good estimate, not just a ceiling.** The bowl is not cleaned between mixes and the changeover is about 5 minutes, so it comes off mix 1 at roughly the dough temperature with very little time to shed. `DDT` will run a degree or two high; still measure, but the prefill is sound.

**Rinsing is available as a lever and is deliberately not used.** Thin stainless resets to about the rinse temperature in under a minute. Surface it only as a fallback if mix 2's target ever comes out awkward — it costs changeover time and the default workflow skips it.

**Leaving dough residue in the bowl is harmless, and worth saying so.** Two reasons, both checked:
- **Thermally exactly neutral.** The residue is already at `DDT`, so it contributes its own share to both sides of the balance. Required water is unchanged to the decimal at 0 g, 30 g or 60 g of carry-over.
- **The yield cancels, because the doughs are bulked together.** Residue transfers forward — mix 1 loses it, mix 2 gains it — and both land in the same tub. Only what stays in the bowl after the *final* mix is a real loss, which is what the 2.2% overage has always covered. ⚠️ This cancellation depends on combining the doughs; if that ever changes, mix 1 can run short of its ball count at 50 g of carry-over.

Spread across the three modes, at the 265 g default:

| Batch | Cold (58) | Room (70) | Warm (DDT) |
|---|---:|---:|---:|
| 3 balls | 73.7 | 65.8 | 62.5 |
| 6 balls | 68.1 | 64.1 | 62.5 |
| 9 balls | 63.0 | 60.4 | 59.5 |
| 12 balls (2 × 6) | 64.8 | 60.8 | 59.5 |
| 18 balls (2 × 9) | 63.0 | 60.4 | 59.5 |

**Assert instead:** `Cb/Ct ≈ 0.5311`, `Cf/Ct ≈ 0.1306`, `Cw/Ct ≈ 0.3331`, `Cs/Ct ≈ 0.0052` — dough-only ratios, which *are* scale-invariant. The bowl-inclusive weights are not.

### 4.3 Required water temperature

⚠️ **FF is the temperature rise the mixer produces in the DOUGH ALONE.** The work term is `FF × Ct`, **not** `FF × TOT`. Reversing this returns a plausible-looking water temperature several degrees wrong. Comment this line.

```
waterTempF = (DDT × TOT − FF × Ct
              − Cb×T_biga − Cf×T_flour − Cs×T_room − C_bowl×T_bowl) / Cw

// prediction
finalTempF = (Cb×T_biga + Cf×T_flour + Cw×T_water + Cs×T_room
              + C_bowl×T_bowl + FF × Ct) / TOT

// solve FF from a measured bake
FF = (finalTempF × TOT
      − Cb×T_biga − Cf×T_flour − Cw×T_water − Cs×T_room − C_bowl×T_bowl) / Ct
```

**These must round-trip.** Feed `waterTempF` into `finalTempF` and you must land on `DDT` exactly. Assert it.

Omitting the bowl made this output **5 °F wrong** on the first real bake — it is not a refinement.

`DDT` default: **75 °F** for ≤6 balls, **74 °F** for 7+. User-overridable.

### 4.4 Reaching the water temperature

**There is no ice calculation and no tap/ice split. Output the target temperature only.**

The user blends fridge-cold water with tap water by hand, measuring as they pour. Fridge water covers ~38–60 °F and tap covers upward, so the whole reachable band is available without arithmetic.

**Two warnings, one at each end.** ⚠️ *This supersedes MESSAGE-3's "one warning, and only one" — that instruction was written before anyone had swept the small-batch corner, and it left the reachable failure uncovered while guarding the unreachable one.*

| Condition | Behavior |
|---|---|
| `waterTempF < WATER_MIN_F` (38) | Warn: below what fridge water reaches. Suggest chilling the biga or the fresh flour; mention ice only here. |
| `waterTempF > WATER_MAX_F` (120) | Warn: above what a domestic tap delivers. **Do not tell the user to heat water.** The cause is upstream — almost always a biga that skipped its 1-hour temper. Say so: each °F of biga temperature is worth about 2 °F of water. |

**Why the asymmetry in how likely they are.** The cold warning is essentially unreachable — swept across the whole permitted input space the minimum required water is about **51 °F**, never near 38. The hot warning is the one that guards a real edge, and it exists because the requirement climbs as the batch gets *smaller*: the bowl is fixed mass, so at 3 balls it is 18% of the thermal system against 3.5% at 18, and only the water can drag it up.

**Minimum batch size is 3 balls (`MIN_BALLS`).** This is a hard input constraint, not a warning, and it is what keeps the hot end tractable:

| Balls | Dough | Hottest water the model asks for |
|---:|---:|---|
| 1 | 271 g | **146 °F** (152 at a 240 g ball) — below the mixer minimum anyway |
| 2 | 542 g | **116 °F** — clears the 500 g floor on paper, but a spiral hook won't grip it |
| **3** | **812 g** | **106.6 °F** at 265 g, 108.7 at 240 g — reachable from a hot tap |
| 9+ | — | ≤ 91 °F |

With `MIN_BALLS = 3`, the 120 °F warning **does not fire anywhere** in the temperature grid at the default FF — it is a guard rail for a user-entered calibration FF or an out-of-band temperature, not something that should appear in normal use. If it starts firing routinely, that is a signal, not noise.

No `tapTempF` or `freezerTempF` inputs. No ice fields in the log.

### 4.5 Capacity splits

```
nMix  = max(1, ceil(max(doughTotal / MAX_DOUGH, F / FLOUR_CAP_66)))
nBiga = max(1, ceil(max(bigaFlour / FLOUR_CAP_55, bigaMass / MAX_DOUGH)))
```

Also warn when `doughTotal / nMix < MIN_DOUGH` (mixer can't grip) and when a single final mix lands within 5% of `MAX_DOUGH` (workable but tight).

When `nBiga < nMix`, the UI should say so plainly: *"Mix one biga, then divide it by weight into N portions for N separate final mixes."* That's the 12-ball case and it's a genuine convenience, not a compromise.

### 4.6 Probe target

The temperature to expect partway through the mix, before Phases C and D add their friction.

```
probeTargetF = DDT − 0.33 × FF × (Ct / TOT) + 0.2 × (DDT − T_room)
```

Remaining friction is diluted by the bowl, and the 10-minute rest sheds heat in proportion to the dough-to-room gap rather than a flat 1 °F.

At FF 14 in a 70 °F room: **3 balls 72.2 · 6 balls 71.8 · 9 balls 70.5 · 12 balls 70.4 · 18 balls 70.3**

⚠️ **There is no flat "DDT − 4" shorthand — do not implement one, and reject it if you find it in any older text.** The gap is batch-size dependent, and the old rule was **1.2 °F wrong at 3 balls**:

| Balls | 3 | 6 | 9 | 12 | 18 |
|---|---:|---:|---:|---:|---:|
| Probe target | DDT − 2.8 | DDT − 3.2 | DDT − 3.5 | DDT − 3.6 | DDT − 3.7 |

Phase C's entire correction authority is about −1.5 to +2.0 °F, so a 1.2 °F error in the target consumes most of the budget before the user starts, and in the wrong direction.

**Where the old rule came from — this is the trap to avoid everywhere in this codebase.** `FRICTION_RATE` (0.75 / 0.86 / 1.08) and `FF` are **dough-only** quantities, matching the `FF × Ct` work term. A thermometer reads the dough *after* it has equilibrated with the bowl, so an observed rate is the dough-only rate times `Ct / TOT`:

| Balls | 3 | 6 | 9 | 12 | 18 |
|---|---:|---:|---:|---:|---:|
| `Ct / TOT` | 0.821 | 0.901 | 0.932 | 0.948 | 0.965 |
| Observed °F/min at 30% | 0.89 | 0.97 | 1.01 | 1.02 | 1.04 |

Any place the app converts a *duration* into a *predicted temperature change* must apply this factor. Expose it as a named helper (`observedRate(dialPct, batch)`) so the conversion happens in exactly one place.

### 4.7 Timeline

Two modes. **Forward** (default): user gives biga start time. **Backward**: user gives target bake time, solve for when to start the biga.

Durations in hours, from biga mix at t=0. **These are authoritative** — they were reconciled against the procedure steps in the recipe document, whose §7 summary table had collapsed three separate stages into one and omitted the mix itself. If the two ever disagree again, these win.

| Key | Retarded (default) | Classic RT | Notes |
|---|---:|---:|---|
| `bigaRoomTemp` | 2 | 0 | |
| `bigaFridge` | 19 | 0 | user-adjustable 18–20 |
| `bigaRoomOnly` | 0 | 16 | user-adjustable 12–18, at 61–65 °F |
| `bigaTemper` | 1 | 0 | out of fridge before mixing |
| `mix` | **0.5 × nMix + 0.0833 × (nMix − 1)** | same | ⚠️ **was a flat 0.5.** Includes the 10-min rest; the 0.0833 h is a **5-minute changeover** — Dave does not clean the bowl between mixes, and mix 2 is pre-weighed before mix 1 starts (§8, `mix-1`) |
| `bulkRest` | 1 | 1 | **fixed.** Recipe says 45–60 min; 60 is the planning number. **Clocked from the LAST mix**, not the first — see below |
| `divideBall` | 0.33 | 0.33 | **fixed.** Flat 20 min; real time scales ~1 min/ball, but the 18-ball case is only ~10 min off |
| `ballRoomTemp` | **computed** | **computed** | see §4.8 — no longer fixed |
| `coldFerment` | **user input** | **user input** | 6–36, default 24 |
| `temper` | 2.5 | 2.5 | user-adjustable 2–3 |

### 4.8 Shaped rise time

The balls' room-temperature phase is computed from the **measured final dough temperature**, not fixed.

```
f       = 2 ** ((T_actual − DDT) / Q_DOUBLING_F)
roomMin = clamp((BASE_ROOM_MIN + COOLDOWN_EQUIV_MIN) / f − COOLDOWN_EQUIV_MIN, 45, 180)
```

A cool dough loses ground on the counter *and* on the way down to 40 °F; `COOLDOWN_EQUIV_MIN` compensates for the second.

| Final dough | Room time |
|---:|---:|
| 77 °F | 71 min |
| 76 °F | 80 min |
| **75 °F** | **90 min** |
| 74 °F | 100 min |
| 73 °F | 110 min |
| 72 °F | 121 min |
| 71 °F | 133 min |
| 70 °F | 144 min |

**Planning mode:** before mixing there is no measurement, so default `T_actual = DDT`, giving exactly 90 min. When the user enters a real final dough temperature, recompute and shift every downstream stage.

Fixed overhead outside the cold ferment spans **25.6–30.8 h** across the full input ranges at `nMix = 1` (the upper bound uses the shaped-rise clamp of 180 min, which the old fixed 1–2 h stage could not reach). **At the defaults it is 27.8 h**, so total elapsed is `coldFerment + 27.8 h`: ~34 h at 6 h cold, ~52 h at 24 h, ~64 h at 36 h.

⚠️ **At `nMix = 2` the overhead is 28.4 h**, +0.58 from the second mix and the changeover. Assert both. Treat the bands as range checks, not equalities.

#### Split batches: one clock for two doughs

Dave bulks the two doughs **together in one container** — which settles the DDT question (it cools as one 12-ball mass, so `DDT` stays keyed to **total** balls) and creates a scheduling problem in its place.

Mix 1's dough finishes **35 minutes** before mix 2's — 30 min of mix plus a 5 min changeover. Once they're in the same tub they are indistinguishable, so the batch runs on one clock and there is no way to give the halves different ones.

**Clock `bulkRest` from the last mix.** That is the only defensible anchor; the alternative gives mix 2 no bulk at all.

**Then subtract half the stagger from `ballRoomTemp`:**

```
CHANGEOVER   = 0.0833                                  // 5 min, bowl not cleaned
stagger      = (MIX + CHANGEOVER) × (nMix − 1)         // 0.583 h = 35 min at nMix 2
ballRoomTemp = clamp(computed − stagger/2, 45, 180)    // −17.5 min at nMix 2
```

⚠️ **This does not remove the spread — it centres it.** Mix 1's half is 35 min over and mix 2's is 0; after the correction they are +17.5 and −17.5. That is the best a single clock can do, and it halves the worst-case error rather than leaving it all on one dough.

At 12 and 18 balls this takes a 90 min rise to **72 min**. `nMix = 1` is untouched.

⚠️ **`CHANGEOVER` is an estimate from Dave, not a measurement**, and it assumes mix 2's ingredients are weighed out before mix 1 starts — which §8 `mix-1` already instructs. Time it on the first split bake and correct it. Every 5 minutes of changeover moves the rise correction by 2.5 min.

⚠️ **This is the one thing in this round that is derived rather than measured.** It rests on a single assumption: that fermentation during bulk and during the ball rise are equivalent at the same temperature. That should hold — same dough, same temperature, and dividing displaces gas without resetting fermentation — but it has not been tested. It is one named term; if the assumption is wrong, set `stagger` to 0 and everything else stands.

Show cumulative clock times for each stage plus a total elapsed figure. Flag when a stage lands between midnight and 6 AM — that's the main reason a schedule is unusable in practice, and it's the single most useful thing the backward mode solves.

---

## 5. Test vectors

Assert against these exactly (tolerance ±0.1 g, ±0.1 °F). Generated from a verified reference implementation.

All rows: `FF = 14.0`, `T_biga = T_bowl = 58`, `T_flour = 69`, `T_room = 70`, bowl 965 g, DDT auto (75 for ≤6 balls, 74 for 7+).

| balls | ball g | F | bigaFlour | bigaWater | bigaADY | freshFlour | freshWater | phaseA | phaseB | salt | Ct | DDT | waterTemp | probe |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 265 | 470.2 | 305.6 | 152.8 | 1.15 | 164.6 | 176.3 | 105.8 | 70.5 | 13.2 | 529.4 | 75 | 73.7 | 72.2 |
| 6 | 265 | 940.4 | 611.2 | 305.6 | 2.29 | 329.1 | 352.6 | 211.6 | 141.1 | 26.3 | 1058.7 | 75 | 68.1 | 71.8 |
| 9 | 265 | 1410.6 | 916.9 | 458.4 | 3.44 | 493.7 | 529.0 | 317.4 | 211.6 | 39.5 | 1588.1 | 74 | 63.0 | 70.5 |
| 12 | 265 | 1880.8 | 1222.5 | 611.2 | 4.58 | 658.3 | 705.3 | 423.2 | 282.1 | 52.7 | **1058.8** | 74 | **64.8** | **70.6** |
| 18 | 265 | 2821.1 | 1833.7 | 916.9 | 6.88 | 987.4 | 1057.9 | 634.8 | 423.2 | 79.0 | **1588.1** | 74 | **63.0** | **70.5** |
| 5 | 270 | 798.4 | 519.0 | 259.5 | 1.95 | 279.5 | 299.4 | 179.6 | 119.8 | 22.4 | 898.9 | 75 | 69.1 | 71.9 |
| 7 | 260 | 1076.4 | 699.7 | 349.8 | 2.62 | 376.7 | 403.7 | 242.2 | 161.5 | 30.1 | 1211.9 | 74 | 64.1 | 70.6 |

⚠️ **Two changes from the previous version, and nothing else moves.**

1. `bigaADY` at every row (0.0038 → 0.00375).
2. `Ct`, `waterTemp` and `probe` at **12 and 18 balls only** — these are the `nMix = 2` rows, now computed per-mix (§4.2). Ingredient columns are batch totals and are unchanged; `Ct` is per-mix. Every `nMix = 1` row is byte-identical.

If a `nMix = 1` row moves when you re-run, something else broke.

Splits are unchanged: `nBiga` = 1 except 18 balls (2); `nMix` = 1 except 12 and 18 (2). Per-mix ball counts: 12 → 2 × 6, 18 → 2 × 9.

**Observed-rate vectors** (`Ct/TOT`, for the §4.6 helper) — also per-mix: 3 → 0.821 · 6 → 0.901 · 9 → 0.932 · **12 → 0.901** · **18 → 0.932**. Note 12 and 18 now share values with 6 and 9, because they *are* 6- and 9-ball mixes.

**Bowl-mode vectors** (§4.2 selector, 265 g, FF 14, biga 58, room 70, flour 69):

| Batch | Cold | Room | Warm |
|---|---:|---:|---:|
| 3 | 73.7 | 65.8 | 62.5 |
| 6 | 68.1 | 64.1 | 62.5 |
| 9 | 63.0 | 60.4 | 59.5 |
| 12 | 64.8 | 60.8 | 59.5 |
| 18 | 63.0 | 60.4 | 59.5 |

### Regression test — bake 1, 21 Aug 2026

The real bake this model was corrected against. 6 balls, `FF = 14.04`, biga 58 °F, flour 69 °F, room 70 °F, bowl 965 g at 58 °F, **water actually used 63.0 °F**:

- `finalTempF` must predict **73.50 °F** — measured on the day: **73.5 °F**
- `waterTempF` for DDT 75 must return **67.97 °F**

The 5 °F gap between what was used and what was needed, times water's 30% share of the system, is exactly the 1.5 °F the dough finished low. **If this test fails, the bowl term is wired wrong.**

### Bowl dilution

Same FF, different apparent rise by batch size. Useful as a sanity check:

| Batch | Bowl share of TOT | FF 14 appears as |
|---|---:|---:|
| 3 balls | 18.0% | 11.5 °F |
| 6 balls | 9.9% | 12.6 °F |
| 9 balls | 6.8% | 13.0 °F |
| 12 balls | 5.2% | 13.3 °F |

### Shaped rise time

| T_actual | roomMin |
|---:|---:|
| 77 | 71 |
| 75 | 90 |
| 73 | 110 |
| 70 | 144 |

### Water temperature reachability

⚠️ **Corrected.** The previous figure of 51.7–90.6 °F was produced by a sweep that never went below about 9 balls. The requirement climbs as the batch shrinks.

Retarded-biga schedule, `MIN_BALLS = 3`, balls 3–24, ball weight 240–300 g, biga 45–60 °F, room 60–84 °F, FF 14, **per-mix weights (§4.2)**:

| | Value | Corner |
|---|---:|---|
| Minimum required water | **53.2 °F** | 9 × 270 g, biga 60, room 84 |
| Maximum required water | **108.7 °F** | 3 × 240 g, biga 45, room 60 |
| Minimum at the 265 g default | **53.3 °F** | 9 × 265 g, biga 60, room 84 |
| Maximum at the 265 g default | **106.6 °F** | 3 × 265 g, biga 45, room 60 |

⚠️ **The cold end moved from 51.2 to 53.2 when weights went per-mix**, and the reason is worth understanding rather than just recording. The coldest requirement comes from the *largest* thermal system, and per-mix weights cap that at mixer capacity — the biggest single mix in the permitted range is 9 × 270 g (2483 g). A 24-ball batch no longer sits against one bowl as 6500 g of dough; it is three 8-ball mixes.

Per-batch maxima at 265 g: 3 → 106.6 · 5 → 98.7 · 6 → 96.8 · 7 → 92.1 · 9 → 90.3 · **12 → 93.4** · **18 → 90.3** · 24 → 91.1.

⚠️ **Not monotonic in total balls.** 12 balls (93.4) sits *above* 9 (90.3), because 12 runs as two 6-ball mixes and a 6-ball mix wants hotter water than a 9-ball one. The requirement climbs as the **mix** shrinks, and mix size does not fall monotonically with batch size. Do not assert monotonicity on batch size here either.

Assertions:
- The sub-38 warning fires **nowhere** in this envelope.
- The above-120 warning fires **nowhere** in this envelope at FF 14 — it is reachable only via a user-entered calibration FF or an out-of-band temperature. Assert zero hits over the grid; do **not** assert it is unreachable in principle.
- Both corner values are pinned. If either moves, the thermal model changed.

For reference, had `MIN_BALLS` stayed at 1 the maximum would be **152.2 °F** (1 × 240 g). That case is what the minimum exists to remove.

### Invariants (every batch size and ball weight)
- `(bigaWater + freshWater) / F` = 0.700
- `salt / F` = 0.028
- `bigaFlour / F` = 0.650
- `phaseA + phaseB` = `freshWater`
- Round-trip: `waterTempF` → `finalTempF` = `DDT`
- `bigaADY / bigaFlour` = 0.00375 exactly, and equals `FRESH_YEAST_OF_BIGA_FLOUR × FRESH_TO_IDY × IDY_TO_ADY`
- `probeTargetF` is strictly decreasing in **per-mix** ball count at fixed FF and room temp. ⚠️ It is *not* monotonic in total balls — 12 balls (a 6-ball mix) sits above 9. Assert on per-mix size, not batch size
- `observedRate(30, batch)` ∈ [0.88, 1.05] across balls 3–24
- ❌ **Do NOT assert bowl-inclusive thermal weights are scale-invariant.** They aren't.
- ❌ **Do NOT assert a flat `DDT − 4` probe target.** No such rule exists.

## 6. Inputs

Group into three panels. **Batch** open by default; the other two collapsed with a summary line, since most sessions only touch the first.

### Panel 1 — Batch
| Field | Type | Default | Range |
|---|---|---|---|
| Number of balls | stepper | 6 | **3–24** — see §4.4 for why 3 is the floor |
| Ball weight (g) | number | 265 | 240–300 |
| Cold ferment (hours) | slider | 24 | 6–36 |
| Schedule | radio | Retarded biga | Retarded / Classic RT |

### Panel 2 — Today's temperatures
| Field | Type | Default | Note |
|---|---|---|---|
| Room temp (°F) | number | 70 | |
| Flour temp (°F) | number | = room | "same as room" toggle |
| Biga temp at mix (°F) | number | **58** | ⚠️ **Highest-leverage input in the model.** Was 64, which was unsourced; 58 is the one value ever measured (bake 1, after tearing). `d(T_water)/d(T_biga)` is −1.92 at 6 balls and −2.25 at 3, so a 6 °F miss here moves the required water 11.5 °F and the finished dough 3.5 °F. Mark the field as expecting a measurement and show that sensitivity inline. |
| Bowl mass (g) | number | 965 | weigh once; persist |
| Bowl state | 3-way selector | *Cold* (mix 1) / *Warm from previous mix* (mix 2+) | Prefills bowl temp from `T_biga`, `T_room` or `DDT` — see §4.2. Show the rinse note beside it |
| Bowl temp at mix (°F) | number | *(from the selector)* | ⚠️ **Promoted to a real input.** The selector sets a starting value; a measurement always wins. The biga gains ~5 °F from tearing and the bowl does not. Worth 0.66 °F of water per °F at 3 balls, 0.11 at 18. Show that coefficient inline |

### Panel 3 — Calibration
| Field | Type | Default | Note |
|---|---|---|---|
| Friction factor (°F) | number | 14.0 | **per batch size**. 6 balls is MEASURED (bake 1); others fall back |
| DDT override (°F) | number | auto | auto = 75 (≤6 balls) / 74 (7+) |

**Friction factor is not one number.** Store a map of `batchSize → measuredFF` in `localStorage`, select by current batch size, fall back to 14.0. Badge the fallback "estimated"; show the recorded date when measured.

Seed it with `{6: {value: 14.04, date: '2026-08-21'}}`.

Note this is *separate* from bowl dilution — the bowl explains why the same FF produces different temperature rises at different scales, but FF itself also grows with batch size (more work, less surface area per unit mass). Both effects are real and stack.

---

## 7. Outputs

### 7.1 Ingredients card
Two columns, **Biga** and **Final mix**, gram weights large enough to read at arm's length. A "copy as text" button.

### 7.2 Water card
**One number, large: the target water temperature.** Plus a one-line instruction — blend fridge-cold and tap water to hit it, measuring as you pour.

Nothing else. No split, no grams, no ice, and no commentary about whether the number is warm or cold — the user reads the number and blends to it.

**When `nMix > 1`, render one card per mix.** They are genuinely different numbers, not a repeat: mix 2 starts in a bowl that just ran mix 1, so at 12 balls the targets are 64.8 °F and 59.5 °F on the default prefills. Label them "Mix 1" and "Mix 2". Each card stays bare — the reason lives in the step content, not on the card.

⚠️ **Prompt for a re-measure between mixes, and put it in the step list rather than on the card.** Both leveraged inputs drift while mix 1 runs: the bowl warms to roughly `DDT`, and the waiting biga warms toward the room. **The biga is the bigger term** — per-mix sensitivity is −1.59 °F of water per °F of biga against −0.33 for the bowl at 6 balls per mix. Do not model either drift; there is no data for it. Ask for two readings and recompute.

### 7.3 Warnings
Render above the step list, never hidden in a collapsed panel. Sources: capacity splits, **water below 38 °F**, **water above 120 °F**, dough below mixer minimum, overnight timeline stages.

The two water warnings mirror each other — same failure ("you cannot get there by blending"), opposite end, and both point the user upstream rather than at the water card. Neither one puts commentary on the card itself; §7.2 stays bare.

### 7.4 Timeline
Vertical list of stages with clock times and durations. Highlight "now" if the session is in progress.

### 7.5 Steps
See §8. Each step: a checkbox that persists, a summary, computed values inlined, an expandable "Why", and a timer where a duration applies.

---

## 8. Step content

### 8.1 Content model

**Steps are not one-line strings.** The `summary` is what shows by default; `detail` is a full markdown block — multiple paragraphs, tables, lists — that expands. Write the renderer to handle real markdown, not just text.

```ts
interface Step {
  id: string;
  phase: 'biga' | 'mix' | 'bulk' | 'bake';
  title: string;                    // short, imperative
  summary: string;                  // default view, 1-2 sentences
  values?: string[];                // computed, "{braces}" bind to engine output
  timerMinutes?: number | [number, number];
  speed?: { dial: number; rpm: number; minutes: [number, number] };
  detail?: string;                  // MARKDOWN. paragraphs, tables, emphasis.
  watchFor?: string;                // the success cue
  troubleshoot?: { symptom: string; cause: string; fix: string }[];
  concepts?: string[];              // ids from 8.3, rendered as "read more" links
}
```

Store step content in a separate `steps.ts` (or `steps.md` parsed at build time) so prose edits don't touch component code.

**The detail text below is the content. Use it verbatim.** It is the reasoning that makes the recipe worth following rather than obeying, and it took a lot of iteration to get right. Don't summarize it, don't rewrite it in your own voice, don't trim it for brevity.

---

### 8.2 Steps

---

#### `biga-1` — Break up the flour dry
**phase:** biga
**summary:** Weigh {bigaFlour} g of flour, then whisk hard or push it through a coarse sieve to break up the clumps. Weigh first, break up second.
**values:** Biga flour: {bigaFlour} g

**detail:**
> Grain Craft arrives lumpy. It's a milling artifact, not a quality problem — but dry is the only easy time to fix it.
>
> A clump that survives into the biga has dry flour at its core that never ferments, and in a stiff 50% hydration biga you will not find it by hand once the water is in. It turns up later as a hard nodule in the finished dough.
>
> Weigh before you break up, not after, so anything lost to the sieve doesn't change the number you're working from.

---

#### `biga-2` — Dissolve the yeast
**phase:** biga
**summary:** {bigaWater} g of **room-temperature** water, {bigaADY} g ADY. Stir to dissolve.
**values:** Biga water: {bigaWater} g · ADY: {bigaADY} g

**detail:**
> **The dose is the Giorilli standard: 1% fresh yeast = 0.30% IDY = 0.375% ADY on biga flour**, the baseline for 12–18 h at 61–65 °F.
>
> This is the number Piergiorgio Giorilli codified and that essentially every serious source repeats — PizzaBlab, Gozney's own 100% biga recipe, Stadler Made, the Italian baking literature. Go longer and you cut it; run warmer and you cut it. For a time or temperature off that baseline, use PizzaBlab's dough calculator rather than guessing.
>
> **Room-temperature water, not warm and not cold.** Cold water damages yeast cells. There is no proofing or activation step in the classic method — you are not trying to wake the yeast up, just disperse it. At these quantities you are well clear of scale resolution, so no slurry workaround is needed either.
**concepts:** giorilli-standard

---

#### `biga-3` — Mix by hand to chunks
**phase:** biga
**summary:** Add the flour. Hand-mix 3–6 minutes with your fingers in a claw. Target gnocchi-sized chunks with no dry flour anywhere.
**timer:** 3–6 min
**watchFor:** Crumbly chunks, not dough. No dry flour left anywhere.

**detail:**
> **Hand-mix at every batch size.** This isn't a concession for small batches — it's the method. Gozney's 100% biga recipe says to mix by hand to a dry lumpy consistency, and PizzaBlab warns specifically against forming a cohesive mass.
>
> The goal is **small-to-medium chunks, like gnocchi** — not a dough. A spiral mixer's entire purpose is building a gluten network, which is precisely what you don't want here. An over-mixed biga rises like a dough instead of fermenting like a biga, and then it doubles and misleads you about ripeness.
>
> Method: water and yeast **into the mixer bowl** — the biga ferments in the same bowl the final mix runs in, always. Mix to dissolve. Add flour. Make a claw with your hand and circulate your fingertips through it. **3–6 minutes, until no dry flour remains** — any dry flour never ferments. Break up large chunks by hand.
>
> Cover to prevent drying. Sources differ on venting: Gozney and Ooni say leave a gap, PizzaBlab says it serves no purpose. Either is fine; the thing that matters is that it doesn't dry out.
>
> *A side benefit: hand-mixing means the mixer's 500 g minimum never applies to the biga phase, so no batch is too small.*
**concepts:** mix-dont-knead

---

#### `biga-4` — Ferment
**phase:** biga
**summary (retarded):** 2 hours at room temperature, then {bigaFridge} hours in the fridge. Cover so it can't dry out.
**summary (classic):** {bigaRoomOnly} hours at 61–65 °F. Cover so it can't dry out.
**timer:** per schedule

**detail:**
> **The 61–65 °F band isn't only about speed.** That range produces the right ratio of lactic to acetic acid, which is what gives biga its characteristic sharp, vinegary profile. Ferment much warmer and you get a preferment that is biga-shaped but tastes different.
>
> That's why an unstable kitchen is a real problem here and not just a timing nuisance.
>
> **The retarded schedule** — 2 h at room temperature, then 18–20 h in the fridge — is what Ooni's own professional biga recipe does, and it's the standard answer for a kitchen that won't hold a band. The 2 hours gets fermentation started; the fridge then holds it somewhere genuinely stable instead of wherever the room happens to drift. It trades a little of the acid character for control.
>
> **The classic room-temperature version** is the one that produces the truest profile, if you have a wine fridge, a cool basement, or winter.
**concepts:** why-61-65

---

#### `biga-5` — Pull at ~20% rise
**phase:** biga
**summary:** Ripe when the chunks have puffed roughly 20%. **It does not double.**
**watchFor:** Chunks slightly swollen, possibly knitted into a loose block. Smell moderately sharp, alcoholic-sour, and mild — not overpowering.

**detail:**
> **A ripe biga puffs up roughly 20%. That's it.**
>
> This is the cue most people get wrong, because it's the opposite of how a poolish or a bulk dough reads. Waiting for it to double means waiting well past ripe — or it means you over-mixed and it's rising as a dough rather than fermenting as a biga.
>
> The window is genuinely wide. Slower fermentation, slower acid production and less gluten breakdown mean a biga is hard to ruin by an hour either way. **Plan to hit the cue, not the clock.**
>
> To make this objective rather than a judgment call: fill a small straight-sided jar with biga from the same batch and mark the start level. Now "20%" is a number you read off the glass instead of a feeling.

**troubleshoot:**
| Symptom | Cause | Fix |
|---|---|---|
| Doubled in volume | **Over-mixed** — you developed gluten, so it rose like a dough | Hand-mix only, shorter, to loose chunks. Not a yeast problem. |
| Strong, sharp acidic or alcoholic smell | Over-fermented | Shorten, or switch to the retarded schedule |
| No puffing at all | Not ready, ambient colder than assumed, or dead yeast | Give it longer. Probe actual ambient rather than trusting a wall thermometer. Check the yeast. |
| Dry flour visible in the chunks | Under-mixed | Mix the full 3–6 min next time — dry flour never ferments |

---

#### `mix-1` — Prep the bowl
**phase:** mix
**summary:** Break up clumps in {freshFlour} g of fresh flour. Crumble the biga small — smaller is better. Add flour, toss to coat.
**values:** Fresh flour: {freshFlour} g

**detail:**
> The biga is the stiffest thing the machine will face all session. Crumbling it small is the difference between a smooth breakdown and tripping motor protection.
>
> Break up the fresh flour dry for the same reason as the biga flour — this is your last chance before water goes in.

---

#### `mix-2` — Phase A, breakdown
**phase:** mix
**summary:** Add **{phaseAWater} g** of water (60%) with the mixer **off**, then run at **15% / 85 RPM** for 3–4 min until the biga pieces disappear into a rough shaggy mass.
**values:** Phase A water: {phaseAWater} g — weigh it, don't estimate
**speed:** 15% / 85 RPM, 3–4 min

**detail:**
> **Highest-torque phase of the whole session.**
>
> **Add the water with the mixer off.** The Core's slowest setting is 60 RPM — there is no creep speed to fold liquid in gently, and pouring onto flour at 85 RPM throws it out of the bowl. Add, then dial up.
>
> *Optional, from PizzaBlab:* soak the crumbled biga in that water for a few minutes first. But only a few — working biga in water alone strips starch off the chunks and leaves hard, sticky gluten lumps that won't disperse.
>
> If motor protection engages, stop, rest 5 minutes, and resume one step lower. Log it — that's data about your friction factor.
**concepts:** no-creep-speed

---

#### `mix-3` — Phase B, salt and bassinage
**phase:** mix
**summary:** Add {salt} g salt. Then **{phaseBWater} g** (the remaining 40%) in **3 additions**, each fully absorbed before the next. **20% / 98 RPM**, 5–6 min.
**speed:** 20% / 98 RPM, 5–6 min
**values:** Salt: {salt} g · Phase B water: {phaseBWater} g

**detail:**
> **Salt goes in here — never in the biga**, where it would suppress the yeast you just spent 20 hours propagating.
>
> At 2.8% the salt is at the upper end of the Neapolitan range of 2.5–3.0%. That tightens the gluten slightly and slows fermentation a touch, both useful over a long schedule.
>
> **Pour slowly down the splash-guard spout.** At 98 RPM the hook will sling water if you dump it in. Waiting for each addition to fully absorb before the next is what keeps the dough from breaking into a slurry it then has to recover from.

---

#### `mix-4` — Probe the temperature
**phase:** mix
**summary:** Stop and probe. **Target {probeTarget} °F.** You are not aiming at DDT yet.
**values:** Probe target: {probeTarget} °F · DDT: {ddt} °F

**detail:**
> **Why below DDT and not at it.** By the end of Phase B you have absorbed roughly two thirds of the total friction — Phases A and B are long, and the hydration exotherm has already fired.
>
> Still to come, **stated the way the probe will read it** — dough and bowl equilibrated, at 6 balls: Phase C **+3.4 °F**, Phase D **+0.8 °F**, minus **1.0 °F** given back to the room during the 10-minute rest. Net **+3.2 °F.**
>
> **There is no flat "four degrees low" rule.** The gap shrinks as the batch gets smaller, because a small batch has proportionally more bowl to heat:
>
> | Balls | 3 | 6 | 9 | 12 | 18 |
> |---|---:|---:|---:|---:|---:|
> | Probe target | DDT − 2.8 | DDT − 3.2 | DDT − 3.5 | DDT − 3.6 | DDT − 3.7 |
>
> The general form:
>
> **Probe target = DDT − 0.33 × FF × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)**
>
> Remaining friction is diluted by the mixer bowl's thermal mass, and the rest sheds heat in proportion to the dough-to-room gap. At FF 14 in a 70 °F room: 3 balls 72.2 °F, 6 balls 71.8 °F, 9 balls 70.5 °F.

**troubleshoot:**
| Probe reads | Do |
|---|---|
| Target ±1 °F | Run Phase C as written |
| 1–2 °F high | Cut Phase C to 2–2.5 min |
| 1–2 °F low | Extend Phase C to 4.5–5.5 min |
| More than 2 °F off | Accept the miss — fix the water temperature next batch |
**concepts:** friction-factor

---

#### `mix-5` — Phase C, development
**phase:** mix
**summary:** **30% / 123 RPM**, 3–4 min, to smooth and glossy. Adjust duration from the probe: about **{observedRate30} °F per minute** at this speed.
**speed:** 30% / 123 RPM, 3–4 min

**detail:**
> **Phase C has limited authority over temperature, and this is the important part.**
>
> At 6 balls, cutting it to 2 minutes saves only **1.5 °F** and stretching it to 5.5 minutes adds only **2.0 °F**. That's the entire usable range, and it is narrower at 3 balls (−1.3 / +1.8) and slightly wider at 9 (−1.5 / +2.0).
>
> Outside that window you are trading gluten development for temperature and losing both. **An under-mixed dough at exactly the right temperature is worse than a properly developed one running 2 °F warm.** Temperature misses get fixed upstream in the water calculation, not downstream by mangling the mix.
>
> Friction per minute at each speed, if you need to correct elsewhere: 15% ≈ 0.75 °F/min · 20% ≈ 0.86 °F/min · 30% ≈ 1.08 °F/min. **Those are dough-only figures.** What a thermometer shows is each of them multiplied by `Ct/(Ct + C_bowl)` — 0.82 at 3 balls, 0.90 at 6, 0.93 at 9 — which at 30% gives an observed 0.89, 0.97 and 1.01 °F per minute. That is where "about a degree a minute" comes from, and it only holds at 6 balls and up.

---

#### `mix-6` — Rest
**phase:** mix
**summary:** Mixer off, bowl covered, 10 minutes.
**timer:** 10 min

**detail:**
> Relaxes the gluten. The dough smooths out on its own without any further work — this is doing something, even though it looks like nothing is happening.
>
> It also breaks up the mixer's continuous run time, which keeps the whole session inside the Halo Core's 20-minute continuous limit.

---

#### `mix-7` — Phase D, finish
**phase:** mix
**summary:** **20% / 98 RPM**, 45–60 seconds. The dough should pull cleanly off the bowl wall.
**speed:** 20% / 98 RPM, ~1 min
**watchFor:** Smooth and glossy, "pumpkin-lattice" surface, cleans the bowl, thin windowpane with only slight tearing — **and at DDT ±1 °F.**

**detail:**
> **Temperature is a pass/fail gate, not a suggestion.** Record the actual number every time; it's the input to your friction factor and therefore to every future batch.
>
> **Never above 40% / 148 RPM with this dough.** Total run time is about 15 minutes, inside the mixer's 20-minute continuous limit, and the rest breaks it up anyway.

---

#### `bulk-1` — Bulk rest
**phase:** bulk
**summary:** Lightly oiled container, 45–60 min at room temperature. **No folds.**
**timer:** 45–60 min

**detail:**
> **No folds.** The mixer has already built the gluten network, and the biga contributed a developed one before that. Folding now only tightens the dough further and costs you extensibility.
>
> This is the one place where owning a spiral mixer changes the schedule rather than just the effort — a fold-based bulk would add hours here and actively make the dough worse.

---

#### `bulk-2` — Divide and ball
**phase:** bulk
**summary:** Divide to {ballWeight} g. Pre-round, rest 10–15 min, then ball tight.
**timer:** 10–15 min between rounds
**values:** {balls} balls × {ballWeight} g

**detail:**
> The rest between pre-rounding and final balling lets the gluten relax so you can get a tight ball without fighting it. Balling a tense dough tears the surface, and a torn surface doesn't hold gas.
>
> At {ballWeight} g you're opening to roughly 11.5–12 inches — a thickness factor of about 0.083 oz/in², squarely in the classic Neapolitan band. For a fatter cornicione against the Tread's 12" ceiling, open to 11 inches instead.

---

#### `bulk-3` — Onto trays
**phase:** bulk
**summary:** **Very lightly oiled** half-sheet trays with lids — a film wiped with a paper towel, not a pool. Nothing on top of the balls. Room temperature **{roomMin} min**, set by the dough temperature you actually hit.
**values:** Room time: {roomMin} min (final dough {finalDoughTemp} °F)

**detail:**
> **Oil, not flour.**
>
> Flour is hygroscopic. It pulls water out of the dough surface and hydrates into paste. Over 24–36 hours in a fridge — a drying environment even under a lid — you get the worst of both: patches of gluey paste where the flour hydrated, and a dry skin everywhere else. That skin resists opening and tears at the cornicione instead of stretching.
>
> The traditional flour dusting comes from **wooden** dough boxes, which breathe and buffer moisture. Aluminum does neither. Flour that lands on aluminum has nowhere to go but into the dough.
>
> Oil is a barrier rather than an absorbent: it stops the dough bonding to the metal without taking any water out of it, and it prevents skinning over a long cold ferment.
>
> **Keep the two jobs separate:**
>
> | Job | Use |
> |---|---|
> | Release from the **tray** | thin oil film |
> | Release from the **peel** | flour or semolina, at the bench, right before launch |
>
> **Keep it to a film.** Too much oil and three things go wrong: the ball slides instead of gripping enough to hold its dome as it relaxes, the base picks up enough oil to fry and over-brown on the stone, and the excess smokes on contact. A neutral oil is marginally better than olive purely on smoke point, though at a wiped film it barely matters.
>
> **Nothing on top of the balls.** The lid handles humidity. Oil on the upper surface becomes the cornicione surface and darkens it unevenly.
**concepts:** oil-not-flour

---

#### `bulk-4` — Refrigerate
**phase:** bulk
**summary:** {coldFerment} hours at 38–40 °F. **Spread the trays out for the first 4 hours — do not stack.**
**timer:** {coldFerment} h

**detail:**
> A 265 g ball takes **3–4 hours to reach 40 °F**, and that entire window is warm fermentation you didn't budget for. Stacked trays can double it — the trays in the middle of a stack are insulated by the ones above and below.
>
> This is also why DDT sits at the cool end of the Neapolitan band. Every degree of starting temperature extends the time spent above 50 °F while the mass cools.

---

#### `bake-1` — Temper
**phase:** bake
**summary:** Out of the fridge {temper} hours before baking. Target **60–65 °F at the core** — measure it, don't guess.
**timer:** {temper} h
**watchFor:** Balls relaxed and spread slightly, domed, airy, with a slow incomplete rebound when poked.

**detail:**
> Below **55 °F** the dough tears on opening and won't spring in the oven. Above **70 °F** it goes slack and sticky and loses its shape on the peel.
>
> The visual cue and the thermometer should agree. If the ball looks ready but reads 52 °F, trust the thermometer — the surface warms long before the core does.

---

#### `bake-2` — Bake
**phase:** bake
**summary:** Preheat until the gauge reads **750 °F**. Launch on **full flame**, 60–90 s, turning every 15–20 s.

**detail:**
> **Why 750 + full flame is the correct call, not a compromise.**
>
> Neapolitan baking is governed by the **ratio of top heat to bottom heat**, not by absolute temperature. The stone cooks the base by conduction; the flame cooks the top by radiation. If the base finishes before the top, you need a *larger* top-to-bottom ratio — which means lowering the stone, raising the flame, or both.
>
> A 750 °F stone with full flame does exactly that. Pushing the stone to 800 °F+ moves the ratio the wrong way and burns the base before the cornicione has set.
>
> **Turn every 15–20 s.** Lateral flame plus a small chamber means a static face scorches fast.
>
> **Let the stone recover between pies.** The Tread heats and cools fast, which is the price of low thermal mass. Across 9–18 pizzas the stone is the limiting variable, not the dough.
>
> *Worth logging once: the built-in gauge and an IR reading of the stone surface are different measurements and won't agree. If you gun the stone at gauge-750, write down what it says — that's the number that transfers to any other oven.*

**troubleshoot:**
| Symptom | Cause | Fix |
|---|---|---|
| **Burn ring at the base of the cornicione** | That ring is unsauced *and* usually the thinnest part of the base — no evaporative cooling and no thermal mass, stacked on top of each other | Take the sauce to ~1 cm from the rim · open with a gradual thickness gradient rather than pressing a groove · brush loose flour off the base · first turn at 15 s · lift and dome 5–10 s if the base runs ahead |
| Pale crust on long ferments | Residual sugars consumed by the yeast | Shorten the cold ferment. **Never bake longer** — it dries the crumb. |
| Base ahead of the top | Top-to-bottom ratio too low | Lower the stone or raise the flame |
| Top ahead of the base | Top-to-bottom ratio too high | The only case for nudging the stone up |
**concepts:** burn-ring

---

### 8.3 Concepts

Longer background pieces that don't belong to a single step. Render as a drawer, modal, or `/concepts/:id` route. Steps link to them via the `concepts` field; the calculator cards should also link to the relevant ones — `thermal-model` from the water card, `friction-factor` from the calibration panel.

```ts
interface Concept { id: string; title: string; body: string; /* markdown */ }
```

**`why-biga`** — *Why this recipe uses a 65% biga*
> Its low water activity suppresses protease mobility, so the gluten survives a long ferment instead of degrading, and it pushes the bacteria toward heterofermentative pathways — more acetic acid, a sharper and more complex aroma, and the big irregular alveoli that define the contemporary Neapolitan cornicione. It is also the more forgiving preferment: slower acid production and a wider usable window than a liquid preferment gives you.
>
> **Why 65% and not 100%.** The flavor-versus-preferment-percentage curve flattens sharply above about 60%, while the risks keep climbing. Three reasons to stop at 65%:
>
> - **Flour strength.** Every serious biga source calls for W 300+ / 12.5%+ protein for long ferments. Grain Craft Neapolitan is 12.2–12.8% protein — capable, but at the lower edge. Holding 35% of the flour out of the preferment leaves un-fermented gluten in the final dough as structural margin.
> - **A live consistency lever.** The reserved water gets added by feel during the mix, so you can correct for a wetter or drier biga instead of committing everything up front.
> - **Mixer load.** A smaller biga is easier to break down, and the breakdown phase is the hardest work the machine does.
>
> Once this has run cleanly three or four times, pushing to 80% or 100% biga is a clean single-variable experiment.

**`formula-rationale`** — *Why 70% hydration, 2.8% salt, no malt*
> **70% hydration** — enough to get an open, airy crumb and a puffy cornicione in a 60–90 second bake, without exceeding what a 12.5%-protein flour can hold through a long ferment. A biga dough handles drier than the number suggests, because the biga's gluten is already built before the water goes in.
>
> **50% biga hydration** — the documented band is 44–50%. Giorilli codified 45% and allows up to 50% for less-refined flours; Grain Craft at 0.55% ash sits just outside true-00 refinement, and 50% hand-mixes more evenly.
>
> **2.8% salt** — at the upper end of the Neapolitan range of 2.5–3.0%, which tightens the gluten slightly and slows fermentation a touch, both useful over a long schedule.
>
> **No diastatic malt.** At these temperatures added sugars and extra amylase just burn. Grain Craft is unmalted, and that's correct here.

**`schedule-architecture`** — *Why the cold ferment is 6–36 h and not 72*
> Classic biga **front-loads the entire fermentation.** At 0.375% ADY on 65% biga flour you carry about 0.244% ADY on total flour — a heavy dose by pizza standards, and deliberately so, because the preferment is meant to do essentially all the work.
>
> Every documented biga recipe then gives the final dough a *short* proof: Giorilli and Gozney a few hours, Ooni 2 h at room temperature or 6–36 h in the fridge.
>
> This is the opposite of a lightly-prefermented dough that gets its character from days in the fridge. **Stack a full-strength classic biga on top of a 50-hour cold ferment and you have specified two complete fermentations.** The dough will blow out.
>
> There's a second thing worth absorbing: **in Italian practice you get more time by lengthening the biga, not the ball proof.** PizzaBlab's range is 12–24 h; "biga lunga" runs 24 h at 39 °F then 24 h at room temperature. The length lives in the preferment.

**`thermal-model`** — *How the water temperature is calculated*
> Standard "multiply DDT by 4" arithmetic breaks down here. It weights the preferment as one of four equal factors, but the biga is **56% of the final dough mass.** So this uses a proper mass-and-specific-heat weighted mix, which resolves to:
>
> **And it has to include the mixer bowl.** Omitting it made this calculation 5 °F wrong on the first real bake.
>
> **T_water = [ DDT × (Ct + C_bowl) − FF × Ct − Cb·T_biga − Cf·T_flour − Cs·T_room − C_bowl·T_bowl ] ÷ Cw**
>
> Specific heats: biga at 50% hydration 0.6133, flour 0.42, water 1.00, salt 0.21, stainless 0.12. A 965 g bowl contributes 115.8 — comparable to the fresh flour, and larger than it below about 5 balls.
>
> **Two bowl effects, and only one matters.** Its *temperature* enters with sensitivity `C_bowl/(Ct + C_bowl)` — 0.10 °F of dough per 1 °F of bowl error at 6 balls, 0.18 at 3 balls. So a 3 °F misestimate costs 0.3 °F and a 20 °F cold bowl costs 2.0 °F; same coefficient, different inputs. Defaulting to the biga temperature lands well inside that, which is why it needs no measurement (19 h of contact leaves bowl and biga at equilibrium). Its *mass* is the real effect: friction energy heats whatever is in the bowl, and the bowl is part of "whatever." At 3 balls it absorbs 18% of the mixer's work; at 18 balls, 3.5%.
>
> **This is why the formula is not scale-independent.** The bowl is fixed mass while the dough scales, so the weights shift with batch size. It also explains why the bowl can't just be folded into FF — the same FF of 14 would appear as 11.5 °F at 3 balls and 13.5 °F at 18, drifting for no physical reason.
>
> **The scale that matters is the mix, not the batch.** A 12-ball batch runs as two 6-ball mixes, and the bowl faces one of them at a time — so it is a 6-ball thermal system twice over, not a 12-ball one. Computing it as a 12-ball system halves the bowl's apparent share and lands the water target 2.6 °F low.
>
> **The same fixed mass is why small batches ask for hot water.** At 3 balls the bowl is 18% of the system and only the water can lift it, so the requirement runs to about 107 °F where a 9-ball batch asks for 90 °F. Below 3 balls it leaves the range a tap can reach entirely, which is why 3 is the smallest supported batch.
>
> **How much a bowl error costs is a different number from how much the bowl moves the answer.** Misjudging the bowl costs `C_bowl/(Ct + C_bowl)` of dough temperature — small, 0.10 °F per °F at 6 balls. But it shifts the water target by `C_bowl/Cw`, three times larger because water is only 30% of the system: 0.66 °F per °F at 3 balls, 0.33 at 6, 0.11 at 18. The water target is the number you act on, which is why the bowl is worth a five-second measurement even though the dough barely notices.
>
> **The biga always ferments in the bowl, so there is one lever on it: the temper.** An hour on the counter warms bowl and biga together and lifts the whole cold end of the system. Skipping it is the most expensive shortcut in the schedule — each °F of biga temperature is worth about 2 °F of water, and at 3 balls a skipped temper is what pushes the requirement toward 100 °F.
>
> Note what this implies: with a fridge-retarded biga you need **warm** water. The biga's thermal mass is the dominant term — which is why the schedule, not the water, is the real temperature lever.

**`friction-factor`** — *Measuring your own friction factor*
> **FF = 14.0 °F, measured** — bake 1, 21 August 2026, 6 balls. Corroborated independently by the Phase C friction rate: 1.00 °F/min observed on the dough-plus-bowl system is 1.11 °F/min dough-only, against 1.08 predicted.
>
> **FF is defined as the rise the mixer produces in the dough alone.** That's why the work term is `FF × Ct` and not `FF × (Ct + C_bowl)`.
>
> **This is a unit convention, and mixing it up is the single easiest mistake to make here.** A thermometer reads the dough after it has come to equilibrium with the bowl, so any dough-only figure — FF itself, or the per-minute friction rates — has to be multiplied by `Ct/(Ct + C_bowl)` before you compare it to something you measured. That factor is 0.82 at 3 balls, 0.90 at 6, 0.93 at 9. Getting this backwards is what produced the old "probe at DDT − 4" rule, which was over a degree wrong at small batches.
>
> `FF = [ T_final × (Ct + C_bowl) − Cb·T_biga − Cf·T_flour − Cw·T_water − Cs·T_room − C_bowl·T_bowl ] ÷ Ct`
>
> For context on plausibility: commercial spirals land 20–26 °F on a full bread mix, and this is a shorter profile on a smaller machine with a 10-minute rest in the middle, so the low end is where it belongs.
>
> **Still one data point.** The falsifiable test is whether FF holds near 14 at 3 and 9 balls while the raw temperature rise differs (11.5 vs 13.0). If it drifts even after the dilution correction, something else is going on.
>
> Protocol: record every input mass and temperature, run the mix profile exactly, probe the dough **immediately** at the end (three spots, center of the mass, averaged), then subtract.
>
> **Three things that will bite you:**
>
> - **FF is a property of the profile, not the machine.** Change speeds or times and it moves. Roughly +1 °F per additional minute at 30%. Re-measure whenever you change the routine.
> - **FF differs by batch size.** A 9-ball batch runs higher than a 3-ball — more total work done, less surface area per unit mass to shed it. Keep a separate value for each size you actually use.
> - **Heat of hydration is already included.** Flour releases roughly 1.5–3 °F of exothermic heat as it absorbs water. That happens during the mix, so it's already inside the temperature you measured and therefore already inside your FF. It is a single combined number covering mixer friction *and* hydration exotherm. If you meet a calculator asking for friction alongside a *separate* hydration correction, that's a different convention — don't feed it this number.

**`giorilli-standard`** — *Where the yeast number comes from*
> **1% fresh yeast = 0.30% IDY = 0.375% ADY, on biga flour**, for 12–18 h at 61–65 °F with the biga at 45–50% hydration.
>
> This is the figure Piergiorgio Giorilli codified, and essentially every serious source repeats it — PizzaBlab, Gozney's own 100% biga recipe, Stadler Made, the Italian baking literature. It is a *baseline* for 12–16 h at around 68 °F, or 16–18 h at 61–65 °F. Go longer and you cut it; run warmer and you cut it.
>
> **The sourced number is the fresh-yeast dose.** Everything after it is unit conversion — fresh to instant at 0.30, instant to active-dry at ×1.25 — which lands on 0.375% exactly. Earlier drafts rounded that to 0.38% in the prose while computing at 0.375%, a 1.3% disagreement the dough would never have noticed but which made the arithmetic uncheckable.
>
> For a time or temperature outside that baseline, use PizzaBlab's dough calculator. It's built for exactly this, and it's the same source the rest of this recipe's biga guidance comes from.

**`mix-dont-knead`** — *Mix, don't knead*
> The goal for a biga is **small-to-medium chunks, like gnocchi** — not a dough. A spiral mixer's entire purpose is building a gluten network, which is precisely what you don't want in a preferment.
>
> An over-mixed biga rises like a dough instead of fermenting like a biga. It then doubles in volume, which reads as "ripe" against the usual intuition, and it is not. This single mistake explains most failed bigas.

**`why-61-65`** — *Why 61–65 °F specifically*
> It isn't just about speed. That range produces the **right ratio of lactic to acetic acid**, which is what gives biga its characteristic sharp, vinegary profile. Ferment much warmer and you get a preferment that is biga-shaped but tastes different.
>
> This is why an unstable kitchen is a real problem rather than a timing nuisance, and why the fridge-retarded schedule exists — it trades a little of that acid character for a temperature that actually holds.

**`no-creep-speed`** — *The mixer has no slow speed*
> Measured: **5% on the dial = 60 RPM**, and `RPM = 47.4 + 2.526 × dial%`. Ooni's published help-center chart claiming 5% = 15 RPM is wrong — the dial maps across a *usable band*, not from zero. The Halo Pro works the same way.
>
> The practical consequence: **60 RPM is the floor.** You cannot gently fold liquid in. Add water and flour with the mixer off, then bring the dial up, or you'll throw flour out of the bowl and sling bassinage water off the hook.

**`oil-not-flour`** — *Why the trays get oil*
> Full explanation is in the `bulk-3` step detail. Short version: flour is hygroscopic and pulls water out of the dough surface, which over a long cold ferment gives you gluey patches and dry skin at the same time. The traditional flour dusting assumes wooden boxes that breathe; aluminum doesn't.

**`burn-ring`** — *The burn ring at the base of the cornicione*
> That specific pattern is diagnostic, and it's only partly about temperature. The ring where the cornicione meets the flat center is the worst spot on the pizza for base scorching, for two reasons that stack:
>
> 1. **No moisture buffer.** Sauce and cheese hold the center near 100 °C by evaporative cooling until the water is gone. Sauce normally stops 1–1.5 cm short of the rim, so that ring gets full conductive heat with nothing above it absorbing energy.
> 2. **It's often the thinnest part of the base.** Pressing hard just inside the rim to define the cornicione thins the dough exactly there. Less mass, less thermal buffer, first to burn.
>
> Driest contact zone and thinnest cross-section, right on top of each other. Fix the saucing and the opening before you touch the oven temperature.

---

## 9. Reference tables

Put these on a secondary page or in a drawer — needed occasionally, not every session.

### Mixer speed
`RPM = 47.4 + 2.526 × dial%` — measured, 5% = 60 RPM. Ooni's published help-center chart claiming 5% = 15 RPM is **wrong**; don't reproduce it.

| Dial | RPM | Used for |
|---:|---:|---|
| 5% | 60 | floor — no slower setting exists |
| 15% | 85 | Phase A breakdown |
| 20% | 98 | Phase B, Phase D |
| 30% | 123 | Phase C development |
| 40% | 148 | hard ceiling for this dough |
| 80% | 250 | Ooni max recommended at 66%+ hydration |

### Friction rate
**Dough-only** (matching FF): 0.75 °F/min at 15% · 0.86 at 20% · 1.08 at 30%

**As observed on a thermometer** — multiply by `Ct/(Ct + C_bowl)`:

| Balls | 3 | 6 | 9 | 12 | 18 |
|---|---:|---:|---:|---:|---:|
| Factor | 0.821 | 0.901 | 0.932 | 0.948 | 0.965 |
| At 30% | 0.89 | 0.97 | 1.01 | 1.02 | 1.04 |

### Water temperature
Blend fridge-cold water with tap to the target, measuring as you pour. Fridge water reaches ~38 °F; tap covers upward. Across the supported range (3–24 balls, 240–300 g, biga 45–60 °F, room 60–84 °F) the required water spans **53–109 °F**, and **53–107 °F** at the 265 g default — hottest at *small mixes*, not small batches. No ice and no split calculation.

---

## 10. Phase 2 — bake log

Not required for v1, but design the data layer so it can be added. `localStorage`, with JSON export.

```
batch_id, date, balls, ball_g, total_flour_g
biga_ady_pct, biga_water_temp_f, biga_start_time, biga_rt_hours, biga_fridge_hours
biga_pct_rise_at_pull, biga_temp_at_mix_f
room_temp_f, flour_temp_f, water_temp_used_f
bowl_mass_g
mix_index                         // 1-based; a split batch logs one row per mix
bowl_state                        // cold | room | warm_from_previous_mix
bowl_temp_f                       // MEASURED at mix start; the selector is a fallback, not a value
biga_temp_at_pull_f               // before tearing - the bowl's likely temperature
biga_temp_at_mix_f                // after tearing - what the model calls T_biga
phase_a_water_g                   // actual, weighed
phase_c_seconds_actual
ddt_target_f, probe_temp_f, phase_c_seconds, final_dough_temp_f
predicted_mix_temp_f, ff_measured
motor_protection_engaged
ball_temp_into_fridge_f, fridge_temp_f, cold_hours
temper_hours, ball_core_at_launch_f
gauge_temp_f, stone_ir_f, bake_seconds
notes_crumb, notes_cornicione, notes_base
```

`ff_measured` uses the §4.3 solve-for-FF form, which includes the bowl. Do not use `final − predicted_mix`; that omits the bowl and understates FF by 1.5–2.5 °F depending on batch size.

**The payoff, and the reason this is worth building:** with 8–10 logged bakes you can regress `FF = a + b × (room_temp_f − 70)` per batch size. Friction factor isn't a constant — it rises with batch size (more work, less surface area per unit mass to shed it) and drifts with room temperature (heat lost during a 15-minute mix scales with the dough-to-air gap). Generic calculators use a single fixed FF. Modeling it is the thing this app can do that they can't.

Auto-populate the log from the current session's inputs so only the measured values need typing.

---

## 11. Sources

Link these from an About page. The recipe is built on published practice, not invention.

- [PizzaBlab — Biga (Preferment)](https://www.pizzablab.com/the-encyclopizza/biga-preferment/) — hydration, yeast, ripeness cues, mixing technique
- [PizzaBlab — Dough Calculator](https://www.pizzablab.com/calculators/pizza-dough-calculator/) — for biga yeast off the baseline time/temp
- [Gozney — 100% Biga Pizza Dough](https://us.gozney.com/blogs/recipes/100-biga-pizza-dough-recipe) — 1% yeast, 16–18 h at 61–64 °F, hand-mixed
- [Ooni / Marco Fuso — 100% Biga using Halo Pro](https://ooni.com/blogs/recipes/ooni-100-biga-dough-using-halo-pro) — the fridge-retarded schedule
- [Stadler Made — Biga](https://www.stadlermade.com/pizza/ingredients/biga/) — warm-kitchen workaround
- [Baking With Theory — Biga](https://www.bakingwiththeory.com/theory/biga/) — Giorilli formula

---

## 12. Build order

1. Calculation module + unit tests against §5, **including the bake-1 regression test.** Get this green before writing any UI. The bowl term and the `FF × Ct` work term are the two places this goes wrong silently.
2. Input panels with URL + localStorage state.
3. Ingredients, water, and warnings cards — **both** water warnings (§4.4), not just the cold one.
4. Timeline, forward mode.
5. Step list with disclosure and persisted checkboxes. **Render `detail` as markdown** — it contains tables and multi-paragraph prose. Diff your `steps.ts` against §8 before moving on; truncated explanations are the most likely way this build goes wrong.
6. Timers.
7. Timeline backward mode.
8. Reference drawer, About page.
9. GitHub Actions deploy.
10. Bake log.

**Ask before deviating on any number.** The formulas were derived and cross-checked; a plausible-looking simplification will produce a wrong answer that won't be obvious until 50 hours later.

**The mixer bowl is not optional.** Any formula without a `C_bowl` term is the superseded version and produces water temperatures several degrees wrong.

**Dough-only and observed are different quantities.** `FF` and `FRICTION_RATE` are dough-only; anything compared against a thermometer reading needs `× Ct/(Ct + C_bowl)`. Route every such conversion through one helper so it can't drift apart.

**Four things you may find in older text that are now wrong.** Delete them on sight rather than reconciling them: a flat `DDT − 4` probe target; a stated water span topping out near 90 °F; `ADY_OF_BIGA_FLOUR = 0.0038`; and thermal weights computed from batch totals rather than per-mix masses.

**Do not shorten the prose in §8.** If a step's detail feels long for a UI, that's what the disclosure is for — collapse it, don't cut it.

`Biga-Neapolitan-HaloCore-GrainCraft.md` is the human-readable source document this spec was derived from. Keep the two in sync if either changes.
