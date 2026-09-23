# Re: MESSAGE-19 — both asks answered, and the first needed a fix before it could be

**477 tests green** (up from 475), typecheck and build clean, verified in the
browser at every case below.

**Everything reproduces:** the §4.9 table (11.4 / 12.0 in; 0 / 0 / 1 / 13% at
265 / 266 / 267 / 300 g), 266 g capped by 0.0226 in, 0.08265 for 265 g on the
stone, the target's 1.72 against the gap's 0.72, and 2.03–5.26 inside
"2 and 5½".

---

## 1. Ask 1 — both constants are gone, but my reader check couldn't have told you

`TARGET_THICKNESS_FACTOR` and `G_PER_OZ` are removed, and nothing in `src/`,
`tests/` or the generator reads them.

**But the check you asked me to rely on could not have confirmed it.** I tested
it the way it would be relied on: put both constants back, with nothing reading
them. It **passed, 9 of 9**. It counted any textual mention of a constant's name
across `src/` and `tests/`, **comments included**, and my own comment in
`constants.ts` recording the removal names both. The comment explaining that a
constant is gone was enough to make it look read.

It's your §1 principle one level down. The name appearing and something reading
it are different things, and the two differ in exactly one place, comments. A
removal leaves a comment behind.

Fixed: the check now strips comments and counts only code reads (`C.X`, or
`BASE.X` inside the derivations). With both constants re-added it now fails,
naming `TARGET_THICKNESS_FACTOR` and `G_PER_OZ`. Every current constant still has
a real read, so the stricter rule found no hidden orphans. Its semantics are
pinned in a test: a comment is not a read, and a URL's `//` is not a comment.

So: **confirmed, by a check that can now say otherwise.**

---

## 2. Ask 2 — `{probeGapPhrase}` at the three cases, as rendered

| Conditions | Summary line | The step says |
|---|---|---|
| 6 balls, 70 °F room, FF 14.04 (defaults) | Target 71.8 · DDT 75.0 | "sits **3.2 °F below DDT**" |
| 3 balls, 60 °F room, FF 10 | Target 75.3 · DDT 75.0 | "sits **0.3 °F above DDT**" |
| 3 balls, 60 °F room, FF 11.1 | Target 75.0 · DDT 75.0 | "sits **right at DDT**" |

At FF 11.1 the unrounded gap is +0.006. From the other side of zero, FF 11.0
(gap −0.02) also reads "right at DDT"; that one is in the tests.

**One implementation choice worth knowing.** §4.10 says the number "must equal
|printed DDT − printed target| exactly", so the phrase is **computed from the
printed pair**. Rounding the gap on its own agreed everywhere my sweep reached,
but it isn't equal by construction: at a rounding tie it would print 3.2 beside
a 75.0 and a 71.9. The test sweeps 5 batch sizes × 49 room temperatures × 8 FFs
across the zero crossing. The number and the direction match the printed pair
everywhere, and "right at DDT" appears exactly when the two print the same.

The heading renders as *"Why not at DDT."*

---

## 3. §4.9, with the condition decided on the printed value

As rendered: at 266 g the block stays hidden. At 267 g it says *"about **1%**
thicker than a 265 g ball on the same stone"*, and at 300 g *"about **13%**
thicker"*.

I took "decided on the values the prose will print" literally. **The condition
reads the very string `bulk-2` prints** — `Number(tokens.thicknessPercentOver)
>= 1` — rather than recomputing `round(thicknessPercentOver)`. The block and its
sentence can't disagree about rounding, because they read one value. That's
checked at every gram from 240 to 300.

The detail set is exactly `nMix > 1`, `nBiga > 1`, `thickerThanDefault`. **The
retired name `openDiameterCapped` now throws**, so content still carrying it
fails loudly instead of borrowing another test.

---

## 4. ⚠️ §4.9 still carries the model it retracts

The new text calls the "within a gram" claim circular and removes
`TARGET_THICKNESS_FACTOR`. Two paragraphs further down, the same section still
has:

- the old table: *Uncapped diameter | Open to | Thickness factor*, with
  0.083 / 0.084 / 0.094
- *"**The cap binds above 266.1 g** — so the default 265 g ball is, to within a
  gram, the weight that fills the Tread at the target thickness."*

That sentence also contradicts the paragraph above it, which says 266 g **is**
capped. It looks as if the new text went in above the old and the old was never
deleted.

Nothing renders §4 and I build nothing from that table, so the app is
unaffected. But a fresh reader going through §4.9 top to bottom meets both
models, with the retracted claim inside the section written to retract it. It's
the MESSAGE-15 shape: a correction added while the thing it corrects stays in
place.

---

## 5. The gate on this round

**Let through, all of it.** `bulk-2` and its block are fully tokenised, and
`mix-4`'s heading and phrase have no literals. "5½" checks out at its stated
conditions: 2.03–5.26 sits inside 2 to 5½. The "2 and 5" pin came off exactly as
designed: the moment the prose changed, the test failed with *"no longer reads
as pinned — if corrected, delete knownWrong"*. **No pins remain.**

**Held back:** nothing.

---

## 6. One question, about dough rather than arithmetic

The capped block now fires from 1%, which is right for display. But its
consequence — *"a softer, breadier centre and a slightly longer time on the
stone"* — reads the same at 1% (267 g, two grams over) as at 13% (300 g). **Is
there a thickness difference below which that sentence overstates it?** That's
a baking judgment, not a rounding one, so I've left the threshold alone.

---

## 7. Nothing else back

Task 8 next.
