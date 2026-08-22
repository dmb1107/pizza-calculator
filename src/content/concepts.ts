/**
 * Concept content — WEBSITE-SPEC-biga-calculator.md §8.3, verbatim.
 *
 * Longer background pieces that don't belong to a single step. Steps link here
 * via their `concepts` field, and the calculator cards link to the relevant
 * ones: `thermal-model` and `ice-physics` from the water card,
 * `friction-factor` from the calibration panel.
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
    body: `Its low water activity suppresses protease mobility, so the gluten survives a long ferment instead of degrading, and it pushes the bacteria toward heterofermentative pathways — more acetic acid, a sharper and more complex aroma, and the big irregular alveoli that define the contemporary Neapolitan cornicione. It is also the more forgiving preferment: slower acid production and a wider usable window than a liquid preferment gives you.

**Why 65% and not 100%.** The flavor-versus-preferment-percentage curve flattens sharply above about 60%, while the risks keep climbing. Three reasons to stop at 65%:

- **Flour strength.** Every serious biga source calls for W 300+ / 12.5%+ protein for long ferments. Grain Craft Neapolitan is 12.2–12.8% protein — capable, but at the lower edge. Holding 35% of the flour out of the preferment leaves un-fermented gluten in the final dough as structural margin.
- **A live consistency lever.** The reserved water gets added by feel during the mix, so you can correct for a wetter or drier biga instead of committing everything up front.
- **Mixer load.** A smaller biga is easier to break down, and the breakdown phase is the hardest work the machine does.

Once this has run cleanly three or four times, pushing to 80% or 100% biga is a clean single-variable experiment.`,
  },
  {
    id: "formula-rationale",
    title: "Why 70% hydration, 2.8% salt, no malt",
    body: `**70% hydration** — enough to get an open, airy crumb and a puffy cornicione in a 60–90 second bake, without exceeding what a 12.5%-protein flour can hold through a long ferment. A biga dough handles drier than the number suggests, because the biga's gluten is already built before the water goes in.

**50% biga hydration** — the documented band is 44–50%. Giorilli codified 45% and allows up to 50% for less-refined flours; Grain Craft at 0.55% ash sits just outside true-00 refinement, and 50% hand-mixes more evenly.

**2.8% salt** — at the upper end of the Neapolitan range of 2.5–3.0%, which tightens the gluten slightly and slows fermentation a touch, both useful over a long schedule.

**No diastatic malt.** At these temperatures added sugars and extra amylase just burn. Grain Craft is unmalted, and that's correct here.`,
  },
  {
    id: "schedule-architecture",
    title: "Why the cold ferment is 6–36 h and not 72",
    body: `Classic biga **front-loads the entire fermentation.** At 0.38% ADY on 65% biga flour you carry about 0.244% ADY on total flour — a heavy dose by pizza standards, and deliberately so, because the preferment is meant to do essentially all the work.

Every documented biga recipe then gives the final dough a *short* proof: Giorilli and Gozney a few hours, Ooni 2 h at room temperature or 6–36 h in the fridge.

This is the opposite of a lightly-prefermented dough that gets its character from days in the fridge. **Stack a full-strength classic biga on top of a 50-hour cold ferment and you have specified two complete fermentations.** The dough will blow out.

There's a second thing worth absorbing: **in Italian practice you get more time by lengthening the biga, not the ball proof.** PizzaBlab's range is 12–24 h; "biga lunga" runs 24 h at 39 °F then 24 h at room temperature. The length lives in the preferment.`,
  },
  {
    id: "thermal-model",
    title: "How the water temperature is calculated",
    body: `Standard "multiply DDT by 4" arithmetic breaks down here. It weights the preferment as one of four equal factors, but the biga is **56% of the final dough mass.** So this uses a proper mass-and-specific-heat weighted mix, which resolves to:

**And it has to include the mixer bowl.** Omitting it made this calculation 5 °F wrong on the first real bake.

**T_water = [ DDT × (Ct + C_bowl) − FF × Ct − Cb·T_biga − Cf·T_flour − Cs·T_room − C_bowl·T_bowl ] ÷ Cw**

Specific heats: biga at 50% hydration 0.6133, flour 0.42, water 1.00, salt 0.21, stainless 0.12. A 965 g bowl contributes 115.8 — more than the fresh flour does.

**Two bowl effects, and only one matters.** Its *temperature* shifts the mix by about −0.3 °F, which is why it needs no measurement (default it to the biga temperature; 19 h of contact leaves them at equilibrium). Its *mass* is the real effect: friction energy heats whatever is in the bowl, and the bowl is part of "whatever." At 3 balls it absorbs 18% of the mixer's work; at 18 balls, 3.5%.

**This is why the formula is not scale-independent.** The bowl is fixed mass while the dough scales, so the weights shift with batch size. It also explains why the bowl can't just be folded into FF — the same FF of 14 would appear as 11.5 °F at 3 balls and 13.5 °F at 18, drifting for no physical reason.

Note what this implies: with a fridge-retarded biga you need **warm** water. The biga's thermal mass is the dominant term, which makes it a more powerful control lever than ice.`,
  },
  {
    id: "ice-physics",
    title: "Why ice isn't the same as cold water",
    body: `Ice at 32 °F and water at 32 °F are the same *temperature* but not the same *energy.* To turn ice into water you have to break the crystal lattice, and that energy goes entirely into breaking hydrogen bonds, not into raising temperature. A thermometer sitting in melting ice reads 32 °F the whole time, even as heat pours in. It's *hidden* from the thermometer, which is why it's called **latent heat.**

The amount is not small: **80 cal/g.** That's the same energy it would take to heat that same gram of water from 32 °F all the way to 176 °F. Every gram of ice carries that much cooling capacity *before* it starts behaving like cold water.

So ice does two jobs and cold water only does one:

| | Ice at 32 °F | Water at 32 °F |
|---|---|---|
| Melt (absorbs 80 cal/g, no temp change) | yes | — |
| Warm from 32 °F to final dough temp | yes | yes |

**Where the negative number comes from.** The weighted-average formula assumes everything behaves like \`mass × specific heat × temperature\`. Ice doesn't — it has that extra 80 cal/g lump. So instead of adding a special term, we hide it in a fake starting temperature: 80 cal/g ÷ 1.00 cal/g·°C = 80 °C = **144 °F** of equivalent cooling.

**Effective temp = −112 − 0.5 × (32 − T_ice)**

A 16 °F freezer gives −120 °F. It is fictitious — nothing in the bowl is ever remotely that cold. It's a bookkeeping device that makes ice slot into the same linear equation as water and produce exactly the right answer.

**Worked example.** 100 g added to 900 g of 80 °F water: 32 °F *water* gives 75.2 °F, 32 °F *ice* gives 60.8 °F. Same mass, same temperature, 14.4 °F apart.

**All the ice must melt.** The equivalence assumes every gram completes the melting job. Ice still floating in the bowl hasn't spent its 80 cal/g yet — it will spend it over the next few minutes, after you've taken your temperature reading. The dough reads on target, then drifts cold, and your friction factor comes out wrong in a way that poisons every batch calculated from it.`,
  },
  {
    id: "friction-factor",
    title: "Measuring your own friction factor",
    body: `**FF = 14.0 °F, measured** — bake 1, 21 August 2026, 6 balls. Corroborated independently by the Phase C friction rate: 1.00 °F/min observed on the dough-plus-bowl system is 1.11 °F/min dough-only, against 1.08 predicted.

**FF is defined as the rise the mixer produces in the dough alone.** That's why the work term is \`FF × Ct\` and not \`FF × (Ct + C_bowl)\`.

\`FF = [ T_final × (Ct + C_bowl) − Cb·T_biga − Cf·T_flour − Cw·T_water − Cs·T_room − C_bowl·T_bowl ] ÷ Ct\`

For context on plausibility: commercial spirals land 20–26 °F on a full bread mix, and this is a shorter profile on a smaller machine with a 10-minute rest in the middle, so the low end is where it belongs.

**Still one data point.** The falsifiable test is whether FF holds near 14 at 3 and 9 balls while the raw temperature rise differs (11.5 vs 13.0). If it drifts even after the dilution correction, something else is going on.

Protocol: record every input mass and temperature, run the mix profile exactly, probe the dough **immediately** at the end (three spots, center of the mass, averaged), then subtract.

**Three things that will bite you:**

- **FF is a property of the profile, not the machine.** Change speeds or times and it moves. Roughly +1 °F per additional minute at 30%. Re-measure whenever you change the routine.
- **FF differs by batch size.** A 9-ball batch runs higher than a 3-ball — more total work done, less surface area per unit mass to shed it. Keep a separate value for each size you actually use.
- **Heat of hydration is already included.** Flour releases roughly 1.5–3 °F of exothermic heat as it absorbs water. That happens during the mix, so it's already inside the temperature you measured and therefore already inside your FF. It is a single combined number covering mixer friction *and* hydration exotherm. If you meet a calculator asking for friction alongside a *separate* hydration correction, that's a different convention — don't feed it this number.`,
  },
  {
    id: "giorilli-standard",
    title: "Where the yeast number comes from",
    body: `**1% fresh yeast = 0.30% IDY = 0.38% ADY, on biga flour**, for 12–18 h at 61–65 °F with the biga at 45–50% hydration.

This is the figure Piergiorgio Giorilli codified, and essentially every serious source repeats it — PizzaBlab, Gozney's own 100% biga recipe, Stadler Made, the Italian baking literature. It is a *baseline* for 12–16 h at around 68 °F, or 16–18 h at 61–65 °F. Go longer and you cut it; run warmer and you cut it.

For a time or temperature outside that baseline, use PizzaBlab's dough calculator. It's built for exactly this, and it's the same source the rest of this recipe's biga guidance comes from.`,
  },
  {
    id: "mix-dont-knead",
    title: "Mix, don't knead",
    body: `The goal for a biga is **small-to-medium chunks, like gnocchi** — not a dough. A spiral mixer's entire purpose is building a gluten network, which is precisely what you don't want in a preferment.

An over-mixed biga rises like a dough instead of fermenting like a biga. It then doubles in volume, which reads as "ripe" against the usual intuition, and it is not. This single mistake explains most failed bigas.`,
  },
  {
    id: "why-61-65",
    title: "Why 61–65 °F specifically",
    body: `It isn't just about speed. That range produces the **right ratio of lactic to acetic acid**, which is what gives biga its characteristic sharp, vinegary profile. Ferment much warmer and you get a preferment that is biga-shaped but tastes different.

This is why an unstable kitchen is a real problem rather than a timing nuisance, and why the fridge-retarded schedule exists — it trades a little of that acid character for a temperature that actually holds.`,
  },
  {
    id: "no-creep-speed",
    title: "The mixer has no slow speed",
    body: `Measured: **5% on the dial = 60 RPM**, and \`RPM = 47.4 + 2.526 × dial%\`. Ooni's published help-center chart claiming 5% = 15 RPM is wrong — the dial maps across a *usable band*, not from zero. The Halo Pro works the same way.

The practical consequence: **60 RPM is the floor.** You cannot gently fold liquid in. Add water and flour with the mixer off, then bring the dial up, or you'll throw flour out of the bowl and sling bassinage water off the hook.`,
  },
  {
    id: "oil-not-flour",
    title: "Why the trays get oil",
    body: `Full explanation is in the \`bulk-3\` step detail. Short version: flour is hygroscopic and pulls water out of the dough surface, which over a long cold ferment gives you gluey patches and dry skin at the same time. The traditional flour dusting assumes wooden boxes that breathe; aluminum doesn't.`,
  },
  {
    id: "burn-ring",
    title: "The burn ring at the base of the cornicione",
    body: `That specific pattern is diagnostic, and it's only partly about temperature. The ring where the cornicione meets the flat center is the worst spot on the pizza for base scorching, for two reasons that stack:

1. **No moisture buffer.** Sauce and cheese hold the center near 100 °C by evaporative cooling until the water is gone. Sauce normally stops 1–1.5 cm short of the rim, so that ring gets full conductive heat with nothing above it absorbing energy.
2. **It's often the thinnest part of the base.** Pressing hard just inside the rim to define the cornicione thins the dough exactly there. Less mass, less thermal buffer, first to burn.

Driest contact zone and thinnest cross-section, right on top of each other. Fix the saucing and the opening before you touch the oven temperature.`,
  },
];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptById(id: string): Concept | undefined {
  return BY_ID.get(id);
}
