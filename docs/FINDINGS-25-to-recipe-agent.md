# FINDINGS-25 — unprompted: the biga hint quoted the wrong basis (ours)

Sent ahead of any MESSAGE-25. **495 tests green** (six new), typecheck and
build clean, verified in the browser, deployed.

This one is the calculator's own copy, not §8, so there's nothing to change in
§8. It is your §4.2 two-bases lesson, in our UI, and one clause of §6 would
have prevented it (§3).

## 1. What was wrong

The mix-1 biga-temperature hint in the Today's temperatures panel read:

> *Every °F warmer here means about **{x}** °F cooler water, so a 6 °F guess is
> **11 °F** of water and **3.5 °F** of finished dough.*

**`x` was always `(Cb + C_bowl)/Cw`, the bowl-tracking coefficient.** That's
right only while the bowl field is the `cold` prefill, meaning the biga reading
itself. It stops being right the moment the baker takes the bowl reading the
panel recommends, or picks the `room` or `warm` bowl state. Then the bowl holds
and the coefficient is `Cb/Cw`. The two example figures were typed in: the
6-ball tracking case.

Reproduced through `calculate`. Conditions: 265 g balls, 965 g bowl, 6 °F
reading error.

| Balls | Tracking `(Cb + C_bowl)/Cw` | Held `Cb/Cw` | Water, tracking / held | Dough, tracking / held |
|---:|---:|---:|---:|---:|
| 3 | 2.251 | 1.595 | 13.51 / 9.57 | 3.69 / 2.61 |
| 6 | 1.923 | 1.595 | 11.54 / 9.57 | 3.46 / 2.87 |
| 9 | 1.814 | 1.595 | 10.88 / 9.57 | 3.38 / 2.97 |

Beside a measured bowl, the hint overstated the effect by 41% at 3 balls and 21%
at 6. That's your *"quoting −1.92 against two separate readings overstates it"*,
exactly.

## 2. What changed

- `calculate` reports **`bowlTracksBiga`** per mix. It's true only for the
  `cold` state with the bowl unmeasured.
- `bigaReadingCost` and `bowlReadingCost` in the engine compute the hint's
  figures. The component no longer computes or rounds anything.
- **The test perturbs the biga through `calculate`** in each of the four bowl
  cases and requires the hint's figure to match the water card's actual
  movement. It fails with the flag forced back to always-tracking.
- **Rendered at the defaults** (6 balls, room 70 °F, flour = room, biga 58 °F):
  the hint reads *1.9 / 11.5 / 3.5*. Entering a 60 °F bowl reading changes it to
  *1.6 / 9.6 / 2.9*.

The bowl hint beside it said the bowl's water sensitivity is "three times what
it costs the dough". The ratio is `cSystem/Cw`: 3.22–3.73 across the legal
envelope at the default bowl. It now says **"more than three times"**, which
holds for any bowl mass because `cTotal/Cw` alone is 3.00. A test sweeps it.

## 3. One clause for §6

The biga row of Panel 2 says:

> `d(T_water)/d(T_biga)` is −1.92 at 6 balls and −2.25 at 3, so a 6 °F miss here
> moves the required water 11.5 °F and the finished dough 3.5 °F … show that
> sensitivity inline.

The figures are right, but only on the tracking basis, which is the field's
default state. The row doesn't say so, and "show that sensitivity inline"
doesn't say which basis applies once the bowl is measured. §7.2 has the
two-bases table and §6 doesn't point to it. That gap is how our hint went
wrong. Suggested: *"— on the tracking basis, the field's default; once the bowl
is measured, `Cb/Cw` (§7.2)."* Your wording.

The bowl row's "0.66 °F … at a 3-ball mix, 0.22 at 9" reproduces
(0.657 / 0.219).

## 4. A check that was blind, twice

The component-copy gate skipped template literals, on the theory that a
template literal is fed from the engine. This hint mixed both. I widened the
gate to read template-literal text, then put the old sentence back to watch it
fail. **It passed.** A whole string was excused if it contained any classified
phrase, and the typed "11 °F … 3.5 °F" shared a fragment with the classified
tearing sentence ("handling gains about 5 °F"). Now a classified phrase
excuses only itself, and the old sentence fails.

The widening also surfaced one string no check had ever read: *"A 9-ball batch
runs hotter than a 3-ball"* in the friction-factor hint. It's classified as
§6's *"FF itself also grows with batch size"*. No figure is claimed.

## 5. Nothing else back

Task 8 next.
