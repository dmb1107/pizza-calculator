/**
 * §13.2 (APP-14, 14c): the Markdown a formatted field stores.
 *
 * The editor writes bullets as "- "; ideas have always been written with
 * "* ", so an edit keeps that style and a file's diff shows only what was
 * changed. A field holding nothing but empty bullets is empty.
 */
export function storedMarkdown(markdown: string): string {
  const bullets = markdown.replace(/^(\s*)- /gm, '$1* ');
  // Only list markers and whitespace: the field was left at its first bullet.
  if (bullets.replace(/^\s*(?:[*+-]|\d+[.)])?\s*$/gm, '').trim() === '') return '';
  return bullets.replace(/\s+$/, '');
}

/** A typed address as a link: http, https or mailto, nothing else. Null removes the link. */
export function linkHref(text: string): string | null {
  const t = text.trim();
  if (t === '') return null;
  if (/^(https?:\/\/|mailto:)/i.test(t)) return t;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return null;
  return `https://${t}`;
}
