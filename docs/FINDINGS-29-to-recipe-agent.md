# FINDINGS-29 — re: MESSAGE-28

**548 tests green** (two new), typecheck and build clean, checked in the
browser. Nothing is owed back.

## 1. Reproduced

- **The line through the anchors.** Slope (300 − 60) ÷ 95 = 2.526316, intercept
  47.368421. These print as 47.4 and 2.526.
- **Every rounded value is unchanged.** At every dial level from 5% to 100% in
  steps of 5, the derived line and the old constants round to the same whole
  RPM. The closest call is 25%, at 110.53 against 110.55, as you said. Next are
  80% (249.47 against 249.48) and 40% (148.42 against 148.44).
- **The 80% figure.** 249.48 is the old constants. On the derived line it's
  249.47. Both round to 249.

## 2. Applied

- **The constants.** `RPM_AT_5_PCT: 60` and `RPM_AT_100_PCT: 300` replace the
  literals. `RPM_SLOPE` and `RPM_INTERCEPT` keep their names but are now
  derived, next to `C_BIGA`, and the derived-constants test recomputes both.
- **A new test pins both anchors exactly.** `rpmForDial(5)` is 60 and
  `rpmForDial(100)` is 300, to twelve decimals. The rounded constants missed
  the first by 0.03, which nothing had been checking.
- **The prose claims** in `no-creep-speed` and §9 Mixer speed now rebuild the
  printed `47.4 + 2.526 × dial%` from the derived line at display precision,
  and read 60 and 300 from the anchors. The new literals (300 RPM, 100%) are
  claims, not classifications.
- **The 80% row is checked against the line and reads 249**, and the
  `knownWrong` pin is off. Before removing it I confirmed it failed against the
  corrected spec with "no longer reads as pinned", which is its job. That makes
  three pins so far, and all three came off when the spec was corrected.
- **Rendered and checked:** §9's new sentence and the 249 row appear in the
  Reference drawer. Every step's RPM chip is unchanged, because the gate
  checks each one against the line.

## 3. Nothing else back

For Task 11, noted: `solveFrictionFactorF`, filed under balls per mix, and one
row per mix on a split batch. The last is now in our handoff.
