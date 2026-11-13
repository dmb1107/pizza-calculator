/**
 * §15 *The portfolio* (APP-11): which ideas the public page lists, in what
 * order, and the only fields it may show. Pure, so the Worker (which builds
 * the page) and the tests read the same rules.
 *
 * Nothing private leaves through this: notes, comments, dates, the dessert
 * flag and the switch itself stay behind (11c).
 */

import { inPortfolio, testedIdeas, type ToppingIdea } from './toppings';

/** One pizza as the portfolio shows it: these fields and no others. */
export interface PortfolioPizza {
  id: string;
  name: string;
  pre_bake: string;
  post_bake: string;
  rating: number;
  photo: string;
}

/** Every key a `PortfolioPizza` has, for the tests that hold the page to it. */
export const PORTFOLIO_FIELDS: readonly (keyof PortfolioPizza)[] = ['id', 'name', 'pre_bake', 'post_bake', 'rating', 'photo'];

/**
 * The pizzas the portfolio lists: the pizzas, then the dessert pizzas
 * (Dave, 12 Nov 2026), each best first in §13.2's order for rated ideas
 * (highest rating, then most recently updated). `hasPhoto` says whether the photo an idea names is
 * in the repository: one that hasn't synced yet would show as a broken
 * image, so its idea waits.
 */
export function portfolioPizzas(ideas: readonly ToppingIdea[], hasPhoto: (photo: string) => boolean): PortfolioPizza[] {
  const listed = ideas.filter((i) => inPortfolio(i) && hasPhoto(i.photo!));
  const ordered = [...testedIdeas(listed.filter((i) => !i.dessert)), ...testedIdeas(listed.filter((i) => i.dessert))];
  return ordered.map((i) => ({
    id: i.id,
    name: i.name,
    pre_bake: i.pre_bake,
    post_bake: i.post_bake,
    rating: i.rating!,
    photo: i.photo!,
  }));
}

/**
 * A pizza's pre-bake toppings as one line, for its link preview: the
 * bullets' text joined with commas, with bold marks taken out.
 */
export function toppingsLine(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[*+-]|\d+[.)])\s+/, '').replace(/\*\*|__/g, '').trim())
    .filter((line) => line !== '')
    .join(', ');
}
