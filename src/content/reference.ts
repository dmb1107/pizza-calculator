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
    body: `The Core has no number display. Its LED indicator shows the speed in segments: a fully lit segment is 10% and a half-lit one 5%, so 20% is two lit segments.

\`RPM = 47.4 + 2.526 × dial%\`, the line through a measured 60 RPM at 5% and Ooni's published 300 RPM at 100%. Ooni's help-center chart, which puts 5% at 15 RPM, is **wrong** — use this line instead.

| Lit segments | Dial | RPM | Used for |
|---|---:|---:|---|
| ½ | 5% | 60 | floor — no slower setting exists |
| 1½ | 15% | 85 | Phase A breakdown |
| 2 | 20% | 98 | Phase B, Phase D |
| 3 | 30% | 123 | Phase C development |
| 4 | 40% | 148 | hard ceiling for this dough |
| 8 | 80% | 249 | Ooni max recommended at 66%+ hydration |`,
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
    body: `Blend fridge-cold water with tap water to reach the target, measuring as you pour. Fridge water gets to about 38 °F; the tap covers the warmer end. Across the supported range (3–24 balls, 240–300 g, biga 45–60 °F, room 60–84 °F) the required water spans **53–109 °F**, and **53–107 °F** at the default 265 g ball. It's hottest for *small mixes*, not small batches. You won't need ice, and the app doesn't calculate a blend ratio.`,
  },
];

export const ABOUT_INTRO = "The recipe draws on these published sources.";

export const SOURCES: readonly Source[] = [
  {
    title: "PizzaBlab — Biga (Preferment)",
    url: "https://www.pizzablab.com/the-encyclopizza/biga-preferment/",
    note: "hydration, yeast, ripeness cues, mixing technique; 1% fresh yeast, 12–24 h at 16–18 °C",
  },
  {
    title: "PizzaBlab — Dough Calculator",
    url: "https://www.pizzablab.com/calculators/pizza-dough-calculator/",
    note: "biga yeast for a room-temperature biga off the baseline time/temp; it doesn't model a refrigerated biga",
  },
  {
    title: "PizzaBlab — How to use yeast",
    url: "https://www.pizzablab.com/learning-and-resources/ingredients/how-to-use-yeast/",
    note: "dry yeast rehydrates best near 104 °F; active dry yeast needs warm water",
  },
  {
    title: "King Arthur — Desired dough temperature",
    url: "https://www.kingarthurbaking.com/blog/2018/05/29/desired-dough-temperature",
    note: "with cool water, rehydrate active dry yeast in part of the recipe water at 110 °F",
  },
  {
    title: "Julian Sisofo — Contemporary pizza",
    url: "https://juliansisofo.com/blog/Contemporarypizza",
    note: "a 50% biga with a warm start and then the fridge",
  },
  {
    title: "Ooni help center — Halo Core min/max capacity and hydration limits",
    url: "https://ooni.com/pages/help-center?a=What-are-the-minmax-capacity-and-hydration-limits-for-Ooni-Halo-Core---id--tLwhKnlnR4G9F-kkvNO9Gw",
    note: "0.5–2.5 kg dough, flour caps by hydration, recommended speeds, 20-minute maximum continuous operating time",
  },
  {
    title: "Ooni help center — Halo Core speed settings",
    url: "https://ooni.com/pages/help-center?a=Halo-Core-Speed-Settings%3A-Percentage-to-RPM-Explained---id--J1HYTOEHRCiv1ONI2mRgqg",
    note: "5% increments, the lit/half-lit indicator, 300 RPM at 100%. Its low-end RPM chart is wrong; see the mixer speed reference",
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
  {
    title: "Grain Craft — Neapolitan product sheet",
    url: "https://www.graincraft.com/wp-content/uploads/2020/04/NeapolitanProductSheet.pdf",
    note: "12.2–12.8% protein, 0.55% ash at 13.5% moisture, unbleached",
  },
  {
    title: "AVPN — International Regulations, 2024",
    url: "https://www.pizzanapoletana.org/public/pdf/Disciplinare-2024-ENG.pdf",
    note: "per liter of water: 40–60 g salt, 1.6–1.8 kg flour",
  },
  {
    title: "AVPN — Flours from 00 to whole wheat",
    url: "https://www.pizzanapoletana.org/en/358-flours_from_00_to_whole_wheat",
    note: "ash limits: type 00 up to 0.50%, type 0 up to 0.65%",
  },
];

// --- end generated ---
