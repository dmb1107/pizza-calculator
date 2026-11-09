# MESSAGE-63 — the bowl after the temper, and where the dough rests

Unprompted, two of Dave's calls from bakes 2 and 3. FINDINGS-63 needed no reply. Both documents change, and three §8 items render differently: `biga-6`, `thermal-model` and `bulk-1`. No formula, constant or prefill moves.

## 1. F1: the bowl comes out of the temper warmer than the biga

Bakes 2 and 3 read the bowl at mix 1 after the hour's temper:

| | Room | Biga | Bowl |
|---|---:|---:|---:|
| Bake 2 | 67.3 °F | 54 °F | 64.5 °F, 10.5 above |
| Bake 3, mix 1 | 68 °F | 50 °F | 59 °F, 9 above |

The documents said the hour warms bowl and biga together, so the bowl tracks the biga, and `biga-6` quoted the tracking coefficient, `(Cb + C_bowl)/Cw`, 1.9 at a 6-ball mix and 2.3 at 3. Two readings say otherwise: thin stainless takes up room heat faster than the biga's mass.

**Dave's call: the prefill stays `T_biga`, and only the wording that was wrong changes.** He reads the bowl every bake, a prefilled bowl doesn't count toward the FF (§10), and moving the prefill would move every app-default mix-1 target and its pins. §4.2 now records what the prefill costs: it runs low by about the gap, so the mix-1 target it gives runs warm by `C_bowl/Cw` × the gap, 3.0–3.4 °F at 6 balls per mix and 5.9–6.9 at 3.

What changed:
- **`biga-6`** quotes `Cb/Cw`, 1.6 °F at every batch size, for a biga read with the bowl read on its own. The skipped temper keeps "about 2 °F", in the same words as `thermal-model`, because the bowl then stays as cold as the biga.
- **`biga-6`, `thermal-model`:** the hour warms the bowl as well as the biga, the bowl faster. "Tempering the biga on the counter leaves the bowl cold" is gone: its premise was a bowl left in the cold.
- **§4.7, §7.2:** the tracking basis now applies to two cases, a skipped temper and mix 1's prefill until the bowl is read. Mix 1 is held like every later mix. The −1.92 / −1.59 table is unchanged.
- **§10:** the two prefills err in opposite directions. Mix 1's understates the bowl and overstates FF, by 1.0–1.1 °F at 6 balls per mix and 2.0–2.3 at 3; the later mixes' `DDT` overstates it and understates FF. The old text said both overstate, on bake 1's tearing gain. Weighting still can't fix either.
- **§4.2's ⚠️ on bake 1** keeps the 5 °F tearing gain and the Phase C rate, and says the bowl wasn't read that day. Bake 1's own record in the recipe (its notes and the 14.57 fit) stays as written.

The §4.4 warning above 120 °F ("about 2 °F of water") is about a skipped temper, so it stays, in the spec and in `engine.ts`.

## 2. R1: where the dough rests

The ball rise is timed from the final dough temperature and assumes the dough stays near it, which takes surroundings near `DDT`. Bake 2's dough lost 3.4 °F between the end of the mix and shaping. **Dave's call: one sentence in `bulk-1`, with no figures; the figures go in the recipe.** Nothing is modelled.

The figures come from an estimate (`roomrise.py`) whose assumptions §4.8's new note lists: none is measured. Against a 75 °F spot, one 6-ball dough, from the end of the mix until the balls are cold:

| Where the dough sits | Fermentation lost (minutes at 75 °F) | Extra rise to make it up |
|---:|---:|---:|
| 70 °F | 22–23 | 26–28 min |
| 67 °F | 33–35 | 46–49 min |

The model reproduces the cooldown estimate's 29.2–38.9 minutes, and 46–49 minutes is what the rise adds for a dough finishing 7–8 °F under `DDT` (41.3 and 48.2). The recipe's step 7 has the full table.

## 3. Rendered copy

**`biga-6`**, detail paragraphs 1–3:
> Biga temperature moves the water target more than anything else you measure: each degree of biga moves the required water by about **1.6 °F**, at every batch size.
>
> Without the temper the bowl stays as cold as the biga: each degree the biga is colder costs about 2 °F of water, and the calculator will ask for water hotter than a tap can supply.
>
> Leave the biga in the mixer bowl. The {bowlMassG} g stainless bowl is part of the thermal system, and the hour warms the bowl too, faster than the biga. At the mix it reads warmer than the biga, so read each on its own.

**`thermal-model`:** "… the temper is the only way to warm the bowl before the first mix.** An hour on the counter warms the bowl as well as the biga, the bowl faster. Without it the bowl stays as cold as the biga: each degree the biga is colder costs about 2 °F of water, and at 3 balls the requirement goes past 110 °F."

**`bulk-1`**, a second paragraph in the first detail block:
> Rest the dough, and the balls after it, in the steadiest spot you have, out of the sun and close to your target dough temperature: the ball rise is timed from your final dough temperature and assumes the dough stays near it.

## 4. The gate

On a scratch clone of `main` at `2a724f1` with these documents: 21 steps, 11 concepts and 11 sources; `steps.ts` and `concepts.ts` change. 762 of 765 pass. The three failures are in `contentLiterals.test.ts`, all `biga-6`:
- the claim on "1.9 °F at a 6-ball mix and 2.3 °F at a 3-ball one" no longer matches, and its covers go stale;
- "1.6 °F" and "2 °F" are unclassified.

Two claims at `biga-6.detail` replace the old one, and with them the suite passes 766 of 766 and the typecheck is clean:
- **"1.6 °F"**: `bigaSensitivity(6, 'held')`, with a `holds` that 3, 6 and 9 balls all print 1.6 (`Cb/Cw` is dough-only);
- **"2 °F"**: the text `thermal-model`'s claim already uses, "each degree the biga is colder costs about 2 °F of water", with the same `holds` (the tracking figure rounds to 2 at 3 and 9 balls).

`bulk-1`'s sentence has no digit. I grepped `src` for copy that says the bowl and biga warm together or quotes 1.9 / 2.3 per °F of biga: nothing besides the §4.4 warning, which stays.

## 5. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §4.2 | Equilibrium holds in the fridge; the temper's gap and its cost; the prefill stays (Dave's call) |
| Spec | §4.7 | −1.59 with the bowl read; −1.92 to −2.25 for a skipped temper |
| Spec | §4.8 | New note: the rise assumes surroundings near `DDT`, the estimate and its assumptions |
| Spec | §7.2 | Mix 1 is held; the two tracking cases |
| Spec | §10 | The prefills err in opposite directions |
| Spec | `biga-6`, `thermal-model`, `bulk-1` | Rendered, as §3 |
| Recipe | §5, *The temper* | 1.59 with the bowl read, 1.9 / 2.3 for a skipped temper; bakes 2 and 3's readings and what the default costs |
| Recipe | §6 | `T_bowl`, the ⚠️ on bake 1, "So measure the bowl", the temper paragraph and the −1.59 ⚠️ |
| Recipe | §8, step 7 | Rest somewhere steady near DDT; the room table and its assumptions |
| Recipe | Quick card | `T_bowl` and the mix-1 prefill |

## 6. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `1bf9ccd0943e2eb9c8d0632aae573517f3afaf5a480a0094255e5b58b8847a44` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `4ba897f70ffebe108b5d190ceaa886c959aa9150d682201dfca543e9694f9f27` |
