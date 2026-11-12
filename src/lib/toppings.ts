/**
 * §13.2 *Topping ideas* (APP-6, MESSAGE-70): an idea's fields, what it needs
 * before it saves, and the two lists. Pure, so the rules are tested here and
 * the Toppings tab only draws them.
 *
 * Nothing in the recipe's calculations reads an idea (§13.3).
 */

/**
 * §13.2's table. The four text fields are Markdown.
 *
 * An idea read from storage or the repository also carries, at run time, any
 * key this build doesn't know (`parseIdea` keeps them), and `savedIdea`
 * writes them back, so a field a later build adds survives an edit here.
 */
export interface ToppingIdea {
  /** Made when the idea is first saved; the file name in the repository. */
  id: string;
  /** Required on every idea (Dave, 9 Nov 2026). */
  name: string;
  /** Required once the idea is rated. */
  pre_bake: string;
  post_bake: string;
  /** Recipes for the toppings and advice for making the pizza. */
  notes: string;
  /** How the pizza tasted (APP-7). An idea saved without it has none. */
  comments: string;
  /** 1 to 5 in steps of 0.5; null is untested. */
  rating: number | null;
  /**
   * Names the idea's photo file under `toppings/images/` (§13.3), and changes
   * with each new photo (APP-8): `photoName`. Null is no photo.
   */
  photo: string | null;
  /** ISO instants, set by the app. */
  created: string;
  updated: string;
}

/** What the editor holds before Save. */
export type IdeaDraft = Pick<ToppingIdea, 'name' | 'pre_bake' | 'post_bake' | 'notes' | 'comments' | 'rating' | 'photo'>;

export const EMPTY_DRAFT: IdeaDraft = {
  name: '',
  pre_bake: '',
  post_bake: '',
  notes: '',
  comments: '',
  rating: null,
  photo: null,
};

/** §13.2: 1 to 5 in steps of 0.5. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

/** Every rating the control offers, lowest first: 1, 1.5, … 5. */
export const RATINGS: readonly number[] = Array.from(
  { length: (RATING_MAX - RATING_MIN) / RATING_STEP + 1 },
  (_, i) => RATING_MIN + i * RATING_STEP,
);

/** A rating §13.2 allows. Anything else is not a rating, so not an untested idea either. */
export function isRating(v: unknown): v is number {
  return typeof v === 'number' && RATINGS.includes(v);
}

const blank = (text: string) => text.trim() === '';

/**
 * §13.2: an untested idea needs only a name (Dave, 10 Nov 2026), so a
 * half-formed idea can be written down; a rated one needs its pre-bake
 * toppings too. Null when the draft saves.
 */
export type IdeaProblem = 'name' | 'preBake';

export function ideaProblem(draft: IdeaDraft): IdeaProblem | null {
  if (blank(draft.name)) return 'name';
  if (draft.rating !== null && blank(draft.pre_bake)) return 'preBake';
  return null;
}

/** §13.2: rating an idea needs its pre-bake toppings; the app asks for them first. */
export function canRate(draft: Pick<IdeaDraft, 'pre_bake'>): boolean {
  return !blank(draft.pre_bake);
}

/**
 * The idea a valid draft saves as. Text is kept as typed apart from the
 * whitespace at either end. `created` is the first save's and `updated` this
 * one's, both from `at`. Keys of the previous copy this build doesn't know
 * are kept.
 */
export function savedIdea(draft: IdeaDraft, previous: ToppingIdea | null, id: string, at: Date): ToppingIdea {
  const iso = at.toISOString();
  return {
    ...previous,
    id: previous?.id ?? id,
    name: draft.name.trim(),
    pre_bake: draft.pre_bake.trim(),
    post_bake: draft.post_bake.trim(),
    notes: draft.notes.trim(),
    comments: draft.comments.trim(),
    rating: draft.rating,
    photo: draft.photo,
    created: previous?.created ?? iso,
    updated: iso,
  };
}

/** The editor's draft for a saved idea. */
export function draftOf(idea: ToppingIdea): IdeaDraft {
  const { name, pre_bake, post_bake, notes, comments, rating, photo } = idea;
  return { name, pre_bake, post_bake, notes, comments, rating, photo };
}

/** A photo name: file-name safe, as an id is. */
export function isPhotoName(v: unknown): v is string {
  return typeof v === 'string' && /^[\w-]{1,120}$/.test(v);
}

/**
 * §13.2 `photo`: the idea's id and the first 12 hex characters of the JPEG's
 * SHA-256, so a new photo is a new name, and a copy of an idea always names
 * the file it was saved with (§13.3, "a photo follows its idea").
 */
export function photoName(ideaId: string, sha256Hex: string): string {
  return `${ideaId}-${sha256Hex.slice(0, 12)}`;
}

/**
 * Sortable and file-name safe, as a bake id is: the local date and time of
 * the first save, then four characters that keep two devices' ideas apart.
 */
export function newIdeaId(at: Date, suffix: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `${date}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}-${suffix}`;
}

const time = (iso: string) => Date.parse(iso);

/** §13.2 *Tested*: the rated ideas, highest rating first; ties, most recently updated first. */
export function testedIdeas(ideas: readonly ToppingIdea[]): ToppingIdea[] {
  return ideas
    .filter((i) => i.rating !== null)
    .sort((a, b) => b.rating! - a.rating! || time(b.updated) - time(a.updated) || (a.id < b.id ? 1 : -1));
}

/** §13.2 *Untested*: the unrated ideas, newest first. */
export function untestedIdeas(ideas: readonly ToppingIdea[]): ToppingIdea[] {
  return ideas
    .filter((i) => i.rating === null)
    .sort((a, b) => time(b.created) - time(a.created) || (a.id < b.id ? 1 : -1));
}

/**
 * §13.3: "the copy saved last wins". When an idea changed on two devices
 * since they last synced, the copy saved later is kept, by `updated`; on a
 * tie the device pushing keeps its own. A deletion has no time, so this is
 * never asked about one: between a deletion and an edit, the device that
 * syncs last wins.
 */
export function remoteIsNewer(remote: ToppingIdea, local: ToppingIdea): boolean {
  return time(remote.updated) > time(local.updated);
}

/**
 * How many of five stars are full and whether a half follows, for drawing a
 * rating: 3.5 is three full and a half.
 */
export function starParts(rating: number): { full: number; half: boolean } {
  return { full: Math.floor(rating), half: rating % 1 !== 0 };
}
