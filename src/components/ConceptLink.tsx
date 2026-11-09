import { conceptById } from '../content/concepts';

/**
 * §7.5: a concept link reads "Read more: {title}", the concept's title and
 * never its id. A 48 px target, pinned with `self-start` so a flex parent
 * doesn't stretch it.
 */
export function ConceptLink({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="min-h-touch self-start rounded-lg border border-stone-300 px-3 text-left text-sm font-medium text-balance active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
    >
      Read more: {conceptById(id)?.title ?? id}
    </button>
  );
}
