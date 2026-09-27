# FINDINGS-33 — re: MESSAGE-32

**613 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. Everything in MESSAGE-32 is applied, and nothing
in the spec is wrong. There are two notes, neither pinned: one on how `bulk-3`'s
new block reads at `nMix` 2 (§3), and one on the §4.10 ⚠️ (§4).

Unless stated, figures are at 265 g balls, room and flour 70 °F, biga 58 °F,
FF 14, retarded, with the final dough at DDT.

## 1. Reproduced

- **`{ballRoomMin}`.**
  - 72.5 min at `nMix` 2 (12 or 18 balls), and 55 at `nMix` 3 (24 balls).
  - 24 balls at a measured 76 °F (DDT 74): 71.2 min unshortened, 36.2 after the
    correction, held at 45 min.

  The old pinned test now asserts equality at all three, on both schedules. The
  floor case is itself asserted to be at the floor, so it can't quietly stop
  testing it.
- **The count table.** The test reads your table and asserts equality at 20 / 28
  / 36. It failed on the old row.
- **The new literals.**
  - "45 minutes" is checked against the clamp's floor.
  - Each mixer phase's summary duration is now checked against its own timer,
    so the two can't drift. `mix-7`'s "45–60 seconds" moved from a classified
    literal to a checked one.
  - The four timer labels are classified as the recipe's phase times, the one
    source.
- **The wall-clock bases don't move.** FINDINGS-11 found that the 23.9 min
  nominal basis already took Phase D at 52.5 s, the midpoint of 45–60 s. The
  maxima basis still takes 60 s.
- **The `MAX_RUN_MIN` profile** now reads the timers. It gives A 4 + B 6 + C 5.5
  (Phase C's ceiling) = 15.5 min, as before.

## 2. Applied

- **`bulk-3`.** One engine function now gives the planned ball rise. It drives
  the timeline's stage, `{ballRoomMin}`, copy-as-text and the
  final-temperature hint.
- **Two more places printed the unshortened figure.** Both are ours, not §8:
  - copy-as-text's "Room time", which mirrors `bulk-3` since MESSAGE-24;
  - the final-temperature hint under `mix-7` ("…which gives 90 min at room
    temperature").

  At 12 balls both now read 73 min.
- **Timers on the mixer phases.**
  - The generator now refuses a `**speed:**` line it can't parse. Its old
    pattern required minutes, so on this spec it silently dropped all four
    speed fields. The verbatim test would have caught it, but now the
    generator refuses too.
  - Both timer parsers read "45–60 s" as 0.75–1 min. A new test requires the two
    to agree on every fixed label. The timer control reads "Start 45–60 s
    timer", then counts down from 0:45.
- **Speed chip.** It is back to "20% · 98 RPM". The test that required no speed
  step to have a timer now requires all four to have one, and no chip to repeat
  it.
- **`biga-4`'s classic summary** and **`biga-4b`'s title** are as specified.

## 3. `bulk-3`'s new block at `nMix` 2: the printed arithmetic doesn't close

At 12 balls the block reads *"a single mix would rest 90 min … takes up to 18
minutes off"*, and the summary above it says **73 min**. A reader who subtracts
gets 72.

- **Why.** `{staggerHalfMinutes}` prints 17.5 as "18", and 72.5 prints as "73".
- **Why it's still true.** "Up to" covers it, since 17 minutes are taken. At
  `nMix` 3 the figures are exact (35).
- **How often.** Every time the unshortened rise rounds down:

  | Final dough | Block's subtraction | Summary |
  |---|---|---|
  | 74.5 °F | 85 − 18 = 67 | 68 |
  | 75 °F | 80 − 18 = 62 | 63 |

If you want it to close, print the half stagger as 17.5; 90 − 17.5 rounds to 73.
`bulk-1` prints `{staggerHalfMinutes}` too, beside `{staggerMinutes}` (35), so
the same token would change in both places. It's your call, and nothing is
pinned.

## 4. The §4.10 ⚠️ on what `bulk-3` did before

It says every split batch ran its rise "17.5 min long at `nMix = 2` and 35 min at
`nMix = 3`". Those are the figures away from the floor. At the floor the
overrun was smaller: 24 balls at 76 °F timed 71 min against a planned 45, 26.2
min long. "Up to 17.5 / 35" would cover it.
