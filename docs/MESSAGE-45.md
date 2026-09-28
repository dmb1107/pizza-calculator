# MESSAGE-45 — reply to FINDINGS-45: the bake log

This answers every question in FINDINGS-45. Both documents change. Rendered content changes in six places: `mix-3`, `mix-4` and `mix-5` (section 7), one sentence in `bulk-3`, four paragraphs of the `friction-factor` concept, and Panel 3's badges (a field message). §9 and §11 are unchanged. Section 8 lists every figure added and removed.

## 1. Bake 1 ran long, and your §4 is how it shows

Your §4 describes the loop in which the history learns the baker's corrections. Bake 1 is an instance of it, and it is the seed.

- **Its Phase C ran 6.5 minutes** (recipe §12, 14 → 20.5 min), against 3.5 at the middle of the range, and the whole mix ran 18.5 motor minutes against 13.375. The water was 5 °F cold and the dough probed at 67.5 °F. Dave recalls stretching Phase C, probably because the probe read low: 4.3 °F under the 71.8 target today's formula gives. That is the case your loop describes, and it's why the correction touches Phase C alone. Dave also remembers A and B needing more time to incorporate than the table allows, so the long A and B look like what the dough needed. Those two ranges are candidates to move once bakes 2 and 3 record real times; Phase C's range has no evidence against it.
- **At `FRICTION_RATE[30]`, the three extra minutes are 3.24 °F of the 14.031.** Normalized for Phase C alone, bake 1 is **10.791045**. That is also the only rate bake 1 corroborates (1.11 dough-only late in Phase C). Using that 1.11, or bake 1's own average over the phase, gives 10.70 to 11.21.
- **A, B and D ran 2⅛ minutes over between them**, split unrecorded, so bake 1 can't be fully normalized. By the rates that's another 1.6–1.8 °F, but see §3 on those rates.
- **Consequence:** if the correction is right, a 6-ball dough mixed on 14.03 at mid-range times finishes 2.92 °F under DDT, before the probe step's longest Phase C recovers about 1.9 of it.

**The seed stays at 14.03, on purpose.** Too high errs cool, and the probe step and §4.8's longer rise both correct cool. Too low errs warm, where the rise floors at 45 minutes and warmth costs this dough more. The first counted bake at any size retires the seed (§6, step 4). Bake 2 is logged with phase times and a measured bowl, so it will test this directly. Nothing in the vectors, the regression test or the app-default gaps moves.

Two knock-ons are recorded, and neither changes anything now:

- **`0.33 × FF` holds only near FF 14.** At mid-range times, C and D carry 4.5325 °F by the rates: 0.32 of 14, but 0.42 of 10.79. If the log settles well below 14, the probe formula's remaining-friction term should come from the rates and the nominal C and D times. That is a recipe decision for after bake 2 (⚠️ in §4.6, and a sentence in recipe §8).
- **The 120 °F warning fires below FF 10.23** at the hot corner (3 × 240 g, biga 45, room 60, where 14 gives 108.68). §4.4 and §5 now say "a low logged FF" in place of "a user-entered calibration FF", which no longer exists.

## 2. What a bake stores (your §3)

**Yes, drop both stored fields.** Store the readings and solve on read. The seed's history is the reason, as you say. §10 now has the schema; it follows your table, with these changes:

- **`n_mix` and a formula snapshot.** Store `HYDRATION`, `SALT`, `BIGA_FRACTION`, `BIGA_HYDRATION`, `OVERAGE` and each phase's speed. Physical constants (specific heats, `BOWL_MASS_G`, `FRICTION_RATE`) re-solve from current code. Formula constants don't: they set what was in the bowl, and the recipe plans 80% biga, 100% biga and 72% hydration. `n_mix` depends on capacity constants. Only bakes whose snapshot matches the current formula and speeds feed the FF in use.
- **`phase_seconds`** for A–D (§3 below). Also `bowl_state`, `mix_index` and `excluded`.
- **An `entered` flag on every reading**, meaning typed or confirmed on the day as against left at a default or prefill. §5's rules need it. A biga left at 58 is the same problem as a prefilled bowl, with five times the leverage.

**§4.8's `T_actual` is the mean of the mixes' final readings, not the last one.** The mixes are equal masses in one tub, so their average is the tub's temperature. A mix not yet read counts at `DDT` (planning mode), so the rise updates as readings arrive. At 12 × 265 g, readings of 73.0 and 75.0 give 74.0 and a 72.5-minute rise; the last reading alone gives 62.9. Drift in the tub during the stagger is unmodelled. `{finalDoughTemp}` prints the mean, and `bulk-3`'s `nMix > 1` block gets one sentence saying so.

Your sensitivity table reproduces exactly (`TOT/Ct`, `Cb/Ct`, `Cw/Ct`, `C_bowl/Ct`, `Cf/Ct`, `Cs/Ct`), as do the 12-ball equals 6 column and your room point. §10 cites it as the reason for the required readings.

## 3. Phase durations (your §4)

1. **Yes, the solve needs them.** `ffNominal = FF − Σ FRICTION_RATE[speed] × (actual − reference)`. Both sides are dough-only, so it takes **no `Ct/TOT` factor**. It goes in §4.3 beside the solve. Your 2.905 and 3.78 reproduce, and they are in §4.3 as the reason.
2. **The reference is the middle of each printed range: A 3.5, B 5.5, C 3.5, D 52.5 s.** Derive each from its timer's range. It is the profile the documents already call nominal: the recipe's "nominal Phase C is 3.5 min", and `mix-5`'s −1.5 / +1.9 at 6 balls, which run from 3.5. The 0.33 doesn't pin a reference. Mid-range C and D are 0.32 of FF 14, and 0.33 is the recipe's "about a third".

- **Only the 30% rate has been checked against a bake.** Bake 1 suggests the 15% and 20% rates run high: by its probe at 11 minutes the dough had risen 7.37 °F (dough-only, from a no-friction blend of 60.85, heat of hydration included), against about 9.0 from the rates alone. Across A's and B's printed ranges the correction is at most ±0.375 and ±0.43, so a rate a third off costs under 0.15. Normalize all four phases anyway.
- **Pauses aren't normalized.** The rest has its own timer, and nothing measures a pause.
- **Capturing the stop is yours.** A mix with a phase time missing doesn't count (§4 below).
- **Expect times outside the printed ranges.** The recipe now tells the baker to run each phase to its cue and let the timer record it, so don't clamp a duration to its range, and keep A and B especially open: those are the ranges bakes 2 and 3 may move. When a range moves, the reference moves with it, and every logged bake re-normalizes.

## 4. From history to the FF in use (your §5)

Spec §6 Panel 3 has the rule and §10 the counting rules.

1. **Aggregate.** Average each bake's counted mixes first, so a split batch counts once. Then take the mean of the last three bakes at that size, or of all of them if there are fewer. Three is the upper end of the recipe's two to three per size. Recency also tracks a room effect before the regression can.
2. **Confidence.** Badges by source, with copy in §6. `measured {date}` at one bake. At two, a mean with a spread. At three, `calibrated`. From two bakes on, the badge shows the spread (max − min of the per-bake FFs). Borrowed values say where they came from.
3. **Exclusions.** A mix counts only if room, biga, bowl, water used and final were all entered on the day (flour may follow room). All four phase times must be captured, the snapshot must match, and Dave must not have excluded it. Nothing else is excluded automatically. Dave's switch covers a tripped motor protection and the like. Every mix stays visible in the log with the reason it doesn't count.
4. **An unmeasured bowl leaves the mix out; weighting can't fix it.** The error has a direction. The cold prefill is the post-tearing biga reading, about 5 °F above the bowl on bake 1's evidence, and the warm prefill is an upper bound. Both understate FF: 0.55 at 6 balls per mix, 1.09 at 3. **Bake 1** is the seed until the first counted bake, then leaves the FF in use. The seed ships in code, not in the repository, so a new device and a friend's browser start from it.
5. **Room slope.** Fit and report `b` from 8 counted bakes at a size, with the count and the room range. Don't apply it. The probe formula's rest term already models part of it (+0.2 °F on the thermometer per °F of room, which is +0.24, +0.22 and +0.21 of FF at 3, 6 and 9 balls per mix). An applied `b` would also move `0.33 × FF` with room, so the probe formula needs rederiving first.
6. **Sizes without history.** Interpolate linearly between the nearest counted sizes on either side. On one side only, hold the nearest counted size flat. Never extrapolate. With no counted bake anywhere, today's behaviour holds (14.03 at 6, 14.0 elsewhere). Under the bowl model a normalized FF is the same at every size, so borrowing is the model's own prediction. If the bakes say otherwise, interpolation follows them. Your nineteen keys reproduce, as do the eight fractional sizes at 265 g with one batch each. §6 cites them as the reason for step 2.

**Not asked, but needed:** a session keeps the FF it started with. A split batch's first mix mustn't move the next mix's target, so the session's mixes join the history once its last mix is logged. Compare keys as `(balls, nMix)`, not a rounded float.

Pins for all of this are in a new §5 subsection, *Bake log*.

## 5. Panel 3's FF field (your §6)

**Remove it, with no manual override.** Nothing on the dough side needs one. Each case I can name (a bad reading, a tripped motor, a phase gone wrong) is an exclusion, and a typed value would silently outrank the measurements. The DDT override stays.

## 6. Storage wording (your §2)

Reworded in the three places you named: §2 (split into three bullets), §6 Panel 3 and §10. There was a fourth: §12 step 2 said "URL + localStorage state". §2's "no server, no API" now reads "no server of its own", since the log calls GitHub's API.

## 7. Phase cues, and where Phase C stops (Dave's ask)

Dave asked what ends each phase, and when temperature should stop the mix. Two gaps, both closed in rendered content:

- **Phase B had no end cue**, only "let each addition absorb". `mix-3`'s summary now ends "and the last before you stop", and it gets a `watchFor`: *No free water, no dry flour, one cohesive mass.* The recipe's new "run A, B and D to their cues" needed it.
- **Phase C's limits are now stated.** The look sets the shortest Phase C and 5.5 minutes the longest; the probe picks the time in between. That is a new paragraph in `mix-5`'s detail. `mix-4`'s "More than 2 °F off" row said "accept the miss" without saying how long to run Phase C; it now says to use the full range (2 min if high, longer if the dough isn't smooth and glossy yet; 5.5 min if low), then accept what's left. The new 2 and 5.5 are the same literals as the row above and `mix-5`'s existing detail. `PHASE_C_MAX` is unchanged.

**No temperature stops the mix.** Development wins, as the recipe already said; stopping early only stops adding about a degree a minute. The recipe (not rendered) now states how much warmth the schedule absorbs: the ball rise reaches its 45-minute floor at 5.093, 2.985 and 1.044 °F over DDT with one, two and three mixes (§4.8's clamp, less half the stagger), printed as about 5, 3 and 1.

## 8. Changes by document

### Spec

| Section | Change | Figures added / removed |
|---|---|---|
| §2 | Storage (three bullets), "no server of its own" | none |
| §3 | `DEFAULT_FF` comment | + 6.5 |
| §4.3 | Normalization block | + A 3.5, B 5.5, C 3.5, D 52.5/60; 2 to 5.5; 2.905; 3.78 |
| §4.4 | Warning guard wording | + 3 × 240 g, 45, 60, **10.23** |
| §4.6 | ⚠️ `0.33 × FF` note | + 1.08 × 3.5 + 0.86 × 52.5/60 = 4.5325; 0.32 of 14; 0.42 of 10.79 |
| §4.8 | Split-batch `T_actual` | + 12 × 265 g; 73.0, 75.0 → 74.0, 90, 72.5; last-only 80.4, 62.9 |
| §5 gaps | "Until the log has a counted bake…" | wording only |
| §5 regression | ⚠️ note | + 6.5, 18.5, 13.375, 10.791045, 14.03 |
| §5 reachability | guard wording | + 10.23 |
| §5 *Bake log* (new) | pins | + 14.031045, 10.791045; 0.7075 (A 4, B 6, C 2 min, D 60 s); 11.0, 11.4, 10.6, 11.0, 10.4 → 11.2, **10.666667**, spread 0.6; 3 at 11.0 and 9 at 12.2 → 6.5 reads **11.7**, 10 reads 12.2; 14.03 / 14.0; 74.0, 90, 72.5; 73.5, **77.4**; 108.68, 10.23 |
| §6 Panel 3 | Rewritten | − the typed field's default 14.0, "13 balls → 6.5", the `{6: {…}}` seed form; + `{ k: 6, value: 14.03, date }`, the badge table, three bakes, 5.5, 6.5, 7.5, 8.5, 6⅓, 6⅔, 7⅓, 7⅔, 11 to 23 balls, 6.5, 3, 3.24, 45-minute floor |
| `mix-3` (rendered) | Summary: "and the last before you stop"; new `watchFor` | none |
| `mix-4` (rendered) | "More than 2 °F off" row | + 2 min, 5.5 min |
| `mix-5` (rendered) | New paragraph: the look sets the shortest Phase C, 5.5 min the longest | + 5.5 |
| `bulk-3` | One sentence (rendered) | none |
| `friction-factor` (rendered) | New paragraph; "stays near 14" → "the solved FF comes out the same at both … (at FF 14, 11.5 vs 13.0)"; measuring and "things to watch" updated | + 6.5, 3; − "near 14" |
| §10 | Rewritten (title now *Bake log*) | − the full schema, `bowl_mass_g`, `ff_measured`, `predicted_mix_temp_f`, `localStorage`; + 14.04, 14.031; 1.11 vs 1.08; 11 min, 7.4, 0.75, 0.86, 9.0; 0.375, 0.43, 0.15; 1.22 / 1.11 / 1.07, 0.53, 0.33, 0.22 / 0.11 / 0.07, 0.13, 0.005; 5 °F, 0.55, 1.09; 8–10, 8; +0.2, +0.24 / +0.22 / +0.21. Kept: 2.5 / 1.4 / 0.95 / 0.93, 1.5–2.5 |
| §12 | Step 2 wording | none |

### Recipe

| Section | Change | Figures added / removed |
|---|---|---|
| §6 *Friction factor: measured* | ⚠️ bake 1 ran long, plus why the seed stays; "stays near 14" → "the same at both … (at FF 14, 11.5 vs 13.0)", compare only once corrected | + 6.5, 3.5, 18.5, 13.4, 1.08, 3, 3.2, **10.8**, 2⅛, 2.9, 1.9, 45 |
| §6 *Measuring* | "from a mix that ran long"; the time-correction sentence, only 30% checked; "Re-measure whenever you change the routine" → "A change of speeds needs new bakes" | + 30% |
| §7 split batches | New bullet: time the rise from the average of the mixes | none |
| §6 *Measuring* step 2 | "Run the mix profile in §8 exactly" → each phase to its cue, times recorded, don't cut a phase short to fit the table | none |
| §8 Stage 2 | New paragraph: the times are expectations, not stops; bake 1's A and B ran long; Phase C is the temperature lever | + 11, 8–10 |
| §8 Stage 2 table | Phase B: "Done when" the last addition has absorbed; Phase C: the look sets the shortest, 5.5 min the longest | + 5.5 |
| §8 *Reading the probe* | 0.33 assumes an FF near 14; "More than 2 °F off" row as in `mix-4`; two new paragraphs: Phase C's limits, and how much warmth the schedule absorbs | + 4.5, 14; 2, 5.5; 45, 5, 3, 1 |
| Quick card | FF line split in two | + 6.5, ~10.8, 3.5 |
| §12 bake 1 | Phase C row: probably stretched for a low probe (Dave's recollection); "~15 nominal" → 13.4 at mid-range (15 at the top); Phase C correction; new bullet on the A and B rates; *Next* reworded | − ~15 nominal; + 4.3, 71.8; 13.4, 15, 3, 3.2, 1.08, 3.5, 10.8; 11, 7.4, 0.75, 0.86, 9 |
| §12 Tier 1 / Tier 2 | "on a 6.5-min Phase C"; "every mix" → "every bake"; regression on corrected FFs | + 6.5 |
| §12 *Log schema* | Per-mix block; FF solved, not stored; the correction | − `bowl_mass_g`, `phase_c_seconds_actual`, `phase_c_seconds`, `ff_predicted_mix_temp_f`, `ff_measured`, the duplicate `biga_temp_at_mix_f`; + `n_mix`, `mix_index`, `bowl_state`, `phase_a/b/c/d_seconds`; 0.75, 0.86, 1.08; 3.5, 5.5, 3.5, 52½ s; 5.5 → 2.2 |

## 9. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `f75dd0bdc05ae1c63cee514ebc6fb065dc4f049c453b2509e8d7d36991496ed9` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `762388c46bd8c843f3c87103b170de6f111965ee281a59b4ff0f9d483ad8568d` |
