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

import { C } from './constants';
import { MIX_H, plannedBallRiseH } from './engine';
import type { Schedule, TimelineMode } from '../state/types';

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
   * with a 1–2 h range, which the model overshoots at both ends: under an hour
   * from about 3.3 °F over DDT, over two from about 2.9 °F under, clamped to
   * 45–180 min. It depends only on the offset from DDT, never on the dough
   * temperature alone.
   */
  ballRoomTempH: number;
  /**
   * §4.7. Mixes this batch runs as. `mix` scales with it, and it staggers the
   * bulk clock — see `stageDurations`.
   */
  nMix: number;
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

/**
 * §4.7 (MESSAGE-31). Four stages last a planning point inside a range the
 * recipe reasons for. The timeline needs one number to put a clock time on a
 * stage, so it uses the point; nothing the baker reads collapses the range
 * (§7.4, §7.5). Hours, low to high.
 */
export const PLANNING_RANGE_H: Partial<Record<StageKey, readonly [number, number]>> = {
  bigaFridge: [18, 20],
  // The Giorilli window. The input allows 12–18 (§4.7); §7.5's classic
  // exception covers a plan outside this.
  bigaRoomOnly: [16, 18],
  bulkRest: [45 / 60, 1],
  temper: [2, 3],
};

/** The planning point's range, if `hours` lies inside it — §7.4 shows it beside the point. */
export function planningRangeFor(key: StageKey, hours: number): readonly [number, number] | undefined {
  const range = PLANNING_RANGE_H[key];
  return range && hours >= range[0] && hours <= range[1] ? range : undefined;
}

export const STAGE_INFO: Record<StageKey, { title: string; description: string }> = {
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
    // By the OFFSET from DDT, not the thermometer reading alone (MESSAGE-21/23):
    // §4.8's rise depends only on `T_actual − DDT`.
    description: 'On lightly oiled trays, lids on. Length set by how far the dough landed from DDT.',
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

/**
 * §4.7. Durations in hours from the biga mix at t = 0.
 *
 * ⚠️ Two things here are `nMix`-dependent, and both were flat before:
 *
 * `mix` scales with the number of mixes plus a changeover between them. A
 * 12-ball batch runs two mixes back to back and the timeline used to count one.
 *
 * `ballRoomTemp` loses half the stagger. Dave bulks both doughs in ONE
 * container, so the batch runs on a single clock while mix 1's dough is
 * genuinely 35 minutes further along. Clocking `bulkRest` from the last mix
 * (which `buildTimeline` does by including the full `mix` span) is the only
 * anchor that gives mix 2 any bulk at all; subtracting half the stagger from
 * the ball rise then centres the remaining error at ±17.5 min instead of
 * leaving all 35 on one dough.
 *
 * ⚠️ This CENTRES the spread, it does not remove it. One clock cannot do
 * better, and a user who reads it as making the batch uniform will draw the
 * wrong conclusion from a bad result — §8 `bulk-3` says so in the prose.
 */
export function stageDurations(schedule: Schedule, a: ScheduleAdjustments): StageDurations {
  const retarded = schedule === 'retarded';
  const nMix = Math.max(1, a.nMix);

  return {
    bigaRoomTemp: retarded ? 2 : 0,
    bigaFridge: retarded ? a.bigaFridgeH : 0,
    bigaRoomOnly: retarded ? 0 : a.bigaRoomOnlyH,
    bigaTemper: retarded ? C.BIGA_TEMPER_H : 0,
    mix: MIX_H * nMix + C.CHANGEOVER_H * (nMix - 1),
    bulkRest: 1,
    divideBall: C.DIVIDE_BALL_H,
    ballRoomTemp: plannedBallRiseH(a.ballRoomTempH * 60, nMix),
    coldFerment: a.coldFermentH,
    temper: a.temperH,
  };
}

export interface TimelineStage {
  key: StageKey;
  title: string;
  description: string;
  durationH: number;
  /**
   * §7.4: the recipe's range when `durationH` is a planning point inside it,
   * shown beside the point. Absent for a stage with no range, or a plan the
   * baker has moved outside it (§7.5's classic exception).
   */
  range?: readonly [number, number];
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

/**
 * A stage's length in whole milliseconds. `Date` truncates fractional
 * milliseconds, so accumulating `hours × HOUR_MS` directly let a backward solve
 * land 1 ms before the requested bake whenever a duration wasn't a whole number
 * of minutes (a measured rise is 80.41 min) — and the clock then printed the
 * minute before. Both directions go through this, so they are exact inverses.
 */
function stageMs(hours: number): number {
  return Math.round(hours * HOUR_MS);
}

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
    cursor += stageMs(durationH);
    const endsAt = new Date(cursor);

    stages.push({
      key,
      ...STAGE_INFO[key],
      durationH,
      range: planningRangeFor(key, durationH),
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
 * ⚠️ This is a sum, and a sum can't see order — it returns the right start for
 * a mis-ordered schedule. The stage times in between come from `buildTimeline`
 * walking `STAGE_ORDER`, which `timeline.test.ts` pins to hand-written clock
 * times on both schedules (MESSAGE-12).
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
  const totalMs = STAGE_ORDER.reduce((sum, key) => sum + (durations[key] > 0 ? stageMs(durations[key]) : 0), 0);
  return new Date(bakeAt.getTime() - totalMs);
}

/**
 * §4.7's two modes. Forward holds the biga start and lets the bake fall where
 * it falls; backward holds the bake and solves the start. Either way the stage
 * times come from the same forward walk, so the modes differ only in which end
 * stays put when a duration changes.
 */
export function timelineFor({
  mode,
  bigaStartAt,
  bakeAt,
  schedule,
  adjustments,
  now,
}: {
  mode: TimelineMode;
  bigaStartAt: Date;
  /** Backward mode's anchor. Null falls back to forward — there is nothing to hold. */
  bakeAt: Date | null;
  schedule: Schedule;
  adjustments: ScheduleAdjustments;
  now?: Date;
}): Timeline {
  const startAt =
    mode === 'backward' && bakeAt ? solveBigaStart({ bakeAt, schedule, adjustments }) : bigaStartAt;
  return buildTimeline({ startAt, schedule, adjustments, now });
}

/** A run of anchor times, on one day, that keeps every required action out of 00:00–06:00. */
export interface ClockWindow {
  from: Date;
  /** Inclusive: the last quarter hour that still works. */
  to: Date;
}

/**
 * §4.7: "flag when a stage lands between midnight and 6 AM". This is the other
 * half — which start times (forward) or bake times (backward) avoid it, for the
 * durations in hand. Scanned at quarter hours across `day`, so a boundary is
 * reported on the safe side.
 *
 * Computed because it moves: at the default 24 h cold ferment the retarded
 * schedule's window is 9:00 AM–8:00 PM, the classic one's 2:00 PM–11:45 PM,
 * and 12 h classic has two. The card used to print "9 a.m. and 8 p.m." for all
 * of them.
 *
 * No window can run through midnight: the anchor is itself an action — the
 * biga going in, or the bake — so 00:00–05:45 never works. An empty array
 * means no time on this day does.
 */
export function socialWindows({
  mode,
  day,
  schedule,
  adjustments,
}: {
  mode: TimelineMode;
  day: Date;
  schedule: Schedule;
  adjustments: ScheduleAdjustments;
}): ClockWindow[] {
  const QUARTERS = 96;
  const at = (q: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, q * 15);
  const works = Array.from({ length: QUARTERS }, (_, q) => {
    const anchor = at(q);
    const t = timelineFor({ mode, bigaStartAt: anchor, bakeAt: anchor, schedule, adjustments });
    return !t.hasUnsocialHours;
  });
  const windows: ClockWindow[] = [];
  let runStart: number | null = null;
  for (let q = 0; q <= QUARTERS; q++) {
    const ok = q < QUARTERS && works[q]!;
    if (ok && runStart === null) runStart = q;
    if (!ok && runStart !== null) {
      windows.push({ from: at(runStart), to: at(q - 1) });
      runStart = null;
    }
  }
  return windows;
}

/** "9:00 AM" — a time of day with no weekday, for window boundaries. */
export function formatTimeOfDay(at: Date): string {
  return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * The sentence under the overnight notice. The windows come from
 * `socialWindows`; this only words them.
 */
export function socialWindowPhrase(windows: ClockWindow[], mode: TimelineMode): string {
  const subject = mode === 'forward' ? 'Starting the biga' : 'Baking';
  const noun = mode === 'forward' ? 'start' : 'bake';
  if (windows.length === 0) {
    return `With these durations no ${noun} time keeps every step out of the small hours.`;
  }
  const spans = windows.map(({ from, to }) =>
    from.getTime() === to.getTime()
      ? `at ${formatTimeOfDay(from)}`
      : `between ${formatTimeOfDay(from)} and ${formatTimeOfDay(to)}`,
  );
  return `${subject} ${spans.join(' or ')} keeps every step out of the small hours.`;
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

/**
 * §7.4: the planning point, then the recipe's range beside it — "19 h (18–20)".
 * The range's unit is left off only when the point already reads in it, so
 * "1 h (45–60 min)" and "2 h 30 min (2–3 h)" can't be misread.
 */
export function formatStageDuration(hours: number, range?: readonly [number, number]): string {
  const point = formatDuration(hours);
  if (!range) return point;
  const [lo, hi] = range;
  const inHours = Number.isInteger(lo) && Number.isInteger(hi);
  const unit = inHours ? 'h' : 'min';
  const span = inHours ? `${lo}–${hi}` : `${Math.round(lo * 60)}–${Math.round(hi * 60)}`;
  const pointIsOneUnit = !point.includes(' h ') && point.endsWith(` ${unit}`);
  return `${point} (${span}${pointIsOneUnit ? '' : ` ${unit}`})`;
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
