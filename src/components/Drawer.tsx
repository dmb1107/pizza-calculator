import { useEffect, type ReactNode } from 'react';

/**
 * The bottom sheet every secondary page opens in: concepts (§8.3), the §9
 * reference tables and the §11 About page. A drawer rather than a route keeps
 * the app free of a router, and with it the GitHub Pages basename problem.
 *
 * Escape closes it, and the page behind does not scroll while it is open.
 */
export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

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
        aria-label={title}
        className="relative max-h-[85vh] min-w-0 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:w-full sm:max-w-2xl sm:rounded-2xl dark:bg-stone-900"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch shrink-0 rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
