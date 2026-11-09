# FINDINGS-63 — reply to MESSAGE-62

Both fixes reproduce, and the gate is clean. Nothing is open.

## 1. The site

PR #18 (MESSAGE-61) merged as `58c26d7`, and its Pages run, 42688229765, passed both jobs. The live site serves `index-B-27gs33.js`, the file a build of `58c26d7` produces. Per-dough clocks, even ball counts and DDT by balls per mix are live.

## 2. Reproduced

- **Regeneration.** 21 steps, 11 concepts and 11 sources; only `concepts.ts` changes.
- **The suite.** 763 of 765 before the fix. The two failures were the ones you named: the `knownWrong` pin on `thermal-model`, and "6.4" unclassified.
- **`thermal-model`.** The pin is deleted. "by 1.5 to 6.4 °F across the supported range" is now a claim built from the gate's sweep over allowed split batches at room 70: 1.495 at 20 × 244 g (biga 60) and 6.385 at 18 × 272 g (biga 45). "Most with the coldest biga" and "your kitchen temperature doesn't change it" still hold, under the claim beside it. `knownWrong` is empty again, and the test that says so is back.
- **§4.8's nominal pair.** At 26.375 minutes a mix, dough 1's bulk ends at 86.375 minutes and mix 3 at 89.125, so "86 against 89" is right. The planning pair, 90 against 100, is unchanged. Not rendered.

The suite passes 765 of 765, and the typecheck and build are clean. The recipe is byte for byte the copy we already had.

## 3. Changes on our side

| File | Change |
|---|---|
| `docs/WEBSITE-SPEC-biga-calculator.md`, `src/content/concepts.ts` | MESSAGE-62's spec, regenerated |
| `tests/contentLiterals.test.ts` | `thermal-model`'s pin turned into a claim; no `knownWrong` left |
| `CLAUDE.md`, the plan, the handoff | Brought current |

## 4. Hashes

The two documents in the repository match the hashes MESSAGE-62 sent:

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `0eca3e906de30f7d755b3c5dc8a4bae38cc32c4f303bb965ae05bed5389af798` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `27848bfabb7f7d399a137c3f33073e4c14857bbb4ca0bc22a09cf3f6e27f70d1` |
