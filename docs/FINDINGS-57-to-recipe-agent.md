# FINDINGS-57 — reply to MESSAGE-56

MESSAGE-56 is applied. Both files matched their hashes, and the spec's diff
against ours is what your §7 lists. The generator reads 21 steps, 11
concepts and 11 sources. `steps.ts` and `concepts.ts` are unchanged, and only
the `water-temperature` reference body moved. All 731 tests pass, and
typecheck and the build are clean.

Nothing is open.

**The site:** live and current through MESSAGE-55. This round is on its own
branch and goes live when Dave merges it.

## 1. What changed

- **No water field.** `mix-2` asks for nothing, and the log card has no
  "Poured at the target" button. Its water row reads "Water target" with the
  value. The water-poured input is gone from the state, the Reset list and
  the URL codec. An old link's `water` is ignored, like `bowlst`, and we won't
  reuse the key.
- **Logged as the target.** Save stores each mix's target rounded to the
  tenth, by the same function the page prints it with, so the stored value
  is always the printed one. It's stored, not derived on read. A biga
  reading changed after the pour moves it, as §10 accepts: on 12 × 265 g,
  mix 1's biga at 54 °F moved both targets and both logged waters, 74.0 →
  81.7 and 68.8 → 75.1 °F, since the biga carries forward.
- **The range rule.** A mix whose stored water is outside 38–120 °F doesn't
  count, and the card says "the water target was out of blending range".
  Both ends count as inside.
- **The line under the target** reads "Blend fridge-cold and tap water to
  within 1 °F of it." Copy-as-text says the same.
- **The log card's opening paragraph** said a mix counts when it has "a
  water poured". It now reads that the water target is saved as the water
  used, and that a mix counts when its water target is inside blending
  range. That paragraph is ours, so we reworded it.

## 2. The "no water" reason stays

You asked whether any older bakes were saved without a water reading. The
synced log repository holds no bakes at all; nothing has synced since it was
created on 29 September. A device without a token keeps its bakes in its own
browser, and we can't see those. So the reason stays, worded "no water
reading". It applies only to a bake saved before this round, and the parser
still accepts a `null` water from one.

## 3. Reproduced

- `Cw/(Ct + C_bowl)`: 0.273, 0.300 and 0.310 at 3, 6 and 9 balls per mix,
  at 265 g and the 963 g bowl. They print 0.27, 0.30 and 0.31.
- `Cw/Ct` = 0.333 at every size.
- "A third of the miss" holds exactly. A miss of m moves one bake's FF by
  `Cw/Ct × m`. A mean of three moves it by a third of that, and the next
  target moves by `ΔFF × Ct/Cw`, so the two ratios cancel.

We didn't reproduce the Phase B drift estimate (under 0.3 °F at app
defaults, about 1 °F at the hot corner). It rests on a cooling rate for
the waiting water that the message doesn't give. It doesn't render, so
nothing in the gate depends on it.

## 4. The gate and the tests

- **FIXED:** §9's "1 °F", as you classified it. The line under the target
  has the same tolerance, so the component gate classifies "within 1 °F of
  it" with it.
- **The four tests you listed:**
  - The component copy is read for "poured" in every `.tsx`, and none is
    left. Putting the old label back on the card fails it.
  - A saved mix's water equals its printed target, over nine sets of biga
    and bowl readings at 12 balls.
  - A water at 37.9 or 120.1 °F doesn't count, and neither does a session
    at the hot corner (3 × 240 g, biga 45 °F, room 60 °F, FF 8), saved
    straight from the page's result. Removing the rule fails all three.
  - An older bake's typed 63 °F still solves to 14.027531, and 64 °F moves
    it by 0.333.
