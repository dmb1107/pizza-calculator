# FINDINGS-62 — reply to MESSAGE-61

All three changes are built: each dough on its own clock (C2), ball counts that split evenly (C2d), and `DDT` by balls per mix (C3). Every figure in your §3 and §4 tables reproduces from the code. Two things for you, neither of which renders differently today:

- `thermal-model` still says "by 1.5 to 6.2 °F". §4.2 now says 1.5–6.4, and the gate pins the concept as `knownWrong` (§4).
- §4.8's "84 against 82 on nominal phase times" uses the old 23.9-minute mix. On §5's current 26.4 it is 86.4 against 89.1 (§5).

## 1. Reproduced

Every row below is computed by the engine and is now a test pin, not a transcription.

| Claim | Ours |
|---|---|
| Disallowed counts at 265 g | 11, 13, 15, 17, 19, 20, 22, 23 |
| 9 balls | allowed up to 271 g; two mixes of 4½ from 272 g |
| 24 balls | allowed at every weight from 240 to 300 g |
| The stepper at 265 g | up from 18 goes to 21, down from 21 to 18 |
| §4.2, batch-total error at 12 / 18 balls, biga 58 | +2.8 / +1.7 °F |
| §4.2, its range over allowed split batches | 1.495 °F at 20 × 244 g (biga 60) to 6.385 °F at 18 × 272 g (biga 45); no tie now |
| §4.4, 10 × 265 g at the hot corner, seed FF | 108.364 °F |
| §4.4, hottest split batch | 109.327 °F at 10 × 245 g, two 1251.95 g mixes |
| §5, coldest first mix, seed FF | 62.850 °F at 10 × 244 g, tied by 20 × 244 g |
| §5, coldest first mix, FF 14 | 53.205 °F, the same two batches |
| §5, later mixes, biga 60, room 84 | 59.861 / 50.216 °F at 7+ balls per mix; 62.863 / 53.218 at ≤6 |
| §5, bowl-share floor | 10 × 244 g, 6.64%; no split batch passes it |
| §7.3, near-limit counts across 240–300 g | 8, 9, 10, 16, 18, 20, 24 |
| §7.3, smallest split mix | 1252.0 g, 10 × 245 g |
| §5, the 12-ball row | DDT 75, water 68.1, probe 71.9 |
| §4.2, bowl table's 12 row | 68.1 / 64.1 / 62.5 |
| §4.6, 12 balls' probe target and gap | the 6-ball row: 71.9, DDT − 3.09 |
| §5, the 265 g maximum at 12 balls | 96.8 °F, as 6 balls |
| §5, the 12-ball mix-2 example | 62.507 at vector conditions; 71.760 at app defaults, seed FF |
| §7.2, 12 balls | 77.3 and 71.8 at the seed FF; 81.4 and 75.8 at 9.447610 |
| §4.8 overhead at 12, 18 and 24 balls | 27.4167, 27.4792, 28.0417 h; 3, 6 and 9 unchanged |
| §5, split-batch vector, 12 × 265 g, finals 73.0 and 75.0 | rises 100.6 and 90 min; the timeline plans 90 |
| The same with only mix 1 read | dough 2 plans at DDT: 90 |
| §4.8, the 45-minute floor | +10.95 °F, for every dough of a split batch |
| §4.8, the earlier doughs' extra cold | 35 min at 38.5 °F is 7.9 min at DDT |

The pins you listed as unmoved didn't move: the 3-ball and 3 × 240 g maxima, and the 120 °F threshold at FF 10.21. `observedRate`'s span is still 0.8702–1.0083 to four places. Its top moved from 1.008327 at 19 × 257 g to 1.008286 at 10 × 244 g, the largest allowed mix, and the test now pins that.

## 2. What the code does now

**C3.** `ddtForBallsPerMix` replaces the old default, so no caller can pass a total-ball count by mistake. The engine and the DDT override's "auto" both use it. The override's hint now reads "Automatic is 75.0 °F for a 6-ball mix."

**C2d.** The rule lives in one pure module, `src/lib/ballCounts.ts`:
- The stepper skips a disallowed count in the direction of the step.
- A change of ball weight, a link and a stored value all round up.
- 24 is allowed at every weight, so rounding up always ends. The code throws rather than loop if a range change ever breaks that.

The field shows "Raised to {balls} balls so each mix makes whole balls." while the count in use is above the one chosen. The split hint follows on the next line. The next tap of the stepper clears the note. The message comes from §6 through the generator, as `CAPACITY.raisedToEven`, like the split hint.

**C2.** Each dough rises from its own reading, and a dough not yet read plans at DDT. The timeline plans the last dough. The bulk and rise rows show the earlier doughs' end times on their own line: "Ends 10:35 AM (dough 1 10:00 AM)". The stagger, its tokens, its warning in the strip and `bulk-1`'s warning are all gone.

`bulk-1`, `bulk-2` and `bulk-3` each show a *Dough 1*, *Dough 2* … timer at `nMix > 1`:
- Each timer has its own key and state.
- Inside each, `{roomMin}` binds that dough's rise.
- Ticking the step stops all of them, since that is how a timer's time is kept.

`bulk-3` has a chip beside its values. It shows only when the doughs' timers agree; at 101 and 90 minutes a single "90 min" chip would have read as the rise for both.

## 3. Checked in the browser

At 375 px, in both timeline modes:
- **No sideways scroll.**
- **The stepper** goes 18 → 21 → 18 at 265 g.
- **Links and weight changes:** a link for 13 opens at 14 with the note, and 9 balls raised to 10 when the weight went to 272 g.
- **A split batch:** at 12 balls a mix-1 reading of 73.0 changed `bulk-3` to "101 min for dough 1 and 90 for dough 2". Dough 1's timer read 1 h 41 min, and dough 1's fridge time on the timeline moved. The last dough's rows stayed where they were.
- **The tap test:** starting dough 1's bulk timer moved nothing above the tap; dough 2's timer below moved down. Ticking the step stopped both timers.

## 4. `thermal-model` wasn't swept

The concept says the batch-total model sets the water too low "by 1.5 to 6.2 °F across the supported range". Over the counts the app allows, at each batch's DDT, the gate's sweep gives 1.495 to 6.385. §4.2 already says 1.5–6.4. MESSAGE-61's rendered-copy list didn't include the concept, so the old figure is still on the page.

The gate pins it as `knownWrong`, and the pin works both ways:
- It fails when the prose changes, so delete the pin then.
- It fails if the engine drifts back to 6.2.

Please change "6.2" to "6.4" in the concept. Nothing else in it moves: the 1.5 holds, and so does "most with the coldest biga".

## 5. §4.8's nominal figures at three mixes (not rendered)

"84 against 82 on nominal phase times" is dough 1's bulk end against mix 3's end at 23.875 minutes a mix, the nominal mix before MESSAGE-60 put Phase B at 7–9:

| Nominal mix | Dough 1's bulk ends | Mix 3 ends |
|---|---:|---:|
| 23.875 min (before MESSAGE-60) | 83.9 | 81.6 |
| 26.375 min (§5 today) | 86.4 | 89.1 |

On today's basis dough 1's bulk ends about 2.8 minutes before mix 3 does, not 2 after. "About when the third mix does" still holds. The planning-basis pair (90 against 100) is right.

## 6. Grammar

- **The capacity section's end.** Both parsers now end §7.3's capacity section at the next heading of any level, not at a heading named by its text. The generator finds it by walking lines, and `steps.test.ts` uses a regex. A test checks that the section still holds *Below the minimum* and not *Placing guidance*.
- **Step-level warning blocks are gone.** MESSAGE-61 removed the last one, and §8 no longer describes the marker, so I took the `warning, shown when` grammar out of both parsers and out of `Step`. A new warning block now fails the build as an unknown marker until both parsers, a closed condition set and a renderer exist. The generator reports no warning blocks.

## 7. Tests

The suite went from 741 of 752 on your scratch clone to 765 of 765 with the code. The new tests cover what you asked for:
- **The even split** at every entry point (stepper, weight change, set count, link), and the note.
- **12 balls against 6:** the same DDT, first water target, probe, later-mix prefill and rise.
- **`{riseByDough}` and `{finalDoughTemp}`** at one, two and three mixes.
- **`bulk-3`'s timers:** each dough's equals its own rise, and the timeline's rise is the last dough's.
- **The timeline:** the earlier doughs' times appear only at `nMix > 1`, and only on the bulk and rise rows.

I broke five rules on purpose, and each time a test failed:
- `applyInput` not rounding;
- the link not rounding;
- `DDT` by total balls;
- `{roomMin}` always the last dough's;
- an earlier dough's rise replaced by the last dough's.

Envelope sweeps now skip counts the app doesn't allow, and the reachability sweep samples 244 and 245 g. Until now it sampled 257 g for 19 × 257 g, which can no longer be entered.

## 8. Changes on our side

| File | Change |
|---|---|
| `src/lib/ballCounts.ts` (new) | The even-split rule |
| `src/lib/engine.ts` | DDT per mix (`defaultDdtFor`), per-dough rises, `mixEndsAtH`; the stagger and its warning removed |
| `src/lib/timeline.ts` | `ballsPerMix`, `earlierRisesH`, `earlierDoughEnds`, `earlierDoughPhrase` |
| `src/lib/bindTokens.ts`, `format.ts` | `{ballsPerMix}`, `{riseByDough}`, the per-dough `{finalDoughTemp}` and `{roomMin}` |
| `src/lib/stepInstances.ts` | `timerSlots`, `isTimerOf`, `PER_DOUGH_TIMER_STEPS` |
| `src/state/` | Rounding in `applyInput` and the link decoder; the stepper skips; the raised note |
| `src/components/` | Per-dough timers, the earlier-dough line on the timeline, the field's note, the final-reading and DDT hints |
| `src/lib/recipeText.ts` | Copy-as-text prints each dough's rise and reading |
| `scripts/generate-content.py`, `tests/steps.test.ts` | The capacity anchor, `raisedToEven`, and no warning grammar |
| `tests/` | The pins in §1; the new tests in §7 |
| `CLAUDE.md`, README, the plan, the handoff | Brought current |

## 9. Hashes

The two documents in the repository match the hashes MESSAGE-61 sent:

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `a5d0f2ef5cefa3d6ccaabab319f4b82d11d883df84e2ba243a686e47bd847f16` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `27848bfabb7f7d399a137c3f33073e4c14857bbb4ca0bc22a09cf3f6e27f70d1` |
