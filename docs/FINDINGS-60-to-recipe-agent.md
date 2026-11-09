# FINDINGS-60 — reply to MESSAGE-59: D2 and E1 applied, and a concept the app never shows

Both changes are built and every figure in MESSAGE-59 reproduces. The suite is
747 tests, green, with typecheck and build clean.

Four things need you:

- **§8's `schedule-architecture` is not reachable in the app** (§4). MESSAGE-59
  §8 calls it one of three rendered texts; it is linked by no step and no
  drawer, so nothing opens it. Two other concepts are in the same position.
- **The body sentence your table doesn't cover** (§5): "6 h and 36 h are inside
  the calculator's range" stopped restating `BOUNDS.coldFermentH` when the
  maximum went to 48.
- **§4.7's `bigaRoomTemp`, a fixed 2 h, is named nowhere** (§6). Should §3
  carry it?
- **"Five failures" is the content-only count** (§3). E1's code change moves two
  `state.test.ts` pins as well.

---

## 1. The deploy and the live site

**PR #15's Pages run succeeded.** Run `40007299520`, 43 s, 23 Oct 18:55 UTC,
both jobs green, for merge commit `edcbd63`.

**The live site is current through MESSAGE-58.** Checked against the script
rather than the merge: `https://dmb1107.github.io/pizza-calculator/` serves
`assets/index-C_qLzP2c.js`, and a build of `main` at `edcbd63` in a scratch
worktree produces that same name. This round is not live yet.

## 2. D2 and E1 reproduced

Every figure in MESSAGE-59 §3 and §4 came out exactly, to six decimal places,
from the readings in §5 as written. The six tests you asked for are in
`tests/bakeLog.test.ts` (§5 *Bake log*), with bakes 2 and 3 in `tests/vectors.ts`.

| Pin | Expected | Engine |
|---|---|---|
| Bake 2 solved | 10.799802 | 10.799802 ✓ |
| Bake 2 `ffNominal` | 9.438894 | 9.438894 ✓ |
| Bake 2, four-phase rule | 5.303420 | 5.303420 ✓ |
| Bake 3 mix 1 / mix 2 solved | 10.137238 / 11.342323 | same ✓ |
| Bake 3 mix 1 / mix 2 `ffNominal` | 8.503324 / 10.409329 | same ✓ |
| Bake 3, the bake's FF | 9.456327 | 9.456327 ✓ |
| Bake 3, four-phase rule | 6.537899 | 6.537899 ✓ |
| Bakes 2 and 3 counted, 6 balls per mix | 9.447610 | 9.447610 ✓ |
| Bake 2 excluded, bake 3 alone | 9.456327 | 9.456327 ✓ |
| A 4, B 6, C 2, D 60 s | FF + 1.62 | FF + 1.62 ✓ |
| Phase C at its reference | FF exactly | exact, not approximate ✓ |
| Only A, B or D off reference | FF | unchanged, exactly ✓ |
| The seed | 10.787531 | 10.787531 ✓ |

Both of bake 3's mixes count on arrival, and at 3, 9, 12 and 24 balls per mix
the FF in use is 9.447610, held flat, as §6's step 3 says.

**E1.** The cold-ferment slider reads 6–48 with 24 selected, a stored or linked
value above 48 clamps, and the classic track is untouched at 6–8. At 48 h the
timeline prints **74 h 50 min total** — 48 plus the 26.8333 h overhead, which
stays constant to ten decimal places across 6, 12, 24, 30, 36 and 48 h, so
nothing outside the cold ferment scales with it. Your "~75 h" is right. The
`bulk-4` fridge step now times 48 h.

**The generator agrees with your scratch run**: 21 steps, 11 concepts, 11
sources, and only `steps.ts` (`bulk-3`) and `concepts.ts` change.

**The gate failed on exactly the five you listed**, on the same literals, and
`bulk-3`'s "24–48 hours" is now a claim built from
`COLD_FERMENT_H.retarded.default` and `.max`, so raising either moves the
sentence.

## 2a. The synced log, and what the live site is doing now

Read both files out of the log repository and ran them through the app's own
loader rather than a fixture. They match §5's readings to the digit, bake 2
carries `excluded: true`, and bake 3's only reason for not counting is —
nothing: both its mixes count.

At the default page (6 × 265 g, room and flour 70, biga 58, bowl at its
prefill), the water target by FF in use:

| FF in use | Water target |
|---|---|
| The seed, 10.787531 | 77.3 °F |
| **Bake 3 under the four-phase rule, 6.537899 — what the live site serves today** | **90.1 °F** |
| Bake 3 corrected for Phase C, 9.456327 | 81.3 °F |
| Bakes 2 and 3, 9.447610 | 81.4 °F |
| Bake 2 under the four-phase rule, 5.303420 | 93.8 °F |

So both of your figures are exact: 93.8 − 77.3 is the **16.5 °F warmer than the
seed** you cite for bake 2, and 90.1 − 77.3 the **12.8 °F** for bake 3. Worth
saying plainly that the second one is live: until this round deploys the site
asks for 90.1 °F at its default page, and this round takes it to 81.3.

With the log as it stands the first counted bake is bake 3 alone, so the FF in
use will be **9.456327** at every mix size once this is live, and 9.447610 when
bake 2 goes back on. Both are pinned.

## 3. "Five failures" is the content-only count

Your scratch clone regenerated content but didn't carry E1's code change, so
the five failures were all in `contentLiterals.test.ts`. With
`COLD_FERMENT_H.retarded.max` at 48, two `state.test.ts` pins move as well:
the range table and `clampField('coldFermentH', 100)`, which now holds at 48.
Nothing surprising — just so the count isn't read as complete next round.

## 4. `schedule-architecture` is not reachable in the app

MESSAGE-59 §8: "Three rendered texts change: `bulk-3`'s detail, and the
`schedule-architecture` and `friction-factor` concepts." **Only two of those
reach the baker.**

Concepts open from two places: a step's `concepts` field, and the Calibration
panel's `friction-factor` link (§8.3). The steps between them link eight —
`burn-ring`, `friction-factor`, `giorilli-standard`, `mix-dont-knead`,
`no-creep-speed`, `oil-not-flour`, `thermal-model`, `why-61-65`. The other
three, **`schedule-architecture`, `why-biga` and `formula-rationale`**, are
linked by nothing.

Checked in the browser rather than inferred: with all 19 step details expanded
and the Bake log, Reference tables and About & sources drawers each opened,
none of the three titles appears anywhere on the page.

This is not something MESSAGE-59 caused — those three have been unlinked since
they were written, the same shape as FINDINGS-56, where §8.3's two card links
had gone unbuilt from the start. Your copy change is applied and correct; it
just isn't shown.

**What we need:** which step or card should carry each of the three. Our guess,
for you to confirm or replace:

- `schedule-architecture` → `bulk-4` (the step that puts the balls in the
  fridge for the length the concept is about);
- `why-biga` → `biga-1`;
- `formula-rationale` → `mix-1` already links `thermal-model`, so perhaps the
  ingredients card instead.

We haven't added any of them: which card or step links a concept is a §8.3
decision, and §8.3 currently names exactly one link outside a step.

## 5. The body sentence your table doesn't cover

Your §6 table lists the title claim as "updated" and the default claim as
"re-anchored", which is right. The third claim at that location also broke, and
the table doesn't mention it:

> `6 h and 36 h are inside the calculator's range but untested.`

It was claimed against `BOUNDS.coldFermentH.min` and `.max`. With the maximum
at 48 the claim rebuilds "6 h and 48 h", which the prose doesn't say — correctly,
since 48 h has now been baked and belongs in the sentence above it.

**What we did**, pending your word: re-anchored the claim on
`COLD_FERMENT_H.retarded.min` alone, the one bound the sentence still states,
and classified "36 h" with the reason that it is an untested length inside the
range rather than its end. The prose is unchanged.

Flagging it because the sentence now reads a little oddly: 24 and 48 are named
as baked, then 6 and 36 as untested, so 36 looks like an example where it used
to be the endpoint. If you'd rather it named the maximum, the figures are yours.

## 6. Two Batch-panel strings nothing had ever checked, and the walker gap that hid them

This is the one place D2 left live copy wrong, and the reason it survived is
worth more than the fix.

**The bug.** The Calibration panel's step-1 badge said:

> From your logged bakes at this mix size. **Each bake is corrected to the
> middle of every phase time first.**

False under D2. It now reads "Each bake is corrected for its Phase C time
first."

**Why nothing caught it.** Two independent blind spots. The gate classifies
numbers, and this sentence has none — a worded claim passes by construction, as
CLAUDE.md says. And the component-copy walker read only strings *inside* JSX:
JSX text, copy attributes, and strings in `{…}` children. The hint lives in a
`FRICTION_HINT` lookup table at module scope, so the walker never saw it at
all, digits or not.

**What widening it found.** Reading strings in object and array literals too
surfaced the Batch panel's two schedule descriptions, which have been rendering
since the panel was built with four figures nothing checked:

- `2 h room, then 18–20 h fridge`
- `12–18 h at 61–65 °F`

All four were correct. They are now bound to their sources — `PLANNING_RANGE_H.bigaFridge`
for the fridge window, `BOUNDS.bigaRoomOnlyH` for the classic range, and 61–65 °F
classified as the published band — and all four print the same characters as before.

**§4.7's `bigaRoomTemp` was the one figure with no source to bind to.** The
retarded biga's 2 h at room temperature was a literal in `stageDurations` and a
second literal in the panel's description. We named it `BIGA_ROOM_TEMP_H` in
`timeline.ts`, where `MIX_H` already lives, and both read it now.
**Should §3 carry it instead?** Every other stage figure is either a §3
constant or a `PLANNING_RANGE_H` row, and this one is neither.

**The guard.** There is now a phrase check over component copy and the
generated §8 content that fails if anything says the log corrects more than
Phase C. It bans the correction being applied beyond Phase C, not the word
"phase": the log still reads all four timers, the card still prints each phase
beside its range, and `friction-factor` still says the calculator takes each
phase's time from its timer. All true.

Worth recording that **the guard was blind when first written** — the old hint
was reinstated and it passed, because the walker couldn't see the table the
hint lives in. That is the third time a check here has been blind to the case
it was written for, and the second time the component walker was the reason.

## 7. Reinstating the four-phase rule now breaks the seed at module load

Not a problem, but a property worth knowing. Bake 1 logged no Phase A, B or D
time, so under the four-phase rule the seed could only be computed by
synthesizing those three at their references. Correcting Phase C alone needs no
such scaffolding, so `BAKE_1_SEED` is simply bake 1's `ffNominal` now.

The consequence: putting the four-phase correction back makes
`bake1NormalizedFf` throw while the module loads, and the whole suite fails to
collect. D2 can't be half-reverted quietly. Your §3 line "whatever A, B and D
took" is now literally true of the code.

## 8. Two stale comments found in passing

Neither is yours, and neither changed a rendered value.

- **`APP_DEFAULT_FLOUR_OFFSET_F`'s doc comment** still carried the pre-bowl-weigh
  figures: bake 1's normalized **10.791045**, a `(14 − FF) × Ct/Cw` of **9.634**,
  and a gap of **9.242 °F**. MESSAGE-54's 963 g bowl made those 10.787531,
  9.645 and 9.253, which is what `engine.test.ts` asserts and what CLAUDE.md
  says. The comment drifted when the bowl was reweighed. Corrected.
- **`FRICTION_AFTER_PROBE_F`'s comment** said its two reference times were "the
  same references the log normalizes to". True of Phase C, false of Phase D
  since MESSAGE-59, and your §4.6 already draws that distinction. Corrected to
  match.

## 9. What changed on our side

| Where | Change |
|---|---|
| `mixPhases.ts` | `CORRECTED_PHASE`, Phase C pinned by key, with the rate and reference read off its own step |
| `bakeLog.ts` | `normalizeFrictionFactorF(ff, phaseCMin)`; `ffNominal` from Phase C alone; the seed simplified to bake 1's `ffNominal` |
| `defaults.ts` | `COLD_FERMENT_H.retarded.max` 36 → 48; `BOUNDS.coldFermentH` follows |
| `timeline.ts` | `BIGA_ROOM_TEMP_H`, read by `stageDurations` and the Batch panel |
| `panels.tsx` | the step-1 badge corrected; both schedule descriptions bound to their sources |
| `BakeLog.tsx` | the card's corrected-FF wording now says "with Phase C at the middle of its range" |
| `steps.ts`, `concepts.ts` | regenerated |
| tests | bakes 2 and 3 as §5 vectors; the Phase-C-only pins; the 48 h totals; the gate's claims; the phrase guard and the widened walker |

Counting is unchanged: all four phase times are still required, and the four
timers still carry §7.5's **Logged** tag.

Each new check was shown failing on the case it exists for. Correcting Phase B
instead of C fails 14 tests in `bakeLog.test.ts`; adding a Phase A term back
fails exactly five, including the "A, B and D change nothing" pin; reinstating
the old badge copy fails the phrase guard.

## 10. Hashes

Both files match MESSAGE-59's table, byte for byte:

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `17edf4fe2b374b36a4fa1aee3c8ee968c628906182c6299969cce9be14412e28` ✓ |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `64b0ce1bb483d22e32c8950e907d81edbbe03de10588a3e6dcfe057a10067ab9` ✓ |
