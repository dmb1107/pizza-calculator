# MESSAGE-4 — answers to your report, plus eleven corrections you didn't have

Good report. §2 confirmed, §3 answered below, §4 all fixed at source.

**Both attached documents are updated.** `WEBSITE-SPEC-biga-calculator.md` is
authoritative for the build; `Biga-Neapolitan-HaloCore-GrainCraft.md` is the
human recipe and is now in sync with it. Everything below is already in them —
this message exists so you know *what* changed and don't have to diff.

⚠️ **This is the only outstanding delta.** Nothing has been sent since
MESSAGE-3, so everything between your last report and now is in here.
`HANDOFF-new-context.md` is also updated but is background, not instructions.

⚠️ **§12 changes the timeline durations, which is Task 8's input.** Read that
one before you carry on — it is the only item here that touches work in flight.

**Change inventory** — every module this message affects:

| Area | Sections |
|---|---|
| `constants.ts` | 2 (`MIN_BALLS`, water guards), 3 (ADY derivation), 6 (`DEFAULT_BIGA_TEMP_F`), 12 (`CHANGEOVER`) |
| Calculation engine | 3 (ADY), 5 (`observedRate` helper), 9 (per-mix weights), 12 (timeline, stagger) |
| Warnings | 2 (hot-end warning, `MIN_BALLS`) |
| Inputs / Panel 1–2 | 2 (balls 3–24), 6 (biga default), 10 (bowl-state selector, bowl temp field) |
| Outputs | 10 (per-mix water cards) |
| Step content §8 | 3 (`biga-2`), 4 (`mix-4`), 5 (`mix-5`), 10 (re-measure prompt) |
| Concepts §8.3 | 7 (regenerate — `thermal-model`, `friction-factor`, `giorilli-standard`) |
| Reference tables §9 | 1 (water span), 5 (dough-only vs observed friction rates) |
| Test vectors §5 | 1 (reachability corners), 3 (ADY column), 9 (12/18 rows), 10 (bowl modes) |
| Invariants | 3, 4, 9 |
| Log schema §10 | 8, 10 |
| Build order §12 | 7 |

---

## 1. Your §2 — confirmed, 106.6 °F is right

Reproduced independently: **106.6 °F at 3 × 265 g, biga 45 °F, room 60 °F.**
Your diagnosis of the cause is also right — the published sweep started around
9 balls and never saw the small end. 90.6 sits just above the 9-ball maximum
of 90.3, which is exactly the fingerprint you'd expect.

Corrected in spec §5, spec §9, and recipe §6. Stop recording the disagreement
in `tests/vectors.ts` and adopt the measured values; the spec now agrees with
them.

⚠️ **Re-sweep after you apply §9 (per-mix weights) — the cold end moves.** I
nearly shipped this message with the old figure. Per-mix weights cap the thermal
system at mixer capacity, and the coldest requirement comes from the *largest*
system, so the minimum rises from 51.2 to **53.2 °F**. The largest single mix in
the permitted range is 9 × 270 g; a 24-ball batch is three 8-ball mixes, not one
6500 g one. New pinned corners:

| | Value | Corner |
|---|---:|---|
| Minimum | **53.2 °F** | 9 × 270 g, biga 60, room 84 |
| Maximum | **108.7 °F** | 3 × 240 g, biga 45, room 60 |
| Minimum at 265 g | **53.3 °F** | 9 × 265 g, biga 60, room 84 |
| Maximum at 265 g | **106.6 °F** | 3 × 265 g, biga 45, room 60 |

Per-batch maxima at 265 g also change at the split sizes: 3 → 106.6 · 5 → 98.7 ·
6 → 96.8 · 7 → 92.1 · 9 → 90.3 · **12 → 93.4** · **18 → 90.3** · 24 → 91.1.

⚠️ **These are not monotonic in total balls.** 12 (93.4) sits above 9 (90.3),
because 12 runs as two 6-ball mixes and a 6-ball mix wants hotter water than a
9-ball one. The requirement tracks the **mix**, and mix size does not fall
smoothly with batch size. Don't assert monotonicity on batch size here — same
trap as the `probeTargetF` invariant in §9.

---

## 2. Your §3 — do (1) **and** the warning

You were right not to build the second warning on your own reading, and right
that (1) is the real fix. But (1) alone leaves the app with no guard at all if
the number ever does go high, and it can: **FF is user-editable.** At 3 × 240 g
with a calibration FF of 8, the requirement is 126.7 °F. The batch minimum
closes the door that's actually open today; the warning is there for the one
your own calibration panel can reopen.

**MESSAGE-3's "one warning, and only one" is withdrawn.** That was written
before anyone had swept the small end, and it turned out to guard the
unreachable failure while leaving the reachable one bare. Your instinct to flag
rather than obey it was the correct call. Spec §4.4 now says so explicitly so
this doesn't come back as an apparent contradiction later.

### (1) `MIN_BALLS = 3`

Now a constant, an input constraint on Panel 1 (range `3–24`, was `1–24`), and
documented in recipe §3 under "Note on small batches — 3 balls is the floor".
Rationale in both docs: 2 balls is 542 g, which clears the 500 g floor on paper
but won't let a spiral hook grip, *and* asks for 116 °F water. Two independent
reasons pointing the same way.

The recipe explicitly says the arithmetic still scales below 3 for anyone mixing
by hand — it's the *machine* batch that has a floor. Don't build a hand-mix mode.

### (2) The warning

Mirrors the cold one exactly. Card stays bare per §7.2 — this renders in the
warning strip above the step list.

| Condition | Behavior |
|---|---|
| `waterTempF > WATER_MAX_F` (120) | Above what a domestic tap delivers. **Do not tell the user to heat water.** Point upstream: the cause is almost always a biga that skipped its 1-hour temper, and each °F of biga temperature is worth about 2 °F of water. |

Threshold 120 because that's where domestic scald limits start. With
`MIN_BALLS = 3` it fires on **zero** of 114,400 grid points at FF 14 — assert
that, but assert it as *"does not fire in this envelope"*, not as
*"unreachable"*. It is reachable, just not from the temperature inputs alone.

I did not take your options (2) or (3). (2) puts commentary on the card, which
§7.2 rules out for good reason. (3) leaves the app printing an unfollowable
instruction, which is the actual defect.

---

## 3. `ADY_OF_BIGA_FLOUR` changes: 0.0038 → **0.00375**

This one is mine, not yours — you had no way to see it. The recipe's yeast
tables were computed at 0.375% while its prose and the spec constant said
0.38%, so the two documents printed different gram weights (6 balls: 2.29 vs
2.32 g). The published anchor is **1% fresh yeast**; everything after it is unit
conversion, so 0.375% is exact and 0.38% was a display rounding that leaked into
the constant.

**Derive it, don't hardcode it** — same treatment as `C_BIGA`:

```ts
FRESH_YEAST_OF_BIGA_FLOUR: 0.01,
FRESH_TO_IDY: 0.30,
IDY_TO_ADY: 1.25,
// ADY_OF_BIGA_FLOUR = 0.01 * 0.30 * 1.25 = 0.00375
```

**Only the `bigaADY` column of §5 moves.** Yeast carries no term in the heat
balance, so every thermal figure is byte-identical. If a non-ADY cell shifts
when you re-run, something else broke and I want to hear about it.

New column: 3 → 1.15 · 6 → 2.29 · 9 → 3.44 · 12 → 4.58 · 18 → 6.88 ·
5×270 → 1.95 · 7×260 → 2.62. Add an invariant that
`bigaADY / bigaFlour === 0.00375` exactly.

---

## 4. The probe target: `DDT − 4` is deleted, not adjusted

If you implemented a flat "DDT − 4" shorthand anywhere alongside the general
formula, remove it. It disagrees with `probeTargetF` by up to **1.2 °F at
3 balls**, which is most of Phase C's entire correction budget spent in the
wrong direction before the user starts.

Correct per-size values (FF 14, room 70): 3 → DDT − 2.8 · 6 → DDT − 3.2 ·
9 → DDT − 3.5 · 12 → DDT − 3.6 · 18 → DDT − 3.7. The general formula was
already right and is unchanged — only the shorthand and its supporting prose
were wrong.

New invariant: `probeTargetF` is strictly decreasing in batch size at fixed FF
and room temperature.

---

## 5. ⚠️ Dough-only vs observed — the thing that caused §4

This is the root cause behind the `DDT − 4` error and worth handling
structurally rather than by fixing the two places it surfaced.

`FF` and `FRICTION_RATE` (0.75 / 0.86 / 1.08) are **dough-only** quantities, to
match the `FF × Ct` work term. A thermometer reads the dough *after* it has
equilibrated with the bowl. So any dough-only figure compared against a
measurement needs `× Ct / TOT`:

| Balls | 3 | 6 | 9 | 12 | 18 |
|---|---:|---:|---:|---:|---:|
| `Ct / TOT` | 0.821 | 0.901 | 0.932 | 0.948 | 0.965 |
| Observed °F/min at 30% | 0.89 | 0.97 | 1.01 | 1.02 | 1.04 |

**Please expose one helper — `observedRate(dialPct, batch)` — and route every
duration-to-temperature conversion through it.** Two call sites exist today:
the Phase C guidance in `mix-5` (its summary now interpolates
`{observedRate30}` rather than hardcoding "1 °F per minute", which is only true
at 6 balls and up) and the Phase C authority figures, which were quoted
dough-only and are now −1.5 / +2.0 °F at 6 balls, −1.3 / +1.8 at 3, −1.5 / +2.0
at 9. Assert `observedRate(30, batch) ∈ [0.88, 1.05]` across 3–24 balls.

The step prose in §8 is updated for both. Same rule as always — verbatim.

---

## 6. `DEFAULT_BIGA_TEMP_F`: 64 → **58**

Panel 2 defaulted biga-at-mix to 64 °F. That number is unsourced — the test
vectors use 58 and bake 1 measured 58. It matters more than any other default
in the app: `d(T_water)/d(T_biga)` is **−1.92 at 6 balls, −2.25 at 3**, so a
6 °F miss moves the required water 11.5 °F and the finished dough 3.5 °F.

Default to 58, mark the field as expecting a measurement rather than an
estimate, and show the sensitivity inline. It is the highest-leverage input in
the model and the UI should say so.

---

## 7. Smaller items from your §4

- **§12 build order** — fixed, and now reads *"both water warnings, not just
  the cold one."*
- **§9 and recipe §6 spans** — both corrected to 53–109 °F (53–107 at the 265 g
  default), with the per-batch maxima table so the shape is visible. See the
  warning in §1 about re-sweeping after the per-mix change.
- **`constants.ts` bowl comment** — thanks for catching that; the same claim was
  stale in one more place and is fixed.
- **Concept count** — you're at 11. It stays 11; I added prose to
  `thermal-model`, `friction-factor` and `giorilli-standard` but no new concept.
  Regenerate from §8.3 again, since your verbatim test compares character for
  character. Total concept prose is now longer, not shorter, so the 9,000-char
  floor is safe.
- **Log schema** — `bowl_temp_f` becomes a measured field rather than a derived
  one, and `biga_temp_at_pull_f` joins `biga_temp_at_mix_f`. See §8, and §10 for
  `mix_index` and `bowl_state`.
- **§9 reference tables** — the friction-rate table now carries both the
  dough-only figures and the observed ones (§5), and the water-temperature entry
  carries the corrected span. Both are display copy, so re-pull them.
- **§12 build order** also gained a "four things you may find in older text that
  are now wrong" list: the `DDT − 4` shorthand, a ~90 °F water ceiling,
  `ADY_OF_BIGA_FLOUR = 0.0038`, and thermal weights from batch totals. **Delete
  those on sight rather than reconciling them** — all four appear in text that
  was correct when it was written.

---

## 8. Bowl temperature is promoted to a real input

Two changes here, one procedural and one that follows from it.

**Procedural, now fixed:** the biga **always** ferments in the mixer bowl. Not a
per-bake choice, not a variable, not something the log needs to record. Drop the
`biga_fermented_in_mixer_bowl` field — it appeared in an earlier draft of this
message and was obsolete before you read it. It is not in the spec.

**What follows from it is less convenient.** Defaulting `T_bowl` to `T_biga` was
justified on 19 hours of contact reaching equilibrium. That reasoning holds
through the fermentation and breaks in the last ten minutes: bake 1 logged the
biga at **53 °F at pull and 58 °F after tearing** — 5 °F gained from handling
that the bowl did not share. The same log corroborates it independently, in a
line nobody had read this way before: *"Phase C rate climbed 0.82 → 1.00 °F/min
as the bowl equilibrated."* That is a bowl playing catch-up.

**The old justification for not measuring used the wrong coefficient.** The spec
argued `C_bowl/TOT` = 0.10 °F per °F at 6 balls, so a misestimate is cheap. True,
but that is what a bowl error costs the *dough*. What it moves is the *water
target*, which is `C_bowl/Cw` — three times larger, because water is only 30% of
the system. 0.657 at 3 balls. A 5 °F bowl error is 3.3 °F of water there.

So: **keep `T_biga` as the default so no current output moves**, but promote the
field to a first-class input on Panel 2, prompt for a measurement, and show the
water coefficient inline the way biga temperature now does.

⚠️ **Do not add a "tearing gain" constant.** Five degrees is one observation from
one bake. Hardcoding it would be the same failure that produced the yeast table
that was 2.7× too low. It is a quantity to measure, not to model.

**Why this actually matters, and it isn't cosmetic:** FF = 14.04 was fitted with
`T_bowl` assumed to be 58. Fit it with the bowl at 53 and the same measurement
gives **FF = 14.58**. Both reproduce bake 1 exactly — the error was absorbed into
FF at the batch size it was fitted at. It reappears everywhere else:

| Balls | bowl-58 fit | bowl-53 fit | Divergence |
|---:|---:|---:|---:|
| 3 | 73.6 °F | 75.2 °F | **+1.67** |
| 6 | 68.0 °F | 68.0 °F | +0.03 |
| 9 | 62.9 °F | 62.4 °F | −0.52 |
| 18 | 61.1 °F | 60.1 °F | −1.07 |

That is the same magnitude and the same sign as the 3-ball FF signal bake 2 is
supposed to be testing. Without a bowl measurement the two are indistinguishable
after the fact. Nothing in the app changes because of this — the vectors already
pin `T_biga = T_bowl = 58` explicitly — but it is why the input is worth the
extra field.

---

## 9. ⚠️ Split batches feed whole-batch mass into the heat balance

Chasing the 18-ball bowl case turned up a real bug, and it is the same shape as
the one that killed the bowl-free model.

`Cb`, `Cf`, `Cw` and `Cs` are computed from `bigaMass`, `freshFlour`,
`freshWater` and `salt` — **batch totals.** `C_bowl` is one bowl. So a 12-ball
batch that runs as two 6-ball mixes is modelled as the entire batch sitting
against a single bowl, which never happens. The bowl faces one mix at a time.

```
perMix = { bigaMass, freshFlour, freshWater, salt } ÷ nMix
```

**FF is per-mix by the same argument** — it is the rise the mixer puts into the
dough actually in the bowl, and 14.04 came off a single 6-ball mix.

| Batch | As written | Per-mix (correct) | Error |
|---|---:|---:|---:|
| 12 (2 × 6) | 62.1 °F | **64.8 °F** | +2.6 |
| 18 (2 × 9) | 61.3 °F | **63.0 °F** | +1.8 |
| all `nMix = 1` | — | unchanged | 0 |

The §5 vectors for 12 and 18 now carry the corrected `Ct`, `waterTemp` and
`probe`. Ingredient columns are still batch totals; only `Ct` is per-mix.

**Two consequences for your tests.** The observed-rate vectors for 12 and 18 now
equal those for 6 and 9 — because they *are* 6- and 9-ball mixes. And
`probeTargetF` is no longer monotonic in total balls: 12 balls sits above 9.
The monotonicity invariant in §4 above must assert on **per-mix** ball count.
If you wrote it against batch size it will now fail correctly.

---

## 10. Bowl state — a three-way selector, per mix

This is what §9 was found while building, and it's the piece Dave asked for.

The bowl is not always cold. Mix 2 runs in a bowl that just finished mix 1, and
at 18 balls there's one bowl for two bigas so the second ferments elsewhere.
Three states, each **prefilling from a value already in the model** — no new
constants, which is the whole point:

| Mode | `T_bowl` prefill | Default for |
|---|---|---|
| Cold — held the biga | `T_biga` | Mix 1, every `nMix = 1` batch |
| Room temperature | `T_room` | Bowl washed and left out |
| Warm from the previous mix | `DDT` | Mix 2 and later |

The field stays editable and a measurement always wins. **The warm mode is a good
prefill, not just a ceiling** — the bowl is not cleaned between mixes and the
changeover is ~5 min, so it comes off mix 1 near dough temperature with little
time to shed. `DDT` runs a degree or two high.

**When `nMix > 1`, render a water card per mix.** They're different numbers:
12 balls gives 64.8 °F then 59.5 °F on the default prefills. Label them Mix 1
and Mix 2, and keep each card as bare as §7.2 requires.

**Put a re-measure prompt in the step list between mixes.** Both leveraged
inputs drift while mix 1 runs — bowl up toward `DDT`, waiting biga up toward the
room — and the **biga is the bigger term** (−1.59 °F of water per °F, against
−0.33 for the bowl at 6 balls per mix). Do not model either drift. There is no
data for it. Ask for two readings and recompute.

Worth surfacing near the selector, but **as a fallback, not the default**:
rinsing resets the bowl to about the rinse temperature inside a minute (thin
stainless, `C_bowl` 115.8). Dave doesn't clean the bowl between mixes, so this
is only for when mix 2's target comes out awkward.

**Say plainly that leaving residue is fine.** Both halves check out:
*thermally exactly neutral* — the residue sits at `DDT` and contributes its own
share to both sides, so the required water is identical to the decimal at 0, 30
or 60 g of carry-over; and *the yield cancels* — residue transfers forward and
both doughs land in the same tub, so only what stays after the final mix is a
real loss, which is what the 2.2% overage always covered. ⚠️ That cancellation
depends on combining the doughs. If that ever changes, mix 1 runs short of its
ball count at 50 g of carry-over.

---

## 11. DDT on a split batch — settled, no change

`DDT` stays keyed to **total** balls. I raised this as an open question and Dave
has answered it: the two doughs go into **one bulk container**, so the batch
cools as a single 12-ball mass and 74 is correct. No vector moves.

Recording it because the reasoning is not obvious from the constant: the DDT band
is about cooling during **bulk**, not during the mix, so it follows the bulk mass.
Had he bulked them separately, 12 balls would need 75 and the mix-1 water target
would move 3.3 °F.

---

## 12. ⚠️ Two timeline bugs that answer exposed

**`mix` is a flat 0.5 h regardless of `nMix`.** A 12-ball batch runs two mixes
back to back with a changeover between them, and the timeline counts one.

```
CHANGEOVER = 0.0833                                // 5 min - bowl NOT cleaned
mix        = 0.5 × nMix + CHANGEOVER × (nMix − 1)
```

Overhead at `nMix = 2` is **28.4 h**, not 27.8. Assert both; the 25.6–30.8 band
in §4.7 is `nMix = 1` only.

**The bulk clock has no anchor.** Mix 1's dough finishes **35 minutes** before
mix 2's, and once they share a tub they're indistinguishable — one clock, two
doughs, one of them ahead of it.

Two changes:

1. **Clock `bulkRest` from the last mix.** Only anchor that gives mix 2 any bulk.
2. **Subtract half the stagger from `ballRoomTemp`:**

```
stagger      = (MIX + CHANGEOVER) × (nMix − 1)        // 0.583 h = 35 min at nMix 2
ballRoomTemp = clamp(computed − stagger/2, 45, 180)   // −17.5 min at nMix 2
```

90 min becomes **72** at 12 and 18 balls. `nMix = 1` untouched.

⚠️ **It centres the error, it does not remove it.** Mix 1's half goes from +35
to +17.5 and mix 2's from 0 to −17.5. One clock can't do better; halving the
worst case is the whole gain. Say that in the step content — a user who thinks
the correction makes the batch uniform will draw the wrong conclusion from a bad
result.

⚠️ **Two soft numbers here, and they are the softest in the whole document.**

`CHANGEOVER` is Dave's estimate of his own workflow, not a measurement, and it
assumes mix 2 is weighed out before mix 1 starts — which `mix-1` already
instructs. Every 5 min of changeover moves the rise correction by 2.5 min. Time
it on the first split bake.

The `stagger` correction itself is **derived, not measured** — the only such
thing in this round. It assumes bulk-stage and ball-stage fermentation are worth
the same at the same temperature. That should hold (same dough, same
temperature; dividing displaces gas without resetting fermentation) but nothing
has tested it. Keep `stagger` as one named term so it can be set to zero without
touching anything else.

None of this affects bakes 2 and 3 — both are `nMix = 1`.

---

## 13. What I need back

⚠️ **Correction to what I said in an earlier draft: Task 8 is NOT unaffected.**
§12 changes `mix` from a flat 0.5 h to a function of `nMix`, adds `CHANGEOVER`,
re-anchors `bulkRest` to the last mix, and subtracts `stagger/2` from
`ballRoomTemp`. Those are Task 8's inputs. Fold §12 in **before** you finish the
backward timeline rather than after, or you will solve backward against
durations that are about to move.

Everything else can land in any order.

Four things worth a reply when convenient:

1. **Confirm the ADY change produced zero movement in the thermal vectors.**
   That's the check that tells us the yeast constant is properly isolated.
2. **Confirm no `nMix = 1` vector moved** when you switch to per-mix weights
   (§9). Only the 12 and 18 rows should change. If a single-mix row shifts,
   something else broke and I want to hear about it before you patch it.
3. **Tell me if `MIN_BALLS = 3` breaks any existing test** that swept from 1.
   Those sweeps should be re-bounded, not deleted — the 1- and 2-ball figures
   are still the reason the minimum exists, and I'd rather they stay recorded
   somewhere than vanish.
4. **Push back on `CHANGEOVER` and `stagger` if the shape looks wrong to you.**
   They are the two softest numbers in this message: one is Dave's estimate of a
   workflow he has not yet run, the other is derived from an assumption nothing
   has tested (§12). You have caught this class of thing before — a documented
   bound a new feature had invalidated — and this is the same class.

**Same standard as always:** where a number here is provably wrong, fix it and
tell me. Where the design intent reads as ambiguous, ask rather than choose.
Reproduce a figure before disagreeing with it, and if you reproduce something
different, send me the numbers.
