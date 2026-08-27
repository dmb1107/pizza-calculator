/**
 * URL query-param serialization — WEBSITE-SPEC-biga-calculator.md §2.
 *
 * "Inputs serialize to URL query params (shareable)." Only inputs: derived
 * values are recomputed, and calibration lives in localStorage because a
 * friction factor belongs to your mixer rather than to the recipe.
 *
 * Keys are short but readable — these links get pasted into messages and
 * sometimes read by a person.
 */

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
  bowlMassG: 'bowl',
  bowlState: 'bowlst',
  bowlTempF: 'bowlt',
  bigaFridgeH: 'fridge',
  bigaRoomOnlyH: 'bigart',
  temperH: 'temper',
  finalDoughTempF: 'dought',
} as const satisfies Record<keyof Inputs, string>;

const SCHEDULE_CODE: Record<Schedule, string> = { retarded: 'r', classic: 'c' };

/** §4.2 bowl states, abbreviated for the query string. */
const BOWL_STATE_CODE: Record<BowlState, string> = { cold: 'c', room: 'r', warm: 'w' };
const BOWL_STATE_BY_CODE: Record<string, BowlState> = { c: 'cold', r: 'room', w: 'warm' };

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
  put(KEYS.bigaTempF, num(inputs.bigaTempF), inputs.bigaTempF === DEFAULT_INPUTS.bigaTempF);

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
  put(KEYS.bowlMassG, num(inputs.bowlMassG), inputs.bowlMassG === DEFAULT_INPUTS.bowlMassG);
  put(
    KEYS.bowlState,
    BOWL_STATE_CODE[inputs.bowlState],
    inputs.bowlState === DEFAULT_INPUTS.bowlState,
  );
  // A measured bowl temperature is worth carrying: it overrides the selector.
  put(
    KEYS.bowlTempF,
    inputs.bowlTempF === null ? '' : num(inputs.bowlTempF),
    inputs.bowlTempF === null,
  );
  // A measured dough temperature belongs to one session, so it travels in the
  // link the same way the rest of the inputs do.
  put(
    KEYS.finalDoughTempF,
    inputs.finalDoughTempF === null ? '' : num(inputs.finalDoughTempF),
    inputs.finalDoughTempF === null,
  );

  return p.toString();
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

  return {
    balls: Math.round(readNumber(p, KEYS.balls, 'balls', base.balls)),
    ballWeightG: readNumber(p, KEYS.ballWeightG, 'ballWeightG', base.ballWeightG),
    coldFermentH: readNumber(p, KEYS.coldFermentH, 'coldFermentH', base.coldFermentH),
    schedule,
    roomTempF,
    flourSameAsRoom,
    // With the toggle on, the flour follows the room whatever the URL says.
    flourTempF: flourSameAsRoom
      ? roomTempF
      : readNumber(p, KEYS.flourTempF, 'flourTempF', base.flourTempF),
    bigaTempF: readNumber(p, KEYS.bigaTempF, 'bigaTempF', base.bigaTempF),
    bigaFridgeH: readNumber(p, KEYS.bigaFridgeH, 'bigaFridgeH', base.bigaFridgeH),
    bigaRoomOnlyH: readNumber(p, KEYS.bigaRoomOnlyH, 'bigaRoomOnlyH', base.bigaRoomOnlyH),
    temperH: readNumber(p, KEYS.temperH, 'temperH', base.temperH),
    bowlMassG: readNumber(p, KEYS.bowlMassG, 'bowlMassG', base.bowlMassG),
    bowlState: BOWL_STATE_BY_CODE[p.get(KEYS.bowlState) ?? ''] ?? base.bowlState,
    bowlTempF: readOptionalNumber(p, KEYS.bowlTempF, 'bowlTempF', base.bowlTempF),
    finalDoughTempF: readOptionalNumber(p, KEYS.finalDoughTempF, 'finalDoughTempF', base.finalDoughTempF),
  };
}

/** Whether a query string carries any input at all. */
export function hasInputs(search: string): boolean {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return Object.values(KEYS).some((k) => p.has(k));
}

export { KEYS as URL_KEYS, BOUNDS };
