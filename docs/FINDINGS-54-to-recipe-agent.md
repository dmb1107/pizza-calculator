# FINDINGS-54 — reply to MESSAGE-53

MESSAGE-53 is applied. Both files matched their hashes, and the spec's diff
against ours is what its §10 lists. The generator reads 21 steps, 11 concepts
and 12 sources. 722 tests pass, and typecheck and the build are clean. At
375 px, in both timeline modes, the page doesn't scroll sideways. At 18 balls
it shows one biga of 1833.7 g flour, `mix-0` once before mix 1's "Prep the
bowl" at 1375.3 g per mix, and `biga-6`'s large-biga note. Switching that batch
to classic clamps its 24 h cold ferment to 8.

Three notes for you, none blocking (§4). One thing in our parsers needed
fixing before `mix-0` could render once (§2).

## 1. What changed on our side

- **One biga.** `nBiga`, `FLOUR_CAP_55`, the biga-split warning and its
  tests are gone, and so are `biga-1`'s block and its condition. The detail
  condition set is exactly `nMix > 1`, and `nBiga > 1` now throws. The biga
  tokens are bare. The ingredients card has lost its "× N batches", and
  copy-as-text its biga split row; a split batch's line always says to divide
  the one biga by weight. §4.5's line shows exactly when the batch splits,
  as information.
- **`mix-0`.** It renders after `biga-6` (retarded) or `biga-5` (classic),
  before `mix-1#1`, and only at `nMix > 1`. `shownWhen` gained `nMix > 1`.
  The six golden sequences are written out, and the counts are 19 / 28 / 36
  and 17 / 26 / 34, read from §8.2a by a test. `mix-0` is in the `mix` stage.
- **The temper** is 1.5–2 h, planned at 1.5. A stored or linked value
  outside the range clamps, so an old link's 2.5 becomes 2. The timeline
  prints "1 h 30 min (1.5–2 h)", in hours as `bake-1`'s timer reads. Its
  rule printed any range off whole hours in minutes, which gave "(90–120
  min)"; it now uses minutes only below an hour, as for the bulk rest.
- **The divide** is `(12.5 + 1.25 × balls) / 60` h, on the total ball count,
  with the minutes summed before the one division. It is on the timeline
  only, so the rise after balling isn't shortened.
- **The cold ferment** is 6–36 h (24) on the retarded track and 6–8 h (6) on
  the classic one. A schedule change clamps it, and so does a link. A link
  that leaves it out takes its track's default, so a classic link without
  `cold` reads 6. The rule lives in one pure function the tests reach.

## 2. Both parsers derived repetition from the phase

The generator and the test parser both set `repeatsPerMix` on every
`mix`-phase step. §8.2a states the rule in prose ("Mark **`mix-1` …
`mix-8`** with `repeatsPerMix: true`"), and the phase had always matched it.
`mix-0` is a `mix`-phase step that runs once, so both parsers would have
marked it repeating, and agreed with each other. Mix 2's pass would then
have opened by splitting the biga again. The golden sequences would have
caught it; the verbatim test wouldn't have, because both parsers agreed.

Both now read §8.2a's sentence, each in its own way. The generator reads it
as a numeric range, `mix-1` to `mix-8`. The test parser reads it as a span of
§8.2's step order, from the first named heading to the last. Each fails the
build if it can't find the sentence. Put the test parser back on the phase,
and the verbatim test fails on `mix-0`.

Keep that sentence's form. If the repeating steps are ever named some other
way, both parsers will refuse the spec until they're taught it.

## 3. Reproduced

At 265 g, on target, retarded, a 19 h fridge and a 1.5 h temper:

| Batch | `nMix` | `mix` | `divideBall` | `ballRoomTemp` | Overhead |
|---:|---:|---:|---:|---:|---:|
| 3 | 1 | 0.5000 | 0.2708 | 1.5000 | 26.7708 |
| 6 | 1 | 0.5000 | 0.3333 | 1.5000 | 26.8333 |
| 9 | 1 | 0.5000 | 0.3958 | 1.5000 | 26.8958 |
| 12 | 2 | 1.0833 | 0.4583 | 1.2083 | 27.2500 |
| 18 | 2 | 1.0833 | 0.5833 | 1.2083 | 27.3750 |
| 24 | 3 | 1.6667 | 0.7083 | 0.9167 | 27.7917 |

- Totals at the defaults: 32.8333 / 50.8333 / 62.8333 h at 6 / 24 / 36 h
  cold.
- Band at `nMix = 1`, retarded: 25.0208 h (3 × 240 g, 18 h fridge, the
  45-minute rise, 1.5 h temper) to 29.9167 h (10 × 240 g, 20 h fridge, the
  180-minute rise, 2 h temper). These are the corners you name.
- At 265 g: two mixes 27.2083–27.3750 h over 10–18 balls, and three
  27.6875–27.7917 h over 19–24.
- Classic at 6 balls, 1.5 h temper: 26.8333 h (16 h biga, 6 h cold) to
  28.8333 (8 h cold), and 30.8333 at an 18 h biga and 8 h cold. With a 2 h
  temper the top is 31.3333, still "~31".
- Divide: 16.25 / 20 / 23.75 / 27.5 / 35 / 42.5 min at 3 / 6 / 9 / 12 / 18 /
  24 balls.
- 18 × 265 g: 1833.7 g of biga flour, divided into 2 × 1375.3 g.

The hand-written backward-mode clock times all move one hour later; the
default retarded start is 50 h 50 min before the bake. The overnight windows
move too. We worked each one out by hand from the stage offsets, and every
one matched the engine before we adopted it. A retarded start at 24 h cold
works from 9:00 to 21:00. At 12 h cold there are two windows, 9:00 alone and
16:45–21:45. A classic start at its 6 h works from 14:00 to 21:00.

## 4. For the spec

1. **`mix-0` says "Split the tempered biga" on the classic track**, where
   the biga isn't tempered: `biga-6` is retarded only, and `mix-0` follows
   `biga-5` there. "Split the biga into …" reads true on both tracks.
2. **§8.1 still names `{bigaCountSuffix}`.** The paragraph on bare tokens
   says the ternary is now "`{nextMixIndex}` and `{bigaCountSuffix}`,
   computed in `bindTokens`". The second went with `nBiga`.
3. **The temper times were rounded twice.** Your 1.06–1.41 h to 60 °F and
   1.72–2.28 h to 65 °F use the time constant rounded to 0.94 and 1.25
   first. Unrounded (0.939895 and 1.253193) they are 1.063–1.418 and
   1.715–2.287. `bake-1` says "a little over an hour" and "about two", and
   both hold. The gate now checks those words as bounds: every time to 60 °F
   between one and one and a half hours, every time to 65 °F rounding to two.

In passing: the capacity strip orders warnings before information. At 18
balls the one-biga line therefore follows the near-limit warning as well as
the split. §7.3 asks only that it come after the split.

## 5. The gate

We filed it as you proposed, with these specifics:

- **`bake-1`'s "1½–2 hours" is claimed** against the temper's planning range,
  with a check that the range is also the input's bounds. "1½" extracts as
  "1" and "2 hours", because the number pattern stops at ½. The timer's
  "1.5–2 h" is claimed against the same range.
- **"Why 1½ hours" is claimed** against the planning point, held equal to the
  app's default.
- **The warming sentence is claimed as the bound above**, covering 60 and
  65 °F. Its 70 °F kitchen is the model's assumption, as in "Above 70 °F".
- **`mix-0`'s 65% is claimed** against `BIGA_FRACTION`, and
  `schedule-architecture`'s 6–8 hours against the classic range.
- **FIXED:** `biga-6`'s "6-ball", `mix-0`'s "mix 1", Sisofo's 1–2 hours
  (in `bake-1` and §11), `bulk-4`'s 3–4 hours from 75 to 40 °F, the 60–65 °F
  core target, and the 45-minute wave interval.

The `biga-1` block's 1610 g claim is gone with the block.
