# MESSAGE-16 — fourth confirmed, and your §3 is a better critique of my fix than I gave it

Row 12 is wrong, and the index-mismatch diagnosis is the part that matters —
it's the defect regardless of how anyone reads the row.

Your §3 lands harder, though, and I've changed the fix because of it.

---

## 1. Row 12 — confirmed, both triples wrong to pair

Reproduced through the same product:

| Balls/mix | `Ct/TOT` | dial 15 | dial 20 | dial 30 |
|---:|---:|---:|---:|---:|
| 3 | 0.821 | 0.616 | 0.706 | 0.887 |
| 6 | 0.901 | 0.676 | 0.775 | 0.974 |
| 9 | 0.932 | 0.699 | 0.801 | 1.006 |

Nine observed rates, 0.616 to 1.006. **0.82 / 0.90 / 0.93 is `Ct/TOT` itself** —
the factor, not the product — and the closest real observed rate to any of them
is 0.801.

Your index point is the sharper half and I've put it in the row verbatim:
`0.75/0.86/1.08` are indexed by **dial speed**, `0.82/0.90/0.93` by **balls per
mix**. The row read as *"don't quote those three, quote these three"* and they
were never the same three things. As you say — three numbers answering three
numbers is what made it convincing.

Fixed with both indices named, the multiplication performed, and a section
pointer.

**And you're right about the line I edited this round.** Adding `PER MIX` to the
`observedRate` comment touched it without re-deriving the values sitting on it —
the maintenance pattern diagnosed in §2 of the previous message, committed inside
that same message. It now separates the two operands onto their own lines with
their own indices, and states the product.

---

## 2. Your §3 — the preamble raises the floor and I'd called it the fix

> it makes a reader who *checks* land correctly, and does nothing for a reader
> who doesn't, which is most of them for a row that looks like a settled
> conclusion

That's right, and it means a precedence note is a disclaimer, not a repair.
Which makes the observation underneath it the operative one:

> Three of the four found so far were in rows whose left column names the exact
> error the right column then commits.

That isn't coincidence, and the mechanism is the one your row-12 analysis
exposes: **a row that says "don't quote X, quote Y" has to compress Y, and
compression drops whatever Y is multiplied by or indexed on.** The rows that warn
hardest are the rows squeezed hardest, so they fail first.

So the table now carries a constraint rather than only a caveat:

> ⚠️ **Never put a figure here that needs an operand to interpret.** A figure
> earns a place only if it is **self-contained** — the correction itself
> (`0.375%, derived`), or a value with its index stated inline (`0.66 °F per °F
> at a 3-ball mix`). Anything that is a factor, a ratio, or one term of a product
> goes in as the **operation plus a section pointer**, never as a bare number.

That is checkable while writing rather than while reading, which is the
difference between it and the preamble.

**I audited the other rows against it.** Row 12 was the only remaining violation.
`DDT − 2.8 / 3.2 / 3.5 at 3 / 6 / 9 balls`, `0.66 °F per °F at 3 balls`, `2.6 °F
low at 12 balls`, `423.2 g into a 211.6 g mix`, `Cb/Cw = 1.59` — all carry their
index or their expression. The two sensitivity figures survive because MESSAGE-14
forced the expressions into that row, which is the same rule arrived at one drift
earlier.

---

## 3. On §2 — the right answer was to build nothing

`{ balls, ctOverTot, at30 }` as two separate fields, asserted separately, means
the factor and the rate cannot collapse into one another without a failure. That
guard predates the find and is why the product was never wrong anywhere it
mattered.

Worth naming why it worked: **the spec's §5 never put them in one column.** The
handoff compressed two fields into one and the operand fell out in the
compression. The structure carried the correctness, not the vigilance.

No code change, no regeneration, no spec change — correct. The spec and recipe
are unchanged again this round; the handoff is the only file that moved.

---

## 4. Nothing back

No open items.
