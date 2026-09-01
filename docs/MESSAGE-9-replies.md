# MESSAGE-9 — one note on the new constant, then we're done

Nothing to correct. One thing to change about *how* the offset is held, not what
it equals.

---

## Derive the offset, don't hardcode it

Your test is the right instinct and better than the note it replaces — a
documented figure nothing checks is one edit from being wrong, exactly as you say.
The invariance sweep and the heat-capacity assertion are both the right shape.

But `APP_DEFAULT_FLOUR_OFFSET_F = 0.392` should be **derived**, for the same
reason `C_BIGA` and `ADY_OF_BIGA_FLOUR` are:

```ts
const freshFlourFrac = 1 - C.BIGA_FRACTION;                             // 0.350
const freshWaterFrac = C.HYDRATION - C.BIGA_FRACTION*C.BIGA_HYDRATION;  // 0.375
const appDefaultFlourOffsetF = (freshFlourFrac*C.C_FLOUR) / (freshWaterFrac*C.C_WATER);
```

Your own derivation is why: `(0.35 × 0.42)/(0.375 × 1.00)` has no `F` in it. But
it does have `BIGA_FRACTION`, `HYDRATION`, `BIGA_HYDRATION` and two specific
heats in it, and **0.392 is only true of this formula**:

| Change | Offset |
|---|---:|
| as shipped | **0.392** |
| hydration 65% | 0.452 |
| biga 60% | 0.420 |
| biga hydration 45% | 0.361 |

A hardcoded 0.392 is correct today and silently wrong the first time anyone
touches the formula — which is how the yeast constant went wrong, and how
`divideBall` went wrong two rounds ago. Third instance of the same shape.

**Keep both assertions.** With the value derived they get stronger, not weaker:
assertion 2 stops being a tautology against a literal and becomes a real check
that the derivation matches an independently computed engine output.

Also worth pinning `freshFlourFrac` and `freshWaterFrac` as named intermediates
rather than inlining them. They appear in the batch table too, and `0.35` and
`0.375` are the pair most likely to be mistaken for each other — `0.375` is also
the ADY percentage, which is a coincidence the spec already warns about in §3.

---

## The unexercised parser branch

Agreed on all of it, including keeping it. Your framing is the honest one: it is
now defensive against a rule the spec states rather than against anything
present, and **it will not fail if it breaks.**

That last point is the one that matters, so it should be written down where the
branch is, not just here — a defensive branch nobody exercises is
indistinguishable from a working one until the day it isn't.

**And you're right about what actually catches it.** The bound-but-unused token
check found a vanished block by noticing a token nothing consumed. That is a
structural check on a property neither of us specified — it doesn't know what a
block is, only that a value with no consumer means something upstream is missing.
Cheap, general, and it caught a class of failure that careful reading had already
missed twice.

If you add checks of that kind unprompted in future, do — and tell me what they
are, because they're better than the ones I ask for.

---

## Nothing else

No open items on the recipe or the spec. Both bakes ahead are `nMix = 1`, so
none of the split-batch machinery is on the path to the next data.
