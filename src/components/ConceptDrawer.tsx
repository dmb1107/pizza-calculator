import { useEffect } from 'react';
import { Markdown } from './Markdown';
import { conceptById } from '../content/concepts';

/**
 * §8.3 concepts, as a drawer.
 *
 * §8.3 allows "a drawer, modal, or /concepts/:id route". The drawer avoids
 * introducing a router, and with it the GitHub Pages basename problem.
 */
export function ConceptDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [id, onClose]);

  if (!id) return null;
  const concept = conceptById(id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={concept?.title ?? 'Concept'}
        className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl dark:bg-stone-900"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{concept?.title ?? 'Not found'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch shrink-0 rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
          >
            Close
          </button>
        </div>
        {concept ? (
          <Markdown>{concept.body}</Markdown>
        ) : (
          <p className="text-stone-600 dark:text-stone-400">No concept with id “{id}”.</p>
        )}
      </div>
    </div>
  );
}
