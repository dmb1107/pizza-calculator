# FINDINGS-45 — unprompted: the bake log, Dave's asks

Sent after FINDINGS-44, which needed no reply, so a reply to this one is
MESSAGE-45. It carries Dave's asks for Task 11, the bake log, from 27
September. **Nothing is built and nothing renders differently yet.** The
storage choice is made. How the log turns into the FF the calculator uses is
a question about the numbers, so it comes to you before any code does.

## 1. What Dave asked

- One bake history shared between his laptop and his phone, with the site
  still on GitHub Pages.
- Each bake refines the FF for its mix size from the temperatures he
  measured, so that every size he bakes ends up calibrated.
- The history sets the FF the calculator uses. He doesn't type an FF.
- He logs the FF inputs only, not the full §10 diary (biga rise, oven, stone,
  crumb notes).
- A friend opening the link gets a working calculator that saves nothing
  anywhere but their own browser.

## 2. Storage: decided, and the spec says otherwise in three places

The log lives in a private GitHub repository, one JSON file per bake. The
site reads and writes it from the browser through GitHub's API with a token
that can reach only that repository, pasted once on each device. Each device
writes its own copy first and syncs after, so a mix never waits on the
network. Without a token the calculator keeps everything in browser storage,
as it does now. The repository's files are plain JSON, so they are the
export.

None of that is dough science, but the spec names `localStorage` in:

- **§2**, "calibration + preferences persist to `localStorage`";
- **§6 Panel 3**, "Store a map of `ballsPerMix → measuredFF` in
  `localStorage`" and "Seed it with `{6: {value: 14.03, …}}`";
- **§10**, "`localStorage`, with JSON export", and the schema.

Your wording. §5 and §6 below decide what Panel 3 says in place of the
stored map.

## 3. What a logged bake holds

The §4.3 solve (`solveFrictionFactorF`) takes, and the log would hold:

| Scope | Field | Where it comes from |
|---|---|---|
| Bake | date, `balls`, `ball_g` | the batch inputs; they fix the masses, `nMix` and the key |
| Bake | `room_temp_f`, `flour_temp_f` | Panel 2 |
| Mix | `biga_temp_at_mix_f` | Panel 2, per mix, after tearing |
| Mix | `bowl_temp_f` | Panel 2, per mix; the prefill if not measured (§5.4) |
| Mix | `water_temp_used_f` | **new input**: the app computes the target but never asks what was poured |
| Mix | `final_dough_temp_f` | **new per mix**: the app asks once, on the last mix |

`ff_measured` and `predicted_mix_temp_f` are derived from those, so we'd
store the readings and solve on read. If a constant moves, every bake
re-solves with it. That is what went wrong with the seed: the stored 14.04
couldn't be reproduced, and re-solving bake 1 from its logged inputs gave
14.031 (MESSAGE-25). **Can §10 drop both as stored fields?**

**§4.8 reads one `T_actual`, and doesn't say which mix's.** The app takes it
from the last mix, the dough that goes into the tub last. With a reading per
mix, earlier mixes' readings would feed only the log. **Is the last mix the
right one for §4.8?**

How much a 1 °F error in each reading moves the solved FF, from the engine
(bake 1's temperatures: biga and bowl 58, flour 69, room 70 °F, water 63,
final 73.5; 265 g balls). 12 balls runs as two 6-ball mixes and matches the 6
column exactly:

| Reading, +1 °F | 3 per mix | 6 per mix | 9 per mix |
|---|---:|---:|---:|
| Final dough | +1.219 | +1.109 | +1.073 |
| Biga | −0.531 | −0.531 | −0.531 |
| Water | −0.333 | −0.333 | −0.333 |
| Bowl | −0.219 | −0.109 | −0.073 |
| Flour | −0.131 | −0.131 | −0.131 |
| Room | −0.005 | −0.005 | −0.005 |

The final reading is the one to get right. Room enters the solve only through
the salt, so it matters to the §10 regression as the variable, not as a
reading error. It is logged either way, so the regression stays possible
with FF inputs only.

## 4. Phase durations, which decide what a logged FF means

The solve assigns every degree the ingredients and bowl don't explain to FF.
Every mixer phase has a printed range, and `mix-4`'s table moves Phase C
from 2 to 5.5 min on the probe reading. One extra minute of Phase C adds
`FRICTION_RATE[30]` = 1.08 °F to the solved FF at every mix size (on the
thermometer, 0.89 / 0.97 / 1.01 °F at 3 / 6 / 9 balls per mix, §4.6's
observed rates). From `FRICTION_RATE`:

| Phase | Printed range | FF across the range |
|---|---|---:|
| A (15%) | 3–4 min | 0.75 |
| B (20%) | 5–6 min | 0.86 |
| C (30%) | 3–4 min | 1.08 |
| D (20%) | 45–60 s | 0.215 |
| All four | every phase at its lower bound against every phase at its upper | **2.905** |
| C, probe-adjusted | cut to 2 min against extended to 5.5 min | **3.78** |

The probe adjustment also runs in one direction. A mix whose water came out
cold probes low and gets a longer Phase C, which raises its solved FF. A
warm mix gets a shorter one and a lower FF. Read naively, the history would
learn the baker's corrections along with the mixer.

Questions:

1. **Does the solve need each phase's actual duration**, normalized to a
   reference profile by `FRICTION_RATE × (actual − reference)`?
2. **If so, what is the reference?** The range midpoints, bake 1's
   durations, or something else. §4.6's `0.33 × FF` for Phases C and D
   implies one.

If durations are needed, they cost Dave no typing. Each mixer phase has a
timer (MESSAGE-32), so the app can take a phase's duration from the timer's
start to when it is stopped. How to capture the stop is ours; whether it's
needed is yours.

## 5. How history becomes the FF in use

This is the rule we won't guess.

1. **The aggregate.** For a mix size with several logged mixes: the latest,
   the mean, the last N, weighted toward recent bakes, or something else.
   A split batch gives one measurement per mix, so a 12-ball bake gives the
   6 entry two.
2. **Confidence.** Panel 3 badges "estimated — not yet calibrated" or
   "measured {date}". What should it say with history behind it, and when
   does a size count as calibrated? Dave's aim is to trust it at every size
   he bakes.
3. **Exclusions.** With FF inputs only there is no motor-protection or
   overrun field. Is any mix left out automatically, does Dave get a switch
   to leave one out, or do all count?
4. **An unmeasured bowl.** A mix logged with the bowl prefill instead of a
   reading. A 5 °F bowl error is 0.547 °F of FF at 6 balls per mix. Include
   it, leave it out, or weight it? Bake 1 is that case: its bowl was
   assumed 58, and 53 solves to 14.578 (the recipe records both). Does
   bake 1 enter the history, stay as the seed until a measured 6-ball bake
   replaces it, or go?
5. **The room slope.** Once §10's `FF = a + b × (room_temp_f − 70)` can be
   fitted, is `b` applied to today's FF or only reported? From how many
   bakes?
6. **Sizes without their own history.** Across 3–24 balls × 240–300 g the
   key takes 19 values: 3–10, and 4.5, 5.5, 5.667, 6.333, 6.5, 6.667,
   7.333, 7.5, 7.667, 8.5 and 9.5. At 265 g it takes 15: 3–9, plus eight
   that occur at one batch each (5.5 at 11 balls, 6.5 at 13, 7.5 at 15,
   8.5 at 17, 6.333 at 19, 6.667 at 20, 7.333 at 22, 7.667 at 23). Under
   §6's exact match, those eight calibrate only by baking that batch.
   Should a size with no history fall back to 14.0 as now, borrow from the
   nearest measured size, or read a fit across sizes? A fit across sizes
   would test §10's other hypothesis, that FF rises with mix size.

## 6. Panel 3's FF field

Dave wants the FF set by his measurements, so we propose removing the typed
FF field. Panel 3 would show the value the history gives for the current
mix size, with whatever §5.2 decides it says. The DDT override stays. If
you'd keep a manual override for FF, say why and we'll put it to Dave.
