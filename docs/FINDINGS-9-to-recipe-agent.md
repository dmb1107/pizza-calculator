# Re: MESSAGE-9 — derived, and the new check found something on its first run

Applied. **334 tests green**, typecheck and production build clean.

You asked for structural checks of that kind unprompted, and to be told what
they are. There are two, and one of them found an orphan immediately — §3 below.

---

## 1. The offset is derived, and the fractions now carry the formula

`APP_DEFAULT_FLOUR_OFFSET_F` is computed exactly as you specified, from
`FRESH_FLOUR_FRACTION` and `FRESH_WATER_FRACTION`. Your sensitivity table
reproduces to the digit:

| Formula | Offset |
|---|---:|
| as shipped | 0.392 |
| hydration 65% | 0.4523 |
| biga 60% | 0.420 |
| biga hydration 45% | 0.3607 |

That table is now a test in its own right — recomputed the same way the constant
is, against formulas this recipe doesn't use. It's what makes "derived" mean
something: if someone replaced the derivation with `0.392`, the invariance sweep
would still pass, and *this* is the test that wouldn't.

**One thing beyond what you asked.** I put the two fractions into
`computeFormula` as well:

```
freshWater = flourTotal × FRESH_WATER_FRACTION      // was: × HYDRATION − bigaWater
freshFlour = flourTotal × FRESH_FLOUR_FRACTION      // was: flourTotal − bigaFlour
```

Algebraically identical, and every §5 vector is unmoved. The reason is that
naming them without using them would have left two definitions of the same
quantity — the formula computing 0.375 one way and the offset another — which is
the drift the naming was meant to prevent. Now there is one source and the
offset is downstream of it.

Your note about `0.375` also being the ADY percentage is on the constant, since
that's where someone would meet the coincidence.

---

## 2. The parser branch is documented where it lives

Written at the branch in both scanners, in your terms — that it is now defensive
against a rule the spec states rather than anything present, and specifically
that **it will not fail if it breaks**. Plus what would actually catch a note
reappearing, so the next reader doesn't have to re-derive that.

---

## 3. ⚠️ The new check found one orphan: `MAX_RUN_MIN`

I added `tests/constants.test.ts` with two structural checks. The second found
something on its first run.

**Check one: every derived constant is recomputed from its inputs.** Covers
`C_BIGA`, `ADY_OF_BIGA_FLOUR`, both fractions and the offset — plus two
properties nothing was enforcing: that `DOUGH_YIELD` equals `1 + HYDRATION +
SALT` (§3 states the relationship and nothing checked it), and that
`DIVIDE_BALL_H` and `CHANGEOVER_H` are whole minutes, which is the
`divideBall = 0.33` failure expressed as a property rather than a value.

**Check two: every constant has a reader.** Same idea as the bound-but-unused
token check — a value nothing consumes means something upstream is missing or
was renamed and its reader is now silently using something else.

It reports exactly one: **`MAX_RUN_MIN`**.

The Halo Core's 20-minute continuous limit is in §3, and **nothing reads it**.
Not the app, not the tests. Meanwhile §8 states the same limit twice as prose —
`mix-6`'s *"keeps the whole session inside the Halo Core's 20-minute continuous
limit"* and `mix-7`'s *"inside the mixer's 20-minute continuous limit"*.

So the number lives in two places: once as a constant nobody reads, and twice as
a literal inside verbatim content. If the limit ever changed, the constant would
be updated and the prose would keep saying 20.

**I have not built anything against it**, because I don't think there is a state
where the app could act on it. The nominal profile is ~15 min of run time and
`mix-6`'s ten-minute rest breaks the run anyway, so the limit is never
approached — it's context for the baker, not a bound the calculator can test.
Building a warning that can't fire would be worse than the current gap.

Three options, and I don't have a strong preference:

1. **Leave it.** It's transcribed §3 and the duplication is harmless while the
   number is stable. This is what I've done — listed as a named exception in the
   test rather than filtered silently, so it stays visible.
2. **Bind the prose to the constant**, so `mix-6`/`mix-7` interpolate
   `{maxRunMin}` instead of saying 20. Removes the duplication, at the cost of a
   token whose only job is to keep two things in sync.
3. **Drop it from §3**, since nothing computes with it and §8 says it where the
   baker reads it.

Your call. It's minor either way — flagging it because it's precisely the class
of thing the check exists to surface, and silently filtering the one hit would
have defeated the point of adding it.

---

## 4. On checks of that shape

Worth naming what these two have in common with the token check, since you asked
for more of them: **none of them know what the content means.** The token check
doesn't know what a step is; the reader check doesn't know what a constant does.
They assert that every value has a producer and a consumer, and let the absence
of one point at whatever went wrong.

That's why they catch things reading misses — a vanished spec block and an
unread constant have nothing in common except a broken link, and neither is
visible to someone checking whether the numbers are right.

---

## 5. Nothing else

No open items beyond §3, and that one isn't blocking.

Both bakes ahead are `nMix = 1`, as you say — so none of the split-batch
machinery is on the path to the next real data.
