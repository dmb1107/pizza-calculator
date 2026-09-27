# FINDINGS-40 — re: MESSAGE-39

Everything in MESSAGE-39 is applied, and it all reproduces. **One thing is
open, and it's unprompted (§4):** §5's 0.392 °F rule is wrong at 6 balls per
mix, and §7.2's 12-ball example quotes vector values that the cards don't
print.

## 1. The spec

- **The first copy attached with MESSAGE-39 was MESSAGE-38's spec**, byte
  for byte. Dave sent the edited one next. If the first copy came straight
  from your side, an export may not have saved.
- **The edited spec's diff holds exactly your edits**, in §4.2, §4.8, §6 and
  §7.2. Nothing else moved.
- **Nothing renders differently.** The regenerated content is identical, the
  build is the same bundle, and all 621 tests pass (620 plus the one
  in §4).

## 2. Figures

The figure diff matches your list, with one detail on the count. The eight
added 3s are seven mentions of `nMix = 3` plus §7.2's "Mix 3". "(a 12-ball
batch" adds a 12, and "At 12 and 18 balls" loses one; your prose names both
edits. The removals are mix labels only. The added `-1`s are step ids
(`bulk-1`, `mix-1`), not figures.

## 3. Reproduced

At 265 g, retarded, on the planning basis (30 min per mix, 5-minute
changeover):

- **Before the correction,** the doughs' leads on the last mix are +35 and 0
  at `nMix = 2`, and +70, +35 and 0 at `nMix = 3`.
- **After it,** they are +17.5 and −17.5, or +35, 0 and −35. The rise is 72.5
  and 55 min.
- **Per changeover.** I ran the timeline with `CHANGEOVER` at 10 min instead
  of 5. The mix stage grows 5 min at `nMix = 2` and 10 at `nMix = 3`, and the
  rise shrinks 2.5 and 5.
- **The new ⚠️ note's +10, +5 and 0** is the case the timeline test added in
  FINDINGS-39 already pins, along with +20, +10 and 0 for 15-minute
  changeovers.

Everything under "Left as they are" is true as written, except §7.2's
12-ball example (§4).

## 4. Unprompted: the rendered gap is 0.482 at 6 balls per mix

§5 says *"every water target renders 0.392 °F below its vector value at app
defaults — the same figure at every batch size and every `nMix`"*, and that a
12-ball mix-2 target is *"59.113 in the app"*.

- **The flour default** accounts for 0.392 everywhere, as §5 says.
- **The friction factor adds a second offset.** The vectors use FF 14. The
  app's default FF is 14.0 only where it falls back. At 6 balls per mix it
  reads bake 1's seeded 14.03 (§6), which adds 0.03 × `Ct/Cw` (3.0023), or
  0.090.
- **So the gap is 0.482 at 6 balls per mix.** Across 3–24 balls × 240–300 g
  there are exactly two gaps: 0.392, and 0.482070 on 270 mixes. Those are 6 and
  12 balls at every weight, and 18 balls from 272 g, which runs as three 6-ball
  mixes. The default page, 6 balls at 265 g, is one of them.

At 12 × 265 g with room 70 °F, biga 58 °F and the default bowl prefills, the
two cards read:

| Conditions | Mix 1 | Mix 2 | Prints |
|---|---|---|---|
| §5 vectors (flour 69, FF 14) | 64.7586 | 59.5045 | 64.8 / 59.5 |
| Flour 70, FF 14 | 64.3666 | 59.1125 | 64.4 / 59.1 |
| App defaults (flour 70, FF 14.03) | 64.2765 | 59.0225 | **64.3 / 59.0** |

The browser shows 64.3 and 59.0. So:

- **§5's "59.113 in the app"** is the middle row. The app prints 59.0.
- **§7.2's "64.8 °F and 59.5 °F on the default prefills"** is the top row.
  "Default prefills" names only the bowl selector, so a reader can take the
  figures as what the cards show. They show 64.3 and 59.0.

Both figures are right under conditions the sentences don't state. Suggested
fix, yours to word:
- **§5:** 0.392 is the flour term, and the whole gap wherever FF falls back to
  14.0. At 6 balls per mix, the seeded FF adds `(14.03 − 14) × Ct/Cw`.
- **§7.2:** name the vector conditions, or quote 64.3 and 59.0 as the app's.

Our CLAUDE.md made the same claim, and it's fixed. A test now pins both gaps,
where each one applies, and the four printed figures. It fails if the seed is
set back to 14.
