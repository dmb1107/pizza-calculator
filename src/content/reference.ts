/**
 * Reference content — WEBSITE-SPEC-biga-calculator.md §9 and §11, verbatim.
 *
 * §9's tables are "needed occasionally, not every session", so they live in a
 * drawer. §11's sources go on the About page. Generated from the spec and
 * checked character for character by `tests/steps.test.ts`; every number in
 * them is claimed against the engine or classified in
 * `tests/contentLiterals.test.ts`. Edit the spec, then regenerate.
 */

export interface ReferenceSection {
  id: string;
  title: string;
  /** Markdown, with tables. */
  body: string;
}

export interface Source {
  title: string;
  url: string;
  /** What the source is cited for. */
  note: string;
}

export const REFERENCE: readonly ReferenceSection[] = [
  {
    id: "mixer-speed",
    title: "Mixer speed",
    body: `\`RPM = 47.4 + 2.526 × dial%\` — measured, 5% = 60 RPM. Ooni's published help-center chart claiming 5% = 15 RPM is **wrong**; don't reproduce it.

| Dial | RPM | Used for |
|---:|---:|---|
| 5% | 60 | floor — no slower setting exists |
| 15% | 85 | Phase A breakdown |
| 20% | 98 | Phase B, Phase D |
| 30% | 123 | Phase C development |
| 40% | 148 | hard ceiling for this dough |
| 80% | 250 | Ooni max recommended at 66%+ hydration |`,
  },
  {
    id: "friction-rate",
    title: "Friction rate",
    body: `**Dough-only** (matching FF): 0.75 °F/min at 15% · 0.86 at 20% · 1.08 at 30%

**As observed on a thermometer** — multiply by \`Ct/(Ct + C_bowl)\`:

| Balls per mix | 3 | 6 | 9 |
|---|---:|---:|---:|
| Factor | 0.821 | 0.901 | 0.932 |
| At 30% | 0.89 | 0.97 | 1.01 |

A 12-ball batch runs as two 6-ball mixes and reads the 6 column; 18 balls reads the 9.`,
  },
  {
    id: "water-temperature",
    title: "Water temperature",
    body: `Blend fridge-cold water with tap to the target, measuring as you pour. Fridge water reaches ~38 °F; tap covers upward. Across the supported range (3–24 balls, 240–300 g, biga 45–60 °F, room 60–84 °F) the required water spans **53–109 °F**, and **53–107 °F** at the 265 g default — hottest at *small mixes*, not small batches. No ice and no split calculation.`,
  },
];

export const ABOUT_INTRO = "The recipe is built on published practice, not invention.";

export const SOURCES: readonly Source[] = [
  {
    title: "PizzaBlab — Biga (Preferment)",
    url: "https://www.pizzablab.com/the-encyclopizza/biga-preferment/",
    note: "hydration, yeast, ripeness cues, mixing technique; 1% fresh yeast, 12–24 h at 16–18 °C",
  },
  {
    title: "PizzaBlab — Dough Calculator",
    url: "https://www.pizzablab.com/calculators/pizza-dough-calculator/",
    note: "for biga yeast off the baseline time/temp",
  },
  {
    title: "Gozney — 100% Biga Pizza Dough",
    url: "https://us.gozney.com/blogs/recipes/100-biga-pizza-dough-recipe",
    note: "1% yeast, 16–18 h at 61–64 °F, hand-mixed",
  },
  {
    title: "Ooni / Marco Fuso — 100% Biga using Halo Pro",
    url: "https://ooni.com/blogs/recipes/ooni-100-biga-dough-using-halo-pro",
    note: "the fridge-retarded schedule",
  },
  {
    title: "Stadler Made — Biga",
    url: "https://www.stadlermade.com/pizza/ingredients/biga/",
    note: "warm-kitchen workaround",
  },
  {
    title: "Baking With Theory — Biga",
    url: "https://www.bakingwiththeory.com/theory/biga/",
    note: "Giorilli formula: 44–45% hydration, 1% fresh yeast, short biga 16–20 h at 16–20 °C (ideally 18)",
  },
  {
    title: "Italian Pizza Secrets — Essential guide to biga",
    url: "https://www.italianpizzasecrets.com/essential-guide-to-biga-for-pizza/",
    note: "Giorilli's short biga (16–18 h at 16–18 °C) and long biga",
  },
  {
    title: "Giochi di Gusto — How to make Biga at home",
    url: "https://www.giochidigusto.it/en/how-to-make-biga-at-home-the-complete-and-definitive-method/",
    note: "Giorilli's hydration: 45%, up to 50% only for semolina or less-refined flours",
  },
];

// --- end generated ---
