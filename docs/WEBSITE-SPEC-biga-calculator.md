# Build Spec — Biga Neapolitan Dough Calculator

**For a Claude Code session.** Build a static, client-side web app that presents this dough recipe as a live calculator plus a step-by-step guide. Hosted on GitHub Pages.

Every formula, constant, and piece of step content you need is in this document. **Do not invent dough science.** If something isn't specified here, ask rather than guessing — the numbers are load-bearing and were derived carefully.

---

## 1. What this is

A single-page tool that replaces a generic dough app with one tuned to a specific setup: **Grain Craft Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven, and a 65% biga.**

The user enters batch size, their measured temperatures, and how long they want the cold ferment. The app returns exact gram weights, the water temperature to hit, an ice/tap split, a timeline with real clock times, and a guided step list.

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
  ADY_OF_BIGA_FLOUR: 0.0038,  // Giorilli standard: 1% fresh = 0.30% IDY = 0.38% ADY
  OVERAGE: 1.022,             // 2.2% for scrap and bowl residue
  DOUGH_YIELD: 1.728,         // 1 + HYDRATION + SALT

  // Specific heats, cal/g·°C (numerically equal to BTU/lb·°F)
  C_FLOUR: 0.42,
  C_WATER: 1.00,
  C_SALT: 0.21,
  C_BIGA: 0.6133,             // derived: (1/1.5)*0.42 + (0.5/1.5)*1.00

  // Ice
  LATENT_F: 144,              // 80 cal/g expressed as °F of liquid-water equivalent
  C_ICE: 0.5,                 // ice specific heat relative to water

  // Ooni Halo Core limits
  MAX_DOUGH: 2500,            // g
  MIN_DOUGH: 500,             // g
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
  DEFAULT_FF: 14,             // °F, until the user measures their own
  DEFAULT_FREEZER_F: 16,
  DEFAULT_TAP_F: 60,
} as const;
```

**`C_BIGA` must be derived, not hardcoded**, so it follows if `BIGA_HYDRATION` ever changes:
```ts
const cBiga = (1/(1+C.BIGA_HYDRATION))*C.C_FLOUR + (C.BIGA_HYDRATION/(1+C.BIGA_HYDRATION))*C.C_WATER;
```

---

## 4. Calculation engine

Implement as pure functions in one module with no UI imports. This is the part to unit-test.

### 4.1 Formula

```
F           = (balls × ballWeight × OVERAGE) / DOUGH_YIELD    // total flour
bigaFlour   = F × BIGA_FRACTION
bigaWater   = bigaFlour × BIGA_HYDRATION
bigaMass    = bigaFlour + bigaWater
bigaADY     = bigaFlour × ADY_OF_BIGA_FLOUR
freshFlour  = F − bigaFlour
freshWater  = F × HYDRATION − bigaWater
salt        = F × SALT
doughTotal  = F × DOUGH_YIELD
```

**Do not round intermediates.** Round only for display: flour/water/salt/dough to 1 decimal, ADY to 2, temperatures to 1.

### 4.2 Thermal weights

Compute from component heat capacities rather than hardcoding — the weights are scale-invariant, which makes them a good assertion target.

```
Cb = bigaMass   × C_BIGA
Cf = freshFlour × C_FLOUR
Cw = freshWater × C_WATER
Cs = salt       × C_SALT
Ct = Cb + Cf + Cw + Cs
```

**Assert in tests:** `Cb/Ct ≈ 0.5311`, `Cf/Ct ≈ 0.1306`, `Cw/Ct ≈ 0.3331`, `Cs/Ct ≈ 0.0052`, identical at every batch size.

### 4.3 Required water temperature

```
waterTempF = ((DDT − FF) × Ct − Cb×T_biga − Cf×T_flour − Cs×T_room) / Cw
```

`DDT` default: **75 °F** for ≤6 balls, **74 °F** for 7+. User-overridable.

### 4.4 Ice

Melting absorbs 80 cal/g with no temperature change, which equals 144 °F of liquid-water cooling. Sub-freezing ice must first warm to 32 °F at half water's specific heat.

```
iceEffF = −112 − C_ICE × (32 − freezerTempF)     // 16 °F freezer → −120 °F
ice     = freshWater × (tapF − waterTempF) / (tapF − iceEffF)
tap     = freshWater − ice
```

Handle these cases explicitly:

| Condition | Behavior |
|---|---|
| `waterTempF >= tapF` | `ice = 0`. If `waterTempF > tapF + 0.5`, show "warm the water to X °F" instead |
| `ice > 0.35 × freshWater` | Warn: won't reliably melt in one mix; suggest chilling the biga or the fresh flour |
| `ice > freshWater` | Error: unreachable. Suggest chilling the biga |

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
probeTargetF = DDT − 0.33 × FF + 1
// + 1 more if balls <= 3 (small batches shed more heat during the 10-min rest)
```

### 4.7 Timeline

Two modes. **Forward** (default): user gives biga start time. **Backward**: user gives target bake time, solve for when to start the biga.

Durations in hours, from biga mix at t=0. **These are authoritative** — they were reconciled against the procedure steps in the recipe document, whose §7 summary table had collapsed three separate stages into one and omitted the mix itself. If the two ever disagree again, these win.

| Key | Retarded (default) | Classic RT | Notes |
|---|---:|---:|---|
| `bigaRoomTemp` | 2 | 0 | |
| `bigaFridge` | 19 | 0 | user-adjustable 18–20 |
| `bigaRoomOnly` | 0 | 16 | user-adjustable 12–18, at 61–65 °F |
| `bigaTemper` | 1 | 0 | out of fridge before mixing |
| `mix` | 0.5 | 0.5 | includes the 10-min rest |
| `bulkRest` | 1 | 1 | |
| `divideBall` | 0.33 | 0.33 | |
| `ballRoomTemp` | 1.5 | 1.5 | user-adjustable 1–2 |
| `coldFerment` | **user input** | **user input** | 6–36, default 24 |
| `temper` | 2.5 | 2.5 | user-adjustable 2–3 |

Fixed overhead outside the cold ferment totals **25.5–30 h**, so total elapsed is always `coldFerment + ~28 h`. At the defaults: ~34 h at 6 h cold, ~52 h at 24 h, ~64 h at 36 h. Assert these.

Show cumulative clock times for each stage plus a total elapsed figure. Flag when a stage lands between midnight and 6 AM — that's the main reason a schedule is unusable in practice, and it's the single most useful thing the backward mode solves.

---

## 5. Test vectors

Assert against these exactly (tolerance ±0.1 g, ±0.1 °F). Generated from a verified reference implementation.

All rows use `FF = 14`, `T_biga = 64`, `T_flour = 70`, `T_room = 70`, `tap = 60`, `freezer = 16`, and default DDT.

| balls | ball g | F | bigaFlour | bigaWater | bigaADY | freshFlour | freshWater | salt | dough | nBiga | nMix | waterTemp | ice | tap |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 265 | 470.2 | 305.6 | 152.8 | 1.16 | 164.6 | 176.3 | 13.2 | 812.5 | 1 | 1 | 52.5 | 7.3 | 169.0 |
| 6 | 265 | 940.4 | 611.2 | 305.6 | 2.32 | 329.1 | 352.6 | 26.3 | 1625.0 | 1 | 1 | 52.5 | 14.6 | 338.0 |
| 9 | 265 | 1410.6 | 916.9 | 458.4 | 3.48 | 493.7 | 529.0 | 39.5 | 2437.5 | 1 | 1 | 49.5 | 30.7 | 498.2 |
| 12 | 265 | 1880.8 | 1222.5 | 611.2 | 4.65 | 658.3 | 705.3 | 52.7 | 3250.0 | 1 | 2 | 49.5 | 41.0 | 664.3 |
| 18 | 265 | 2821.1 | 1833.7 | 916.9 | 6.97 | 987.4 | 1057.9 | 79.0 | 4874.9 | 2 | 2 | 49.5 | 61.5 | 996.5 |
| 5 | 270 | 798.4 | 519.0 | 259.5 | 1.97 | 279.5 | 299.4 | 22.4 | 1379.7 | 1 | 1 | 52.5 | 12.4 | 287.0 |
| 7 | 260 | 1076.4 | 699.7 | 349.8 | 2.66 | 376.7 | 403.7 | 30.1 | 1860.0 | 1 | 1 | 49.5 | 23.4 | 380.2 |

### Additional assertions

**Water temperature** (9 balls, various conditions):

| DDT | FF | T_biga | T_room | → water |
|---:|---:|---:|---:|---:|
| 74 | 12 | 64 | 70 | 55.5 |
| 74 | 12 | 68 | 70 | 49.2 |
| 74 | 18 | 72 | 78 | 21.5 |
| 74 | 12 | 42 | 70 | 90.6 |
| 74 | 12 | 62 | 64 | 61.2 |

The fourth row is important: a fridge-retarded biga requires **warm** water. If the UI can't express that, it's wrong.

**Ice effective temperature:** 32 °F → −112 · 16 °F → −120 · 0 °F → −128

**Invariants that must hold at every batch size and ball weight:**
- `(bigaWater + freshWater) / F` = 0.700
- `salt / F` = 0.028
- `bigaFlour / F` = 0.650
- Sum of all components ≈ `doughTotal` (+ ADY, ~0.1%)

---

## 6. Inputs

Group into three panels. **Batch** open by default; the other two collapsed with a summary line, since most sessions only touch the first.

### Panel 1 — Batch
| Field | Type | Default | Range |
|---|---|---|---|
| Number of balls | stepper | 6 | 1–24 |
| Ball weight (g) | number | 265 | 240–300 |
| Cold ferment (hours) | slider | 24 | 6–36 |
| Schedule | radio | Retarded biga | Retarded / Classic RT |

### Panel 2 — Today's temperatures
| Field | Type | Default | Note |
|---|---|---|---|
| Room temp (°F) | number | 70 | |
| Flour temp (°F) | number | = room | "same as room" toggle |
| Biga temp at mix (°F) | number | 64 | measured, not assumed |
| Tap water temp (°F) | number | 60 | |
| Freezer temp (°F) | number | 16 | rarely changes; persist it |

### Panel 3 — Calibration
| Field | Type | Default | Note |
|---|---|---|---|
| Friction factor (°F) | number | 14 | **per batch size** — see below |
| DDT override (°F) | number | auto | auto = 75 (≤6 balls) / 74 (7+) |

**Friction factor is not one number.** Store a map of `batchSize → measuredFF` in `localStorage` and select by the current batch size, falling back to 14. When the value in use is the fallback, badge it "estimated — not yet calibrated." When it's measured, show the date it was recorded.

---

## 7. Outputs

### 7.1 Ingredients card
Two columns, **Biga** and **Final mix**, gram weights large enough to read at arm's length. A "copy as text" button.

### 7.2 Water & ice card
The headline is the target water temperature. Below it, the ice/tap split in grams. Show `iceEffF` with a tooltip explaining it, since it looks absurd otherwise.

### 7.3 Warnings
Render above the step list, never hidden in a collapsed panel. Sources: capacity splits, ice over 35%, unreachable water temperature, dough below mixer minimum, overnight timeline stages.

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
> **The dose is the Giorilli standard: 1% fresh yeast = 0.30% IDY = 0.38% ADY on biga flour**, the baseline for 12–18 h at 61–65 °F.
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
> Method: water and yeast into a wide, deep container, mix to dissolve. Add flour. Make a claw with your hand and circulate your fingertips through it. **3–6 minutes, until no dry flour remains** — any dry flour never ferments. Break up large chunks by hand.
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
**summary:** Add ~60% of the water ({freshWater60} g) with the mixer **off**, then run at **15% / 85 RPM** for 3–4 min until the biga pieces disappear into a rough shaggy mass.
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
**summary:** Add {salt} g salt. Then the remaining water in **3 additions**, each fully absorbed before the next. **20% / 98 RPM**, 5–6 min.
**speed:** 20% / 98 RPM, 5–6 min
**values:** Salt: {salt} g · Remaining water: {freshWater40} g

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
> Still to come: Phase C at about +3.8 °F, Phase D at about +0.9 °F, minus roughly 1 °F given back to the room during the 10-minute rest. Net **+3.7 °F**, so aim about 4 °F low.
>
> The general form, once you know your own friction factor:
>
> **Probe target = DDT − (0.33 × FF) + 1**
>
> A 3-ball batch sheds more than 1 °F during the rest — closer to 2 — so its target sits about a degree higher.

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
**summary:** **30% / 123 RPM**, 3–4 min, to smooth and glossy. Adjust duration from the probe: about **1 °F per minute** at this speed.
**speed:** 30% / 123 RPM, 3–4 min

**detail:**
> **Phase C has limited authority over temperature, and this is the important part.**
>
> Cutting it to 2 minutes saves only 1.6 °F. Stretching it to 5.5 minutes adds only 2.2 °F. That's the entire usable range.
>
> Outside that window you are trading gluten development for temperature and losing both. **An under-mixed dough at exactly the right temperature is worse than a properly developed one running 2 °F warm.** Temperature misses get fixed upstream in the water calculation, not downstream by mangling the mix.
>
> Friction per minute at each speed, if you need to correct elsewhere: 15% ≈ 0.75 °F/min · 20% ≈ 0.86 °F/min · 30% ≈ 1.08 °F/min.

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
**summary:** **Very lightly oiled** half-sheet trays with lids — a film wiped with a paper towel, not a pool. Nothing on top of the balls. Room temperature {ballRoomTemp} h.

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

Longer background pieces that don't belong to a single step. Render as a drawer, modal, or `/concepts/:id` route. Steps link to them via the `concepts` field; the calculator cards should also link to the relevant ones — `thermal-model` and `ice-physics` from the water card, `friction-factor` from the calibration panel.

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
> Classic biga **front-loads the entire fermentation.** At 0.38% ADY on 65% biga flour you carry about 0.244% ADY on total flour — a heavy dose by pizza standards, and deliberately so, because the preferment is meant to do essentially all the work.
>
> Every documented biga recipe then gives the final dough a *short* proof: Giorilli and Gozney a few hours, Ooni 2 h at room temperature or 6–36 h in the fridge.
>
> This is the opposite of a lightly-prefermented dough that gets its character from days in the fridge. **Stack a full-strength classic biga on top of a 50-hour cold ferment and you have specified two complete fermentations.** The dough will blow out.
>
> There's a second thing worth absorbing: **in Italian practice you get more time by lengthening the biga, not the ball proof.** PizzaBlab's range is 12–24 h; "biga lunga" runs 24 h at 39 °F then 24 h at room temperature. The length lives in the preferment.

**`thermal-model`** — *How the water temperature is calculated*
> Standard "multiply DDT by 4" arithmetic breaks down here. It weights the preferment as one of four equal factors, but the biga is **56% of the final dough mass.** So this uses a proper mass-and-specific-heat weighted mix, which resolves to:
>
> **T_water = 3.00 × [ (DDT − FF) − 0.531 × T_biga − 0.136 × T_room ]**
>
> All temperatures in °F. `T_room` covers the fresh flour and the salt, both sitting at ambient.
>
> **The formula is scale-independent** — identical for 3, 6, 9, 12 or 18 balls, because every component scales with flour. The weights come from the component specific heats: biga at 50% hydration is about 0.613 cal/g·°C, flour 0.42, water 1.00, salt 0.21.
>
> Note what this implies: with a fridge-retarded biga you need **warm** water. The biga's thermal mass is the dominant term, which makes it a more powerful control lever than ice.

**`ice-physics`** — *Why ice isn't the same as cold water*
> Ice at 32 °F and water at 32 °F are the same *temperature* but not the same *energy.* To turn ice into water you have to break the crystal lattice, and that energy goes entirely into breaking hydrogen bonds, not into raising temperature. A thermometer sitting in melting ice reads 32 °F the whole time, even as heat pours in. It's *hidden* from the thermometer, which is why it's called **latent heat.**
>
> The amount is not small: **80 cal/g.** That's the same energy it would take to heat that same gram of water from 32 °F all the way to 176 °F. Every gram of ice carries that much cooling capacity *before* it starts behaving like cold water.
>
> So ice does two jobs and cold water only does one:
>
> | | Ice at 32 °F | Water at 32 °F |
> |---|---|---|
> | Melt (absorbs 80 cal/g, no temp change) | yes | — |
> | Warm from 32 °F to final dough temp | yes | yes |
>
> **Where the negative number comes from.** The weighted-average formula assumes everything behaves like `mass × specific heat × temperature`. Ice doesn't — it has that extra 80 cal/g lump. So instead of adding a special term, we hide it in a fake starting temperature: 80 cal/g ÷ 1.00 cal/g·°C = 80 °C = **144 °F** of equivalent cooling.
>
> **Effective temp = −112 − 0.5 × (32 − T_ice)**
>
> A 16 °F freezer gives −120 °F. It is fictitious — nothing in the bowl is ever remotely that cold. It's a bookkeeping device that makes ice slot into the same linear equation as water and produce exactly the right answer.
>
> **Worked example.** 100 g added to 900 g of 80 °F water: 32 °F *water* gives 75.2 °F, 32 °F *ice* gives 60.8 °F. Same mass, same temperature, 14.4 °F apart.
>
> **All the ice must melt.** The equivalence assumes every gram completes the melting job. Ice still floating in the bowl hasn't spent its 80 cal/g yet — it will spend it over the next few minutes, after you've taken your temperature reading. The dough reads on target, then drifts cold, and your friction factor comes out wrong in a way that poisons every batch calculated from it.

**`friction-factor`** — *Measuring your own friction factor*
> `FF = T_dough_measured − T_mix_predicted`, where the prediction is the weighted mix temperature from the thermal model.
>
> **Start by assuming 14 °F.** Spiral mixers run far lower friction than planetaries — commercial spirals typically land 20–26 °F on a full bread mix, and this is a shorter profile on a small machine with a 10-minute rest in the middle.
>
> Protocol: record every input mass and temperature, run the mix profile exactly, probe the dough **immediately** at the end (three spots, center of the mass, averaged), then subtract.
>
> **Three things that will bite you:**
>
> - **FF is a property of the profile, not the machine.** Change speeds or times and it moves. Roughly +1 °F per additional minute at 30%. Re-measure whenever you change the routine.
> - **FF differs by batch size.** A 9-ball batch runs higher than a 3-ball — more total work done, less surface area per unit mass to shed it. Keep a separate value for each size you actually use.
> - **Heat of hydration is already included.** Flour releases roughly 1.5–3 °F of exothermic heat as it absorbs water. That happens during the mix, so it's already inside the temperature you measured and therefore already inside your FF. It is a single combined number covering mixer friction *and* hydration exotherm. If you meet a calculator asking for friction alongside a *separate* hydration correction, that's a different convention — don't feed it this number.

**`giorilli-standard`** — *Where the yeast number comes from*
> **1% fresh yeast = 0.30% IDY = 0.38% ADY, on biga flour**, for 12–18 h at 61–65 °F with the biga at 45–50% hydration.
>
> This is the figure Piergiorgio Giorilli codified, and essentially every serious source repeats it — PizzaBlab, Gozney's own 100% biga recipe, Stadler Made, the Italian baking literature. It is a *baseline* for 12–16 h at around 68 °F, or 16–18 h at 61–65 °F. Go longer and you cut it; run warmer and you cut it.
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
0.75 °F/min at 15% · 0.86 at 20% · 1.08 at 30%

### Ice, per 100 g water, 60 °F tap, 16 °F freezer ice
55 °F → 2.8 g · 50 °F → 5.6 · 45 °F → 8.3 · 40 °F → 11.1 · 35 °F → 13.9 · 30 °F → 16.7 · 25 °F → 19.4 · 20 °F → 22.2

---

## 10. Phase 2 — bake log

Not required for v1, but design the data layer so it can be added. `localStorage`, with JSON export.

```
batch_id, date, balls, ball_g, total_flour_g
biga_ady_pct, biga_water_temp_f, biga_start_time, biga_rt_hours, biga_fridge_hours
biga_pct_rise_at_pull, biga_temp_at_mix_f
room_temp_f, flour_temp_f, tap_temp_f, ice_g, water_temp_used_f
ddt_target_f, probe_temp_f, phase_c_seconds, final_dough_temp_f
predicted_mix_temp_f, ff_measured
motor_protection_engaged
ball_temp_into_fridge_f, fridge_temp_f, cold_hours
temper_hours, ball_core_at_launch_f
gauge_temp_f, stone_ir_f, bake_seconds
notes_crumb, notes_cornicione, notes_base
```

`ff_measured = final_dough_temp_f − predicted_mix_temp_f`, where the prediction is the §4.2 weighted mix temperature.

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

1. Calculation module + unit tests against §5. **Get this green before writing any UI.**
2. Input panels with URL + localStorage state.
3. Ingredients, water/ice, and warnings cards.
4. Timeline, forward mode.
5. Step list with disclosure and persisted checkboxes. **Render `detail` as markdown** — it contains tables and multi-paragraph prose. Diff your `steps.ts` against §8 before moving on; truncated explanations are the most likely way this build goes wrong.
6. Timers.
7. Timeline backward mode.
8. Reference drawer, About page.
9. GitHub Actions deploy.
10. Bake log.

**Ask before deviating on any number.** The formulas were derived and cross-checked; a plausible-looking simplification will produce a wrong answer that won't be obvious until 50 hours later.

**Do not shorten the prose in §8.** If a step's detail feels long for a UI, that's what the disclosure is for — collapse it, don't cut it.

`Biga-Neapolitan-HaloCore-GrainCraft.md` is the human-readable source document this spec was derived from. Keep the two in sync if either changes.
