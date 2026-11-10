# MESSAGE-64 — the recipe's science, reworded

**For Dave: run this round at Opus 5.5 `high`.** It is wording only, but the work is the kind `high` is for: regenerate, reclassify the gate's literals, and sweep `src` for copies of the retired claims. (From this round on, every MESSAGE opens with the effort level; Dave's rule, 9 Nov 2026.)

Reply to FINDINGS-64, and the result of a review Dave asked for: the recipe checked against food and baking science, independent of its cited sources. He approved the findings on 9 Nov 2026 and the wording on 10 Nov. Both documents change. On the site, seven steps, seven concepts, §9's friction-rate table and §11 render differently. **No formula, constant, token or gram weight moves.**

## 1. On FINDINGS-64

All accepted: the two sweeps now over allowed counts, and the tracking span's minimum at 10 × 244 g.

**The scripts you were owed are attached:** `roomrise.py` and `fig63.py`, with `engine.py`, which `fig63.py` imports. Put the three in one folder and run `python3 fig63.py`. It prints the room table the recipe's step 7 carries:

```
room 64: lost 44.6-46.8  extra 68.5-72.6
room 67: lost 33.5-35.3  extra 45.6-48.6
room 70: lost 21.7-23.0  extra 26.2-28.0
room 72: lost 13.3-14.1  extra 14.9-15.9
room 73: lost 9.0-9.5  extra 9.7-10.3
room 78: lost -15.3--14.3  extra -13.6--12.8
```

`engine.py` is my Python reference and is stale in three places that `fig63.py` doesn't touch (`ddt()` keys on total balls, `normalize()` is the retired four-phase rule, and `REF['B']` is 5.5). `fig63.py` calls only `thermal(b, 265, n=1)`.

## 2. What the review found

Each row is one item of the wording Dave approved (W1–W18). "Whose call" is Dave's throughout: he took my recommendation on every item.

| Item | What the documents said | What was wrong with it | What they say now |
|---|---|---|---|
| W1 | A biga's low water activity slows proteases, and pushes bacteria toward heterofermentative pathways that make acetic acid | Sourdough science applied to a yeast-leavened preferment. In yeast dough the pH falls mainly from succinic acid the yeast makes (Jayaram and others, 2013); flour's proteases need a lower pH than that to do much (Thiele, Gänzle and Vogel, 2003); a 50% biga's water activity isn't low | A slow ferment gives the yeast time to make the alcohols, esters and acids that flavor the crumb; the gluten holds because the biga never gets acidic enough; the little acid there is firms the gluten (Jayaram and others, 2014) |
| W2 | "Flavor gains flatten sharply above about 60% biga" | No source | Removed |
| W3 | A biga "shouldn't have" gluten, while `formula-rationale` said its gluten "is built before the water goes in" | Gluten forms from water and time; the two passages contradicted each other | Kneading works the gluten into a network that holds gas, which a biga shouldn't have. The gluten itself forms anyway |
| W4 | A doubled biga was over-mixed; "it isn't a yeast problem"; a jar makes the 20% cue objective | Loose chunks vent gas, so the rise measures retention as much as fermentation. A doubled biga can also be over-fermented. Biga packed in a jar holds more gas than chunks in a bowl | Over-mixed, or over-fermented if it also smells sharp. The jar paragraph is gone from `biga-5` |
| W5 | At 61–65 °F "the bacteria produce the balance of lactic and acetic acid"; the classic track gives "the truest biga flavor" | As W1. The one study found on temperature (Birch, Petersen and Hansen, 2013) shows a different aroma profile at 5 °C, not a lesser one, and none shows an optimum at 61–65 °F | 61–65 °F is the window the dose is set for |
| W6 | The biga "is meant to do nearly all the work"; a long cold ferment "risks two complete fermentations" | True of the classic track only. By the recipe's own model the retarded biga is 6.7 h at 75 °F and its dough stage 8.8 h at 24 h cold | The retarded track moves part of the work into the dough; the recipe carries the three totals |
| W7 | The retarded biga gets "about 11 hours' worth at 63 °F" | Most of that is fridge time, and one doubling per 17 °F overcredits the fridge: Saccharomyces yeasts stop growing between 1.3 and 4.3 °C (Salvadó and others, 2011) | "At most about 11 hours' worth". `Q_DOUBLING_F` stays; it is sound near `DDT`, where the rise uses it |
| W8 | The conversion "gives exactly 0.375%" | 0.30 and ×1.25 sit at the low end; baking references convert fresh to active dry at 0.40–0.50 | 0.375% stays, as an assumption |
| W9 | Below about 68 °F the yeast's cells "can lose up to half their soluble contents" | Unsourced figure. Ponte, Glass and Geddes (1960) measured 5% of dry weight leached at 40 °C and 29% at 5 °C | "Several times as much" in colder water (site); the measured figures in the recipe |
| W10 | "Added sugars and extra amylase burn" | Amylase makes sugar; the sugar is what scorches | Says that. "Grain Craft is unmalted" waits on the bag's ingredient line |
| W11 | Below 55 °F the dough "tears"; above 70 °F it "goes slack and sticky and loses its shape on the peel" | Balls baked straight from the fridge were hard to stretch and none tore; nothing has been tried above 70 °F | Colder than 60 °F it is stiff and springs back; warmer than 65 °F it gets softer and stickier |
| W12–W13, W15 | Recipe only: a troubleshooting row, the heat of hydration at other biga shares, the hook and breaker bar (441 g, C = 52.92, not modelled) | | Nothing renders |
| W14 | The Phase C rate "agrees" with 1.08 | Bake 1's 1.11 is the rate late in the phase; bake 2 averaged about 0.75, as §10 already says | The concept states the reading without "agrees". §9 says only the 30% rate is used |
| W16 | Nothing said which surface to bake on | Dave owns a baking steel | `bake-2` says the Tread's own stone |
| W17 | §11 listed no science | | Six papers added to §11; nine entries to the recipe |
| W18 | "Dave hasn't timed a divide" | He estimates 45 s a ball to weigh and preshape and 30 s to shape, which is the 1.25 min in use | Comment and recipe say so; nothing renders |

`fig64.py` rebuilds every new figure in the recipe (W6's table, W8's grams, W11's 59–64 °F, W13, W14's 0.91–1.11 and 0.49 / 0.33, W15). The site gains no computed figure.

## 3. Rendered copy, exactly

The new text of every passage the site renders. `apply_64.py` holds each as an old and new pair and asserts each old string occurs once. Where a passage starts or ends mid-sentence, it is the span that changed.

**W1, `why-biga`, first paragraph**

> A stiff preferment ferments slowly, and the slow ferment is where the flavor comes from: the yeast has time to make the alcohols, esters and acids that flavor the crumb. The gluten holds up through it, because a yeast-leavened biga never gets acidic enough for the flour's proteases to do much. The little acid the yeast does make firms the gluten, which helps a dough this wet hold its shape and the gas behind the big irregular holes of the contemporary Neapolitan cornicione. A biga is also more forgiving than a liquid preferment: it ferments more slowly, so its window is wider.

**W2, `why-biga`**

> Three reasons to stop at 65%:

**W3, `formula-rationale`**

> A biga dough handles drier than the number suggests: most of the flour arrives already hydrated, with its gluten formed and firmed by the ferment.

**W3, `biga-3` detail**

> Kneading works the gluten into a network that holds gas, which a biga shouldn't have yet; a kneaded biga rises like a dough, can double, and then looks riper than it is.

**W3, `mix-dont-knead`**

> A spiral mixer works the gluten into a network that holds gas, which a biga shouldn't have.
>
> The gluten itself forms anyway, from water and time. Hand mixing only leaves out the network: loose chunks let the gas escape, so a ripe biga swells only a little. A kneaded biga traps its gas and can double, which looks ripe and isn't.

**W4, `biga-5` detail**

> A biga ferments slowly and breaks down little gluten

**W4, `biga-5` detail**

> A ripe biga rises about 20%. Loose chunks let most of the gas escape, so it doesn't double. One that does was either worked into a dough, which holds its gas, or fermented too far; the smell tells the two apart.

**W4, `biga-5` detail, the jar paragraph** — removed:

>
> To make the cue objective, fill a small straight-sided jar with biga from the same batch and mark the starting level. Then 20% is a line on the glass.

**W4, `biga-5` troubleshooting row**

| Doubled in volume | **Over-mixed**: it was worked into a dough and held its gas. If it also smells sharp, over-fermented | Mix by hand only, for less time, to loose chunks. If it smells sharp too, shorten the ferment. |

**W5, `why-61-65`**

> 61–65 °F is the window the yeast dose is set for: at that temperature it ripens the biga in 16–18 hours. Warmer, the same dose gets there sooner and can overshoot.
>
> Temperature also changes which aroma compounds the yeast makes. In one study of bread fermented at 5, 15 and 35 °C, the coldest doughs carried the most esters (Birch and others, 2013). This recipe has found no study showing that 61–65 °F tastes best.
>
> An unstable kitchen changes the timing first, which is why the fridge-retarded schedule exists: the fridge holds a temperature the kitchen can't.

**W5, `biga-4` detail**

> **The classic room-temperature schedule** is the one the yeast dose was set for, if you have

**W6, `schedule-architecture`, first two paragraphs**

> a heavy dose by pizza standards. On the classic track the biga ripens fully at room temperature and does most of the work, so the dough gets only 6–8 hours cold.
>
> **The retarded track moves part of that work into the dough.** The fridge slows the biga, so it arrives less ripe, and the balls' longer cold ferment makes up the difference. By the recipe's fermentation model, the retarded biga with 24 h cold comes to about the same total as the classic biga with 6–8 hours.
>
> A heavy dose in front of a long cold ferment can still over-proof. Biga doughs

**W6, `schedule-architecture`, the classic-track line, now said above** — removed:

>
> On the classic track the biga ripens fully at room temperature first, so the dough gets only 6–8 hours cold.

**W7, `biga-4b` detail**

> at most about 11 hours' worth at 63 °F. Most of that is fridge time, and the model is generous to the fridge, where yeast all but stops growing, so the real figure is likely lower. The recipe assumes the biga is still ripe enough at pull, and that the final dough's schedule makes up the shortfall.

**W8, `giorilli-standard`**

> which gives 0.375%. Those factors sit at the low end: baking references convert fresh yeast to active dry at 0.40–0.50, so this dose is a little under Giorilli's and is kept as an assumption.

**W9, `biga-1` detail**

> In colder water its cells leak several times as much of their contents, and the glutathione that leaks out slackens the dough.

**W10, `formula-rationale`**

> Malt adds amylase, which turns starch into sugar, and at these oven temperatures the extra sugar scorches.

**W11, `bake-1` detail**

> Colder than **60 °F**, the dough is stiff and springs back as you open it. Warmer than **65 °F**, it gets softer and stickier to handle.

**W14, `friction-factor`, first paragraph**

> Late in Phase C the dough and bowl together were gaining 1.00 °F/min, which is 1.11 °F/min for the dough alone, against the 1.08 the calculator uses.

**W14, §9 *Friction rate*** — added after "h-only** (matching FF): 0.75 °F/min at 15% · 0.86 at 20% · 1.08 at 30%":

> The calculator uses only the 30% rate, to correct Phase C. The 15% and 20% rates are estimates that have run high; don't correct a phase by them.

**W16, `bake-2` detail** — added after "A 750 °F stone with full flame gives that balance.":

>  Bake on the Tread's own stone, not a baking steel, which passes heat into the base several times faster.

**W17, §11 *Sources*** — added after "40–60 g salt, 1.6–1.8 kg flour; no fat or sugar in the dough (§2.1.2)":

- [Jayaram and others — Mapping of Saccharomyces cerevisiae metabolites in fermenting wheat straight-dough reveals succinic acid as pH-determining factor, Food Chemistry, 2013](https://doi.org/10.1016/j.foodchem.2012.08.039) — in yeast-leavened dough the pH falls mainly because of succinic acid the yeast makes, more than bacterial acids or dissolved CO₂
- [Jayaram and others — Succinic acid in levels produced by yeast (Saccharomyces cerevisiae) during fermentation strongly impacts wheat bread dough properties, Food Chemistry, 2014](https://doi.org/10.1016/j.foodchem.2013.11.025) — at the levels yeast produces, succinic acid makes dough stronger and less extensible
- [Thiele, Gänzle and Vogel — Fluorescence labeling of wheat proteins for determination of gluten hydrolysis and depolymerization during dough processing and sourdough fermentation, Journal of Agricultural and Food Chemistry, 2003](https://doi.org/10.1021/jf020897e) — flour's own proteases break gluten down faster at low pH
- [Birch, Petersen and Hansen — The aroma profile of wheat bread crumb influenced by yeast concentration and fermentation temperature, LWT, 2013](https://doi.org/10.1016/j.lwt.2012.08.019) — fermenting at 5 °C raised three esters; 15 and 35 °C raised compounds from lipid oxidation
- [Ponte, Glass and Geddes — Cereal Chemistry, 1960](https://cerealsgrains.org/publications/cc/backissues/1960/Documents/CC1960a31.html) — active dry yeast rehydrated at 40 °C leaked 5% of its dry weight and at 5 °C 29%; the leaked glutathione made doughs sticky and extensible
- [Salvadó and others — Temperature adaptation markedly determines evolution within the genus Saccharomyces, Applied and Environmental Microbiology, 2011](https://doi.org/10.1128/AEM.01861-10) — Saccharomyces yeasts stop growing somewhere between 1.3 and 4.3 °C; S. cerevisiae grows fastest at 32.3 °C

## 4. The gate

On `main` with these documents, regenerated: **761 of 766**. All five failures are in `tests/contentLiterals.test.ts`:

- **Three claims whose prose moved.** `concept:giorilli-standard` ("which gives exactly 0.375%" lost "exactly"), `biga-4b.detail` ("about 11 hours' worth" gained "at most"), `concept:friction-factor` (the 1.00 / 1.11 / 1.08 sentence).
- **Unclassified literals:** `concept:giorilli-standard` "0.40–0.50"; `concept:why-61-65` "16–18 hours", "5", "15", "35 °C", "2013"; `about` "2013", "2014", "2003", "1960", "2011", "5 °C", "15", "35 °C", "40 °C", "29%", "1.3", "4.3 °C", "32.3 °C".
- **Stale FIXED entries:** `biga-1.detail` "68 °F", `bake-1.detail` "55 °F", `concept:why-biga` "60%".

`gate-64.diff` is the patch that takes my scratch clone to **766 of 766**, with the typecheck clean. It makes nine edits:

- the three claims' `text`, reworded to the new prose with the same engine expressions and the same `covers`;
- the three stale entries removed;
- three FIXED lists extended. `concept:giorilli-standard` gains the published conversion range. `concept:why-61-65` gains the study's three temperatures and year, and "16–18 hours", the published window, as `giorilli-standard` already files "16–18 h". `about` gains the five years and the eight figures the six papers state, which are cited, not computed.

If you would sooner claim `why-61-65`'s "16–18 hours" against the classic range than file it FIXED, do.

Regeneration gives 21 steps, 11 concepts and **17 sources** (11 before); `steps.ts`, `concepts.ts` and `reference.ts` change.

## 5. The sweep

I grepped `src` outside `src/content` for the retired claims: over-mixed, doubled, vinegar, acetic, water activity, truest, 55 °F, the jar and rehydration. Two comments mention rehydration (`cards.tsx`, `recipeText.ts`) and both are still true. Nothing else turned up, but the gate can't see a claim with no digit in it, so please read your own copy for the ideas in §2's second column, the ingredients card and copy-as-text included.

## 6. Recorded, not built

- **The hook and breaker bar** weigh 441 g together, stainless, C = 52.92 against the bowl's 115.56. Recipe §6 now says the formula leaves them out and what that costs (the solved FF reads 0.70 °F short at 3 balls, 0.35 at 6 and 0.20 at 9 in a 68 °F kitchen). **Don't add them to the engine.** That comes as its own round after the 3- and 9-ball bakes, since the log stores readings and every bake can be re-solved.
- **Dave has queued four app changes**, to arrive one per round after this one, each with its own spec text: inputs that survive closing the home-screen app, resuming a stopped timer, collapsing finished steps and step groups with the Bake log reachable from the header, and a topping-ideas section synced like the bake log. Nothing to do for them now.

## 7. Changes by document

**Spec** (24 edits):
- §3: the divide comment (W18).
- §8.2: `biga-1` (W9), `biga-3` (W3), `biga-4` (W5), `biga-4b` (W7), `biga-5` detail and its first troubleshooting row (W4), `bake-1` (W11), `bake-2` (W16).
- §8.3: `why-biga` (W1, W2), `formula-rationale` (W3, W10), `schedule-architecture` (W6), `friction-factor` (W14), `giorilli-standard` (W8), `mix-dont-knead` (W3), `why-61-65` (W5).
- §9: one paragraph under *Friction rate* (W14).
- §10: one paragraph in *What the history tests*, not rendered (W14).
- §11: six entries (W17).

**Recipe** (40 edits): §1 (W1, W2), §2 (W3, W10), §3 (W8), §5 (W3, W4, W5, W7, W8, W9, W17), §6 (W14, W15), §7 (W5, W6, W18), §8 (W3, W11, W14), §9 (W16), §10 (W13), §11 (W4, W12), the Quick card (W4, W8, W14), §12 (W4, W7, W15).

## 8. Attachments and hashes

`apply_64.py` (the edit script), `fig64.py`, `gate-64.diff`, and the three owed files: `roomrise.py`, `fig63.py`, `engine.py`.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `8eb1f0e11c4bf2282eeaf398aad03a035323d01b9d3fafc5d340eff8c24e0b6e` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `62833d63a04217b91c85e41bc4890acc70e25e14c4c421bb98ef9977754ad263` |
