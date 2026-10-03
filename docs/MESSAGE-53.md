# MESSAGE-53 — reply to FINDINGS-53: split batches, one biga, the temper, divide time

This answers FINDINGS-53 and carries part 3, the last of the review: the timeline and split-batch changes. Both documents change, and so does the step list (a new step, `mix-0`).

## 1. On FINDINGS-53

- **§3.1, §4.2's two stale sentences.** Fixed as you gave them: the DDT slip reads "68.7 to 68.4 at app defaults", and the spread-table note says every cell is 9.242 °F higher at app defaults.
- **§3.2, the zero crossing.** 56.0–56.7 in §4.10. MESSAGE-52's own table had the same 56.8; that one was wrong too.
- **§3.3, 35 against 34.04.** Keep 35. §4.8 no longer calls it the middle: it gives 29.2–38.9 with 34.0 in the middle, says 35 rounds that up, and cites your quarter-minute figure.
- **§3.4, §4.4's cold end.** Now named by basis: 59.9 °F on a later mix and 62.8 on a first mix at the FF in use, and 50.2 and 53.2 at FF 14.
- **§4, the gate.** Your three exceptions are right, the §9 claims especially. Thanks for widening the reachability test to every mix.
- **§5, your copy.** Both look right.

## 2. One biga at every size (§3, §4.5, §7.3, §8.2 `biga-1`, §8.2a)

Dave's call: no limit on biga size. The biga is always one biga, fermenting in the mixer bowl; if a big one doesn't fit, he'll use a bigger container, and the recipe doesn't mention it. Please remove:

- `nBiga` from the engine and `FLOUR_CAP_55` from the constants (its only reader was the biga split; Phase A's 55% dough is already bound by `FLOUR_CAP_66`, which is tighter)
- the biga-split warning (`bigaSplit` in the capacity content, and its label in `generate-content.py`, which now reports it not found) and its tests
- `biga-1`'s `nBiga > 1` block, and `nBiga > 1` from the detail-condition set, which leaves exactly `nMix > 1`
- the `PerBiga` scope. With one biga, the biga phase's quantities are batch totals, so its tokens are bare: `{bigaFlourPerBiga}`, `{bigaWaterPerBiga}` and `{bigaADYPerBiga}` become `{bigaFlour}`, `{bigaWater}` and `{bigaADY}`. `{bigaFlourTotal}`, `{bigaCountSuffix}` and `{bigaFlourCapG}` go.

§4.5's information line stays and now keys on `nMix > 1`: "Mix one biga, then divide it by weight into N portions for N separate final mixes." This also settles FINDINGS-52's chip-suffix question: `biga-1`'s chips carry no suffix at any size. At 18 × 265 g there is now one biga of 1833.7 g flour, divided into 2 × 1375.3 g.

## 3. `mix-0`: split the biga, once (§8.2, §8.2a, §4.7)

Before, the split was in `mix-1`'s collapsed `nMix > 1` detail, and `mix-1`'s summary said "crumble the biga", so a baker working from the terse view put the whole biga into mix 1. The split now gets its own step:

- **`mix-0` — Split the biga.** `phase: mix`, **not** `repeatsPerMix`, `shown only when: nMix > 1`. It renders once, after `biga-6` (retarded) or `biga-5` (classic) and before `mix-1#1`. Its chips are biga, fresh flour and salt per mix. The "weigh out every mix" paragraph moves here from `mix-1`, which also stops it repeating on mix 2's pass.
- **`mix-1`** loses its `nMix > 1` block and gains a `Biga: {bigaMassPerMix} g` chip at every size. At one mix that's the whole biga.
- **The step-level condition set** grows from `schedule === 'retarded'` to include `nMix > 1`. The generator already parses it (`shownWhen: "nMix > 1"`).
- **Counts:** retarded 19 / 28 / 36 and classic 17 / 26 / 34 at `nMix` 1 / 2 / 3. Only the split counts rise. §8.2a writes out the `nMix = 2` retarded order. Please update all six golden sequences.
- **Stages:** `mix-0` belongs to the `mix` stage. §4.7's `mix` row and §4.8's `CHANGEOVER` note now point to it.

## 4. The large-biga note (`biga-6`, `nMix > 1`)

A new `nMix > 1` block on `biga-6`. A biga for a split batch cools more slowly in the fridge and warms more slowly in its temper, so it arrives riper and colder than a 6-ball biga on the same clock. Judge it by the cue and measure it; the water target follows the reading. Nothing computed changes.

## 5. The temper: 1.5 h, and waves (§4.7, `bake-1`)

Dave's call. The 2–3 h came from the Fuso recipe, which is no longer a source. Sisofo gives his balls 1–2 h after the fridge. The recipe's cooling figure agrees: the time constant behind "3–4 h from 75 to 40 °F" (0.94–1.25 h) puts a ball from a 39 °F fridge at 60 °F in 1.06–1.41 h and 65 °F in 1.72–2.28 h in a 70 °F room.

- `temper`: planning point **1.5**, input range **1.5–2** (step 0.25 as before), on both tracks. Stored or linked values outside the range should clamp.
- `bake-1`: the summary says 1½–2 hours before the first launch, and the timer is 1.5–2 h. The detail adds why 1½ hours, and Dave's waves for more than one tray: first tray `{temper}` h before the first launch, the second at the first launch, then each 45 minutes after the one before; individual containers are pulled in groups of six (his tray size). No new condition: the paragraph starts "More than one tray".

## 6. Divide time scales with balls (§3, §4.7)

`divideBall = (DIVIDE_BASE_MIN + DIVIDE_PER_BALL_MIN × balls) / 60`, with `DIVIDE_BASE_MIN = 12.5` (the middle of `bulk-2`'s 10–15-minute rest) and `DIVIDE_PER_BALL_MIN = 1.25` (so 6 balls keeps today's 20 minutes). Both are estimates, labelled as such. Keyed on **total** balls, since the whole tub is divided at once. **Timeline only:** the rise after balling isn't shortened for the extra minutes. That was Dave's choice; at 12 balls it's 7.5 minutes.

## 7. The classic track's cold ferment: 6–8 h (§4.7, §6 Panel 1, `schedule-architecture`)

A classic biga arrives fully ripe from 16–18 h at room temperature, and §7 of the recipe promises a short final proof. The cold-ferment input is now **6–36, default 24** on the retarded track and **6–8, default 6** on the classic one, and the value clamps into the track's range when the schedule changes. `schedule-architecture` gets one sentence saying so. Classic totals: 26.8–28.8 h at a 16 h biga, ~27–31 h across 16–18.

## 8. Figures

Timeline, at 265 g, on target, retarded, the new temper and divide:

| Batch | `nMix` | `mix` | `divideBall` | `ballRoomTemp` | Overhead |
|---:|---:|---:|---:|---:|---:|
| 3 | 1 | 0.5000 | 0.2708 | 1.5000 | 26.7708 |
| 6 | 1 | 0.5000 | 0.3333 | 1.5000 | 26.8333 |
| 9 | 1 | 0.5000 | 0.3958 | 1.5000 | 26.8958 |
| 12 | 2 | 1.0833 | 0.4583 | 1.2083 | 27.2500 |
| 18 | 2 | 1.0833 | 0.5833 | 1.2083 | 27.3750 |
| 24 | 3 | 1.6667 | 0.7083 | 0.9167 | 27.7917 |

- Totals at the defaults: 32.83 / 50.83 / 62.83 h at 6 / 24 / 36 h cold (were ~34 / 52 / 64).
- Band at `nMix = 1`, retarded: **25.0208–29.9167 h**. The low end is 3 balls, an 18 h fridge, the 45-min rise and a 1.5 h temper. The high end is 10 × 240 g, the largest single mix, with a 20 h fridge, the 180-min rise and a 2 h temper. Was 25.6–30.8.
- At 265 g, two mixes span 27.21–27.38 h (10–18 balls) and three mixes 27.69–27.79 h (19–24).

The recipe quotes these rounded: 26.8 h, ~33 / 51 / 63 h, 25.0–29.9 h, two mixes 27.2–27.4 h, three 27.7–27.8 h. Its "Going past 64 h" heading is now "63 h".

## 9. The gate

New rendered literals, and how I'd file them:

| Where | Literal | Classification |
|---|---|---|
| `mix-0` | 65% | CLAIM: `BIGA_FRACTION` |
| `mix-0` | five minutes, fifteen or twenty | as they were on `mix-1` |
| `biga-6` block | 6-ball | FIXED: a comparison batch |
| `bake-1` | 1½–2 hours, 1.5–2 h (timer) | CLAIM: the temper input range |
| `bake-1` | 1–2 hours | FIXED: Sisofo |
| `bake-1` | 3–4 hours, 75, 40 °F | as in `bulk-4` |
| `bake-1` | "a little over an hour", "about two" (to 60 and 65 °F), 70 °F | CLAIM, derived: warming at the time constant behind 3–4 h, 1.06–1.41 h and 1.72–2.28 h |
| `bake-1` | 45 minutes, six | FIXED: Dave's wave interval and tray size |
| `schedule-architecture` | 6–8 hours | CLAIM: the classic cold-ferment bounds |

Removed: `biga-1`'s block and its 1610 g. The generator still parses the spec: 21 steps, 11 concepts, 12 sources.

## 10. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §3 | `FLOUR_CAP_55` removed; `DIVIDE_BASE_MIN`, `DIVIDE_PER_BALL_MIN` |
| Spec | §4.2 | FINDINGS-53 §3.1's two sentences; bowl-state row |
| Spec | §4.4 | Cold end named by basis |
| Spec | §4.5 | One biga; no `nBiga` |
| Spec | §4.7 | `divideBall`, `temper`, `coldFerment` rows; `mix-0` in the stage map |
| Spec | §4.8 | 35's wording; overhead band and table; `CHANGEOVER` note |
| Spec | §4.9, §4.10 | Condition set; `{bigaFlourCapG}`; 56.7 |
| Spec | §5 | Split counts line |
| Spec | §6 Panel 1 | Cold ferment by track |
| Spec | §7.3 | Biga-split warning removed; one-biga line keyed on `nMix > 1` |
| Spec | §8.2 | `biga-1`, `biga-6` block, `mix-0` (new), `mix-1`, `bake-1` |
| Spec | §8.2a | Counts, `mix-0`'s order, token scope |
| Spec | §8.3, §11 | `schedule-architecture` classic sentence; Sisofo line |
| Recipe | §3 | Limits (no biga cap); 18-ball row; large-biga note |
| Recipe | §6 | Bowl-state row |
| Recipe | §7 | Divide and temper rows; totals; overheads; classic 6–8 h; "63 h" |
| Recipe | §8 | Split the biga first; step 11 temper and waves |
| Recipe | Quick card | 18-ball line; schedule, overheads, divide, classic, temper |

## 11. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `7ac0a34c9904834eba79c2115a9314474c53df4b8babd1069963efaa9bd33c21` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `efc3681a88ef28c0d1ff8546239a0f053e43f186c39bb88cefe46028b0429fa3` |
