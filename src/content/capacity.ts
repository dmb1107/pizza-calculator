/**
 * Capacity messages — WEBSITE-SPEC-biga-calculator.md §7.3 *Capacity*, and the
 * split hint from §6 Panel 1, verbatim (MESSAGE-29).
 *
 * Tokens bind through `bindTokens` like step prose; which message shows is
 * decided in `src/lib/capacity.ts`. Generated from the spec and checked
 * character for character by `tests/steps.test.ts`; every number is claimed or
 * classified in `tests/contentLiterals.test.ts`. Edit the spec, then
 * regenerate.
 */

export const CAPACITY = {
  split: `**Too much dough for one mix — this batch is split.** {balls} balls is {doughTotal} g of dough, and the Halo Core takes at most {maxDoughG} g. Mix it as **{nMix} batches of {doughPerMix} g**, one after another in the same bowl. The amounts and steps below are already per mix.`,
  bigaSplit: `**Too much biga for one bowl — make {nBiga}.** {bigaFlourTotal} g of biga flour is over the Core's {bigaFlourCapG} g limit for a stiff dough. Mix {nBiga} bigas of {bigaFlourPerBiga} g flour each. Only one can ferment in the mixer bowl; the other ferments elsewhere.`,
  divideBiga: `Mix one biga, then divide it by weight into {nMix} portions for {nMix} separate final mixes.`,
  nearLimit: `**Close to the Core's limit.** {doughPerMix} g per mix is within 5% of the {maxDoughG} g maximum. It will mix, but there's little margin — weigh carefully.`,
  belowMinimum: `**Too little dough for the mixer.** {doughPerMix} g is under the Halo Core's {minDoughG} g minimum — the hook won't grip it. Make more balls.`,
  minimumAtInput: `**3 balls minimum.** Below that the Halo Core's hook can't grip the dough, and the water would need to be hotter than a tap delivers. For one or two pizzas, mix by hand.`,
  splitHint: `→ {nMix} mixes of {doughPerMix} g`,
} as const;

// --- end generated ---
