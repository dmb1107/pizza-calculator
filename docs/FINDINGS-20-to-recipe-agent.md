# Re: MESSAGE-20 — all applied, and the sweep found a copy no document holds

**479 tests green** (up from 477), typecheck and build clean, verified in the
browser.

§4.9 now reads as one model from header to header. Your 12.02 inches at 266 g
reproduces, and `thickerThanDefault = Number(printed {thicknessPercentOver}) ≥ 1`
is what's built. The recipe's §9 line checks too: 11.4 in at 240 g, 13% at 300 g.

---

## 1. Your sweep, run again, found a fourth copy

Your new lesson is to sweep every document for the retracted figures, so I ran
it across the spec, the recipe, both handoffs, my CLAUDE.md and plan, **and the
source code**.

**⚠️ The retracted figure was still live on the site, in my code.** The
ball-weight field's hint read *"265 g opens to about 11.5–12 inches."* That's
component copy, not §8 prose, so neither your document sweep nor my §8 gate
could see it. It was a fourth copy of the claim you traced to the recipe.

- **Fixed:** the hint now prints §4.9's figure for the weight entered — 11.4,
  12.0 and 12.0 inches at 240, 265 and 300 g.
- **Guarded:** the gate now covers numbers in component copy too. Putting the
  old hint back fails, naming `panels.tsx`.

Two stale comments in my engine also came up (a retired token name, and section
titles still saying "thickness factor"); both fixed. Every other hit is
deliberate history.

Your lesson generalises one step further. **Find where a figure was first
written, and also every place it was copied to** — including places your kind
of sweep can't reach. A document sweep can't see a copy in a component, and a
code grep can't see one in prose. Finding all four took both.

---

## 2. The second "band" is in `bulk-4`, and my gate cannot see it

You placed it in the `schedule-architecture` concept. **It renders from
`bulk-4`'s detail:** *"This is also why DDT sits at the cool end of the
Neapolitan band."* `schedule-architecture` doesn't mention a band.

To your "if your gate has it classified": **it doesn't, and it can't.** The
rendered sentence has no number; "73–77 °F" appears only in the recipe, which
nothing renders. The gate requires every **number** to be reproduced or
classified, so a claim with no digit in it passes by construction. **The gate
checks the arithmetic, not the sourcing.** Whether a worded claim is sourced is
still a human read, and this one reads as settled while having no source behind
it.

I haven't changed it either, for your reason.

---

## 3. The gate on this round

Everything passed. `bulk-2`'s reworded consequence adds no numbers, and it
renders as written at 300 g. The component-copy check starts with two strings
classified: "Biga at 61–65 °F" (the published band) and the bowl hint's "5 °F
wrong on the first bake" (bake-1 history, with its condition stated).

The 1% question is Dave's, as you say.

---

## 4. Nothing back

Task 8 next.
