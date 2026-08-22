/**
 * Timeline — WEBSITE-SPEC-biga-calculator.md §4.7.
 *
 * Pure: takes a start instant and durations, returns stages with clock times.
 * No `Date.now()` inside — `now` is passed in, so "which stage am I in" is
 * testable and doesn't drift between renders.
 *
 * All arithmetic is in absolute milliseconds rather than calendar fields. That
 * is deliberate and it is what makes daylight saving correct: 19 hours of
 * fermentation is 19 hours of real time whatever the clock does in the middle,
 * so the wall-clock time shown after a spring-forward is an hour later than
 * naive calendar addition would give. Fermentation follows the thermometer, not
 * the clock.
 */

import type { Schedule } from '../state/types';

export type StageKey =
  | 'bigaRoomTemp'
  | 'bigaFridge'
  | 'bigaRoomOnly'
  | 'bigaTemper'
  | 'mix'
  | 'bulkRest'
  | 'divideBall'
  | 'ballRoomTemp'
  | 'coldFerment'
  | 'temper';

export type StageDurations = Record<StageKey, number>;

/** Durations the user can move, with the ranges §4.7 allows. */
export interface ScheduleAdjustments {
  /** Retarded only. 18–20 h. */
  bigaFridgeH: number;
  /** Classic only. 12–18 h at 61–65 °F. */
  bigaRoomOnlyH: number;
  /**
   * Balls at room temperature, hours. **Computed, not chosen** — §4.8 derives
   * it from the measured final dough temperature. This replaced a fixed 1.5 h
   * with a 1–2 h range, which the model now overshoots at both ends: 71 min for
   * a warm dough, 144 min for a cold one.
   */
  ballRoomTempH: number;
  /** 6–36 h. */
  coldFermentH: number;
  /** 2–3 h. */
  temperH: number;
}

export const STAGE_ORDER: readonly StageKey[] = [
  'bigaRoomTemp',
  'bigaFridge',
  'bigaRoomOnly',
  'bigaTemper',
  'mix',
  'bulkRest',
  'divideBall',
  'ballRoomTemp',
  'coldFerment',
  'temper',
];

const STAGE_INFO: Record<StageKey, { title: string; description: string }> = {
  bigaRoomTemp: {
    title: 'Biga at room temperature',
    description: 'Gets fermentation started before the fridge takes over.',
  },
  bigaFridge: {
    title: 'Biga in the fridge',
    description: 'Holds it somewhere genuinely stable instead of wherever the room drifts.',
  },
  bigaRoomOnly: {
    title: 'Biga ferments',
    description: '61–65 °F. Pull at roughly 20% rise — it does not double.',
  },
  bigaTemper: {
    title: 'Biga out to temper',
    description: 'Out of the fridge before mixing. Probe it — this is the number the water calculation needs.',
  },
  mix: { title: 'Final mix', description: 'Phases A–D, including the 10-minute rest.' },
  bulkRest: { title: 'Bulk rest', description: 'Lightly oiled container. No folds.' },
  divideBall: {
    title: 'Divide and ball',
    description: 'Pre-round, rest 10–15 min, then ball tight.',
  },
  ballRoomTemp: {
    title: 'Balls at room temperature',
    description: 'On lightly oiled trays, lids on. Length set by the dough temperature you hit.',
  },
  coldFerment: {
    title: 'Cold ferment',
    description: '38–40 °F. Spread the trays out for the first 4 hours — do not stack.',
  },
  temper: {
    title: 'Temper',
    description: 'Target 60–65 °F at the core. Measure it, do not guess.',
  },
};

/** §4.7. Durations in hours from the biga mix at t = 0. */
export function stageDurations(schedule: Schedule, a: ScheduleAdjustments): StageDurations {
  const retarded = schedule === 'retarded';
  return {
    bigaRoomTemp: retarded ? 2 : 0,
    bigaFridge: retarded ? a.bigaFridgeH : 0,
    bigaRoomOnly: retarded ? 0 : a.bigaRoomOnlyH,
    bigaTemper: retarded ? 1 : 0,
    mix: 0.5,
    bulkRest: 1,
    divideBall: 0.33,
    ballRoomTemp: a.ballRoomTempH,
    coldFerment: a.coldFermentH,
    temper: a.temperH,
  };
}

export interface TimelineStage {
  key: StageKey;
  title: string;
  description: string;
  durationH: number;
  startsAt: Date;
  endsAt: Date;
  /**
   * The action that begins this stage falls between midnight and 06:00.
   *
   * §4.7 says to flag a stage that "lands" in the small hours. Read as the
   * whole stage, a 19-hour fridge rest would always qualify and the flag would
   * mean nothing. What actually makes a schedule unusable is having to get up
   * at 3 a.m. to do something, so the flag is on the moment work is required.
   */
  unsocialStart: boolean;
  /** `now` falls inside this stage. */
  current: boolean;
}

export interface Timeline {
  /** Stages in order, with zero-duration ones omitted. */
  stages: TimelineStage[];
  startsAt: Date;
  bakeAt: Date;
  totalH: number;
  bakeIsUnsocial: boolean;
  /** True when any required action lands between midnight and 06:00. */
  hasUnsocialHours: boolean;
}

const HOUR_MS = 3_600_000;

/** Between midnight and 06:00, local time. */
export function isUnsocialHour(at: Date): boolean {
  const h = at.getHours();
  return h >= 0 && h < 6;
}

export function buildTimeline({
  startAt,
  schedule,
  adjustments,
  now,
}: {
  /** When the biga gets mixed. t = 0. */
  startAt: Date;
  schedule: Schedule;
  adjustments: ScheduleAdjustments;
  /** Omit to skip "current stage" highlighting entirely. */
  now?: Date;
}): Timeline {
  const durations = stageDurations(schedule, adjustments);
  const stages: TimelineStage[] = [];

  let cursor = startAt.getTime();
  for (const key of STAGE_ORDER) {
    const durationH = durations[key];
    // A stage that doesn't apply to this schedule isn't a zero-length stage,
    // it's simply absent.
    if (durationH <= 0) continue;

    const startsAt = new Date(cursor);
    cursor += durationH * HOUR_MS;
    const endsAt = new Date(cursor);

    stages.push({
      key,
      ...STAGE_INFO[key],
      durationH,
      startsAt,
      endsAt,
      unsocialStart: isUnsocialHour(startsAt),
      current: now ? now >= startsAt && now < endsAt : false,
    });
  }

  const bakeAt = new Date(cursor);
  const bakeIsUnsocial = isUnsocialHour(bakeAt);

  return {
    stages,
    startsAt: startAt,
    bakeAt,
    totalH: (cursor - startAt.getTime()) / HOUR_MS,
    bakeIsUnsocial,
    hasUnsocialHours: bakeIsUnsocial || stages.some((s) => s.unsocialStart),
  };
}

/**
 * Backward mode (§4.7): when to mix the biga to bake at a given time.
 *
 * Exposed here because it is the same arithmetic; the UI for it is Task 8.
 */
export function solveBigaStart({
  bakeAt,
  schedule,
  adjustments,
}: {
  bakeAt: Date;
  schedule: Schedule;
  adjustments: ScheduleAdjustments;
}): Date {
  const durations = stageDurations(schedule, adjustments);
  const totalH = STAGE_ORDER.reduce((sum, key) => sum + Math.max(0, durations[key]), 0);
  return new Date(bakeAt.getTime() - totalH * HOUR_MS);
}

/** "2 h", "20 min", "1 h 30 min". */
export function formatDuration(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** "Sat 3:00 PM" — the weekday matters over a 52-hour schedule. */
export function formatClock(at: Date): string {
  return at.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Round up to the next quarter hour — a sensible default start. */
export function roundToNextQuarterHour(at: Date): Date {
  const out = new Date(at);
  out.setSeconds(0, 0);
  const remainder = out.getMinutes() % 15;
  if (remainder !== 0) out.setMinutes(out.getMinutes() + (15 - remainder));
  return out;
}

/** Local "YYYY-MM-DDTHH:mm" for an `<input type="datetime-local">`. */
export function toDatetimeLocal(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** Parse an `<input type="datetime-local">` value as local time. */
export function fromDatetimeLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date;
}
