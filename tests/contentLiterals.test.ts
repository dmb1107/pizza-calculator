import { describe, expect, it } from 'vitest';
import { STEPS, type Step } from '../src/content/steps';
import { CONCEPTS } from '../src/content/concepts';
import { ABOUT_INTRO, REFERENCE, SOURCES } from '../src/content/reference';
import { CAPACITY } from '../src/content/capacity';
import { NEAR_LIMIT_FRACTION } from '../src/lib/capacity';
import { C, bowlHeatCapacity, defaultDdtF, rpmForDial } from '../src/lib/constants';
import {
  calculate,
  computeCapacity,
  computeFormula,
  computeProbeTargetF,
  computeRoomMinutes,
  computeThermal,
  computeWaterTempF,
  ballsPerMix,
  observedRate,
} from '../src/lib/engine';
import { PLANNING_RANGE_H, STAGE_INFO, stageDurations, type StageKey } from '../src/lib/timeline';
import { BOUNDS, DEFAULT_INPUTS } from '../src/state/defaults';
import { BAKE_1, WATER_REACHABILITY } from './vectors';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAst } from 'vite';
import { formatPercent } from '../src/lib/format';
import { BAKE_1_SEED, ffInUse } from '../src/lib/bakeLog';
import { FRICTION_AFTER_PROBE_F, PHASES_AFTER_PROBE, frictionRateOf } from '../src/lib/mixPhases';

/**
 * §8.1: *no literal in §8 content may restate an engine output unchecked.*
 *
 * The `mix-4` step carried a hand-written probe table for eight rounds after
 * §4.6 corrected it, and every test passed, because the verbatim check in
 * `steps.test.ts` compares prose against prose. Nothing compared prose against
 * the engine. A `{token}` links content to computation; a literal number has no
 * such link, so it can be wrong forever.
 *
 * Two halves, and both are needed:
 *
 * 1. **CLAIMS** — every literal that restates something the engine computes or
 *    a constant defines, rebuilt from the engine at the conditions the prose
 *    states and required to appear verbatim. If the engine moves, the prose
 *    fails here, naming the stale sentence.
 *
 * 2. **INVENTORY** — every numeric literal in rendered step and concept content
 *    is either covered by a claim or listed in `FIXED` with the reason it is
 *    not a computed value (procedure, published source, bake-1 data). A new
 *    number in §8 fails until a person classifies it — which is exactly the
 *    moment it should be reproduced, and turns "reproduce every number before
 *    adopting it" from a habit into a check.
 *
 * Neither list is derived from the content under test. The claims are rebuilt
 * from the engine; the inventory is a person's classification.
 */

// ---------------------------------------------------------------------------
// Rendered text, by location
// ---------------------------------------------------------------------------

type Loc = string;

/** Step fields that are identifiers or lookups, never shown as text. */
const STEP_FIELDS_NOT_RENDERED = new Set(['id', 'phase', 'shownWhen', 'concepts']);

/** Every rendered text field, keyed `step.field`, `concept:id`, `reference:id` or `about`. */
function contentByLocation(): Map<Loc, string> {
  const out = new Map<Loc, string>();
  const put = (loc: Loc, text: string | undefined) => {
    if (!text) return;
    out.set(loc, out.has(loc) ? `${out.get(loc)}\n${text}` : text);
  };
  // Every string a step carries, walked rather than listed, keyed by the
  // top-level field. This was a list of six fields, so MESSAGE-31's per-track
  // timers and every title (biga-5's "~20%") were invisible to the gate. Only
  // what never renders is skipped: identifiers and condition expressions.
  const walk = (loc: Loc, value: unknown): void => {
    if (typeof value === 'string') put(loc, value);
    else if (Array.isArray(value)) value.forEach((v) => walk(loc, v));
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) if (k !== 'condition') walk(loc, v);
    }
  };
  for (const s of STEPS) {
    for (const [field, value] of Object.entries(s)) {
      if (!STEP_FIELDS_NOT_RENDERED.has(field)) walk(`${s.id}.${field}`, value);
    }
  }
  // Concepts and §9's sections are walked too: every string but the id. The
  // concept titles render as the drawer's heading, and four carry figures
  // ("6–36 h", "70%, 2.8%"), which a body-only read never saw (FINDINGS-52).
  const walkEntry = (loc: Loc, entry: object) => {
    for (const [k, v] of Object.entries(entry)) if (k !== 'id') walk(loc, v);
  };
  for (const c of CONCEPTS) walkEntry(`concept:${c.id}`, c);
  // The timeline's stage titles and descriptions render on the timeline card,
  // and are typed in timeline.ts — invisible to both halves of this gate until
  // MESSAGE-31 put ranges on the timeline.
  for (const [key, { title, description }] of Object.entries(STAGE_INFO)) {
    put(`stage:${key}`, title);
    put(`stage:${key}`, description);
  }
  // §9 and §11 render too (Task 9), so they answer to the same gate.
  for (const r of REFERENCE) walkEntry(`reference:${r.id}`, r);
  put('about', ABOUT_INTRO);
  // §7.3 capacity messages (MESSAGE-29).
  for (const [key, text] of Object.entries(CAPACITY)) put(`capacity:${key}`, text);
  for (const src of SOURCES) put('about', `${src.title} — ${src.note}`);
  return out;
}

const CONTENT = contentByLocation();

/**
 * A number, optionally a range, optionally with its unit. Numbers glued to a
 * word or a hyphen are identifiers (`mix-8`, `biga-5`), and `{tokens}` are
 * computed values already, so neither is a literal.
 */
const NUMBER =
  /(?<![\w{-])[−-]?\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?(?:-(?:ball|minute|hour|second)\b|\s*(?:%|°F|°C|g\b|min\b|h\b|s\b|RPM\b|hours?\b|minutes?\b|seconds?\b|balls?\b|inch(?:es)?\b|cm\b|×))?/g;

function literalsAt(loc: Loc): Set<string> {
  const text = (CONTENT.get(loc) ?? '').replace(/\{[A-Za-z]+\}/g, '');
  return new Set([...text.matchAll(NUMBER)].map((m) => m[0].trim()));
}

// ---------------------------------------------------------------------------
// Engine at stated conditions
// ---------------------------------------------------------------------------

/** Round half up at `dp`, then fix — the way a person writes a figure. */
const fx = (x: number, dp: number) => (Math.round(x * 10 ** dp + 1e-9) / 10 ** dp).toFixed(dp);

/** Thermal system for a batch at the default ball weight and bowl. */
function thermalAt(balls: number, ballWeightG: number = C.DEFAULT_BALL_G) {
  const f = computeFormula({ balls, ballWeightG });
  return computeThermal(f, C.BOWL_MASS_G, computeCapacity(f).nMix);
}

/** Dough-only-to-observed factor `Ct/TOT`. */
const ctOverTot = (balls: number) => {
  const t = thermalAt(balls);
  return t.cTotal / t.cSystem;
};

/** Probe target at the batch's default DDT. No FF term since MESSAGE-52. */
const probeAt = (balls: number, roomTempF: number) =>
  computeProbeTargetF({ ddtF: defaultDdtF(balls), roomTempF, thermal: thermalAt(balls) });

/** The FF in use at a batch before the log has a counted bake (§6, Panel 3). */
const ffBeforeLog = (balls: number, ballWeightG: number = C.DEFAULT_BALL_G) =>
  ffInUse([], { balls, nMix: computeCapacity(computeFormula({ balls, ballWeightG })).nMix }).ff;

/** `d(T_water)/d(T_biga)`, measured off `computeWaterTempF`, bowl held or tracking. */
function bigaSensitivity(balls: number, bowl: 'held' | 'tracking'): number {
  const t = thermalAt(balls);
  const base = { ddtF: 75, frictionFactorF: 14, bigaTempF: 58, flourTempF: 70, roomTempF: 70 };
  const pin = bowl === 'held' ? { bowlTempF: 58 } : {};
  return -(
    computeWaterTempF({ ...base, ...pin, bigaTempF: 59 }, t) - computeWaterTempF({ ...base, ...pin }, t)
  );
}

/** `C_bowl/Cw`: water moved per °F of bowl. */
const bowlOverWater = (balls: number) => {
  const t = thermalAt(balls);
  return t.cBowl / t.cFreshWater;
};

const step = (id: string): Step => {
  const s = STEPS.find((x) => x.id === id);
  if (!s) throw new Error(`no step ${id}`);
  return s;
};

/** A step's speed, which the RPM claims and the phase-rise claims both read. */
const speedOf = (id: string) => {
  const s = step(id).speed;
  if (!s) throw new Error(`${id} has no speed`);
  return s;
};

const mid = ([a, b]: readonly [number, number]) => (a + b) / 2;
const rpm = (dial: number) => String(Math.round(rpmForDial(dial)));

/**
 * §7.5 lit segments, derived here from the dial and INDICATOR_PCT_PER_SEGMENT —
 * independently of the app's formatter, so a bug there can't agree with itself.
 */
const segs = (dial: number) => {
  const n = dial / C.INDICATOR_PCT_PER_SEGMENT;
  const whole = Math.floor(n);
  return `${whole || ''}${n - whole === 0.5 ? '½' : ''}`;
};
const segWords = (dial: number) => `${segs(dial)} lit segment${dial / C.INDICATOR_PCT_PER_SEGMENT > 1 ? 's' : ''}`;

/**
 * A step's fixed timer as [lo, hi] minutes. Since MESSAGE-32 the timer is the
 * one source of a mixer phase's duration; the speed field carries none.
 */
const timerOf = (id: string): readonly [number, number] => {
  const t = step(id).timerMinutes;
  if (t === undefined) throw new Error(`${id} has no fixed timer`);
  return Array.isArray(t) ? t : [t, t];
};

/** Phase C's planned minutes: the midpoint of `mix-5`'s timer. */
const PHASE_C_MIN = mid(timerOf('mix-5'));

/**
 * Phase C's shortest time, from `mix-4`'s cut row. No constant holds it: the
 * look sets the shortest Phase C (MESSAGE-45), and the cut row, `mix-4`'s
 * "full range" row and `mix-5`'s authority all print this figure, so the
 * claims below read it from here to keep the three together.
 */
const PHASE_C_CUT_MIN = 2;

// ---------------------------------------------------------------------------
// 1. CLAIMS
// ---------------------------------------------------------------------------

interface Claim {
  at: Loc;
  /** What the literal restates, and the conditions it holds at. */
  restates: string;
  /** The literals, as extracted, that this claim accounts for. */
  covers: readonly string[];
  /** Rebuilt from the engine. Must appear verbatim in the rendered text. */
  text?: string;
  /** For claims that are a bound rather than a figure ("under a degree"). */
  holds?: () => boolean;
  /**
   * The prose disagrees with the engine, and the fix belongs to the spec
   * author because §8 prose is theirs to word. Pinned both ways: this fails
   * when the prose is corrected (delete the marker) and when the engine stops
   * disagreeing — so a known discrepancy cannot outlive either side moving.
   */
  knownWrong?: { reads: string; see: string };
}

/** §4.7's bigaRoomTemp, the retarded biga's hours at room temperature. */
const BIGA_ROOM_H = stageDurations('retarded', {
  bigaFridgeH: 19, bigaRoomOnlyH: 16, ballRoomTempH: 1.5, nMix: 1, coldFermentH: 24, temperH: 2.5,
}).bigaRoomTemp;

/**
 * Published figures MESSAGE-51 cites, as §11's notes state them. Claimed at
 * `about` against those notes, so each figure the prose derives from them is
 * checked against the source line as well as against the arithmetic. The ash
 * figures went in MESSAGE-52.
 */
const AVPN = {
  /** International Regulations 2024, per liter of water. */
  saltG: [40, 60] as const,
  flourKg: [1.6, 1.8] as const,
};
/** AVPN's salt as a percent of flour: least salt on most flour, to most on least. */
const avpnSaltPct = [
  (AVPN.saltG[0] / (AVPN.flourKg[1] * 1000)) * 100,
  (AVPN.saltG[1] / (AVPN.flourKg[0] * 1000)) * 100,
] as const;
const avpnSaltSpan = `${fx(avpnSaltPct[0], 1)}–${fx(avpnSaltPct[1], 2)}%`;
const avpnPerLiter = `${AVPN.saltG[0]}–${AVPN.saltG[1]} g`;
const avpnFlourKg = `${AVPN.flourKg[0]}–${AVPN.flourKg[1]}`;

/**
 * biga-4b's "about 11 hours' worth at 63 °F" (MESSAGE-51). The engine doesn't
 * model the biga's temperature, so this rebuilds the recipe agent's
 * integration from what the engine does hold: `Q_DOUBLING_F`, §4.7's
 * `bigaRoomTemp` and `BIGA_TEMPER_H`, and the fridge planning point. The
 * rest are MESSAGE-51's stated assumptions: a 70 °F room, a 39 °F fridge (the
 * middle of the 38–40 °F the step prints), Newton cooling to within 2 °F of it
 * in 3–5 h, and a temper ending at bake 1's 53 °F. Rate is 2^((T − 63)/17),
 * 63 °F being the middle of Giorilli's 61–65.
 *
 * Reproduced at 19 h in the fridge: 11.07 h (cooled in 3 h) to 11.56 h (in 5
 * h); across the whole 18–20 h window, 10.69–11.94. The claim is taken at the
 * middle of both, 11.32, which prints 11. MESSAGE-51 quotes 11.1–11.6. The
 * sentence names the temper since MESSAGE-52, as this count always did.
 */
const BIGA_REFERENCE_F = (61 + 65) / 2;
const bigaEquivalentH = (coolH: number, fridgeH: number) => {
  const room = 70;
  const fridge = 39;
  const temperEnd = 53;
  const rate = (T: number) => 2 ** ((T - BIGA_REFERENCE_F) / C.Q_DOUBLING_F);
  const integrate = (f: (t: number) => number, t1: number, n = 20000) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += f(((i + 0.5) * t1) / n);
    return (sum * t1) / n;
  };
  const tau = coolH / Math.log((room - fridge) / 2);
  const k = Math.log((room - fridge) / (room - temperEnd)) / C.BIGA_TEMPER_H;
  return (
    BIGA_ROOM_H * rate(room) +
    integrate((t) => rate(fridge + (room - fridge) * Math.exp(-t / tau)), fridgeH) +
    integrate((t) => rate(room - (room - fridge) * Math.exp(-k * t)), C.BIGA_TEMPER_H)
  );
};
const BIGA_FRIDGE_MID_H = ((PLANNING_RANGE_H.bigaFridge?.[0] ?? NaN) + (PLANNING_RANGE_H.bigaFridge?.[1] ?? NaN)) / 2;

/** A planning range as prose prints it, "18–20", scaled to the prose's unit. */
const span = (key: StageKey, scale = 1) => {
  const [lo, hi] = PLANNING_RANGE_H[key] as readonly [number, number];
  return `${lo * scale}–${hi * scale}`;
};

const CLAIMS: readonly Claim[] = [
  // --- speeds: every "N% / R RPM" is RPM = 47.4 + 2.526 × N, and prose leads
  // with the lit segments N ÷ 10 (§7.5, MESSAGE-29) ----------------------------
  ...(['mix-2', 'mix-3', 'mix-5', 'mix-7'] as const).flatMap((id): Claim[] => {
    const { dial } = speedOf(id);
    const pair = `${dial}% / ${rpm(dial)} RPM`;
    // The summary restates the timer: minutes, or seconds under a minute as
    // the recipe writes Phase D.
    const [lo, hi] = timerOf(id);
    const range = hi <= 1 ? `${lo * 60}–${hi * 60} seconds` : `${lo}–${hi} min`;
    return [
      { at: `${id}.speed`, restates: 'rpmForDial', text: pair, covers: [`${dial}%`, `${rpm(dial)} RPM`] },
      {
        at: `${id}.summary`,
        restates: 'the speed field\'s dial as lit segments, then dial and rpmForDial',
        text: `**${segWords(dial)}** (${dial}%, ${rpm(dial)} RPM)`,
        covers: [String(Math.floor(dial / C.INDICATOR_PCT_PER_SEGMENT)), `${dial}%`, `${rpm(dial)} RPM`],
      },
      { at: `${id}.summary`, restates: 'the step\'s timer (MESSAGE-32)', text: range, covers: [range] },
    ];
  }),
  { at: 'mix-2.detail', restates: 'rpmForDial(5), the dial floor', text: `slowest setting is ${rpm(5)} RPM`, covers: [`${rpm(5)} RPM`] },
  { at: 'mix-2.detail', restates: 'rpmForDial(15)', text: `pouring water in at ${rpm(15)} RPM`, covers: [`${rpm(15)} RPM`] },
  { at: 'mix-3.detail', restates: 'rpmForDial(20)', text: `at ${rpm(20)} RPM the hook`, covers: [`${rpm(20)} RPM`] },
  {
    at: 'mix-7.detail',
    restates: 'the 40% ceiling as lit segments, and rpmForDial(40)',
    text: `Never above ${segWords(40)} (40%, ${rpm(40)} RPM)`,
    covers: [segs(40), '40%', `${rpm(40)} RPM`],
  },
  {
    at: 'concept:no-creep-speed',
    restates: 'the two anchors, RPM_AT_5_PCT and RPM_AT_100_PCT, and the derived line printed to display precision',
    holds: () => rpmForDial(5) === C.RPM_AT_5_PCT && rpmForDial(100) === C.RPM_AT_100_PCT,
    text:
      `5% on the dial = ${C.RPM_AT_5_PCT} RPM**. With Ooni's published ${C.RPM_AT_100_PCT} RPM at 100%, ` +
      `that gives \`RPM = ${fx(C.RPM_INTERCEPT, 1)} + ${fx(C.RPM_SLOPE, 3)} × dial%\``,
    covers: ['5%', `${C.RPM_AT_5_PCT} RPM`, `${C.RPM_AT_100_PCT} RPM`, '100%', fx(C.RPM_INTERCEPT, 1), `${fx(C.RPM_SLOPE, 3)} ×`],
  },
  { at: 'concept:no-creep-speed', restates: 'rpmForDial(5)', text: `**5% on the dial = ${rpm(5)} RPM**`, covers: [`${rpm(5)} RPM`] },

  // --- mix-4: the probe ----------------------------------------------------
  {
    // The worked example is `{frictionRemainingF}` / `{restExchangeF}` /
    // `{probeGapF}` since MESSAGE-18 — only the rest's length is still typed.
    at: 'mix-4.detail',
    restates: "the rest's length, from mix-6's timer",
    text: `the ${step('mix-6').timerMinutes}-minute rest moves the dough`,
    covers: ['10-minute'],
  },
  {
    at: 'mix-4.detail',
    restates: 'probe slope in room temperature, exactly 0.2 at every batch size',
    text: `below 70 °F moves the target ${fx(probeAt(6, 69) - probeAt(6, 70), 1)} °F up toward DDT.** A 62 °F kitchen is ${fx(probeAt(6, 62) - probeAt(6, 70), 1)} °F closer.`,
    covers: ['70 °F', '0.2 °F', '62 °F', '1.6 °F'],
  },
  { at: 'mix-4.detail', restates: 'the same slope, warm side', text: `above 70 moves it ${fx(probeAt(6, 70) - probeAt(6, 71), 1)} °F down.`, covers: ['70', '0.2 °F'] },
  {
    at: 'mix-4.detail',
    // The target has no FF term since MESSAGE-52, so one batch shift holds at
    // every FF the log could produce.
    restates: 'a 62–78 °F kitchen moves the target > 3 °F; 3→9 balls moves it a fraction of that',
    holds: () => {
      const roomShift = probeAt(6, 62) - probeAt(6, 78);
      const batchShift = Math.abs(probeAt(3, 70) - probeAt(9, 70));
      return roomShift > 3 && batchShift < roomShift;
    },
    text: 'A 62 °F kitchen against a 78 °F one shifts the target by more than three degrees; going from 3 balls to 9 shifts it by a fraction of that',
    covers: ['3 balls', '9', '62 °F', '78 °F'],
  },
  {
    at: 'mix-4.detail',
    restates: "computeProbeTargetF's terms, read off its behaviour, and no FF in the calculated target",
    holds: () => {
      const t = thermalAt(6);
      const at = (room: number) => computeProbeTargetF({ ddtF: 75, roomTempF: room, thermal: t });
      const remaining = (75 - at(75)) / (t.cTotal / t.cSystem);
      const target = (ff: number) => calculate({ ...DEFAULT_INPUTS, frictionFactorF: ff, flourTempF: 70 } as never).probeTargetF;
      return (
        Math.abs(remaining - FRICTION_AFTER_PROBE_F) < 1e-9 &&
        Math.abs(at(69) - at(70) - 0.2) < 1e-9 &&
        target(8) === target(18)
      );
    },
    text: 'DDT − (Phase C + Phase D friction) × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)',
    covers: ['0.2 ×'],
  },
  {
    at: 'mix-4.detail',
    restates: 'PHASES_AFTER_PROBE: each reference time at its FRICTION_RATE, and FRICTION_AFTER_PROBE_F',
    text: (() => {
      const [c, d] = PHASES_AFTER_PROBE;
      const seconds = d!.referenceMin * 60;
      if (seconds % 0.5 !== 0) throw new Error(`Phase D's reference is ${seconds} s`);
      const dWords = `${Math.floor(seconds)}${seconds % 1 ? '½' : ''} seconds`;
      return (
        `${c!.referenceMin} minutes at ${fx(frictionRateOf(c!.dial), 2)} °F a minute plus ${dWords} at ` +
        `${fx(frictionRateOf(d!.dial), 2)}, about ${fx(FRICTION_AFTER_PROBE_F, 1)} °F in the dough alone`
      );
    })(),
    // "52½" extracts as "52": the pattern stops at the fraction.
    covers: ['3.5 minutes', '1.08 °F', '52', '0.86', '4.5 °F'],
  },
  {
    at: 'mix-4.troubleshoot',
    restates: 'PHASE_C_MAX_MIN, as the top of the extend range',
    text: `Extend Phase C to 4.5–${C.PHASE_C_MAX_MIN} min`,
    covers: [`4.5–${C.PHASE_C_MAX_MIN} min`],
  },
  {
    at: 'mix-4.troubleshoot',
    restates: "Phase C's full range (MESSAGE-45): the cut row's shortest time and PHASE_C_MAX_MIN",
    holds: () => (CONTENT.get('mix-4.troubleshoot') ?? '').includes(`Cut Phase C to ${PHASE_C_CUT_MIN}–`),
    text: `Use Phase C's full range: ${PHASE_C_CUT_MIN} min if high (longer if it isn't smooth and glossy yet), ${C.PHASE_C_MAX_MIN} min if low`,
    covers: [`${PHASE_C_CUT_MIN} min`, `${C.PHASE_C_MAX_MIN} min`],
  },

  // --- mix-5: Phase C's authority, and the friction rates -------------------
  {
    at: 'mix-5.detail',
    restates: 'observedRate(30) × minutes cut/added from the planned Phase C, at 6 balls',
    text:
      `At 6 balls, cutting it to ${PHASE_C_CUT_MIN} minutes saves **${fx(observedRate(30, thermalAt(6)) * (PHASE_C_MIN - PHASE_C_CUT_MIN), 1)} °F** ` +
      `and stretching it to ${C.PHASE_C_MAX_MIN} minutes adds **${fx(observedRate(30, thermalAt(6)) * (C.PHASE_C_MAX_MIN - PHASE_C_MIN), 1)} °F**`,
    covers: ['6 balls', '2 minutes', '1.5 °F', `${C.PHASE_C_MAX_MIN} minutes`, '1.9 °F'],
  },
  {
    at: 'mix-5.detail',
    restates: 'the same authority at 3 and 9 balls',
    text: (() => {
      const cut = (b: number) => fx(observedRate(30, thermalAt(b)) * (PHASE_C_MIN - PHASE_C_CUT_MIN), 1);
      const add = (b: number) => fx(observedRate(30, thermalAt(b)) * (C.PHASE_C_MAX_MIN - PHASE_C_MIN), 1);
      return `narrower at 3 balls (−${cut(3)} / +${add(3)}) and slightly wider at 9 (−${cut(9)} / +${add(9)})`;
    })(),
    covers: ['3 balls', '−1.3', '1.8', '9', '−1.5', '2.0'],
  },
  {
    at: 'mix-5.detail',
    restates: "PHASE_C_MAX_MIN as Phase C's longest (MESSAGE-45)",
    text: `So the look sets the shortest Phase C, and ${C.PHASE_C_MAX_MIN} minutes the longest.`,
    covers: [`${C.PHASE_C_MAX_MIN} minutes`],
  },
  {
    at: 'mix-5.detail',
    restates: 'FRICTION_RATE, dough-only, by dial',
    text: `15% ≈ ${fx(C.FRICTION_RATE[15], 2)} °F/min · 20% ≈ ${fx(C.FRICTION_RATE[20], 2)} °F/min · 30% ≈ ${fx(C.FRICTION_RATE[30], 2)} °F/min`,
    covers: ['15%', '0.75 °F', '20%', '0.86 °F', '30%', '1.08 °F'],
  },
  {
    at: 'mix-5.detail',
    restates: 'Ct/TOT by balls per mix, and observedRate(30) — two indices, stated as such',
    text:
      `— ${fx(ctOverTot(3), 2)} at 3 balls, ${fx(ctOverTot(6), 2)} at 6, ${fx(ctOverTot(9), 2)} at 9 — which at 30% gives ` +
      `${fx(observedRate(30, thermalAt(3)), 2)}, ${fx(observedRate(30, thermalAt(6)), 2)} and ${fx(observedRate(30, thermalAt(9)), 2)} °F per minute.`,
    covers: ['0.82', '3 balls', '0.90', '6', '0.93', '9', '30%', '0.89', '0.97', '1.01 °F'],
  },
  {
    at: 'mix-5.detail',
    restates: '"about a degree a minute" rounds to 1 at 6 balls and up, not at 3',
    holds: () =>
      fx(observedRate(30, thermalAt(6)), 0) === '1' && fx(observedRate(30, thermalAt(9)), 0) === '1' && observedRate(30, thermalAt(3)) < 0.9,
    covers: ['6 balls'],
  },

  // --- mix-7: the run it sums from its own phases ---------------------------
  {
    at: 'mix-7.detail',
    restates: 'A + B + C + D maxima from the timers',
    text: `The total run is about ${['mix-2', 'mix-3', 'mix-5', 'mix-7'].reduce((n, id) => n + timerOf(id)[1], 0)} minutes`,
    covers: ['15 minutes'],
  },

  // --- sensitivities ---------------------------------------------------------
  {
    at: 'biga-6.detail',
    restates: '(Cb + C_bowl)/Cw — bowl tracking the biga, which is what the temper does',
    text: `${fx(bigaSensitivity(6, 'tracking'), 1)} °F at a 6-ball mix and ${fx(bigaSensitivity(3, 'tracking'), 1)} °F at a 3-ball one`,
    covers: ['1.9 °F', '6-ball', '2.3 °F', '3-ball'],
  },
  {
    at: 'mix-1.detail',
    restates: 'C_bowl/Cw at 3 balls',
    text: `Each degree of bowl temperature is worth ${fx(bowlOverWater(3), 2)} °F of water at a 3-ball mix.`,
    covers: ['0.66 °F', '3-ball'],
  },
  { at: 'mix-1.detail', restates: 'BAKE_1.tBigaF, after tearing', text: `${BAKE_1.tBigaF} °F once broken up`, covers: [`${BAKE_1.tBigaF} °F`] },
  {
    at: 'mix-8.detail',
    restates: 'Cb/Cw (bowl held, scale-invariant) against C_bowl/Cw at 6 balls',
    text: `about **${fx(bigaSensitivity(6, 'held'), 1)} °F of water per °F of biga**, against **${fx(bowlOverWater(6), 2)} °F per °F of bowl** at a 6-ball mix`,
    covers: ['1.6 °F', '0.33 °F', '6-ball'],
  },
  { at: 'mix-8.detail', restates: 'OVERAGE', text: `the ${fx((C.OVERAGE - 1) * 100, 1)}% overage`, covers: ['2.2%'] },
  { at: 'mix-8.timerLabel', restates: 'CHANGEOVER_H', text: `${fx(C.CHANGEOVER_H * 60, 0)} min`, covers: ['5 min'] },

  // --- warnings and capacities -----------------------------------------------
  {
    at: 'bulk-1.warningWhen',
    restates: "§4.8's floor, read off computeRoomMinutes for a warm dough",
    text: `its ${fx(computeRoomMinutes({ finalDoughTempF: 90, ddtF: 75 }), 0)}-minute floor`,
    covers: ['45-minute'],
  },
  { at: 'biga-1.detailWhen', restates: 'FLOUR_CAP_55', text: `the ${C.FLOUR_CAP_55} g the machine handles`, covers: [`${C.FLOUR_CAP_55} g`] },
  { at: 'biga-1.detail', restates: 'BIGA_HYDRATION', text: `In a stiff ${fx(C.BIGA_HYDRATION * 100, 0)}% biga`, covers: ['50%'] },
  { at: 'biga-3.detail', restates: 'MIN_DOUGH', text: `mixer's ${C.MIN_DOUGH} g minimum`, covers: [`${C.MIN_DOUGH} g`] },
  {
    at: 'mix-3.detail',
    restates: 'SALT, inside AVPN\'s range as a percent of flour',
    text: `At ${fx(C.SALT * 100, 1)}% of the flour, the salt sits inside AVPN's range`,
    holds: () => C.SALT * 100 >= avpnSaltPct[0] && C.SALT * 100 <= avpnSaltPct[1],
    covers: ['2.8%'],
  },
  {
    at: 'mix-3.detail',
    restates: 'AVPN, as §11 cites it, and the percent of flour it comes to',
    text: `${avpnPerLiter} per liter of water with ${avpnFlourKg} kg of flour, which is ${avpnSaltSpan} of the flour`,
    covers: ['40–60 g', '1.6–1.8', '2.2–3.75%'],
  },

  // --- biga-1's yeast water (MESSAGE-51) ------------------------------------
  // "About ten times the yeast's weight" of the biga water is 10 × ADY ÷
  // BIGA_HYDRATION of it, 7.5%; warmed to the summary's 100–110 °F from the
  // app's default room, it lifts the whole biga water by that share of the gap.
  {
    at: 'biga-1.detail',
    restates: '10 × ADY_OF_BIGA_FLOUR ÷ BIGA_HYDRATION × (100–110 °F − the default room)',
    text: (() => {
      const share = (10 * C.ADY_OF_BIGA_FLOUR) / C.BIGA_HYDRATION;
      const room = DEFAULT_INPUTS.roomTempF;
      return `It warms the biga water only ${fx(share * (100 - room), 0)}–${fx(share * (110 - room), 0)} °F`;
    })(),
    covers: ['2–3 °F'],
  },

  // --- biga-3's dissolve paragraph (MESSAGE-34) -----------------------------
  { at: 'biga-3.detail', restates: 'BIGA_HYDRATION', text: `a stiff ${fx(C.BIGA_HYDRATION * 100, 0)}% biga`, covers: ['50%'] },

  // --- §11's flour and salt sources (MESSAGE-51): the note and the figures the
  // prose derives from it are checked against each other.
  {
    at: 'about',
    restates: 'AVPN, International Regulations 2024',
    text: `per liter of water: ${avpnPerLiter} salt, ${avpnFlourKg} kg flour`,
    covers: ['40–60 g', '1.6–1.8'],
  },

  // --- §11's Halo Core sources (MESSAGE-34). §3 now cites these pages for the
  // constants, so the note and the constant are checked against each other: a
  // constant that moved off its cited source fails here.
  {
    at: 'about',
    restates: 'MIN_DOUGH–MAX_DOUGH, Ooni\'s published capacity',
    text: `${C.MIN_DOUGH / 1000}–${C.MAX_DOUGH / 1000} kg dough`,
    covers: ['0.5–2.5'],
  },
  {
    at: 'about',
    restates: 'MAX_RUN_MIN, Ooni\'s published continuous limit',
    text: `${C.MAX_RUN_MIN}-minute maximum continuous operating time`,
    covers: ['20-minute'],
  },
  {
    at: 'about',
    restates: 'INDICATOR_PCT_PER_SEGMENT / 2, the half-lit step and so the dial\'s increment',
    text: `${C.INDICATOR_PCT_PER_SEGMENT / 2}% increments`,
    covers: ['5%'],
  },
  { at: 'about', restates: 'RPM_AT_100_PCT, Ooni\'s published maximum', text: `${C.RPM_AT_100_PCT} RPM at 100%`, covers: ['300 RPM'] },

  // --- yeast -----------------------------------------------------------------
  {
    at: 'biga-1.detail',
    restates: 'FRESH_YEAST_OF_BIGA_FLOUR → FRESH_TO_IDY → ADY_OF_BIGA_FLOUR',
    text: `${fx(C.FRESH_YEAST_OF_BIGA_FLOUR * 100, 0)}% fresh yeast = ${fx(C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY * 100, 2)}% IDY = ${fx(C.ADY_OF_BIGA_FLOUR * 100, 3)}% ADY`,
    covers: ['1%', '0.30%', '0.375%'],
  },
  {
    at: 'concept:giorilli-standard',
    restates: 'the same chain',
    text: `${fx(C.FRESH_YEAST_OF_BIGA_FLOUR * 100, 0)}% fresh yeast = ${fx(C.FRESH_YEAST_OF_BIGA_FLOUR * C.FRESH_TO_IDY * 100, 2)}% IDY = ${fx(C.ADY_OF_BIGA_FLOUR * 100, 3)}% ADY`,
    covers: ['1%', '0.30%', '0.375%'],
  },
  {
    at: 'concept:giorilli-standard',
    restates: 'FRESH_TO_IDY, IDY_TO_ADY, ADY_OF_BIGA_FLOUR',
    text: `fresh to instant at ${fx(C.FRESH_TO_IDY, 2)}, instant to active dry at ×${C.IDY_TO_ADY}, which gives exactly ${fx(C.ADY_OF_BIGA_FLOUR * 100, 3)}%`,
    covers: ['0.30', '1.25', '0.375%'],
  },
  {
    at: 'concept:schedule-architecture',
    restates: 'ADY_OF_BIGA_FLOUR × BIGA_FRACTION, on total flour',
    text: `At ${fx(C.ADY_OF_BIGA_FLOUR * 100, 3)}% ADY on ${fx(C.BIGA_FRACTION * 100, 0)}% biga flour you carry about ${fx(C.ADY_OF_BIGA_FLOUR * C.BIGA_FRACTION * 100, 3)}% ADY on total flour`,
    covers: ['0.375%', '65%', '0.244%'],
  },

  // --- schedule: §4.7's stages, and the ranges its planning points sit in ------
  // MESSAGE-31: where the recipe gives a range, the step prints the range —
  // PLANNING_RANGE_H, which the timeline prints beside the point too (§7.4).
  { at: 'biga-4.summaryRetarded', restates: '§4.7 bigaRoomTemp', text: `**${BIGA_ROOM_H} hours** at room temperature`, covers: ['2 hours'] },
  {
    at: 'biga-4.summary',
    restates: '§4.7 bigaRoomTemp — `summary` falls back to the retarded text',
    text: `**${BIGA_ROOM_H} hours** at room temperature`,
    covers: ['2 hours'],
  },
  { at: 'biga-4.timerLabelRetarded', restates: '§4.7 bigaRoomTemp', text: `${BIGA_ROOM_H} h`, covers: ['2 h'] },
  {
    at: 'biga-4.summaryClassic',
    restates: 'PLANNING_RANGE_H.bigaRoomOnly',
    text: `The Giorilli window is **${span('bigaRoomOnly')} hours**`,
    covers: [`${span('bigaRoomOnly')} hours`],
  },
  { at: 'biga-4.timerLabelClassic', restates: 'PLANNING_RANGE_H.bigaRoomOnly', text: `${span('bigaRoomOnly')} h`, covers: [`${span('bigaRoomOnly')} h`] },
  {
    at: 'biga-4.detail',
    restates: '§4.7 bigaRoomTemp, then PLANNING_RANGE_H.bigaFridge',
    text: `${BIGA_ROOM_H} h at room temperature and then ${span('bigaFridge')} h in the fridge`,
    covers: ['2 h', '18–20 h', '2 hours'],
  },
  { at: 'biga-4b.summary', restates: 'PLANNING_RANGE_H.bigaFridge', text: `for **${span('bigaFridge')} hours**`, covers: ['18–20 hours'] },
  { at: 'biga-4b.timerLabel', restates: 'PLANNING_RANGE_H.bigaFridge', text: `${span('bigaFridge')} h`, covers: ['18–20 h'] },
  { at: 'biga-4b.detail', restates: 'PLANNING_RANGE_H.bigaFridge', text: `Anywhere in the ${span('bigaFridge')} h window`, covers: ['18–20 h'] },
  { at: 'biga-4b.detail', restates: 'PLANNING_RANGE_H.bigaFridge', text: `warm, ${span('bigaFridge')} h at`, covers: ['18–20 h'] },
  {
    at: 'biga-4b.detail',
    restates: 'Q_DOUBLING_F, and the biga\'s equivalent hours at 63 °F (bigaEquivalentH, above)',
    text: `with the rate doubling every ${C.Q_DOUBLING_F} °F, about ${fx(bigaEquivalentH(4, BIGA_FRIDGE_MID_H), 0)} hours' worth at ${BIGA_REFERENCE_F} °F`,
    covers: ['17 °F', '11 hours', '63 °F'],
  },
  { at: 'biga-4b.detail', restates: '§4.7 bigaRoomTemp', text: `The ${BIGA_ROOM_H} hours at room temperature`, covers: ['2 hours'] },
  { at: 'bulk-1.summary', restates: 'PLANNING_RANGE_H.bulkRest', text: `${span('bulkRest', 60)} min at room temperature`, covers: ['45–60 min'] },
  { at: 'bulk-1.timerLabel', restates: 'PLANNING_RANGE_H.bulkRest', text: `${span('bulkRest', 60)} min`, covers: ['45–60 min'] },
  {
    at: 'bulk-3.detailWhen',
    restates: '§4.8 ROOM_MIN_CLAMP, the rise floor plannedBallRiseH holds',
    text: `never below ${C.ROOM_MIN_CLAMP[0]} minutes`,
    covers: [`${C.ROOM_MIN_CLAMP[0]} minutes`],
  },
  { at: 'bake-1.summary', restates: 'PLANNING_RANGE_H.temper', text: `**${span('temper')} hours** before baking`, covers: ['2–3 hours'] },
  { at: 'bake-1.timerLabel', restates: 'PLANNING_RANGE_H.temper', text: `${span('temper')} h`, covers: ['2–3 h'] },

  // --- concepts: the formula -------------------------------------------------
  { at: 'concept:why-biga', restates: 'BIGA_FRACTION', text: `Why ${fx(C.BIGA_FRACTION * 100, 0)}% and not 100%`, covers: ['65%'] },
  { at: 'concept:why-biga', restates: 'BIGA_FRACTION', text: `stop at ${fx(C.BIGA_FRACTION * 100, 0)}%`, covers: ['65%'] },
  { at: 'concept:why-biga', restates: '1 − BIGA_FRACTION', text: `Keeping ${fx((1 - C.BIGA_FRACTION) * 100, 0)}% of the flour out`, covers: ['35%'] },
  { at: 'concept:formula-rationale', restates: 'HYDRATION', text: `**${fx(C.HYDRATION * 100, 0)}% hydration**`, covers: ['70%'] },
  { at: 'concept:formula-rationale', restates: 'BIGA_HYDRATION', text: `**${fx(C.BIGA_HYDRATION * 100, 0)}% biga hydration.**`, covers: ['50%'] },
  { at: 'concept:formula-rationale', restates: 'SALT', text: `**${fx(C.SALT * 100, 1)}% salt**`, covers: ['2.8%'] },
  {
    at: 'concept:formula-rationale',
    restates: 'HYDRATION and SALT, in the title',
    text: `Why ${fx(C.HYDRATION * 100, 0)}% hydration, ${fx(C.SALT * 100, 1)}% salt`,
    covers: ['70%', '2.8%'],
  },
  { at: 'concept:why-biga', restates: 'BIGA_FRACTION, in the title', text: `uses a ${fx(C.BIGA_FRACTION * 100, 0)}% biga`, covers: ['65%'] },
  {
    at: 'concept:formula-rationale',
    restates: 'AVPN, as §11 cites it, and the percent of flour it comes to',
    text: `AVPN specifies ${avpnPerLiter} of salt per liter of water, with ${avpnFlourKg} kg of flour: ${avpnSaltSpan} of the flour`,
    holds: () => C.SALT * 100 >= avpnSaltPct[0] && C.SALT * 100 <= avpnSaltPct[1],
    covers: ['40–60 g', '1.6–1.8', '2.2–3.75%'],
  },
  {
    at: 'concept:formula-rationale',
    restates: 'SALT ÷ HYDRATION, grams per liter of water: exactly the bottom of AVPN\'s range',
    text: `This dough carries ${fx(C.HYDRATION * 100, 0)}% water, so by AVPN's own measure ${fx(C.SALT * 100, 1)}% of the flour is ${fx((C.SALT / C.HYDRATION) * 1000, 0)} g per liter, the bottom of their range`,
    holds: () => Math.abs((C.SALT / C.HYDRATION) * 1000 - AVPN.saltG[0]) < 1e-9,
    covers: ['70%', '2.8%', '40 g'],
  },
  // MESSAGE-51's recommendation is the input's default, and its untested
  // lengths are the input's bounds, which the title states too.
  {
    at: 'concept:schedule-architecture',
    restates: 'the cold-ferment default',
    text: `**Use ${DEFAULT_INPUTS.coldFermentH} h cold.**`,
    covers: ['24 h'],
  },
  {
    at: 'concept:schedule-architecture',
    restates: 'BOUNDS.coldFermentH',
    text: `${BOUNDS.coldFermentH.min} h and ${BOUNDS.coldFermentH.max} h are inside the calculator's range`,
    covers: ['6 h', '36 h'],
  },
  {
    at: 'concept:schedule-architecture',
    restates: 'BOUNDS.coldFermentH, in the title',
    text: `Why the cold ferment is ${BOUNDS.coldFermentH.min}–${BOUNDS.coldFermentH.max} h`,
    covers: ['6–36 h'],
  },

  // --- concepts: the thermal model ------------------------------------------
  {
    at: 'concept:thermal-model',
    restates: 'bigaMass / doughTotal — scale-invariant',
    text: `the biga is **${fx((computeFormula({ balls: 6, ballWeightG: 265 }).bigaMass / (6 * 265 * C.OVERAGE)) * 100, 0)}% of the final dough mass.**`,
    covers: ['56%'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'C_BIGA (derived), C_FLOUR, C_WATER, C_SALT, C_BOWL_SPECIFIC_HEAT, the default bowl and its capacity',
    text:
      `biga at ${fx(C.BIGA_HYDRATION * 100, 0)}% hydration ${fx(C.C_BIGA, 4)}, flour ${fx(C.C_FLOUR, 2)}, water ${fx(C.C_WATER, 2)}, ` +
      `salt ${fx(C.C_SALT, 2)}, stainless ${fx(C.C_BOWL_SPECIFIC_HEAT, 2)}. A ${C.BOWL_MASS_G} g bowl contributes ${fx(bowlHeatCapacity(C.BOWL_MASS_G), 1)}`,
    covers: ['50%', '0.6133', '0.42', '1.00', '0.21', '0.12', '965 g', '115.8'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'the bowl out-weighs the fresh flour below ~5 balls',
    holds: () => thermalAt(4).cBowl > thermalAt(4).cFreshFlour && thermalAt(6).cBowl < thermalAt(6).cFreshFlour,
    covers: ['5 balls'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'bowl share C_bowl/TOT at 3 and 9 balls',
    text: `At a 3-ball mix the bowl absorbs ${fx(thermalAt(3).bowlShare * 100, 0)}% of the mixer's work; at a 9-ball mix, ${fx(thermalAt(9).bowlShare * 100, 1)}%`,
    covers: ['3-ball', '18%', '9-ball', '6.8%'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'C_bowl/TOT at 6 and 3 balls; the 0.3 is the 6-ball figure',
    text: `: ${fx(thermalAt(6).bowlShare, 2)} °F per 1 °F at 6 balls, ${fx(thermalAt(3).bowlShare, 2)} at 3, so a 3 °F misreading costs ${fx(3 * thermalAt(6).bowlShare, 1)} °F`,
    covers: ['0.10 °F', '1 °F', '6 balls', '0.18', '3', '3 °F', '0.3 °F'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'Cw/TOT stays under 1/3 at every mix the envelope allows (27–31% across 3–9 balls)',
    holds: () => {
      let max = 0;
      for (let balls = C.MIN_BALLS; balls <= BOUNDS.balls.max; balls++) {
        for (let w = BOUNDS.ballWeightG.min; w <= BOUNDS.ballWeightG.max; w++) {
          const t = thermalAt(balls, w);
          max = Math.max(max, t.cFreshWater / t.cSystem);
        }
      }
      return max < 1 / 3;
    },
    text: 'water is under a third of the system',
    covers: [],
  },
  {
    at: 'concept:thermal-model',
    restates: 'C_bowl/Cw at 3 / 6 / 9 balls',
    text: `${fx(bowlOverWater(3), 2)} °F per °F at a 3-ball mix, ${fx(bowlOverWater(6), 2)} at 6, ${fx(bowlOverWater(9), 2)} at 9`,
    covers: ['0.66 °F', '3-ball', '0.33', '6', '0.22', '9'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'FF 14 × Ct/TOT at 3 and 9 balls',
    text: `the same FF of 14 would show up as ${fx(14 * ctOverTot(3), 1)} °F in a 3-ball mix and ${fx(14 * ctOverTot(9), 1)} °F in a 9-ball one`,
    covers: ['14', '11.5 °F', '3-ball', '13.0 °F', '9-ball'],
  },
  // MESSAGE-25 offered this as a counterfactual to classify, since no token can
  // bind it. The gate can still rebuild it: `computeThermal` at nMix 1 IS the
  // batch-total model the sentence describes, so it is a claim, not FIXED.
  // Split batches only — an unsplit batch has nothing to get wrong.
  ...(() => {
    const envelope = (roomTempF: number) => {
      let lo = Infinity;
      let hi = -Infinity;
      let hiBigaF = NaN;
      for (let balls = C.MIN_BALLS; balls <= BOUNDS.balls.max; balls++) {
        for (let w = BOUNDS.ballWeightG.min; w <= BOUNDS.ballWeightG.max; w++) {
          const f = computeFormula({ balls, ballWeightG: w });
          const nMix = computeCapacity(f).nMix;
          if (nMix === 1) continue;
          // Linear in the biga, so its ends bound the envelope.
          for (const bigaTempF of [45, 60]) {
            const t = { ddtF: defaultDdtF(balls), frictionFactorF: 14, bigaTempF, flourTempF: roomTempF, roomTempF };
            const low =
              computeWaterTempF(t, computeThermal(f, C.BOWL_MASS_G, nMix)) -
              computeWaterTempF(t, computeThermal(f, C.BOWL_MASS_G, 1));
            lo = Math.min(lo, low);
            if (low > hi) { hi = low; hiBigaF = bigaTempF; }
          }
        }
      }
      return { lo, hi, hiBigaF };
    };
    const at70 = envelope(70);
    return [
      {
        at: 'concept:thermal-model',
        restates: 'batch-total model against per-mix, every split batch in the §5 envelope (1.497 at 19 x 257 g; 6.185 at 9 x 272 g, tied with 17 x 288 and 18 x 272)',
        text: `by ${fx(at70.lo, 1)} to ${fx(at70.hi, 1)} °F across the supported range`,
        covers: ['1.5', '6.2 °F'],
      },
      {
        at: 'concept:thermal-model',
        restates: 'the largest gap is at the coldest biga, and room/flour move neither end',
        holds: () => {
          const cold = envelope(60);
          const hot = envelope(84);
          const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
          return at70.hiBigaF === 45 && same(cold.lo, hot.lo) && same(cold.hi, hot.hi) && same(cold.hi, at70.hi);
        },
        text: "most with the coldest biga, when the water is already at its hottest. Your kitchen temperature doesn't change it.",
        covers: [],
      },
    ] satisfies Claim[];
  })(),
  {
    at: 'concept:thermal-model',
    restates: 'maximum required water at 3 and 9 balls — the hot corner, biga 45, room 60, at the FF in use',
    text: (() => {
      const hot = (b: number) =>
        computeWaterTempF({ ddtF: defaultDdtF(b), frictionFactorF: ffBeforeLog(b), bigaTempF: 45, flourTempF: 60, roomTempF: 60 }, thermalAt(b));
      return `the requirement reaches about ${fx(hot(3), 0)} °F, against ${fx(hot(9), 0)} °F for a 9-ball mix`;
    })(),
    covers: ['116 °F', '9-ball', '100 °F'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'a skipped temper (biga 45) in a 70 °F kitchen, 3 × 265 g, at the FF in use: 112.18',
    holds: () =>
      computeWaterTempF({ ddtF: defaultDdtF(3), frictionFactorF: ffBeforeLog(3), bigaTempF: 45, flourTempF: 70, roomTempF: 70 }, thermalAt(3)) > 110,
    text: 'at 3 balls a skipped temper pushes the requirement past 110 °F',
    covers: ['110 °F'],
  },
  {
    at: 'concept:thermal-model',
    restates: "bake 1's miss on the day: 67.97 required against 63.0 used (BAKE_1)",
    text: `On bake 1, leaving the bowl out put the water target ${fx(BAKE_1.waterRequiredF - BAKE_1.waterUsedF, 0)} °F off`,
    covers: ['5 °F'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'biga sensitivity, bowl tracking, rounds to 2 everywhere (1.81–2.32)',
    holds: () => fx(bigaSensitivity(3, 'tracking'), 0) === '2' && fx(bigaSensitivity(9, 'tracking'), 0) === '2',
    text: 'worth about 2 °F of water',
    covers: ['2 °F'],
  },

  // --- concepts: friction factor ----------------------------------------------
  { at: 'concept:friction-factor', restates: 'BAKE_1.ff to one decimal', text: `**FF = ${fx(BAKE_1.ff, 1)} °F, measured**`, covers: ['14.0 °F'] },
  {
    at: 'concept:friction-factor',
    restates: 'bake 1 observed 1.00 °F/min ÷ Ct/TOT at 6 balls, against FRICTION_RATE[30]',
    text: `1.00 °F/min on the dough and bowl together is ${fx(1.0 / ctOverTot(6), 2)} °F/min for the dough alone, against ${fx(C.FRICTION_RATE[30], 2)} predicted`,
    covers: ['1.00 °F', '1.11 °F', '1.08'],
  },
  {
    at: 'concept:friction-factor',
    restates: 'Ct/TOT at 3 / 6 / 9 balls',
    text: `That factor is ${fx(ctOverTot(3), 2)} at 3 balls, ${fx(ctOverTot(6), 2)} at 6, ${fx(ctOverTot(9), 2)} at 9`,
    covers: ['0.82', '3 balls', '0.90', '6', '0.93', '9'],
  },
  {
    at: 'concept:friction-factor',
    restates: 'FF 14 × Ct/TOT at 3 and 9 balls, at the FF it names',
    text: `the raw temperature rise differs (at FF 14, ${fx(14 * ctOverTot(3), 1)} vs ${fx(14 * ctOverTot(9), 1)})`,
    covers: ['14', '11.5', '13.0'],
  },
  {
    at: 'concept:friction-factor',
    restates: "bake 1's logged Phase C (BAKE_1.phaseCMin), and its excess over mix-5's midpoint",
    text: `Its Phase C took ${BAKE_1.phaseCMin} minutes, ${BAKE_1.phaseCMin - PHASE_C_MIN} more than the middle of the range`,
    covers: [`${BAKE_1.phaseCMin} minutes`],
  },
  {
    at: 'concept:friction-factor',
    restates: "BAKE_1.ff, and BAKE_1_SEED: bake 1 normalized, the FF in use at every batch size until the log has a counted bake",
    holds: () => {
      for (let balls = BOUNDS.balls.min; balls <= BOUNDS.balls.max; balls++) {
        for (let w = BOUNDS.ballWeightG.min; w <= BOUNDS.ballWeightG.max; w++) {
          if (ffBeforeLog(balls, w) !== BAKE_1_SEED.value) return false;
        }
      }
      return true;
    },
    text: `inside the ${fx(BAKE_1.ff, 1)}. Taken out, bake 1 comes to **${fx(BAKE_1_SEED.value, 1)}**, and that's the figure the calculator uses at every batch size until you log a fully measured bake of your own.`,
    covers: [fx(BAKE_1.ff, 1), fx(BAKE_1_SEED.value, 1)],
  },
  {
    at: 'concept:friction-factor',
    restates: 'observedRate(30) rounds to 1 °F/min at 6 balls',
    holds: () => fx(observedRate(30, thermalAt(6)), 0) === '1',
    text: 'roughly +1 °F per extra minute at 30%',
    covers: ['1 °F', '30%'],
  },
  { at: 'concept:friction-factor', restates: 'the 10-minute rest, from mix-6', text: `a ${step('mix-6').timerMinutes}-minute rest`, covers: ['10-minute'] },

  // --- §7.3 capacity messages (MESSAGE-29) -------------------------------------
  {
    at: 'capacity:nearLimit',
    restates: 'NEAR_LIMIT_FRACTION, the threshold capacityAlerts applies',
    text: `within ${formatPercent(1 - NEAR_LIMIT_FRACTION)} of the {maxDoughG} g maximum`,
    covers: ['5%'],
  },
  {
    at: 'capacity:minimumAtInput',
    restates: 'C.MIN_BALLS, the stepper floor',
    text: `**${C.MIN_BALLS} balls minimum.**`,
    covers: [`${C.MIN_BALLS} balls`],
  },

  // --- §9 reference tables (Task 9) --------------------------------------------
  {
    at: 'reference:mixer-speed',
    restates: 'the derived RPM line at display precision, through its two anchors',
    text:
      `\`RPM = ${fx(C.RPM_INTERCEPT, 1)} + ${fx(C.RPM_SLOPE, 3)} × dial%\`, the line through a measured ` +
      `${C.RPM_AT_5_PCT} RPM at 5% and Ooni's published ${C.RPM_AT_100_PCT} RPM at 100%`,
    covers: ['47.4', '2.526 ×', '60 RPM', '5%', '300 RPM', '100%'],
  },
  {
    at: 'reference:mixer-speed',
    restates: 'INDICATOR_PCT_PER_SEGMENT: a full segment, a half one, and 20% as segments (§7.5, MESSAGE-29)',
    holds: () => segs(20) === '2',
    text: `a fully lit segment is ${C.INDICATOR_PCT_PER_SEGMENT}% and a half-lit one ${C.INDICATOR_PCT_PER_SEGMENT / 2}%, so 20% is two lit segments`,
    covers: ['10%', '20%'],
  },
  // Every row leads with its lit segments (dial ÷ 10), and each row's dial is
  // the one the step for that phase actually runs at, so the table and the
  // step list cannot drift apart.
  {
    at: 'reference:mixer-speed',
    restates: 'the 5% floor, as segments and on the line',
    text: `| ${segs(5)} | 5% | ${rpm(5)} | floor — no slower setting exists |`,
    covers: ['60'],
  },
  ...([
    ['mix-2', 'Phase A breakdown', 'Phase A: mix-2’s dial'],
    ['mix-3', 'Phase B, Phase D', 'Phases B and D: mix-3’s dial, which must equal mix-7’s'],
    ['mix-5', 'Phase C development', 'Phase C: mix-5’s dial'],
  ] as const).map(([id, use, what]): Claim => {
    const d = speedOf(id).dial;
    return {
      at: 'reference:mixer-speed',
      restates: `${what}, as segments, and its RPM`,
      holds: () => speedOf('mix-3').dial === speedOf('mix-7').dial,
      text: `| ${segs(d)} | ${d}% | ${rpm(d)} | ${use} |`,
      covers: [segs(d).replace('½', ''), `${d}%`, rpm(d)].filter((x) => x !== ''),
    };
  }),
  {
    at: 'reference:mixer-speed',
    restates: 'the ceiling mix-7 states ("Never above S lit segments (N%, R RPM)"), with S = N ÷ 10 and R on the line',
    text: (() => {
      const m = /Never above (\S+) lit segments \((\d+)%, (\d+) RPM\)/.exec(STEPS.find((s) => s.id === 'mix-7')?.detail ?? '');
      const dial = Number(m?.[2]);
      return m?.[1] === segs(dial) && m?.[3] === rpm(dial)
        ? `| ${segs(dial)} | ${dial}% | ${rpm(dial)} | hard ceiling for this dough |`
        : 'mix-7 ceiling off the segment count or the RPM line';
    })(),
    covers: ['4', '40%', '148'],
  },
  {
    at: 'reference:mixer-speed',
    // Read 250 until MESSAGE-28 — a rounding slip (Ooni's own chart says 240).
    restates: '80% as segments, and on the line: 249.47',
    text: `| ${segs(80)} | 80% | ${rpm(80)} | Ooni max recommended at 66%+ hydration |`,
    covers: ['8', '80%', '249'],
  },
  {
    at: 'reference:friction-rate',
    restates: 'C.FRICTION_RATE, dough-only',
    text: `${fx(C.FRICTION_RATE[15], 2)} °F/min at 15% · ${fx(C.FRICTION_RATE[20], 2)} at 20% · ${fx(C.FRICTION_RATE[30], 2)} at 30%`,
    covers: ['0.75 °F', '15%', '0.86', '20%', '1.08', '30%'],
  },
  {
    at: 'reference:friction-rate',
    restates: 'Ct/TOT at 3 / 6 / 9 balls per mix',
    text: `| Factor | ${fx(ctOverTot(3), 3)} | ${fx(ctOverTot(6), 3)} | ${fx(ctOverTot(9), 3)} |`,
    covers: ['0.821', '0.901', '0.932'],
  },
  {
    at: 'reference:friction-rate',
    restates: 'observedRate(30) at 3 / 6 / 9 balls per mix',
    text: `| At 30% | ${[3, 6, 9].map((b) => fx(observedRate(30, thermalAt(b)), 2)).join(' | ')} |`,
    covers: ['0.89', '0.97', '1.01'],
  },
  {
    at: 'reference:friction-rate',
    restates: '12 balls is two 6-ball mixes and 18 is two 9-ball, at the default ball — and each reads its column exactly',
    holds: () =>
      ballsPerMix({ balls: 12, ballWeightG: C.DEFAULT_BALL_G }) === 6 &&
      ballsPerMix({ balls: 18, ballWeightG: C.DEFAULT_BALL_G }) === 9 &&
      ctOverTot(12) === ctOverTot(6) &&
      ctOverTot(18) === ctOverTot(9),
    text: 'A 12-ball batch runs as two 6-ball mixes and reads the 6 column; 18 balls reads the 9.',
    covers: ['12-ball', '6-ball', '18 balls'],
  },
  {
    at: 'reference:water-temperature',
    restates: 'C.WATER_MIN_F, the cold warning’s threshold',
    text: `Fridge water gets to about ${C.WATER_MIN_F} °F`,
    covers: ['38 °F'],
  },
  ...(() => {
    // The §5 envelope. Balls and ball weight are the input bounds; biga and
    // room are WATER_REACHABILITY's. Water is linear in both temperatures,
    // so their ends bound it.
    // Every mix, at the FF in use before any counted bake (MESSAGE-52): a
    // split batch's later mixes start in a bowl prefilled at DDT and ask for
    // less, so a first-mix sweep misses the cold end.
    const W = WATER_REACHABILITY;
    let lo = Infinity, hi = -Infinity, lo265 = Infinity, hi265 = -Infinity, hiBalls = 0;
    let hiCorner = { bigaTempF: NaN, roomTempF: NaN };
    for (let balls = BOUNDS.balls.min; balls <= BOUNDS.balls.max; balls++) {
      for (let w: number = BOUNDS.ballWeightG.min; w <= BOUNDS.ballWeightG.max; w++) {
        for (const bigaTempF of [W.bigaF.min, W.bigaF.max]) {
          for (const roomTempF of [W.roomF.min, W.roomF.max]) {
            const r = calculate({
              balls, ballWeightG: w, bigaTempF, roomTempF, flourTempF: roomTempF, frictionFactorF: ffBeforeLog(balls, w),
            });
            for (const { waterTempF: water } of r.mixes) {
              lo = Math.min(lo, water);
              if (water > hi) { hi = water; hiBalls = balls; hiCorner = { bigaTempF, roomTempF }; }
              if (w === C.DEFAULT_BALL_G) { lo265 = Math.min(lo265, water); hi265 = Math.max(hi265, water); }
            }
          }
        }
      }
    }
    return [
      {
        at: 'reference:water-temperature',
        restates: 'the §5 envelope: input bounds for balls and weight, WATER_REACHABILITY for biga and room',
        text: `(${BOUNDS.balls.min}–${BOUNDS.balls.max} balls, ${BOUNDS.ballWeightG.min}–${BOUNDS.ballWeightG.max} g, biga ${W.bigaF.min}–${W.bigaF.max} °F, room ${W.roomF.min}–${W.roomF.max} °F)`,
        covers: ['3–24 balls', '240–300 g', '45–60 °F', '60–84 °F'],
      },
      {
        at: 'reference:water-temperature',
        restates: 'required water across that envelope, every mix, at the FF in use, and at the default ball (59.850–118.312, 59.850–116.259)',
        text: `spans about **${fx(lo, 0)}–${fx(hi, 0)} °F**, and **${fx(lo265, 0)}–${fx(hi265, 0)} °F** at the default ${C.DEFAULT_BALL_G} g ball`,
        covers: ['60–118 °F', '60–116 °F', '265 g'],
      },
      {
        at: 'reference:water-temperature',
        restates: 'the corner the sweep finds hottest, and BIGA_TEMPER_H',
        holds: () => hiCorner.bigaTempF === W.bigaF.min && hiCorner.roomTempF === W.roomF.min,
        text: `The top of that range needs a ${W.bigaF.min} °F biga in a ${W.roomF.min} °F kitchen, which the biga's ${C.BIGA_TEMPER_H}-hour temper prevents.`,
        covers: ['45 °F', '60 °F', '1-hour'],
      },
      {
        at: 'reference:water-temperature',
        restates: 'the hottest water is at the smallest mix',
        holds: () => hiBalls === BOUNDS.balls.min,
        text: 'hottest for *small mixes*, not small batches',
        covers: [],
      },
    ] satisfies Claim[];
  })(),
];

// ---------------------------------------------------------------------------
// 2. INVENTORY — everything that is not a computed value, and why
// ---------------------------------------------------------------------------

/**
 * Literals that are NOT a computed value, grouped by what they are instead.
 * Every entry here was read in context and judged; that is the point of the
 * list, and why it is written out rather than generated.
 */
const FIXED: Record<Loc, readonly string[]> = {
  // Procedure: biga — the yeast water, the hand-mix, the published 61–65 °F
  // band, the ripeness cue. biga-1 rehydrates the yeast at 100–110 °F for 10
  // minutes (MESSAGE-51): PizzaBlab's 104 °F optimum and its 68 °F floor, King
  // Arthur's 110 °F. It carries the Giorilli dose paragraphs since MESSAGE-51
  // moved them from biga-3: Giorilli's window in °F and °C (Italian Pizza
  // Secrets), Baking With Theory's 16–20 h at 16–20 °C, PizzaBlab's 12–24 h.
  'biga-1.summary': ['100–110 °F', '10 minutes'],
  'biga-1.detail': ['104 °F', '68 °F', '16–18 h', '61–65 °F', '16–18 °C', '16–20 h', '16–20 °C', '12–24 h'],
  'biga-3.summary': ['3–6 minutes'],
  'biga-3.timerLabel': ['3–6 min'],
  'biga-3.detail': ['3–6 minutes'],
  'biga-4.summaryClassic': ['61–65 °F'],
  'biga-4.detail': ['61–65 °F'],
  'biga-5.title': ['20%'],
  'biga-5.summary': ['20%'],
  'biga-5.detail': ['20%'],
  'biga-5.troubleshoot': ['3–6 min'],
  // biga-4b's assumption (MESSAGE-51): Giorilli's window, published; the
  // fridge band bulk-4's summary prints; "Bake 1" is the bake's number.
  'biga-4b.detail': ['16–18 h', '61–65 °F', '38–40 °F', '1'],

  // Bake 1, 21 Aug 2026: the pull reading is logged but not a vector.
  'mix-1.detail': ['1', '53 °F'],
  // mix-1's nMix > 1 block has no digit since MESSAGE-38. Its "2½" sat here as
  // half of a 5-minute overrun, which was wrong: the rise cut is half the
  // PLANNED stagger, so an overrun lands whole on the first dough. The words
  // "five minutes adds five minutes" are outside this gate; timeline.test.ts
  // ('lands a changeover overrun whole on the first dough') checks them.

  // Procedure: the three bassinage additions and a loose "20 hours" of biga
  // time (AVPN's salt range is claimed above). "Bake 1" is the bake's number
  // (MESSAGE-35's weighing sentence).
  'mix-2.detail': ['1'],
  'mix-3.summary': ['3'],
  'mix-3.detail': ['20 hours'],

  // Policy: the probe's decision thresholds. The top of the extend range is
  // PHASE_C_MAX_MIN and is claimed; the rest follow from ~1 °F/min at 6 balls.
  'mix-4.troubleshoot': ['1 °F', '1–2 °F', '2–2.5 min', '2 °F'],
  'mix-5.detail': ['2 °F'], // "a properly developed one running 2 °F warm" — illustrative

  // The rest itself — the source the "10-minute rest" claims read.
  'mix-6.summary': ['10 minutes'],
  'mix-6.timerLabel': ['10 min'],
  // The mixer phases' timers: the recipe's phase times, and since MESSAGE-32
  // the one source of each phase's duration. Each summary is claimed against
  // its timer above, and the MAX_RUN_MIN profile reads them.
  'mix-2.timerLabel': ['3–4 min'],
  'mix-3.timerLabel': ['5–6 min'],
  'mix-5.timerLabel': ['3–4 min'],
  'mix-7.timerLabel': ['45–60 s'],
  // The DDT ±1 °F pass/fail gate.
  'mix-7.watchFor': ['1 °F'],
  'mix-8.detail': ['0 g', '60 g'], // illustrative residue

  // Procedure: balling, trays, fridge. (bulk-1's 45–60 is PLANNING_RANGE_H, claimed.)
  'bulk-2.summary': ['10–15 min'],
  'bulk-2.timerLabel': ['10–15 min'],
  'bulk-3.detail': ['24–36 hours'],
  'bulk-4.summary': ['38–40 °F', '4 hours'],
  // A cooling time is a claim about a 265 g ball specifically, so the weight
  // is its index rather than a stale default.
  'bulk-4.detail': ['265 g', '3–4 hours', '40 °F'],

  // Procedure: temper cues, and the oven — validated by Dave, not computed.
  'bake-1.summary': ['60–65 °F'],

  // The timeline's stage text, each restating a step's procedure figure that
  // is classified above: biga-4/biga-5's band and cue, mix-6's rest, bulk-2's
  // bench rest, bulk-4's fridge and spacing, bake-1's core target.
  'stage:bigaRoomOnly': ['61–65 °F', '20%'],
  'stage:mix': ['10-minute'],
  'stage:divideBall': ['10–15 min'],
  'stage:coldFerment': ['38–40 °F', '4 hours'],
  'stage:temper': ['60–65 °F'],
  'bake-1.detail': ['55 °F', '70 °F', '52 °F'],
  'bake-2.summary': ['750 °F', '60–90 s', '15–20 s'],
  'bake-2.detail': ['750', '750 °F', '800 °F', '15–20 s', '9–18'],
  'bake-2.troubleshoot': ['1 cm', '15 s', '5–10 s'],

  // Concepts — published sources, the flour's spec, history, and index words.
  'concept:why-biga': ['100%', '60%', '12.2–12.8%', '80%'],
  // "00" is the flour grade, as in giorilli-standard; AVPN's figures are
  // claimed above.
  'concept:formula-rationale': ['60–90 second', '12.5%', '44–50%', '45%', '00'],
  // "72" is the multi-day cold ferment the title argues against. PizzaBlab's
  // 12–24 h and biga lunga's 24 h at 39 °F are published; so is Sisofo's 24 h
  // in the fridge, which shares its literal with the claimed default and so
  // is covered by that claim at this location's granularity.
  'concept:schedule-architecture': ['72', '50-hour', '12–24 h', '39 °F'],
  // "Multiply DDT by 4" is the standard method being rejected. "Bake 1" is the
  // bake's number. The 100 °F and 110 °F figures are claimed above.
  'concept:thermal-model': ['4', '12-ball', '6-ball', '3 balls', '1'],
  // Bake 1's date and batch; published spiral friction and flour exotherm;
  // "bakes at 3 and 9 balls", the batch sizes that test the bowl model. Its
  // "3 more than the middle of the range" is computed, and the claim above
  // reads it: this entry can only excuse the literal once per location.
  'concept:friction-factor': ['1', '21', '2026', '6 balls', '20–26 °F', '3', '9 balls', '1.5–3 °F'],
  // All published (§11): Italian Pizza Secrets 16–18 h at 16–18 °C,
  // Baking With Theory 16–20 h at 16–20 °C (ideally 18), PizzaBlab 12–24 h;
  // Giorilli's 44–45% and his 50% allowance; "00" is the flour grade; 20% is
  // the biga-5 pull cue.
  'concept:giorilli-standard': ['61–65 °F', '16–18 °C', '16–18 h', '16–20 h', '16–20 °C', '18', '12–24 h', '44–45%', '50%', '00', '20%'],
  'concept:no-creep-speed': ['15 RPM'], // Ooni's published chart, which is wrong
  // The published biga band, as in biga-4 (its body names it since MESSAGE-35).
  'concept:why-61-65': ['61–65 °F'],
  // Ooni's wrong chart, quoted to reject it; Ooni's published guidance for
  // doughs at 66%+ hydration (the same threshold as FLOUR_CAP_66).
  'reference:mixer-speed': ['15 RPM', '66%'],
  // Column keys: the table is indexed by balls per mix.
  'reference:friction-rate': ['3', '6', '9'],
  // §11: what each published source states — cited, not computed. "100%" is
  // Ooni's 300 RPM anchor. PizzaBlab's 104 °F and King Arthur's 110 °F are
  // biga-1's; Grain Craft's protein; the year of AVPN's regulations; "00" and
  // "0" are grades. The Halo Core, AVPN and Grain Craft ash figures are
  // claimed above.
  // "§2.1.2" is the section of AVPN's regulation, which extracts as "2.1" and "2".
  about: ['1%', '12–24 h', '16–18 °C', '100%', '16–18 h', '44–45%', '16–20 h', '16–20 °C', '18', '45%', '50%', '104 °F', '110 °F', '12.2–12.8%', '2024', '00', '2.1', '2'],
  'concept:burn-ring': ['1', '100 °C', '1–1.5 cm', '2'],
};

// ---------------------------------------------------------------------------

describe('§8.1 every literal that restates a computed value matches the engine', () => {
  it.each(CLAIMS.map((c) => [`${c.at}: ${c.restates}`, c] as const))('%s', (_, c) => {
    const text = CONTENT.get(c.at);
    expect(text, `${c.at} does not exist`).toBeDefined();

    if (c.knownWrong) {
      // Pinned both ways: fails when the prose is corrected, and fails when the
      // engine moves so the claim would hold after all.
      expect(text, `${c.at} no longer reads as pinned — if corrected, delete knownWrong`).toContain(c.knownWrong.reads);
      if (c.holds) expect(c.holds(), `${c.at} now holds — delete knownWrong (${c.knownWrong.see})`).toBe(false);
      if (c.text !== undefined) {
        expect(text, `${c.at} now agrees with the engine — delete knownWrong (${c.knownWrong.see})`).not.toContain(c.text);
      }
      return;
    }
    if (c.holds) expect(c.holds(), `${c.at}: ${c.restates}`).toBe(true);
    if (c.text !== undefined) {
      expect(text, `${c.at} should read "${c.text}" — the engine and the prose disagree, or the prose moved`).toContain(c.text);
    }
  });

  it('pins no known discrepancy at present', () => {
    // All three pins so far came off when the spec was corrected: mix-5's 2.0
    // in MESSAGE-18, "between 2 and 5" in MESSAGE-19, §9's 80% = 250 RPM in
    // MESSAGE-28. Adding one is a decision.
    expect(CLAIMS.filter((c) => c.knownWrong).map((c) => c.at)).toEqual([]);
  });
});

describe('§8.1 every numeric literal in §8 is classified', () => {
  const claimed = new Map<Loc, Set<string>>();
  for (const c of CLAIMS) {
    const s = claimed.get(c.at) ?? new Set();
    c.covers.forEach((x) => s.add(x));
    claimed.set(c.at, s);
  }

  it('leaves no literal unclassified', () => {
    const orphans: string[] = [];
    for (const loc of CONTENT.keys()) {
      for (const lit of literalsAt(loc)) {
        if (claimed.get(loc)?.has(lit) || FIXED[loc]?.includes(lit)) continue;
        orphans.push(`${loc}  ${JSON.stringify(lit)}`);
      }
    }
    // Joined so a failure prints every orphan rather than a truncated array.
    expect(orphans.join('\n'), 'reproduce each against the engine (CLAIMS) or classify it (FIXED)').toBe('');
  });

  it('keeps no stale FIXED entry', () => {
    // An entry for a literal the prose no longer contains is a classification
    // nobody is checking any more.
    const stale = Object.entries(FIXED).flatMap(([loc, lits]) =>
      lits.filter((lit) => !literalsAt(loc).has(lit)).map((lit) => `${loc}  ${JSON.stringify(lit)}`),
    );
    expect(stale.join('\n')).toBe('');
  });

  it('never both claims and excuses a literal', () => {
    const both = Object.entries(FIXED).flatMap(([loc, lits]) =>
      lits.filter((lit) => claimed.get(loc)?.has(lit)).map((lit) => `${loc}  ${JSON.stringify(lit)}`),
    );
    expect(both.join('\n')).toBe('');
  });

  it('keeps every speed field on the measured RPM line', () => {
    // The parsed `speed.rpm` feeds the UI chip directly, separately from the
    // label text the claims check.
    for (const s of STEPS.filter((x) => x.speed)) {
      expect(s.speed?.rpm, `${s.id} rpm`).toBe(Math.round(rpmForDial(s.speed?.dial ?? NaN)));
    }
  });
});

/**
 * §8.1 applies to UI copy too. Everything above reads §8 content, so a figure
 * typed into a component is invisible to it — which is how the ball-weight
 * hint kept saying "265 g opens to about 11.5–12 inches" for three rounds
 * after §4.9 retracted that figure. It was found by hand, in MESSAGE-20's
 * sweep; this makes the next one fail instead.
 *
 * Scope: all copy in components, read from the syntax tree (`parseAst`, which
 * Vite exports) — JSX text, copy attributes, and every string inside them or
 * inside a `{…}` child: template-literal text at any nesting and quoted
 * strings in interpolations. Interpolated code is skipped; the text around it
 * is typed. Each widening found something:
 *
 * - quoted attributes only: the biga hint typed "11 °F … 3.5 °F" into a
 *   template literal (FINDINGS-25);
 * - attributes only: the probe card said Phases C and D add "about 3.7 °F",
 *   wrong at every batch size, and the timeline said "starting between 9 a.m.
 *   and 8 p.m. keeps every step in daylight", true only for the retarded
 *   schedule at 24 h. Both were JSX text (Task 8).
 */
describe('§8.1 numbers in component copy are classified too', () => {
  const COMPONENT_FIXED: Record<string, string> = {
    'Biga at 61–65 °F': 'the published fermentation band — procedure',
    'handling gains about 5 °F that the bowl does not share':
      'bake-1 history: §6, 53 °F at pull and 58 °F after tearing — one observation, which §6 forbids turning into a constant',
    'between midnight and 6 a.m.': 'the definition `isUnsocialHour` implements — §4.7 "between midnight and 6 AM"',
    '750 °F, full flame, 60–90 s, turning every 15–20 s.': 'bake-2 procedure, the same figures FIXED under bake-2.summary',
    'at mix 1': 'names mix 1 — an index, not a quantity',
    'bake 1’s figure': 'names bake 1 — an index, not a quantity',
    'Grain Craft 00': 'the flour grade in the product name',
  };

  /** Attributes that carry words a person reads. `className` and the like are not copy. */
  const COPY_ATTRS = new Set([
    'hint', 'label', 'title', 'placeholder', 'aria-label', 'alt', 'description', 'summary', 'caption', 'note', 'legend',
  ]);

  type Node = { type: string; [key: string]: unknown };
  const isNode = (v: unknown): v is Node => typeof v === 'object' && v !== null && typeof (v as Node).type === 'string';

  /** Every piece of copy in one component file. */
  function copyIn(src: string): string[] {
    const out: string[] = [];
    const push = (text: string) => {
      const t = text.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    };
    const visit = (node: unknown, copy: boolean): void => {
      if (Array.isArray(node)) return node.forEach((n) => visit(n, copy));
      if (!isNode(node)) return;
      switch (node.type) {
        case 'JSXText':
          return push(node['value'] as string);
        case 'JSXAttribute': {
          const name = node['name'] as Node;
          const attr = name.type === 'JSXIdentifier' ? (name['name'] as string) : '';
          // Not copy: don't descend at all, so a className template is never read.
          if (COPY_ATTRS.has(attr)) visit(node['value'], true);
          return;
        }
        case 'JSXElement':
        case 'JSXFragment':
          visit(node['openingElement'], false);
          // A `{…}` child renders its strings: a ternary's two wordings, a
          // template's text.
          return (node['children'] as Node[]).forEach((c) =>
            visit(c.type === 'JSXExpressionContainer' ? c['expression'] : c, c.type === 'JSXExpressionContainer'),
          );
        case 'Literal':
          if (copy && typeof node['value'] === 'string') push(node['value']);
          return;
        case 'TemplateLiteral':
          if (copy) for (const q of node['quasis'] as Node[]) push((q['value'] as { cooked: string }).cooked);
          return visit(node['expressions'], copy);
      }
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'type' && (Array.isArray(value) || isNode(value))) visit(value, copy);
      }
    };
    visit(parseAst(src, { lang: 'tsx' }), false);
    return out;
  }

  // Every .tsx under src — App.tsx renders copy too, and sat outside
  // `src/components` with "65% biga · 70% hydration" typed in it.
  const componentStrings = () =>
    (readdirSync('src', { recursive: true }) as string[])
      .filter((f) => f.endsWith('.tsx'))
      .flatMap((f) =>
        copyIn(readFileSync(join('src', f), 'utf8'))
          .filter((text) => /\d/.test(text))
          .map((text) => ({ f, text })),
      );

  it('reads copy from every place it can hide', () => {
    // The walker, checked against a fixture holding one figure in each place.
    const found = copyIn(`
      const a = <p hint="attr 1" className="x-2">jsx 3 {n} text</p>;
      const b = <F label={\`tpl 4 \${n} tail 5\`} />;
      const c = <p>{on ? 'ternary 6' : \`nested \${inner ? \`deep 7\` : 'q 8'}\`}</p>;
    `).join(' | ');
    for (const n of ['attr 1', 'jsx 3', 'text', 'tpl 4', 'tail 5', 'ternary 6', 'deep 7', 'q 8']) {
      expect(found, n).toContain(n);
    }
    expect(found, 'className is not copy').not.toContain('x-2');
  });

  it('leaves no numeric UI string unclassified', () => {
    // A classified phrase excuses itself, not the string around it. Matching
    // a whole string on any one key let the biga hint's typed "11 °F … 3.5 °F"
    // through once its fragment also held the classified "5 °F" sentence.
    const residue = (text: string) =>
      Object.keys(COMPONENT_FIXED).reduce((t, k) => t.split(k).join(' '), text);
    const orphans = componentStrings()
      .filter(({ text }) => /\d/.test(residue(text)))
      .map(({ f, text }) => `${f}: ${JSON.stringify(residue(text))}`);
    expect(orphans.join('\n'), 'bind it to the engine, or classify it here with a reason').toBe('');
  });

  it('keeps no stale entry', () => {
    const all = componentStrings().map(({ text }) => text).join('\n');
    expect(Object.keys(COMPONENT_FIXED).filter((k) => !all.includes(k))).toEqual([]);
  });
});
