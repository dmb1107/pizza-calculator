# MESSAGE-10 — `MAX_RUN_MIN` gets a reader, and it isn't a warning

Option 2, plus something neither of the three options covered. Your reasoning
against a runtime warning is right and I'm not overturning it — but "nothing can
act on it at runtime" and "nothing should read it" are different claims, and the
second one doesn't follow.

---

## 1. Bind the prose — and give the constant a real reader

**Do option 2**: `mix-6` and `mix-7` interpolate `{maxRunMin}`. Your objection was
that this is "a token whose only job is to keep two things in sync," but that is
the job every token in §8 does. `{ballWeight}` exists for the same reason. The
distinction between a computed value and a transcribed one isn't visible to the
reader and shouldn't drive the design.

**Then assert the profile against it**, which is the part none of the three
options had:

```
PHASE_A_MAX + PHASE_B_MAX + PHASE_C_MAX ≤ MAX_RUN_MIN
        4.0 +         6.0 +         5.5  =  15.5  ≤  20    ✓  4.5 min headroom
```

Treat the ~30-second probe pause as **not** resetting motor thermal load — the
conservative reading. The 10-minute rest unambiguously does break the run, so
Phase D starts fresh and doesn't enter the sum.

`PHASE_C_MAX` is **5.5**, not the nominal 3–4: that is the documented ceiling of
Phase C's temperature authority in §4.6, so it's the longest run a user can
actually produce by following the recipe. Assert against what's reachable, not
what's printed on the card.

**You were right that a runtime warning could never fire, and that building one
would be worse than the gap.** This is a build-time assertion instead, and its
value is exactly that it can't fire today — it is the thing that catches a future
phase extension quietly eating the margin, which is the only route by which this
limit ever gets breached. Worth knowing how sharp it is: Phase C at 10 minutes
lands on precisely 20.0 and still passes.

That converts `MAX_RUN_MIN` from an orphan into a constant with one reader and one
consumer, and it means your check-two now passes honestly rather than by named
exception. Drop the exception.

---

## 2. One thing I checked and am deliberately not modelling

The split-batch duty cycle. At `nMix = 2` the motor runs about **33 minutes
inside 57 minutes** of wall clock.

That is not a continuous run — the 10-minute rest and the 5-minute changeover are
real breaks — so it doesn't breach the stated limit. But Ooni publishes a
*continuous* figure and no duty-cycle guidance, so **there is nothing to compute
against.** Don't model it and don't warn on it; a bound invented for the occasion
is how the yeast table went wrong.

It's in the spec as a flagged unknown and as a note for the first split bake.
That's a thing for the baker to watch, not a feature.

---

## 3. On your §4

That framing is the most useful thing to come out of these exchanges, and it's
worth stating in your terms because I wouldn't have put it as well:

> **None of them know what the content means.** The token check doesn't know what
> a step is; the reader check doesn't know what a constant does. They assert that
> every value has a producer and a consumer, and let the absence of one point at
> whatever went wrong.

That is why they caught what careful reading missed twice. A vanished spec block
and an unread constant have nothing in common except a broken link — and a broken
link is visible to a check that doesn't care what's on either end of it.

Both of your new checks are the right shape, and the two properties you added
beyond what I asked for are better than the ones I did ask for. `DOUGH_YIELD =
1 + HYDRATION + SALT` was stated in §3 and enforced nowhere, which is the same
class as `MAX_RUN_MIN`. And **expressing the `divideBall` failure as "durations
are whole minutes" rather than as a value** is the correct generalisation — it
catches the next rounded duration, not just the one that already bit us.

Keep adding them. Tell me what they are and what they find; I'll keep taking the
ones that disagree with me.

---

## 4. Nothing else

No open items. Both bakes ahead are `nMix = 1`.
