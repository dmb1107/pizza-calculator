/**
 * §13.2: the topping ideas' text fields are Markdown, rendered by the app's
 * renderer. A single line break shows as one; links open in a new tab; raw
 * HTML isn't rendered. §8's steps and concepts render exactly as before:
 * only the Toppings tab turns the line breaks on. (None of §8's 53 texts has a
 * single line break inside a paragraph today, so turning it on there would
 * change nothing yet; it stays off so a future one renders as Markdown does.)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseAst } from 'vite';
import { Markdown } from '../src/components/Markdown';

const html = (text: string, breaks = false) => renderToStaticMarkup(<Markdown breaks={breaks}>{text}</Markdown>);

// A trailing space before a line end, as a paste can leave; two would be a
// hard break in any Markdown.
const PASTED = 'San Marzano, crushed by hand\nFior di latte, torn \nSoppressata\n\nAfter: hot honey';

describe('§13.2 Markdown in the topping fields', () => {
  it('keeps a single line break, as Apple Notes shows it', () => {
    const out = html(PASTED, true);
    expect(out).toContain('San Marzano, crushed by hand<br/>\nFior di latte, torn<br/>\nSoppressata</p>');
    // A blank line is still a new paragraph.
    expect(out.match(/<p /g)).toHaveLength(2);
  });

  it('leaves code and lists alone', () => {
    expect(html('- one\n- two', true)).not.toContain('<br/>');
    expect(html('`a\nb`', true)).not.toContain('<br/>');
  });

  it('opens a link in a new tab, without a referrer or a handle on this page', () => {
    const out = html('Honey from [Mike’s](https://mikeshothoney.com).', true);
    expect(out).toContain('href="https://mikeshothoney.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    // A script address is dropped, not linked.
    expect(html('[x](javascript:alert(1))', true)).not.toContain('javascript:');
  });

  it('shows raw HTML as text and renders none of it', () => {
    const out = html('<b>bold</b> <img src=x onerror=alert(1)>\n<script>alert(1)</script>', true);
    expect(out).not.toMatch(/<b>|<img|<script/);
    expect(out).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });
});

describe('§8 prose renders as before', () => {
  it('joins single lines into one paragraph without `breaks`, as standard Markdown does', () => {
    expect(html(PASTED)).not.toContain('<br/>');
    expect(html(PASTED)).toContain('crushed by hand\nFior di latte, torn\nSoppressata</p>');
  });

  it('passes `breaks` only on the Toppings tab', () => {
    const users: string[] = [];
    for (const f of readdirSync('src/components')) {
      if (!f.endsWith('.tsx')) continue;
      let found = false;
      const visit = (node: unknown): void => {
        if (Array.isArray(node)) return node.forEach(visit);
        if (typeof node !== 'object' || node === null) return;
        const n = node as { type?: string; name?: { name?: unknown } };
        if (n.type === 'JSXAttribute' && n.name?.name === 'breaks') found = true;
        Object.values(node).forEach(visit);
      };
      visit(parseAst(readFileSync(`src/components/${f}`, 'utf8'), { lang: 'tsx' }));
      if (found) users.push(f);
    }
    expect(users).toEqual(['Toppings.tsx']);
  });
});
