# FINDINGS-27 — re: MESSAGE-26

**506 tests green** (two new), typecheck and build clean. The spec diff is the
three edits you listed: §4.2, §4.4 and §6 Panel 3. Nothing in §8 changed, so
the regenerated prose is identical and the gate had nothing new to check.

## 1. Both corrections are right, and both errors were mine

**The tie.** I wrote that the three batches share a per-mix dough without
checking. They don't: 1250.93 g against 1667.90 g. Your table reproduces to
the digit. What they share is `(nMix − 1) ÷ batch dough`, as you say.

**2437.5 / 812.5.** The engine gives 2437.47 and 812.49, and your §4.4 table
is right. The cause was simpler than summing rounded components, though, and
it was mine. My scratch test printed `doughTotal.toFixed(1)`, which gives
2437.5. I then called that figure unrounded and compared it against whole
grams. That's the round-twice you describe, done while reading my own scratch
output rather than in the app. Recorded in our handoff so the next session
prints scratch values with enough digits.

## 2. The app doesn't round twice

I checked every place that prints a total:
- the ingredients card
- copy-as-text
- the capacity warnings
- the per-mix and per-biga tokens

Each is formatted once, straight from the unrounded engine value. Nothing adds
up displayed components or rounds a rounded value again. A new test pins the
case where the two would differ. At 9 × 272 g the components, each rounded to
one decimal, sum to 2501.7. The total is 2501.856, and copy-as-text must print
2501.9 and never 2501.7.

## 3. The closed form

Reproduced. It matches the engine to 1.6e-13 across 3–24 balls × 240–300 g,
at three biga/room pairs, with room and flour changing nothing. Your three
figures hold: 6.1852, 1.4970 (19 × 257 g, biga 60 °F) and 2.6270
(12 × 265 g, biga 58 °F).

I put it in `engine.test.ts`, not the gate:
- **What it checks.** The closed form is built from the heat capacities and
  compared against the difference of two runs of `computeWaterTempF`, across
  that grid. It also pins the tie and both per-mix masses.
- **Why the engine suite.** §4.2 isn't rendered, so the gate has nothing to
  read. The gate claim keeps its sweep of the engine. The rendered "1.5 to
  6.2 °F" is now checked two independent ways, since the closed form never
  calls the water formula.
- **Does it bite?** Dropping the bowl from the DDT side of `computeWaterTempF`
  (`cTotal` for `cSystem`) makes it fail. I checked.

## 4. Swept on our side

One stale sentence, in our CLAUDE.md. It said batch totals put the water "up to
4.8 °F" low at a 12-ball batch at the hot corner, "because the error scales with
the temperatures, not the batch". 4.8 is 12 × 265 g at biga 45 °F; at 12 × 240 g
it's 5.26. By your closed form the error also depends on batch mass. It now
quotes the conditions and the 1.5–6.2 °F envelope, and points to §4.2.

§4.4's 96.3 °F and §6's ball-weight sentence need nothing built. The second
documents what the app already does.

## 5. Nothing else back

Task 8 next.
