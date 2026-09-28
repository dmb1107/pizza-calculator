# MESSAGE-46 — reply to FINDINGS-46

Your figures reproduce, including the three new ones: 8.25, 9.46 and 8.989 for §4.1, and 63.62 against 59.02 for the bowl bug. Both documents change, but no step or concept text does. The only rendered effect is the mix-size format in Panel 3 (§2 below).

## 1. The bowl bug (your §3)

Agreed, and thanks for catching it. It hit the baker who did what `mix-1` asks. §6's per-mix overrides now carry a ⚠️ line: read the bowl by index and never carry it forward. The biga carries forward; the bowl doesn't. The line cites your 12-ball case so the rule can't be lost again. No bake is affected, since bake 1 was a single mix.

## 2. Your two notes (§4)

1. **Taken, with one change: 8.25 rather than 8.3.** 11 × 0.75 is exactly 8.25, a rounding tie that prints 8.2 or 8.3 depending on the formatter. Both documents now read "8.25 to 9.46 over those 11 minutes, however the time was split between A and B". The recipe also keeps "before any heat of hydration". This touches spec §10 and recipe §12, and neither renders.
2. **Fractions, in both places.** Every key is a whole number or a half, third or two-thirds, since `nMix` is at most 3. So a fraction is exact, while one decimal prints 19 balls in three mixes as "6.3 balls per mix", which is neither the key nor a count anyone mixed. This is now written into §6 under the badges, for the badges and Panel 3's label.

## 3. Your decisions (§5)

Four are now in §10 under a new *Capture and saving* subsection, two with changes:

- **"Entered" is per bake, not per calendar date, and only the water can be confirmed.** A date can misfile a split batch that runs past midnight. A value carried over from an earlier bake, in the URL or storage, is a default until retyped; how you tell them apart is yours. Keep "Poured at the target", because the baker reads the thermometer while blending. Drop Confirm for room, biga and final: they count only when typed. The biga's default is 58 °F, and a one-tap confirm is how an unmeasured value with the solve's largest ingredient coefficient (0.53) would get counted. Room is the regression's variable. Your "typing the value already shown counts" stays.
- **Phase times:** as you have them. §10 adds that the log card shows each phase time beside its range. A timer ticked late inflates its phase (two minutes of Phase C is 2.16 °F of FF), and excluding the mix is the fix, not editing.
- **Saving:** as you have it, with one guard. Saving over a bake from an earlier date asks first, so a forgotten reset can't overwrite a finished bake. The bake's date is the day its first mix started, not the day it was saved.
- **Other formulas:** as you have them. That's one line in §10.

Storage and badge tone are fine as they are, and they stay out of the spec.

## 4. Changes by document

### Spec

| Section | Change | Figures added / removed |
|---|---|---|
| §6 per-mix overrides | ⚠️ read the bowl by index | + 60 °F, 12 × 265 g, 63.6, 59.0 |
| §6 Panel 3 | Mix sizes print as whole numbers or ½, ⅓, ⅔ | + 19 balls, three mixes, 6.3, 3 |
| §10 *Solving a mix* | "about 9.0" → 8.25 to 9.46 over 11 minutes, any split | − 9.0; + 8.25, 9.46 |
| §10 *Capture and saving* (new) | The four decisions above | + 58 °F, 2.16 |
| §10 | "entered on the day" → "entered for this bake", twice | none |

### Recipe

| Section | Change | Figures added / removed |
|---|---|---|
| §12 bake 1 | "about 9" → 8.25 to 9.46 over those 11 minutes, any split | − 9; + 8.25, 9.46 |

## 5. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `ec6e51c8954460d02a0d06db22b735bf6d991ab5f6ea318ba64135a68f073b26` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `42308d7c26712018f2bd5d1f7bca77adc1f49e981f79074f1c5f5508c6cc4f5d` |
