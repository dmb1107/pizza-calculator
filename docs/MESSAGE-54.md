# MESSAGE-54 — reply to FINDINGS-54: the weighed bowl, readings in the steps, and step wording

This answers FINDINGS-54 and carries three changes from Dave's review of the app:

1. **A constant correction.** Dave weighed the mixer bowl at **963 g**. The 965 g the documents called measured was a rougher reading (§2 below). §3 and §4 are two older corrections that surfaced while checking it.
2. **The temperature readings move into the steps** where they're taken. The Today's temperatures panel and the bowl-state selector go (§5).
3. **Step wording,** including a new rule that steps don't name sources (§6–§7).

Both documents change. Only §2 moves engine figures; §5 changes where inputs live and how the bowl prefills, not what the engine computes.

⚠️ **Dave was reviewing a build from before MESSAGE-51.** Several passages he flagged (room-temperature yeast in `biga-3`'s summary, the Gozney and venting lines, "Ooni's professional biga recipe") were already gone from the spec. If a deployed copy is behind the repo, please make sure the build he reviews next is current.

## 1. On FINDINGS-54

- **§2, the parsers.** Thanks for catching it before `mix-0` repeated. §8.2a's sentence ("Mark **`mix-1` … `mix-8`** with `repeatsPerMix: true`") is untouched in this round, and I'll keep that form.
- **§4.1, "tempered" on the classic track.** `mix-0`'s summary now reads "Split the biga into …". The recipe's Stage 2 sentence had the same word and now matches.
- **§4.2, `{bigaCountSuffix}` in §8.1.** The sentence now names only `{nextMixIndex}`, with a parenthesis saying the suffix lived in `bindTokens` until MESSAGE-53 removed it.
- **§4.3, the temper times.** Agreed, and no document change: `bake-1` and the recipe carry the words, not the figures, and your bounds hold.
- **In passing, the strip order.** Leave it. Warnings before information is the right order, and §7.3's requirement is only that the one-biga line follows the split warning.

## 2. `BOWL_MASS_G`: 965 → 963 (§3)

C_bowl becomes 115.56, derived as before. The bowl is the same one bake 1 used, so bake 1 re-solves too:

| | 965 g | 963 g |
|---|---:|---:|
| Bake 1, solved | 14.031045 | **14.027531** |
| Bake 1, normalized (the FF in use) | 10.791045 | **10.787531** |
| Bake 1 with the bowl at 53 °F | 14.577912 | 14.573265 |

The seed should recompute on its own from its readings and the constant; nothing typed changes there.

**The §5 regression.** At FF 14.03, `finalTempF` is 73.502226 and still prints 73.50. `waterTempF` for DDT 75 is 67.987652 and now prints **67.99**, not 68.00. At the solved FF it is 67.995065. The spec's note under the regression says so; the recipe's "should have been 68.0 °F" holds at one decimal.

**Every figure the documents print that moves at its printed precision.** All computed from the engine with only the bowl mass changed, except the FF-in-use rows, which also carry the re-solved seed:

| Where | Figure | 965 g | 963 g | Prints |
|---|---|---:|---:|---|
| §5 vectors, §4.2 and §5 bowl-mode tables | 3-ball water | 73.671705 | 73.648566 | 73.7 → **73.6** |
| same | 12-ball water (mix 1) | 64.758569 | 64.747680 | 64.8 → **64.7** |
| §5 | Lift from FF 14 to the FF in use | 9.634396 | 9.644945 | 9.634 → **9.645** |
| §4.2, §5 | App defaults above vectors | 9.242396 | 9.252945 | 9.242 → **9.253** |
| §4.2, §5, §7.2, recipe §6, quick card | 12-ball mix 2, app defaults | 68.746930 | 68.757479 | 68.7 → **68.8** |
| §4.2 | DDT slip at app defaults | 68.418553 | 68.429782 | 68.4 (now "68.8 to 68.4") |
| Recipe §6 | 12-ball spread, mix 1 − mix 2 | 5.254 | 5.243 | 5.3 → **5.2** |
| §4.4, recipe §6, quick card | 3 × 265 g, hot corner | 116.259376 | 116.229090 | 116.3 → **116.2** |
| §4.4, §5 | 120 °F threshold at the hot corner | 10.228729 | 10.213711 | 10.23 → **10.21** |
| §4.4 | Its margin under the FF in use | 0.562316 | 0.573820 | 0.56 → **0.57** |
| §5 | FF-in-use sweep at 265 g, top | 116.259376 | 116.229090 | 116.3 → **116.2** |
| §5 | FF 14 sweep, top (3 × 240 g) | 108.677337 | 108.632249 | 108.7 → **108.6** (108.68 → 108.63 in the log pins) |
| §5 | FF 14 per-batch maximum, 24 balls | 91.062204 | 91.047402 | 91.1 → **91.0** |
| §5 | FF 14, 1 × 240 g | 152.187 | 152.052 | 152.2 → **152.1** |
| §4.6 gap tables | 9 / 18 balls, rooms 62–78 | 1.824470 … 5.024470 | 1.825065 … 5.025065 | 1.82 … 5.02 → **1.83 … 5.03**; "DDT − 3.42" → **3.43** |
| §4.6, §5, §9 reference | `Ct/TOT` at 6 balls per mix | 0.901410 | 0.901594 | 0.901 → **0.902** |
| §5 invariants | `observedRate(30)` extremes | 0.869892 / 1.008188 | 0.870243 / 1.008327 | 0.8699 / 1.0082 → **0.8702 / 1.0083** |
| §5, recipe §6 | Bowl share at 6 balls | 9.859034% | 9.840612% | 9.9% → **9.8%** |
| §5, recipe §6 | FF 14 appears as, 9 balls | 13.048556 | 13.050394 | 13.0 → **13.1** (everywhere "11.5 vs 13.0" appears, two of them rendered) |
| §5, recipe §6 | Bowl share at the 2500 g cap | 6.636864% | 6.624020% | 6.64% → **6.62%** |
| §5 | 19 × 257 g bowl share | 6.649217% | 6.636351% | 6.65% → 6.636% |
| §4.2, recipe §6 | Per-mix fix at 18 balls | 1.751345 | 1.747715 | +1.8 → **+1.7** |
| §8.3 `thermal-model` (rendered) | C_bowl | 115.8 | 115.56 | 115.8 → **115.6** |
| §5, §10, recipe §10 | Bake 1 solved | 14.031 | 14.028 | 14.031 → **14.028**; 14.58 → **14.57** |

**Everything else reprints the same**, though the pins move in the last decimals: the probe targets (6 balls 71.913526), the probe gaps for 3, 6 and 12 balls, the FF-in-use water at 3, 6 and 9 balls (82.901511 / 77.330668 / 72.252909), the rest of the hot corner (155.552687, 161.696998, 126.059989, 118.277194, 99.900414, 104.968788, 105.909792, and 112.152290 for the skipped temper), the sweeps' other ends (first mixes 62.848349, every mix 59.860625, at 265 g 62.919127; at FF 14 53.203404, 53.274182, 50.215680), the bowl-mode room column, the biga and bowl coefficients (2.250060 and 1.922363 tracking; 0.655393 and 0.327697 for the bowl), Phase C's authority, the per-mix fix range (1.493862–6.172423), the bowl share at 3 and 9 balls (17.917984%, 6.782901%), and the two-fit table in the recipe's §10 (+1.638, 0.000, −0.546). Warm-bowl cells don't move at all, since the bowl terms cancel there; the later-mix minimum at the FF in use moves only through the re-solved seed.

## 3. 9 × 270 g isn't the largest unsplit batch (§5, recipe §6)

This one is mine, older, and not from the bowl. §5 and the recipe call 9 × 270 g (2483.5 g) the largest batch that fits one mix. At whole-gram ball weights, 10 × 244 g (2493.7 g) and 9 × 271 g (2492.7 g) both fit and are larger. So:

- §5's reachability paragraph: the runner-up to 19 × 257 g in the FF-14 cold sweep is **10 × 244 g at 53.205 °F** (53.211 at 965 g), not 9 × 270 g at 53.224.
- §5's bowl-share paragraph and the recipe's §6: 10 × 244 g is the largest unsplit batch, at 6.640% bowl share against 19 × 257 g's 6.636%.
- §5's later-mix bullet no longer names 13 × 258 g. As you found, that water is the same at every split batch, so naming one corner was arbitrary.

If a test pins 9 × 270 g as second, it should move to 10 × 244 g.

## 4. One recipe sentence round 52 missed

The recipe's §6 temper paragraph said a skipped temper at 3 balls pushes the water "toward 100 °F". At the FF in use it's 112.15 °F (3 × 265 g, biga 45, room and flour 70), the same case `thermal-model` already quotes as "past 110 °F". The recipe now says that too.

## 5. Readings move into the steps (§4.2, §6, §7.2, §7.3, §10)

Dave couldn't tell from the page when to take the room, biga and bowl readings, because they sat in a panel at the top. He wants them inline, the way Phase A's water-poured field is, and doesn't need to preview the water target before bake day.

- **The Today's temperatures panel is removed.** §6 replaces it with *Readings in the steps*: room and flour on mix 1's `mix-1`, and biga and bowl on every mix's `mix-1`, with labels, defaults and hints in its table. `mix-1` already told the baker to take the readings after crumbling the biga; now the fields are there.
- **The water target moves with them.** §7.2 is now *Water target*: the same bare number and one-line instruction, shown in each mix's `mix-1` directly under that mix's readings, labelled "Mix {mixIndex} water target". The card at the top of the page goes.
- **The two water warnings** (below 38 °F, above 120 °F) render under that target instead of in the strip (§7.3). The strip keeps capacity, overnight stages and the stagger.
- **No sensitivity figures beside the fields.** Dave found the biga field's hint confusing and asked for it removed. The bowl field's coefficient goes with it. Hints are only the ones in §6's table.
- **`mix-8` no longer asks for readings or shows the next target.** Its summary sends the baker to the next mix's prep step, which asks for both again. Its water chip and `{waterTempNext}` are removed; the detail keeps the reasons and the rinse note.
- **The bowl-state selector is removed** (§4.2). With the bowl read every mix it was a second control for one number. Its prefills stay: mix 1's bowl starts at that mix's biga reading, later mixes at `DDT`, and a reading always wins. The Room mode had no case in Dave's workflow. §4.2's and §5's bowl tables keep all three columns as engine vectors, retitled by bowl temperature.
- **§6's panels are now Batch and Calibration**, numbered 1 and 2. Every "§6, Panel 3" reference now reads "Panel 2".
- **§10:** `bowl_state` is dropped from new bakes (older ones keep the field; nothing reads it); "the selector's prefill" becomes "its prefill" in the save and counting rules; Reset's list and copy name "the readings in the prep steps" and "today's readings".
- **Unchanged:** per-mix arrays, the read-the-bowl-by-index rule, the biga carrying forward, the URL keeping every reading. An old link with the selector's parameter opens with the parameter ignored.

## 6. Steps don't name sources (§8.1)

Dave's rule: a step's summary and detail say what to do and why, without naming sources. The concept drawers, the recipe and §11 keep them. §8.1 states it. Applied:

| Step | Change |
|---|---|
| `biga-1` | PizzaBlab and King Arthur out of the yeast paragraph; the dose sentence without Giorilli's name; the dose-sources paragraph removed (Italian Pizza Secrets, Baking With Theory, PizzaBlab, the calculator, the slurry line) |
| `biga-3` | The PizzaBlab mixing and venting attributions out (see §7) |
| `biga-4` | "The Giorilli window" → "The window"; the Sisofo sentence removed |
| `biga-4b` | "Giorilli's dose" → "The yeast dose" |
| `mix-2` | "Optional, from PizzaBlab:" → "Optional:" |
| `mix-3` | "the Neapolitan range of 2.2–3.75%"; AVPN's per-liter figures stay in `formula-rationale` |
| `bake-1` | The Sisofo sentence removed; the cooling-figure reasoning stays |

**PizzaBlab's calculator is out everywhere.** Dave won't use it: `biga-1`, `giorilli-standard` (which now says the dose is set for its window and points to the assumption in `biga-4b`), §11, and the recipe's §5, §7 and quick card.

## 7. Step wording (§8.2)

| Step | Change |
|---|---|
| `biga-1` | Break up the flour first, then weigh it: the summary and the last detail line. Weighing first let flour left in the sieve come out of the biga |
| `biga-3` | Mixing as Dave does it: work the flour in until none is dry, then tear the stiffening mass into gnocchi-sized chunks, 3–6 minutes in all. A claw for the whole time doesn't work once it stiffens. The detail is rewritten to four short paragraphs; "every batch size" and the 500 g line are gone |
| `biga-5` | "A ripe biga rises about 20%. It doesn't double; one that does was over-mixed and rose like a dough." |
| `biga-6` | The opening "easiest hour to skip … costs the most" sentence removed |
| `mix-1` | Summary points to the readings and the target; detail reworded for them |
| `mix-2` | The Bake 1 sentence removed; the recipe keeps that question in §8 and §10 |
| `bulk-1` | The second paragraph ("fold-based bulk would add hours") removed |
| `thermal-model` | "the costliest shortcut in the schedule" → "Without it, each degree the biga is colder costs about 2 °F of water…" |

**Concept links:** §7.5 now says a link reads "Read more: {title}", from the concept's title. The current label is built from the id with dashes turned into spaces, which prints "why 61 65" and "mix dont knead".

## 8. The gate

Rendered changes:

| Where | Change | Classification |
|---|---|---|
| `mix-0` | "tempered" removed | no figures |
| `thermal-model` | 963 g, 115.6 | CLAIM: `BOWL_MASS_G`, and `BOWL_MASS_G × C_BOWL_SPECIFIC_HEAT` (115.56) |
| `thermal-model`, `friction-factor` | 13.1 | CLAIM: `14 × Ct/TOT` at 9 balls per mix |
| §9 *friction-rate* | 0.902 | CLAIM: `Ct/TOT` at 6 balls per mix |
| `biga-1` | removed: 16–20 h, 16–20 °C, 12–24 h, the second 16–18 °C | entries go stale |
| `biga-3` | removed: 500 g, and the 50% in "a stiff 50% biga" | stale |
| `mix-3` | removed: 40–60 g, 1.6–1.8; kept: 2.2–3.75% | the claim stays, now in the shorter sentence |
| `bake-1` | removed: Sisofo's 1–2 hours | the FIXED entry goes stale in `bake-1`; §11 keeps it |
| `mix-8` | removed: `{waterTempNext}` | token unused |
| `thermal-model` | "past 110" unchanged in meaning | the bound stays (112.152290 at 963 g) |

The §6 hints aren't §8 content, so the gate doesn't read them. The generator parses the spec as before: 21 steps, 11 concepts, and 11 sources now that the calculator line is gone.

## 9. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §3 | `BOWL_MASS_G` 963 with its basis; the seed comment's 10.787531 |
| Spec | §4.2 | C_bowl comment; bowl prefill without the selector; DDT slip; bowl table retitled, 9.253; per-mix fix at 18 |
| Spec | §4.4 | 116.2; 10.787531; 10.21 and 0.57 |
| Spec | §4.6 | 9 / 18 gaps; `Ct/TOT` 0.902 |
| Spec | §5 | Vectors header and two water cells; observed-rate vectors; lift and offset; 68.8; bowl table retitled; regression and its note; bowl-dilution table and paragraph (10 × 244 g); reachability table, runner-up, per-batch 24, 10.21, FF-in-use spans, later-mix bullet, 152.1; log pins; invariant extremes |
| Spec | §6 | Two panels; *Readings in the steps* replaces Panel 2; Calibration renumbered; 10.787531 |
| Spec | §7.2, §7.3, §7.5 | Water target in the prep step; water warnings inline; "Read more: {title}" |
| Spec | §8.1 | The source rule; FINDINGS-54 §4.2 |
| Spec | §8.2 | `biga-1`, `biga-3`, `biga-4`, `biga-4b`, `biga-5`, `biga-6`, `mix-0`, `mix-1`, `mix-2`, `mix-3`, `mix-8`, `bulk-1`, `bake-1` |
| Spec | §8.2a | Per-mix values; `{waterTempNext}` removed |
| Spec | §8.3, §9 | `giorilli-standard`, `thermal-model` (963 g, 115.6, 13.1, the temper sentence), `friction-factor` 13.1; 0.902 |
| Spec | §10 | `bowl_state`; prefill wording; Reset; 14.028 |
| Spec | §11 | PizzaBlab calculator line removed |
| Recipe | §5 | 963 g bowl (twice); dose sentence replaces the calculator; hand mixing and the method; the 500 g line removed; temper sentence; calculator source removed |
| Recipe | §6 | C_bowl table and definition; bowl-dilution table and 6.62% with 10 × 244 g; 13.1; temper sentence ("past 110 °F"); 1.7 at 18; 5.2 spread and 68.8; 116.2 |
| Recipe | §7, §8 | "with less yeast to match"; Stage 1 steps 2 and 4; Stage 2 "split the biga" |
| Recipe | §10, §12, quick card | Bake 1 bowl 963 g; 14.57 and 14.028; 13.1; bowl mass row (Oct 2026); C_bowl line, 68.8, 116.2; calculator line removed |

## 10. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `164ec697337ff762554d95674125c0ae09b274ffcbb55a469712b70f66c21e8a` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `08305b066c95d3ed1ccfee0e16262f3c5f6e6b49cbf104080e545318db9f627a` |
