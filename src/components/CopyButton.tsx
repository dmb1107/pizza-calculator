import { useCallback, useState } from 'react';

/**
 * Copy-to-clipboard button, used by the ingredients card (§7.1) and the share
 * control (§2).
 *
 * Two paths, because the modern one is not always available: `navigator.
 * clipboard` needs a secure context, and a phone pointed at a dev server over
 * `http://192.168.x.x` is not one. The `execCommand` path is deprecated but
 * works there, so it stands in rather than leaving the button dead.
 *
 * A failure reports itself. Saying "Copied" when nothing was copied is worse
 * than saying nothing.
 */
async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through — no permission, or not a secure context.
    }
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    // Off-screen, but not display:none — it has to be selectable.
    el.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label,
  copiedLabel = 'Copied',
}: {
  text: string;
  label: string;
  copiedLabel?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onClick = useCallback(() => {
    void copyText(text).then((ok) => {
      setState(ok ? 'copied' : 'failed');
      setTimeout(() => setState('idle'), 2000);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={onClick}
      // Announce the outcome to a screen reader without moving focus.
      aria-live="polite"
      className="min-h-touch shrink-0 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-700 active:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:active:bg-stone-800"
    >
      {state === 'copied' ? copiedLabel : state === 'failed' ? 'Copy failed' : label}
    </button>
  );
}
