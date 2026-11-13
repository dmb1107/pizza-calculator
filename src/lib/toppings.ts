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
   * Listed under Dessert pizzas (APP-14, 14a). Off by default; an idea saved
   * before APP-14 has none, and reads as off.
   */
  dessert: boolean;
  /**
   * Names the idea's photo file under `toppings/images/` (§13.3), and changes
   * with each new photo (APP-8): `photoName`. Null is no photo.
   */
  photo: string | null;
  /**
   * The "Hide from portfolio" switch (§15, APP-11, 11d). `follow` until Dave
   * sets the switch himself: hidden below `PORTFOLIO_HIDE_BELOW`, shown from
   * it. An idea saved before APP-11 has none, and reads as `follow`.
   */
  portfolio: PortfolioChoice;
  /** ISO instants, set by the app. */
  created: string;
  updated: string;
}

/** What the editor holds before Save. */
export type IdeaDraft = Pick<
  ToppingIdea,
  'name' | 'pre_bake' | 'post_bake' | 'notes' | 'comments' | 'rating' | 'photo' | 'dessert' | 'portfolio'
>;

export const EMPTY_DRAFT: IdeaDraft = {
  name: '',
  pre_bake: '',
  post_bake: '',
  notes: '',
  comments: '',
  rating: null,
  photo: null,
  dessert: false,
  portfolio: 'follow',
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

/**
 * §15 (APP-11, 11d): whether the idea is left out of the portfolio. `follow`
 * hides it below this rating and shows it from it; `hidden` and `shown` are
 * Dave's own setting, which holds whatever the rating does.
 */
export type PortfolioChoice = 'follow' | 'hidden' | 'shown';
export const PORTFOLIO_HIDE_BELOW = 3;

export function isPortfolioChoice(v: unknown): v is PortfolioChoice {
  return v === 'follow' || v === 'hidden' || v === 'shown';
}

/** The switch's position: on is hidden. An untested idea's rating is no rating, so `follow` leaves it off. */
export function hiddenFromPortfolio(idea: Pick<ToppingIdea, 'rating' | 'portfolio'>): boolean {
  if (idea.portfolio !== 'follow') return idea.portfolio === 'hidden';
  return idea.rating !== null && idea.rating < PORTFOLIO_HIDE_BELOW;
}

/** §15: rated, with a photo, and not hidden (11a, 11b, 11d). */
export function inPortfolio(idea: Pick<ToppingIdea, 'rating' | 'photo' | 'portfolio'>): boolean {
  return idea.rating !== null && idea.photo !== null && !hiddenFromPortfolio(idea);
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
    dessert: draft.dessert,
    portfolio: draft.portfolio,
    created: previous?.created ?? iso,
    updated: iso,
  };
}

/** The editor's draft for a saved idea. */
export function draftOf(idea: ToppingIdea): IdeaDraft {
  const { name, pre_bake, post_bake, notes, comments, rating, photo, dessert, portfolio } = idea;
  return { name, pre_bake, post_bake, notes, comments, rating, photo, dessert, portfolio };
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
 * §13.2 (APP-14, 14a and 14f): the tab's order, top to bottom. The rated
 * Pizzas, the rated Dessert pizzas, then everything untested, split by kind.
 * The page shows Untested's two kinds under their own small headings only
 * when both have ideas.
 */
export interface ToppingSections {
  pizzas: ToppingIdea[];
  desserts: ToppingIdea[];
  untested: { pizzas: ToppingIdea[]; desserts: ToppingIdea[] };
}

export function toppingSections(ideas: readonly ToppingIdea[]): ToppingSections {
  const pizzas = ideas.filter((i) => !i.dessert);
  const desserts = ideas.filter((i) => i.dessert);
  return {
    pizzas: testedIdeas(pizzas),
    desserts: testedIdeas(desserts),
    untested: { pizzas: untestedIdeas(pizzas), desserts: untestedIdeas(desserts) },
  };
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

// ---------------------------------------------------------------------------
// Reading an idea (§13.3)
// ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInstant = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * An idea as stored, or null if any part of it is malformed. A text field
 * left out reads as empty; one that isn't text, a rating §13.2 doesn't allow
 * or a missing date is malformed. A rated idea without pre-bake toppings is
 * read as it is: the editor asks for them, and a reader shouldn't hide an
 * idea for it.
 *
 * Keys this build doesn't know are kept, so a device on this build that saves
 * an idea doesn't strip a field a later build added (the way an APP-6 bundle
 * drops `comments`).
 */
export function parseIdea(raw: unknown): ToppingIdea | null {
  if (!isRecord(raw)) return null;
  const { id, name, rating, created, updated, photo, dessert, portfolio } = raw;
  // The id is a file name in the repository.
  if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  const text = (key: 'pre_bake' | 'post_bake' | 'notes' | 'comments') => {
    const v = raw[key];
    return v === undefined || v === null ? '' : typeof v === 'string' ? v : undefined;
  };
  const pre = text('pre_bake');
  const post = text('post_bake');
  const notes = text('notes');
  const comments = text('comments');
  if (pre === undefined || post === undefined || notes === undefined || comments === undefined) return null;
  if (!(rating === null || rating === undefined || isRating(rating))) return null;
  if (!isInstant(created) || !isInstant(updated)) return null;
  // §13.2: missing or null is no photo; anything else must be a safe file name.
  if (!(photo === undefined || photo === null || isPhotoName(photo))) return null;
  // APP-14: missing or null is a pizza; anything but a boolean is malformed.
  if (!(dessert === undefined || dessert === null || typeof dessert === 'boolean')) return null;
  // APP-11: missing or null follows the rating; anything else must be a choice.
  if (!(portfolio === undefined || portfolio === null || isPortfolioChoice(portfolio))) return null;
  const unknown = Object.fromEntries(Object.entries(raw).filter(([key]) => !IDEA_KEYS.has(key)));
  return {
    ...unknown,
    id,
    name,
    pre_bake: pre,
    post_bake: post,
    notes,
    comments,
    rating: rating ?? null,
    photo: photo ?? null,
    dessert: dessert ?? false,
    portfolio: portfolio ?? 'follow',
    created,
    updated,
  };
}

/** §13.2's fields: every key `parseIdea` reads. */
const IDEA_KEYS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'pre_bake',
  'post_bake',
  'notes',
  'comments',
  'rating',
  'photo',
  'dessert',
  'portfolio',
  'created',
  'updated',
]);
