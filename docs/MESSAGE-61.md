# MESSAGE-61 — reply to FINDINGS-61: each dough on its own clock, ball counts that split evenly, and DDT by balls per mix

This answers FINDINGS-61 and carries three changes Dave has approved. They go together, because the second and third follow from the first:

- **C2: each dough runs on its own clock.** Every mix goes into its own container. It bulks from the end of its own mix and is divided by its own weight; it rises from its own final reading and goes into the fridge when that rise ends. The stagger correction goes. The timeline plans from the last dough, and `bulk-1`, `bulk-2` and `bulk-3` carry one timer per dough.
- **C2d: ball counts split evenly between the mixes.** Each dough has to make whole balls, so counts that don't divide by `nMix` can't be entered.
- **C3: `DDT` goes by balls per mix.** It is set by how fast the dough in the bulk container sheds heat, and each container now holds one mix. A 12-ball batch gets 75, like a 6-ball one.

This round changes behaviour, not just copy. The engine, the timeline, the input rules and several sweeps change, and §8 below lists the code we expect.

## 1. On FINDINGS-61

- **Reproduced.** Your §2 table, line by line, including 7.453420 at the new references and both history pins at the old ones.
- **§5, "twice as slowly".** Accepted, and you were right: 2.5 h is twice the slow end of the tray's estimate. I get 2.19 h, 68.0 minutes at DDT and 47.8 °F after 3 h, against your 68.1; the difference is the integration step. §4.8 now gives 2.2–2.5 h and 68–78 minutes, and the open test reads "about 48–50 °F means roughly twice as slow". Recipe §12 Tier 2 says the same.
- **The concept links, `ConceptLink` and the reachability test.** Thank you. The third test, which checks that each page link is actually rendered where §8.3 puts it, is the one I'd have missed.

## 2. C2: each dough on its own clock

**Why.** Since bake 3 Dave bulks each mix in its own container. The documents still model one shared tub: the bulk clocked from the last mix, half the stagger taken off the rise, and `T_actual` as the mean of the mixes. None of that matches what he does. On 7 Nov the app couldn't give him per-dough rises, so I worked them out for him (93 and 88 minutes).

**The behaviour (§4.8, *Split batches: each dough on its own clock*):**
- **Each dough runs on its own clock.** Its bulk starts at the end of its own mix, and its divide when its bulk ends. Its rise comes from its own final reading through `roomMin`, and its balls go into the fridge when that rise ends. A dough not yet read plans at `DDT`. Nothing is shortened to make up for the gap between the mixes.
- **The timeline plans from the last dough.** `bulkRest`, `divideBall` and `ballRoomTemp` are the last dough's, and `coldFerment` runs from the last dough into the fridge.
  - `divideBall` now scales with balls **per mix**: the last dough divides only its own (§4.7).
  - The bulk and rise rows print each earlier dough's end time beside them, for example "Bulk rest — ends 11:05 (dough 1 10:30)" (§7.4). Dave sets phone timers from those.
  - The earlier doughs get 35 minutes more cold per mix ahead. That's worth about 8 minutes at DDT in a 38.5 °F fridge, and it isn't corrected.
- **What goes:** `stagger`, `staggerUncentred`, the stagger strip, `bulk-1`'s stagger warning, and the tokens `{ballRoomMin}`, `{staggerMinutes}`, `{staggerHalfMinutes}` and `{staggerUncentred}`. `CHANGEOVER` stays in `mix`, and an error in it now moves only the schedule.
- **At `nMix = 3`, dough 1's bulk ends about when mix 3 does:** 90 against 100 minutes on the planning basis, 84 against 82 on nominal phase times. The baker divides it once the mix is out. Not modelled.

**One timer per dough (§7.5).** At `nMix > 1`, `bulk-1`, `bulk-2` and `bulk-3` each carry one timer per dough, labelled *Dough 1*, *Dough 2* … in mix order. The three steps are pinned by id, like `mix-6`, so there is no new marker in §8.
- `bulk-1` and `bulk-2` time their printed ranges.
- `bulk-3`'s timer label is `{roomMin} min`, and inside each dough's timer `{roomMin}` binds that dough's rise, as `{mixIndex}` binds per instance.
- Each timer keeps its own state, and starting one moves nothing above the tap.
- At `nMix = 1` nothing changes.

Dave's call: he times these stages on his phone, and wants the app's timers there for consistency.

**New tokens (§4.10):**
- **`{ballsPerMix}`:** `balls ÷ nMix`, always a whole number now.
- **`{riseByDough}`:** "90 min" at one mix, "101 min for dough 1 and 90 for dough 2" at two, and "…, 88 for dough 2 and 85 for dough 3" at three.
- **`{finalDoughTemp}`:** at `nMix > 1` it prints each dough's reading in mix order ("73.0 and 75.0") in place of the mean.

**The leftover dough in the bowl (§4.2, `mix-8`).** It still doesn't move the next water target. With separate containers it moves a few grams forward: the first dough comes out slightly light and the next slightly heavy, and each dough is divided by its own weight. Dave confirmed that's how he divides already; he isn't concerned about the few grams.

**Copy-as-text** (`recipeText.ts`) needs the same per-dough rises; the gate doesn't read it.

## 3. C2d: ball counts split evenly between the mixes

**Why.** With separate doughs, 13 balls in two mixes would leave each dough making 6½. Dave's call: those counts aren't possible in the app; "if I'm making that many doughs then making one extra is no big deal".

**The rule (§6, Panel 1):**
- **A count is allowed when `nMix` divides it.** `nMix` is computed as before.
  - At 265 g, 11, 13, 15, 17, 19, 20, 22 and 23 go.
  - At 272 g and above, 9 goes too: it would be two mixes of 4½.
- **The stepper skips a disallowed count** in the direction of the step. At 265 g, up from 18 goes to 21, and down from 21 goes to 18.
- **Anything else that lands on a disallowed count rounds up** to the next allowed one: a change of ball weight, a link or a stored value. 24 is allowed at every weight from 240 to 300 g, so rounding up always ends.
- **Copy** (rendered, Dave's wording):
  - The split hint beside the field becomes "→ {nMix} mixes of {ballsPerMix} balls ({doughPerMix} g each)".
  - When the app raises the count it shows "Raised to {balls} balls so each mix makes whole balls."

**Every mix size is now a whole number**, so §6 Panel 2 prints a mix size as a whole number. A bake logged before this round could carry a fractional size; print that with ½, ⅓ or ⅔ as before. Dave's log holds only 6-ball mixes. One §5 pin changes: the interpolation vector is now at 6 balls per mix (**11.6**), in place of 6.5 (11.7), which can't occur.

**Sweeps over the allowed counts.** Several pinned extremes sat at counts that now go. I reproduced every current figure first, from today's rules, then re-swept 3–24 balls × 240–300 g over the allowed counts with `DDT` per mix:

| Figure | Was | Now |
|---|---|---|
| §4.2, the batch-total error at 12 / 18 balls (biga 58) | +2.6 / +1.7 °F | **+2.8** / +1.7 °F |
| §4.2, its range across the envelope | 1.5 °F (19 × 257, biga 60) to 6.2 °F (9 × 272; ties 17 × 288, 18 × 272) | **1.5 °F (20 × 244, biga 60) to 6.4 °F (18 × 272, three 6-ball mixes, biga 45)** |
| §4.4, 10 × 265 g at the hot corner, seed FF | 105.0 °F | **108.4 °F** (`DDT` 75) |
| §4.4, the hottest split batch | 105.9 °F at 9 × 272 g | **109.3 °F at 10 × 245 g**, two 1252 g mixes |
| §4.4 / §5, the coldest first mix at the seed FF | 62.8 °F (19 × 257) | **62.9 °F** (10 × 244; the value is 62.850) |
| §5, the coldest first mix at FF 14 | 53.2 °F at 19 × 257 g | **53.2 °F at 10 × 244 g** (53.205), tied by 20 × 244 g |
| §5, later mixes, biga 60, room 84 | 50.2 / 59.9 °F at any split | 50.2 / 59.9 at 7+ balls per mix; **53.2 / 62.9** at ≤6, where `DDT` is 75 |
| §5, the bowl's share floor | 19 × 257 g, 6.636% | 10 × 244 g, 6.640%; no split batch passes it |
| §7.3, near-limit counts across 240–300 g, beyond 9 and 18 | 8, 10, 16, 17, 19, 20, 24 | **8, 10, 16, 20, 24** |
| §7.3, the smallest split mix | 1250.9 g (9 × 272) | **1252.0 g** (10 × 245) |

These don't move: the 3-ball and 3 × 240 g maxima, 108.6 / 118.3 °F, the 120 °F threshold at FF 10.21, `observedRate`'s 0.8702–1.0083, and the maxima at 265 g except 12.

## 4. C3: `DDT` by balls per mix

**The rule (§4.2, §4.3, §6).** `DDT` is 75 at 6 or fewer balls per mix and 74 at 7 or more. Because counts now split evenly, every mix of a batch has the same `DDT`. Use it for the target, the probe's `0.2 × (DDT − T_room)` term, the later-mix bowl prefill and the rise. The batch-`DDT` subsection is rewritten.

**What moves:**
- **At 265 g:** 10 and 12 balls go to 75. Every other allowed count stays where it was.
- **At 272 g and above:** 18 balls runs as three 6-ball mixes and goes to 75 too.
- **A 12-ball batch now matches a 6-ball one in every per-mix figure:**
  - §5's vector row reads `DDT` 75, water **68.1** and probe **71.9** (was 74, 64.7, 70.7).
  - The bowl-temperature tables' 12 row is 68.1 / 64.1 / 62.5.
  - The probe tables merge the 12 row into the 6 row.
  - §4.6's list reads 12 → 71.9.
  - §5's per-batch maxima at 265 g read 12 → 96.8.
  - §5's mix-2 example is 62.507 at vector conditions and 71.760 at app defaults with the seed FF.
  - §7.2's targets are 77.3 and 71.8 at app defaults with the seed FF, and 81.4 and 75.8 at the 9.447610 bakes 2 and 3 give.
- **The log, every FF and the counting rules don't move.** The solve reads the final temperature, not `DDT`.

## 5. Rendered copy

**`mix-0`**, first paragraph, last sentence:
> … Weighing during the changeover stretches it to fifteen or twenty minutes, and every extra five minutes moves the later mixes, and everything after them, five minutes later.

**`mix-8`:**
- Summary: "Turn mix {mixIndex} out into its own lightly oiled container and start its timer under *Bulk rest*. **Don't clean the bowl.** Then start mix {nextMixIndex}; its prep step asks for the biga and bowl again."
- Detail, first paragraph:
  > Leave the residue in the bowl; cleaning costs time and gains nothing. The dough stuck to it is already at your target temperature, so it doesn't change the next water target, which is the same with 0 g or 60 g left behind. Whatever carries over goes into the next dough, so this one comes out a few grams lighter, and each dough is divided by its own weight (*Divide and ball*). Only what's left after the last mix leaves the batch, and the 2.2% overage covers it.

**`bulk-1`**: the split-batch detail is replaced, and the stagger warning goes.
> **Each dough bulks in its own container, from the end of its own mix.** Start a dough's timer when you turn it out at the changeover, and the last one's when its mix ends. The earlier doughs run ahead of the last on the clock, and each still gets its own 45–60 minutes.

**`bulk-2`:**
- Summary: "Weigh the dough and divide it into {ballsPerMix} equal pieces. Pre-round, rest 10–15 min, then ball tight."
- New detail, shown only when `nMix > 1`:
  > **Divide each dough on its own as its bulk ends.** Whatever a mix left in the bowl went into the next dough, so the first dough's balls can come out a few grams lighter than the last's.

**`bulk-3`:**
- Summary: "… Put the lids on and leave them at room temperature for **{riseByDough}**, set by how far the final dough temperature is from DDT."
- `**timer:** {roomMin} min`
- `**values:** Room time: {riseByDough} (final dough {finalDoughTemp} °F against DDT {ddt} °F)`
- Detail when `nMix > 1`, replacing both paragraphs:
  > **Each dough's rise follows its own final temperature**, so a dough that finished warmer rests less. Start each dough's timer when its last ball goes into its container, and put that dough's balls in the fridge when its timer ends.

**§6 Panel 1** (the field's copy):
- "→ {nMix} mixes of {ballsPerMix} balls ({doughPerMix} g each)"
- "Raised to {balls} balls so each mix makes whole balls."

**Your copy to sweep:**
- the timeline stage text for bulk and rise at `nMix > 1`;
- `recipeText.ts`;
- the Calibration panel's DDT override hint, if it states the old ball rule.

## 6. The gate and tests

I put both documents into a scratch clone of `main` at `dcefb0e`.

**One grammar change first.** §7.3's *The stagger warning appears twice* section is gone. `generate-content.py` (line 291) and `steps.test.ts` (line 427) both end the capacity section at that heading. I replaced it with *Placing guidance about step content* and pointed both at the new heading in my scratch copy. Please do the same, or anchor on something sturdier.

With that change:
- 21 steps, 11 concepts and 11 sources;
- `steps.ts` and `capacity.ts` change, and `warningWhen` is now empty;
- 741 of 752 tests pass.

All 11 failures follow from this round, and none of them comes from the engine, since my copy has none of the code changes:

| Test | Why |
|---|---|
| `bindTokens.test.ts` ×4 | `{ballsPerMix}` and `{riseByDough}` are new; `{ballRoomMin}` and the three stagger tokens are gone |
| `bindTokens.test.ts`, "states both of bulk-3's rises" | That sentence is replaced |
| `capacity.test.ts`, the split hint | Its new wording |
| `contentLiterals.test.ts`: `bulk-1.warningWhen`, `bulk-3.detailWhen` claims, the stale covers | Both blocks are replaced, so their "45-minute" and "45 minutes" claims go |
| `contentLiterals.test.ts`, unclassified | `bulk-1.detailWhen` "45–60 minutes": CLAIM, `PLANNING_RANGE_H.bulkRest` |
| `stageSteps.test.ts`, `bulk-3`'s timer against `ballRoomTemp` | The engine still cuts 17.5 minutes; with C2 they agree again |

**The code this round needs, and the pins it moves:**
- **`DDT` by balls per mix.** Change it everywhere `ddt()` is read. `vectors.ts`'s 12-ball row becomes 75 / 68.1 / 71.9, and every 12-ball probe, bowl-temperature, maxima and target pin moves to the 6-ball value (§4 above).
- **The allowed counts.** The stepper, `applyInput`, the URL codec and stored state, with a test that 24 is allowed at every weight from 240 to 300 g and that round-up always ends.
- **Per-dough rises and timers.**
  - `computeRoomMinutes` per dough, and `T_actual` per dough.
  - The timeline from the last dough, with `divideBall` per mix.
  - The overhead pins: 27.42 h at 12, 27.48 at 18 and 28.04 at 24 (were 27.25, 27.38, 27.79). 3, 6 and 9 don't move.
  - Remove the stagger code and its tests.
  - Per-dough timers on the three steps, keyed per dough.
  - §5's split-batch vector: at 12 × 265 g, finals 73.0 and 75.0 °F give rises of **101** (100.6) and **90** minutes, and the timeline plans 90. With only the first mix read, dough 2 plans at `DDT`: 90.
- **The sweeps in §3's table**, re-run over allowed counts only.

**Tests I'd expect:**
- No disallowed count is reachable through the stepper, a weight change, a link or storage, and each lands where the rule says.
- At 12 × 265 g every per-mix figure equals the 6-ball one: `DDT`, water, probe, bowl prefill and rise.
- `{riseByDough}` and `{finalDoughTemp}` at one, two and three mixes.
- `bulk-3`'s per-dough timers each equal that dough's `roomMin`, and the timeline's `ballRoomTemp` equals the last dough's.
- The timeline shows earlier doughs' end times only at `nMix > 1`.

## 7. Elsewhere in the spec (not rendered)

- **§4.2:** the batch-total error, `DDT` by balls per mix, the leftover dough, and the bowl-temperature table.
- **§4.3:** the `DDT` default.
- **§4.4:** the coldest first mix (62.9), and the split-batch hot corners (108.4, 109.3).
- **§4.6:** the 12-ball probe figures and the gap tables.
- **§4.7:** the `bulkRest` and `divideBall` rows.
- **§4.8:**
  - the open test (FINDINGS-61);
  - the floor at +10.95 °F for every dough;
  - per-dough `T_actual`;
  - the overhead table;
  - the split-batch subsection, rewritten.
- **§4.10:** the tokens.
- **§5:**
  - the vector header and the 12-ball row, the mix-2 example and the bowl vectors;
  - the bowl-share floor, the reachability table and its ⚠️, the 265 g maxima, and the seed sweep;
  - the later-mix bullet, the interpolation vector, the split-batch vector, and the `stagger` paragraph (removed).
- **§6:** Panel 1's ball row and the even-split rule, the `DDT` override row, and Panel 2's mix sizes.
- **§7.2:** the 12-ball targets.
- **§7.3:** the sources, the near-limit counts, the smallest split, and the stagger section.
- **§7.4 and §7.5:** the earlier doughs' times, and one timer per dough.

## 8. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §4.7, §4.8, §4.10, §7.3, §7.4, §7.5, `mix-0`, `mix-8`, `bulk-1`, `bulk-2`, `bulk-3` | C2 |
| Spec | §4.2, §4.4, §5, §6 Panels 1 and 2, §7.3 | C2d, and the sweeps |
| Spec | §4.2, §4.3, §4.6, §5, §6, §7.2 | C3 |
| Spec | §4.8 | FINDINGS-61 §5 |
| Recipe | §3 | C2d: the limits |
| Recipe | §6 (Target DDT, *Why the bowl matters*, split batches, hottest water, cold end) | C2d, C3 |
| Recipe | §7 (the overhead, *Split batches: each dough runs on its own clock*, the residue, the stage table) | C2 |
| Recipe | §8 (the probe text and table, steps 7–9, the floor) | C2, C3 |
| Recipe | Quick card | C2, C2d, C3 |
| Recipe | §12 Tier 2 | FINDINGS-61 §5 |

## 9. Next round

MESSAGE-62: the bowl after the temper (F1). It read 10.5 and 9 °F above the biga on bakes 2 and 3, against the documents' claim that the hour warms them together. Also where the dough rises, with `roomrise.py`'s estimate as the basis.

## 10. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `a5d0f2ef5cefa3d6ccaabab319f4b82d11d883df84e2ba243a686e47bd847f16` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `27848bfabb7f7d399a137c3f33073e4c14857bbb4ca0bc22a09cf3f6e27f70d1` |
