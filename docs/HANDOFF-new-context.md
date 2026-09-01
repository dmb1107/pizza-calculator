# Handoff — Biga Neapolitan project

You're picking up two linked things for Dave: a **dough recipe** under active refinement, and a **calculator website** being built from it by a Claude Code agent in a separate session.

Read this, then the two attached documents. Everything below is context that isn't obvious from them.

---

## The two documents

| File | What it is |
|---|---|
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | **The recipe. Human source of truth.** All formulas, reasoning, schedules, troubleshooting, bake log. |
| `WEBSITE-SPEC-biga-calculator.md` | **Standalone build spec.** Current and complete — a fresh agent could build from this alone. Contains constants, calculation engine, test vectors, full step/concept content, build order. |

**Keep them in sync.** Every change to one usually needs the other.

Delta messages through `MESSAGE-4-corrections` are **historical and applied** (agent confirmed: 304 tests green). `MESSAGE-6-replies.md` is the current outstanding one. Earlier messages (`MESSAGE-to-calculator-agent`, `REPLY-*`, `MESSAGE-3-remove-ice`) are **historical**. Their content is folded into the spec, and the ice removal is applied and verified. `MESSAGE-4-corrections.md` is the current outstanding delta — it is also folded into both documents, and exists so the agent knows what moved.

⚠️ **MESSAGE-3's rule "one warning, and only one" is withdrawn** by MESSAGE-4 §2. If you meet it in old text, it is superseded — there are now two water warnings, one at each end.

---

## The setup

- **Flour:** Grain Craft Neapolitan 00, 12.2–12.8% protein, 0.55% ash
- **Mixer:** Ooni Halo Core spiral. `RPM = 47.4 + 2.526 × dial%` — **measured**, 5% = 60 RPM. Ooni's published help-center chart is wrong; don't use it.
- **Bowl:** 965 g stainless, `C_bowl = 115.8`
- **Oven:** Gozney Tread. **Gauge 750 °F, full flame, 60–90 s.** Validated by Dave over many bakes — 800 °F+ burns the base. Don't "improve" this.
- **Trays:** Nordic Ware half-sheet, lids, **lightly oiled, never floured**
- **Biga vessel:** the mixer bowl, always. Fixed procedure, not a variable — but the bowl is *not* at biga temperature at mix time (see below)
- **Freezer:** 16 °F (now irrelevant — ice was removed)

**The formula:** 65% biga at 50% hydration, 70% total hydration, 2.8% Diamond Crystal kosher salt (weighed, so no conversion), 265 g balls, dough yield 1.728. Biga yeast **0.375% ADY of biga flour** — derived from the published 1% fresh, not the rounded 0.38%.

**Minimum machine batch is 3 balls.** Below that the hook won't grip and the fixed-mass bowl pushes the required water past what a tap delivers.

---

## Where things stand

**Bake 1 complete** (21 Aug 2026, 6 balls). It produced the key measurement and invalidated part of the model. Details in recipe §12.

**FF = 14.04 °F at 6 balls, measured.** Two independent routes agree.

**The mixer bowl had to be added to the thermal model.** Omitting it made the water-temperature output 5 °F wrong. This killed the old scale-independent `3.00 ×` shortcut — everything now computes from component masses.

**Website is mid-build.** MESSAGE-4 was the last change sent; the agent is on Task 8 (backward timeline), which is unaffected by it.

**A second round of cross-checking found six more issues**, all now fixed in both documents (MESSAGE-4 has the full list): the ADY constant disagreed between the two docs; the `DDT − 4` probe shorthand was 1.2 °F wrong at 3 balls; dough-only friction figures were being quoted as if a thermometer would show them; the documented water span topped out near 90 °F when the true maximum is 106.6 °F at 3 balls; the biga-temperature default was unsourced at 64 °F; and two "800–900 °F" references survived in the recipe.

---

## Open items

1. **Bake 2 and 3: run 3 balls and 9 balls.** This is the falsifiable test of the bowl model — FF should stay near 14 while the *raw* temperature rise differs (11.5 vs 13.0 °F). If FF drifts even after the dilution correction, the model is wrong.

   ⚠️ **Measure the bowl temperature at mix start, both bakes.** FF = 14.04 was fitted assuming `T_bowl` = 58; fit it at 53 and the same bake gives FF = 14.58. Both reproduce bake 1 exactly and diverge by **1.67 °F at 3 balls** — the same size and sign as the signal bake 2 is testing. Without the measurement the two are not separable after the fact.
2. **Phase A water split.** Dave guessed at the 60% on bake 1 and it ran dry, so we can't tell whether 60/40 is wrong or he added 50%. Now specified in grams. **Needs a clean repeat before changing the split.**
3. **Fridge temperature** — never measured. The biga came out warmer than a 39 °F fridge predicts.
4. **Biga yeast off-baseline.** Baseline is the Giorilli standard (0.38% ADY of biga flour). Anything outside 12–18 h at 61–65 °F goes to PizzaBlab's calculator — **do not write a new table.**

---

## How Dave works

- **Deeply technical, verifies everything.** He'll ask why, and he'll check your arithmetic. Expect pushback and take it seriously — he's been right more often than not.
- **Empirically validated increments over big untested changes.** One variable at a time.
- **Weighs everything in grams. No volume measurements, ever.**
- **Wants reasoning, not instructions.** Every choice justified on its own merits.
- **No comparisons to his previous recipes.** He asked for these explicitly removed. The recipe stands alone.

---

## Hard-won principles

**Cite published sources; never extrapolate a table.** This burned us. An early biga yeast table was derived from Dave's own poolish data — he couldn't verify the temperature it was anchored to, and rebuilding on published practice showed it was **2.7× too low**, with a ripeness cue ("wait for it to triple") that would have compounded the error. A ripe biga puffs ~20% and does not double. Sources: PizzaBlab, Gozney, Ooni/Marco Fuso, Stadler Made, Giorilli.

**Verify arithmetic computationally.** Don't do multi-step thermal math in your head. My band arithmetic was wrong **twice** and the website agent caught both.

**The website agent is good. Reproduce its numbers before disagreeing.** It has caught: two schedule-arithmetic errors, a user-facing claim false at the default batch size, two figures quoted against inconsistent reference points, and a documented bound a new feature had invalidated.

**When a number is provably wrong, fix it. When design intent is ambiguous, ask.** These call for opposite responses, and conflating them is the main failure mode in the agent exchanges.

**Watch for stale cross-references.** Changing a formula tends to leave wrong numbers in the quick card, log schema, concept text, and test assertions. Grep after every change.

---

## Errors already made — don't repeat

| Error | Correction |
|---|---|
| Yeast table extrapolated from session data | Giorilli standard, 0.38% ADY of biga flour |
| "Biga triples, domed" | **Puffs ~20%, does not double.** Doubling = over-mixed |
| Mixing the biga in the spiral mixer | **Hand-mix always.** A hook builds gluten, which is exactly wrong |
| Flouring the proofing trays | **Oil.** Flour is hygroscopic and skins the dough |
| Recommending 800–850 °F stone | **750 gauge, full flame** |
| Bowl-free thermal model | 5 °F error; bowl is required |
| "120–135 min room temp" for a 73.5 °F dough | **105 min** — I'd double-counted the cooldown deficit |
| "Bowl contributes more than the fresh flour" | Only true below ~5 balls |
| Ice calculations | **Removed.** Output a water temperature; Dave blends fridge and tap by hand |
| ADY at 0.0038 in the spec while the recipe's tables used 0.00375 | **0.00375, derived** from the published 1% fresh dose |
| Flat "probe at DDT − 4" | **Batch-size dependent:** DDT − 2.8 / 3.2 / 3.5 at 3 / 6 / 9 balls |
| Quoting 0.75/0.86/1.08 °F/min against a thermometer | Those are **dough-only.** Observed = `× Ct/(Ct + C_bowl)` = 0.82 / 0.90 / 0.93 |
| "Required water spans 52–90 °F" | **53–109 °F.** Hottest at *small mixes*, not small batches, and not monotonic — 12 balls (two 6-ball mixes) wants hotter water than 9 |
| Biga-temp default of 64 °F | **58 °F**, the one measured value. Most leveraged input in the model |
| "The bowl matters for its mass, not its temperature" | Half right. `C_bowl/TOT` (dough) is small; `C_bowl/Cw` (water) is 3× larger — 0.66 °F per °F at 3 balls. **Measure the bowl** |
| `T_bowl = T_biga` treated as settled | Holds through fermentation, **breaks at tearing** — biga gained 5 °F, bowl didn't. Bake 1's Phase C rate climb is the evidence |
| Thermal weights from batch totals | **Per-mix.** A 12-ball batch is a 6-ball system twice; the bowl faces one mix at a time. Batch totals land the water 2.6 °F low at 12 balls |
| One water temperature per batch | **One per mix** when `nMix > 1` — mix 2's bowl is warm from mix 1 |
| Bowl-share / dilution tables keyed on batch size | **Keyed on balls per mix.** 12 balls reads the 6 row, 18 reads the 9. 6.8% is the floor of the bowl's share |
| Split-batch overhead 28.4 h | **28.12 h.** The stagger correction shortens a real stage, so it comes back out. 28.42 is `nMix = 3` |
| Claiming step content says something | **Check §8.** Two MESSAGE-4 claims about `mix-1` and `bulk-3` were false; the agent couldn't build to them |
| Batch totals on per-mix or per-biga steps | `{freshFlour}` on `mix-1`, `{bigaFlour}` on `biga-1`. Two rounds, two instances — check every step value against its scope |
| Deriving a figure from a displayed value | **Round once, at the end.** 28.41 vs 28.42 came from chaining off a rounded 27.83 |
| "The floor is set by the largest batch" | Set by the **2500 g mixer cap**. A split batch gets closer to it than any unsplit one |
| `mix` a flat 0.5 h | **Scales with nMix**, +5 min changeover. Bowl is not cleaned between mixes; residue is thermally neutral and the yield cancels in the shared bulk tub |

---

## Key formulas

```
C_bowl = bowlMassG × 0.12                    // 115.8 at 965 g
Ct     = Cb + Cf + Cw + Cs                   // dough only
TOT    = Ct + C_bowl

T_water = (DDT × TOT − FF × Ct
           − Cb×T_biga − Cf×T_flour − Cs×T_room − C_bowl×T_bowl) / Cw

probeTarget = DDT − 0.33 × FF × (Ct/TOT) + 0.2 × (DDT − T_room)
              // NO flat "DDT − 4" shorthand. It is 1.2 °F wrong at 3 balls.

observedRate  = doughOnlyRate × (Ct/TOT)     // 0.821/0.901/0.932 at 3/6/9 balls
adyOfBigaFlour = 0.01 × 0.30 × 1.25 = 0.00375

roomMin = clamp((90 + 150)/f − 150, 45, 180)   where f = 2^((T_actual − DDT)/17)
```

⚠️ **FF is the rise in the DOUGH ALONE.** The work term is `FF × Ct`, never `FF × TOT`. Reversing it returns a plausible-looking water temperature several degrees wrong. `T_bowl` defaults to `T_biga`.

⚠️ **Dough-only and observed are different quantities, and conflating them is the live failure mode.** FF and the per-minute friction rates are dough-only; a thermometer reads dough-plus-bowl. Multiply by `Ct/(Ct + C_bowl)` before comparing any of them to a measurement. This one mistake produced the `DDT − 4` rule and the overstated Phase C authority figures, in two documents, undetected across several rounds of review.
