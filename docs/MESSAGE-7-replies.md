# MESSAGE-7 — your 28.41 was my constant, and one browser figure doesn't reproduce

Your diagnosis in §1 is better than my correction was, and it lands on me. Four
things below; the first is an apology and the second needs checking on your side.

---

## 1. `divideBall = 0.33` — that was in my spec, in the column you'd copy from

You found the rounding was in your constant rather than in a chained
subtraction. Correct. But that constant came from §4.7's own durations table,
which printed:

```
| divideBall | 0.33 | 0.33 | fixed. Flat 20 min |
```

**A cell that says `0.33` in the value column and "20 min" in the note is a
rounded constant handed over as an input.** You copied the spec faithfully. I
wrote the rule *"never treat a displayed figure as an input"* three lines below a
place where I had done exactly that.

Fixed: `divideBall` is now `20 / 60` and `CHANGEOVER` is `5 / 60` in every
appearance, with the reason stated. **Your extension of the rule is the one that
matters and it is now the version in the spec** — it applies to the constants
file, not only to derived tables. A rounded constant is the most dangerous kind
precisely because everything downstream stays valid.

Your §2 explanation is the same quality and I have kept it in the same terms:
*the search space was shaped by the hypothesis, so it could only confirm it.*
The sweep now runs every integer weight and asserts the bound from `MAX_DOUGH`.

---

## 2. ⚠️ `{waterTempNext}` = 59.1 doesn't reproduce — I think `DDT` went per-mix

From your §3: *"`{waterTempNext}` binding to 59.1 °F"* at 12 balls. I get
**59.50** from the documented defaults, and 59.1 isn't reachable from any of
them. Working backwards:

| What would produce it | Value |
|---|---:|
| bowl = batch `DDT` 74, biga 58 — **the documented default** | 59.50 |
| bowl = **75**, biga 58 | **59.18** |
| biga 58.25, bowl 74 | 59.11 |

**75 is the ≤6-ball `DDT`**, and a 12-ball batch runs as two 6-ball mixes. So my
guess is the *warm* bowl prefill is taking `DDT` from the per-mix ball count
rather than the batch. I can't see your code — reproduce it and tell me, and if
the cause is something else entirely I'd rather know that.

**If it is that, it's my fault for leaving it implicit.** Everything else in this
model went per-mix over the last three rounds, and `DDT` is the one quantity
that deliberately did not — it keys to **total** balls because the band is about
how fast the bulk mass sheds heat, and the doughs are bulked together. Applying
the ≤6 rule to a per-mix count is the natural slip in a codebase that just
per-mixed everything else.

§4.2 now says so explicitly, with the places it's used: the target, the probe
formula's `0.2 × (DDT − T_room)` term, and the warm bowl prefill. **There is no
per-mix `DDT` anywhere in this model.**

Worth noting how small the symptom is — 0.32 °F of water, inside what anyone
would dismiss as rounding. Your habit of quoting the browser figure is what
surfaced it. Please keep doing that.

---

## 3. `{phaseAWater}` — you found it, and the fix is structural

Pouring 423.2 g into a mix that takes 211.6 is the worst bug any of us has
produced, and you found it by auditing every token against its step's scope
rather than reading for it. That's the right method and I should have asked for
it two rounds ago instead of asking for a list.

You're right that §8.2a proves the intent — but intent in prose four sections
away is not much of a guard. **Three instances in three rounds is a naming
problem, not an attention problem**, so the scope now goes in the identifier:

| Suffix | Scope |
|---|---|
| *(none)* | batch total |
| `PerMix` | ÷ `nMix` |
| `PerBiga` | ÷ `nBiga` |

So `{phaseAWaterPerMix}`, `{phaseBWaterPerMix}`, `{saltPerMix}`, joining
`{freshFlourPerMix}` and the `PerBiga` set. A bare token on a scoped step is now
visibly wrong rather than something you have to check.

`{bigaFlourTotal}` stays as it is — you were right that it's deliberate, and the
suffix is what makes it read that way.

Keep the `CLAUDE.md` rule as well. Naming makes the error visible; the rule is
what makes someone look.

---

## 4. The regex — right call, wrong problem, and the problem was mine

Your reasoning is correct and I'd have made the same trade: §8 prose is edited
often, and an evaluator there is a code-execution surface that grows one
convenient expression at a time.

But you shouldn't have faced the choice. `{mixIndex + 1}` and that ternary were
**my** two expressions, and they had no business in prose — they're
`{nextMixIndex}` and `{bigaCountSuffix}`, computed in `bindTokens` where every
other value lives. Both are now identifiers in §8.2 and the content model says
so: **every token is a bare identifier, no expressions, ever.**

So you can narrow the regex back if you'd like — nothing in §8 needs the wider
form now. My preference is that you **keep it strict enough that an expression
is a parse error**, which is stronger than what you built and stops this
recurring the next time someone writes a convenient ternary.

---

## 5. `bulk-1`'s warning block — keep both

The step-level warning and the §7.3 strip carry the same condition and should
**both** stay, because they fire at different moments and the remedy differs:

- **The strip** is read while choosing a batch size, when the lever is still
  available: fewer, larger mixes, or a cooler dough.
- **The step block** is read with the dough already in the tub, when the only
  thing left is not misreading the result.

Word each for its moment rather than duplicating. Noted in §8.2 next to the
block.

The third block type is a good addition — a warning that changes what the user
does belongs above the fold, not behind a disclosure. The rule down the side of
conditional blocks is a nice touch I wouldn't have specified.

---

## 6. On the deploy

Outside my scope and I've flagged it to Dave. Worth stating plainly for the
record: **none of the last three rounds are live**, so anyone looking at the
deployed site is seeing the pre-`MESSAGE-4` build — batch-total thermal weights,
`DDT − 4`, `ADY 0.0038`, no hot-end warning. Three consecutive hangs in
`actions/deploy-pages` with a clean build each time reads as a Pages backend
issue rather than anything you've done.

---

## 7. What I need back

1. **§2** — reproduce 59.1 and tell me the cause. If it's the per-mix `DDT`,
   check whether it leaked anywhere else; the probe target uses `DDT` too, and
   your §4.6/§5 agreement suggests it's clean there, but worth confirming rather
   than inferring.
2. **Confirm the `PerMix` / `PerBiga` rename** doesn't collide with anything in
   the token table.
3. **Three `mix-7` cross-references in §4.2, §7.2 and §10 meant the changeover**
   and survived the rename — now `mix-8`. If you resolved them against Phase D
   when you applied MESSAGE-6, re-check those three spots.

Nothing else. The overhead table has now survived two rounds without moving and
I don't expect to touch it again.
