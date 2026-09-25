# FINDINGS-30 — re: MESSAGE-29

**579 tests green** (19 new), typecheck and build clean, checked in the browser
at phone width. All three changes are applied. One requirement came from the
spec rather than the message, and I took it (§3). Three choices of mine are
yours to overrule (§4).

## 1. Reproduced

Swept 3–24 balls × 240–300 g.

- **The dough limit binds first:** `FLOUR_CAP_66 × DOUGH_YIELD` = 2600.64 g. No
  batch splits on the flour cap first.
- **The biga's flour cap binds first:** `FLOUR_CAP_55 × 1.5` = 2415.00 g. No
  biga splits on dough mass first.
- **The below-minimum guard never fires.** The smallest single mix is 735.84 g
  (3 × 240 g). The smallest split is 1250.93 g.
- **The near-limit message fires at exactly 9 and 18 balls** at 265 g
  (2437.47 g per mix, printed 2437.5). Across all ball weights it also fires
  at 8, 10, 16, 17, 19, 20 and 24 balls. §7.3 only claims the 265 g pair.
- **Segment counts are dial ÷ 10:** ½, 1½, 2, 3, 4, 8.

## 2. Applied

**Speed.** Each speed step now shows a drawn indicator: ten segments in a row,
full or half-filled. Below it, "1½ lit segments", then "15% · 85 RPM" smaller.
The five §8 sentences and §9's new column regenerate from the spec. The gate
rebuilds every segment count from the step's dial. It computes dial ÷ 10 on its
own, not through the app's formatter, so a formatter bug can't agree with
itself. Its ceiling check reads `mix-7`'s new "Never above 4 lit segments (40%,
148 RPM)" and requires 4 = 40 ÷ 10 as well as 148 on the RPM line. No setting
number appears anywhere.

**Bowl mass.** `BOWL_MASS_G` is a constant. The field, its persistence and its
URL key are gone. A stored value or an old link with `bowl=` is ignored, and
tests pin both. `{bowlMassG}` binds the constant. The engine tests that vary
bowl mass stay, going through `computeThermal`, because they test the model's
structure rather than an app case.

**Capacity.** The four blockquotes, the input-level minimum line, §4.5's "Mix
one biga…" line and §6's split hint are generated from the spec, verbatim.
They bind through the token table, so the five new tokens count as used, and
their numbers answer to the gate:
- "5%" is claimed against `NEAR_LIMIT_FRACTION`.
- "3 balls" is claimed against `MIN_BALLS`.

At 3 balls, "−" now shows the minimum message below the field instead of
disabling. "+" clears it. The split hint "→ 2 mixes of 1625.0 g" sits beside
the ball count whenever the batch splits. Both appear below the tap point,
following the rule from Task 10 that nothing may appear above it.

The binding-limit tests you asked for are in: each fails if the other limit
ever binds first. The guard sweep is in too.

## 3. A requirement the spec carries and the message didn't

§7.3 says *"Each condition below is evaluated on the values the app displays."*
Implemented: near-limit and below-minimum compare the **printed** per-mix
dough. A test pins the edge. 2374.96 g prints "2375.0", which is exactly
0.95 × 2500, so the message fires. 2374.94 g prints "2374.9", so it doesn't.
Deciding on the unrounded value fails that test. I checked.

## 4. Choices that are yours to overrule

- **Minutes in the chip's secondary line.** §7.5 says "20% · 98 RPM". I show
  "20% · 98 RPM · 5–6 min". None of the four speed steps has a timer chip, so
  without the minutes the duration would appear only in the summary sentence.
  Say if you want it dropped.
- **Severity.** Split, biga split and near-limit render as warnings (amber).
  §4.5's one-biga line is information. Below-minimum is an error, though it
  can't fire in range. §7.3 names no severities.
- **"½ lit segment", singular.** It occurs only in §9's table today, which
  prints the bare count ½, so no chip renders it.

## 5. Found on our side

The old engine warnings were typed, and the gate couldn't read them. One
carried §4.5's commentary into the UI: *"That's a genuine convenience, not a
compromise"*. It was your remark about the 12-ball case, not a line for the
baker. It's gone now. The strip shows only the line §7.3 quotes.

## 6. One unlisted recipe edit

The recipe's opening line changed too, and the message doesn't list it: FF
"*may* change" with mix scale, "an untested hypothesis". It's MESSAGE-25's
relabel reaching one more sentence. It's consistent and doesn't render, so
nothing is needed. Noting it only because the diff showed it.

## 7. Open, for Task 10

The indicator's geometry. It's drawn as a straight row of ten, as you
suggested. Dave checks it against the mixer.
