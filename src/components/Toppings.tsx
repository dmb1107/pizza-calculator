import { useEffect, useId, useState, type FormEvent } from 'react';
import { Markdown } from './Markdown';
import { syncStatusText } from './BakeLog';
import { formatRating } from '../lib/format';
import {
  EMPTY_DRAFT,
  RATINGS,
  RATING_MAX,
  canRate,
  draftOf,
  ideaProblem,
  starParts,
  testedIdeas,
  untestedIdeas,
  type IdeaDraft,
  type IdeaProblem,
  type ToppingIdea,
} from '../lib/toppings';
import type { GitHubConfig } from '../state/repoSync';
import type { ToppingsState } from '../state/useToppings';

/**
 * §13.2 (APP-6, MESSAGE-70): the Toppings tab. Two lists, Tested and
 * Untested; each idea a card that opens to its three Markdown fields; an
 * editor for adding and changing one.
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

/** Rows enough for what is there, so a pasted note shows whole, within reason. */
const rowsFor = (text: string) => Math.min(14, Math.max(3, text.split('\n').length + 1));

const labelClass = 'grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300';
const inputClass =
  'rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100';

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={labelClass}>
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rowsFor(value)}
        className={`${inputClass} py-2 leading-relaxed`}
      />
    </label>
  );
}

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
    onDone(toppings.saveIdea(draft, idea?.id ?? null).id);
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
          className={`${inputClass} min-h-touch`}
        />
      </label>
      <TextArea label="Pre-bake" value={draft.pre_bake} onChange={(v) => set('pre_bake', v)} />
      <TextArea label="Post-bake" value={draft.post_bake} onChange={(v) => set('post_bake', v)} />
      <TextArea label="Notes" value={draft.notes} onChange={(v) => set('notes', v)} />
      <RatingControl value={draft.rating} refused={shownRefusal} onPick={pick} />

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
          <button type="submit" className={primaryClass}>
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
  const empty = [idea.pre_bake, idea.post_bake, idea.notes].every((t) => t.trim() === '');
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
              <Field label="Pre-bake" text={idea.pre_bake} />
              <Field label="Post-bake" text={idea.post_bake} />
              <Field label="Notes" text={idea.notes} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function ToppingsPage({ toppings, github }: { toppings: ToppingsState; github: GitHubConfig | null }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const tested = testedIdeas(toppings.ideas);
  const untested = untestedIdeas(toppings.ideas);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** After Save the idea stays open, and comes into view wherever its rating put it. */
  const done = (savedId: string | null) => {
    if (savedId === null) return;
    setOpenIds((prev) => new Set(prev).add(savedId));
    setJustSaved(savedId);
  };
  useEffect(() => {
    if (justSaved === null) return;
    document.getElementById(`idea-${justSaved}`)?.scrollIntoView({ block: 'nearest' });
    setJustSaved(null);
  }, [justSaved]);

  const list = (ideas: ToppingIdea[]) => (
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
          onDone={(savedId) => {
            setEditingId(null);
            done(savedId);
          }}
        />
      ))}
    </ul>
  );

  return (
    <div className="grid min-w-0 gap-6">
      {adding ? (
        <div className={`${cardClass} p-4`}>
          <IdeaEditor
            idea={null}
            toppings={toppings}
            onDone={(savedId) => {
              setAdding(false);
              done(savedId);
            }}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${primaryClass} justify-self-start`}>
          Add idea
        </button>
      )}

      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">Tested</h2>
        {tested.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">Nothing rated yet.</p>
        ) : (
          list(tested)
        )}
      </section>

      <section className="min-w-0">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">Untested</h2>
        {untested.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">Nothing waiting to be tried.</p>
        ) : (
          list(untested)
        )}
      </section>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        {github
          ? syncStatusText(github, toppings.sync, toppings.waiting, toppings.store.lastSyncedAt, 'the ideas')
          : 'Saved in this browser. Add a repository in the bake log to sync the ideas with your other devices.'}
      </p>
    </div>
  );
}
