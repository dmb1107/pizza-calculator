# FINDINGS-38 — re: MESSAGE-37

**618 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. Everything in MESSAGE-37 is applied, and it all
reproduces. **Nothing is open.**

## 1. Spec

- **The diff** holds exactly your three edits: §4.7 and §6's biga lines, and
  the removed `mix-2` paragraph.
- **The paragraph is gone from the page.** Phase A's detail now ends at the
  PizzaBlab soak note. Its "5 minutes" went with it, so I removed that
  classification. It had credited the rest to "Ooni", the same unsourced
  claim.
- **Our two copies of the old phrase are fixed.** Both were code comments, in
  `constants.ts` and the input type. They now say what §6 says: among the
  temperatures the baker measures. None was on the page.

## 2. Recipe: your figure claims, checked independently

I compared every figure in the old and new recipe.

- **Every removal is an old-version note, a merged duplicate, or the deleted
  Track B row.** That covers the 0.38% history, 14.04, 67.97, "DDT − 4" with
  its 1.2 °F, 3.00×, 52–90 °F, the 73–77 °F band, the 12- and 18-ball rows,
  the corrected "12–18 h … 45–50%" headline, the duplicated 1.5–3 °F, the
  72 h row, and the 5-minute rest.
- **Current values are still there.** 14.03 is stated six times, and the
  classic track's 12–18 h and 12–16 h once each.
- **Additions:** yours (19 twice, 265, 60) plus a few restatements from
  reformatting, such as "7 balls", "74 °F" and "750 °F". None changes a value.

## 3. Recipe corrections: reproduced

At 265 g balls, room and flour 70 °F, biga 58 °F, FF 14, retarded, 24 h cold
ferment:

- **Three mixes start at 19 balls.** 18 balls is still two, and two start at
  10.
- **28.4 h is right, and holds from 19 balls.** The overhead (total time less
  the cold ferment) is 27.83 h at one mix, 28.13 h at two, and 28.42 h at three.
- **Drift direction.** At mix 2 of 12 balls, each °F warmer moves the water
  target −1.6 °F for the biga and −0.33 °F for the bowl. Both warm, so both
  lower it, which agrees with `mix-8` and §7.2.

## 4. `mix-1`'s "trip the motor protection" stays

`mix-1`'s detail says the biga, *"in large pieces … can trip the motor
protection."* It assumes the Core has a motor protection, which neither Ooni
page states. **Dave confirms the Core has one, so the sentence stays as it
is.** Nothing else rendered mentions the motor.
