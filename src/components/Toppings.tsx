import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMediaQuery } from './useMediaQuery';

// §13.2 (14c): the formatting editor loads only when an editor opens.
const RichField = lazy(() => import('./RichField'));
import { Markdown } from './Markdown';
import { usePhotoThumb, usePhotoUrl } from './usePhoto';
import { NotAPhotoError, shrinkPhoto } from '../state/photoImage';
import type { PhotoStore } from '../state/photoStore';
import { syncStatusText } from './BakeLog';
import { formatRating } from '../lib/format';
import {
  EMPTY_DRAFT,
  PORTFOLIO_HIDE_BELOW,
  RATINGS,
  RATING_MAX,
  canRate,
  draftOf,
  hiddenFromPortfolio,
  ideaProblem,
  starParts,
  toppingSections,
  type IdeaDraft,
  type IdeaProblem,
  type ToppingIdea,
} from '../lib/toppings';
import type { NewPhoto, ToppingsState } from '../state/useToppings';

/**
 * §13.2 (APP-6, MESSAGE-70): the Toppings tab. Two lists, Tested and
 * Untested; each idea a card that opens to its four Markdown fields; an
 * editor for adding and changing one; and above the lists, one control that
 * opens or closes every card (APP-7, MESSAGE-72). Each idea may have a
 * photo (APP-8, MESSAGE-73): a thumbnail on the closed card, full width on
 * the open one, added, replaced or removed in the editor.
 *
 * Everything that appears in response to a tap appears at or below it: the
 * editor takes the place of "Add idea", an idea's editor opens below its
 * heading where Edit was, and Delete's question takes the buttons' place.
 */

/** §13.2's rendered copy where the spec words it; the rest under the writing rules. */
const PROBLEM: Record<IdeaProblem, string> = {
  name: 'Give the idea a name.',
  preBake: 'Add the pre-bake toppings before rating it.',
};

const buttonClass =
  'min-h-touch rounded-lg border border-stone-300 bg-white px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:active:bg-stone-800';
const primaryClass =
  'min-h-touch rounded-lg bg-amber-700 px-4 font-medium text-white active:bg-amber-800 dark:bg-amber-600';
const cardClass = 'rounded-xl border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900';

// ---------------------------------------------------------------------------
// The rating, drawn
// ---------------------------------------------------------------------------

const STAR = 'M12 2.6l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.16l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z';

/** Five stars, a half drawn as a half. The number is for screen readers only (Dave, 11 Nov 2026). */
function Stars({ rating }: { rating: number }) {
  const clip = `half${useId().replace(/[^\w-]/g, '')}`;
  const { full, half } = starParts(rating);
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 text-amber-600 dark:text-amber-400">
      {Array.from({ length: RATING_MAX }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-[18px]">
          {i === full && half && (
            <clipPath id={clip}>
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          )}
          <path d={STAR} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          {i < full && <path d={STAR} fill="currentColor" />}
          {i === full && half && <path d={STAR} fill="currentColor" clipPath={`url(#${clip})`} />}
        </svg>
      ))}
    </span>
  );
}

function RatingShown({ rating }: { rating: number }) {
  return (
    <span role="img" className="inline-flex shrink-0 items-center" aria-label={`Rated ${formatRating(rating)} of ${RATING_MAX}`}>
      <Stars rating={rating} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------


const labelClass = 'grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300';
const inputClass =
  'rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100';

/**
 * §13.2: half steps from 1 to 5, every one a 48 px target, one tap to any
 * rating. Two rows of five at a phone's width, Clear last, which makes the
 * idea untested again. A rating picked while the pre-bake toppings are empty
 * is refused, and the message says why, under the control.
 */
function RatingControl({
  value,
  refused,
  onPick,
}: {
  value: number | null;
  refused: boolean;
  onPick: (rating: number | null) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">Rating</legend>
      <p className="mt-1 flex min-h-6 items-center text-stone-700 dark:text-stone-300">
        {value === null ? 'Untested' : <RatingShown rating={value} />}
      </p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={value === r}
            aria-label={`Rate ${formatRating(r)}`}
            onClick={() => onPick(r)}
            className={`min-h-touch rounded-lg border font-semibold tabular ${
              value === r
                ? 'border-amber-700 bg-amber-700 text-white dark:border-amber-500 dark:bg-amber-600'
                : 'border-stone-300 bg-white active:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:active:bg-stone-800'
            }`}
          >
            {formatRating(r)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPick(null)}
          className="min-h-touch rounded-lg border border-stone-300 bg-white text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:bg-stone-900 dark:active:bg-stone-800"
        >
          Clear
        </button>
      </div>
      {refused && (
        <p role="alert" className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          {PROBLEM.preBake}
        </p>
      )}
    </fieldset>
  );
}

/**
 * §13.2 (APP-8): the photo in the editor. A change waits for Save, like
 * every other field, so Cancel undoes it and Remove doesn't ask. A file that
 * can't be opened as a photo leaves things as they were and says so under
 * the buttons. Everything appears below the buttons or in the photo's own
 * box above them, which only ever shows the photo the buttons act on.
 */
function PhotoControl({
  photos,
  saved,
  pending,
  removed,
  name,
  onPick,
  onRemove,
  busy,
  setBusy,
}: {
  photos: PhotoStore;
  /** The idea's saved photo name, or null. */
  saved: string | null;
  pending: (NewPhoto & { url: string; width: number; height: number }) | null;
  removed: boolean;
  /** For screen readers: the idea's name. */
  name: string;
  onPick: (photo: (NewPhoto & { url: string; width: number; height: number }) | null) => void;
  onRemove: () => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  const shownSaved = pending === null && !removed ? saved : null;
  const has = pending !== null || shownSaved !== null;

  const picked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFailed(false);
    setBusy(true);
    try {
      const shrunk = await shrinkPhoto(file);
      onPick({ blob: shrunk.blob, sha256: shrunk.sha256, url: URL.createObjectURL(shrunk.blob), width: shrunk.width, height: shrunk.height });
    } catch (err) {
      if (err instanceof NotAPhotoError) setFailed(true);
      else throw err;
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">Photo</legend>
      {(pending !== null || shownSaved !== null) && (
        <div className="mt-2">
          {pending ? (
            <div className="aspect-square w-full overflow-hidden rounded-lg">
              <img src={pending.url} alt={name} className="block size-full object-cover" />
            </div>
          ) : (
            <FullPhoto photos={photos} name={shownSaved!} alt={name} />
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" onChange={picked} className="hidden" tabIndex={-1} />
      <div className="mt-2 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={buttonClass}>
          {has ? 'Replace photo' : 'Add photo'}
        </button>
        {has && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFailed(false);
              onRemove();
            }}
            className={buttonClass}
          >
            Remove photo
          </button>
        )}
      </div>
      {busy && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Preparing the photo…</p>}
      {failed && (
        <p role="alert" className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
          That file couldn't be opened as a photo.
        </p>
      )}
    </fieldset>
  );
}

/**
 * A stored photo at full width, in a square: a pizza is round, so a square
 * shows it whole (Dave, 11 Nov 2026). The box is square before the photo
 * arrives, so nothing under it moves when it does, and the photo loads
 * lazily, so Expand all doesn't decode every one at once.
 */
function FullPhoto({ photos, name, alt }: { photos: PhotoStore; name: string; alt: string }) {
  const url = usePhotoUrl(photos, name);
  return (
    <div className="aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
      {url && <img src={url} alt={alt} loading="lazy" decoding="async" className="block size-full object-cover" />}
    </div>
  );
}

/** The closed card's thumbnail: a fixed box, so the header's height doesn't wait on it. */
function Thumb({ photos, name }: { photos: PhotoStore; name: string }) {
  const thumb = usePhotoThumb(photos, name);
  return (
    // The full photo on the open card carries the name for screen readers;
    // here the header button already says it.
    <span aria-hidden="true" className="size-14 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
      {thumb && <img src={thumb.url} alt="" className="size-full object-cover" />}
    </span>
  );
}

function IdeaEditor({
  idea,
  toppings,
  onDone,
}: {
  /** The idea being changed, or null for a new one. */
  idea: ToppingIdea | null;
  toppings: ToppingsState;
  /** Closed: with the saved idea's id, or null after Cancel or Delete. */
  onDone: (savedId: string | null) => void;
}) {
  const [draft, setDraft] = useState<IdeaDraft>(() => (idea ? draftOf(idea) : EMPTY_DRAFT));
  const [refused, setRefused] = useState(false);
  const [problem, setProblem] = useState<IdeaProblem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // §13.2 (APP-8): the photo's change, applied on Save.
  const [pending, setPending] = useState<(NewPhoto & { url: string; width: number; height: number }) | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingUrl = useRef<string | null>(null);
  const replacePending = useCallback((next: typeof pending) => {
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    pendingUrl.current = next?.url ?? null;
    setPending(next);
  }, []);
  useEffect(() => () => void (pendingUrl.current && URL.revokeObjectURL(pendingUrl.current)), []);
  const set = <K extends keyof IdeaDraft>(key: K, value: IdeaDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pick = (rating: number | null) => {
    if (rating !== null && !canRate(draft)) {
      setRefused(true);
      return;
    }
    setRefused(false);
    set('rating', rating);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const found = ideaProblem(draft);
    if (found) {
      setProblem(found);
      return;
    }
    // Saving while a photo is still being prepared would leave it behind.
    if (busy) return;
    const photo = removed ? null : draft.photo;
    const newPhoto = pending ? { blob: pending.blob, sha256: pending.sha256 } : null;
    onDone(toppings.saveIdea({ ...draft, photo }, idea?.id ?? null, newPhoto).id);
  };

  // A message stays only while what it asks for is still missing.
  const shownProblem = problem !== null && ideaProblem(draft) === problem ? problem : null;
  const shownRefusal = refused && !canRate(draft);

  return (
    <form onSubmit={save} className="grid min-w-0 gap-4">
      <label className={labelClass}>
        Name
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          autoComplete="off"
          // 14e: each word capitalized as it's typed on a phone.
          autoCapitalize="words"
          className={`${inputClass} min-h-touch`}
        />
      </label>
      <DessertToggle on={draft.dessert} onChange={(v) => set('dessert', v)} />
      <Suspense fallback={<FieldsLoading />}>
        <RichField label="Pre-bake" value={draft.pre_bake} onChange={(v) => set('pre_bake', v)} startWithBullet />
        <RichField label="Post-bake" value={draft.post_bake} onChange={(v) => set('post_bake', v)} startWithBullet />
        <RichField label="Notes" value={draft.notes} onChange={(v) => set('notes', v)} startWithBullet={false} />
        <RichField label="Comments" value={draft.comments} onChange={(v) => set('comments', v)} startWithBullet={false} />
      </Suspense>
      <PhotoControl
        photos={toppings.photos}
        saved={draft.photo}
        pending={pending}
        removed={removed}
        name={draft.name.trim() || (idea?.name ?? '')}
        onPick={(p) => {
          replacePending(p);
          setRemoved(false);
        }}
        onRemove={() => {
          replacePending(null);
          setRemoved(true);
        }}
        busy={busy}
        setBusy={setBusy}
      />
      <RatingControl value={draft.rating} refused={shownRefusal} onPick={pick} />
      <PortfolioToggle
        hidden={hiddenFromPortfolio(draft)}
        onChange={(hide) => set('portfolio', hide ? 'hidden' : 'shown')}
      />

      {confirmingDelete && idea ? (
        // Takes the buttons' place and grows down; its Delete sits below the one tapped.
        <div role="alertdialog" aria-labelledby={`delete-${idea.id}`} className="rounded-lg border border-amber-400 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
          <p id={`delete-${idea.id}`} className="font-medium text-amber-950 dark:text-amber-100">
            {`Delete "${idea.name}"?`}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                toppings.deleteIdea(idea.id);
                onDone(null);
              }}
              className={primaryClass}
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className={buttonClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={`${primaryClass} disabled:opacity-60`}>
            Save
          </button>
          <button type="button" onClick={() => onDone(null)} className={buttonClass}>
            Cancel
          </button>
          {idea && (
            <button type="button" onClick={() => setConfirmingDelete(true)} className={`${buttonClass} ml-auto`}>
              Delete
            </button>
          )}
        </div>
      )}
      {shownProblem && (
        <p role="alert" className="-mt-1 text-sm font-medium text-amber-900 dark:text-amber-200">
          {PROBLEM[shownProblem]}
        </p>
      )}
    </form>
  );
}

/** §13.2 (14a): off for a new idea; on, the idea is listed under Dessert pizzas. */
function DessertToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-touch items-center justify-between gap-4 rounded-lg text-left"
    >
      <span>
        <span className="block font-medium">Dessert pizza</span>
        <span className="block text-sm text-stone-600 dark:text-stone-400">Lists it under Dessert pizzas.</span>
      </span>
      <SwitchTrack on={on} />
    </button>
  );
}

function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${on ? 'bg-amber-700 dark:bg-amber-600' : 'bg-stone-300 dark:bg-stone-600'}`}
    >
      <span className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-[left] ${on ? 'left-[22px]' : 'left-[2px]'}`} />
    </span>
  );
}

/**
 * §15 (APP-11, 11d): on hides the idea from the public portfolio. It follows
 * the rating, on below PORTFOLIO_HIDE_BELOW, until Dave sets it; from then on
 * his setting holds.
 */
function PortfolioToggle({ hidden, onChange }: { hidden: boolean; onChange: (hide: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={hidden}
      onClick={() => onChange(!hidden)}
      className="flex min-h-touch items-center justify-between gap-4 rounded-lg text-left"
    >
      <span>
        <span className="block font-medium">Hide from portfolio</span>
        <span className="block text-sm text-stone-600 dark:text-stone-400">
          {`On for a rating below ${PORTFOLIO_HIDE_BELOW} until you set it.`}
        </span>
      </span>
      <SwitchTrack on={hidden} />
    </button>
  );
}

/** The four fields' space while the editor loads, so nothing below them jumps. */
function FieldsLoading() {
  return (
    <div aria-hidden="true" className="grid gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-1.5">
          <span className="h-5 w-24 rounded bg-stone-200 dark:bg-stone-800" />
          <span className="h-[5.5rem] rounded-lg border border-stone-300 dark:border-stone-600" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The lists
// ---------------------------------------------------------------------------

function Field({ label, text }: { label: string; text: string }) {
  if (text.trim() === '') return null;
  return (
    <div className="min-w-0">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</h4>
      <Markdown breaks className="mt-1 text-stone-800 [overflow-wrap:anywhere] dark:text-stone-200">
        {text}
      </Markdown>
    </div>
  );
}

function IdeaCard({
  idea,
  open,
  editing,
  onToggle,
  onEdit,
  toppings,
  onDone,
}: {
  idea: ToppingIdea;
  open: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  toppings: ToppingsState;
  onDone: (savedId: string | null) => void;
}) {
  const bodyId = `idea-body-${idea.id}`;
  const shown = open || editing;
  const empty =
    idea.photo === null && [idea.pre_bake, idea.post_bake, idea.notes, idea.comments].every((t) => t.trim() === '');
  return (
    <li id={`idea-${idea.id}`} className={`${cardClass} min-w-0 scroll-mt-4 md:scroll-mt-20`}>
      {/* The header: the name with its stars under it, which opens the card,
          and once open, Edit at its right. The editor opens below the
          header, so it appears below the tap that asked for it. */}
      <div className="flex items-center">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={editing ? undefined : onToggle}
            aria-expanded={shown}
            aria-controls={bodyId}
            className="flex min-h-touch w-full items-start gap-3 py-3 pr-2 pl-4 text-left"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className={`mt-0.5 size-5 shrink-0 text-stone-500 transition-transform ${shown ? '' : '-rotate-90'}`}
            >
              <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold [overflow-wrap:anywhere]">{idea.name}</span>
              {idea.rating !== null && (
                <span className="mt-1 flex">
                  <RatingShown rating={idea.rating} />
                </span>
              )}
            </span>
            {/* §13.2 (APP-8): beside the name while closed; open, the photo is full width below. */}
            {!shown && idea.photo !== null && <Thumb photos={toppings.photos} name={idea.photo} />}
          </button>
        </h3>
        {open && !editing && (
          <button
            type="button"
            onClick={onEdit}
            className="mr-2 min-h-touch min-w-touch shrink-0 self-center rounded-lg px-3 font-semibold text-amber-800 active:bg-amber-50 dark:text-amber-400 dark:active:bg-stone-800"
          >
            Edit
          </button>
        )}
      </div>
      {shown && (
        <div id={bodyId} className="border-t border-stone-200 px-4 pt-3 pb-4 dark:border-stone-800">
          {editing ? (
            <IdeaEditor idea={idea} toppings={toppings} onDone={onDone} />
          ) : empty ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">Only a name so far.</p>
          ) : (
            <div className="grid gap-3">
              {idea.photo !== null && <FullPhoto photos={toppings.photos} name={idea.photo} alt={idea.name} />}
              <Field label="Pre-bake" text={idea.pre_bake} />
              <Field label="Post-bake" text={idea.post_bake} />
              <Field label="Notes" text={idea.notes} />
              <Field label="Comments" text={idea.comments} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** §13.2 (APP-14, 14b): from this width the ideas are a photo gallery with a panel at the right. */
export const GALLERY_QUERY = '(min-width: 1024px)';

const plusIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** The pre-bake toppings as plain items, for a tile with no photo. */
function preBakeItems(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*([*+-]|\d+[.)])\s+/, '').replace(/[*_`]/g, '').trim())
    .filter(Boolean);
}

/** §13.2 (14b): a gallery tile. The photo, square, or the pre-bake toppings in its place. */
function GalleryTile({
  idea,
  selected,
  photos,
  onOpen,
}: {
  idea: ToppingIdea;
  selected: boolean;
  photos: PhotoStore;
  onOpen: () => void;
}) {
  const items = preBakeItems(idea.pre_bake);
  return (
    <li id={`idea-${idea.id}`} className="min-w-0 scroll-mt-20">
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={selected}
        className="group grid w-full gap-2 text-left"
      >
        <span
          className={`block aspect-square w-full overflow-hidden rounded-xl border bg-white dark:bg-stone-900 ${
            selected ? 'border-amber-600 ring-3 ring-amber-600 dark:border-amber-500 dark:ring-amber-500' : 'border-stone-200 dark:border-stone-800'
          }`}
        >
          {idea.photo !== null ? (
            <TilePhoto photos={photos} name={idea.photo} />
          ) : (
            <span className="block p-3 text-sm text-stone-600 dark:text-stone-400">
              {items.length ? items.map((t, i) => <span key={i} className="block">{t}</span>) : 'Only a name so far.'}
            </span>
          )}
        </span>
        <span className="font-semibold leading-snug [overflow-wrap:anywhere] group-hover:underline">{idea.name}</span>
        {idea.rating !== null && <RatingShown rating={idea.rating} />}
      </button>
    </li>
  );
}

function TilePhoto({ photos, name }: { photos: PhotoStore; name: string }) {
  const url = usePhotoUrl(photos, name);
  return url ? <img src={url} alt="" loading="lazy" decoding="async" className="block size-full object-cover" /> : null;
}

/** §13.2 (14b): the open idea, at the right of the gallery. */
function IdeaPanel({
  idea,
  editing,
  toppings,
  onEdit,
  onClose,
  onDone,
}: {
  idea: ToppingIdea | null;
  editing: boolean;
  toppings: ToppingsState;
  onEdit: () => void;
  onClose: () => void;
  onDone: (savedId: string | null) => void;
}) {
  const label = idea ? idea.name : 'Add idea';
  return (
    <aside
      aria-label={label}
      className="fixed top-0 right-0 bottom-0 z-50 w-[min(440px,100vw)] overflow-y-auto border-l border-stone-300 bg-white p-5 shadow-2xl dark:border-stone-700 dark:bg-stone-900"
    >
      {editing ? (
        <IdeaEditor key={idea?.id ?? 'new'} idea={idea} toppings={toppings} onDone={onDone} />
      ) : idea ? (
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold [overflow-wrap:anywhere]">{idea.name}</h3>
              {idea.rating !== null && (
                <span className="mt-1 flex">
                  <RatingShown rating={idea.rating} />
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="min-h-touch min-w-touch shrink-0 rounded-lg px-3 font-semibold text-amber-800 active:bg-amber-50 dark:text-amber-400 dark:active:bg-stone-800"
            >
              Edit
            </button>
            <button type="button" onClick={onClose} className={`${buttonClass} shrink-0`}>
              Close
            </button>
          </div>
          {idea.photo !== null && <FullPhoto photos={toppings.photos} name={idea.photo} alt={idea.name} />}
          {idea.photo === null && [idea.pre_bake, idea.post_bake, idea.notes, idea.comments].every((t) => t.trim() === '') ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">Only a name so far.</p>
          ) : (
            <>
              <Field label="Pre-bake" text={idea.pre_bake} />
              <Field label="Post-bake" text={idea.post_bake} />
              <Field label="Notes" text={idea.notes} />
              <Field label="Comments" text={idea.comments} />
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}

const sectionHeadClass = 'mb-3 border-b border-stone-300 pb-1.5 text-xl font-semibold dark:border-stone-700';
const subHeadClass = 'mb-2 text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400';
const emptyClass = 'text-sm text-stone-600 dark:text-stone-400';

export function ToppingsPage({ toppings, signedIn }: { toppings: ToppingsState; signedIn: boolean }) {
  const gallery = useMediaQuery(GALLERY_QUERY);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The phone's open cards, and the gallery's open idea (14b).
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [panelId, setPanelId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  const sections = toppingSections(toppings.ideas);
  const panelIdea = panelId === null ? null : (toppings.ideas.find((i) => i.id === panelId) ?? null);
  // An idea deleted, here or by a sync, closes its panel.
  useEffect(() => {
    if (panelId !== null && panelIdea === null && !adding) setPanelId(null);
  }, [panelId, panelIdea, adding]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** After Save the idea stays open, and comes into view wherever its rating put it. */
  const done = (savedId: string | null) => {
    setAdding(false);
    setEditingId(null);
    if (savedId === null) return;
    setOpenIds((prev) => new Set(prev).add(savedId));
    setPanelId(savedId);
    setJustSaved(savedId);
  };
  useEffect(() => {
    if (justSaved === null) return;
    document.getElementById(`idea-${justSaved}`)?.scrollIntoView({ block: 'nearest' });
    setJustSaved(null);
  }, [justSaved]);

  // 14g: the floating button. On a phone the editor opens at the top of the
  // tab, and the page goes to it; in the gallery it opens in the panel.
  const add = () => {
    setEditingId(null);
    setPanelId(null);
    setAdding(true);
  };
  useEffect(() => {
    if (adding && !gallery) addRef.current?.scrollIntoView({ block: 'start' });
  }, [adding, gallery]);

  const closePanel = () => {
    setPanelId(null);
    setEditingId(null);
    setAdding(false);
  };
  const panelOpen = gallery && (adding || panelIdea !== null);
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || (document.activeElement as HTMLElement | null)?.isContentEditable)) closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  const cards = (ideas: ToppingIdea[]) => (
    <ul className="grid gap-2">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          open={openIds.has(idea.id)}
          editing={editingId === idea.id}
          onToggle={() => toggle(idea.id)}
          onEdit={() => setEditingId(idea.id)}
          toppings={toppings}
          onDone={done}
        />
      ))}
    </ul>
  );
  const tiles = (ideas: ToppingIdea[]) => (
    <ul className="grid grid-cols-4 gap-4 xl:grid-cols-5">
      {ideas.map((idea) => (
        <GalleryTile
          key={idea.id}
          idea={idea}
          selected={panelOpen && panelId === idea.id}
          photos={toppings.photos}
          onOpen={() => {
            setAdding(false);
            setEditingId(null);
            setPanelId(idea.id);
          }}
        />
      ))}
    </ul>
  );
  const list = gallery ? tiles : cards;

  const anyDessert = toppings.ideas.some((i) => i.dessert);
  const { untested } = sections;
  const untestedCount = untested.pizzas.length + untested.desserts.length;
  const bothUntested = untested.pizzas.length > 0 && untested.desserts.length > 0;
  const editorOpen = adding || editingId !== null;

  return (
    // The padding at the foot keeps the last idea clear of the floating button.
    <div className="grid min-w-0 content-start gap-8 pb-20">
      {adding && !gallery && (
        <div ref={addRef} className={`${cardClass} scroll-mt-4 p-4`}>
          <IdeaEditor idea={null} toppings={toppings} onDone={done} />
        </div>
      )}

      <section className="min-w-0" aria-labelledby="toppings-pizzas">
        <h2 id="toppings-pizzas" className={sectionHeadClass}>
          Pizzas
        </h2>
        {sections.pizzas.length ? list(sections.pizzas) : <p className={emptyClass}>Nothing rated yet.</p>}
      </section>

      <section className="min-w-0" aria-labelledby="toppings-desserts">
        <h2 id="toppings-desserts" className={sectionHeadClass}>
          Dessert pizzas
        </h2>
        {sections.desserts.length ? (
          list(sections.desserts)
        ) : (
          <p className={emptyClass}>{anyDessert ? 'Nothing rated yet.' : 'No dessert pizzas yet.'}</p>
        )}
      </section>

      <section className="min-w-0" aria-labelledby="toppings-untested">
        <h2 id="toppings-untested" className={sectionHeadClass}>
          Untested
        </h2>
        {untestedCount === 0 ? (
          <p className={emptyClass}>Nothing waiting to be tried.</p>
        ) : bothUntested ? (
          <div className="grid gap-6">
            <div className="min-w-0">
              <h3 className={subHeadClass}>Pizzas</h3>
              {list(untested.pizzas)}
            </div>
            <div className="min-w-0">
              <h3 className={subHeadClass}>Dessert pizzas</h3>
              {list(untested.desserts)}
            </div>
          </div>
        ) : (
          list(untested.pizzas.length ? untested.pizzas : untested.desserts)
        )}
      </section>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        {signedIn
          ? syncStatusText(toppings.sync, toppings.waiting, toppings.store.lastSyncedAt, 'the ideas')
          : 'Saved in this browser. Sign in on the Bake log tab to sync the ideas with your other devices.'}
      </p>

      {panelOpen && (
        <IdeaPanel
          idea={adding ? null : panelIdea}
          editing={adding || (panelIdea !== null && editingId === panelIdea.id)}
          toppings={toppings}
          onEdit={() => panelIdea && setEditingId(panelIdea.id)}
          onClose={closePanel}
          onDone={done}
        />
      )}

      {/* 14g: always in view; above the tab bar on a phone. Hidden while an
          editor or the panel is open, since each has its own way out. */}
      {!editorOpen && !panelOpen && (
        <button
          type="button"
          onClick={add}
          className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-amber-700 pr-6 pl-4 text-lg font-semibold text-white shadow-lg shadow-amber-900/30 active:bg-amber-800 md:bottom-6 lg:right-8 dark:bg-amber-600"
        >
          {plusIcon}
          Add idea
        </button>
      )}
    </div>
  );
}
