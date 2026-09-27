/**
 * Concept content — WEBSITE-SPEC-biga-calculator.md §8.3, verbatim.
 *
 * Longer background pieces that don't belong to a single step. Steps link here
 * via their `concepts` field, and the calculator cards link to the relevant
 * ones: `thermal-model` from the water card, `friction-factor` from the
 * calibration panel.
 *
 * Generated from the spec and checked character for character by
 * `tests/steps.test.ts`. Edit the spec, then regenerate.
 */

export interface Concept {
  id: string;
  title: string;
  /** Markdown. Contains tables and multi-paragraph prose. */
  body: string;
}

export const CONCEPTS: readonly Concept[] = [
  {
    id: "why-biga",
    title: "Why this recipe uses a 65% biga",
    body: `Low water activity slows the proteases that break down gluten, so the gluten survives a long ferment. It also pushes the bacteria toward heterofermentative pathways, which make more acetic acid: a sharper, more complex aroma, and the big irregular holes of the contemporary Neapolitan cornicione. A biga is also more forgiving than a liquid preferment, since it makes acid more slowly and has a wider window.

**Why 65% and not 100%.** Flavor gains flatten sharply above about 60% biga, while the risks keep rising. Three reasons to stop at 65%:

- **Flour strength.** Biga sources call for W 300+ / 12.5%+ protein for long ferments. Grain Craft Neapolitan is 12.2–12.8% protein, capable but at the low edge. Keeping 35% of the flour out of the biga leaves unfermented gluten in the final dough as a structural margin.
- **Adjustable consistency.** The reserved water goes in by feel during the mix, so you can correct for a wetter or drier biga.
- **Mixer load.** A smaller biga is easier to break down, and breakdown is the hardest work the mixer does.

Once this has run cleanly three or four times, moving to 80% or 100% biga is a single-variable experiment.`,
  },
  {
    id: "formula-rationale",
    title: "Why 70% hydration, 2.8% salt, no malt",
    body: `**70% hydration** gives an open crumb and a puffy cornicione in a 60–90 second bake without exceeding what a 12.5%-protein flour can hold through a long ferment. A biga dough handles drier than the number suggests, because the biga's gluten is built before the water goes in.

**50% biga hydration.** The documented band is 44–50%. Giorilli codified 45% and allows up to 50% for less-refined flours; Grain Craft, at 0.55% ash, is slightly less refined than true 00, and 50% mixes more evenly by hand.

**2.8% salt** is at the top of the Neapolitan range of 2.5–3.0%. It tightens the gluten slightly and slows fermentation a little, which helps over a long schedule.

**No diastatic malt.** At these oven temperatures, added sugars and extra amylase burn. Grain Craft is unmalted, which suits this recipe.`,
  },
  {
    id: "schedule-architecture",
    title: "Why the cold ferment is 6\u201336 h and not 72",
    body: `A classic biga front-loads the fermentation. At 0.375% ADY on 65% biga flour you carry about 0.244% ADY on total flour, a heavy dose by pizza standards and a deliberate one: the biga is meant to do nearly all the work.

Documented biga recipes then give the final dough a *short* proof: Giorilli and Gozney a few hours, Ooni 2 h at room temperature or 6–36 h in the fridge.

That's the reverse of a lightly prefermented dough that develops its flavor over days in the fridge. **Put a full-strength biga in front of a 50-hour cold ferment and you've scheduled two complete fermentations.** The dough will over-ferment.

In Italian practice, extra time goes into the biga rather than the ball proof. PizzaBlab's range is 12–24 h, and "biga lunga" runs 24 h at 39 °F, then 24 h at room temperature.`,
  },
  {
    id: "thermal-model",
    title: "How the water temperature is calculated",
    body: `The common "multiply DDT by 4" method gives the biga the same weight as each of the other three inputs, but the biga is **56% of the final dough mass.** This calculation weights each ingredient by mass and specific heat instead, and it includes the mixer bowl. On bake 1, leaving the bowl out put the water target 5 °F off.

**T_water = [ DDT × (Ct + C_bowl) − FF × Ct − Cb·T_biga − Cf·T_flour − Cs·T_room − C_bowl·T_bowl ] ÷ Cw**

Specific heats: biga at 50% hydration 0.6133, flour 0.42, water 1.00, salt 0.21, stainless 0.12. A 965 g bowl contributes 115.8, about the same as the fresh flour and more than it below about 5 balls.

**The bowl matters in two ways.** Its *mass* has the bigger effect: friction heats everything in the bowl, including the bowl. At a 3-ball mix the bowl absorbs 18% of the mixer's work; at a 9-ball mix, 6.8%.

Its *temperature* matters more than it seems, because it has two different coefficients. A bowl error changes the **dough** temperature by \`C_bowl/(Ct + C_bowl)\`: 0.10 °F per 1 °F at 6 balls, 0.18 at 3, so a 3 °F misreading costs 0.3 °F at 6 balls. It changes the **water target** by \`C_bowl/Cw\`, about three times as much because water is under a third of the system: 0.66 °F per °F at a 3-ball mix, 0.33 at 6, 0.22 at 9. You act on the water target, which is why the bowl is worth a five-second measurement.

**So the formula depends on scale.** The bowl's mass is fixed while the dough scales, so the weights shift with batch size. That's also why the bowl can't be folded into FF: the same FF of 14 would show up as 11.5 °F in a 3-ball mix and 13.0 °F in a 9-ball one, so FF would appear to change with batch size when nothing about the mixing had.

**What matters is the mix, not the batch.** A 12-ball batch runs as two 6-ball mixes, and the bowl holds one at a time, so it's two 6-ball systems rather than one 12-ball system. Treating it as one 12-ball system halves the bowl's share and sets the water target too low, by 1.5 to 6.2 °F across the supported range, most with the coldest biga, when the water is already at its hottest. Your kitchen temperature doesn't change it.

**The same fixed mass is why small mixes need hot water.** At 3 balls the bowl is 18% of the system and only the water can make up for it, so the requirement reaches about 107 °F, against 90 °F for a 9-ball mix. Below 3 balls it goes beyond what a tap can supply, which is why 3 is the smallest supported batch. This follows the **mix**: a 12-ball batch is two 6-ball mixes, so it needs *hotter* water than a 9-ball batch.

**Because the biga always ferments in the bowl, the temper is the only way to warm the bowl before the first mix.** An hour on the counter brings bowl and biga up together. Skipping it is the costliest shortcut in the schedule: each °F of biga temperature is worth about 2 °F of water, and at 3 balls a skipped temper pushes the requirement toward 100 °F.

With a fridge-retarded biga you'll usually need **warm** water. The biga's thermal mass dominates, so the schedule controls dough temperature more than the water does.`,
  },
  {
    id: "friction-factor",
    title: "Measuring your own friction factor",
    body: `**FF = 14.0 °F, measured** on bake 1, 21 August 2026, with 6 balls. The Phase C friction rate agrees: 1.00 °F/min on the dough and bowl together is 1.11 °F/min for the dough alone, against 1.08 predicted.

**FF is the temperature rise the mixer produces in the dough alone.** That's why the work term is \`FF × Ct\` and not \`FF × (Ct + C_bowl)\`.

This is the easiest thing to mix up. A thermometer reads the dough after it has come to equilibrium with the bowl, so any dough-only figure (FF itself, or the per-minute friction rates) has to be multiplied by \`Ct/(Ct + C_bowl)\` before you compare it with a measurement. That factor is 0.82 at 3 balls, 0.90 at 6, 0.93 at 9.

\`FF = [ T_final × (Ct + C_bowl) − Cb·T_biga − Cf·T_flour − Cw·T_water − Cs·T_room − C_bowl·T_bowl ] ÷ Ct\`

For comparison, commercial spirals reach 20–26 °F on a full bread mix. This is a shorter profile on a smaller machine with a 10-minute rest in the middle, so a lower figure is expected.

**One data point so far.** Bakes at 3 and 9 balls test the bowl model: if it's right, the raw temperature rise differs (11.5 vs 13.0) while the solved FF stays near 14. A difference in solved FF means different things depending on its direction:

- **Higher at 3 balls than at 9**: the bowl term is too big. Nothing else predicts FF falling as the mix grows, so this result is clear.
- **Higher at 9 balls than at 3**: either the bowl term is too small, or FF really does rise with mix size (the untested idea below). These two bakes can't tell those apart.
- **About the same**: consistent with the bowl model, and with FF not varying by mix size.

To measure it, record every input mass and temperature, run the mix profile exactly, probe the dough **immediately** at the end (three spots in the center of the mass, averaged), then solve with the formula above. Don't subtract a predicted temperature from the measured one: that difference is the rise *after* the bowl has diluted it, and it reads low by \`FF × C_bowl/(Ct + C_bowl)\`.

**Three things to watch:**

- **FF belongs to the mix profile, not the machine.** Change speeds or times and it changes, by roughly +1 °F per extra minute at 30%. Re-measure whenever you change the routine.
- **FF may differ by mix size (untested).** A bigger mix might run a higher FF: more total work, and less surface area per unit mass to lose heat. Nothing has measured this yet. The calculator stores a separate value for each mix size you measure, so nothing is lost if FF turns out not to vary.
- **Heat of hydration is already included.** Flour releases roughly 1.5–3 °F as it absorbs water. That happens during the mix, so it's inside the temperature you measure and therefore inside your FF: FF is one number covering both mixer friction and the heat of hydration. If a calculator asks for friction and a *separate* hydration correction, it uses a different convention; don't give it this number.`,
  },
  {
    id: "giorilli-standard",
    title: "Where the yeast number comes from",
    body: `**1% fresh yeast = 0.30% IDY = 0.375% ADY, on biga flour**, for 16–18 h at 61–65 °F (16–18 °C).

Piergiorgio Giorilli codified this dose. Gozney's 100% biga recipe gives it with a 16–18 h window at 16–18 °C, and Baking With Theory with 16–20 h at 16–20 °C (ideally 18). PizzaBlab gives the same dose and temperature with a wider window, 12–24 h. A longer or warmer ferment needs less yeast.

**Giorilli's biga is 44–45% hydration; this one is 50%.** Giorilli allows up to 50% water only for semolina or less-refined flours, so a 50% biga on 00 is slightly outside his formula, and a wetter biga ferments faster. The dose is still the published starting point. It's another reason to pull the biga by the cue, about 20% rise, rather than by the clock.

**The fresh-yeast dose is the sourced number.** The rest is unit conversion: fresh to instant at 0.30, instant to active dry at ×1.25, which gives exactly 0.375%.

For a time or temperature outside that baseline, use PizzaBlab's dough calculator. It's built for this, and the rest of this recipe's biga guidance comes from the same source.`,
  },
  {
    id: "mix-dont-knead",
    title: "Mix, don't knead",
    body: `A biga should be **small-to-medium chunks, like gnocchi**, not a dough. A spiral mixer builds gluten, which a preferment shouldn't have.

An over-mixed biga rises like a dough. It then doubles in volume, which looks ripe and isn't. This one mistake explains most failed bigas.`,
  },
  {
    id: "why-61-65",
    title: "Why 61\u201365 \u00b0F specifically",
    body: `At 61–65 °F the bacteria produce the **balance of lactic and acetic acid** that gives biga its sharp, vinegary flavor. Much warmer and the biga ferments faster and tastes different.

So an unstable kitchen affects flavor as well as timing, which is why the fridge-retarded schedule exists: it gives up a little acidity for a temperature that holds.`,
  },
  {
    id: "no-creep-speed",
    title: "The mixer has no slow speed",
    body: `Measured: **5% on the dial = 60 RPM**. With Ooni's published 300 RPM at 100%, that gives \`RPM = 47.4 + 2.526 × dial%\`. Ooni's help-center chart, which puts 5% at 15 RPM, is wrong: the dial covers a usable band that starts at 60 RPM rather than at zero. The Halo Pro works the same way.

**60 RPM is the slowest the mixer goes**, too fast to fold in liquid gently. Add water and flour with the mixer off, then start it; otherwise flour flies out of the bowl and the hook slings the bassinage water.`,
  },
  {
    id: "oil-not-flour",
    title: "Why the trays get oil",
    body: `The full explanation is in the *Onto trays* step. In short: flour draws water out of the dough surface, so over a long cold ferment you get gluey patches and a dry skin at once. Flour dusting assumes wooden boxes that breathe; aluminum doesn't.`,
  },
  {
    id: "burn-ring",
    title: "The burn ring at the base of the cornicione",
    body: `The ring where the cornicione meets the flat center is where the base is most likely to scorch, and temperature is only part of the reason. Two causes add up:

1. **No moisture buffer.** Sauce and cheese keep the center near 100 °C through evaporation until the water is gone. Sauce usually stops 1–1.5 cm short of the rim, so that ring gets full heat from the stone with nothing above it absorbing energy.
2. **It's often the thinnest part of the base.** Pressing hard just inside the rim to form the cornicione thins the dough there, leaving less mass to absorb heat.

Fix the saucing and the opening before you change the oven temperature.`,
  },
];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptById(id: string): Concept | undefined {
  return BY_ID.get(id);
}
