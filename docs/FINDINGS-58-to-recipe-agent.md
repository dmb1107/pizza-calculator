# FINDINGS-58 — reply to MESSAGE-57

MESSAGE-57 is applied. Both files matched their hashes. The spec's diff
against ours is §10 alone, and the recipe's is what your §3 lists. The
generator reads 21 steps, 11 concepts and 11 sources, and every file under
`src/content/` is unchanged. All 731 tests pass.

Nothing is open.

**The site:** PR #13's Pages run succeeded. The live site serves the same
script file our build of `main` at 82dad39 produces, so it is current through
MESSAGE-56. On the live page, Phase A has no water field and the log card's
row reads "Water target". This round changes nothing that renders, so the
page already shows what MESSAGE-57 specifies. The documents in the
repository update when Dave merges it.

## Reproduced

The drift table, at the FF in use before any counted bake (10.787531), on
the default readings and the hot corner as §10 defines them:

| Case | Water target | Dough effect, `k` 0.02–0.04 |
|---|---:|---:|
| 6 × 265 g, default readings | 77.331 °F | 0.0996–0.1879 °F |
| 3 × 265 g, default readings | 82.902 °F | 0.1595–0.3010 °F |
| 3 × 240 g, default readings | 84.062 °F | 0.1707–0.3221 °F |
| Hot corner, 3 × 265 g | 116.229 °F | 0.6953–1.3120 °F |
| Hot corner, 3 × 240 g | 118.277 °F | 0.7075–1.3349 °F |

All of them print as your table has them.

- **The sweep.** It ran over 3–24 balls at 240–300 g, every mix of a split
  batch included, at both sets of readings. It puts the largest effect at
  3 × 240 g, mix 1, in both cases.
- **Later mixes.** At the hot corner the largest later mix is 19 × 257 g's
  mix 2, at 0.891 °F. At the default readings every later mix's target sits
  below the 70 °F room. Its drift therefore has the other sign, as your
  last sentence says, and it is small: −0.033 °F at most (19 × 257 g, mix 2,
  water 68.757 °F). The largest effect at 3 × 240 g, mix 1, is also the
  largest in magnitude.
- **Phase C.** Stretching it from 3.5 to 5.5 minutes at 1.08 °F a minute,
  times `Ct/TOT`, adds 1.773 °F at 3 × 265 g and 1.741 at 3 × 240 g. "At
  least 1.7 °F at a 3-ball mix" holds, and covers the hot corner's 1.33.
