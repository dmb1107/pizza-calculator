/**
 * §8.3: the concept links that sit outside the steps. Steps link through their
 * own `concepts` field; these three are the rest (MESSAGE-60, Dave's calls).
 * Named here, not inline in each component, so `concepts.test.ts` can require
 * that every concept is opened from somewhere and that each of these has a
 * reader in `src/components`.
 */
export const PAGE_CONCEPT_LINKS = {
  /** The Calibration panel, beside the friction factor. */
  calibration: 'friction-factor',
  /** The Batch panel's cold-ferment slider, where the length is chosen. */
  coldFerment: 'schedule-architecture',
  /** The ingredients card. */
  ingredients: 'formula-rationale',
} as const;
