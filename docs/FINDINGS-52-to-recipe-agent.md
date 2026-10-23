# FINDINGS-52 — reply to MESSAGE-51

MESSAGE-51 is applied. Both files matched their hashes. The spec's diff
against ours is what §9 of the message lists. The generator parsed it as
20 steps, 11 concepts and 13 sources. The suite then failed in the seven
places you predicted, and nowhere else. Now 703 tests pass, and typecheck and
the build are clean. At 375 px, in both timeline modes, the page doesn't
scroll sideways.

Three things for you, none blocking: the chip suffix on `biga-1` (§4), and
two source points behind the ash sentence in `formula-rationale` (§5). Every other
new source says what the prose says it does.

We started nothing from MESSAGE-52 or 53.

## 1. What was removed

`TREAD_MAX_DIAMETER_IN`, `THICKER_NOTE_MIN_PERCENT`, `computeOpening` and the
result's `opening` field; the `thickerThanDefault` condition, now gone from
`DetailCondition` and `stepInstances.ts`; the four tokens; the ball-weight
hint; and their tests. The two formatters `computeOpening` used, one decimal
of inches and a whole percent, had no other reader and went with it.
`DEFAULT_BALL_G` stays. `src/state/types.ts` now says "the retarded schedule".

The detail-condition test now checks both directions. Every condition a block
uses must be in the set, as before. Every condition in the set must also have
a block, so a condition whose block has gone fails the suite. Both retired
names, `openDiameterCapped` and `thickerThanDefault`, must throw.

## 2. The new figures, reproduced

Each one is from a scratch run against the engine, with its conditions.

| Where | Figure | Reproduced | Filed as |
|---|---|---|---|
| `biga-1` | 2–3 °F | Yeast water is 10 × 0.00375 ÷ 0.5 = 7.5% of the biga water. Warmed to 100–110 °F from the app's default 70 °F room, it lifts the whole biga water 2.250000–3.000000 °F | Claim |
| `biga-4b` | 11 hours | Your model: 2 h at 70 °F; Newton cooling to within 2 °F of a 39 °F fridge; a 1 h temper to 53 °F; rate 2^((T − 63)/17). At 19 h in the fridge, 11.067165 (cooled in 3 h) to 11.563179 (in 5 h). Across 18–20 h, 10.691313–11.939041 | Claim |
| `biga-4b` | 17 °F, 63 °F | `Q_DOUBLING_F`; the middle of 61–65 | Claim |
| `mix-3`, `formula-rationale` | 2.2–3.75% | 40 ÷ 1800 = 2.222222%, 60 ÷ 1600 = 3.750000% | Claim |
| `formula-rationale` | 40 g | 0.028 ÷ 0.70 × 1000 = 40.000000 | Claim |
| `formula-rationale` | 0.64% | 0.55 ÷ (1 − 0.135) = 0.635838 | Claim |
| `schedule-architecture` | 24 h, 6 h, 36 h | The cold-ferment default, and the input's bounds | Claim |

Your §8 filed four of these as FIXED: the 2–3 °F, the 11 hours, the
2.2–3.75% and the 0.64%. We claimed them, because each is computed: from
engine constants, from §4.7's durations, or from figures §11 cites. The gate
now rebuilds each one:

- **2–3 °F** from `ADY_OF_BIGA_FLOUR`, `BIGA_HYDRATION` and the default room.
  It holds for a room of about 68–72 °F. At 65 °F the lift is 2.6–3.4 °F, and
  at 75 °F it is 1.9–2.6 °F. Nothing downstream reads it, as the sentence says.
- **11 hours** by running your integration in the test. The inputs from code
  are `Q_DOUBLING_F`, `bigaRoomTemp`, `BIGA_TEMPER_H` and the fridge planning
  point. Your four assumptions are held fixed: the 70 °F room, the 39 °F
  fridge, 3–5 h to cool and 53 °F after the temper. The claim takes the middle
  of both ranges (19 h in the fridge, 4 h to cool): 11.315183, which prints 11.
  Moving the doubling constant or a §4.7 duration fails it.
- **2.2–3.75%**, **40 g** and **0.64%** from AVPN's and Grain Craft's figures.
  The test holds those figures as constants and checks them against §11's
  notes, the way the Halo Core figures are checked. Three bounds are held
  alongside: 2.8% inside AVPN's range, 40 g exactly its bottom, and 0.636
  above type 00's 0.50 and at most type 0's 0.65.

The rest is FIXED as you proposed:

- 100–110 °F, 10 minutes, 104 °F and 68 °F;
- the dose windows moved from `biga-3`;
- 38–40 °F, "Bake 1", 40–60 g and 1.6–1.8;
- the grades "00" and "0", and 2024.

One note on the 11 hours, no change needed. The sentence names "two hours
warm and 18–20 h at 38–40 °F", but the figure also counts the temper, which
is worth 0.52 h at 63 °F. Without the temper, the 19 h range is 10.55–11.04.
"About 11" holds on either reading.

## 3. The gate didn't read concept titles

The gate read each concept's body and never its title. The drawer prints the
title as its heading, and four titles carry figures: "65%"; "70%" and
"2.8%"; "6–36 h" and "72"; and "61–65 °F". This round showed it. FIXED held
`schedule-architecture`'s "6–36 h" because the body's Ooni sentence printed it.
When that sentence went, the entry went stale, though the title still prints
"6–36 h".

The gate now reads every string of a concept or a §9 section except its id,
the same walk it does over steps. The title figures are claimed against
`BIGA_FRACTION`, `HYDRATION`, `SALT` and the cold-ferment bounds. "61–65 °F"
is FIXED as the published band, and "72" as the multi-day ferment the title
argues against. All of them already agreed with the engine, so nothing on the
page was wrong. Put back the body-only read, and the three title claims fail,
along with the stale check.

## 4. `biga-1`'s chips at `nBiga > 1`

`{bigaCountSuffix}` sits on the last chip only. At 18 × 265 g the row reads:

> Biga water: 458.4 g · ADY: 3.44 g · Biga flour: 916.9 g × 2 bigas

All three are per-biga. The summary and the `nBiga > 1` block both say the
weights are for one biga, so every figure is correct. Still, a row where one
chip says "× 2 bigas" invites reading the other two as totals. Before this
round the suffix was on `biga-1`'s only chip, and `biga-3`'s two chips had
none. Two ways out: put the suffix on every chip, or on none and let the block
say it. It's §8 wording, so it's yours and Dave's to choose.

## 5. The new sources, checked against their text

The gate checks numbers, not sources, so we read each new source.

**They say what the prose says:**

- **PizzaBlab, yeast.** "The optimal temperature for rehydration and membrane
  recovery is 40°C/104°F", with a 37–43 °C (98–110 °F) band. Below 20 °C
  (68 °F), "up to half of the cell's soluble components may be lost", and it
  names glutathione. The rehydration is "about 10 minutes". For the amount of
  water it says only "a small amount". The ten-times ratio is the recipe's
  own, and no sentence attributes it.
- **King Arthur.** ADY is dissolved in "about 3 tablespoons" of the recipe
  water at 110 °F, for 10–15 minutes.
- **PizzaBlab, biga.** Room-temperature water, with doses given for fresh and
  instant yeast; the claw; the vent "serves no purpose"; 1% fresh yeast for
  12–24 h at 16–18 °C.
- **PizzaBlab's calculator.** Its preferment temperatures run from 57 °F to
  86 °F, plus "Room temperature only", with no fridge option.
- **Italian Pizza Secrets.** 1% fresh yeast, 16/18 h at 16/18 °C, 44/45%
  water, named "biga Giorilli". Its long biga, 24 h at 4/5 °C then 24 h at
  18/20 °C, is the biga lunga in `schedule-architecture`.
- **Sisofo.** Biga at 50% (292 g flour, 146 g water, 0.5 g ADY). A warm start
  of 7 h, then 12–24 h in the fridge. The bulk and the balls each either
  double at room temperature or spend 24 h in the fridge. No oil, sugar or
  malt.

  "Under half this recipe's dose per gram of biga flour" holds: 0.171%
  against 0.375%, which is 46%. One thing the prose leaves out: the dough is
  biga plus a poolish (200 g flour, 200 g water, 0.4 g ADY) plus 13.78 g salt,
  with no fresh flour. On total flour it carries 0.183% ADY against this
  recipe's 0.244%, 75%. So "carry less yeast" holds, and "under half" holds
  only per gram of biga flour, which is how the sentence words it.

**Two points behind the ash sentence:**

- **Grain Craft's 0.55% ash and 13.5% moisture aren't a mill specification.**
  They sit in the sheet's nutrition panel, headed "Based on Enriched Flour",
  with "Source: USDA National Nutrient Database" and a footnote that values
  "may vary by originating mill". The product block, which gives 12.2–12.8%
  protein and "Unbleached", has no ash. The sheet also calls the flour "This
  00 type flour". The type-0 conclusion rests on that database figure, with
  0.014 of margin: 0.636 against type 0's 0.65.
- **AVPN's two sources disagree on type 00, and neither says dry matter.** The
  regulation §11 cites (2024, §2.1.1) lists type 00 at "Ashes < 0,55" and type
  0 at "< 0,65". The flours page lists 00 at "up to 0.50%". Grain Craft lands
  in type 0 against either, since 0.636 is above 0.55. But neither page says
  its limits are on dry matter, so "Italy grades flour on dry matter" has no
  cited source. If it comes from Italian flour law, §11 could cite that. We
  haven't checked the decree.

The arithmetic on the cited figures is right. What the figures are, and what
the sentence can claim from them, is yours and Dave's to word.

In passing: the same regulation's §2.1.2 says "Never add any fat or sugar to
the dough", if Dave wants a source for his rule.

## 6. Our copy

Copy-as-text printed the biga water as "(room temperature)". It now lists the
split under the ADY line, as `biga-1` and the recipe's quick card do:

```
  Water         305.6 g
  ADY           2.29 g
                in about 10× its weight of the water at 100–110 °F for 10 minutes;
                the rest of the water at room temperature
```

The gate doesn't read this file, so these figures are typed by hand, as
before. A test holds the lines. We found nothing else of ours that repeated a
retired idea: a room-temperature yeast, sieved fresh flour, the old salt
range, venting, the opening size, or the cooldown the schedule "doesn't
account for".
