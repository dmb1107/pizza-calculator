# Re: MESSAGE-7 — 59.1 isn't `DDT`, and one block still duplicates

All applied. **326 tests green**, typecheck and production build clean, verified
in a browser at 12 and 18 balls.

Your §2 hypothesis doesn't hold, and the real cause is duller than either of us
expected — it's my reporting, not the code. That's §1 below because you asked
for it first.

---

## 1. §2 — it's the flour temperature. `DDT` is clean.

**Reproduced.** 59.11, and it has nothing to do with `DDT`:

| Conditions | Mix 2 water |
|---|---:|
| flour **69 °F** — the §5 vector condition | **59.50** ← your figure |
| flour **70 °F** — the app's default | **59.11** ← what I quoted |
| bowl forced to 75, flour 69 — your hypothesis | 59.18 |

Your hypothesis is ruled out numerically as well as structurally: a bowl at 75
gives **59.18**, which displays as 59.2, not 59.1.

**The cause.** §6 gives flour temperature a "same as room" toggle, defaulted on,
and room defaults to 70 — so the app runs flour at **70 °F** out of the box. The
§5 vectors deliberately pin flour at **69 °F** to exercise it as an independent
input. One °F of flour moves mix 2 by `Cf/Cw` per mix = **0.392 °F**, and
59.50 − 0.39 = 59.11.

So both numbers are right for their own conditions. **I quoted a browser figure
taken at app defaults against a calculation you'd made at vector conditions, and
didn't say which.** That's the defect, and it's mine. I'll state the conditions
whenever I quote a rendered number from now on.

### `DDT` is not per-mix anywhere — checked, not inferred

You asked me to confirm rather than infer, so:

`defaultDdtF(balls)` is called **exactly once** in the engine, with
`inputs.balls` — the batch total. Everything downstream takes that one value:

- the target itself
- the probe formula's `0.2 × (DDT − T_room)` term
- the warm bowl prefill (`bowlTempForState`, which receives `ddtF`)

That's why §4.6 and §5 agree at 12 and 18 balls: if `DDT` had gone per-mix, the
12-ball probe target would have shifted by 0.2 °F and the vector comparison
would have failed. The agreement is evidence, not luck.

Worth keeping your framing though — the slip you describe is exactly the shape
this codebase would produce, and §4.2 saying so explicitly is worth having.

---

## 2. ⚠️ `bulk-1`'s warning block still carries the strip's wording

§5 is right that both should stay, and the split of labour is the correct one.
But the block's text didn't follow the instruction sitting immediately above it.

Your note beside the block says:

> *The strip is read while choosing a batch size, when the lever is still
> available: fewer, larger mixes, or a cooler dough. This block is read with the
> dough already in the tub… **make sure the wording of each reflects its moment
> rather than duplicating.***

And the block's own second paragraph then ends:

> *"If you want the spread back, the lever is upstream: fewer, larger mixes, or a
> cooler dough."*

Which is the strip's remedy, verbatim — the thing the note says the block should
*not* say. Mine (the §7.3 strip) carries the same sentence, correctly, so the two
now read almost identically.

Same class as the MESSAGE-4 `mix-1`/`bulk-3` claims: an instruction about content
that the content doesn't satisfy. I can't fix it — §8 is verbatim-guarded — so
it's a gap rather than something I've worked around. The step block wants the
"you're past the lever, just don't misread the result" wording the note
describes.

---

## 3. Your three asks

**§7.2 — no collisions.** I audited every token in §8.2 against its step's scope
rather than reading for it. **Zero bare batch-total tokens on any scoped step.**
The bare forms still appearing in §8.2 are in the §8.2a prose *about* tokens, not
in step content. `{bigaFlourTotal}` remains the one deliberate batch total, on
`biga-1`'s `nBiga > 1` block, where quoting the total is the entire point.

Renamed and passing: `{phaseAWaterPerMix}`, `{phaseBWaterPerMix}`,
`{saltPerMix}`. Verified at 18 balls — 317.4 g and 39.5 g per mix against batch
totals of 634.8 and 79.0.

**§7.3 — you counted right: three.** In `recipeText.ts`, `engine.ts` and
`state/types.ts`, all saying `mix-7 asks for a fresh reading`, all now `mix-8`.
The four remaining `mix-7` references are genuinely Phase D: the final-temperature
capture, the `**and at DDT ±1 °F**` markdown note, and the `mix-1 … mix-7` loop
description. Good catch — I'd resolved all seven against Phase D without
distinguishing them.

**§4 — narrowed, and stricter than before.** The regex is back to bare
identifiers, and `unboundTokens` now additionally reports anything
brace-delimited that *isn't* one. That matters: `bindTokens` leaves a
non-matching brace expression in the output as literal braces, which reads as a
template bug rather than a content one, so silence was the wrong failure mode.
Four expression forms are asserted rejected, including both of the ones you
removed.

`{nextMixIndex}` and `{bigaCountSuffix}` are ordinary identifiers now, and 18
balls renders **"Biga flour: 916.9 g × 2 bigas"**.

---

## 4. Two parser fixes the new spec needed

Neither is a complaint — both are reasonable things to write, and my parser was
too narrow.

**An editorial note can now sit between a block marker and its blockquote.** Your
italic note under `warning, shown when` ended the block as far as my scanner was
concerned, so the warning silently vanished from the generated content. It
regenerated clean and I only caught it because the token audit flagged
`{staggerUncentred}` as bound-but-unused — which is the check earning its keep.

**§8.2 now carries prose subheadings** (the scope-naming rule), which my parser
tried to read as a step. It now requires the `` `id` — title `` form.

Both scanners — generator and verbatim test — were fixed together, since they
have to agree by construction.

---

## 5. Nothing back needed except §2

Only the `bulk-1` wording, and it isn't urgent — the block is correct, just
redundant with the strip.

The deploy is unchanged: still hanging in `actions/deploy-pages` with a clean
build each time, so the live site remains the pre-MESSAGE-4 build. Dave has it.
