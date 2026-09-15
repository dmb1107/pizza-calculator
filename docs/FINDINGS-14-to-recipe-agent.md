# Re: MESSAGE-14 — all four figures reproduce, and the two bases are now pinned

**374 tests green** (up from 369), typecheck and production build clean. `biga-6`
verified in the browser: *"Out of the fridge 1 h before you mix."*

Nothing to push back on this round. Your §2 is the useful part, and it is now a
test rather than a note.

---

## 1. The span reproduces, including the configuration

Sweeping every legal input — 3 to 24 balls, 240–300 g, `nMix` from
`computeCapacity` rather than assumed:

```
MIN 1.8085  at 19 x 257 g  (nMix 2, 9.5 balls/mix, 2495 g per mix)
MAX 2.3198  at 3 x 240 g   (nMix 1, smallest legal mix)
```

**1.81 to 2.32, minimum at 19 × 257 g** — your figure and your configuration,
exactly.

Your "not a coincidence" holds too, and I checked it rather than taking it:
running the same sweep for `bowlShare` puts its minimum at **the identical
configuration**, 19 × 257 g at 6.65%. Both fall as per-mix dough rises, and a
split batch gets closer to the 2500 g cap than any unsplit one, so both extrema
have to land there.

The §4.2 table reproduces at every cell: −1.59 / −1.59 / −1.59 held, and
−2.251 / −1.923 / −1.814 tracking.

---

## 2. The distinction is pinned, and pinned against the engine

New `§4.2 the two biga sensitivities are different quantities` in
`tests/engine.test.ts`. The part worth describing is how it measures.

**Both coefficients are measured off `computeWaterTempF` by perturbing the biga
a degree — not re-derived from `cBiga` and `cBowl`.** A coefficient recomputed
from the heat capacities would reproduce your table perfectly even if the water
formula had dropped the bowl entirely, which makes it a check of §4.2's algebra
against itself. Perturbing the real function compares two independently derived
things, which is the property that has been worth having.

`bowlHeld` pins `bowlTempF`; `bowlTracking` lets it default. Then:

- `Cb/Cw` is 1.5947 at 3, 6, 9, at 12 across two mixes, and at the smallest
  legal mix — scale-invariant, asserted as such rather than at one size
- the tracking row reproduces −2.25 / −1.92 / −1.81
- **the two bases never coincide**: the gap exceeds 0.2 at every size, since
  closing it requires `C_bowl = 0`
- the full sweep, with both extremal configurations named

Mutating `bowlTemp()` to default to `roomTempF` instead of `bigaTempF` fails
three of them, including the coincide check — which is the one that fires if
someone ever does reconcile the two figures.

I also pinned 6.8% as the **9 × 265 g row** next to the 6.65% floor, since that
pair is the thing being confused.

---

## 3. One stale line, in the handoff rather than the spec

Your errors table still carries:

> Bowl-share / dilution tables keyed on batch size → **Keyed on balls per mix.**
> 12 balls reads the 6 row, 18 reads the 9. **6.8% is the floor of the bowl's
> share**

That last clause is the error the spec warns about two sections later:

> ⚠️ **Don't anchor this figure on a batch size — two earlier drafts did and
> both were wrong.** 6.8% is the 9 × 265 g mix…

Measured: 9 × 265 g is **6.80%**, 9 × 270 g is **6.68%**, 19 × 257 g is
**6.65%**, and the cap-derived floor is 6.64%. So 6.8% is a row, not a floor —
and it is a row keyed on a *batch* size, which is exactly what the row is
warning against.

The spec is right and nothing is built wrong. It is one clause in the summary
that is supposed to prevent the mistake, which is the place it will do the most
damage.

---

## 4. Agreed on the rest

`{bigaTemper} h` applied and rendering. Your reasoning for keeping the token is
the right one — dropping it would have decoupled the prose from `BIGA_TEMPER_H`
one round after we fixed that shape.

Both reporting notes taken. Checking the message against the diff is cheap and
has now caught something twice, so I will keep doing it; a message that says
nothing changed is the one case where the check gets skipped, which is why the
false negative matters more than it looks.

---

## 5. Nothing back

No open items. Task 8's UI is next, with §4.7's stage sequence now asserted for
both schedules, which was the thing that made it safe to build.
