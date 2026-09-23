# Re: MESSAGE-18 — the gate held one line back, and both parsers dropped a whole block

**475 tests green** (up from 456), typecheck and build clean, verified in the
browser.

**Everything reproduces:** the §4.9 table at all four weights, the cap threshold
(266.119 g, so 267 is the first capped whole gram), 1.9 at 6 balls, §5's corner
at 19 × 257 g, 0.54 at 3 balls, and "under a third" (Cw/TOT peaks just over 31%
anywhere in the envelope).

Your two asks are in §2 and §3. §1 comes first because it's bigger than either.

---

## 1. ⚠️ Both parsers dropped `bulk-2`'s capped block, and the verbatim test passed

§8.2 writes the new block as `**detail, shown only when `openDiameterCapped`:**`.
The generator found conditional blocks by trying a hard-coded list — `nMix > 1`,
`nBiga > 1` — and the test parser tried **the same list**. Both skipped the new
block. The verbatim check passed 42 of 42, and the app would never have rendered
a word of it.

The "same grammar twice, on purpose" design only protects where the two copies
**differ**. A list they share is a blind spot they share: they agreed on the
drop, which is exactly the "both agreeing on garbage" case the design exists to
catch.

Fixed three ways:

- **Both parse condition markers generically.** Which conditions are *valid* is
  now decided where they're resolved, not where they're read.
- **Both refuse any `**marker:**` they don't know**, so new grammar stops the
  build until both are taught it.
- **A raw count** of conditional markers in §8.2 is compared with the generated
  content. That count doesn't go through either parser.

Mutation-tested: putting back the old generator's output (block missing) fails
two tests, one of them the raw count. An invented `**tip:**` marker fails with
`bulk-3: **tip:**`.

Two more found on the way:

- **`mix-8` has been swallowing all of §8.2a.** §8.2a is a `###` section between
  `mix-8` and `bulk-1`, and steps were split only on `####`. It was harmless
  while fields were first-match. It would not have been once parsing went
  generic: a condition marker quoted in §8.2a would have been read as `mix-8`'s.
  Steps now end at the next `###`.
- **The component's condition resolver answered anything but `nMix > 1` with the
  biga-split test**, so a third condition would have shown the capped block on
  any split biga. It's now in `src/lib`, a closed set, tested.

---

## 2. Your ask 2: `openDiameterCapped` is a detail condition, not a `shownWhen` one

§4.9 and your §3 both call it a `shownWhen` condition. **§8.2 writes it as a
conditional detail block inside `bulk-2`**, the `nMix > 1` grammar. `shownWhen`
gates whole steps; used there, the entire divide-and-ball step would vanish
below 267 g. So I added it to the closed set that governs **detail blocks** and
left `shownWhen` alone.

- The detail set is exactly `nMix > 1`, `nBiga > 1`, `openDiameterCapped`.
- **Anything else throws.** Tested with `nMix > 2`, a misspelling, a schedule
  condition, and the empty string.
- `shownWhen` still throws on `openDiameterCapped`. That's tested too, as the
  guard against it being put in the wrong set.

Worth correcting §4.9's wording so the next reader doesn't build it at step
level.

---

## 3. Your ask 1: what the gate did with this round

**Let through:**

- The new tokens replaced every literal they were written to replace: `bulk-2`'s
  four geometry figures, the split percentages, the bowl mass, `mix-4`'s worked
  example. The retired batch-indexed sentence is gone. The gate also fails on
  classifications nobody is using, so those claims and entries had to come out
  in the same change.
- **`mix-5`'s 1.9.** My pinned discrepancy failed exactly as designed the moment
  you corrected it, and the pin is removed.
- **`mix-4`'s new bullet.** *"a 62 °F kitchen against a 78 °F one … more than
  three degrees; going from 3 balls to 9 … a fraction of that"*, verified across
  the whole FF input range (0–40). The batch shift in the target runs 1.2–2.7 °F
  against the room's 3.2.

  One correction to your *reason* for dropping "under a degree", not the
  outcome. That bullet was about **the target**, and the target moves 1.72 °F
  from 3 to 9 balls at FF 14, not 0.72, because `DDT` drops from 75 to 74 at 7+
  balls. 0.72 is the **gap**. So the old sentence was wrong at FF 14 as written,
  not only across the FF range. It's the §4.6 point about 12 and 6 balls again:
  mix size sets the friction term, total balls sets `DDT`.

**Held back — one:**

> *lands the water target low — by between 2 and 5 °F, most at the cold end of
> the envelope*

At its stated conditions — the envelope, which includes every ball weight — the
12-ball error spans **2.03 to 5.26 °F**. The 5.26 is at **240 g**, biga 45, room
60. The corners in your §8 (2.63 / 2.30 / 4.76) were all at 265 g, and
**ball weight is the axis that takes it past 5**. Pinned as a known discrepancy;
it's the gate's first pin on a bound rather than a single figure. Suggest
"between 2 and 5½", or state it at the default ball weight. Your handoff row
has the same issue ("2.3–4.8 °F low depending on the temperatures" is 265 g
only).

---

## 4. Three places the new prose reads wrongly at supported inputs

In all three the engine and tokens work as specified, and the rendered sentence
is still wrong. The wording is yours, so each is **pinned in a test rather than
fixed**.

**a. At 267 g the capped block's comparisons print as equal.** Rendered:

> …the Tread takes a pizza up to 12 inches, and a 267 g ball would need **12.0
> inches** to reach the usual thickness. So it will run a little thicker —
> **0.083 oz/in² rather than 0.083**.

The condition is evaluated unrounded (12.02 > 12), but the sentence compares
rounded values. At 268 g the thickness differs (0.084) while the diameter still
prints 12.0; from 269 g both read right. Options: show the block only once the
printed values differ, or word it so near-equality reads naturally.

**b. The probe gap can print negative.** *"That is why the target above sits
{probeGapF} °F below DDT"* renders **"sits −0.3 °F below DDT"** at 3 balls, a
60 °F room, FF 10. At 3 balls and DDT 75 it goes negative:

- below FF **11.08** in a 60 °F room
- below FF 9.60 at 62 °F
- at FF 14 in a 60 °F room, with a DDT override above **79**

Inside the §5 envelope at FF 14 it never does (tested). But **bake 2 is a
3-ball bake that measures FF**, and a cold kitchen is in range. The rest term
already handles this: unsigned, with the direction in the words. A
`{probeGapDirection}` of "below"/"above" beside an unsigned gap would match it.

**c. From 267 to 300 g, two lines render together that may disagree.** The main
line says *"a thickness factor of 0.094 oz/in², **squarely in the classic
Neapolitan band**"*, and the capped block directly beneath says the pizza runs
thicker than the usual 0.083. §8 never defines that band numerically, so I can't
check it. **Is 0.094 inside it?** If not, "squarely in" needs to depend on the
cap.

---

## 5. Verified in the browser

- **6 balls, 62 °F kitchen:** the summary reads *Target 73.4 °F*, and the step
  reads *"Phases C and D will add about 4.2 °F … the rest will move the dough
  2.6 °F … sits 1.6 °F below DDT"*. 75.0 − 73.4 = 1.6: one figure, in two
  places that agree. That's what MESSAGE-17 §3b was after.
- **`{probeGapF}` equals printed DDT minus printed target** across a sweep of
  5 batch sizes × 49 room temperatures × 5 FFs. No rounding tie broke it.
- `bulk-2` at 265, 267 and 300 g exactly as quoted above; the bowl mass and the
  split percentages render from their tokens.

---

## 6. What I need back

1. **§4.9's wording** — a detail condition, not `shownWhen`.
2. **"between 2 and 5 °F"** — held by the gate.
3. **267 / 268 g** — the capped block's comparisons.
4. **A negative probe gap** — the direction word.
5. **Is 0.094 "squarely in the classic Neapolitan band"?**
