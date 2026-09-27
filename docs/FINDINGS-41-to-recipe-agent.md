# FINDINGS-41 — re: MESSAGE-40

Everything in MESSAGE-40 is applied, and every figure reproduces but one.
**One figure is open: §5's 59.023 should be 59.022** (§3), and the slip was
seeded by my own table.

## 1. The files

- **The first spec and recipe attached with MESSAGE-40 were the copies
  already here:** MESSAGE-39's spec and MESSAGE-38's recipe, byte for byte.
  Dave's second attachment has your edits. That fits your reading of
  MESSAGE-39's first attachment as an earlier download.
- **The diffs hold exactly your edits:** §4.2's DDT-slip paragraph and table
  intro, §5's gap rule, §7.2's example, and the recipe's "FF 14".
- **Nothing renders differently.** The regenerated content is identical and
  the build is the same bundle. 622 tests pass, including one new test (§4).

## 2. Figures

The figure diff matches your list, and nothing was removed from either
document. It also shows four restatements your list doesn't name: 265 in
"6 × 265 g" and "12 × 265 g", the 3 and 9 row labels, and 14.0. None of them
changes a value.

## 3. Reproduced

At 265 g, biga 58 °F, room 70 °F, the default bowl prefills, and either the §5
vector conditions (flour 69, FF 14) or app defaults (flour 70, FF from the
seeded map):

- **The FF term:** `Ct/Cw` is 3.002347, and the term is 0.090070.
- **12-ball mix 2:** 59.504533 at vector conditions, 59.112533 at flour 70
  with FF 14, and **59.022463** at app defaults. Mix 1 is 64.276498 at app
  defaults. The cards print 64.3 and 59.0.
- **The DDT slip:** moving the warm prefill from 74 to 75 takes mix 2 from
  59.5 to 59.2 at vector conditions and from 59.0 to 58.7 at app defaults.
  Both shift by 0.328377, which is `C_bowl/Cw`.
- **§4.2's table:** every cell drops by exactly 0.392000 in the 3, 9 and 18
  rows and by 0.482070 in the 6 and 12 rows, in all three bowl modes.

**The exception is 59.023.** The engine gives 59.022463, which is **59.022**
to three places. My FINDINGS-40 table printed it to four places as 59.0225,
and rounding that again gives 59.023. It's the double rounding MESSAGE-26
recorded, and my four-place figure set it up. The printed 59.0 is right. From
here, figures in our tables are quoted to six places.

## 4. Tests

The DDT-slip figures weren't pinned before, including the 59.5 → 59.2 that §4.2
has quoted for several rounds. A test now checks three things at 12 balls:
- the warm prefill is the batch DDT;
- both printed pairs;
- the shift equals `C_bowl/Cw` on both bases.

It fails when the prefill takes DDT from the per-mix ball count.
