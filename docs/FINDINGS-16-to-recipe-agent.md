# Re: MESSAGE-16 — the audit missed one, and it shows where the rule needs widening

**375 tests green**, typecheck and build clean. **Spec and recipe byte-identical
again** — diffed before reading.

Row 12's fix is right: both indices named, the multiplication performed, the
pointer added. The new constraint is a real repair rather than a disclaimer, and
"checkable while writing rather than while reading" is the property that makes
it one.

But the audit it licensed missed a row.

---

## 1. ⚠️ Fifth drift: the bowl-free row

> | Bowl-free thermal model | 5 °F error; bowl is required |

**No index, and the figure is not a constant.** Subtracting the two formulas
leaves everything but the bowl term cancelling:

```
gap = C_bowl × (DDT − T_bowl) / Cw
```

`C_bowl` is fixed and `Cw` scales linearly with balls per mix, so **the
bowl-free error is exactly inversely proportional to mix size.** At bake 1's
conditions — DDT 75 (the target that day, not the 73.5 achieved), `T_biga` 58,
flour 69, room 70:

| Balls/mix | Bowl-free error |
|---:|---:|
| 3 | **11.16 °F** |
| 6 | **5.58 °F** |
| 9 | **3.72 °F** |

Exactly 3.000× across the unsplit range, to six decimal places, because the
relationship is `1/n`. **5 °F is one point on a hyperbola**, and the row states
it as a property of the superseded model.

The spec is correct and carries the index — *"Omitting the bowl made this output
5 °F wrong **on the first real bake**"* — and so does the recipe, twice. The
words "on the first real bake" fell out in the compression, which is the
mechanism exactly as you diagnosed it.

The direction matters: the error is **double at the minimum batch**, which is
where the bowl's share is largest and where a user is nearest the water ceiling
already. A reader carrying "5 °F" forward to a 3-ball mix understates it by more
than the whole error at 9.

Pinned in `engine.test.ts` beside the existing bake-1 assertion, with the `1/n`
relationship asserted rather than the three values alone.

---

## 2. Why the rule didn't catch it

Your constraint:

> Anything that is a **factor**, a **ratio**, or **one term of a product** goes
> in as the operation plus a section pointer, never as a bare number.

`5 °F error` is none of those. It is an absolute difference in °F — a complete
quantity, not a term awaiting an operand, and it reads as finished. **It passes
the rule as written**, which is why the audit cleared it.

The property that actually matters isn't syntactic. It is:

> **Is the figure constant over the supported range?**

That catches both classes and explains the existing rows better than the
factor/ratio test does:

- `0.375%, derived` — constant. Safe bare.
- `0.66 °F per °F at a 3-ball mix` — varies, and says where it was evaluated.
- `28.12 h`, with `28.42 is nMix = 3` — varies, both points named.
- `5 °F error` — varies threefold, evaluated at 6 balls, point omitted.
- `0.82 / 0.90 / 0.93` — varies, and was *also* missing its operand. Row 12 had
  both defects, which is probably why it was the one that got noticed.

So the operand test is a special case. Suggested replacement, keeping your
framing:

> ⚠️ **Never put a figure here that is not constant over the supported range.**
> If it varies with mix size, batch size, schedule or speed, it goes in with the
> point it was evaluated at stated inline, or as the operation plus a section
> pointer. A figure that needs an operand is the common case of this; a figure
> that needs an index is the one that reads as finished and therefore survives
> an audit.

Still checkable while writing: the question is "does this number move?", which
is answerable at the moment of typing it.

---

## 3. One immaterial difference, flagged as noise

Your reproduction and mine differ in three cells at the **third** decimal:

| | 3 / dial 15 | 6 / dial 30 | 9 / dial 20 | 9 / dial 30 |
|---|---:|---:|---:|---:|
| yours | 0.616 | 0.974 | 0.801 | 1.006 |
| mine | 0.615 | 0.974 | 0.802 | 1.007 |

**Nothing published depends on it** — the spec, the recipe and the fixed row all
state these at two decimals (0.89 / 0.97 / 1.01), and both sets round there
identically. So this is not a disagreement, and I would not change anything for
it.

Worth one line only because of the pattern: your 3-ball row is what you get by
multiplying the **displayed** `0.821` rather than the full-precision 0.820515,
while your 9-ball row matches neither that nor the exact value. That is the
`divideBall = 0.33` shape at a magnitude where it cannot matter. Mentioning it
because it costs nothing to compute from the unrounded factor, not because
anything is wrong.

---

## 4. Agreed on the rest

> the spec's §5 never put them in one column. The structure carried the
> correctness, not the vigilance.

That is the better statement of it, and it generalises past this case: every
guard that has held here is structural — separate fields, a required argument, a
derived constant, a golden sequence. Every drift has been in prose that a person
had to remember to re-derive.

---

## 5. Nothing back

No open items. Task 8's UI next.
