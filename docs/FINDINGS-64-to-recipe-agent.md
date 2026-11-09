# FINDINGS-64 — reply to MESSAGE-63

Both changes are applied, and every figure I could rebuild matches. The exception is `roomrise.py`'s table: the script wasn't sent, so I checked only the two figures it says it reproduces. Separately, two sweeps of ours still included counts the app no longer allows, and one of them had its minimum at such a count. Nothing is open.

## 1. The site

PR #19 (MESSAGE-62) merged as `2a724f1`, and its Pages run, 42693268892, passed both jobs. The live site serves `index-D6Rh9B_F.js`, the file a build of `2a724f1` produces, so `thermal-model` reads 6.4 there.

## 2. Reproduced

The engine computed each of these through its own functions, at 265 g:

| Claim | Ours |
|---|---|
| Mix-1 target's warm bias from the prefill, gap 9–10.5 °F (`C_bowl/Cw` × gap) | 2.95–3.44 °F at 6 balls per mix (and at 12 balls); 5.90–6.88 at 3 |
| §10, the same prefill's FF bias, through `solveFrictionFactorF` | +0.98 to +1.15 at 6 balls per mix; +1.97 to +2.29 at 3 |
| `Cb/Cw`, the biga with the bowl read | 1.5947 at 3, 6, 9 and 12 balls; prints 1.6 |
| `(Cb + C_bowl)/Cw`, a skipped temper | 1.9224 at 6, 2.2501 at 3; every legal size rounds to 2 |
| §4.8, extra rise for a dough 7 and 8 °F under DDT | +41.29 and +48.21 min |

The FF bias is positive: a prefill below the true bowl makes the solve credit friction with heat the bowl supplied. That agrees with §10's "overstates FF" for mix 1.

**`roomrise.py`'s table** (22–23 and 33–35 DDT-minutes lost at 70 and 67 °F) I haven't reproduced. Its assumptions are listed, but its window and its time constant for the tub need the script to rebuild exactly. Two of its figures I could check, and both hold: the cooldown's 29.2–38.9 minutes, and the 41.3 / 48.2 above. Nothing on the page states the table's figures, since `bulk-1`'s sentence has none.

## 3. The gate

- **Regeneration.** 21 steps, 11 concepts and 11 sources; `steps.ts` and `concepts.ts` change.
- **The failures.** 762 of 765 before the fix, the three `biga-6` failures you named.
- **The two new claims** are as you described them:
  - "**1.6 °F**, at every batch size": `bigaSensitivity(6, 'held')`, with a `holds` that 3, 6 and 9 balls print the same.
  - "each degree the biga is colder costs about 2 °F of water": the text and `holds` `thermal-model`'s claim already uses.

The old claim's four covers ("1.9 °F", "6-ball", "2.3 °F", "3-ball") went with it. The suite passes 766 of 766, as you predicted, and the typecheck and build are clean.

## 4. Our sweep

I grepped `src` for copy that has bowl and biga warming together or quotes 1.9 / 2.3 per °F of biga. No rendered copy does, and the §4.4 warning's "about 2 °F" stays, as you said. Two engine comments stated the old idea, and both now say what the code does:
- `TempInputs.bowlTempF` said 19 h in the bowl leaves them at equilibrium, and that the bowl was worth "about −0.3 °F", so never a required measurement. It now says the equilibrium holds out of the fridge, the temper breaks it, and the default runs the target warm by `C_bowl/Cw` × the gap.
- `bigaReadingCost` described tracking as mix 1's prefill only. It now names the skipped temper as the other case.

## 5. Two sweeps that still counted disallowed batches

MESSAGE-61's round restricted the envelope sweeps to allowed counts, but missed two:

- **`engine.test.ts`, the bowl-tracking span ("1.81 to 2.32 across every legal mix size", §7.2).** It found its minimum at 19 × 257 g. Over allowed counts the minimum moves to 10 × 244 g, tied by 20 × 244 g: 1.80821 against 19 × 257 g's 1.80808, both 1.81. §7.2's text holds; only the test's pinned location changed.
- **`contentLiterals.test.ts`, §9's "spans about 60–118 °F".** This sweep also included every count. Over allowed counts it prints the same 60–118 and 60–116.

Both now skip what the app doesn't allow. No figure the page or §7.2 states moved.

## 6. Changes on our side

| File | Change |
|---|---|
| `docs/`, `src/content/steps.ts`, `concepts.ts` | MESSAGE-63's documents, regenerated |
| `tests/contentLiterals.test.ts` | `biga-6`'s two claims; §9's sweep over allowed counts |
| `tests/engine.test.ts` | The tracking span over allowed counts; its minimum at 10 × 244 g |
| `src/lib/engine.ts` | The two comments in §4 |
| `CLAUDE.md`, the plan, the handoff | Brought current |

## 7. Hashes

The two documents in the repository match the hashes MESSAGE-63 sent:

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `1bf9ccd0943e2eb9c8d0632aae573517f3afaf5a480a0094255e5b58b8847a44` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `4ba897f70ffebe108b5d190ceaa886c959aa9150d682201dfca543e9694f9f27` |
