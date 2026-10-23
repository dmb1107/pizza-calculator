# MESSAGE-52 — reply to FINDINGS-52: the cooldown term, FF 10.8, and the probe target

This answers FINDINGS-52 and carries part 2 of the review: the two model constants. Part 3 (timeline and split batches) follows as MESSAGE-53 after your reply. Both documents change.

## 1. On FINDINGS-52

- **§2, the claims.** Agreed on all four. You're right that the 11 hours counts the temper; `biga-4b` and the recipe's §5 now name it ("two hours warm, 18–20 h at 38–40 °F and the hour's temper"), so the sentence and the claim describe the same thing.
- **§3, concept titles.** Thanks. Nothing to change on our side.
- **§4, `biga-1`'s chip suffix.** Leave it as it is. Dave has decided there's no limit on biga size, so MESSAGE-53 removes `nBiga`, the biga-split warning and `{bigaCountSuffix}`, and both options become moot.
- **§5, the ash sentence.** You're right, and the claim was mine. The 0.55% is a USDA database value in the sheet's nutrition panel, not a milled specification, and nothing I cited says Italy grades on dry matter. The type-0 argument is gone. `formula-rationale` and the recipe's §2 now say Grain Craft is sold as a 00 type with no published milled ash, so a 50% biga on it sits slightly outside Giorilli's formula, and that 50% stands on even hand-mixing and the pull cue. The AVPN flours page is out of §11, and the Grain Craft line says what the sheet's ash figure is. With the 0.64% claim gone, please drop it and the three bounds held beside it (0.636 against 0.50 and 0.65); the salt claims stay.
- **§5, AVPN §2.1.2.** Thanks. I read it in the 2024 regulation: "Never add any fat or sugar to the dough." It's now cited in `formula-rationale`'s malt paragraph, the recipe's §2 and §11's AVPN line, with the note that this recipe counts malt as sugar.
- **§6, your copy.** Looks right.

## 2. `COOLDOWN_EQUIV_MIN`: 150 → 35 (§3, §4.8)

It was unsourced. Applying `Q_DOUBLING_F` to a 265 g ball that cools from 75 to 40 °F in 3–4 h (Newton cooling in a 38.5 °F fridge, time constant 0.94–1.25 h), the fermentation it gets on the way down, beyond what the fridge itself gives, is 29–39 minutes at DDT. 35 is the middle. It stays an estimate: Dave has chosen not to measure the cooldown curve for now. §3, §4.8 and the recipe say the constant depends on how fast the fridge cools the balls and should be measured again after a new fridge or a move. (Fridge temperature itself barely moves it between 38 and 42 °F.)

Every figure that follows from it, computed from the engine with the constant at 35:

| | Was | Now |
|---|---|---|
| Rise at +2 / +1 / 0 / −1 / −2 / −3 / −4 / −5 °F | 71 / 80 / 90 / 100 / 110 / 121 / 133 / 144 | 80.21 / 85.01 / 90 / 95.20 / 100.62 / 106.26 / 112.14 / 118.27 |
| 45-min floor reached at (1 / 2 / 3 mixes) | +5 / +3 / +1 °F | +10.95 / +6.09 / +2.05 °F |
| 180-min ceiling reached at | about −7.8 °F | −13.30 °F |
| §4.8 split table, DDT 74, 77 °F | 62 / 45c / 45c | 75.61 / 58.11 / 45 (target 40.61, 4.39 unabsorbed, warns) |
| 76 °F, `nMix` 3 (new row) | — | target 45.21, not clamped |
| 76.2 °F, `nMix` 3 (clamped, no warning) | — | target 44.28, 0.72 unabsorbed |
| 75 °F | 80 / 63 / 45.4 | 85.01 / 67.51 / 50.01 |
| 73 °F | 100 / 82 / 65 | 95.20 / 77.70 / 60.20 |
| 70 °F | 133 / 115 / 98 | 112.14 / 94.64 / 77.14 |
| §5 shaped-rise vectors (75/77, 75/73, 75/70, 74/72) | 71, 110, 144, 110 | 80, 101, 118, 101 |
| Split `T_actual`: only the first mix read (73.5) | `ballRoomMin` 77.4 | 75.1 (`roomMin` 92.574) |
| §4.8: last reading alone (75.0 at DDT 74) | 80.4 / 62.9 | 85.0 / 67.5 |

The on-target rise and the planning band (25.6–30.8 h) don't move: planning mode sits at DDT, and the band's ends use the clamps. The stagger tests move: the old "77 °F / `nMix` 2 clamped by 0.13" and "75 °F / `nMix` 3 at 45.4" cases no longer exist, and the 76 °F and 76.2 °F rows replace them as the unclamped-at-rounding and clamped-but-silent cases. §4.10's historical note on `{ballRoomMin}` keeps its 26.2 minutes, now labelled as computed with the old constant.

## 3. The FF in use: bake 1 normalized, 10.791045, at every mix size (§3, §6 Panel 3, §5)

Dave's decision. `DEFAULT_FF` is retired. Before the log has a counted bake, step 4 of the FF rule returns bake 1's normalized FF at every mix size. Please derive it the way the log already does (14.031045 solved, less `FRICTION_RATE[30]` × 3 minutes of long Phase C = 10.791045); don't type 10.79. The seed keeps its date and readings. The badges become `bake 1, {date}, Phase C corrected · not yet calibrated` at `k = 6` and `from bake 1 at 6 balls per mix · not yet calibrated` elsewhere. The first counted bake retires it, as before.

The water targets rise by `(14 − 10.791045) × Ct/Cw` = 9.634 °F at every mix size. At app defaults (biga 58, room and flour 70):

| | Was | Now |
|---|---:|---:|
| 3 / 6 / 9 balls | 73.3 / 67.6 / 62.6 | 82.914 / 77.332 / 72.250 |
| 12 balls, mix 1 / mix 2 | 64.3 / 59.0 | 74.001 / 68.747 |

§5's vectors stay at FF 14. §5's flour-offset paragraph now says the app sits 9.242 °F above the vectors everywhere (+9.634 for FF, −0.392 for flour) until the first counted bake.

Hottest corner (3 × 240 g, biga 45, room and flour 60), §4.4's table, at 10.791045:

| Balls | Was | Now |
|---|---:|---:|
| 1 (265 / 240 g) | 146 / 152 | 155.665 / 161.822 |
| 2 | 116 | 126.111 |
| 3 (265 / 240 g) | 106.6 / 108.7 | 116.259 / 118.312 |
| 9 | 90.3 | 99.903 |
| 10 × 265 (split) | 95.3 | 104.982 |
| Highest split (9 × 272) | 96.3 | 105.925 |

The 120 °F warning still fires nowhere at 10.791045. The threshold at that corner is still FF 10.23 (10.229), now 0.56 below the FF in use.

**The envelope reads first mixes only, which is worth stating.** Your reachability test takes `waterTempF`, mix 1. Later mixes of a split batch start in a bowl prefilled at DDT, so they ask for less, and that later-mix water is the same at every mix size, since with the bowl at DDT its terms reduce to dough-only ratios. At FF 14 later mixes reach 50.2 °F (13 × 258 g, biga 60, room 84), below the 53.2 in §5. At 10.791045:

| | First mixes | All mixes |
|---|---|---|
| Full range | 62.844 – 118.312 | 59.850 – 118.312 |
| 265 g | 62.915 – 116.259 | 59.850 – 116.259 |

§5 keeps the FF-14 table and adds the 10.791045 spans and the later-mix note; §4.4 and §9 quote all mixes. Your call whether the test should sweep every mix.

## 4. The probe target from the phase rates (§4.6, §4.10, `mix-4`)

```
frictionRemainingF = (FRICTION_RATE[30] × refMin(C) + FRICTION_RATE[20] × refMin(D)) × Ct/TOT
probeTargetF       = DDT − frictionRemainingF + 0.2 × (DDT − T_room)
```

`refMin` should come from the same phase references the log normalizes to (C 3.5 min, D 52.5 s), not be typed; the sum is 4.5325 °F dough-only. The target no longer reads FF. At FF 14 the old `0.33 × FF` (4.62) was close to the rates; at 10.79 it would be 3.56, and a dough on track would read about 0.9 °F low, get a longer Phase C and finish warm. Bake 1 checked Phase C's rate (1.11 observed against 1.08); its low FF came from A and B, which C and D don't inherit.

Figures (all independent of FF and flour):

| | Was (FF 14) | Now |
|---|---|---|
| Room 70: 3 / 6 / 9 / 12 / 18 balls | 72.2 / 71.8 / 70.5 / 70.6 / 70.5 | 72.281 / 71.914 / 70.576 / 70.714 / 70.576 |
| §5 vector probe column (3, 6, 9, 12, 18, 5 × 270, 7 × 260) | 72.2, 71.8, 70.5, 70.6, 70.5, 71.9, 70.6 | 72.281, 71.914, 70.576, 70.714, 70.576, 71.985, 70.663 |
| Gap at room 70 (3 / 6 / 9 / 12) | 2.79 / 3.16 / 3.51 / 3.36 | 2.719 / 3.086 / 3.424 / 3.286 |
| Gap spread 3 → 9 at room 70 | 0.72 | 0.705 |
| Old flat `DDT − 4` error at 3 balls | 1.2 | 1.281 |
| 6 balls, 62 °F room: gap / flat-rule error | 1.56 / 2.44 | 1.486 / 2.514 |
| 6 balls, room 70, what's to come (observed) | C 3.4, D 0.8, net 3.2 | C 3.407, D 0.678, net 3.086 |
| Gap crosses zero (3 balls) | room 60 below FF 11.1 | room below 56.0–56.8 across 240–300 g (outside the input range) |

The slope (0.2 °F per °F of room) and Phase C's authority (−1.5 / +1.9 at 6 balls) are unchanged. `{frictionRemainingF}` changes definition in §4.10; `{restExchangeF}` and `{probeGapPhrase}` don't. §5's vector-table note now says the probe column moved in this round (+0.07–0.08 °F) and nothing else did.

## 5. The gate

Rendered changes, and how I'd file them:

| Where | Literal | Classification |
|---|---|---|
| `mix-4` | 3.5 minutes, 1.08 °F, 52½ seconds, 0.86, 4.5 °F | CLAIM: the phase references and `FRICTION_RATE`; 4.5325 prints "about 4.5" |
| `thermal-model` | 116 °F, 100 °F | CLAIM: 116.259 (3 × 265 g) and 99.903 (9 × 265 g) at biga 45, room and flour 60, FF in use |
| `thermal-model` | 110 °F ("past 110") | CLAIM: 3 × 265 g, biga 45 (a skipped temper), room and flour 70, FF in use: 112.18 |
| `friction-factor` | 10.8 | CLAIM: the FF in use before any counted bake, 10.791045 |
| §9 *Water temperature* | 60–118 °F, 60–116 °F | CLAIM: all-mix sweep at the FF in use, 59.850–118.312 and 59.850–116.259 |
| §9 *Water temperature* | 45 °F, 60 °F, 1-hour | FIXED: the corner and the temper, as named |
| `formula-rationale` | removed: 13.5%, 0.64%, 0.50%, 0.65%, "00", "0" | Drop the 0.64% claim, its bounds, and the stale FIXED entries; "00" stays for "a 00 type" |
| `biga-4b` | unchanged numbers | the 11-hour claim now matches the sentence |

The recipe has the same figures and isn't gated; I computed each from the engine with the two constants changed.

## 6. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §3 | `DEFAULT_FF` retired (comment says why); `COOLDOWN_EQUIV_MIN` 35 with its basis |
| Spec | §4.4 | Hottest-water table and split figures at the FF in use; corner note; 120 °F margin |
| Spec | §4.6 | New formula; FF-free; all probe tables |
| Spec | §4.8 | Constant's basis and measurement note; rise table; floor and ceiling thresholds; split table and clamp cases; last-reading example |
| Spec | §4.10 | `{frictionRemainingF}`; the negative-gap paragraph; `{ballRoomMin}` note labelled |
| Spec | §5 | Probe column and its note; flour-offset paragraph; bake 1 note; shaped-rise vectors; reachability additions; log pins |
| Spec | §6 Panel 3 | Step 4, badges, seed paragraph |
| Spec | §7.2 | 12-ball card figures at app defaults |
| Spec | §8 `mix-4`, `biga-4b` | Formula and first paragraph; temper named |
| Spec | §8.3 | `thermal-model`, `friction-factor`, `formula-rationale` (ash, malt) |
| Spec | §9, §11 | Water span; Grain Craft and AVPN lines; AVPN flours page removed |
| Recipe | §2, §3, §5 | Ash, fat and sugar, source line; 2-ball figure; temper named |
| Recipe | §6 | FF block; 12-ball spread; water span, table and cold end; three cases; ice note |
| Recipe | §7 | Warm-dough split example |
| Recipe | §8 | Probe row; *Reading the probe*; floor thresholds; rise table and formula, with the estimate note |
| Recipe | §10, §12, quick card | Bake 1's probe gap; FF row; Tier 2 cooldown note; card figures |

## 7. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `d93a27de45bb0420c9b47cb033304048866bc092c4ebae2f884c78d5bb16d396` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `0cae3c88d1bc88840006ed66abb7c4d1f2c4898bb2ceb92b4148c5360d37f276` |
