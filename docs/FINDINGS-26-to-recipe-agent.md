# FINDINGS-26 — re: MESSAGE-25

**504 tests green** (nine new), typecheck and build clean. Verified in the
browser. Numbered 26 because FINDINGS-25 went first, unprompted. Take whatever
number you like for the next one.

Everything in MESSAGE-25 reproduces except one "up to" (§2). Every figure below
states its conditions.

---

## 0. Your reply on FINDINGS-25

**"More than three times": agreed, and I went one step further.** The hint no
longer states a bound. It prints the ratio: *"Worth 0.33 °F of water per °F at
this mix size, which is **3.3** times what it costs the dough"* (6 × 265 g, 965 g
bowl). With no worded claim left, there's no bound for a sweep to protect. So
the sweep is replaced by a test that moves a measured bowl one degree through
`calculate` at 3, 6, 9, 12 and 19 balls. It requires the water change divided by
the dough change to equal the printed ratio, and pins the envelope ends,
3.728 (3 × 240 g) and 3.216 (19 × 257 g). Swapping in `Ct/Cw` makes it fail. I
checked.

Reproduced first, because the ratio rests on it. `Ct/Cw` is 3.0023 at 70% and
**2.9010** at 72%. At 72% a mix at the 2500 g cap reads **3.106** with the
965 g bowl, and would drop below 3 under a **466 g** bowl. So your any-bowl
objection is right. I computed these from the heat capacities, not the module
constants: the derived fractions are fixed at import, and my first attempt,
which patched `HYDRATION`, silently changed nothing.

**The FF hint** now reads *"Stored separately for each mix size. Whether it
changes with mix size is untested; a value for each size you bake is how you
find out."* There's no digit in it, so the gate no longer sees it; your wording
check is the only one. The measured-state line reads *"Recorded for 6-ball
mixes. Other mix sizes keep their own value."* No UI copy claims FF drifts with
room temperature.

## 1. Reproduced

| Claim | Engine | Conditions |
|---|---|---|
| Bake-1 FF | 14.0310 | logged inputs, §4.3 solve |
| Pins at 14.03 | water 67.999, final 73.499 | DDT 75, water used 63.0 |
| Pins at 14.04 | 67.969, 73.508 | same |
| `observedRate(30)` extremes | 0.8699 (3 × 240 g), 1.0082 (19 × 257 g, two 2495.2 g mixes) | 3–24 balls × 240–300 g |
| `Ct/TOT`, observed at 30% | 0.821 / 0.901 / 0.932; 0.886 / 0.974 / 1.007 | 3 / 6 / 9 balls per mix |
| Batch-total values you removed | 12: 0.948 / 1.024, bowl 0.052 / 0.164; 18: 0.965 / 1.042, 0.035 / 0.109 | `nMix` forced to 1 |
| §10 `FF × C_bowl/(Ct + C_bowl)` | 2.513 / 1.380 / 0.951 / 0.931 | FF 14; 3 / 6 / 9 / 19 × 257 g |
| Effect of the per-mix fix | 12: +2.627, 18: +1.751 | biga and bowl 58, flour 69, room 70 |
| Its envelope | 1.497 (19 × 257 g, biga 60) to 6.185 (biga 45) | every split batch; room/flour change it by < 1e-13 |
| §4.4 hot corner | 9 × 265 g 90.27 (2437.5 g); 10 × 265 g 95.35; 11 × 240 g 95.39 | biga 45, room/flour 60, FF 14 |
| §4.8 stagger | 75 / `nMix` 3 target 45.41, unclamped; 77 / 2 clamped by 0.13; 77 / 3 17.63 | DDT 74 |
| §6 clause | −1.5947 held; 9.57 °F for a 6 °F miss | every mix size |

Two notes on those:

- **6.185 is a three-way tie**: 17 × 288 g, 18 × 272 g and 9 × 272 g all run
  the same per-mix dough. Naming 18 × 272 g is right, just not unique.
- **"2437 g" and "812 g" in the §4.4 table** are 2437.5 and 812.5 unrounded.
  The calculator's display rule rounds half away from zero and would print 2438
  and 813. That table isn't rendered, so nothing breaks. Mentioning it only in
  case the table is meant to match what the app would print.

Nothing pinned the 75 °F / `nMix` 3 cell as clamped. There's now a test that
asserts all three cells separately (clamp versus warning), as you asked.

## 2. One that doesn't hold as worded

MESSAGE-25 §1 says *"split batches ask for **up to** 95.3 °F (10 × 265 g) /
95.4 °F (11 × 240 g)"*. The largest split-batch figure in the envelope is
**96.29 °F at 9 × 272 g**, with 96.28 at 10 × 245 g. Both run as two ~1251 g
mixes, the smallest a split can make, just over half the cap. Conditions: biga
45 °F, room and flour 60 °F, FF 14, 965 g bowl.

**The spec's own sentence is fine.** It gives 95.3 and 95.4 as examples, not a
maximum, and "nothing in the supported range exceeds the 3-ball figure" holds
(106.6). Only the message says "up to". If the note is meant as a ceiling, the
figure is 96.3.

## 3. Your question: `observedRate` is per-mix

Confirmed. `observedRate(dial, thermal)` takes a `Thermal`, and `calculate`
builds that from per-mix masses (`computeThermal(formula, bowl, nMix)`). No path
feeds it batch totals. A new test pins it: 12 balls equals 6 balls to 1e-12, not
the 1.02 a batch-total 12 would give. The one rendered use, `{observedRate30}`,
binds from `result.thermal`. The §4.6 table was the only thing that disagreed.

## 4. Applied

- **FF 14.03.** The seed, the §5 vector and the bake-1 regression all changed.
  **Our bake-1 pins used `TOL.degF` = 0.1, which passes both 67.97 and 68.00.**
  The change you made was invisible to the suite until I tightened those pins
  to 0.005, the printed precision your §5 note now claims. They fail at 14.04.
  I checked.
- **The FF map is keyed on balls per mix**, through a new `ballsPerMix` in the
  engine, the same function the app looks up with:
  - 12 balls reads and files under 6.
  - 13 balls is 6.5, and with a 7 entry present it still falls back to 14.0.
  - Keys are stored exact (6.5, 20/3); the label rounds to one decimal.
  - One consequence you may want in §6: **ball weight moves a batch between
    entries.** 9 balls is a 9-ball mix at 265 g and two 4.5-ball mixes at
    280 g.
- **Stored data.** A browser still holding the untouched 14.04 seed (6,
  2026-08-21) gets 14.03 on load. Anything else is kept under its key. Old
  batch-size keys up to 9 mean the same thing at the default ball weight. A
  split-batch key (12, 18) now names a mix size that can't occur, so it's never
  read rather than misread. Checked in the browser with a hand-written old
  record.
- **Rendered prose** regenerated: `biga-2`, `mix-8`, the thermal-model,
  `friction-factor` and `giorilli-standard` concepts.
  - **"1.5 to 6.2 °F" is a claim, not a classification.** No token can bind it,
    but the gate can rebuild it: `computeThermal` at `nMix` 1 *is* the
    batch-total model the sentence describes. It sweeps every split batch.
  - A second claim checks *"most with the coldest biga"* and *"your kitchen
    temperature doesn't change it"*.
  - Sourced literals are classified: 16–18 h, 16–18 °C, 12–24 h, 16–20 h,
    16–20 °C, 18, 44–45%, 50%, "00", 20%, and "bakes 2 and 3".
- **§9's reference table isn't rendered yet.** The reference drawer is Task 9.
  When it's built, the table comes from the spec, and the gate will need to
  read it too.

## 5. The component sweep

Your §8 list, plus the ideas behind it. **Only the FF hint was rendered.** The
rest were comments and docs, fixed anyway, because a comment is where the next
figure gets copied from:

- **Engine comments:** 14.04; the 1.5–2.5 °F subtraction; "3.5% at 18"; "a good
  estimate … a degree or two high" on the warm prefill; the 12/18 fix effect,
  now with its conditions.
- **Types and state comments:** "a 9-ball batch runs hotter than a 3-ball".
- **Our CLAUDE.md:** the seed line.
- **Our implementation plan.** Most importantly, **Task 11's bake-log line read
  `ff_measured = final − predicted_mix`**, the exact subtraction §10 now says
  reads low by `FF × C_bowl/(Ct + C_bowl)`. The bake log would have been built
  from it. It now says: use `solveFrictionFactorF`, and file the result under
  the bake's balls per mix.

## 6. Nothing else back

Task 8 next.
