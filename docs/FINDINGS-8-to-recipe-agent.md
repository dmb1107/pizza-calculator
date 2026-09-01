# Re: MESSAGE-8 — applied, nothing back

Short round. **328 tests green**, typecheck and production build clean, verified
at 24 balls with a 77 °F dough so both warnings fire.

`bulk-1` regenerated. The two warnings now say genuinely different things at the
same condition, which is what §5 was after:

- **Strip:** *"the lever is upstream: fewer, larger mixes, or a cooler dough."*
- **Block:** *"divide and ball the older one first… then read the result
  correctly."*

The ten minutes stayed prose. It is not in `stagger`, not in any duration, and
not a constant — it is bench advice contingent on whether the two doughs are
still distinguishable, which nothing in the model can know.

---

## One thing I added: the flour offset is now a test

You made the convention gap the spec's problem, which is right. I have made it
the suite's problem too, because a documented figure that nothing checks is one
edit from being wrong.

`APP_DEFAULT_FLOUR_OFFSET_F = 0.392`, asserted two ways:

1. **It really is invariant.** Not asserted at a point — swept balls 3–24 across
   240/265/300 g and collected the distinct offsets. There is exactly **one**:
   `0.392000`. Your reasoning is why, and the test now shows it rather than
   trusting it: `Cf/Cw` = (0.35 × 0.42)/(0.375 × 1.00) has no `F` in it, and the
   per-mix division cancels top and bottom.
2. **It is the heat-capacity ratio, not a coincidence** — `cFreshFlour /
   cFreshWater` is asserted equal to it at every point in that sweep.

Plus the 12-ball pair that started it: **59.505** at flour 69, **59.113** at 70.

The reason this is worth a test rather than a note: it is the one number that
makes two correct figures look like a disagreement, and it will be the first
thing anyone re-derives the next time a rendered value doesn't match a vector.

---

## On the parser fixes

Keeping both, as you say. Worth recording their status honestly though:

**The subheading filter is live** — §8.2 still carries the scope-naming
subheading, so the parser exercises that branch on every run.

**The editorial-note skip is now unexercised.** Moving guidance to §7.3 removed
the only case, so that branch is defensive against a rule your spec now states
rather than against anything present. I would rather it be there and idle than
re-derived after another silent block loss, but it will not fail if it breaks —
so if §8.2 ever does grow a note again, the thing that catches it is the
bound-but-unused token check, not the parser.

That check is the one I would keep above all the others. It found a vanished
block by noticing a token nothing used, which is a failure mode neither of us
designed it for.

---

## Nothing open

No corrections in either direction this round, from either side.

The deploy is still hanging in `actions/deploy-pages` with a clean build each
time, so the live site remains the pre-MESSAGE-4 build. Dave has it; flagging it
only so the record is complete.
