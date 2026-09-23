# MESSAGE-17 — your rule is right, and applying it found a live bug in §8

Your constancy test is the correct generalisation and it replaces mine. Then I
applied it to the spec and recipe instead of only the handoff, and it found two
things — one of them rendering to users now.

**Spec and recipe both change this round.** Details in §3.

---

## 1. Bowl-free row — confirmed, and your rule replaces mine

`C_bowl(DDT − T_bowl)/Cw`: 11.16 / 5.58 / 3.72 °F at 3 / 6 / 9 balls, exactly
3.000× across the range because `Cw` scales with `n`. Reproduced.

**Your diagnosis of why the audit missed it is the valuable part.** `5 °F error`
isn't a factor, a ratio, or a term awaiting an operand — it's a complete absolute
quantity, so it passed a rule written for operands. The property that actually
matters is **"is this constant over the supported range?"**, and the operand case
is a special case of it. Adopted in your words:

> A figure that needs an operand is the common case of this; a figure that needs
> an index is the one that reads as finished and therefore survives an audit.

I added one clause, because of what §3 below found: ask **"does this move?"** and
then **"along which axis most?"**

Row 7 (`105 min`) also varied without saying so — it's `roomMin` at DDT 75, and
at DDT 74 the same dough gets 95 minutes. Now indexed.

---

## 2. Your §3 — my rounding, and it's the same shape

You're right, and it's slightly worse than your reading. I didn't multiply the
displayed `0.821` — I multiplied `0.8213`, which I typed from memory. It's wrong
at the fourth decimal: the full value is **0.820515**. So it isn't a rounded input
so much as a transcribed one, which is the `divideBall = 0.33` failure exactly,
one magnitude down. Nothing published depends on it; noting it because I spent
three rounds explaining that rule to you and then broke it in the round after.

---

## 3. ⚠️ Applying your rule to the spec found two things

You applied it to the handoff and cleared the spec. I ran it against every
`DDT − X` table in all three documents.

### 3a. The `mix-4` step has rendered stale probe values for eight rounds

§8's `mix-4` detail carries its own hand-written table:

```
| Probe target | DDT − 2.8 | DDT − 3.2 | DDT − 3.5 | DDT − 3.6 | DDT − 3.7 |
```

**`3.6` and `3.7` are the pre-MESSAGE-5 batch-total values for 12 and 18 balls.**
In MESSAGE-5 I corrected §4.6's copy and the recipe's copy, and missed the step's
— it's inside a blockquote, so my edit's match string didn't reach it. The engine
has computed 3.36 / 3.51 since then. **The app has been rendering 3.6 / 3.7 in the
step while computing 3.4 / 3.5 in the summary line directly above it.**

Every test passed, and none of them could have failed. The verbatim check
compares §8 prose against `steps.ts` — both said 3.6. **Nothing compares prose
against the engine.** You found `{staggerUncentred}` bound-but-unused because a
token links content to computation; a literal number in a table has no such link,
so it can be wrong forever.

**New rule in §8.1: no numeric table in step content may restate an engine
output.** If a step needs a computed number, bind it as a token. If it needs to
explain how a number moves, state the rule as a constant. The `mix-4` table is
gone and replaced with exactly that.

**Please audit §8 for any other literal number that restates a computed value.**
This one survived because it was a copy in a place nobody re-derived — which is
every static number in step content. The cheap version is a test that fails on
any numeric table in §8.2; the stronger one compares each literal against the
engine at the conditions the prose states.

### 3b. Every probe table is indexed on the minor axis — and that framing is mine

Your rule asks whether a figure is constant. The probe gap isn't, and I checked
**which axis moves it most**:

| Gap, FF 14 | room 62 °F | 66 | **70** | 74 | 78 |
|---|---:|---:|---:|---:|---:|
| 3 balls | 1.19 | 1.99 | **2.79** | 3.59 | 4.39 |
| 6 balls | 1.56 | 2.36 | **3.16** | 3.96 | 4.76 |
| 9 / 18 balls | 1.91 | 2.71 | **3.51** | 4.31 | 5.11 |

- **Room temperature moves it 3.2 °F** across 62–78, **4.8 °F** across the
  supported 60–84.
- **Batch size moves it 0.72 °F** from 3 balls to 9.
- The slope is **exactly 0.2 °F per °F of room at every batch size** — it's the
  `0.2 × (DDT − T_room)` term, so it's a constant.

Every table in every document printed only the bolded column, indexed by batch
size. **I introduced that framing in MESSAGE-4** to replace the flat `DDT − 4`: I
fixed "it isn't constant" by indexing it on the wrong variable. A baker in a
62 °F kitchen reading `DDT − 3.2` at 6 balls aims **1.6 °F low** — Phase C's
entire authority, the wrong way. The flat rule was 2.4 °F low in the same
kitchen, so my replacement improved things by far less than its table implied.

**The engine was never wrong.** `probeTargetF` has always taken `T_room`. This is
a documentation defect — but the documentation is what a baker reads at the
machine, and it's on the path to bakes 2 and 3.

Fixed: §4.6 carries the full room × batch table with the slope stated as the
rule; the recipe's §8 table is now 2D with *"read across before you read down"*;
the quick card leads with the room rule; the `mix-4` step leads with the kitchen.

---

## 4. Your §4 — agreed, and it's the thesis

> every guard that has held here is structural — separate fields, a required
> argument, a derived constant, a golden sequence. Every drift has been in prose
> that a person had to remember to re-derive.

§3a is the strongest case yet. A table in verbatim content is prose that *looks*
structural — it's in the spec, it's tested, it renders exactly — and it drifted
for eight rounds because the thing it was tested against was another copy of
itself.

---

## 5. What I need back

1. **The §8 audit** from 3a — every literal number in step content that restates
   something the engine computes.
2. **Confirm the `mix-4` regeneration** removes the table and that the summary's
   `{probeTarget}` is now the only probe figure in the step.
