/**
 * URL query-param serialization — WEBSITE-SPEC-biga-calculator.md §2.
 *
 * "Inputs serialize to URL query params (shareable)." Only inputs: derived
 * values are recomputed, and the FF comes from the bake log, which belongs to
 * your mixer rather than to the recipe.
 *
 * Keys are short but readable — these links get pasted into messages and
 * sometimes read by a person.
 */

import { computeCapacity, computeFormula } from '../lib/engine';
import { BOUNDS, DEFAULT_INPUTS, clampField } from './defaults';
import type { BowlState, Inputs, Schedule } from './types';

const KEYS = {
  balls: 'balls',
  ballWeightG: 'ball',
  coldFermentH: 'cold',
  schedule: 'sched',
  roomTempF: 'room',
  flourSameAsRoom: 'flsame',
  flourTempF: 'flour',
  bigaTempF: 'biga',
  bowlState: 'bowlst',
  bowlTempF: 'bowlt',
  bigaFridgeH: 'fridge',
  bigaRoomOnlyH: 'bigart',
  temperH: 'temper',
  finalDoughTempF: 'dought',
  waterUsedF: 'water',
} as const satisfies Record<keyof Inputs, string>;

/** How many mixes the batch runs as — the length a by-index list is padded to. */
function nMixOf(inputs: Pick<Inputs, 'balls' | 'ballWeightG'>): number {
  return computeCapacity(computeFormula(inputs)).nMix;
}

/**
 * A by-index list (§4.8's final readings, §10's poured water), padded with
 * empties to `nMix`. Padding keeps "read mix 1 only" as `73~` on a two-mix
 * batch, which can't be mistaken for a bare value.
 */
function encodeIndexedList(values: readonly (number | null)[], nMix: number): string {
  const padded = Array.from({ length: Math.max(nMix, values.length) }, (_, i) => values[i] ?? null);
  return encodeList(padded);
}

const SCHEDULE_CODE: Record<Schedule, string> = { retarded: 'r', classic: 'c' };

/** §4.2 bowl states, abbreviated for the query string. */
const BOWL_STATE_CODE: Record<BowlState, string> = { cold: 'c', room: 'r', warm: 'w' };
const BOWL_STATE_BY_CODE: Record<string, BowlState> = { c: 'cold', r: 'room', w: 'warm' };

/**
 * §7. Per-mix values ride as a delimited list. A single value still decodes to
 * a length-1 array, so links shared before per-mix fields existed keep working
 * — and a shared split-batch link that silently dropped the mix-2 readings
 * would be worse than not having the field.
 */
const PER_MIX_SEP = '~';

function encodeList(values: readonly (number | null)[]): string {
  return values.map((v) => (v == null ? '' : num(v))).join(PER_MIX_SEP);
}

/** Trim trailing zeros so 70 serializes as "70" rather than "70.0". */
function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Encode inputs to a query string, omitting anything left at its default so a
 * lightly-customised link stays short.
 */
export function encodeInputs(inputs: Inputs): string {
  const p = new URLSearchParams();
  const put = (key: string, value: string, isDefault: boolean) => {
    if (!isDefault) p.set(key, value);
  };

  put(KEYS.balls, num(inputs.balls), inputs.balls === DEFAULT_INPUTS.balls);
  put(KEYS.ballWeightG, num(inputs.ballWeightG), inputs.ballWeightG === DEFAULT_INPUTS.ballWeightG);
  put(KEYS.coldFermentH, num(inputs.coldFermentH), inputs.coldFermentH === DEFAULT_INPUTS.coldFermentH);
  put(KEYS.schedule, SCHEDULE_CODE[inputs.schedule], inputs.schedule === DEFAULT_INPUTS.schedule);
  put(KEYS.roomTempF, num(inputs.roomTempF), inputs.roomTempF === DEFAULT_INPUTS.roomTempF);
  put(
    KEYS.flourSameAsRoom,
    inputs.flourSameAsRoom ? '1' : '0',
    inputs.flourSameAsRoom === DEFAULT_INPUTS.flourSameAsRoom,
  );
  // A flour temperature that only tracks the room carries no information.
  put(KEYS.flourTempF, num(inputs.flourTempF), inputs.flourSameAsRoom);
  put(
    KEYS.bigaTempF,
    encodeList(inputs.bigaTempF),
    sameList(inputs.bigaTempF, DEFAULT_INPUTS.bigaTempF),
  );

  // Both schedules' adjustments are carried even though only one is in use.
  // Dropping the inactive one would save a few characters at the cost of a
  // lossless round-trip: set the fridge to 18.5, switch to classic, reload, and
  // the 18.5 would be gone.
  put(KEYS.bigaFridgeH, num(inputs.bigaFridgeH), inputs.bigaFridgeH === DEFAULT_INPUTS.bigaFridgeH);
  put(
    KEYS.bigaRoomOnlyH,
    num(inputs.bigaRoomOnlyH),
    inputs.bigaRoomOnlyH === DEFAULT_INPUTS.bigaRoomOnlyH,
  );
  put(KEYS.temperH, num(inputs.temperH), inputs.temperH === DEFAULT_INPUTS.temperH);
  put(
    KEYS.bowlState,
    BOWL_STATE_CODE[inputs.bowlState],
    inputs.bowlState === DEFAULT_INPUTS.bowlState,
  );
  // Measured bowl temperatures override the selector, so they travel too.
  put(
    KEYS.bowlTempF,
    encodeList(inputs.bowlTempF),
    inputs.bowlTempF.every((v) => v == null),
  );
  // Measured dough and water temperatures belong to one session, so they
  // travel in the link the same way the rest of the inputs do. By index, and
  // padded, so an unread mix stays unread on the other end.
  const nMix = nMixOf(inputs);
  put(
    KEYS.finalDoughTempF,
    encodeIndexedList(inputs.finalDoughTempF, nMix),
    inputs.finalDoughTempF.every((v) => v == null),
  );
  put(KEYS.waterUsedF, encodeIndexedList(inputs.waterUsedF, nMix), inputs.waterUsedF.every((v) => v == null));

  return p.toString();
}

/** True when two per-mix lists carry the same values. */
function sameList(a: readonly (number | null)[], b: readonly (number | null)[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * §7. Decode a delimited per-mix list, clamping each entry. A bare value with
 * no delimiter yields a length-1 array, which is how pre-per-mix links open.
 * Garbage entries fall back rather than propagating NaN into the engine.
 */
function readNumberList(
  p: URLSearchParams,
  key: string,
  field: Parameters<typeof clampField>[0],
  fallback: number[],
): number[] {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const parts = raw.split(PER_MIX_SEP).map((piece, i) => {
    const parsed = Number(piece);
    if (piece.trim() === '' || !Number.isFinite(parsed)) return fallback[i] ?? fallback[0]!;
    return clampField(field, parsed);
  });
  return parts.length ? parts : fallback;
}

/** As `readNumberList`, but an empty entry means "no measurement" rather than a fallback. */
function readOptionalNumberList(
  p: URLSearchParams,
  key: string,
  field: Parameters<typeof clampField>[0],
  fallback: (number | null)[],
): (number | null)[] {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const parts = raw.split(PER_MIX_SEP).map((piece) => {
    if (piece.trim() === '') return null;
    const parsed = Number(piece);
    if (!Number.isFinite(parsed)) return null;
    return clampField(field, parsed);
  });
  return parts.length ? parts : fallback;
}

function readNumber(
  p: URLSearchParams,
  key: string,
  field: Parameters<typeof clampField>[0],
  fallback: number,
): number {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  // Reject garbage rather than propagating NaN into the engine.
  if (!Number.isFinite(parsed)) return fallback;
  return clampField(field, parsed);
}

/**
 * A by-index list. A bare value with no delimiter is a link from before §4.8
 * read each mix: it was the batch's one reading, so it applies to every mix
 * and the rise it times is unchanged.
 */
function readIndexedList(
  p: URLSearchParams,
  key: string,
  field: Parameters<typeof clampField>[0],
  nMix: number,
  fallback: (number | null)[],
): (number | null)[] {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  if (!raw.includes(PER_MIX_SEP)) {
    const one = readOptionalNumber(p, key, field, null);
    return one === null ? fallback : Array.from({ length: nMix }, () => one);
  }
  return readOptionalNumberList(p, key, field, fallback);
}

/** Like readNumber, but absence means "not measured yet" rather than a default. */
function readOptionalNumber(
  p: URLSearchParams,
  key: string,
  field: Parameters<typeof clampField>[0],
  fallback: number | null,
): number | null {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clampField(field, parsed);
}

/**
 * Decode a query string into inputs, falling back to `base` per key.
 *
 * Every value is validated and clamped: a hand-edited or truncated link must
 * not be able to push NaN or an out-of-range number into the calculation.
 */
export function decodeInputs(search: string, base: Inputs = DEFAULT_INPUTS): Inputs {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const scheduleRaw = p.get(KEYS.schedule);
  const schedule: Schedule =
    scheduleRaw === 'c' ? 'classic' : scheduleRaw === 'r' ? 'retarded' : base.schedule;

  const sameRaw = p.get(KEYS.flourSameAsRoom);
  const flourSameAsRoom = sameRaw === null ? base.flourSameAsRoom : sameRaw !== '0';

  const roomTempF = readNumber(p, KEYS.roomTempF, 'roomTempF', base.roomTempF);
  const balls = Math.round(readNumber(p, KEYS.balls, 'balls', base.balls));
  const ballWeightG = readNumber(p, KEYS.ballWeightG, 'ballWeightG', base.ballWeightG);
  const nMix = nMixOf({ balls, ballWeightG });

  return {
    balls,
    ballWeightG,
    coldFermentH: readNumber(p, KEYS.coldFermentH, 'coldFermentH', base.coldFermentH),
    schedule,
    roomTempF,
    flourSameAsRoom,
    // With the toggle on, the flour follows the room whatever the URL says.
    flourTempF: flourSameAsRoom
      ? roomTempF
      : readNumber(p, KEYS.flourTempF, 'flourTempF', base.flourTempF),
    bigaTempF: readNumberList(p, KEYS.bigaTempF, 'bigaTempF', base.bigaTempF),
    bigaFridgeH: readNumber(p, KEYS.bigaFridgeH, 'bigaFridgeH', base.bigaFridgeH),
    bigaRoomOnlyH: readNumber(p, KEYS.bigaRoomOnlyH, 'bigaRoomOnlyH', base.bigaRoomOnlyH),
    temperH: readNumber(p, KEYS.temperH, 'temperH', base.temperH),
    bowlState: BOWL_STATE_BY_CODE[p.get(KEYS.bowlState) ?? ''] ?? base.bowlState,
    bowlTempF: readOptionalNumberList(p, KEYS.bowlTempF, 'bowlTempF', base.bowlTempF),
    finalDoughTempF: readIndexedList(p, KEYS.finalDoughTempF, 'finalDoughTempF', nMix, base.finalDoughTempF),
    waterUsedF: readIndexedList(p, KEYS.waterUsedF, 'waterUsedF', nMix, base.waterUsedF),
  };
}

/** Whether a query string carries any input at all. */
export function hasInputs(search: string): boolean {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return Object.values(KEYS).some((k) => p.has(k));
}

export { KEYS as URL_KEYS, BOUNDS };
