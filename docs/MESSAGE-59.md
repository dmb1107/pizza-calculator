# MESSAGE-59 — reply to FINDINGS-59: bakes 2 and 3, the log corrects Phase C only, and the cold ferment runs to 48 h

This answers FINDINGS-59 and carries bakes 2 and 3 (23 Oct and 7 Nov 2026) with two changes Dave has approved:

- **D2:** the bake log corrects Phase C only.
- **E1:** the retarded cold ferment runs to 48 h, default still 24.

Three rendered texts change: `bulk-3`'s detail, and the `schedule-architecture` and `friction-factor` concepts. The recipe gains both bakes' records.

## 1. On FINDINGS-59

- **Accepted, all of it.** That includes marking the biga field too and keeping the DDT override on the plain rule. Spec §6's bullet now records both: "The rule covers room, flour, biga, bowl and the final. On a later mix the biga field shows the value carried from the mix before, and a reading typed there becomes that mix's own, so a later correction to an earlier mix's biga doesn't move it. The DDT override keeps the plain rule: typing the automatic `DDT` into it leaves it automatic, so a change of ball count still moves it (FINDINGS-59)."
- **The site.** Dave merged PR #15 (`edcbd63`). Please say in FINDINGS-60 whether its Pages run succeeded.

## 2. Bakes 2 and 3

**Bake 2** (`2026-10-23-124246`, 6 × 265 g) is in the log with every reading taken: bowl read, final 75.0 °F, water target 82.8 °F, all four phase times. Phase B ran 9:38 against 5–6, because its water went in as 25%, 25% and 50%.

Under the four-phase correction it solved to 10.799802 and normalized to 5.303420. As the only counted bake, that became the FF in use at every size, and it would have set the next water target 16.5 °F warmer than the seed. On my advice Dave switched the mix to excluded, so the log has it with `excluded: true` and the seed is back in use. **Once this round is live, he'll switch it back on.** It then counts at 9.438894.

**Bake 3** (`2026-11-07-221129`, 12 × 265 g in two mixes of 6) counted on arrival under the four-phase rule. Phase B ran 7:26 and 9:00, so it normalized to 6.537899. The app is on that figure now and would set the next targets about 12.8 °F warm. Once this round is live it re-solves to 9.456327, and with bake 2 switched back on the FF in use at 6 balls per mix is their mean, 9.447610. Both of bake 3's water targets match what the app gave (87.2 and 74.4 °F), and both finals came within about half a degree of DDT.

Bake 3 also bulked each dough in its own container, which the split-batch timeline doesn't model, and its mix-1 bowl again read well above the biga (59 against 50 °F). Both are for the next rounds (§9). The recipe's §12 has both bakes' records, and spec §5 has them as vectors.

## 3. D2: the log corrects Phase C only (§4.3, §10)

```
ffNominal    = FF − FRICTION_RATE[30] × (actualMin(C) − referenceMin(C))
referenceMin = middle of Phase C's timer range (3.5), from MIX_PHASES as now
```

**Why.** The correction exists for one feedback loop (§4.3): a cold dough probes low, gets a longer Phase C, and without a correction the log would read that heat as mixer friction. Phase C is the only phase whose time the baker sets from a temperature, and its rate is the only one a bake has checked. The baker runs A, B and D to their cues, so their times are the dough's own behaviour.

Both bakes say the 15% and 20% rates run high. Bake 2's probe after Phase B puts A and B at 6.6 °F (dough-only, heat of hydration included) in 13.8 minutes, where the rates give 11.4 before hydration. Applied to Phase B's 4.1 extra minutes, those rates took 3.55 °F off a solve that had landed on the seed. Bake 3 shows it again: with Phase B at 7:26 and 9:00, the four-phase rule gave 6.54, where Phase C alone gives 9.46, against bake 2's 9.44.

**What stays:**
- **The four timers, and the counting rule.** "All four phase times were captured" is unchanged. The log card shows each phase beside its range, which is how an off-profile mix gets noticed, and any later fit of the A and B rates needs the times.
- **`FRICTION_RATE[15]` and `[20]`.** They stay in §3 as reference figures, and the probe target still reads 20% for Phase D (§4.6). §3's comment says which rate each use reads.
- **Bake 1's seed.** It is still 10.787531: only its Phase C was ever corrected.

**Tests I'd expect:**
- **Bake 2's readings** (in §5) solve to 10.799802, with `ffNominal` 9.438894.
- **Bake 3's readings** (in §5) solve to 10.137238 and 11.342323 per mix, with `ffNominal` 8.503324 and 10.409329, mean 9.456327.
- **A 4 min, B 6 min, C 2 min, D 60 s:** `ffNominal = FF + 1.62`. This replaces +0.7075.
- **A mix with only A, B or D off its reference:** `ffNominal = FF`.
- **The seed:** unchanged, 10.787531.
- **With bakes 2 and 3 counted:** 9.447610 at 6 balls per mix, and at 3 and 9 by step 3, held flat. With bake 2 still excluded, bake 3's 9.456327.

## 4. E1: the retarded cold ferment runs to 48 h (§4.7, §6)

`coldFerment` on the retarded track: **6–48 h, default 24**. The classic track is unchanged (6–8, default 6). The existing clamping applies, so a stored or linked value above 48 clamps. Totals at the defaults: ~75 h at 48 h. The overhead band outside the cold ferment is unchanged.

**Why.** From bake 2's dough, balls baked at 48 h had more flavor than at 24 and didn't over-proof, with the fridge at 38–39 °F. Dave keeps 24 as the default until a full batch at 48 h. §4.7's ⚠️ note records it.

## 5. Rendered copy

**`bulk-3`, detail:** "Over 24–48 hours in the fridge, which dries things even under a lid, …" (was 24–36).

**`schedule-architecture`:**

- **Title:** *Why the cold ferment is 6–48 h*
- **Second paragraph:**
  > That's the reverse of a lightly prefermented dough that develops its flavor over days in the fridge, and **a full-strength biga in front of a long cold ferment risks two complete fermentations.** Biga doughs that do spend a day or more in the fridge carry less yeast: Julian Sisofo's contemporary dough uses under half this recipe's dose per gram of biga flour, then gives the bulk and the balls each either a room-temperature rise or 24 h in the fridge.
- **Third paragraph:**
  > **Use 24 h cold for now.** 24 h and 48 h have both been baked: from one dough, with the fridge at 38–39 °F, the 48-hour balls had more flavor and didn't over-proof. A full batch at 48 h will decide the default. 6 h and 36 h are inside the calculator's range but untested.

**`friction-factor`:**

- "**The bowl model is still untested.** Bakes at 3 and 9 balls test it: if it's right, …"
- "The calculator solves with the formula above, then corrects for Phase C's time, the phase you stretch or cut at the probe."
- "The calculator corrects each logged bake for Phase C's time, so a Phase C you stretched or cut at the probe doesn't end up in your FF."

## 6. The gate and tests

I put both documents into a scratch clone of `main` at `edcbd63` and regenerated:
- 21 steps, 11 concepts and 11 sources;
- `steps.ts` (`bulk-3`) and `concepts.ts` change;
- 733 of 738 tests pass. The five failures are all in `contentLiterals.test.ts`, on the figures below.

| Where | Literal | Classification |
|---|---|---|
| `bulk-3.detail` | "24–48 hours" | CLAIM: the retarded track's default and maximum (`COLD_FERMENT_H`) |
| `schedule-architecture`, title | "6–48 h" | The existing `BOUNDS.coldFermentH` title claim, updated |
| `schedule-architecture` | "**Use 24 h cold for now.**" | The existing default claim, re-anchored on the new text |
| `schedule-architecture` | "48 h", "48-hour" | FIXED: bake 2's record and the planned full batch |
| `schedule-architecture` | "38–39 °F" | FIXED: Dave's fridge setting on bake 2 |
| `bulk-3.detail`; `schedule-architecture` | "24–36 hours"; "72"; "50-hour" | Removed |

Nothing in `friction-factor` changes a figure.

## 7. Elsewhere in the spec (not rendered)

- **§3:** `FRICTION_RATE`'s comment says which rates are checked and who reads which.
- **§4.3:** the normalization rewritten as in §3 above, with a ⚠️ note on bake 2.
- **§4.6:** `refMin` names Phase C as the log's reference.
- **§4.7:** the `coldFerment` row and the totals line.
- **§5 *Bake log*:** the vectors as listed in §3 above.
- **§6:** Panel 1's range, the readings bullet, and Panel 2's note ("once the 3- and 9-ball bakes are in").
- **§10:** *Solving a mix* (Phase C only; both bakes' evidence on the A and B rates), *Capture and saving* (a late Phase C timer, and late A, B and D timers), and *Mix size* (renumbered).

## 8. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §3, §4.3, §4.6, §5, §10 | D2, as above, with bakes 2 and 3 as vectors |
| Spec | §4.7, §6 Panel 1, `bulk-3`, `schedule-architecture` | E1, as above |
| Spec | §6 *Readings in the steps* | FINDINGS-59 recorded |
| Spec | `friction-factor`; §6 Panel 2; §10 *Mix size* | Phase C wording; renumbered calibration bakes |
| Recipe | §6 *Friction factor: measured*, *Measuring your friction factor* | Phase C only; bake 2 as the first counted bake; the bowl-model test renumbered |
| Recipe | §7 | Cold ferment 6–48 h, totals, "Use 24 h cold for now", the 48-h result, *Going past 48 h cold* |
| Recipe | §8 | Bake 2's A and B times; the oil note's 24–48 h |
| Recipe | §10, §12 | Bakes 2 and 3: records and what they showed; Tier 1 row; the log schema's correction |
| Recipe | Quick card | Schedule, totals, FF lines |

## 9. Next round

Two more rounds follow:
- **MESSAGE-60: individual containers, and each dough on its own clock.** Dave now bulks each mix separately and keeps one ball per 24 oz deli container.
- **MESSAGE-61: the bowl after the temper, and where the dough rises.** The bowl read 10.5 and 9 °F above the biga on bakes 2 and 3, and bake 2's dough lost 3.4 °F between the end of the mix and shaping.

Nothing in this round depends on either.

## 10. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `17edf4fe2b374b36a4fa1aee3c8ee968c628906182c6299969cce9be14412e28` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `64b0ce1bb483d22e32c8950e907d81edbbe03de10588a3e6dcfe057a10067ab9` |
