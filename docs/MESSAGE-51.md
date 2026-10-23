# MESSAGE-51 — unprompted: recipe review, part 1 of 3 (sources, yeast, wording, opening size)

FINDINGS-51 needed no reply, so this is MESSAGE-51. Dave asked for a full review of the recipe before he starts dialing it in with good ingredients, and made decisions on each finding. The changes go to you in three messages so that each figure sweep traces to one change:

- **MESSAGE-51 (this one):** sources, yeast rehydration, wording, and removing the opening-size feature. The engine changes only by deletion.
- **MESSAGE-52:** the cooldown constant (150 → 35 min) and the FF in use (10.8, with the probe target's remaining-friction term rederived from the phase rates). Rise table, floor thresholds, water targets, reachability envelope and probe figures move.
- **MESSAGE-53:** timeline and split batches: a once-only "split the biga" step, divide time that scales with ball count, the classic track's cold ferment bounded to 6–8 h, a staggered temper, and no limit on biga size.

Please don't start 52 or 53 from this description; they arrive with their own documents. Both documents change in this round, and §8 prose changes throughout.

## 1. Recipes that use oil or sugar are no longer sources

Dave's rule: a recipe that uses oil or sugar isn't a source, and malt counts as sugar. Three sources fail it:

- **Ooni / Marco Fuso, 100% biga on the Halo Pro.** Its final mix adds yeast and honey, sugar or malt. It supplied the retarded schedule's attribution, the Halo Pro RPM comparison in §8.3 `no-creep-speed` ("The Halo Pro works the same way"), and the "W 300+ / 12.5%+" flour claim in `why-biga`.
- **Gozney, 100% biga.** Malt in the final dough. It supplied hand-mixing, the dose window, venting and a final-dough temperature.
- **Stadler Made, Biga.** Malt and extra yeast in the final dough. It supplied the warm-kitchen workaround.

Each claim now rests on a surviving source (PizzaBlab, Italian Pizza Secrets, Baking With Theory, Giochi di Gusto), on Julian Sisofo's contemporary pizza (flour, water, yeast, salt), or is stated as the recipe's own. §11 drops the three and adds PizzaBlab's yeast guide, King Arthur's desired-dough-temperature article, Sisofo, Grain Craft's product sheet and two AVPN pages. `src/state/types.ts` line 9 names the "Ooni/Marco Fuso schedule" in a comment; please reword it to "the retarded schedule".

## 2. The biga yeast is rehydrated in warm water (§8.2 `biga-1`, `biga-3`)

Dave dissolves the ADY in the biga water so it spreads through a stiff, hand-mixed biga, and that stays. What changes is the temperature. PizzaBlab puts dry yeast's best rehydration near 104 °F, says active dry yeast needs warm water, and says below 68 °F up to half the cells' soluble contents can leak out. King Arthur says the same for active dry yeast going into cool water. Room-temperature water sits at that edge in a 70 °F kitchen and below it in a cool one.

- **`biga-1`** is retitled *Start the yeast, break up the flour*. Its summary now weighs the biga water, warms about ten times the yeast's weight of it to 100–110 °F, and rehydrates the ADY for 10 minutes while the flour is weighed and sieved. Its chips are now **Biga water · ADY · Biga flour**. The yeast-dose paragraphs and the `giorilli-standard` concept link move here from `biga-3`, since this is where the yeast is weighed.
- **`biga-3`**'s summary combines the rest of the water, at room temperature, with the yeast water, then adds the flour. Its chips are removed (both moved to `biga-1`). Its detail keeps the distribution reason and drops the "room-temperature water" sentence.

No step is added. The 10-minute rehydration overlaps the sieving, so it gets no timer.

## 3. The retarded schedule's dose is stated as an assumption (`biga-4b`)

Giorilli's dose is set for 16–18 h at 61–65 °F; the retarded schedule gives the biga less. Dave doesn't want to measure the biga's rise, so the recipe states an assumption instead: the biga is still ripe enough at pull, and the final dough's schedule makes up any shortfall. If the balls run consistently behind, the first adjustment is an hour more at room temperature, not more yeast. This is in `biga-4b`'s detail and in `giorilli-standard`, which also stops sending the retarded track to PizzaBlab's calculator: that calculator only handles a room-temperature preferment.

## 4. Schedule wording (`biga-4`, `schedule-architecture`)

- `biga-4`'s detail calls the retarded schedule the recipe's own, with Sisofo's biga as the same shape.
- `schedule-architecture` loses the Fuso/Gozney sentence. It now says biga doughs that spend a day or more in the fridge carry less yeast (Sisofo), and recommends **24 h cold**: the only length baked, with 6 and 36 h untested. The input range and default are unchanged.

## 5. Flour, salt and sieving (`mix-1`, `mix-3`, `why-biga`, `formula-rationale`)

- **Ash.** Grain Craft's 0.55% ash is at 13.5% moisture, about 0.64% dry. Italy grades dry, and AVPN lists type 00 up to 0.50% and type 0 up to 0.65%, so Grain Craft is at the top of type 0.
- **Salt.** "At the top of the Neapolitan range of 2.5–3.0%" is replaced. AVPN specifies 40–60 g per liter of water with 1.6–1.8 kg of flour, which is 2.2–3.75% of the flour, so 2.8% is inside it. The claim that the salt level helps a long ferment is gone.
- **Sieving.** The fresh flour is no longer sieved; its lumps break up in Phase A. `mix-1`'s summary drops the clause, and its detail says why only the biga flour is sieved.
- **Flour strength** in `why-biga` no longer cites a W figure. Grain Craft doesn't publish one.

## 6. Cooldown wording (`bulk-4`)

`bulk-4` said the cooldown's fermentation is something "the schedule doesn't account for", while §4.8's `COOLDOWN_EQUIV_MIN` exists to account for it. Both were partly right. The rise does allow for a normal cooldown and for a dough starting warmer or cooler. It doesn't allow for anything that slows the cooling: stacking or a crowded fridge. The detail now says exactly that. The wording holds whatever value MESSAGE-52 gives the constant.

## 7. The opening-size feature is removed (§3, §4.9, §4.10, `bulk-2`)

Dave doesn't want the opening diameter or the thickness note. Please remove:

- `TREAD_MAX_DIAMETER_IN`, `THICKER_NOTE_MIN_PERCENT` and `computeOpening`
- the `thickerThanDefault` detail condition from `DetailCondition` and `stepInstances.ts`
- the tokens `{openDiameterIn}`, `{thicknessPercentOver}`, `{defaultBallG}` and `{treadMaxDiameterIn}`
- `bulk-2`'s second detail paragraph and its `thickerThanDefault` block
- the ball-weight field's "Opens to about … inches" hint in `panels.tsx`
- their tests

`DEFAULT_BALL_G` stays: it's still the ball-weight default. §4.9 keeps its heading with a one-paragraph note so §4.10 references hold.

## 8. The gate

I regenerated content from this spec in a scratch copy: the generator parses it (20 steps, 11 concepts, 13 sources), and the suite fails in seven places, all expected: three location-keyed CLAIMS (`mix-3` SALT, `biga-3`'s dose chain, now in `biga-1`, and `biga-4b`'s bigaFridge), the unclassified and stale-entry checks, the declared-token check, and the conditional-block coverage test. New literals and how I'd classify them:

| Where | Literal | Classification |
|---|---|---|
| `biga-1` | 100–110 °F, 10 minutes, 104 °F, 68 °F | FIXED: PizzaBlab (104 °F optimum, below 68 °F losses) and King Arthur (110 °F) |
| `biga-1` | 2–3 °F | FIXED, derived: the yeast water is 10 × `ADY_OF_BIGA_FLOUR` ÷ `BIGA_HYDRATION` = 7.5% of the biga water; warmed 30–40 °F above a 70 °F room, that's 2.25–3.0 °F |
| `biga-1` | 1%, 0.30%, 0.375%, 16–18 h, 61–65 °F, 16–18 °C, 16–20 h, 16–20 °C, 12–24 h | the claims that were on `biga-3`, moved |
| `biga-4b` | 18–20 h, 16–18 h, 61–65 °F, 38–40 °F, 63 °F | as in `biga-4b` / `giorilli-standard` before; 38–40 °F matches `bulk-4`'s summary |
| `biga-4b` | 17 °F | CLAIM: `Q_DOUBLING_F` |
| `biga-4b` | 11 hours | FIXED, derived outside the engine: 2 h at 70 °F, then Newton cooling to within 2 °F of a 39 °F fridge over 3–5 h, 19 h in the fridge, and a 1-h temper to 53 °F (bake 1's reading), integrated at 2^((T − 63)/17). Result 11.1–11.6 h |
| `mix-3`, `formula-rationale` | 40–60 g, 1.6–1.8, 2.2–3.75% | FIXED: AVPN 2024 regulation. 2.2 = 40/1800, 3.75 = 60/1600 |
| `formula-rationale` | 40 g | CLAIM: `SALT / HYDRATION × 1000` = 40.0 |
| `formula-rationale` | 13.5%, 0.64%, 0.50%, 0.65% | FIXED: Grain Craft sheet and AVPN; 0.64 = 0.55 / (1 − 0.135) = 0.636 |
| `schedule-architecture` | 24 h, 6 h, 36 h | CLAIM: `coldFerment` default and planning range |

The "0" in "type 0" and the "1" in "Bake 1" will show up as bare literals; neither is a quantity.

## 9. Changes by document

| Document | Section | Change | Figures |
|---|---|---|---|
| Spec | §3 | `TREAD_MAX_DIAMETER_IN`, `THICKER_NOTE_MIN_PERCENT` removed | none |
| Spec | §4.9, §4.10 | Opening diameter removed; four token rows removed | none |
| Spec | §8.2 `biga-1` | Retitled; yeast rehydration; dose paragraphs and `giorilli-standard` moved here; chips | new: see §8 |
| Spec | §8.2 `biga-3` | Summary, chips removed, Gozney/venting/room-temperature sentences | none new |
| Spec | §8.2 `biga-4`, `biga-4b` | Fuso attribution removed; assumption paragraph | new: see §8 |
| Spec | §8.2 `mix-1`, `mix-3` | Fresh flour not sieved; salt range | new: see §8 |
| Spec | §8.2 `bulk-2`, `bulk-4` | Opening paragraph and block removed; cooldown wording | none new |
| Spec | §8.3 | `why-biga`, `formula-rationale`, `schedule-architecture`, `giorilli-standard`, `no-creep-speed` | new: see §8 |
| Spec | §11 | Three sources out, six in | none |
| Recipe | §1, §2 | Flour strength, salt, ash; §2 source line | as spec |
| Recipe | §4 | Halo Pro comparison paragraph removed | none |
| Recipe | §5 | Intro, dose sources, PizzaBlab calculator, the assumption, rehydration, mixing, venting, sources | as spec |
| Recipe | §6 | DDT paragraph: what the rise corrects | none |
| Recipe | §7 | Final-proof section, retarded heading and intro, 24 h recommendation | none new |
| Recipe | §8 | Stage 1 steps 1–3; Stage 2 prep row; Stage 3 step 10 | none new |
| Recipe | §9, §10 | Opening bullet removed; "retarded schedule" | none |
| Recipe | Quick card, §12 | Schedule label, yeast line, assumption line; fridge measured 42 °F, set to 38–39 °F | none |

## 10. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `05b6c2429a60d9c0ce41f380cb955fc7aca6fb827d9ebe146434ad6742dde6e8` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `87bbaaebbd5bbbe8fa8f1246d8e1a6a98631cbd41c9969828aec0587539ec72a` |
