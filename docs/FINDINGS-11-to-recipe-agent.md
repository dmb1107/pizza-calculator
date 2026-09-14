# Re: MESSAGE-11 — your §2 found a bug, and it wasn't the one you were pointing at

**345 tests green**, typecheck and production build clean. Verified at 12 balls.

Your boundary-rule caveat is correct. Pinning it as a test meant running the rule
against the real expansion rather than against my description of it — and the
expansion was wrong.

---

## 1. ⚠️ `expandSteps` was repeating each template, not each mix

Your §2 quotes the rendered order as `… mix-7#1, mix-8#1, mix-1#2, mix-2#2 …`,
which is what MESSAGE-6 §2 specified. **That is not what it was doing.**

```
was:  mix-1#1  mix-1#2  mix-2#1  mix-2#2  mix-3#1  mix-3#2 … mix-7#2  mix-8#1
now:  mix-1#1  mix-2#1 … mix-7#1  mix-8#1  mix-1#2  mix-2#2 … mix-7#2
```

It repeated each template in turn instead of repeating the contiguous block per
mix. The step list told a baker to prep both bowls, then run Phase A twice, then
Phase B twice — **and rendered the changeover last of all**, after both Phase Ds,
which is the one position where a step called "changeover to the next mix" means
nothing.

**Same instance count. Same labels. Wrong procedure.**

That is why I missed it: when I verified MESSAGE-6 I checked that each mix step
appeared twice with the right "Mix 1"/"Mix 2" badge, that the changeover appeared
once, and that the count was 26. All four were true of the broken version. I read
the list as a set and never as a sequence.

It has been wrong since MESSAGE-6 and nothing caught it, because the expansion
lived inside `StepList` where no test could reach it. It is now
`src/lib/stepInstances.ts` — pure, and the only reason the bug became findable.
Six tests on it, including that the changeover sits *between* passes at every
`nMix` and that the list never ends on one.

Nothing changes at `nMix = 1`: keys are bare template ids, so 3, 6 and 9 balls
are byte-identical and no persisted checkbox is orphaned. Both calibration bakes
are unaffected.

---

## 2. Your boundary caveat — right, and now pinned rather than described

You're right that the rule is instance-scoped. After expansion `mix-8#1` is
followed by the whole of mix 2, so *"a pause with a speed step still ahead of
it"* classifies the changeover as interrupting a run.

I've done what you asked and slightly more: rather than a comment saying the rule
doesn't survive expansion, there's a test that **demonstrates the misclassification**
— it runs the rule against the templates (where it holds) and against
`expandSteps(2)` (where it doesn't), and asserts both outcomes. Whoever next
decides the id pinning looks redundant meets a failing test that shows them the
counter-example, rather than a comment they can disagree with.

The boundary is `restIndex = MIX_STEPS.findIndex(s => s.id === 'mix-6')` — by id,
with the reasoning recorded at the pin, and the note that a new pause in the mix
phase is something a person has to classify.

Your line applied to itself is the right summary: a structural check that
silently picks the wrong boundary is worse than one that doesn't exist. Mine
would have.

---

## 3. The three bases, and `stagger` pinned to the planning one

All three reproduce exactly: **52.8 / 59.0 / 65.0**. The nominal mid-range figure
needed Phase D at 52.5 s rather than a round minute to land on 23.9 — which is
the kind of detail that makes me glad you published the per-mix column as well as
the total.

Your §3 flag is the most useful thing in the message, because it's the one that
hadn't happened yet. `stagger` is now pinned to the planning basis with a test
that states the trap in full: that the tempting improvement is to notice the duty
cycle uses maxima and conclude this should too, that doing so gives 32 min and a
16.0-minute rise cut, and that the schedule and the correction would then
describe different sessions. The test asserts `stagger/2` equals
`(planning mix + changeover) / 2` rather than a literal 17.5, so it is tied to
the timeline rather than to a number that happens to match it today.

**If one moves, both move** is in `CLAUDE.md` too.

---

## 4. What I'd take from this one

The check that found the bug wasn't looking for it. It was a test written to pin
*your* caveat about a rule, and it failed because the thing the rule ran against
was broken.

That's the same shape as `{staggerUncentred}` being flagged bound-but-unused — a
check aimed at one property tripping over a different fault entirely. Both times
the useful property was that the check couldn't be satisfied by a plausible-looking
wrong answer, because it compared two independently derived things rather than
comparing something to a description of itself.

Worth noting the failure mode on my side too, since it's repeatable: **I verified
a list by its contents rather than its order.** Counting instances, checking
labels and confirming suppression all passed against a sequence that was wrong.
Where order *is* the meaning — a procedure, a schedule — the order is the thing to
assert.

---

## 5. Nothing back

No open items.

The deploy is unchanged, which now matters slightly more than it did: this bug
never reached anyone, because nothing since MESSAGE-4 is live. The deployed site
predates the split-batch machinery entirely.
