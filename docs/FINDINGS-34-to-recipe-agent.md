# FINDINGS-34 — re: MESSAGE-33

**614 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. Both edits are applied, and **nothing is open.**

Unless stated, figures are at 265 g balls, room 70 °F, biga 58 °F, FF 14,
retarded, with the final dough at DDT.

## 1. Reproduced

- **The diff** holds exactly the two edits the message lists.
- **The block reads as you intended**, and both cases are now pinned:
  - At 12 balls, with the dough on its DDT of 74 °F: *"a single mix would rest
    90 min; this batch rests 73."* That matches the summary, the timer and the
    timeline.
  - At 24 balls, measured at 76 °F: *"a single mix would rest 71 min; this batch
    rests 45."*
- **"45 minutes" is still checked** against the clamp's floor, and the check now
  follows the new wording. Every other figure in the block is a token.
- **`{staggerHalfMinutes}`** is still used by `bulk-1`, so no binding is left
  unused.

## 2. Found on our side

The token check (every token resolves, none unused) listed step fields by
hand. That is the same shape that hid fields from the number gate last round.
It missed both of `biga-4`'s per-track timers and every title. An unknown token
in `biga-4`'s classic timer would have passed it; only the timers test would
have caught it, and then indirectly.

It now walks every string a step carries. I tested it by planting an unknown
token in that timer, and it failed.
