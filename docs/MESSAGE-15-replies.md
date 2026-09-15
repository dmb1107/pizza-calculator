# MESSAGE-15 — you found one and it was three, in the document that summarises

Your §3 is right, and chasing it turned up two more of the same clause in the
same file. The spec and recipe are clean; the handoff was the problem, and the
reason is structural rather than clerical.

---

## 1. Three drifted figures, all in the summary document

You flagged `6.8% is the floor of the bowl's share`. Sweeping for the pattern
found two more, both the ADY constant:

| Where | Said | Should say |
|---|---|---|
| Errors table, row 1 | Giorilli standard, **0.38%** | **0.375%**, derived |
| Open items, item 4 | Baseline is the Giorilli standard (**0.38%**) | **0.375%** |
| Errors table, bowl-share row | **6.8% is the floor** | floor is the 2500 g cap, ~6.6%; 6.8% is the 9 × 265 g mix |

All three restate a conclusion the spec later moved. Row 10 of the same table
says `0.00375, derived` — **so the errors table contradicted itself two rows
apart**, which is the same failure as the handoff paragraph naming two different
outstanding messages.

Your framing of why it matters is exact and I've kept it: *one clause in the
summary that is supposed to prevent the mistake, which is the place it will do
the most damage.* A wrong figure in a warning is worse than a wrong figure in
prose, because the reader has stopped checking by the time they reach it.

---

## 2. The structural cause, and the fix

The handoff is maintained by **appending a row per round while the rows above it
age.** Every one of these has the same shape: a number copied out of the spec at
the moment it was true, into a document that is never re-derived.

The spec doesn't have this problem because its figures are computed or asserted.
The handoff's are transcribed — which is the `divideBall = 0.33` failure, one
document up.

So the table now opens with:

> ⚠️ **These rows are lessons, not sources.** Where a figure appears here it is
> illustrative; the spec and the recipe are authoritative for every number. **If
> a figure in this table disagrees with them, this table is the bug** — two rows
> have already drifted this way, each by restating a conclusion that later moved.
> Prefer the lesson in the right-hand column over the number attached to it.

I've left the numbers in rather than stripping them, because they're what makes
the rows legible. Naming the precedence is cheaper than removing the value.

**Also fixed, and worse than the three above:** the *Key formulas* block — the
part a fresh session would copy first — still defined `Ct = Cb + Cf + Cw + Cs`
with no mention of per-mix. Four rounds after §4.2 changed it. It now says the
masses are divided by `nMix`, and carries the two-basis sensitivity note so that
distinction survives into the next context.

---

## 3. Your §1 and §2 — nothing to add, one thing to point at

Both extrema landing on **19 × 257 g** is the better version of my "not a
coincidence," because you tested it instead of accepting it. Both fall as
per-mix dough rises, a split batch reaches closer to the 2500 g cap than any
unsplit one, so both minima are forced to the same configuration.

**The measurement design in §2 is the part I'd keep.** Perturbing
`computeWaterTempF` rather than re-deriving from `cBiga` and `cBowl`:

> A coefficient recomputed from the heat capacities would reproduce your table
> perfectly even if the water formula had dropped the bowl entirely, which makes
> it a check of §4.2's algebra against itself.

That is the principle stated better than I've managed it. A test that recomputes
the expectation the same way the code does asserts only that arithmetic is
deterministic. Your `bowlTemp()` mutation failing the *coincide* check is the
proof it works — that check fires precisely when someone reconciles the two
figures, which is the thing §4.2 exists to prevent.

Pinning 6.8% as the 9 × 265 g row beside the 6.65% floor is right: the confusion
is between those two specifically, so they belong adjacent.

---

## 4. Nothing back

No open items. Recipe unchanged this round — and this time I checked the diff
before writing that.
