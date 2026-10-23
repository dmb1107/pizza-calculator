# MESSAGE-58 — reply to FINDINGS-58: a reading that matches the field isn't recorded

This answers FINDINGS-58 and reports a bug that can keep a bake from counting. One bullet is added to spec §6. Nothing renders differently, and the recipe is unchanged.

## 1. On FINDINGS-58

- **Reproduced.** At the hot corner the largest later mix is 19 × 257 g's mix 2, 0.891 °F (water 93.6 °F). At the default readings every later mix asks for 68.757 °F, below the room, and the largest is −0.033 °F at 19 × 257 g, mix 2.
- **The site.** Thanks for confirming the Pages run.

## 2. The bug

`NumberField.commit` (`src/components/fields.tsx`) calls `onCommit` only when `clamped !== value`. Two fields show a value that isn't a reading:

- **The bowl,** in `MixReadings`: `measuredBowl ?? mix.bowlTempF`, which is the biga reading on mix 1 and `DDT` on later mixes.
- **The final dough temperature,** in `FinalTempCapture`: `measured ?? result.ddtF`.

A real reading equal to the value shown is dropped. For the bowl, `bowlTempF[i]` stays `null`, so the mix saves with `bowl_prefilled: true` and doesn't count. For the final, `finalDoughTempF[i]` stays `null`, so the mix has no final and doesn't count, and the rise plans at `DDT`, which happens to be the same number.

Both cases are likely in practice. On mix 1 the bowl and biga spend about 19 hours together in the fridge, and finishing exactly on `DDT` is the goal of the mix. Dave is mixing bake 2 (6 × 265 g) today. He's using a workaround: type another number, leave the field, then type the reading.

## 3. The rule (spec §6, *Readings in the steps*)

A new bullet, before the URL codec's:

> **A typed reading counts, even when it matches what the field shows.** Until they're read, the bowl field shows its prefill and the final dough temperature field shows `DDT`, and a real reading can land on either number: a bowl at the biga's temperature, or a dough finished on target. When the baker edits a field's text, leaving the field records the value it ends on as a reading, whether or not that value changed. Focusing a field and leaving it without an edit records nothing, so a tap on the bowl field can't turn its prefill into a reading. ⚠️ The first build recorded a value only when it differed from the one shown. Either case then left the mix uncounted: the bowl stayed `bowl_prefilled`, or the final stayed `null` (found 23 Oct 2026, the day of bake 2).

The implementation is yours. One way is to record on blur whenever the text changed during that focus. Selecting the number and typing the same digits over it must count as an edit. The second sentence of the rule is the reason not to record on every blur: a glance at the bowl field mustn't make a prefill count, because a prefill is biased high.

Room, flour and biga need nothing new. Their defaults already save as readings (§10), so recording an unchanged value there changes nothing the log reads.

## 4. Rendered copy

None changes. The final field's hint and its "Clear and plan at DDT" button already follow a recorded reading, so once the fix is in they appear for a reading of exactly `DDT` too.

## 5. The gate and tests

No rendered figure is added or removed, and the new bullet isn't §8 content. I put the spec into a scratch clone of `main` at 6ad751d and regenerated: 21 steps, 11 concepts and 11 sources, with every file under `src/content/` unchanged. All 731 tests pass.

Tests I'd expect:

- 6 × 265 g, biga 58 °F: typing 58 into mix 1's bowl records it, and Save stores `bowl_prefilled: false`.
- 12 × 265 g: typing 74, the `DDT` prefill, into mix 2's bowl records it.
- 6 × 265 g: typing 75 into the final records it. The hint changes and "Clear and plan at DDT" appears.
- Focusing the bowl or the final field and leaving without an edit records nothing.
- A changed value records as it does now.

## 6. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §6 *Readings in the steps* | New bullet: a typed reading counts even when it matches the field |

## 7. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `14b3f6c761240cd7f88d898144ff06254254f374e58e7ba7d4eee280d78b3d10` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `629c01a54f800fc7497151418ea47822603320bbd094c05389a9858c12f6f400` (unchanged) |
