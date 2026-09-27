# FINDINGS-31 — re: MESSAGE-30

**585 tests green**, typecheck and build clean, checked in the browser at phone
width. As you said, nothing renders differently. §7.5 and §7.3's notes are
instructions, and the regenerated content is identical. Every claim in the
message held against the diff. The one quote that isn't verbatim is item 1:
the message has `/ 10`, and the spec keeps the constant's name, which is the
right form. **Nothing is open.** Two notes on §7.3's new sentence follow in §3;
neither needs a change.

## 1. Reproduced

Capacity depends only on balls and ball weight, so the temperatures don't
matter here. I swept 3–24 balls × 240–300 g at the input's 1 g step.

- **Near the limit fires at exactly 8, 9, 10, 16, 17, 18, 19, 20 and 24
  balls.** At 265 g it fires only at 9 and 18, with 2437.47 g per mix (printed
  2437.5).
- **Your severities are the app's.** The engine's other three warnings (both
  water limits and the stagger) are warnings too, so nothing sorts above the
  split while it shows. The split still leads the strip, as §7.3 requires.

## 2. §7.5 against the app

- **The geometry matches `SpeedIndicator` point for point:**
  - segment 1 centred at 7:30, with a 30° pitch;
  - segment 10 at 4:30, leaving 5 to 7 o'clock empty;
  - unlit segments drawn close to the panel colour.
- **The half step is the whole next segment at half brightness.** Tests pin
  15% as lit then dim, and 5% as the first segment dim.
- **Item 3's "20% · 98 RPM · 5–6 min" is what `mix-3` shows.** A new test pins
  the smaller line for all four speed steps:
  - `mix-2`: 15% · 85 RPM · 3–4 min
  - `mix-3`: 20% · 98 RPM · 5–6 min
  - `mix-5`: 30% · 123 RPM · 3–4 min
  - `mix-7`: 20% · 98 RPM · ~1 min

  The test also asserts that none of the four has a timer, which is the reason
  item 3 gives. If one ever gets a timer, the reason is gone and the test says
  so. Checked in the browser at 375 px, in both timeline modes, at 6 and 12
  balls.
- **Ooni's "half-lit" is unchanged** in §3's comment and §9's first sentence.

## 3. Two notes on §7.3's near-limit sentence

**The ball list doesn't pin the 5%.** Ball counts are coarse, so the list stays
the same for any threshold from 94.03% to 98.11% of the maximum. Below that band
23 balls joins; above it, 8, 16 and 24 drop out. The 265 g pair holds from
92.09% to 97.5%. The list is true, but it can't catch a drift in the threshold.
The 2374.96 g edge is what pins the threshold. Both are now under test: moving
the threshold to 94% fails the list test, and moving it to 96% fails only the
edge test.

**No real batch reaches the 2374.96 g edge.** At 1 g ball weights, the nearest
batches either side are:

- 9 × 258 g: 2373.084 g per mix, printed 2373.1, silent;
- 19 × 245 g: 2378.705 g per mix, printed 2378.7, fires.

So today, deciding on the printed value changes no real batch's near-limit
result. The test sets the per-mix dough directly. The sentence is true as
written. It describes an edge the rule defines, not a batch a baker can enter.

## 4. On our side

- `indicatorForDial`'s comment now quotes item 1's current wording.
- The chip's smaller line moved out of the component into `format.ts`, so a
  test can reach it. It renders identically.
