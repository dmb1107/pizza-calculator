# FINDINGS-32 — re: MESSAGE-31

**607 tests green**, typecheck and build clean. Checked in the browser at
375 px, on both schedules and in both timeline modes. Everything in MESSAGE-31
is applied, and `biga-4b` works as an id.

- **Stale in the spec:** §8.2a's count table (§2).
- **Your decision:** `bulk-3`'s new timer at split batches (§3), and `biga-4`'s
  classic summary below 16 h (§4).
- **Smaller:** a repeated step title (§6), and three choices of mine you may
  overrule (§7).

Figures below are at the defaults unless stated: 6 × 265 g, room and flour
70 °F, biga 58 °F, FF 14, fridge 19 h, temper 2.5 h, cold ferment 24 h.

## 1. Applied and reproduced

- **Sequences.**
  - Retarded: biga-1, biga-2, biga-3, biga-4, biga-4b, biga-5, biga-6.
  - Classic: biga-1 to biga-5.

  The six golden sequences (`nMix` 1–3 on each schedule) are written out by
  hand.
- **Timers.**
  - `biga-4`: 2 h retarded, 16–18 h classic.
  - `biga-4b`: 18–20 h.
  - `bake-1`: 2–3 h.
  - `bulk-3`: `{roomMin}` min.

  The ranges run as windows, the way `bulk-1` does. A test now resolves every
  step's timer on both schedules and requires each one to parse as a duration,
  so "per schedule" can't come back.
- **The classic exception.** The input moves in 0.5 h steps. From 12 to 15.5 h,
  `biga-4`'s timer is the plan ("13 h"); from 16 to 18 h it is the 16–18 h
  window.
- **§7.4.** The timeline reads:
  - "Biga in the fridge 19 h (18–20)"
  - "Bulk rest 1 h (45–60 min)"
  - "Temper 2 h 30 min (2–3 h)"
  - "Biga ferments 16 h (16–18)" (classic)
- **The new literals match §4.7.** The ranges 16–18, 18–20 and 2–3 are the
  §4.7 ranges. "2 h" and "2 hours" are `bigaRoomTemp`, a single figure rather
  than a range.
  - All of them are now checked against one table of the four ranges, and the
    timeline prints from that same table. Widening one range fails every place
    that prints it: the step text, the timer, the timeline, and the stage
    check.
  - `bulk-1`'s 45–60 min moved from a classified literal to a checked one, on
    the same table.
  - The Giorilli "16–18 h" in `biga-2`, `giorilli-standard` and About stays
    classified, because those quote the published source.
- **Stage → step.** `bigaFridge` now maps to `biga-4b`. The mapping test also
  checks that each planning-point stage's step times the whole §4.7 range.

## 2. §8.2a's count table is stale

The sentence names `biga-4b`, but the table wasn't updated:

| | should read | reads |
|---|---|---|
| retarded | **20** / 28 / 36 | 19 / 27 / 35 |
| classic | 18 / 26 / 34 | 18 / 26 / 34 |

The parenthetical should read "7 or 5 biga", not "6 or 5". The test reads your
table and pins the retarded row both ways, so it fails the moment you correct it.

## 3. `bulk-3`'s timer runs long at every split batch: which number should it time?

`{roomMin}` is the unshortened ball rise. §4.7 takes half the stagger off
`ballRoomTemp` at `nMix` > 1. `bulk-1`'s split-batch block tells the baker the
calculator "takes {staggerHalfMinutes} minutes — half the spread — off the ball
room-temperature rise later on". The timer doesn't:

| Balls | `nMix` | `bulk-3` timer | Timeline ball rise |
|---|---:|---:|---:|
| 6 | 1 | 90 min | 90 min |
| 12 or 18 | 2 | 90 min | 72.5 min |
| 24 | 3 | 90 min | 55 min |
| 24, final dough measured at 76 °F (DDT 74) | 3 | 71 min | 45 min (the floor) |

`bulk-3`'s summary and values chip have printed the unshortened figure since
before this round. The timer turns that into something the baker runs. I shipped
it as specified and pinned the disagreement. The test fails when either side
moves.

The fix is yours to word. §4.7 and `bulk-1` both say the rise is shortened, so
the likely fix is for `bulk-3` to print and time the rise the timeline plans,
through a new token. The values chip could keep `{roomMin}` as the per-dough
figure beside it.

## 4. `biga-4`'s classic summary contradicts its timer below 16 h

At a planned 13 h, the step reads *"**16–18 hours** at 61–65 °F, covered so it
can't dry out. The timeline plans 13 h."*, and the timer beside it runs 13 h.
§7.5's exception covers the timer, but not the sentence, which leads with the
window in bold. It shows at every plan from 12 to 15.5 h.

Two ways to fix it:

- **Reword** so the sentence holds at both plans.
- **A conditional summary.** That's new grammar: a summary has no condition form
  today, only detail blocks do.

## 5. Your sweep request, and our gate

MESSAGE-31 says the gate reads every rendered string. It didn't:

- **Step fields.** It read a fixed list of six fields. `biga-4`'s two new timer
  fields were invisible to it, and so was every title, including `biga-5`'s
  "~20%". It now reads every string a step carries.
- **Timeline stage text.** The titles and descriptions in `timeline.ts` had
  never been read. They are now. They hold seven literals, each repeating a
  step's procedure figure: 61–65 °F, 20%, 10-minute, 10–15 min, 38–40 °F,
  4 hours and 60–65 °F.
- **Copy-as-text** prints no durations.

**Result of the sweep:** no other step prints a planning point where the recipe
has a range. The only planning points printed are the three "the timeline plans"
sentences, each beside its range. §3's issue is a computed value, not a range.

## 6. Two steps titled "Refrigerate"

`biga-4b` and `bulk-4` are both titled "Refrigerate". They sit under different
phase headings and have different ids, so nothing collides, but the list reads
the same word twice. Your own §7.4 example calls the stage "Refrigerate the
biga", which would match `biga-6`'s "Temper the biga" beside `bake-1`'s
"Temper".

## 7. Choices that are yours to overrule

- **The range only when the point is inside it.** At a classic 13 h the timeline
  shows "13 h", not "13 h (16–18)", which reads as a point inside a range it's
  outside. I read §7.4's "a planning point inside a recipe range" literally.
- **Stage titles kept.** I took your example's wording as a format, so it
  renders "Biga in the fridge 19 h (18–20)".
- **Units.** "(18–20)" when the point already reads in hours. Otherwise the unit
  is written out, "1 h (45–60 min)" and "2 h 30 min (2–3 h)", so neither can be
  misread.
