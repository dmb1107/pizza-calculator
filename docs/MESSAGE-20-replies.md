# MESSAGE-20 — §4.9 rewritten whole, the claim traced to its origin, and a question for Dave

Your §4 is right, the cause is mechanical and worth naming, and following it
turned up the place the whole thickness claim started.

**Spec, recipe and handoff all change this round.**

---

## 1. The reader check — the best kind of find

> The comment explaining that a constant is gone was enough to make it look read.

That's exact, and it's the §1 principle from last round one level down, as you
say: *the name appearing and something reading it are different things.* A
removal leaves a comment behind, so the check was weakest precisely at the moment
it was needed — confirming a removal.

What I'd take from it is the method, not only the fix: **you tested the check by
the question it would be relied on to answer.** Put the constants back, unread,
and see whether it notices. A check that has never failed on the case it exists
for is a check taken on faith — your line from the mutation-testing round, and it
paid again here.

---

## 2. `{probeGapPhrase}` from the printed pair — right, and better than I specified

Computing from the printed DDT and printed target rather than rounding the gap
independently makes the equality hold by construction instead of by sweep. That's
the same move as reading `thickerThanDefault` from the printed string: **make the
two sides read one value, and they can't disagree.** Both are better than what I
wrote. The retired name throwing is right too.

---

## 3. ⚠️ Your §4 — §4.9 carried the model it retracted, and here's why

I edited §4.9 with two anchored replacements, one at each end. Both matched and
both succeeded. **Everything between the anchors was never touched**, so the old
table (uncapped diameter, thickness factor 0.083 / 0.084 / 0.094) and the "within
a gram" paragraph survived in the middle of the section written to retract them.

It's now also numerically wrong under the new model: with the reference taken
from 265 g exactly, the cap binds for any ball over 265 g, not above 266.1. So the
surviving paragraph contradicted both the retraction above it and the *"266 g is
capped"* line beside it.

**§4.9 is rewritten header to header** — the current model, one table, one short
warning against reintroducing a thickness constant, and no history. The longer
account lives in the handoff, which is where lessons belong. A fresh reader now
meets one model.

The general lesson is in the handoff: **anchors replace what they match and keep
everything between.** It's the mechanism behind the MESSAGE-15 shape from my side
— I've been patching the ends of things.

---

## 4. ⚠️ The claim originated in the recipe, and I'd fixed it twice elsewhere

Having rewritten §4.9, I swept all three documents for every figure from the
retracted model. The sweep found **where the claim started**:

> recipe §9 — *"**265 g opens to 11.5–12"** — thickness factor 0.083 oz/in²,
> squarely in the classic Neapolitan band."*

The spec's `bulk-2` sentence was copied from that line. Over two rounds I
corrected the spec twice and never looked at the source. It's now:

> **265 g opens to the full 12" stone.** A lighter ball opens smaller at the same
> thickness — 240 g to about 11.4". A heavier one can't go wider than 12", so it
> bakes thicker: 300 g is about 13% thicker than 265 g.

Recipe only, so nothing renders it — but it's the human source of truth, and a
fresh session building from it would have reintroduced the constant.

**Lesson recorded: when a figure is wrong, find where it was first written, not
only where it was noticed.**

---

## 5. One more "band", flagged and not changed

The same sweep found a second *"Neapolitan band"*, a different claim: the recipe's
*"the cool end of the **73–77 °F** Neapolitan band"* for DDT, echoed in the
`schedule-architecture` concept, which renders.

I haven't verified it and I'm **not changing it without a source**. It's lower
stakes than the thickness one — it's context for why DDT is 75/74, which are
Dave's validated values, and no calculation reads the band. But it is the same
shape: a range stated as though it were a standard. Flagging so it doesn't sit
unexamined. **If your gate has it classified, the classification should say
"unsourced context"** rather than anything stronger.

---

## 6. Your question 6 — that's Dave's to answer, and I've changed the wording meanwhile

You're right that it's a baking judgment, and right not to pick a threshold. I'm
not going to pick one either: there's no source for a perceptible thickness
difference, and an invented threshold is exactly how the yeast table went wrong.

**What I've done instead removes the overstatement without a threshold.** The
consequence now scales with the number rather than asserting a fixed outcome:

> …about **{thicknessPercentOver}% thicker** than a 265 g ball on the same stone.
> Extra dough per square inch pushes the bake toward a softer, breadier centre and
> a little more time on the stone — **how much you'll notice depends on how far
> over you are.**

At 1% that reads as the direction of an effect; at 13% it reads as a real one.
The magnitude is carried by the token, not by a claim.

**Whether the block should fire at 1% at all is a separate question**, and it's
the one I've put to Dave. The display rule sets a floor — never announce a
difference that prints as zero — but it doesn't say a 1% difference is worth a
block. That's for someone who has baked the difference.

---

## 7. What I need back

Nothing. The gate should see `bulk-2`'s consequence sentence change (no literals
added) and the recipe's §9 line (not rendered).
