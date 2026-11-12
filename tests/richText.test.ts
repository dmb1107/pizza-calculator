/**
 * §13.2 (APP-14, 14c): what a formatted field stores, and which link
 * addresses it takes. The editor itself runs in the browser; the WebKit
 * suite types into it.
 */
import { describe, expect, it } from 'vitest';
import { linkHref, storedMarkdown } from '../src/lib/richText';

describe('§13.2 a formatted field stores Markdown', () => {
  it('writes bullets as "*", at every depth, as ideas always have been', () => {
    expect(storedMarkdown('- Tomato sauce\n- Basil\n    - Torn, not cut')).toBe('* Tomato sauce\n* Basil\n    * Torn, not cut');
  });

  it('leaves numbered lists, text and a "-" inside a line alone', () => {
    expect(storedMarkdown('1. Whisk\n2. Heat to 180–190°F')).toBe('1. Whisk\n2. Heat to 180–190°F');
    expect(storedMarkdown('Salt - a pinch')).toBe('Salt - a pinch');
  });

  it('saves a field left at its first empty bullet as empty', () => {
    for (const empty of ['', '- ', '-', '* ', '- \n- ', '  ', '1. ']) expect(storedMarkdown(empty), JSON.stringify(empty)).toBe('');
  });

  it('drops whitespace at the end only', () => {
    expect(storedMarkdown('- Basil\n\n')).toBe('* Basil');
    expect(storedMarkdown('    - Nested first')).toBe('    * Nested first');
  });
});

describe('§13.2 the link row takes an address', () => {
  it('keeps http, https and mailto, and adds https to a bare address', () => {
    expect(linkHref('https://mikeshothoney.com')).toBe('https://mikeshothoney.com');
    expect(linkHref('http://example.com/a')).toBe('http://example.com/a');
    expect(linkHref('mailto:dave@example.com')).toBe('mailto:dave@example.com');
    expect(linkHref('  seriouseats.com/pizza ')).toBe('https://seriouseats.com/pizza');
  });

  it('refuses any other scheme, and an empty address removes the link', () => {
    expect(linkHref('javascript:alert(1)')).toBeNull();
    expect(linkHref('data:text/html,x')).toBeNull();
    expect(linkHref('   ')).toBeNull();
  });
});
