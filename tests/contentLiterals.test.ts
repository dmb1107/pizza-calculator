import { describe, expect, it } from 'vitest';
import { STEPS, type Step } from '../src/content/steps';
import { CONCEPTS } from '../src/content/concepts';
import { ABOUT_INTRO, REFERENCE, SOURCES } from '../src/content/reference';
import { CAPACITY } from '../src/content/capacity';
import { NEAR_LIMIT_FRACTION } from '../src/lib/capacity';
import { C, bowlHeatCapacity, defaultDdtF, rpmForDial } from '../src/lib/constants';
import {
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
import { BOUNDS } from '../src/state/defaults';
import { BAKE_1, WATER_REACHABILITY } from './vectors';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAst } from 'vite';
import { formatPercent } from '../src/lib/format';

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
  for (const c of CONCEPTS) put(`concept:${c.id}`, c.body);
  // The timeline's stage titles and descriptions render on the timeline card,
  // and are typed in timeline.ts — invisible to both halves of this gate until
  // MESSAGE-31 put ranges on the timeline.
  for (const [key, { title, description }] of Object.entries(STAGE_INFO)) {
    put(`stage:${key}`, title);
    put(`stage:${key}`, description);
  }
  // §9 and §11 render too (Task 9), so they answer to the same gate.
  for (const r of REFERENCE) put(`reference:${r.id}`, r.body);
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

/** Probe target at FF 14 and the batch's default DDT. */
const probeAt = (balls: number, roomTempF: number) =>
  computeProbeTargetF({ ddtF: defaultDdtF(balls), frictionFactorF: 14, roomTempF, thermal: thermalAt(balls) });

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

/** Phase C's planned minutes: the midpoint of `mix-5`'s printed range. */
const PHASE_C_MIN = mid(speedOf('mix-5').minutes);

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

/** A planning range as prose prints it, "18–20", scaled to the prose's unit. */
const span = (key: StageKey, scale = 1) => {
  const [lo, hi] = PLANNING_RANGE_H[key] as readonly [number, number];
  return `${lo * scale}–${hi * scale}`;
};

const CLAIMS: readonly Claim[] = [
  // --- speeds: every "N% / R RPM" is RPM = 47.4 + 2.526 × N, and prose leads
  // with the lit segments N ÷ 10 (§7.5, MESSAGE-29) ----------------------------
  ...(['mix-2', 'mix-3', 'mix-5', 'mix-7'] as const).flatMap((id): Claim[] => {
    const { dial, minutes } = speedOf(id);
    const pair = `${dial}% / ${rpm(dial)} RPM`;
    const range = minutes[0] === minutes[1] ? `~${minutes[0]} min` : `${minutes[0]}–${minutes[1]} min`;
    return [
      { at: `${id}.speed`, restates: 'rpmForDial', text: `${pair}, ${range}`, covers: [`${dial}%`, `${rpm(dial)} RPM`, range.replace('~', '')] },
      {
        at: `${id}.summary`,
        restates: 'the speed field\'s dial as lit segments, then dial and rpmForDial',
        text: `**${segWords(dial)}** (${dial}%, ${rpm(dial)} RPM)`,
        covers: [String(Math.floor(dial / C.INDICATOR_PCT_PER_SEGMENT)), `${dial}%`, `${rpm(dial)} RPM`],
      },
      // mix-7's summary says "45–60 seconds" where its speed field rounds to
      // "~1 min"; that pair is procedure, classified in FIXED.
      ...(minutes[0] === minutes[1]
        ? []
        : [{ at: `${id}.summary`, restates: 'the speed field\'s minutes', text: range, covers: [range] }]),
    ];
  }),
  { at: 'mix-2.detail', restates: 'rpmForDial(5), the dial floor', text: `slowest setting is ${rpm(5)} RPM`, covers: [`${rpm(5)} RPM`] },
  { at: 'mix-2.detail', restates: 'rpmForDial(15)', text: `onto flour at ${rpm(15)} RPM`, covers: [`${rpm(15)} RPM`] },
  { at: 'mix-3.detail', restates: 'rpmForDial(20)', text: `At ${rpm(20)} RPM the hook`, covers: [`${rpm(20)} RPM`] },
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
  { at: 'concept:no-creep-speed', restates: 'rpmForDial(5)', text: `**${rpm(5)} RPM is the floor.**`, covers: [`${rpm(5)} RPM`] },

  // --- mix-4: the probe ----------------------------------------------------
  {
    // The worked example is `{frictionRemainingF}` / `{restExchangeF}` /
    // `{probeGapF}` since MESSAGE-18 — only the rest's length is still typed.
    at: 'mix-4.detail',
    restates: "the rest's length, from mix-6's timer",
    text: `the ${step('mix-6').timerMinutes}-minute rest will move the dough`,
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
    restates: 'a 62–78 °F kitchen moves the target > 3 °F; 3→9 balls moves it a fraction of that at every FF the input allows (0–40)',
    holds: () => {
      const roomShift = probeAt(6, 62) - probeAt(6, 78);
      const batchShift = (ff: number) => {
        const target = (b: number) =>
          computeProbeTargetF({ ddtF: defaultDdtF(b), frictionFactorF: ff, roomTempF: 70, thermal: thermalAt(b) });
        return Math.abs(target(3) - target(9));
      };
      const ffs = Array.from({ length: 41 }, (_, i) => i * (BOUNDS.frictionFactorF.max / 40));
      return roomShift > 3 && ffs.every((ff) => batchShift(ff) < roomShift);
    },
    text: 'A 62 °F kitchen against a 78 °F one shifts the target by more than three degrees; going from 3 balls to 9 shifts it by a fraction of that',
    covers: ['3 balls', '9', '62 °F', '78 °F'],
  },
  {
    at: 'mix-4.detail',
    restates: "computeProbeTargetF's coefficients, read off its behaviour",
    holds: () => {
      const t = thermalAt(6);
      const at = (ff: number, room: number) =>
        computeProbeTargetF({ ddtF: 75, frictionFactorF: ff, roomTempF: room, thermal: t });
      const ffCoeff = (at(14, 70) - at(15, 70)) / (t.cTotal / t.cSystem);
      return Math.abs(ffCoeff - 0.33) < 1e-9 && Math.abs(at(14, 69) - at(14, 70) - 0.2) < 1e-9;
    },
    text: 'DDT − 0.33 × FF × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)',
    covers: ['0.33 ×', '0.2 ×'],
  },
  {
    at: 'mix-4.troubleshoot',
    restates: 'PHASE_C_MAX_MIN, as the top of the extend range',
    text: `Extend Phase C to 4.5–${C.PHASE_C_MAX_MIN} min`,
    covers: [`4.5–${C.PHASE_C_MAX_MIN} min`],
  },

  // --- mix-5: Phase C's authority, and the friction rates -------------------
  {
    at: 'mix-5.detail',
    restates: 'observedRate(30) × minutes cut/added from the planned Phase C, at 6 balls',
    text:
      `At 6 balls, cutting it to 2 minutes saves only **${fx(observedRate(30, thermalAt(6)) * (PHASE_C_MIN - 2), 1)} °F** ` +
      `and stretching it to ${C.PHASE_C_MAX_MIN} minutes adds only **${fx(observedRate(30, thermalAt(6)) * (C.PHASE_C_MAX_MIN - PHASE_C_MIN), 1)} °F**`,
    covers: ['6 balls', '2 minutes', '1.5 °F', `${C.PHASE_C_MAX_MIN} minutes`, '1.9 °F'],
  },
  {
    at: 'mix-5.detail',
    restates: 'the same authority at 3 and 9 balls',
    text: (() => {
      const cut = (b: number) => fx(observedRate(30, thermalAt(b)) * (PHASE_C_MIN - 2), 1);
      const add = (b: number) => fx(observedRate(30, thermalAt(b)) * (C.PHASE_C_MAX_MIN - PHASE_C_MIN), 1);
      return `narrower at 3 balls (−${cut(3)} / +${add(3)}) and slightly wider at 9 (−${cut(9)} / +${add(9)})`;
    })(),
    covers: ['3 balls', '−1.3', '1.8', '9', '−1.5', '2.0'],
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
      `— ${fx(ctOverTot(3), 2)} at 3 balls, ${fx(ctOverTot(6), 2)} at 6, ${fx(ctOverTot(9), 2)} at 9 — which at 30% gives an observed ` +
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
    restates: 'A + B + C + D maxima from the speed fields',
    text: `Total run time is about ${['mix-2', 'mix-3', 'mix-5', 'mix-7'].reduce((n, id) => n + speedOf(id).minutes[1], 0)} minutes`,
    covers: ['15 minutes'],
  },

  // --- sensitivities ---------------------------------------------------------
  {
    at: 'biga-6.detail',
    restates: '(Cb + C_bowl)/Cw — bowl tracking the biga, which is what the temper does',
    text: `${fx(bigaSensitivity(6, 'tracking'), 1)} °F at a 6-ball mix, ${fx(bigaSensitivity(3, 'tracking'), 1)} °F at a 3-ball one`,
    covers: ['1.9 °F', '6-ball', '2.3 °F', '3-ball'],
  },
  {
    at: 'mix-1.detail',
    restates: 'C_bowl/Cw at 3 balls',
    text: `It is worth ${fx(bowlOverWater(3), 2)} °F of water per degree at a 3-ball mix.`,
    covers: ['0.66 °F', '3-ball'],
  },
  { at: 'mix-1.detail', restates: 'BAKE_1.tBigaF, after tearing', text: `${BAKE_1.tBigaF} °F once broken apart`, covers: [`${BAKE_1.tBigaF} °F`] },
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
  { at: 'biga-1.detailWhen', restates: 'BIGA_HYDRATION', text: `stiff ${fx(C.BIGA_HYDRATION * 100, 0)}% hydration biga`, covers: ['50%'] },
  { at: 'biga-3.detail', restates: 'MIN_DOUGH', text: `mixer's ${C.MIN_DOUGH} g minimum`, covers: [`${C.MIN_DOUGH} g`] },
  { at: 'mix-3.detail', restates: 'SALT', text: `At ${fx(C.SALT * 100, 1)}% the salt`, covers: ['2.8%'] },

  // --- yeast -----------------------------------------------------------------
  {
    at: 'biga-2.detail',
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
    text: `fresh to instant at ${fx(C.FRESH_TO_IDY, 2)}, instant to active-dry at ×${C.IDY_TO_ADY} — which lands on ${fx(C.ADY_OF_BIGA_FLOUR * 100, 3)}% exactly`,
    covers: ['0.30', '1.25', '0.375%'],
  },
  {
    at: 'concept:giorilli-standard',
    restates: 'the rounded 0.38% against ADY_OF_BIGA_FLOUR',
    text: `a ${fx((0.0038 / C.ADY_OF_BIGA_FLOUR - 1) * 100, 1)}% disagreement`,
    covers: ['1.3%'],
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
  { at: 'biga-4.summaryClassic', restates: 'PLANNING_RANGE_H.bigaRoomOnly', text: `**${span('bigaRoomOnly')} hours** at`, covers: [`${span('bigaRoomOnly')} hours`] },
  { at: 'biga-4.timerLabelClassic', restates: 'PLANNING_RANGE_H.bigaRoomOnly', text: `${span('bigaRoomOnly')} h`, covers: [`${span('bigaRoomOnly')} h`] },
  {
    at: 'biga-4.detail',
    restates: '§4.7 bigaRoomTemp, then PLANNING_RANGE_H.bigaFridge',
    text: `${BIGA_ROOM_H} h at room temperature, then ${span('bigaFridge')} h in the fridge`,
    covers: ['2 h', '18–20 h', '2 hours'],
  },
  { at: 'biga-4b.summary', restates: 'PLANNING_RANGE_H.bigaFridge', text: `for **${span('bigaFridge')} hours**`, covers: ['18–20 hours'] },
  { at: 'biga-4b.timerLabel', restates: 'PLANNING_RANGE_H.bigaFridge', text: `${span('bigaFridge')} h`, covers: ['18–20 h'] },
  { at: 'biga-4b.detail', restates: 'PLANNING_RANGE_H.bigaFridge', text: `${span('bigaFridge')} hours is the window`, covers: ['18–20 hours'] },
  { at: 'bulk-1.summary', restates: 'PLANNING_RANGE_H.bulkRest', text: `${span('bulkRest', 60)} min at room temperature`, covers: ['45–60 min'] },
  { at: 'bulk-1.timerLabel', restates: 'PLANNING_RANGE_H.bulkRest', text: `${span('bulkRest', 60)} min`, covers: ['45–60 min'] },
  { at: 'bake-1.summary', restates: 'PLANNING_RANGE_H.temper', text: `**${span('temper')} hours** before baking`, covers: ['2–3 hours'] },
  { at: 'bake-1.timerLabel', restates: 'PLANNING_RANGE_H.temper', text: `${span('temper')} h`, covers: ['2–3 h'] },

  // --- concepts: the formula -------------------------------------------------
  { at: 'concept:why-biga', restates: 'BIGA_FRACTION', text: `Why ${fx(C.BIGA_FRACTION * 100, 0)}% and not 100%`, covers: ['65%'] },
  { at: 'concept:why-biga', restates: 'BIGA_FRACTION', text: `stop at ${fx(C.BIGA_FRACTION * 100, 0)}%`, covers: ['65%'] },
  { at: 'concept:why-biga', restates: '1 − BIGA_FRACTION', text: `Holding ${fx((1 - C.BIGA_FRACTION) * 100, 0)}% of the flour out`, covers: ['35%'] },
  { at: 'concept:formula-rationale', restates: 'HYDRATION', text: `**${fx(C.HYDRATION * 100, 0)}% hydration**`, covers: ['70%'] },
  { at: 'concept:formula-rationale', restates: 'BIGA_HYDRATION', text: `**${fx(C.BIGA_HYDRATION * 100, 0)}% biga hydration**`, covers: ['50%'] },
  { at: 'concept:formula-rationale', restates: 'SALT', text: `**${fx(C.SALT * 100, 1)}% salt**`, covers: ['2.8%'] },

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
    text: `At a 3-ball mix it absorbs ${fx(thermalAt(3).bowlShare * 100, 0)}% of the mixer's work; at a 9-ball mix, ${fx(thermalAt(9).bowlShare * 100, 1)}%`,
    covers: ['3-ball', '18%', '9-ball', '6.8%'],
  },
  {
    at: 'concept:thermal-model',
    restates: 'C_bowl/TOT at 6 and 3 balls; the 0.3 is the 6-ball figure',
    text: `— ${fx(thermalAt(6).bowlShare, 2)} °F per 1 °F at 6 balls, ${fx(thermalAt(3).bowlShare, 2)} at 3 — so a 3 °F misestimate costs ${fx(3 * thermalAt(6).bowlShare, 1)} °F`,
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
    text: `the same FF of 14 would appear as ${fx(14 * ctOverTot(3), 1)} °F in a 3-ball mix and ${fx(14 * ctOverTot(9), 1)} °F in a 9-ball one`,
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
        text: "most with the coldest biga, where the water is already hottest. Your kitchen temperature doesn't change it.",
        covers: [],
      },
    ] satisfies Claim[];
  })(),
  {
    at: 'concept:thermal-model',
    restates: 'maximum required water at 3 and 9 balls — the hot corner, biga 45, room 60',
    text: (() => {
      const hot = (b: number) =>
        computeWaterTempF({ ddtF: defaultDdtF(b), frictionFactorF: 14, bigaTempF: 45, flourTempF: 60, roomTempF: 60 }, thermalAt(b));
      return `runs to about ${fx(hot(3), 0)} °F where a 9-ball mix asks for ${fx(hot(9), 0)} °F`;
    })(),
    covers: ['107 °F', '9-ball', '90 °F'],
  },
  {
    at: 'concept:thermal-model',
    restates: "bake 1's miss on the day: 67.97 required against 63.0 used (BAKE_1)",
    text: `made this calculation ${fx(BAKE_1.waterRequiredF - BAKE_1.waterUsedF, 0)} °F wrong on the first real bake`,
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
    text: `1.00 °F/min observed on the dough-plus-bowl system is ${fx(1.0 / ctOverTot(6), 2)} °F/min dough-only, against ${fx(C.FRICTION_RATE[30], 2)} predicted`,
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
    restates: 'FF 14 × Ct/TOT at 3 and 9 balls',
    text: `the raw temperature rise differs (${fx(14 * ctOverTot(3), 1)} vs ${fx(14 * ctOverTot(9), 1)})`,
    covers: ['11.5', '13.0'],
  },
  {
    at: 'concept:friction-factor',
    restates: 'observedRate(30) rounds to 1 °F/min at 6 balls',
    holds: () => fx(observedRate(30, thermalAt(6)), 0) === '1',
    text: 'Roughly +1 °F per additional minute at 30%',
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
    text: `Fridge water reaches ~${C.WATER_MIN_F} °F`,
    covers: ['38 °F'],
  },
  ...(() => {
    // The §5 envelope. Balls and ball weight are the input bounds; biga and
    // room are WATER_REACHABILITY's. Water is linear in both temperatures,
    // so their ends bound it.
    const W = WATER_REACHABILITY;
    let lo = Infinity, hi = -Infinity, lo265 = Infinity, hi265 = -Infinity, hiBalls = 0;
    for (let balls = BOUNDS.balls.min; balls <= BOUNDS.balls.max; balls++) {
      for (let w: number = BOUNDS.ballWeightG.min; w <= BOUNDS.ballWeightG.max; w++) {
        for (const bigaTempF of [W.bigaF.min, W.bigaF.max]) {
          for (const roomTempF of [W.roomF.min, W.roomF.max]) {
            const f = computeFormula({ balls, ballWeightG: w });
            const t = { ddtF: defaultDdtF(balls), frictionFactorF: C.DEFAULT_FF, bigaTempF, flourTempF: roomTempF, roomTempF };
            const water = computeWaterTempF(t, computeThermal(f, C.BOWL_MASS_G, computeCapacity(f).nMix));
            lo = Math.min(lo, water);
            if (water > hi) { hi = water; hiBalls = balls; }
            if (w === C.DEFAULT_BALL_G) { lo265 = Math.min(lo265, water); hi265 = Math.max(hi265, water); }
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
        restates: 'required water across that envelope and at the default ball (53.2–108.7, 53.3–106.6)',
        text: `spans **${fx(lo, 0)}–${fx(hi, 0)} °F**, and **${fx(lo265, 0)}–${fx(hi265, 0)} °F** at the ${C.DEFAULT_BALL_G} g default`,
        covers: ['53–109 °F', '53–107 °F', '265 g'],
      },
      {
        at: 'reference:water-temperature',
        restates: 'the hottest water is at the smallest mix',
        holds: () => hiBalls === BOUNDS.balls.min,
        text: 'hottest at *small mixes*, not small batches',
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
  // Procedure: biga — the hand-mix, the published 61–65 °F band, the ripeness cue.
  // Giorilli's window in °F and °C, PizzaBlab's wider one (§11 sources);
  // Gozney's 100% biga recipe.
  'biga-2.detail': ['16–18 h', '61–65 °F', '16–18 °C', '12–24 h', '100%'],
  'biga-3.summary': ['3–6 minutes'],
  'biga-3.timerLabel': ['3–6 min'],
  'biga-3.detail': ['100%', '3–6 minutes'],
  'biga-4.summaryClassic': ['61–65 °F'],
  'biga-4.detail': ['61–65 °F'],
  'biga-5.title': ['20%'],
  'biga-5.summary': ['20%'],
  'biga-5.detail': ['20%'],
  'biga-5.troubleshoot': ['3–6 min'],

  // Bake 1, 21 Aug 2026: the pull reading is logged but not a vector.
  'mix-1.detail': ['1', '53 °F'],
  // Half of an illustrative 5-minute overrun; the §4.7 centring that halves
  // the stagger is asserted in timeline.test.ts ('subtracts half the stagger').
  'mix-1.detailWhen': ['2'],

  // Procedure: motor-protection rest (Ooni), the three bassinage additions,
  // the published Neapolitan salt range, and a loose "20 hours" of biga time.
  'mix-2.detail': ['5 minutes'],
  'mix-3.summary': ['3'],
  'mix-3.detail': ['20 hours', '2.5–3.0%'],

  // Policy: the probe's decision thresholds. The top of the extend range is
  // PHASE_C_MAX_MIN and is claimed; the rest follow from ~1 °F/min at 6 balls.
  'mix-4.troubleshoot': ['1 °F', '1–2 °F', '2–2.5 min', '2 °F'],
  'mix-5.detail': ['2 °F'], // "a properly developed one running 2 °F warm" — illustrative

  // The rest itself — the source the "10-minute rest" claims read.
  'mix-6.summary': ['10 minutes'],
  'mix-6.timerLabel': ['10 min'],
  // Phase D by the clock, which the speed field rounds to "~1 min"; the
  // DDT ±1 °F pass/fail gate.
  'mix-7.summary': ['45–60 seconds'],
  'mix-7.watchFor': ['1 °F'],
  'mix-8.detail': ['0 g', '60 g'], // illustrative residue

  // Procedure: balling, trays, fridge. (bulk-1's 45–60 is PLANNING_RANGE_H, claimed.)
  'bulk-2.summary': ['10–15 min'],
  'bulk-2.timerLabel': ['10–15 min'],
  'bulk-3.detail': ['24–36 hours'],
  'bulk-4.summary': ['38–40 °F', '4 hours'],
  // A cooling time is a claim about a 265 g ball specifically, so the weight
  // is its index rather than a stale default.
  'bulk-4.detail': ['265 g', '3–4 hours', '40 °F', '50 °F'],

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
  'concept:why-biga': ['100%', '60%', '300', '12.5%', '12.2–12.8%', '80%'],
  'concept:formula-rationale': ['60–90 second', '12.5%', '44–50%', '45%', '0.55%', '2.5–3.0%'],
  'concept:schedule-architecture': ['2 h', '6–36 h', '50-hour', '12–24 h', '24 h', '39 °F'],
  // "Multiply DDT by 4" is the standard method being rejected. "Toward 100 °F"
  // is directional: it depends on the unmeasured fridge (open item 3) — the
  // engine gives 102.6 at a 45 °F biga in a 70 °F room.
  'concept:thermal-model': ['4', '12-ball', '6-ball', '3 balls', '100 °F'],
  // Bake 1's date and batch; the retired DDT − 4; published spiral friction
  // and flour exotherm; the bake-2/3 hypothesis "FF holds near 14".
  // "Bakes 2 and 3" are the planned bakes, by number (§12).
  'concept:friction-factor': ['1', '21', '2026', '6 balls', '4', '20–26 °F', '14', '3', '9 balls', '2', '1.5–3 °F'],
  // All published (§11): Gozney / Italian Pizza Secrets 16–18 h at 16–18 °C,
  // Baking With Theory 16–20 h at 16–20 °C (ideally 18), PizzaBlab 12–24 h;
  // Giorilli's 44–45% and his 50% allowance; "00" is the flour grade; 20% is
  // the biga-5 pull cue.
  'concept:giorilli-standard': ['61–65 °F', '16–18 °C', '100%', '16–18 h', '16–20 h', '16–20 °C', '18', '12–24 h', '44–45%', '50%', '00', '20%', '0.38%'],
  'concept:no-creep-speed': ['15 RPM'], // Ooni's published chart, which is wrong
  // Ooni's wrong chart, quoted to reject it; Ooni's published guidance for
  // doughs at 66%+ hydration (the same threshold as FLOUR_CAP_66).
  'reference:mixer-speed': ['15 RPM', '66%'],
  // Column keys: the table is indexed by balls per mix.
  'reference:friction-rate': ['3', '6', '9'],
  // §11: what each published source states — cited, not computed. Gozney's
  // 61–64 °F is its own conversion of 16–18 °C; "100%" is in recipe titles.
  about: ['1%', '12–24 h', '16–18 °C', '100%', '16–18 h', '61–64 °F', '44–45%', '16–20 h', '16–20 °C', '18', '45%', '50%'],
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
