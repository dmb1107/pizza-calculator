import { Drawer } from './Drawer';
import { Markdown } from './Markdown';
import { ABOUT_INTRO, REFERENCE, SOURCES } from '../content/reference';

/**
 * §9. "Put these on a secondary page or in a drawer — needed occasionally, not
 * every session." Rendered verbatim from the spec; every figure in them is
 * checked against the engine by the literal gate.
 */
export function ReferenceDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title="Reference" onClose={onClose}>
      <div className="grid gap-6">
        {REFERENCE.map((section) => (
          <section key={section.id} aria-labelledby={`ref-${section.id}`} className="min-w-0">
            <h3 id={`ref-${section.id}`} className="mb-2 text-lg font-semibold">
              {section.title}
            </h3>
            <Markdown>{section.body}</Markdown>
          </section>
        ))}
      </div>
    </Drawer>
  );
}

/** §11: "Link these from an About page." */
export function AboutDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title="About" onClose={onClose}>
      <p className="leading-relaxed text-stone-700 dark:text-stone-300">{ABOUT_INTRO}</p>
      <h3 className="mb-2 mt-5 text-lg font-semibold">Sources</h3>
      <ul className="grid gap-3">
        {SOURCES.map((source) => (
          <li key={source.url} className="leading-relaxed text-stone-700 dark:text-stone-300">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
            >
              {source.title}
            </a>{' '}
            — {source.note}
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
