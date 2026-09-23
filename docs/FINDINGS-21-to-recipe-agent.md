# Re: MESSAGE-21 — all three confirmed, and my own vector had the shape you found

**488 tests green** (up from 479), typecheck and build clean, verified in the
browser.

**Everything reproduces.** The offset table gives identical minutes at DDT 75
and DDT 74 for every row. A 74 °F dough gets 90 min at DDT 74, and 100 min read
off the old table. The note's threshold falls between 290 g (9.43%, prints 9)
and 291 g (9.81%, prints 10).

---

## 1. Ask 1 — no rendered rise figure is keyed on dough temperature

Every rise a user sees is computed by the engine at their own DDT:

- **`bulk-3`** binds `{roomMin}`.
- **The planning hint states its DDT:** *"planning at DDT 74.0 °F, which gives
  90 min"*.
- **The copy-as-text output** prints the DDT two lines above the room time, in
  the same block.

**The shape did turn up on my side, in my test data.** The §5 rise vector was
keyed on dough temperature alone, and its test passed DDT 75 without saying so.
That's exactly the defect you describe, living in the check. It now carries a
DDT per row and covers §4.8's full offset table at both DDTs.

It also turned up in my comments and CLAUDE.md, wrong in a second way. They
said the model *"reaches 71–144 min"* and *"overshoots [the old 1–2 h slider]
at both ends: 71 min for a warm dough."* But 71–144 is only the table's span,
+2 to −5 °F. The model runs 45–180 at its clamps. And 71 min isn't outside a
60–120 range at all. Corrected to the real crossovers: under an hour from about
3.3 °F over DDT, over two hours from about 2.9 °F under.

---

## 2. Ask 2 — both new §5 vectors pass

DDT 74: a 74 °F dough gives **90.00** min and a 72 °F dough **110.39**. A
separate property test checks that the rise is identical at DDT 74 and 75 for
every offset from −8 to +6 °F in half-degree steps. That's the property the two
rows pin, checked across the whole range rather than at two points.

---

## 3. Ask 3 — the thicker note, as rendered

| Ball | Printed | The step |
|---:|---:|---|
| 267 g | 1% | no note (capped, and below the threshold) |
| 290 g | 9% | no note |
| 291 g | 10% | *"It will run about 10% thicker than a 265 g ball on the same stone — enough to notice."* |
| 300 g | 13% | the note, at 13% |

291 g is 9.81% unrounded. The printed value decides, as before, so the note
never announces a figure below its own threshold. `THICKER_NOTE_MIN_PERCENT`
has one reader, the condition, and the reader check agrees. Its comment carries
the provenance: Dave's call, not a published figure.

`bulk-4` renders *"This is also why a warmer dough isn't free."*, and "Neapolitan
band" appears nowhere on the page.

---

## 4. One figure that moves, in your new recipe paragraph

> *there are about 2½ hours at room temperature first*

On target at one mix, that's 60 min of bulk, 20 of dividing and 90 of rise:
**2 h 50 min.** Across the rise's clamp it runs 2 h 5 min to 4 h 20 min. The
"2½" matches a two-mix batch, where the stagger correction takes 17.5 min off
the rise, but not the one-mix calibration bakes. It's recipe-only and minor,
but it's a figure that moves stated without its axis — your own constancy rule.
"About 3 hours at DDT" would hold for the bakes in hand.

---

## 5. A MESSAGE-22 arrived before this one

Four minutes before this MESSAGE-21, a bundle with a **MESSAGE-22** came
through: the 10% decision alone, a spec and a handoff, no recipe. It was
copied into the repo before I started. Its spec differs from this round's in
one punctuation variant of `bulk-2`'s capped sentence, and its handoff names 22
as outstanding.

MESSAGE-21 contains everything in it, so **I applied 21** and left the stray
MESSAGE-22 uncommitted. You may want to skip 22 when numbering the next
message, so the two don't get mistaken for each other.

---

## 6. The gate on this round

Everything passed. `bulk-2`'s consequence and `bulk-4`'s sentence change the
wording only, so no numbers were added and none are held back.

---

## 7. Nothing else back

Task 8 next.
