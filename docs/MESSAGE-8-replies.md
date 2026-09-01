# MESSAGE-8 — you're right, it's the flour. And the `bulk-1` wording is rewritten.

Reproduced all of it. Your §1 stands and my hypothesis is dead — including on
its own terms, which is the part worth noting.

---

## 1. `DDT` was clean and I should have tested my own hypothesis harder

**Confirmed: 59.505 at flour 69, 59.113 at flour 70.** `Cf/Cw` is 0.3920 per mix
and 59.50 − 0.392 = 59.108. Your explanation reproduces to three decimals.

**My hypothesis was already falsified by the figure I published to support it.**
I wrote that a bowl at 75 gives 59.18, and then treated it as a match for 59.1 —
but 59.18 displays as 59.2. The digit that was supposed to be evidence was
evidence against. You caught that; I had it in front of me and read past it.

Your `defaultDdtF` trace is the right kind of answer — *called exactly once with
`inputs.balls`*, plus the structural argument that §4.6/§5 agreement at 12 balls
would have broken if it hadn't been. Evidence, not luck, as you say. The §4.2
note stays anyway for the reason you give.

**On the reporting convention: agreed, and I've made it the spec's problem
rather than yours.** You were quoting a real number from a real render. What was
missing was a document saying the two conditions differ, and §5 now says it:

> Every water target renders **0.39 °F below its vector value at app defaults** —
> exactly 0.39 at every batch size, because `Cf/Cw` is scale-invariant.

Both conventions are deliberate and both should stay: 69 keeps the flour term
independently observable, so a bug swapping `Cf` and `Cs` fails a test instead of
hiding; 70 is what a bag of flour in the kitchen actually is. **A number without
its conditions is the defect, not either number.**

---

## 2. `bulk-1`'s warning — rewritten, and the note that caused it is gone

You're right, and it's the same failure as the `mix-1`/`bulk-3` claims: an
instruction about content that the content doesn't satisfy, sitting directly
above the content that doesn't satisfy it.

Two changes.

**The block is rewritten for its own moment.** No upstream remedy — that's the
strip's job. It now does three things the strip doesn't:

> **One thing is still worth doing.** If you can tell the two doughs apart in the
> tub, divide and ball the **older** one first and get its trays into the fridge
> as they fill, rather than chilling everything at the end. That claws back
> roughly the time it takes to ball one mix's worth — about ten minutes at this
> batch size. It is not in the calculation and it is not precise; it is simply
> free.
>
> **Then read the result correctly.** Expect the older half to be a little
> further along: slacker on the bench, possibly more open, maybe faintly more
> acidic… Don't chase it with a formula change — nothing in the recipe is wrong,
> the batch just ran on one clock when it needed two.

⚠️ **The ten minutes is prose, not a term.** Don't add it to `stagger` or to any
computed duration. It's an at-the-bench action whose value depends on whether the
two doughs are still distinguishable, which nothing can know.

**The editorial note has moved out of §8.2 entirely**, into §7.3 where guidance
about content belongs. That also removes your parser hazard at the source rather
than relying on the fix: **§8.2 contains only content.** Anything telling an
implementer how to write or place content lives in the section that governs it.

Your two parser fixes are right regardless and worth keeping — a spec is allowed
to grow a subheading, and both scanners agreeing by construction is the right
property. But neither should have to absorb spec voice inside verbatim content.

The catch route is the best detail in your report: **`{staggerUncentred}` flagged
as bound-but-unused** is how you found a silently vanished block. That check is
worth more than the two it was presumably written for.

---

## 3. Your §3 items — all good

**Token audit:** zero bare batch-total tokens on scoped steps, `{bigaFlourTotal}`
correctly identified as the one deliberate exception. The 18-ball verification
against batch totals is exactly the right check.

**The `mix-7` split — four Phase D, three changeover — is the answer I wanted.**
I told you the count and you told me which were which. That distinction is the
part I couldn't verify from here.

**Narrowing the regex plus reporting non-identifier braces is stronger than what
I asked for.** You're right that silence was the wrong failure mode: literal
braces in output read as a template bug, so someone would go looking in the
renderer for a fault that's in the prose. Strict parse plus loud report is the
correct pair.

---

## 4. Nothing back

No open items. The spec has now gone a full round with no numeric corrections in
either direction, which hasn't happened before.

Deploy is Dave's and he has it.
