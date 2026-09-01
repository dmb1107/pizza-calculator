/**
 * Step content — WEBSITE-SPEC-biga-calculator.md §8.2, verbatim.
 *
 * §8 is emphatic: "The detail text below is the content. Use it verbatim …
 * Don't summarize it, don't rewrite it in your own voice, don't trim it for
 * brevity." The explanations are the point of the app, not decoration on it.
 *
 * This file was generated from the spec rather than transcribed by hand, and
 * `tests/steps.test.ts` re-parses §8.2 on every run and asserts each field
 * still matches character for character. Truncating a detail block here turns
 * the suite red, which is exactly the failure §12 warns is most likely.
 *
 * Edit the spec, then regenerate. Do not hand-edit the prose below.
 */

export type Phase = 'biga' | 'mix' | 'bulk' | 'bake';

/**
 * A markdown table lifted from the spec.
 *
 * §8.1 types `troubleshoot` as `{ symptom, cause, fix }[]`, but `mix-4`'s table
 * is two columns ("Probe reads" / "Do") rather than three. Headers are carried
 * through as written so both render faithfully — forcing the three-field shape
 * would mean distorting content §8 says to reproduce verbatim.
 */
export interface StepTable {
  headers: string[];
  rows: string[][];
}

/** A detail block rendered only when its condition holds. §8.2. */
export interface ConditionalDetail {
  /** Literally `nMix > 1` or `nBiga > 1`, as written in the spec. */
  condition: 'nMix > 1' | 'nBiga > 1';
  /** Markdown, appended after `detail` when the condition is met. */
  detail: string;
}

/** A step-level warning shown only when its condition holds. §8.2. */
export interface ConditionalWarning {
  /** Literally `staggerUncentred > 2`, as written in the spec. */
  condition: string;
  /** Markdown. Renders inside the step, distinct from the §7.3 warning strip. */
  text: string;
}

export interface Step {
  id: string;
  phase: Phase;
  /** Short, imperative. */
  title: string;
  /** Default view. May contain {token} bindings. */
  summary: string;
  /** `biga-4` reads differently per schedule; when set these replace `summary`. */
  summaryRetarded?: string;
  summaryClassic?: string;
  /** Computed values pulled out for scanning, one per chip. */
  values?: string[];
  /** Raw timer label from the spec, e.g. "3–6 min", "per schedule", "{temper} h". */
  timerLabel?: string;
  /** Parsed where the label is a fixed number of minutes. */
  timerMinutes?: number | [number, number];
  speed?: { dial: number; rpm: number; minutes: [number, number]; label: string };
  /** Markdown: paragraphs, tables, emphasis. */
  detail?: string;
  /** The success cue. */
  watchFor?: string;
  troubleshoot?: StepTable;
  /** Concept ids from §8.3. */
  concepts?: string[];
  /** Extra detail shown only for split batches. §8.2. */
  detailWhen?: ConditionalDetail;
  /**
   * §8.2a. Expand to one instance per mix — ids `mix-1#1`, `mix-1#2` … — so
   * checkbox and timer state key off the INSTANCE rather than the template.
   *
   * The whole mix phase repeats, not just the changeover: at nMix 2 the baker
   * runs mix-1 through mix-7, changes over, then runs them again. Phase A's
   * 3–4 minute timer had the same defect as the changeover, seven times over.
   */
  repeatsPerMix?: boolean;
  /** No changeover after the last mix. `mix-8` only. */
  suppressOnFinal?: boolean;
  /** Step-level warning, shown only when its condition holds. §8.2. */
  warningWhen?: ConditionalWarning;
}

export const STEPS: readonly Step[] = [
  {
    id: "biga-1",
    phase: "biga",
    title: `Break up the flour dry`,
    summary: `Weigh {bigaFlourPerBiga} g of flour, then whisk hard or push it through a coarse sieve to break up the clumps. Weigh first, break up second.`,
    values: [`Biga flour: {bigaFlourPerBiga} g{bigaCountSuffix}`],
    detail: `Grain Craft arrives lumpy. It's a milling artifact, not a quality problem — but dry is the only easy time to fix it.`,
    detailWhen: {
      condition: "nBiga > 1",
      detail: `**This batch needs {nBiga} separate bigas**, and the weights above are for **one of them**. Don't weigh the batch total into a single container — {bigaFlourTotal} g of biga flour exceeds the 1610 g the machine handles at this hydration, which is why it splits.

Make them back to back and keep them in separate containers. They are identical in every respect and they ferment side by side on the same clock, so the steps that follow cover both at once — only one of them can occupy the mixer bowl, so the second goes in its own tub.

A clump that survives into the biga has dry flour at its core that never ferments, and in a stiff 50% hydration biga you will not find it by hand once the water is in. It turns up later as a hard nodule in the finished dough.

Weigh before you break up, not after, so anything lost to the sieve doesn't change the number you're working from.`,
    },
  },
  {
    id: "biga-2",
    phase: "biga",
    title: `Dissolve the yeast`,
    summary: `{bigaWaterPerBiga} g of **room-temperature** water, {bigaADYPerBiga} g ADY. Stir to dissolve.`,
    values: [`Biga water: {bigaWaterPerBiga} g`, `ADY: {bigaADYPerBiga} g`],
    detail: `**The dose is the Giorilli standard: 1% fresh yeast = 0.30% IDY = 0.375% ADY on biga flour**, the baseline for 12–18 h at 61–65 °F.

This is the number Piergiorgio Giorilli codified and that essentially every serious source repeats — PizzaBlab, Gozney's own 100% biga recipe, Stadler Made, the Italian baking literature. Go longer and you cut it; run warmer and you cut it. For a time or temperature off that baseline, use PizzaBlab's dough calculator rather than guessing.

**Room-temperature water, not warm and not cold.** Cold water damages yeast cells. There is no proofing or activation step in the classic method — you are not trying to wake the yeast up, just disperse it. At these quantities you are well clear of scale resolution, so no slurry workaround is needed either.`,
    concepts: ["giorilli-standard"],
  },
  {
    id: "biga-3",
    phase: "biga",
    title: `Mix by hand to chunks`,
    summary: `Add the flour. Hand-mix 3–6 minutes with your fingers in a claw. Target gnocchi-sized chunks with no dry flour anywhere.`,
    timerLabel: `3–6 min`,
    timerMinutes: [3, 6],
    detail: `**Hand-mix at every batch size.** This isn't a concession for small batches — it's the method. Gozney's 100% biga recipe says to mix by hand to a dry lumpy consistency, and PizzaBlab warns specifically against forming a cohesive mass.

The goal is **small-to-medium chunks, like gnocchi** — not a dough. A spiral mixer's entire purpose is building a gluten network, which is precisely what you don't want here. An over-mixed biga rises like a dough instead of fermenting like a biga, and then it doubles and misleads you about ripeness.

Method: water and yeast **into the mixer bowl** — the biga ferments in the same bowl the final mix runs in, always. Mix to dissolve. Add flour. Make a claw with your hand and circulate your fingertips through it. **3–6 minutes, until no dry flour remains** — any dry flour never ferments. Break up large chunks by hand.

Cover to prevent drying. Sources differ on venting: Gozney and Ooni say leave a gap, PizzaBlab says it serves no purpose. Either is fine; the thing that matters is that it doesn't dry out.

*A side benefit: hand-mixing means the mixer's 500 g minimum never applies to the biga phase, so no batch is too small.*`,
    watchFor: `Crumbly chunks, not dough. No dry flour left anywhere.`,
    concepts: ["mix-dont-knead"],
  },
  {
    id: "biga-4",
    phase: "biga",
    title: `Ferment`,
    summary: `2 hours at room temperature, then {bigaFridge} hours in the fridge. Cover so it can't dry out.`,
    summaryRetarded: `2 hours at room temperature, then {bigaFridge} hours in the fridge. Cover so it can't dry out.`,
    summaryClassic: `{bigaRoomOnly} hours at 61–65 °F. Cover so it can't dry out.`,
    timerLabel: `per schedule`,
    detail: `**The 61–65 °F band isn't only about speed.** That range produces the right ratio of lactic to acetic acid, which is what gives biga its characteristic sharp, vinegary profile. Ferment much warmer and you get a preferment that is biga-shaped but tastes different.

That's why an unstable kitchen is a real problem here and not just a timing nuisance.

**The retarded schedule** — 2 h at room temperature, then 18–20 h in the fridge — is what Ooni's own professional biga recipe does, and it's the standard answer for a kitchen that won't hold a band. The 2 hours gets fermentation started; the fridge then holds it somewhere genuinely stable instead of wherever the room happens to drift. It trades a little of the acid character for control.

**The classic room-temperature version** is the one that produces the truest profile, if you have a wine fridge, a cool basement, or winter.`,
    concepts: ["why-61-65"],
  },
  {
    id: "biga-5",
    phase: "biga",
    title: `Pull at ~20% rise`,
    summary: `Ripe when the chunks have puffed roughly 20%. **It does not double.**`,
    detail: `**A ripe biga puffs up roughly 20%. That's it.**

This is the cue most people get wrong, because it's the opposite of how a poolish or a bulk dough reads. Waiting for it to double means waiting well past ripe — or it means you over-mixed and it's rising as a dough rather than fermenting as a biga.

The window is genuinely wide. Slower fermentation, slower acid production and less gluten breakdown mean a biga is hard to ruin by an hour either way. **Plan to hit the cue, not the clock.**

To make this objective rather than a judgment call: fill a small straight-sided jar with biga from the same batch and mark the start level. Now "20%" is a number you read off the glass instead of a feeling.`,
    watchFor: `Chunks slightly swollen, possibly knitted into a loose block. Smell moderately sharp, alcoholic-sour, and mild — not overpowering.`,
    troubleshoot: {
      headers: ["Symptom", "Cause", "Fix"],
      rows: [
        [`Doubled in volume`, `**Over-mixed** — you developed gluten, so it rose like a dough`, `Hand-mix only, shorter, to loose chunks. Not a yeast problem.`],
        [`Strong, sharp acidic or alcoholic smell`, `Over-fermented`, `Shorten, or switch to the retarded schedule`],
        [`No puffing at all`, `Not ready, ambient colder than assumed, or dead yeast`, `Give it longer. Probe actual ambient rather than trusting a wall thermometer. Check the yeast.`],
        [`Dry flour visible in the chunks`, `Under-mixed`, `Mix the full 3–6 min next time — dry flour never ferments`],
      ],
    },
  },
  {
    id: "mix-1",
    phase: "mix",
    title: `Prep the bowl`,
    summary: `Break up clumps in {freshFlourPerMix} g of fresh flour. Crumble the biga small — smaller is better. Add flour, toss to coat.`,
    values: [`Fresh flour: {freshFlourPerMix} g`],
    detail: `The biga is the stiffest thing the machine will face all session. Crumbling it small is the difference between a smooth breakdown and tripping motor protection.

Break up the fresh flour dry for the same reason as the biga flour — this is your last chance before water goes in.`,
    detailWhen: {
      condition: "nMix > 1",
      detail: `**Weigh out every mix now, before you start the first one.** You are running {nMix} mixes, and the changeover between them is budgeted at five minutes. That is only achievable if the second mix's flour, biga and salt are already sitting in their own containers — if you weigh during the changeover it becomes fifteen or twenty, and every extra five minutes puts another 2½ minutes of uncorrectable fermentation onto the first dough.

Split the tempered biga into {nMix} equal portions by weight, {bigaMassPerMix} g each, and cover them. Do the same with the fresh flour and salt.`,
    },
    repeatsPerMix: true,
  },
  {
    id: "mix-2",
    phase: "mix",
    title: `Phase A, breakdown`,
    summary: `Add **{phaseAWaterPerMix} g** of water (60%) with the mixer **off**, then run at **15% / 85 RPM** for 3–4 min until the biga pieces disappear into a rough shaggy mass.`,
    values: [`Phase A water: {phaseAWaterPerMix} g — weigh it, don't estimate`],
    speed: { dial: 15, rpm: 85, minutes: [3, 4], label: `15% / 85 RPM, 3–4 min` },
    detail: `**Highest-torque phase of the whole session.**

**Add the water with the mixer off.** The Core's slowest setting is 60 RPM — there is no creep speed to fold liquid in gently, and pouring onto flour at 85 RPM throws it out of the bowl. Add, then dial up.

*Optional, from PizzaBlab:* soak the crumbled biga in that water for a few minutes first. But only a few — working biga in water alone strips starch off the chunks and leaves hard, sticky gluten lumps that won't disperse.

If motor protection engages, stop, rest 5 minutes, and resume one step lower. Log it — that's data about your friction factor.`,
    concepts: ["no-creep-speed"],
    repeatsPerMix: true,
  },
  {
    id: "mix-3",
    phase: "mix",
    title: `Phase B, salt and bassinage`,
    summary: `Add {saltPerMix} g salt. Then **{phaseBWaterPerMix} g** (the remaining 40%) in **3 additions**, each fully absorbed before the next. **20% / 98 RPM**, 5–6 min.`,
    values: [`Salt: {saltPerMix} g`, `Phase B water: {phaseBWaterPerMix} g`],
    speed: { dial: 20, rpm: 98, minutes: [5, 6], label: `20% / 98 RPM, 5–6 min` },
    detail: `**Salt goes in here — never in the biga**, where it would suppress the yeast you just spent 20 hours propagating.

At 2.8% the salt is at the upper end of the Neapolitan range of 2.5–3.0%. That tightens the gluten slightly and slows fermentation a touch, both useful over a long schedule.

**Pour slowly down the splash-guard spout.** At 98 RPM the hook will sling water if you dump it in. Waiting for each addition to fully absorb before the next is what keeps the dough from breaking into a slurry it then has to recover from.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-4",
    phase: "mix",
    title: `Probe the temperature`,
    summary: `Stop and probe. **Target {probeTarget} °F.** You are not aiming at DDT yet.`,
    values: [`Probe target: {probeTarget} °F`, `DDT: {ddt} °F`],
    detail: `**Why below DDT and not at it.** By the end of Phase B you have absorbed roughly two thirds of the total friction — Phases A and B are long, and the hydration exotherm has already fired.

Still to come, **stated the way the probe will read it** — dough and bowl equilibrated, at 6 balls: Phase C **+3.4 °F**, Phase D **+0.8 °F**, minus **1.0 °F** given back to the room during the 10-minute rest. Net **+3.2 °F.**

**There is no flat "four degrees low" rule.** The gap shrinks as the batch gets smaller, because a small batch has proportionally more bowl to heat:

| Balls | 3 | 6 | 9 | 12 | 18 |
|---|---:|---:|---:|---:|---:|
| Probe target | DDT − 2.8 | DDT − 3.2 | DDT − 3.5 | DDT − 3.6 | DDT − 3.7 |

The general form:

**Probe target = DDT − 0.33 × FF × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)**

Remaining friction is diluted by the mixer bowl's thermal mass, and the rest sheds heat in proportion to the dough-to-room gap. At FF 14 in a 70 °F room: 3 balls 72.2 °F, 6 balls 71.8 °F, 9 balls 70.5 °F.`,
    troubleshoot: {
      headers: ["Probe reads", "Do"],
      rows: [
        [`Target ±1 °F`, `Run Phase C as written`],
        [`1–2 °F high`, `Cut Phase C to 2–2.5 min`],
        [`1–2 °F low`, `Extend Phase C to 4.5–5.5 min`],
        [`More than 2 °F off`, `Accept the miss — fix the water temperature next batch`],
      ],
    },
    concepts: ["friction-factor"],
    repeatsPerMix: true,
  },
  {
    id: "mix-5",
    phase: "mix",
    title: `Phase C, development`,
    summary: `**30% / 123 RPM**, 3–4 min, to smooth and glossy. Adjust duration from the probe: about **{observedRate30} °F per minute** at this speed.`,
    speed: { dial: 30, rpm: 123, minutes: [3, 4], label: `30% / 123 RPM, 3–4 min` },
    detail: `**Phase C has limited authority over temperature, and this is the important part.**

At 6 balls, cutting it to 2 minutes saves only **1.5 °F** and stretching it to 5.5 minutes adds only **2.0 °F**. That's the entire usable range, and it is narrower at 3 balls (−1.3 / +1.8) and slightly wider at 9 (−1.5 / +2.0).

Outside that window you are trading gluten development for temperature and losing both. **An under-mixed dough at exactly the right temperature is worse than a properly developed one running 2 °F warm.** Temperature misses get fixed upstream in the water calculation, not downstream by mangling the mix.

Friction per minute at each speed, if you need to correct elsewhere: 15% ≈ 0.75 °F/min · 20% ≈ 0.86 °F/min · 30% ≈ 1.08 °F/min. **Those are dough-only figures.** What a thermometer shows is each of them multiplied by \`Ct/(Ct + C_bowl)\` — 0.82 at 3 balls, 0.90 at 6, 0.93 at 9 — which at 30% gives an observed 0.89, 0.97 and 1.01 °F per minute. That is where "about a degree a minute" comes from, and it only holds at 6 balls and up.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-6",
    phase: "mix",
    title: `Rest`,
    summary: `Mixer off, bowl covered, 10 minutes.`,
    timerLabel: `10 min`,
    timerMinutes: 10,
    detail: `Relaxes the gluten. The dough smooths out on its own without any further work — this is doing something, even though it looks like nothing is happening.

It also breaks up the mixer's continuous run time, which keeps the whole session inside the Halo Core's 20-minute continuous limit.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-7",
    phase: "mix",
    title: `Phase D, finish`,
    summary: `**20% / 98 RPM**, 45–60 seconds. The dough should pull cleanly off the bowl wall.`,
    speed: { dial: 20, rpm: 98, minutes: [1, 1], label: `20% / 98 RPM, ~1 min` },
    detail: `**Temperature is a pass/fail gate, not a suggestion.** Record the actual number every time; it's the input to your friction factor and therefore to every future batch.

**Never above 40% / 148 RPM with this dough.** Total run time is about 15 minutes, inside the mixer's 20-minute continuous limit, and the rest breaks it up anyway.`,
    watchFor: `Smooth and glossy, "pumpkin-lattice" surface, cleans the bowl, thin windowpane with only slight tearing — **and at DDT ±1 °F.**`,
    repeatsPerMix: true,
  },
  {
    id: "mix-8",
    phase: "mix",
    title: `Changeover to the next mix`,
    summary: `Turn mix {mixIndex} out into the bulk container. **Don't clean the bowl.** Re-measure the biga and the bowl, then start mix {nextMixIndex}.`,
    values: [`Mix {nextMixIndex} water target: {waterTempNext} °F`],
    timerLabel: `5 min`,
    timerMinutes: 5,
    detail: `**Leave the residue.** It costs you nothing and cleaning costs you time. The dough stuck to the bowl is already at your target temperature, so it is thermally neutral — the water target for the next mix is identical whether you leave 0 g or 60 g behind. And because both doughs end up in the same bulk container, whatever transfers forward comes back: mix {mixIndex} loses a little, the next mix gains it, and the batch total is unchanged. Only what stays in the bowl after the *last* mix is a real loss, which is what the 2.2% overage has always covered.

**Take two readings before you start the next mix, because both have moved.**

The **bowl** is no longer cold — it just held a finished dough and has had five minutes to shed. It will read close to your dough temperature. The **biga** waiting on the counter has been warming toward the room the whole time mix {mixIndex} ran.

They pull the water target in the same direction, and the biga is the bigger term by five to one: about **1.6 °F of water per °F of biga**, against **0.33 °F per °F of bowl** at a 6-ball mix. Neither drift is modelled — there is no data for it — so measure rather than assume. Thirty seconds, and the calculator will give you the next target.

**If the next target comes out awkward, rinse the bowl.** Thin stainless resets to roughly the rinse temperature in under a minute. It costs changeover time, so it isn't the default, but it is there when you want it.`,
    repeatsPerMix: true,
    suppressOnFinal: true,
  },
  {
    id: "bulk-1",
    phase: "bulk",
    title: `Bulk rest`,
    summary: `Lightly oiled container, 45–60 min at room temperature. **No folds.**`,
    timerLabel: `45–60 min`,
    timerMinutes: [45, 60],
    detail: `**No folds.** The mixer has already built the gluten network, and the biga contributed a developed one before that. Folding now only tightens the dough further and costs you extensibility.

This is the one place where owning a spiral mixer changes the schedule rather than just the effort — a fold-based bulk would add hours here and actively make the dough worse.`,
    detailWhen: {
      condition: "nMix > 1",
      detail: `**Start the clock when the last mix comes out, not the first.** Any other anchor leaves the final dough with no bulk at all.

That means the first dough runs long — {staggerMinutes} minutes long, which is the time the later mixes took. There is no way around it. Both doughs are in the same container now and a container cannot hold two clocks.

**What the calculator does about it, and what it does not.** It takes {staggerHalfMinutes} minutes — half the spread — off the ball room-temperature rise later on. That does not make the batch uniform. It **centres** the error: instead of the first dough running {staggerMinutes} minutes over while the last runs exactly on time, both end up about {staggerHalfMinutes} minutes off, in opposite directions. Halving the worst case is the whole of the gain.

Read that carefully before you judge a result. If the batch comes out slightly over-fermented and you were expecting the correction to have made it uniform, you will reach for the wrong explanation.`,
    },
    warningWhen: {
      condition: "staggerUncentred > 2",
      text: `**{staggerUncentred} minutes of the spread could not be absorbed.** Your dough is warm enough that the ball rise is already at its 45-minute floor, so there is no room left to shorten it. The first dough will run that much long regardless.

This bites hardest exactly where it matters most — a warm dough ferments fastest, so a given number of extra minutes costs more here than anywhere else in the table. The floor is not worth overruling for it. If you want the spread back, the lever is upstream: fewer, larger mixes, or a cooler dough temperature.`,
    },
  },
  {
    id: "bulk-2",
    phase: "bulk",
    title: `Divide and ball`,
    summary: `Divide to {ballWeight} g. Pre-round, rest 10–15 min, then ball tight.`,
    values: [`{balls} balls × {ballWeight} g`],
    timerLabel: `10–15 min between rounds`,
    timerMinutes: [10, 15],
    detail: `The rest between pre-rounding and final balling lets the gluten relax so you can get a tight ball without fighting it. Balling a tense dough tears the surface, and a torn surface doesn't hold gas.

At {ballWeight} g you're opening to roughly 11.5–12 inches — a thickness factor of about 0.083 oz/in², squarely in the classic Neapolitan band. For a fatter cornicione against the Tread's 12" ceiling, open to 11 inches instead.`,
  },
  {
    id: "bulk-3",
    phase: "bulk",
    title: `Onto trays`,
    summary: `**Very lightly oiled** half-sheet trays with lids — a film wiped with a paper towel, not a pool. Nothing on top of the balls. Room temperature **{roomMin} min**, set by the dough temperature you actually hit.`,
    values: [`Room time: {roomMin} min (final dough {finalDoughTemp} °F)`],
    detail: `**Oil, not flour.**

Flour is hygroscopic. It pulls water out of the dough surface and hydrates into paste. Over 24–36 hours in a fridge — a drying environment even under a lid — you get the worst of both: patches of gluey paste where the flour hydrated, and a dry skin everywhere else. That skin resists opening and tears at the cornicione instead of stretching.

The traditional flour dusting comes from **wooden** dough boxes, which breathe and buffer moisture. Aluminum does neither. Flour that lands on aluminum has nowhere to go but into the dough.

Oil is a barrier rather than an absorbent: it stops the dough bonding to the metal without taking any water out of it, and it prevents skinning over a long cold ferment.

**Keep the two jobs separate:**

| Job | Use |
|---|---|
| Release from the **tray** | thin oil film |
| Release from the **peel** | flour or semolina, at the bench, right before launch |

**Keep it to a film.** Too much oil and three things go wrong: the ball slides instead of gripping enough to hold its dome as it relaxes, the base picks up enough oil to fry and over-brown on the stone, and the excess smokes on contact. A neutral oil is marginally better than olive purely on smoke point, though at a wiped film it barely matters.

**Nothing on top of the balls.** The lid handles humidity. Oil on the upper surface becomes the cornicione surface and darkens it unevenly.`,
    concepts: ["oil-not-flour"],
  },
  {
    id: "bulk-4",
    phase: "bulk",
    title: `Refrigerate`,
    summary: `{coldFerment} hours at 38–40 °F. **Spread the trays out for the first 4 hours — do not stack.**`,
    timerLabel: `{coldFerment} h`,
    detail: `A 265 g ball takes **3–4 hours to reach 40 °F**, and that entire window is warm fermentation you didn't budget for. Stacked trays can double it — the trays in the middle of a stack are insulated by the ones above and below.

This is also why DDT sits at the cool end of the Neapolitan band. Every degree of starting temperature extends the time spent above 50 °F while the mass cools.`,
  },
  {
    id: "bake-1",
    phase: "bake",
    title: `Temper`,
    summary: `Out of the fridge {temper} hours before baking. Target **60–65 °F at the core** — measure it, don't guess.`,
    timerLabel: `{temper} h`,
    detail: `Below **55 °F** the dough tears on opening and won't spring in the oven. Above **70 °F** it goes slack and sticky and loses its shape on the peel.

The visual cue and the thermometer should agree. If the ball looks ready but reads 52 °F, trust the thermometer — the surface warms long before the core does.`,
    watchFor: `Balls relaxed and spread slightly, domed, airy, with a slow incomplete rebound when poked.`,
  },
  {
    id: "bake-2",
    phase: "bake",
    title: `Bake`,
    summary: `Preheat until the gauge reads **750 °F**. Launch on **full flame**, 60–90 s, turning every 15–20 s.`,
    detail: `**Why 750 + full flame is the correct call, not a compromise.**

Neapolitan baking is governed by the **ratio of top heat to bottom heat**, not by absolute temperature. The stone cooks the base by conduction; the flame cooks the top by radiation. If the base finishes before the top, you need a *larger* top-to-bottom ratio — which means lowering the stone, raising the flame, or both.

A 750 °F stone with full flame does exactly that. Pushing the stone to 800 °F+ moves the ratio the wrong way and burns the base before the cornicione has set.

**Turn every 15–20 s.** Lateral flame plus a small chamber means a static face scorches fast.

**Let the stone recover between pies.** The Tread heats and cools fast, which is the price of low thermal mass. Across 9–18 pizzas the stone is the limiting variable, not the dough.

*Worth logging once: the built-in gauge and an IR reading of the stone surface are different measurements and won't agree. If you gun the stone at gauge-750, write down what it says — that's the number that transfers to any other oven.*`,
    troubleshoot: {
      headers: ["Symptom", "Cause", "Fix"],
      rows: [
        [`**Burn ring at the base of the cornicione**`, `That ring is unsauced *and* usually the thinnest part of the base — no evaporative cooling and no thermal mass, stacked on top of each other`, `Take the sauce to ~1 cm from the rim · open with a gradual thickness gradient rather than pressing a groove · brush loose flour off the base · first turn at 15 s · lift and dome 5–10 s if the base runs ahead`],
        [`Pale crust on long ferments`, `Residual sugars consumed by the yeast`, `Shorten the cold ferment. **Never bake longer** — it dries the crumb.`],
        [`Base ahead of the top`, `Top-to-bottom ratio too low`, `Lower the stone or raise the flame`],
        [`Top ahead of the base`, `Top-to-bottom ratio too high`, `The only case for nudging the stone up`],
      ],
    },
    concepts: ["burn-ring"],
  },
];

export const PHASE_LABELS: Record<Phase, string> = {
  biga: 'Biga',
  mix: 'Final mix',
  bulk: 'Bulk, ball, cold',
  bake: 'Temper and bake',
};
