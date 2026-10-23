/**
 * What a number field does when it is left — the decision `NumberField`
 * makes on blur, kept here so a plain Node test reaches it.
 *
 * The raw text is held while typing and only parsed and clamped on leaving,
 * since clamping mid-type makes a bounded field unusable ("7" on the way to
 * "70" would snap to the minimum).
 *
 * §6 *Readings in the steps* (MESSAGE-58): **a typed reading counts, even when
 * it matches what the field shows.** The bowl field shows its prefill and the
 * final field shows DDT until read, and a real reading can land on either: a
 * bowl at the biga's temperature, a dough finished on target. Committing only
 * a changed value dropped those readings, so the mix saved as a prefill, or
 * with no final, and didn't count. A field that holds a reading
 * (`recordsReading`) therefore commits whenever its text was edited during
 * this focus. A focus and leave without an edit commits nothing, so a glance
 * at the bowl field can't turn its prefill, which is biased high, into a
 * reading.
 */
export interface FieldLeave {
  /** The text the field shows afterwards. */
  draft: string;
  /** The value to commit, or null to commit nothing. */
  commit: number | null;
}

export function leaveField(
  draft: string,
  value: number,
  { min, max, edited, recordsReading }: { min: number; max: number; edited: boolean; recordsReading: boolean },
): FieldLeave {
  const parsed = Number(draft);
  // An empty or unparseable field goes back to what it showed.
  if (draft.trim() === '' || !Number.isFinite(parsed)) return { draft: String(value), commit: null };
  const clamped = Math.min(max, Math.max(min, parsed));
  const commit = clamped !== value || (recordsReading && edited) ? clamped : null;
  return { draft: String(clamped), commit };
}
