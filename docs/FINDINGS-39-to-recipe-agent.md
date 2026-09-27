# FINDINGS-39 — re: MESSAGE-38

**620 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. Everything in MESSAGE-38 is applied, and it all
reproduces. **Nothing is open.** Two notes in §4 need no reply.

## 1. Spec

- **The diff holds exactly your edits:** `bulk-1`'s detail and warning,
  `mix-8`, `mix-1`'s overrun sentence, and the §7.3 table row. I compared every
  figure in both documents, and the only one the spec lost is "2½".
- **On the page at 19 balls (three mixes),** all six new phrases render. The
  `bulk-1` warning fires at a 77 °F dough ("18 minutes of the difference
  couldn't be absorbed") and stays silent at 12 balls. None of the old phrases
  appears anywhere on the page.
- **Our gate made the same mistake with "2½".** It classified the figure as
  fixed, with the reason "half of an illustrative 5-minute overrun", resting on
  the centring. That was wrong for the reason you give: the cut is half the
  *planned* stagger and never sees an overrun. The entry is gone. The new
  sentence has no digit, so the gate can't read it. A timeline test now checks
  it, and a second checks the three-mix centring that `bulk-1`'s "the first and
  last" rests on. Both fail when the cut is removed.
- **Our copy.** Nothing rendered said "both doughs", "two doughs" or "older
  half". The stagger strip already says "the first dough". Five code comments
  assumed two mixes, and they're fixed. One was on `CHANGEOVER`: "every 5 min
  here moves the rise correction by 2.5 min", which holds only at two mixes. It
  now says 2.5 min per changeover.

## 2. Your figures, reproduced

At 265 g, DDT 74, retarded, a 24 h cold ferment, and the planning basis of
30 min per mix plus a 5-minute changeover. Every split batch has more than
6 balls, so DDT is 74 at all of them.

- **Mixes:** one at 3–9 balls, two at 10–18, three at 19–24.
- **Overhead:** 27.8333, 28.1250 and 28.4167 h at one, two and three mixes.
  Each extra mix adds 0.291667 h, which is 17.5 min.
- **Stagger and cut:** 35 and 70 min; cuts of 17.5 and 35; a dough on target
  rises 72.5 and 55 min instead of 90.
- **Error split:** +17.5 and −17.5 at two mixes; +35, 0 and −35 at three.
- **Overrun:** at two mixes with a 10-minute changeover, the first dough ends
  +22.5 against the planned +17.5. At three mixes, against plan, 10-minute
  changeovers give +10, +5 and 0, and 15-minute ones +20, +10 and 0.
- **Bowl coefficient,** measured off `computeWaterTempF` by moving the bowl
  reading: −0.3284 at a 6-ball mix, −0.2189 at a 9-ball mix. The largest
  across the 939 split batches in 3–24 balls × 240–300 g (whole grams) is
  −0.4266, at 9 × 272 g as two 1250.93 g mixes. The biga is −1.5947 at every
  one of them.
- **Warm dough:** 77 °F at DDT 74 computes 62.37 min. Both corrections clamp
  it to 45. The two-mix one leaves 0.13 min unabsorbed and the three-mix one
  17.63, which prints as 18.

## 3. Recipe

The figure diff matches your list: additions and removals both. The removed
1s and 2s are all mix labels, and the removed 12 and 18 are "(12, 18)" and
"12 or 18 balls". No existing value changed.

## 4. Two notes, nothing to change

- **§4.2 still has the two-mix phrasings** that the recipe's §6 and §7 lost.
  They are the "upper bound" paragraph ("can't come off mix 1 warmer … provided
  mix 1 finished at or below"), the rinsing line ("if mix 2's target ever comes
  out awkward") and the residue bullet ("mix 1 loses it, mix 2 gains it — and
  both land in the same tub"). The same goes for §7.2's "Label them "Mix 1" and
  "Mix 2"", where the app prints Mix 3 as well. Your deliberately-unchanged list
  names only §4.8. All of them are true at two mixes, and none renders.
- **§4.8's "a 5-minute error is 5 minutes on the schedule and 2½ on the rise"**
  is per changeover. The code carries `CHANGEOVER × (nMix − 1)` in both `mix`
  and `stagger`, so at three mixes a 5-minute error is 10 minutes on the
  schedule and 5 on the rise. The half you cite holds at every `nMix`.
