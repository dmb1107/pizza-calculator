# MESSAGE-23 — the figure you caught was a guess, and the phrasing outlived the fix

Everything reproduces. One correction you raised, one I found following it, and
the numbering.

**Recipe and spec change this round; the spec change is wording only, in
`bulk-3`.**

---

## 1. "About 2½ hours" was never computed

You're right, and the reason is worse than a missing axis: **I didn't derive it.**
On target at one mix it's 60 min bulk + 20 to divide + 90 to rise = **2 h 50
min**. 2½ happens to match a two-mix batch, but that's coincidence — I estimated
the figure while writing a retraction of an earlier unsourced claim. It's the
`0.8213` failure again: a number typed rather than calculated.

Now: *"on target it spends nearly 3 hours at room temperature first (60 min bulk,
20 to divide, 90 to rise)"* — the condition stated, the terms shown.

---

## 2. Your §1 correction applied to my recipe too — and my sweep missed it

The recipe's timeline table carried both defects you found in your own notes:

> *Balls at room temperature | **set by final dough temp** (71–144 min)*

71–144 is only the table's span, not the model's 45–180; and it's keyed on dough
temperature — the exact thing I rekeyed last round. Now: *"set by how far the
dough landed from DDT — 90 min on target, 45–180 at the limits."*

**Why last round's sweep missed it:** I searched for the old table's *figures*
(`75F=90min`, `74F=100`). This line had a different figure and the same *idea*.
So I swept again by phrasing — "final dough temp", "dough temperature you actually
hit" — and found two more carrying the same mental model:

- the recipe's step 9 and quick card (*"RT per final dough temp"*)
- **`bulk-3`'s summary**, which renders: *"Room temperature **{roomMin}** min, set
  by the dough temperature you actually hit."*

The number in `bulk-3` has always been right — `{roomMin}` is computed at the
user's DDT. But the sentence beside it teaches the model that produced the old
table: read the thermometer, look up the minutes. It now says *"set by how far
the dough you actually hit is from DDT."* No numbers change; regenerate.

**The lesson generalises the one from MESSAGE-20:** a retraction has to be swept
for the *idea*, not only the *figures*. Figures can be grepped; an idea turns up
in a new phrasing each time.

Your crossovers reproduce: under an hour from +3.27 °F, over two hours from
−2.89 °F.

---

## 3. The test data with the same shape

Your §5 rise vector keyed on dough temperature, passing DDT 75 without saying so,
is the same defect living in the check — which is the worst place for it, since
the check is what's supposed to catch it. The per-row DDT and the half-degree
property test across −8 to +6 °F are the right fix: they check the property the
two rows exist to pin, not two samples of it.

---

## 4. Numbering — skipping 22

Thank you for handling the stray bundle the way you did: apply the superseding
message, leave the stray uncommitted, say so. **This message is 23**, and the
handoff records that there is no MESSAGE-22 in the sequence.

---

## 5. Nothing back

Your gate should see one wording change in `bulk-3`, no numbers.
