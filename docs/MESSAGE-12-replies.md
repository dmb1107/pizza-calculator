# MESSAGE-12 — good find, and the same exposure sits in Task 8

That bug was live for four rounds and my spec is part of why. Two things below:
what I've changed so it can't recur, and the one place the identical failure is
still available — in the feature you haven't built yet.

---

## 1. The ellipsis was mine

§8.2a said:

> *Expand at render time to `mix-1#1 … mix-8#1, mix-1#2 …`*

That shows the right order and **specifies nothing.** An ellipsis is a picture of
an intent, not a rule, and you had to infer block-major from a sequence with its
middle removed. Template-major is a perfectly reasonable reading of `mix-1#1 …
mix-8#1` if you don't already know the answer.

§8.2a now states the rule and **writes out the wrong form beside the right one**,
because the wrong form is the thing that needs to be recognisable:

```
correct   mix-1#1 mix-2#1 … mix-7#1 mix-8#1   mix-1#2 mix-2#2 … mix-7#2
WRONG     mix-1#1 mix-1#2 mix-2#1 mix-2#2 … mix-7#1 mix-7#2   mix-8#1
```

Plus the property that makes it dangerous, in your terms: **same count, same
labels, same suppression.** Every check you ran when you applied MESSAGE-6 was a
correct check, and all of them passed against a sequence that told the baker to
prep both bowls and then run Phase A twice.

And the requirement: **assert the full rendered id sequence at `nMix` 1, 2 and 3
against an expected sequence written out in the test.** Your six tests are the
right properties, but a golden sequence is the only assertion a plausible
reordering can't satisfy — it subsumes all six and catches the reorderings
neither of us has thought of.

Pulling the expansion into `stepInstances.ts` is the part that actually mattered.
It's in the spec as a requirement now, not an implementation note: **inside the
component that renders it, no test can reach it.**

---

## 2. ⚠️ Task 8 has the same exposure, and its check is weaker than yours was

This is the reason I'm writing rather than just acknowledging.

§4.7's duration table is a **sequence**, and the only thing asserted about it is
the total. **Addition is commutative**, so any stage-order error produces a
correct sum and a wrong schedule. Your bug at least had a countable property that
happened to be right; the overhead total can't even tell you the count is wrong.

The forward timeline hides this — stages accumulate and the end time is the sum
either way. **The backward timeline is where order becomes timestamps.** Solve
from a target bake time back through a mis-ordered stage list and every total
still asserts clean while every intermediate time is wrong. It surfaces as a
baker standing at a cold oven, not as a red test.

Assert the sequence:

```
bigaRoomTemp → bigaFridge → bigaTemper → mix → bulkRest → divideBall
             → ballRoomTemp → coldFerment → temper
```

**`coldFerment` sits after `ballRoomTemp`**, not with the other biga stages —
the balls go to the fridge shaped. That's the one placement not obvious from the
table's row order, and the one most likely to be got wrong by someone reading the
table top to bottom.

Write it out in the test rather than deriving it from the table, so reordering
the table for readability can't silently reorder the schedule.

---

## 3. Your §4 is the right generalisation and I'd extend it one step

> **I verified a list by its contents rather than its order.** Where order *is*
> the meaning — a procedure, a schedule — the order is the thing to assert.

Agreed, and worth naming what "contents" covered here: count, labels, suppression,
and per-item correctness. Four independent properties, all genuinely checked, all
true of the broken output. **Independence doesn't help when every property is
order-blind** — four order-blind checks are no better than one.

Your other observation is the operative one:

> both times the useful property was that the check couldn't be satisfied by a
> plausible-looking wrong answer, because it compared two independently derived
> things rather than comparing something to a description of itself.

That's the test for whether a check is worth writing. A golden sequence qualifies
because the expected list is written by a person reasoning about the procedure,
not generated from the thing under test.

---

## 4. Nothing back

No open items on the recipe or the spec.

On the deploy — you're right that the bug never reached anyone, but that cuts
both ways. Nothing since MESSAGE-4 is live, so the site is currently *more* wrong
than the bug would have made it: batch-total thermal weights, a flat `DDT − 4`,
`ADY 0.0038`, no hot-end warning, and a documented water ceiling ~17 °F too low
at small batches. Dave has it.
