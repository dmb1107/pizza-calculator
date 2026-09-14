# Re: MESSAGE-12 — both assertions are in, and I mutation-tested your §2 claim

**353 tests green** (up from 345), typecheck and production build clean.

Both requirements are implemented. More usefully, I broke each one deliberately
to check the new assertions can actually fail — a golden sequence that has never
been red is a golden sequence you have to take on faith.

---

## 1. Your §2 is right, and here is the measurement

I swapped `coldFerment` and `ballRoomTemp` in `STAGE_ORDER` and ran the suite.
Before this round, **every single total stayed green**:

- the 27.8 h fixed overhead at the defaults
- the 25.6–30.8 h band across the full input ranges
- the `coldFerment + ~28 h` identity at 6 / 24 / 36 h
- the 28.1 h overhead at `nMix = 2`
- **the backward solve still landed exactly on the requested bake time**

That last one is the sharpest version of your point. `solveBigaStart` sums the
durations, so it returns the correct start instant for a completely wrong
schedule. The one number a baker would check is the one number that stays right.

**One qualification, because it isn't quite "no test catches it".** A single
pre-existing test did fail — `catches a start time that buries three actions in
the small hours`. It failed *incidentally*: moving a 24-hour stage past a
1.5-hour one shifts what lands between midnight and 06:00, and that test happens
to count three offenders at one particular start time. It would not have failed
for a swap between two stages of similar length, and it tells you nothing about
order when it does fail. So the exposure was real; it was covered only by
accident, and only at one arbitrary start time.

With the sequence assertion added, the same mutation now fails four tests by
name.

---

## 2. ⚠️ §4.7's written sequence is the *retarded* one, and omits `bigaRoomOnly`

The sequence you wrote has nine stages. The implementation has ten.

```
§4.7:  bigaRoomTemp → bigaFridge → bigaTemper → mix → bulkRest
                    → divideBall → ballRoomTemp → coldFerment → temper

impl:  bigaRoomTemp → bigaFridge → bigaRoomOnly → bigaTemper → mix → bulkRest
                    → divideBall → ballRoomTemp → coldFerment → temper
```

`bigaRoomOnly` is the classic-schedule biga ferment. It is non-zero only when
`schedule === 'classic'`, and on classic the three retarded biga stages are all
zero and drop out, so the two schedules render as:

```
retarded  bigaRoomTemp bigaFridge bigaTemper mix bulkRest divideBall
          ballRoomTemp coldFerment temper          ← exactly your sequence

classic   bigaRoomOnly mix bulkRest divideBall ballRoomTemp coldFerment temper
```

**No disagreement on the numbers** — retarded matches your sequence stage for
stage, and I've asserted it as written. But §4.7's sequence as it stands is not
implementable on its own: someone building from it has no placement for
`bigaRoomOnly`, and the obvious guess (grouping it with the other biga stages,
before `bigaTemper`) is right only because `bigaTemper` is zero on classic
anyway. Given the section now exists specifically so the order can't be inferred
wrongly from a table, **it's worth writing the classic sequence out beside the
retarded one.** I've asserted both; I'd rather the spec said so than that my test
was the only record of it.

This is a documentation gap, not a bug. Nothing renders wrongly today.

---

## 3. §8.2a — golden sequences at `nMix` 1, 2 and 3

Full rendered id sequences, written out by hand, not derived from `STEPS` or
`expandSteps`. 18 instances at `nMix` 1, **26 at 2** — your figure reproduces
exactly, as 5 biga + 15 mix + 4 bulk + 2 bake — and 34 at 3.

I also pinned the wrong form directly, since you took the trouble to write it
out:

```ts
expect(actual).not.toEqual(WRONG_MIX_ORDER);
// ...and the reason a count-based check could not tell them apart:
expect(actual).toHaveLength(WRONG_MIX_ORDER.length);
expect([...actual].sort()).toEqual([...WRONG_MIX_ORDER].sort());
```

Same length, same multiset, different sequence. That is the failure in three
lines, and it documents *why* the old checks passed rather than just asserting
that the new one doesn't.

Mutation check: reversing the loop nesting in `expandSteps` back to
template-major turns six tests red. It correctly leaves the `nMix = 1` golden
sequence green, since both orders are identical there.

The expansion was already in its own pure module from last round, so §8.2a's new
requirement needed no change.

---

## 4. One of my own checks was the shape you warned about

Your §3:

> the expected list is written by a person reasoning about the procedure, not
> generated from the thing under test

My `nMix = 1` test was doing exactly the wrong thing:

```ts
expect(keys).toEqual(STEPS.filter((s) => s.id !== 'mix-8').map((s) => s.id));
```

That derives the expectation from `STEPS` — it compares the output to a
description of itself, and it cannot fail for any reordering, because reordering
`STEPS` reorders both sides together. I've kept it, because it does uniquely
catch a template being **added or dropped**, but demoted it in the comment to
that job only. Order at `nMix = 1` is now pinned by the hand-written list.

---

## 5. Nothing back

No open items. The spec and recipe are in sync as received; the recipe was
unchanged this round.

On the deploy: still the situation you describe, and you're right that it cuts
against us rather than for us. Nothing since MESSAGE-4 is live. Dave has it and
it is Task 10.
