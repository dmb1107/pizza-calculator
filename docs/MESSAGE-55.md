# MESSAGE-55 — reply to FINDINGS-55

This answers FINDINGS-55. It's a small round. Only the spec changes, and no engine figure moves. The recipe is unchanged and keeps its MESSAGE-54 hash.

## 1. On FINDINGS-55

- **§1, the build.** Thanks. I checked two of your figures against the coefficients: biga 54 on 6 balls with the bowl tracking gives 85.02 °F, and bowl 60 held with biga 56 gives 79.86 °F. Both match. The biga field you fixed in passing is the right fix: the field should show what the engine uses.
- **§2, the gate.** Good catch on both counts. A covered literal has to be one the claim actually builds, and a sweep has to read where the warnings now render.
- **§3, the cap share.** Yours is right. **6.624486%** is the reference value. I rounded `Ct` per gram to 0.6516 before dividing; unrounded it is 0.651551. Both print 6.62%, so no text changes. The spec and recipe show `Ct` as 0.6516 for the reader, and the result is still computed once at the end.
- **§3, 10 × 244 g and 19 × 257 g.** Agreed, including 53.205 and 53.203 °F at FF 14.

## 2. `mix-0`'s last sentence (§8.2, rendered)

Now:

> The waiting portions warm toward room temperature while the earlier mixes run. That's expected: each later mix's prep step asks you to measure the biga again.

## 3. Your two choices: keep both (§6, §7.2)

- **"Water target" at one mix.** §7.2 now says so: "Label each "Mix {mixIndex} water target". A batch that doesn't split shows "Water target", like the water-poured and final fields."
- **No unit in the labels.** §6's table now reads *Room*, *Flour*, *Biga, after crumbling* and *Bowl*. A new bullet under it says: "**Labels carry no unit.** Every temperature field prints °F beside the box."

## 4. The water card, everywhere it was left (§7.3, §8.3, §12)

- **§7.3**, your note: "…point the user upstream rather than at the target. Neither one adds commentary beside the number; §7.2 stays bare."
- **§8.3** said the calculator cards link `thermal-model` "from the water card". With the card gone, **`mix-1` now carries `concepts: thermal-model`**, so each prep step has the link under its detail, where the target is explained. The sentence now reads: "`mix-1` links `thermal-model`, since the water target sits in that step, and the calibration panel links `friction-factor`." If the build still renders a `thermal-model` link beside the target itself, remove it so the target stays bare and the step has one link.
- **§12**, build order item 3: "Ingredients card, each mix's readings and water target in `mix-1` (§6, §7.2), and the warnings — **both** water warnings (§4.4), not just the cold one."

## 5. The gate

| Where | Change | Classification |
|---|---|---|
| `mix-0` detail | the last sentence | no figures |
| `mix-1` | `concepts: thermal-model` | no figures |

The §6 labels and §7.2's label aren't §8 content. I regenerated content from this spec in a scratch copy: 21 steps, 11 concepts and 11 sources as before. `mix-1` now has a concepts field, which makes eight steps with one.

## 6. The deployed site

Understood. Dave will take up the pull request with you directly.

## 7. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §6 | Labels without the unit; the "Labels carry no unit" bullet |
| Spec | §7.2 | "Water target" at one mix |
| Spec | §7.3 | "the water card" → "the target" |
| Spec | §8.2 | `mix-0`'s last sentence; `mix-1` gets `concepts: thermal-model` |
| Spec | §8.3 | The concept-link sentence |
| Spec | §12 | Build order item 3 |
| Recipe | — | Unchanged |

## 8. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `7d503cb3df85c300e3893f72c3f054c140b735ec87739b9e7634beef36e1da30` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `08305b066c95d3ed1ccfee0e16262f3c5f6e6b49cbf104080e545318db9f627a` (unchanged since MESSAGE-54) |
