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
/**
 * §8.2 `**detail, shown only when `<condition>`:**`. A closed set, resolved by
 * `detailConditionHolds` and never evaluated — the same reasoning as `ShownWhen`.
 */
export type DetailCondition = 'nMix > 1' | 'nBiga > 1';

export interface ConditionalDetail {
  /** Literally as written in the spec. */
  condition: DetailCondition;
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

/**
 * §8.2 `**shown only when:**`. A literal drawn from a closed set and compared
 * by string equality — deliberately NOT evaluated. §8 prose is content, and an
 * expression evaluator reachable from it is a code-execution surface that grows
 * one convenient condition at a time, which is the same reasoning that keeps
 * `{token}` to bare identifiers.
 */
export type ShownWhen = "schedule === 'retarded'" | "schedule === 'classic'";

export interface Step {
  id: string;
  phase: Phase;
  /**
   * Render this step only on the named schedule. `biga-6` only: the temper does
   * not exist on the classic track, where the biga is already at room
   * temperature and `bigaTemper` is zero.
   */
  shownWhen?: ShownWhen;
  /** Short, imperative. */
  title: string;
  /** Default view. May contain {token} bindings. */
  summary: string;
  /** `biga-4` reads differently per schedule; when set these replace `summary`. */
  summaryRetarded?: string;
  summaryClassic?: string;
  /** Computed values pulled out for scanning, one per chip. */
  values?: string[];
  /** Raw timer label from the spec, e.g. "3–6 min", "18–20 h", "{roomMin} min". */
  timerLabel?: string;
  /** Parsed where the label is a fixed number of minutes. */
  timerMinutes?: number | [number, number];
  /**
   * `biga-4` times a different stage on each track (§7.5): 2 h at room
   * temperature before the fridge, or the whole 16–18 h classic ferment. When
   * set these replace `timerLabel`; resolve through `timerLabelFor`.
   */
  timerLabelRetarded?: string;
  timerLabelClassic?: string;
  /** Dial and RPM only (§8.1, MESSAGE-32): the phase's duration is its timer. */
  speed?: { dial: number; rpm: number; label: string };
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
    title: `Start the yeast, break up the flour`,
    summary: `Weigh {bigaWaterPerBiga} g of water. Warm about ten times the yeast's weight of it to 100–110 °F, stir in {bigaADYPerBiga} g ADY and leave it 10 minutes. Meanwhile weigh {bigaFlourPerBiga} g of flour and whisk it hard or push it through a coarse sieve to break up the clumps.`,
    values: [`Biga water: {bigaWaterPerBiga} g`, `ADY: {bigaADYPerBiga} g`, `Biga flour: {bigaFlourPerBiga} g{bigaCountSuffix}`],
    detail: `**The yeast gets warm water; the rest of the biga water stays at room temperature.** Active dry yeast rehydrates best near 104 °F. Below about 68 °F its cells can lose up to half their soluble contents, and the glutathione that leaks out slackens the dough (PizzaBlab). King Arthur gives the same advice for active dry yeast going into cool water. PizzaBlab's biga guide uses room-temperature water because it assumes fresh or instant yeast. The warm water is only for rehydration: no sugar, no proofing test.

The yeast water comes out of the biga water, not on top of it. It warms the biga water only 2–3 °F, which nothing downstream reads.

**The yeast dose is Piergiorgio Giorilli's standard: 1% fresh yeast = 0.30% IDY = 0.375% ADY on biga flour**, the baseline for 16–18 h at 61–65 °F (16–18 °C).

Italian Pizza Secrets gives this dose with that window, and Baking With Theory with 16–20 h at 16–20 °C; PizzaBlab allows a wider 12–24 h at 16–18 °C. A longer or warmer ferment needs less yeast. For a room-temperature biga at another time or temperature, use PizzaBlab's dough calculator. It doesn't model a biga that goes into the fridge, so the retarded schedule rests on an assumption (see *Refrigerate the biga*). These amounts are well above scale resolution, so there's no need to weigh the yeast as a slurry.

Grain Craft arrives lumpy from the mill; the flour itself is fine. The lumps are only easy to break up while the flour is dry.

A clump that survives into the biga keeps dry flour at its core, and dry flour never ferments. In a stiff 50% biga you can't find it by hand once the water is in, and it turns up later as a hard nodule in the finished dough.

Weigh before you break it up, so flour lost in the sieve doesn't change your number.`,
    detailWhen: {
      condition: "nBiga > 1",
      detail: `**This batch needs {nBiga} separate bigas.** The weights above are for one of them. Don't weigh the batch total into one container: {bigaFlourTotal} g of biga flour is more than the 1610 g the machine handles at this hydration.

Make them back to back in separate containers. They ferment side by side on the same clock, so the steps that follow cover both. Only one fits in the mixer bowl; the second goes in its own tub.`,
    },
    concepts: ["giorilli-standard"],
  },
  {
    id: "biga-3",
    phase: "biga",
    title: `Mix by hand to chunks`,
    summary: `In the mixer bowl, combine the rest of the water, at **room temperature**, with the yeast water. Add the flour and mix by hand, fingers in a claw, for 3–6 minutes, until you have gnocchi-sized chunks and no dry flour.`,
    timerLabel: `3–6 min`,
    timerMinutes: [3, 6],
    detail: `Mix by hand at every batch size. PizzaBlab mixes it by hand, fingers in a claw, and warns against forming a cohesive mass.

Aim for small-to-medium chunks, like gnocchi. A spiral mixer builds gluten, which a biga shouldn't have yet. An over-mixed biga rises like a dough, can double, and then looks riper than it is.

The yeast goes in dissolved so it spreads evenly: a few grams have to reach every part of a stiff 50% biga that is only mixed to chunks and never kneaded, and the water carries it there.

The biga always ferments in the mixer bowl, the same bowl the final mix runs in. Work your fingertips through it in a claw for 3–6 minutes, until no dry flour remains, since dry flour never ferments. Break up large chunks by hand.

Cover it so it doesn't dry out. PizzaBlab says a vent serves no purpose, so a closed lid is fine.

Because the biga is mixed by hand, the mixer's 500 g minimum doesn't apply to it, so no batch is too small.`,
    watchFor: `Crumbly chunks, not a dough. No dry flour anywhere.`,
    concepts: ["mix-dont-knead"],
  },
  {
    id: "biga-4",
    phase: "biga",
    title: `Ferment at room temperature`,
    summary: `**2 hours** at room temperature in the mixer bowl, covered so it doesn't dry out. Then it goes in the fridge.`,
    summaryRetarded: `**2 hours** at room temperature in the mixer bowl, covered so it doesn't dry out. Then it goes in the fridge.`,
    summaryClassic: `At 61–65 °F, covered so it doesn't dry out. The Giorilli window is **16–18 hours**; the timeline plans **{bigaRoomOnly} h**.`,
    timerLabelRetarded: `2 h`,
    timerLabelClassic: `16–18 h`,
    detail: `**The retarded schedule**, 2 h at room temperature and then 18–20 h in the fridge, suits a kitchen that won't hold 61–65 °F: the 2 hours start fermentation, and the fridge then holds the biga at a steady temperature instead of wherever the room drifts. You give up a little acid character for control. The schedule is this recipe's own; Julian Sisofo's biga has the same shape with a longer warm start.

**The classic room-temperature schedule** gives the truest biga flavor, if you have a wine fridge, a cool basement or a winter kitchen that holds the range.`,
    concepts: ["why-61-65"],
  },
  {
    id: "biga-4b",
    phase: "biga",
    shownWhen: "schedule === 'retarded'",
    title: `Refrigerate the biga`,
    summary: `Into the fridge, still in the mixer bowl and covered, for **18–20 hours**. The timeline plans {bigaFridge} h.`,
    timerLabel: `18–20 h`,
    detail: `The 2 hours at room temperature started fermentation; the fridge holds it steady while the biga ripens. Anywhere in the 18–20 h window works. Judge ripeness by the cue in the next step.

**This schedule rests on an assumption.** Giorilli's dose is set for 16–18 h at 61–65 °F. Two hours warm, 18–20 h at 38–40 °F and the hour's temper give the biga less: by the recipe's fermentation model, with the rate doubling every 17 °F, about 11 hours' worth at 63 °F. The recipe assumes the biga is still ripe enough at pull, and that the final dough's schedule makes up any shortfall. Bake 1 ran this schedule; nothing has measured the biga's rise on it. If the balls are consistently behind on bake day, add an hour to the biga's time at room temperature before changing the dose.`,
  },
  {
    id: "biga-5",
    phase: "biga",
    title: `Pull at ~20% rise`,
    summary: `Ripe when the chunks have puffed about 20%. **It won't double.**`,
    detail: `A ripe biga rises only about 20%. Habits from poolish and bulk dough say to wait for it to double; with a biga that means waiting well past ripe. If it does double, it was over-mixed and is rising like a dough.

The window is wide. A biga ferments slowly, makes acid slowly and breaks down little gluten, so an hour either way rarely matters. Go by the cue rather than the clock.

To make the cue objective, fill a small straight-sided jar with biga from the same batch and mark the starting level. Then 20% is a line on the glass.`,
    watchFor: `Chunks slightly swollen, possibly knitted into a loose block. The smell is moderately sharp, a little sour and alcoholic, but not overpowering.`,
    troubleshoot: {
      headers: ["Symptom", "Cause", "Fix"],
      rows: [
        [`Doubled in volume`, `**Over-mixed**: it developed gluten and rose like a dough`, `Mix by hand only, for less time, to loose chunks. It isn't a yeast problem.`],
        [`Strong, sharp acidic or alcoholic smell`, `Over-fermented`, `Shorten it, or switch to the retarded schedule`],
        [`No puffing at all`, `Not ready, colder than you thought (room or fridge), or dead yeast`, `Give it longer. Probe the actual temperature where it's fermenting rather than trusting a wall thermometer. Check the yeast.`],
        [`Dry flour visible in the chunks`, `Under-mixed`, `Mix the full 3–6 min next time; dry flour never ferments`],
      ],
    },
  },
  {
    id: "biga-6",
    phase: "biga",
    shownWhen: "schedule === 'retarded'",
    title: `Temper the biga`,
    summary: `Out of the fridge **{bigaTemper} h** before you mix. Leave it in the mixer bowl.`,
    timerLabel: `{bigaTemper} h`,
    detail: `This is the easiest hour in the schedule to skip, and skipping it costs the most. Biga temperature affects the water target more than anything else you measure: each degree of biga moves the required water by about **two degrees**, 1.9 °F at a 6-ball mix and 2.3 °F at a 3-ball one.

Without it, the calculator will ask for water hotter than a tap can supply, because the biga is too cold to reach your target dough temperature any other way.

Leave the biga in the mixer bowl. The {bowlMassG} g stainless bowl is part of the thermal system, and the hour warms bowl and biga together. Tempering the biga on the counter leaves the bowl cold.`,
  },
  {
    id: "mix-1",
    phase: "mix",
    title: `Prep the bowl`,
    summary: `Crumble the biga as small as you can, add {freshFlourPerMix} g of fresh flour, and toss to coat.`,
    values: [`Fresh flour: {freshFlourPerMix} g`],
    detail: `The biga is the stiffest thing the mixer handles all session. Crumbled small, it breaks down smoothly; in large pieces it can trip the motor protection.

The fresh flour isn't sieved. Its lumps break up in Phase A; the biga flour is sieved because mixing by hand leaves them intact.

**Take both temperatures after you crumble the biga.** The calculator needs the biga's temperature when it meets the water, and handling warms it: on bake 1 the biga read **53 °F at pull and 58 °F once broken up**.

The bowl doesn't warm with the biga, so read it separately: hold the probe against the bowl wall for five seconds. Each degree of bowl temperature is worth 0.66 °F of water at a 3-ball mix.`,
    detailWhen: {
      condition: "nMix > 1",
      detail: `**Weigh out every mix before you start the first.** You're running {nMix} mixes, with five minutes budgeted for each changeover. That only works if the next mix's flour, biga and salt are already in their own containers. Weighing during the changeover stretches it to fifteen or twenty minutes, and every extra five minutes adds five minutes of fermentation to the first dough that nothing later can correct.

Split the tempered biga into {nMix} equal portions of {bigaMassPerMix} g and cover them. Do the same with the fresh flour and salt.`,
    },
    repeatsPerMix: true,
  },
  {
    id: "mix-2",
    phase: "mix",
    title: `Phase A, breakdown`,
    summary: `Add **{phaseAWaterPerMix} g** of water ({phaseAPercent}%) with the mixer **off**, then run at **1½ lit segments** (15%, 85 RPM) for 3–4 min, until the biga pieces disappear into a rough, shaggy mass.`,
    values: [`Phase A water: {phaseAWaterPerMix} g`],
    timerLabel: `3–4 min`,
    timerMinutes: [3, 4],
    speed: { dial: 15, rpm: 85, label: `15% / 85 RPM` },
    detail: `This is the highest-torque phase of the session.

Add the water with the mixer off. The Core's slowest setting is 60 RPM, too fast to fold liquid in, and pouring water in at 85 RPM throws flour out of the bowl. Add it, then start the mixer.

Weigh the water rather than pouring by eye. Bake 1 left open whether the split between Phases A and B is right, and only weighed pours can settle it.

Optional, from PizzaBlab: soak the crumbled biga in the water for a few minutes first. Keep it to a few; working biga in plain water strips starch off the chunks and leaves hard, sticky gluten lumps that won't disperse.`,
    concepts: ["no-creep-speed"],
    repeatsPerMix: true,
  },
  {
    id: "mix-3",
    phase: "mix",
    title: `Phase B, salt and bassinage`,
    summary: `Add {saltPerMix} g salt, then **{phaseBWaterPerMix} g** of water (the remaining {phaseBPercent}%) in **3 additions**, letting each absorb fully before the next and the last before you stop. **2 lit segments** (20%, 98 RPM), 5–6 min.`,
    values: [`Salt: {saltPerMix} g`, `Phase B water: {phaseBWaterPerMix} g`],
    timerLabel: `5–6 min`,
    timerMinutes: [5, 6],
    speed: { dial: 20, rpm: 98, label: `20% / 98 RPM` },
    detail: `Salt goes in here and never in the biga, where it would slow the yeast you've spent 20 hours building up.

At 2.8% of the flour, the salt sits inside AVPN's range: 40–60 g per liter of water with 1.6–1.8 kg of flour, which is 2.2–3.75% of the flour.

Pour slowly down the splash-guard spout; at 98 RPM the hook slings water that's dumped in. Letting each addition absorb before the next keeps the dough from breaking into a slurry it then has to recover from.`,
    watchFor: `No free water, no dry flour, one cohesive mass.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-4",
    phase: "mix",
    title: `Probe the temperature`,
    summary: `Stop and probe. **Target {probeTarget} °F**, below DDT on purpose.`,
    values: [`Probe target: {probeTarget} °F`, `DDT: {ddt} °F`],
    detail: `By the end of Phase B the dough has taken most of its friction heat: Phases A and B are long, and the heat of hydration has already been released.

What's still to come, as the probe will read it (dough and bowl together, for your batch in your kitchen): Phases C and D add about **{frictionRemainingF} °F**, and the 10-minute rest moves the dough **{restExchangeF} °F** toward room temperature. That's why the target sits **{probeGapPhrase}**.

There's no fixed "so many degrees low" rule, and your kitchen matters more than your batch size. During the rest the dough gives heat to a cold room and takes it from a warm one:

- **Each degree your kitchen is below 70 °F moves the target 0.2 °F up toward DDT.** A 62 °F kitchen is 1.6 °F closer.
- **Each degree above 70 moves it 0.2 °F down.**
- **Batch size matters much less.** A 62 °F kitchen against a 78 °F one shifts the target by more than three degrees; going from 3 balls to 9 shifts it by a fraction of that.

So the target is computed from the room temperature you entered, and the room is worth measuring rather than assuming.

The formula:

**Probe target = DDT − (Phase C + Phase D friction) × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)**

Phase C and Phase D friction is their middle times at their friction rates: 3.5 minutes at 1.08 °F a minute plus 52½ seconds at 0.86, about 4.5 °F in the dough alone. It doesn't depend on your friction factor. FF decides where the dough is when you probe, which is what the probe measures; what C and D still add is the same either way. The mixer bowl's thermal mass dilutes that friction, and the rest exchanges heat in proportion to the gap between dough and room.`,
    troubleshoot: {
      headers: ["Probe reads", "Do"],
      rows: [
        [`Target ±1 °F`, `Run Phase C as written`],
        [`1–2 °F high`, `Cut Phase C to 2–2.5 min`],
        [`1–2 °F low`, `Extend Phase C to 4.5–5.5 min`],
        [`More than 2 °F off`, `Use Phase C's full range: 2 min if high (longer if it isn't smooth and glossy yet), 5.5 min if low. Accept what's left and fix the water temperature next batch`],
      ],
    },
    concepts: ["friction-factor"],
    repeatsPerMix: true,
  },
  {
    id: "mix-5",
    phase: "mix",
    title: `Phase C, development`,
    summary: `**3 lit segments** (30%, 123 RPM), 3–4 min, until smooth and glossy. Adjust the time from the probe reading: about **{observedRate30} °F per minute** at this speed.`,
    timerLabel: `3–4 min`,
    timerMinutes: [3, 4],
    speed: { dial: 30, rpm: 123, label: `30% / 123 RPM` },
    detail: `Phase C can only move the temperature a little.

At 6 balls, cutting it to 2 minutes saves **1.5 °F** and stretching it to 5.5 minutes adds **1.9 °F**. That's the whole usable range; it's narrower at 3 balls (−1.3 / +1.8) and slightly wider at 9 (−1.5 / +2.0).

Beyond that you give up gluten development to fix temperature. **A properly developed dough 2 °F warm is better than an under-mixed one at exactly the right temperature.** Fix a temperature miss in the next batch's water calculation instead.

**So the look sets the shortest Phase C, and 5.5 minutes the longest.** The probe picks the time in between. Don't stop before the dough is smooth and glossy, however warm it reads, and don't run past 5.5 minutes to warm it.

Friction per minute at each speed: 15% ≈ 0.75 °F/min · 20% ≈ 0.86 °F/min · 30% ≈ 1.08 °F/min. These are for the dough alone. A thermometer reads each of them multiplied by \`Ct/(Ct + C_bowl)\` — 0.82 at 3 balls, 0.90 at 6, 0.93 at 9 — which at 30% gives 0.89, 0.97 and 1.01 °F per minute. So "about a degree a minute" holds at 6 balls and up.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-6",
    phase: "mix",
    title: `Rest`,
    summary: `Mixer off, bowl covered, 10 minutes.`,
    timerLabel: `10 min`,
    timerMinutes: 10,
    detail: `The rest relaxes the gluten, and the dough smooths out on its own.

It also breaks up the mixer's run time, keeping each run inside the Halo Core's {maxRunMin}-minute continuous limit.`,
    repeatsPerMix: true,
  },
  {
    id: "mix-7",
    phase: "mix",
    title: `Phase D, finish`,
    summary: `**2 lit segments** (20%, 98 RPM), 45–60 seconds. The dough should pull cleanly off the bowl wall.`,
    timerLabel: `45–60 s`,
    timerMinutes: [0.75, 1],
    speed: { dial: 20, rpm: 98, label: `20% / 98 RPM` },
    detail: `The temperature counts toward done as much as the look and the windowpane. Write down the final dough temperature every time: it's the input to your friction factor, and through it to every future water calculation.

**Never above 4 lit segments (40%, 148 RPM) with this dough.** The total run is about 15 minutes, inside the mixer's {maxRunMin}-minute continuous limit, and the rest splits it anyway.`,
    watchFor: `Smooth, glossy "pumpkin-lattice" surface, a clean bowl, a thin windowpane with only slight tearing, and **DDT ±1 °F.**`,
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
    detail: `Leave the residue in the bowl; cleaning costs time and gains nothing. The dough stuck to it is already at your target temperature, so it doesn't change the next water target, which is the same with 0 g or 60 g left behind. Every mix ends up in the same bulk container, so whatever carries into the next mix still ends up in the batch. Only what's left after the last mix is lost, and the 2.2% overage covers it.

Take two readings before the next mix, because both have changed.

The **bowl** just held a finished dough, so it's no longer cold. It won't be warmer than that dough, but how far it cools toward room temperature in five minutes hasn't been measured, so read it. The **biga** waiting on the counter has been warming toward room temperature while mix {mixIndex} ran.

Both pull the water target the same way, and the biga has about five times the effect: about **1.6 °F of water per °F of biga**, against **0.33 °F per °F of bowl** at a 6-ball mix. The calculator doesn't model either drift, since there's no data for it. Measure both and it gives you the next target.

If the next target is awkward, rinse the bowl. Thin stainless reaches roughly the rinse water's temperature in under a minute. It adds time to the changeover, so it isn't the default.`,
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
    detail: `Skip the folds. The mixer has already built the gluten, on top of the structure the biga brought with it, and folding now only tightens the dough and costs extensibility.

With the spiral mixer doing that work, bulk is short and fold-free. A fold-based bulk would add hours here and make this dough worse.`,
    detailWhen: {
      condition: "nMix > 1",
      detail: `**Start the clock when the last mix comes out.** Starting it earlier leaves the last dough with no bulk at all.

So the first dough runs {staggerMinutes} minutes long, the time the later mixes took. The doughs share one container now, and one container can't run on separate clocks.

To compensate, the calculator takes {staggerHalfMinutes} minutes, half the difference, off the room-temperature rise after balling. The batch still isn't uniform, but the error is split: instead of the first dough running {staggerMinutes} minutes over and the last exactly on time, the first and last end up about {staggerHalfMinutes} minutes off in opposite directions. That halves the worst case.

Keep this in mind when you judge the result. A slightly over-fermented batch doesn't mean the correction failed; it was never meant to make the batch uniform.`,
    },
    warningWhen: {
      condition: "staggerUncentred > 2",
      text: `**{staggerUncentred} minutes of the difference couldn't be absorbed.** Your dough is warm enough that the rise after balling is already at its 45-minute floor, so there was nothing left to shorten. The first dough will run that much long, so this batch won't be uniform.

If you can tell the doughs apart in the tub, divide and ball the first dough before the rest and put its trays in the fridge as they fill, rather than chilling everything at the end. That recovers roughly the time it takes to ball one mix, about ten minutes at this batch size. It isn't in the calculation, but it costs nothing.

Expect the first dough to be a little further along: slacker on the bench, possibly more open, maybe slightly more acidic. That variation comes from the batch running on one clock. Log it; the formula doesn't need to change.`,
    },
  },
  {
    id: "bulk-2",
    phase: "bulk",
    title: `Divide and ball`,
    summary: `Divide into {ballWeight} g pieces. Pre-round, rest 10–15 min, then ball tight.`,
    values: [`{balls} balls × {ballWeight} g`],
    timerLabel: `10–15 min between rounds`,
    timerMinutes: [10, 15],
    detail: `The rest between pre-rounding and final balling relaxes the gluten, so you can shape a tight ball without tearing it. A torn surface doesn't hold gas.`,
  },
  {
    id: "bulk-3",
    phase: "bulk",
    title: `Onto trays`,
    summary: `Half-sheet trays with lids, very lightly oiled: wipe on a thin film with a paper towel. Nothing on top of the balls. Leave them at room temperature for **{ballRoomMin} min**, set by how far your final dough temperature is from DDT.`,
    values: [`Room time: {ballRoomMin} min (final dough {finalDoughTemp} °F against DDT {ddt} °F)`],
    timerLabel: `{ballRoomMin} min`,
    detail: `**Oil the trays; don't flour them.**

Flour absorbs water. It pulls moisture out of the dough surface and turns to paste. Over 24–36 hours in the fridge, which dries things even under a lid, you get gluey patches where the flour hydrated and a dry skin everywhere else. The skin resists opening and tears at the cornicione instead of stretching.

Flour dusting comes from **wooden** dough boxes, which breathe and buffer moisture. Aluminum does neither, so flour on aluminum has nowhere to go but into the dough.

Oil keeps the dough from sticking to the metal without drawing water out of it, and stops a skin forming over a long cold ferment.

**Use each for its own job:**

| Job | Use |
|---|---|
| Release from the **tray** | thin oil film |
| Release from the **peel** | flour or semolina, at the bench, right before launch |

**Keep the oil to a film.** With too much, the ball slides instead of gripping enough to hold its dome as it relaxes, the base picks up oil that fries and over-browns on the stone, and the excess smokes. A neutral oil has a slightly higher smoke point than olive oil, though with a thin film it barely matters.

**Put nothing on top of the balls.** The lid handles humidity, and oil on top becomes the cornicione surface and browns it unevenly.`,
    detailWhen: {
      condition: "nMix > 1",
      detail: `**This rise is shorter than a single mix would get.** At {finalDoughTemp} °F a single mix would rest {roomMin} min; this batch rests {ballRoomMin}. The first mix has been fermenting longer than the last, so the calculator shortens the rise by half that difference to split it (see *Bulk rest*), and never below 45 minutes.

The final dough temperature here is the average of every mix's reading, since the doughs share one tub.`,
    },
    concepts: ["oil-not-flour"],
  },
  {
    id: "bulk-4",
    phase: "bulk",
    title: `Refrigerate`,
    summary: `{coldFerment} hours at 38–40 °F. **For the first 4 hours, spread the trays out; don't stack them.**`,
    timerLabel: `{coldFerment} h`,
    detail: `A 265 g ball takes **3–4 hours to cool to 40 °F** on spread trays. The rise after balling allows for that cooldown, and for a warmer or cooler dough cooling from a different start. It doesn't allow for anything that slows the cooling: stacking can double the time, because the trays in the middle are insulated by the ones above and below, and a crowded fridge slows it too.`,
  },
  {
    id: "bake-1",
    phase: "bake",
    title: `Temper`,
    summary: `Out of the fridge **2–3 hours** before baking; the timeline plans {temper} h. Target **60–65 °F at the core**, measured with a probe.`,
    timerLabel: `2–3 h`,
    detail: `Below **55 °F** the dough tears when you open it and won't get good oven spring. Above **70 °F** it goes slack and sticky and loses its shape on the peel.

The look of the ball and the thermometer should agree. If a ball looks ready but reads 52 °F, trust the thermometer; the surface warms long before the core.`,
    watchFor: `Balls relaxed and spread slightly, domed and airy, with a slow, incomplete rebound when poked.`,
  },
  {
    id: "bake-2",
    phase: "bake",
    title: `Bake`,
    summary: `Preheat until the gauge reads **750 °F**. Launch on **full flame** and bake 60–90 s, turning every 15–20 s.`,
    detail: `**Why 750 °F and full flame.** A Neapolitan bake depends on the balance between heat from above and heat from below more than on absolute temperature. The stone cooks the base by conduction; the flame cooks the top by radiation. If the base finishes before the top, you need more heat from above relative to below: a cooler stone, more flame, or both.

A 750 °F stone with full flame gives that balance. Pushing the stone to 800 °F or more shifts it the wrong way and burns the base before the cornicione sets.

**Turn every 15–20 s.** The flame comes from one side of a small chamber, so whichever side faces it scorches fast.

**Let the stone recover between pizzas.** The Tread heats and cools quickly because it has little thermal mass, so across 9–18 pizzas the stone limits you more than the dough does.

Worth logging once: the built-in gauge and an IR reading of the stone surface measure different things and won't agree. If you check the stone with an IR thermometer when the gauge reads 750, record the reading. That's the number that carries over to other ovens.`,
    troubleshoot: {
      headers: ["Symptom", "Cause", "Fix"],
      rows: [
        [`**Burn ring at the base of the cornicione**`, `That ring is unsauced and usually the thinnest part of the base, so it has no evaporative cooling and little thermal mass`, `Stop the sauce ~1 cm from the rim · open with a gradual change in thickness instead of pressing a groove · brush loose flour off the base · make the first turn at 15 s · if the base runs ahead, lift and dome the pizza for 5–10 s`],
        [`Pale crust on long ferments`, `The yeast has used up the residual sugars`, `Shorten the cold ferment. **Don't bake longer**; it dries the crumb.`],
        [`Base done before the top`, `Not enough heat from above relative to below`, `Lower the stone temperature or raise the flame`],
        [`Top done before the base`, `Too much heat from above relative to below`, `The only case for raising the stone temperature`],
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
