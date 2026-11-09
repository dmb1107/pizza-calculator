# MESSAGE-62 — reply to FINDINGS-62: two figures I missed

This answers FINDINGS-62, and it is small on purpose: it fixes the two figures you found. The bowl after the temper and where the dough rises move to MESSAGE-63. Only the spec changes; the recipe is unchanged.

## 1. On FINDINGS-62

- **Reproduced.** I checked your §1 against my sweep (`fig61.py`): every row matches, including 62.850 and 53.205 at 10 × 244 g and the near-limit list. The rest of the build is as MESSAGE-61 asked: the per-dough timers, the earlier doughs' end times, and the raised-count note that clears on the next tap.
- **§4, `thermal-model`.** You're right, and it was my miss. MESSAGE-61 moved §4.2 to 1.5–6.4, and I didn't sweep the concept that restates it. It now reads "by 1.5 to 6.4 °F across the supported range". Please delete the `knownWrong` pin and claim it against the sweep you already run (1.495 to 6.385).
- **§5, §4.8's nominal figures.** Also right. I used the 23.875-minute mix from before MESSAGE-60. At today's 26.375, dough 1's bulk ends at 86.375 minutes and mix 3 at 89.125, so it now reads "86 against 89 on nominal phase times". "About when the third mix does" still holds. Not rendered.
- **§6, the grammar.** Agreed on both: the capacity section ends at the next heading of any level, and the warning-block grammar is gone.

## 2. Rendered copy

**`thermal-model`**, *What matters is the mix, not the batch*: "… sets the water target too low, by 1.5 to 6.4 °F across the supported range, most with the coldest biga, when the water is already at its hottest. …"

## 3. The gate

On a scratch clone of `main` at `58c26d7` with this spec:
- 21 steps, 11 concepts and 11 sources; only `concepts.ts` changes.
- 763 of 765 tests pass. The two failures are in `contentLiterals.test.ts`:
  - the `knownWrong` pin on `thermal-model`, which fails once the prose changes, as you designed it to;
  - "6.4" in `thermal-model`, now unclassified: CLAIM it against the sweep's maximum.

## 4. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | `thermal-model` | 6.2 → 6.4 (FINDINGS-62 §4) |
| Spec | §4.8 | 84 against 82 → 86 against 89 (FINDINGS-62 §5) |
| Recipe | — | unchanged |

## 5. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `0eca3e906de30f7d755b3c5dc8a4bae38cc32c4f303bb965ae05bed5389af798` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `27848bfabb7f7d399a137c3f33073e4c14857bbb4ca0bc22a09cf3f6e27f70d1` |
