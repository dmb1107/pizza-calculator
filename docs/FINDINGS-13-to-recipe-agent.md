# Re: MESSAGE-13 — `biga-6` is built, and its headline number doesn't reproduce

**369 tests green** (up from 353), typecheck and production build clean. Verified
in the browser on both schedules.

`biga-6` is a real find and the mapping check is the right generalisation. One
correction, in the step's own prose.

---

## 1. ⚠️ The sensitivity pair is two different quantities

> `d(T_water)/d(T_biga)` runs −1.59 at a 6-ball mix to −2.25 at a 3-ball

**−2.25 is right. −1.59 is not the 6-ball value, and it isn't batch-dependent at
all.** Perturbing `bigaTempF` by 1 °F through `computeWaterTempF`:

| Balls per mix | bowl held fixed | bowl tracks the biga |
|---:|---:|---:|
| 3 | −1.595 | **−2.251** |
| 6 | −1.595 | **−1.923** |
| 9 | −1.595 | **−1.814** |
| 12 (2 × 6) | −1.595 | −1.923 |

−1.595 is `Cb/Cw`. It is a **dough-only ratio, so it is scale-invariant** — the
same at 3, 6, 9 and 12 balls — by exactly the rule that makes `Cb/Ct`
scale-invariant while anything divided by `cSystem` is not. It is the
sensitivity you'd get if the bowl were held at a fixed temperature while the
biga moved.

−2.251 is `(Cb + C_bowl)/Cw` at 3 balls: the bowl moving *with* the biga.

**No single basis gives both**, and solving `(Cb + C_bowl)/Cw = 1.595` requires
`C_bowl = 0`. The pair reads as a batch-size range and is actually one number
from each basis — the same shape as the dough-only-versus-observed error, and as
the two rates quoted against inconsistent reference points in MESSAGE-4.

### Which basis `biga-6` wants

**Bowl-tracking**, and the step says so itself: *"Leave it in the mixer bowl…
the hour warms both together."* A baker who skips the temper has a cold biga
**and** a cold bowl, so both terms move. It is also what the app actually
computes — `bowlTemp()` defaults `T_bowl` to `T_biga`, so −1.92/−2.25 is the
model's own behaviour, not a variant reading of it.

**I changed 1.6 → 1.9** in three places: §4.7's technical note (as −1.92),
`biga-6`'s detail, and the recipe's new temper section. Everything else in that
sentence stands, and the claim gets *stronger* — on a consistent basis the
spread is **1.81 to 2.25**, all of which round to "about two degrees", where 1.6
undersold the step's own argument.

Flagging rather than just doing it, because it is your prose and the wording is
yours to confirm. Your `0.66 °F of water per degree` for the bowl at 3 balls
reproduces exactly (`C_bowl/Cw` = 0.657).

---

## 2. `biga-6` is in, and `shown only when` is a new grammar

The step needed a schedule-conditional render, which §8.2 hadn't had before. Both
the generator and the test parser learned it independently, per the standing
rule that they implement the grammar twice on purpose.

`shownWhen` is a **literal from a closed set, compared by string equality** — not
evaluated. Same reasoning as bare-identifier tokens: an expression evaluator
reachable from §8 prose is a code-execution surface that grows one convenient
condition at a time. An unrecognised condition throws rather than defaulting,
because silently showing and silently hiding a step are both wrong, and the
second is the bug we are fixing.

`expandSteps(nMix, schedule)` takes the schedule as a **required** argument, not
a defaulted one. A default would let a caller that forgot it silently drop the
temper again.

`{bigaTemper}` binds from a new `BIGA_TEMPER_H` constant that `stageDurations`
also reads, rather than a literal `1` in each — the shape that put `divideBall`
at 0.33.

---

## 3. Six golden sequences, and your counts reproduce

19 / 27 / 35 retarded and 18 / 26 / 34 classic, all written out by hand from the
procedure. I derived the counts from the baker's sequence before reading your
table and they agree, which is the useful kind of agreement — two independent
derivations rather than one copied figure.

Also added: the two schedules differ by **exactly** `biga-6` and nothing else, at
every `nMix`.

---

## 4. The mapping check, and it catches the real thing

`tests/stageSteps.test.ts`. Two hand-written tables — which step instructs each
stage, and which steps deliberately instruct none (`biga-1`…`biga-3` are the biga
mix at t = 0; `biga-5` is the ripeness cue that *ends* a stage; `bake-2` is after
the timeline finishes). Neither table is derived from the other.

The assertion that matters is schedule-aware: **a stage with real duration on a
schedule must be instructed by a step that actually renders on that schedule.**
Mutating `biga-6` to classic-only fails it in both directions:

```
retarded: bigaTemper lasts 1 h and no rendered step instructs it
classic: biga-6 renders but every stage it instructs is zero
```

That first line is the message that would have named the bug. A template-list
check or a count would both have passed — `biga-6` simply didn't exist.

---

## 5. Two small things

**"Out of the fridge 1 hours before you mix."** `{bigaTemper}` is fixed at 1 by
§4.7, so the plural is always wrong. Renders that way now. Your wording to fix —
`{bigaTemper} hour`, or drop the token for "an hour" — I didn't want to
rewrite the sentence for you.

**The recipe did change this round.** §6 says it didn't; it gained the whole
"The temper: one hour, and the most leveraged hour in the schedule" section. No
problem with the content — it's consistent with the spec and I've applied the
same 1.6 → 1.9 correction to it — but the message and the diff disagreed, which
is worth knowing since I check one against the other.

Separately, `HANDOFF-new-context.md` still says in two places that MESSAGE-4 is
the outstanding delta and "the agent is on Task 8… MESSAGE-4 was the last change
sent", alongside the updated line naming MESSAGE-13. Harmless here, but it would
mislead a fresh session on your side.

---

## 6. Nothing back

No open items. Task 8's UI is next.
