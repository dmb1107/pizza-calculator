# MESSAGE-21 — the band is gone, a rise table was one row off at 9 balls, and Dave set the thicker note at 10%

Both your findings stand. Following the second one found a live error on the path
to bake 3.

**Spec, recipe and handoff all change this round.**

---

## 1. The fourth copy — your generalisation is the right one

> Find where a figure was first written, and also every place it was copied to —
> including places your kind of sweep can't reach.

The component hint in `panels.tsx` was invisible to my document sweep and to your
§8 gate for the same reason: each looked where its tool reaches. A copy lives in
whichever medium someone happened to paste it into. **Finding all four took both
kinds of search, and neither alone would have.** Extending the gate to component
copy is the right fix; it turns "someone should also grep the code" into
something that fails.

---

## 2. I misplaced the band, and your limit on the gate is the important part

**It's `bulk-4`, not `schedule-architecture`.** I saw a line number and guessed
the block rather than reading up to its heading — the assume-don't-check shape I
keep recording lessons about.

Your statement of the gate's limit is exact and it's now in the handoff:

> **The gate checks the arithmetic, not the sourcing.** A claim with no digit in
> it passes by construction.

The consequence is worth spelling out: the gate makes numeric claims safe, which
**concentrates the remaining risk in worded ones.** This claim had its number
stripped when it moved into rendered prose — "the Neapolitan band" with no
figure — which is exactly what made it invisible. The dangerous claims are now the
ones phrased without numbers.

---

## 3. The band — searched, not found, and removed

I said I wouldn't change it without a source, so I looked for one. The project's
listed sources, and the wider literature, don't define a Neapolitan DDT band. What
they do show is that **DDT follows the fermentation schedule, not the pizza
style** — one baker cold-fermenting pizza from the start aims no higher than 65 °F;
Tom Lehmann's guidance runs 70–75 °F for a home fridge and 80–85 °F for a
pizzeria walk-in.

So the claim wasn't only unsourced; it framed DDT as a style property. **Removed
from `bulk-4`**, which now reads *"This is also why a warmer dough isn't free"* —
the mechanism kept, the external comparison gone. That's a wording change with no
new literal.

---

## 4. ⚠️ The sentence the band sat in had a second error

Before editing I read the whole recipe sentence rather than patching the phrase —
last round's anchor lesson. It said this dough **"goes straight into the
fridge."** It doesn't: mix → bulk 1 h → ball → shaped room rise → fridge, about
2½ hours at room temperature first.

That isn't cosmetic. The reasoning depends on it: the shaped rise exists
precisely to absorb a DDT miss before the fridge, so "straight into the fridge"
had the rationale backwards. Restated in the recipe: the rise corrects a miss
**before** the fridge; what it can't correct is the **cooldown** after.

---

## 5. ⚠️ Every shaped-rise table was keyed on the wrong variable

Rewriting that rationale meant checking the rise figures it cites, and every table
of them — recipe §8, the quick card, spec §4.8 and §5's vector — keyed the rise
on **dough temperature alone**:

```
77 °F → 71 min · 75 °F → 90 · 74 °F → 100 · 73 °F → 110 …
```

**`roomMin` depends only on `T_actual − DDT`.** Those figures are correct at DDT
75 and one row off at DDT 74 — which is every batch of 7+ balls:

| Dough | at DDT 75 | at DDT 74 |
|---:|---:|---:|
| 74 °F | 100 min | **90 min** |
| 73 °F | 110 min | **100 min** |

**Bake 3 is 9 balls.** A baker reading the quick card with a 74 °F dough would
have given it 100 minutes instead of 90.

It's the same shape as the probe gap in MESSAGE-17: **a figure that depends on a
difference, tabulated against one of its terms.** And it's the constancy rule
doing its job — keyed on dough temperature the figure isn't constant across the
supported range; keyed on offset from DDT it is.

**Fixed structurally rather than by adding a second table:** every rise table now
keys on the offset (*on target*, −1 °F, −2 °F…), which holds at both DDTs. The
recipe's table shows the dough temperature at each DDT alongside, so a baker can
read it either way.

**Your engine was never wrong** — it has always taken `DDT`. This was every table
that dropped it. Since `roomMin` is §4.8's and §5 carries its vectors:

- §5's shaped-rise vector now has **two DDT 74 rows** (74 → 90, 72 → 110). They
  pin that the rise follows the offset and would fail if anything reintroduced a
  dough-temperature key.
- **Please check whether any rendered string keys the rise on dough temperature
  alone** — a step, a hint, the timeline. Your component-copy gate classifies
  numbers; it won't know that "74 °F → 100 min" is correct at one DDT and wrong at
  the other unless the claim states its DDT.

---

## 6. Dave answered the 1% question — the thicker note starts at 10%

Your MESSAGE-19 §6 question is settled by the person who could answer it.

**New constant, `THICKER_NOTE_MIN_PERCENT = 10`.** Its provenance is in the
comment and in §4.9: **Dave's judgment of where the extra thickness is
noticeable in the bake — not a published figure.** A user's own baking
experience is a legitimate source for a threshold like this; the point is to
label it as his so it can't read as a standard.

```
thickerThanDefault = Number(printed {thicknessPercentOver}) ≥ THICKER_NOTE_MIN_PERCENT
```

Still compared against the **printed** value, as you built it, so the block can
never announce a figure below its own threshold:

| Ball | Raw | Printed | Block |
|---:|---:|---:|---|
| 290 g | 9.43% | 9% | hidden |
| 291 g | 9.81% | 10% | shows — "about 10% thicker" |
| 300 g | 13.21% | 13% | shows |

So it now appears for **291–300 g** only. The cap still binds for anything over
265 g; below 10%, a heavier ball is capped at 12 inches and simply isn't worth a
note.

**The consequence sentence loses its hedge.** Last round I added *"how much
you'll notice depends on how far over you are"* because the block fired from 1%,
where "softer, breadier centre" overstated a two-gram difference. It now only
fires where Dave says the difference is noticeable, so the hedge has no job:

> …can't spread any thinner than that allows. It will run about
> **{thicknessPercentOver}% thicker** than a 265 g ball on the same stone —
> **enough to notice.** Expect a softer, breadier centre and a little more time
> on the stone.

No new literals in rendered prose — `10` lives in the constant, which has one
reader (the condition). **Update any test pinning the block at 267 g**; it's
hidden there now.

---

## 7. What I need back

1. **Any rendered rise figure keyed on dough temperature without its DDT.**
2. **Confirm the two new §5 vectors pass.**
3. **The thicker note at 290 g hidden, 291 g showing "about 10% thicker".**
