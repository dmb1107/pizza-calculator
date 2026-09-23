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

**Every delta message through `MESSAGE-13-replies` has been sent, applied and confirmed** (369 tests green at last report). They are historical; their content is folded into the spec and the recipe, which are the only two documents that need reading. `MESSAGE-21-replies.md` is the current outstanding one.

The numbered messages are a correspondence log, not instructions — read them only to trace why a decision was made.

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

**Website is mid-build.** `MESSAGE-13-replies.md` was the last change sent and is applied; the agent is on Task 8's UI (the backward timeline itself is built). **The site deploys on every push to `main` and has done since 1 September.** An earlier version of this handoff said the deploy had hung since the ice removal and that nothing since MESSAGE-4 was live — **that was never true.** The only failures were two runs on 27 August. The claim started in the calculator agent's notes, was stale when written, and was repeated here for six rounds without anyone checking the Actions history. Consequences worth knowing: fixes reached the live site as they landed, **and so did the bugs** — the step-ordering bug was live 1–14 September (`nMix ≥ 2` only, so no calibration bake could hit it), and the `mix-4` step showed stale 12/18-ball probe values until MESSAGE-17.

**A second round of cross-checking found six more issues**, all now fixed in both documents (MESSAGE-4 has the full list): the ADY constant disagreed between the two docs; the `DDT − 4` probe shorthand was 1.2 °F wrong at 3 balls; dough-only friction figures were being quoted as if a thermometer would show them; the documented water span topped out near 90 °F when the true maximum is 106.6 °F at 3 balls; the biga-temperature default was unsourced at 64 °F; and two "800–900 °F" references survived in the recipe.

---

## Open items

1. **Bake 2 and 3: run 3 balls and 9 balls.** This is the falsifiable test of the bowl model — FF should stay near 14 while the *raw* temperature rise differs (11.5 vs 13.0 °F). If FF drifts even after the dilution correction, the model is wrong.

   ⚠️ **Measure the bowl temperature at mix start, both bakes.** FF = 14.04 was fitted assuming `T_bowl` = 58; fit it at 53 and the same bake gives FF = 14.58. Both reproduce bake 1 exactly and diverge by **1.67 °F at 3 balls** — the same size and sign as the signal bake 2 is testing. Without the measurement the two are not separable after the fact.
2. **Phase A water split.** Dave guessed at the 60% on bake 1 and it ran dry, so we can't tell whether 60/40 is wrong or he added 50%. Now specified in grams. **Needs a clean repeat before changing the split.**
3. **Fridge temperature** — never measured. The biga came out warmer than a 39 °F fridge predicts.
4. **Biga yeast off-baseline.** Baseline is the Giorilli standard (0.375% ADY of biga flour). Anything outside 12–18 h at 61–65 °F goes to PizzaBlab's calculator — **do not write a new table.**

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

⚠️ **These rows are lessons, not sources.** Where a figure appears here it is illustrative; the spec and the recipe are authoritative for every number. **If a figure in this table disagrees with them, this table is the bug** — four rows have already drifted this way, each by restating a conclusion that later moved. Prefer the lesson in the right-hand column over the number attached to it.

⚠️ **Never put a figure here that is not constant over the supported range.** If it moves with mix size, batch size, room temperature, schedule or speed, it goes in with the point it was evaluated at stated inline — or as the operation plus a section pointer. A figure that needs an **operand** is the common case of this and looks unfinished. A figure that needs an **index** reads as finished, and therefore survives an audit: `5 °F error` passed a check written for operands and was one point on a hyperbola.

The question to ask while typing a number is **"does this move?"** — and if it does, **"along which axis most?"** The probe row below survived four rounds indexed on batch size, which moves it 0.7 °F, while holding room temperature fixed, which moves it 4.8.

| Error | Correction |
|---|---|
| Yeast table extrapolated from session data | Giorilli standard, **0.375%** ADY of biga flour, derived from the published 1% fresh |
| "Biga triples, domed" | **Puffs ~20%, does not double.** Doubling = over-mixed |
| Mixing the biga in the spiral mixer | **Hand-mix always.** A hook builds gluten, which is exactly wrong |
| Flouring the proofing trays | **Oil.** Flour is hygroscopic and skins the dough |
| Recommending 800–850 °F stone | **750 gauge, full flame** |
| Bowl-free thermal model | Bowl is required. Error is `C_bowl(DDT − T_bowl)/Cw` — **inversely proportional to mix size**: 5.6 °F at 6 balls on bake 1, 11.2 at 3, 3.7 at 9 |
| "120–135 min room temp" for a 73.5 °F dough | **105 min at DDT 75** — I'd double-counted the cooldown deficit |
| "Bowl contributes more than the fresh flour" | Only true below ~5 balls |
| Ice calculations | **Removed.** Output a water temperature; Dave blends fridge and tap by hand |
| ADY at 0.0038 in the spec while the recipe's tables used 0.00375 | **0.00375, derived** from the published 1% fresh dose |
| Flat "probe at DDT − 4" | **Room-temperature dependent first, batch size second.** 0.2 °F toward DDT per °F the room is below 70 — a constant. At a 70 °F room: DDT − 2.8 / 3.2 / 3.5 at 3 / 6 / 9 balls. §4.6 |
| Indexing a variable on its minor axis | The probe **gap below DDT** was re-tabulated by **batch size** (moves it 0.7 °F) while holding **room** fixed (moves it 4.8). The gap and the target are different quantities: the target also moves with the DDT band, so 3→9 balls shifts the target 1.7 °F. Correct at room 70, 1.6 °F wrong in a 62 °F kitchen. Ask which axis moves a figure most before choosing what to index it by |
| A thickness target called "the classic Neapolitan band" | **Unsourced.** 0.083 was 265 g on a 12-inch stone, rounded. No authoritative Neapolitan thickness factor exists; the reference is now the default ball on the full stone, and the constant is gone |
| Presenting a derived identity as a finding | "265 g fills the stone at the target to within a gram" was circular — the target had been defined from 265 g. **Before calling something a coincidence, check it isn't a definition** |
| Rewriting a section with anchored edits at each end | **Anchors replace what they match and keep everything between.** §4.9 got a new top and a new bottom while the retracted table and the circular claim survived in the middle. Rewrite a section header-to-header, then sweep every document for the retracted figures |
| Tabulating a difference against one of its terms | The shaped rise depends on `T_actual − DDT`, and every table keyed it on `T_actual`, silently assuming DDT 75 — **one row off at every 9-ball bake**. The probe gap had the same shape. Key a table on the variable the formula actually takes |
| Worded claims the gate can't see | **The gate checks arithmetic, not sourcing.** A claim with no digit passes by construction — "the cool end of the Neapolitan band" was unsourced *and* misframed (DDT follows the schedule, not the style). Sourcing stays a human read, and the dangerous claims are the ones phrased without numbers |
| Fixing the copy you're looking at | The unsourced thickness claim was fixed twice in the spec and never in the recipe — **where it originated** — and a fourth copy was live in component copy that no document sweep could reach. Find where a figure was first written **and every place it was copied to**, which takes both a document sweep and a code grep |
| When to show the "thicker than default" note | **From 10%, Dave's call** from experience — `THICKER_NOTE_MIN_PERCENT`. Earlier it fired from 1%, which was only a floor against printing "0%". A user's judgment is a legitimate source; label it as theirs rather than as a standard |
| Deciding when to show prose on unrounded values | **Decide display on displayed values.** A block that fires on 12.02 > 12 then prints "12.0 rather than 12.0" |
| Repeating a status claim without checking it | **The deploy was never broken.** Six rounds of "nothing since MESSAGE-4 is live" — and troubleshooting advice for it — rested on one stale note nobody verified. A status claim is a figure too: check it before restating it |
| Static numeric tables in §8 step content | **Bind a token or state a constant rule.** The `mix-4` step's probe table was fixed in §4.6 and never in the step — the app rendered the stale values for eight rounds while every test passed, because nothing compares prose to the engine |
| Quoting 0.75/0.86/1.08 °F/min (**by dial: 15/20/30**) against a thermometer | Those are **dough-only.** Multiply by `Ct/(Ct + C_bowl)`, which is **by balls per mix**: 0.82 / 0.90 / 0.93 at 3/6/9. At dial 30 that gives an observed **0.89 / 0.97 / 1.01**. ⚠️ Two different indices — don't read the triples as answering each other. §4.6 |
| "Required water spans 52–90 °F" | **53–109 °F.** Hottest at *small mixes*, not small batches, and not monotonic — 12 balls (two 6-ball mixes) wants hotter water than 9 |
| Biga-temp default of 64 °F | **58 °F**, the one measured value. Most leveraged input in the model |
| "The bowl matters for its mass, not its temperature" | Half right. `C_bowl/TOT` (dough) is small; `C_bowl/Cw` (water) is 3× larger — 0.66 °F per °F at 3 balls. **Measure the bowl** |
| `T_bowl = T_biga` treated as settled | Holds through fermentation, **breaks at tearing** — biga gained 5 °F, bowl didn't. Bake 1's Phase C rate climb is the evidence |
| Thermal weights from batch totals | **Per-mix.** A 12-ball batch is a 6-ball system twice; the bowl faces one mix at a time. At 12 balls batch totals land the water **2.0–5.3 °F low across the envelope** (2.6 at defaults). Ball weight is the axis that takes it past 5 — a range quoted at 265 g only stops at 4.8 |
| One water temperature per batch | **One per mix** when `nMix > 1` — mix 2's bowl is warm from mix 1 |
| Bowl-share / dilution tables keyed on batch size | **Keyed on balls per mix.** 12 balls reads the 6 row, 18 reads the 9. The floor is set by the 2500 g mixer cap (~6.6%), not by any row — 6.8% is the 9 × 265 g mix |
| Split-batch overhead 28.4 h | **28.12 h.** The stagger correction shortens a real stage, so it comes back out. 28.42 is `nMix = 3` |
| Claiming step content says something | **Check §8.** Two MESSAGE-4 claims about `mix-1` and `bulk-3` were false; the agent couldn't build to them |
| Batch totals on per-mix or per-biga steps | `{freshFlour}` on `mix-1`, `{bigaFlour}` on `biga-1`. Two rounds, two instances — check every step value against its scope |
| Deriving a figure from a displayed value | **Round once, at the end** — and this applies to the constants file, not just derived tables. `divideBall = 0.33` instead of `20/60` was the real cause of the 28.41/28.42 split |
| Bare tokens in step prose | **Scope goes in the name:** `PerMix`, `PerBiga`, or bare for a batch total. Three bugs in three rounds, worst was 423.2 g of water into a 211.6 g mix |
| Expressions in `{tokens}` | **Bare identifiers only.** Anything evaluated in §8 prose is a code-execution surface that grows by accretion |
| Assuming everything went per-mix | **`DDT` did not.** It keys to TOTAL balls, because the band is about bulk cooling and the doughs are bulked together |
| Quoting a rendered number without its conditions | Vectors pin flour at 69 °F; the app defaults it to room (70). **Every water target renders 0.39 °F below its vector value.** Both are correct; a number without conditions is not |
| Two sensitivity figures in one sentence | **Name the basis.** `Cb/Cw` = 1.59 (bowl held, scale-invariant) and `(Cb+C_bowl)/Cw` = 1.81–2.32 (bowl tracking) are both correct and are not a range |
| Verifying a list by its contents | **Order is the meaning** in a procedure or a schedule. Count, labels and suppression were all correct while the step order was wrong for four rounds. Assert a golden sequence |
| Hardcoding a value derivable from the formula constants | **Derive it.** ADY, `divideBall`, and the 0.392 flour offset were all the same shape — correct today, silently wrong the first time the formula moves |
| Editorial notes inside §8.2 | **§8.2 is content only.** Guidance about content goes in the section that governs it — inline notes are a parse hazard and mix spec voice into verbatim output |
| "The floor is set by the largest batch" | Set by the **2500 g mixer cap**. A split batch gets closer to it than any unsplit one |
| `mix` a flat 0.5 h | **Scales with nMix**, +5 min changeover. Bowl is not cleaned between mixes; residue is thermally neutral and the yield cancels in the shared bulk tub |

---

## Key formulas

```
C_bowl = bowlMassG × 0.12                    // 115.8 at 965 g
Ct     = Cb + Cf + Cw + Cs                   // dough only, and PER MIX —
                                             // masses ÷ nMix. A 12-ball batch
                                             // is a 6-ball thermal system twice.
TOT    = Ct + C_bowl

T_water = (DDT × TOT − FF × Ct
           − Cb×T_biga − Cf×T_flour − Cs×T_room − C_bowl×T_bowl) / Cw

probeTarget = DDT − 0.33 × FF × (Ct/TOT) + 0.2 × (DDT − T_room)
              // NO flat "DDT − 4" shorthand. It is 1.2 °F wrong at 3 balls.

observedRate  = doughOnlyRate × (Ct/TOT)
                //   doughOnlyRate  0.75 / 0.86 / 1.08   BY DIAL 15/20/30
                //   Ct/TOT         0.821/0.901/0.932    BY BALLS PER MIX 3/6/9
                //   product at dial 30: observed 0.89 / 0.97 / 1.01
adyOfBigaFlour = 0.01 × 0.30 × 1.25 = 0.00375

d(T_water)/d(T_biga) = Cb/Cw                 // 1.59, bowl held, scale-invariant
                     = (Cb + C_bowl)/Cw      // 1.81–2.32, bowl tracking
                     // NOT a range. Two bases. Which applies depends on whether
                     // the bowl moves with the biga (it does during the temper).

roomMin = clamp((90 + 150)/f − 150, 45, 180)   where f = 2^((T_actual − DDT)/17)
```

⚠️ **FF is the rise in the DOUGH ALONE.** The work term is `FF × Ct`, never `FF × TOT`. Reversing it returns a plausible-looking water temperature several degrees wrong. `T_bowl` defaults to `T_biga`.

⚠️ **Dough-only and observed are different quantities, and conflating them is the live failure mode.** FF and the per-minute friction rates are dough-only; a thermometer reads dough-plus-bowl. Multiply by `Ct/(Ct + C_bowl)` before comparing any of them to a measurement. This one mistake produced the `DDT − 4` rule and the overstated Phase C authority figures, in two documents, undetected across several rounds of review.
