/**
 * Markdown to HTML for the portfolio (§15), on the server, where the page
 * runs no script.
 *
 * The same parse as the app's renderer (`src/components/Markdown.tsx` with
 * `breaks`): GFM, and a single line break kept as one (§13.2). The HTML is
 * written here from an allow-list, so this is the sanitizer as well: an
 * element not on the list is left out and its text kept; raw HTML in the
 * Markdown is dropped by `remark-rehype`, which is never told to keep it;
 * the only attribute written is a link's address, and only an http, https
 * or mailto one; every text and attribute is escaped.
 */

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { remarkLineBreaks } from '../src/lib/markdownBreaks';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const ELEMENTS: ReadonlySet<string> = new Set([
  'p', 'ul', 'ol', 'li', 'strong', 'em', 'del', 'a', 'br', 'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

const VOID: ReadonlySet<string> = new Set(['br']);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** A link address the page may carry: http, https or mailto, absolute. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const t = href.trim();
  return /^(https?:\/\/|mailto:)/i.test(t) ? t : null;
}

function serialize(node: HastNode): string {
  if (node.type === 'text') return escapeHtml(node.value ?? '');
  const inner = (node.children ?? []).map(serialize).join('');
  if (node.type !== 'element' || !node.tagName || !ELEMENTS.has(node.tagName)) return inner;
  const tag = node.tagName;
  if (VOID.has(tag)) return `<${tag}>`;
  if (tag === 'a') {
    const href = safeHref(node.properties?.['href']);
    return href === null ? inner : `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return `<${tag}>${inner}</${tag}>`;
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkLineBreaks).use(remarkRehype);

/** One of an idea's Markdown fields as safe HTML. */
export function markdownToHtml(markdown: string): string {
  const tree = processor.runSync(processor.parse(markdown)) as HastNode;
  return serialize(tree).trim();
}
