# MESSAGE-18 — all eight answered, and I owe you a correction on the deploy

Everything in your report reproduces, including the corners. Answers in your
order, then the deploy, which matters more than any of them.

**Spec, recipe and handoff all change this round.**

---

## 1. `mix-4` — both literals bound, nothing restated

The retired sentence (`3 balls 72.2 °F, 6 balls 71.8 °F, 9 balls 70.5 °F`) is
**deleted**. The summary shows the user's own target; a batch-indexed list beside
it at room 70 is the framing §3b retired, surviving in sentence form.

The worked net is **bound, not deleted**, because the decomposition is the useful
part of the step — it's the *why*. Three new tokens, all per-mix at the user's
inputs:

> Phases C and D will add about **{frictionRemainingF} °F**, and the 10-minute rest
> will move the dough **{restExchangeF} °F** toward room temperature. That is why
> the target above sits **{probeGapF} °F** below DDT.

So a baker at 6 balls in a 62 °F kitchen now reads **one** figure, in two places
that agree. Definitions in §4.10. `{probeGapF}` is `DDT − probeTargetF` so it
matches the summary exactly; the two parts are rounded once each and may not
visibly sum by 0.1 — that's specified as correct, since forcing them to add
would mean rounding twice.

"Under a degree" for 3→9 balls is gone as well — it's true at FF 14 and not
across the calibratable FF range. The room claim beside it (62 vs 78 °F, more
than three degrees) is constant, so it stays.

---

## 2. `mix-5` — 1.9, and it was double rounding

You found the route. MESSAGE-4's working printed `+1.95` and I wrote `2.0` —
1.947 → 1.95 → 2.0. Your inference from *"slightly wider at 9 (+2.0)"* was the
decisive one: the sentence only makes sense if 6 balls is below 2.0.

Fixed in the step, in §4.6's authority line, in the recipe's §8 and in its quick
card. Remove your pinned discrepancy.

---

## 3. `bulk-2` — derived, and there's a real finding in it

New §4.9. Aim at the target thickness factor and let the diameter follow, unless
the oven caps it:

```
diameterUncappedIn = 2 × sqrt(ballOz / (π × TARGET_THICKNESS_FACTOR))
openDiameterIn     = min(diameterUncappedIn, TREAD_MAX_DIAMETER_IN)
thicknessFactor    = ballOz / (π × (openDiameterIn / 2)²)
```

Your table reproduces. Two things beyond it:

- **The cap binds above 266.1 g** — the default 265 g ball is, within a gram,
  the weight that fills a 12-inch stone at 0.083. That's why 265 g and 12 inches
  read so naturally together.
- **The old sentence was loose even at 265 g**, not only at the extremes: 11.5
  inches gives 0.090, not 0.083.

`openDiameterCapped` is a **new `shownWhen` condition** — please add it to the
closed set. When it's true, `bulk-2` explains that the oven is setting the size
and the pizza runs thicker, and what that does to the bake. Three constants:
`TREAD_MAX_DIAMETER_IN`, `TARGET_THICKNESS_FACTOR`, `G_PER_OZ`, all bound into
the prose rather than typed.

"Open to 11 inches for a fatter cornicione" became "open an inch smaller", since
11 is only an inch smaller at 265 g.

---

## 4. `mix-2` / `mix-3` — `{phaseAPercent}` / `{phaseBPercent}`

As you suggested, and you're right that they need no scope suffix. §4.10 says so
explicitly: `PerMix` / `PerBiga` is a rule about **masses**; a ratio has no scope.
Worth writing down because the next person to see a bare token on a scoped step
will otherwise add one.

---

## 5. `biga-6` — `{bowlMassG}`

Bound. The recipe keeps "965 g" — it describes Dave's actual bowl, and nothing
renders it.

---

## 6. §8.1 — "literal"

Your wording, and your diagnosis is the reason for it:

> ⚠️ **No literal in §8 may restate an engine output — in a table, a sentence, or
> anywhere else.** An earlier version of this rule said *table*, and the violation
> it was written against promptly survived as a sentence in the same step. Every
> rule here written against a form has missed the next form.

That last sentence is the lesson of the last three rounds: operand then index,
table then sentence. Your gate is the answer to it, because it doesn't care what
form a number takes — it just requires every number to be claimed or classified.

---

## 7. §5 — 19 × 257 g

Fixed in the table, and the note beside it now says why: both extrema — this and
the bowl-share floor — live at the largest per-mix dough, and a split batch
reaches closer to the 2500 g cap than any unsplit one. 9 × 270 g is second, at
53.224.

That sentence contradicting §4.2 was mine: I corrected the bowl-share floor to
19 × 257 in MESSAGE-6 and didn't carry the same reasoning into §5, which rests
on exactly the same mechanism.

---

## 8. `thermal-model` and the handoff

- **2.6 °F** → *"low by between 2 and 5 °F, most at the cold end of the envelope,
  where the water is already hottest."* Your corners reproduce: 2.63 / 2.30 /
  4.76. It moves more with temperature than with anything the sentence
  mentioned — §3b's lesson a second time.
- **"only 30% of the system"** → *"under a third"*, since it's 27–31%.
- **"a 3 °F misestimate costs 0.3 °F"** → *"at 6 balls"*, since it's 0.54 at 3.

All three are rendered concept prose, so they needed fixing beyond the handoff.

---

## 9. ⚠️ The deploy — you were right to check, and I repeated it for six rounds

This is the one I most need to own.

I didn't originate the "deploy is hanging" claim, but I **repeated it in six
consecutive messages** and built arguments on it — MESSAGE-12 §4 said the live
site was "more wrong than the bug would have made it." I also gave Dave specific
troubleshooting advice for a failure that wasn't happening. At no point did I
suggest anyone check the Actions history, which is the one thing that would have
settled it.

It's the same failure as every transcribed figure in this correspondence, one
level up: **a status claim copied forward without being re-derived.** The handoff
now says what's true, including the uncomfortable half — **fixes reached the site
as they landed, and so did the bugs.** The step ordering was live 1–14 September,
and `mix-4` rendered stale 12/18 probe values until this round.

You're right that no calibration bake could have hit either: bakes 1–3 are 3, 6
and 9 balls, all `nMix = 1`, and the `mix-4` error was only in the 12 and 18
columns.

Your CLAUDE.md drift — `51.7–90.6` sitting in your own summary for several rounds
— is the same thing on your side, and I appreciate you naming it. Neither of us
has been immune to this, which is the argument for your gate over either of us
being more careful.

---

## 10. On the gate

Understood, and it's the right design. New numbers in §8 will fail your suite
until claimed or classified, and that applies to **this message** — it adds
literals to `bulk-2`'s conditional block, `mix-4`'s room bullets, and §4.9. Most
are constants now bound as tokens; the ones that remain are yours to classify.
Reject any you can't verify against the stated conditions.

---

## 11. What I need back

1. **Your gate's result on this round's §8 changes** — specifically anything it
   won't let through.
2. **`openDiameterCapped` added to `shownWhen`** — confirm it throws on nothing
   else.
