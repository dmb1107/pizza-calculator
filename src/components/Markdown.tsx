import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkLineBreaks } from '../lib/markdownBreaks';

/**
 * Markdown renderer for step details and concept bodies.
 *
 * §12 build order: "Render `detail` as markdown — it contains tables and
 * multi-paragraph prose." `remark-gfm` is what makes the tables work; without
 * it they render as literal pipe characters.
 *
 * Tables scroll inside their own container rather than widening the page —
 * `bulk-3` and `bake-2` both carry tables that do not fit a 375 px screen.
 *
 * Links open in a new tab. Raw HTML is never rendered: react-markdown shows
 * it as text unless a plugin is added to parse it, and none is. The topping
 * ideas (§13.2) pass `breaks`, so a single line break shows as one.
 */
export function Markdown({
  children,
  className = 'text-stone-700 dark:text-stone-300',
  breaks = false,
}: {
  children: string;
  /** The wrapper's classes. A warning passes its own so the text keeps the warning's tone. */
  className?: string;
  /** §13.2: keep single line breaks, as pasted from Apple Notes. Off for §8's prose. */
  breaks?: boolean;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={breaks ? [remarkGfm, remarkLineBreaks] : [remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-3 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900 dark:text-stone-100">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          table: ({ children }) => (
            <div className="my-3 -mx-1 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-stone-300 dark:border-stone-600">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-2 text-left align-top font-semibold text-stone-900 dark:text-stone-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-stone-200 px-2 py-2 align-top dark:border-stone-800">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-stone-200 px-1 py-0.5 font-mono text-[0.9em] dark:bg-stone-800">
              {children}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
