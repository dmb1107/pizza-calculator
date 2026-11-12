/**
 * §13.2 (APP-14, 14c): a topping idea's text field that formats as it is
 * typed. Bullets look like bullets, bold looks bold, links look like links;
 * the stored text is still Markdown, so the sync, the files and the cards
 * are unchanged.
 *
 * - In a list, Enter starts the next bullet, and Enter on an empty one ends
 *   the list. Pre-bake and Post-bake start with one bullet; Notes and
 *   Comments start empty.
 * - On a keyboard, Tab nests a bullet and Shift-Tab brings it back out;
 *   Cmd/Ctrl-B is bold and Cmd/Ctrl-K a link.
 * - On a phone, a toolbar under the field gives Bullet, Indent, Outdent,
 *   Bold and Link. Its buttons keep the keyboard up.
 *
 * Loaded only when an editor opens (`React.lazy` in `Toppings.tsx`), so the
 * rest of the app doesn't carry the editor's weight.
 */

import { Extension } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from './useMediaQuery';
import { linkHref, storedMarkdown } from '../lib/richText';

/** A list item, as the editor holds an empty one. */
const ONE_BULLET = {
  type: 'doc',
  content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }],
};

/** Cmd/Ctrl-K opens the field's link row; the field passes what to do. */
function linkShortcut(open: () => void) {
  return Extension.create({
    name: 'linkShortcut',
    addKeyboardShortcuts() {
      return {
        'Mod-k': () => {
          open();
          return true;
        },
      };
    },
  });
}

const toolButton =
  'grid min-h-touch flex-1 place-items-center rounded-md text-stone-800 active:bg-stone-100 aria-pressed:bg-amber-100 aria-pressed:text-amber-900 dark:text-stone-200 dark:active:bg-stone-800 dark:aria-pressed:bg-amber-950 dark:aria-pressed:text-amber-200';

function ToolButton({ label, pressed, onPress, children }: { label: string; pressed?: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      // Pressing a toolbar button mustn't take focus from the text, or the
      // keyboard drops and the selection goes with it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={toolButton}
    >
      {children}
    </button>
  );
}

const icon = (path: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

export default function RichField({
  label,
  value,
  onChange,
  startWithBullet,
}: {
  label: string;
  value: string;
  onChange: (markdown: string) => void;
  /** Pre-bake and Post-bake start with one bullet (14c). */
  startWithBullet: boolean;
}) {
  const [linking, setLinking] = useState(false);
  const [address, setAddress] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  // The toolbar is for a phone: a narrow screen or a finger.
  const touch = useMediaQuery('(max-width: 767px), (pointer: coarse)');

  const openLink = () => {
    setAddress(editorRef.current?.getAttributes('link')['href'] ?? '');
    setLinking(true);
  };
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // No empty line after a list: a tap below the last bullet lands in it.
        trailingNode: false,
        link: { openOnClick: false, autolink: true, protocols: ['mailto'] },
      }),
      Markdown.configure({ indentation: { style: 'space', size: 4 }, markedOptions: { breaks: true } }),
      linkShortcut(openLink),
    ],
    ...(value.trim() === '' && startWithBullet ? { content: ONE_BULLET } : { content: value, contentType: 'markdown' as const }),
    // Only an edit writes the field, so an idea opened and saved untouched
    // keeps its text exactly as it was.
    onUpdate: ({ editor: e }) => onChange(storedMarkdown(e.getMarkdown())),
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
        class:
          'rich-field min-h-[5.5rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/30 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100',
      },
    },
  });
  editorRef.current = editor;

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      inList: (e?.isActive('bulletList') || e?.isActive('orderedList')) ?? false,
    }),
  });

  // Focus anywhere in the field, toolbar and link row included, keeps the
  // toolbar. When focus leaves, the toolbar goes only once the tap that took
  // it has landed: gone at the press, everything under it would move up
  // before the release, and the tap would miss what it was aimed at. Chrome
  // moves focus during a tap; iOS keeps it in the field.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let pressing = false;
    const onDown = () => {
      pressing = true;
    };
    const stillOut = () => {
      if (!el.contains(document.activeElement)) setFocused(false);
    };
    const onUp = () => {
      pressing = false;
    };
    const onIn = () => setFocused(true);
    const onOut = (e: FocusEvent) => {
      if (el.contains(e.relatedTarget as Node | null)) return;
      document.addEventListener('click', () => setTimeout(stillOut, 0), { once: true, capture: true });
      // A press still down (a mouse held) waits for its release. Otherwise,
      // focus that left by a key, or a press that became a scroll, sends no
      // click, so the toolbar goes after a moment.
      if (pressing) document.addEventListener('pointerup', () => setTimeout(stillOut, 400), { once: true, capture: true });
      else setTimeout(stillOut, 400);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', onUp, true);
    el.addEventListener('focusin', onIn);
    el.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onUp, true);
      el.removeEventListener('focusin', onIn);
      el.removeEventListener('focusout', onOut);
    };
  }, []);
  useEffect(() => {
    if (linking) linkRef.current?.focus();
  }, [linking]);

  const addLink = () => {
    const href = linkHref(address);
    if (!editor) return;
    if (href === null) {
      editor.chain().extendMarkRange('link').unsetLink().run();
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      editor.chain().insertContent({ type: 'text', text: address.trim(), marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      editor.chain().extendMarkRange('link').setLink({ href }).run();
    }
    // The caret goes after the link, and the text gets focus back only after
    // the key that added it is done: given focus during it, the Enter would
    // reach the text too and replace what it had just linked.
    const end = editor.state.selection.to;
    editor.commands.setTextSelection(end);
    editor.commands.unsetMark('link', { extendEmptyMarkRange: false });
    // ProseMirror's own focus puts the selection back as it focuses; TipTap's
    // waits a frame on a phone, and the browser's caret can win meanwhile.
    setTimeout(() => {
      editor.commands.setTextSelection(end);
      editor.view.focus();
    }, 0);
    setLinking(false);
    setAddress('');
  };

  const labelId = `${label.toLowerCase().replace(/\W+/g, '-')}-label`;
  return (
    <div ref={wrapRef} className="grid gap-1.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="text-sm font-medium text-stone-700 dark:text-stone-300" onClick={() => editor?.commands.focus()}>
        {label}
      </span>
      <EditorContent editor={editor} />
      {touch && focused && editor && (
        <div role="toolbar" aria-label={`${label} formatting`} className="flex gap-1 rounded-lg border border-stone-300 bg-white p-1 dark:border-stone-600 dark:bg-stone-900">
          <ToolButton label="Bullet" pressed={state?.bullet ?? false} onPress={() => editor.chain().focus().toggleBulletList().run()}>
            {icon(
              <>
                <circle cx="5" cy="7" r="1.2" fill="currentColor" />
                <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                <circle cx="5" cy="17" r="1.2" fill="currentColor" />
                <path d="M10 7h10M10 12h10M10 17h10" />
              </>,
            )}
          </ToolButton>
          <ToolButton label="Indent" onPress={() => editor.chain().focus().sinkListItem('listItem').run()}>
            {icon(<path d="M4 6h16M11 12h9M11 18h9M4 10l3 2-3 2" />)}
          </ToolButton>
          <ToolButton label="Outdent" onPress={() => editor.chain().focus().liftListItem('listItem').run()}>
            {icon(<path d="M4 6h16M11 12h9M11 18h9M7 10l-3 2 3 2" />)}
          </ToolButton>
          <ToolButton label="Bold" pressed={state?.bold ?? false} onPress={() => editor.chain().focus().toggleBold().run()}>
            {icon(<path strokeWidth="2.4" d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" />)}
          </ToolButton>
          <ToolButton label="Link" onPress={openLink}>
            {icon(<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />)}
          </ToolButton>
        </div>
      )}
      {linking && (
        // Under the toolbar, so nothing covers the keyboard (14c).
        <div className="grid gap-2 rounded-lg border border-stone-300 p-2 dark:border-stone-600">
          <label className="grid gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
            Link address
            <input
              ref={linkRef}
              type="url"
              inputMode="url"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLink();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setLinking(false);
                }
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-touch rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            />
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={addLink} className="min-h-touch rounded-lg bg-amber-700 px-4 font-medium text-white active:bg-amber-800 dark:bg-amber-600">
              Add link
            </button>
            <button
              type="button"
              onClick={() => {
                setLinking(false);
                editor?.commands.focus();
              }}
              className="min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Read by screen readers only: the keys that work here. */}
      {!touch && state?.inList && <span className="sr-only">Tab nests the bullet; Shift-Tab brings it back out.</span>}
    </div>
  );
}
