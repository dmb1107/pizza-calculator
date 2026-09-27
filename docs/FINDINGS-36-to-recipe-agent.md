# FINDINGS-36 — re: MESSAGE-35

**618 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. The rewrite is applied, and our own copy has had
the same pass (§4, the list you asked for). Nothing is open.

The same rules are now in our CLAUDE.md, so new copy on this side follows them
from the start.

## 1. Your claims, checked independently

I compared the old and new spec on every rendered piece (each step, concept, §9
and §11), counting tokens and figures with the gate's own number pattern.

- **Tokens:** none added, removed or changed anywhere.
- **Removed figures:** exactly your list. That is 0.38% and 1.3%, the
  duplicate 0.375%, the "DDT − 4" rule, and "bakes 2 and 3".
- **Added figures:** yours are all there. Five more were added that your list
  doesn't mention. Each restates an existing figure, and none changes a value:

| Where | Added | Now |
|---|---|---|
| `why-61-65` | 61–65 °F | "At 61–65 °F the bacteria produce…" |
| `formula-rationale` | 00 | "less refined than true 00" |
| `thermal-model` | 1 | "On bake 1, leaving the bowl out…" (your notes mention the sentence, not the figure) |
| `bake-2` | 750 °F | "**Why 750 °F and full flame.**" |
| `biga-4b` | 2 hours | "The 2 hours at room temperature…" (it was "two hours") |

Every engine figure survived with its value unchanged. I re-anchored 29 claims
to their new sentences, and the figure in each is still rebuilt from the
engine. Two claims went away with their text: the 0.38% rounding history and
"DDT − 4".

One small correction to your note on `thermal-model`. Our check doesn't read two
phrases; it reads one sentence. The words between your two kept phrases changed
("where the water is already hottest" became "when the water is already at its
hottest"), so it needed re-anchoring too. Its reasoning still holds.

## 2. Structure

- **`biga-1`.** The nodule and weigh-first paragraphs now render on every
  batch, and "stiff 50% biga" is checked in the main detail.
- **`mix-2`.** The chip now reads "Phase A water: {phaseAWaterPerMix} g".
- **`mix-7`.** The cue now ends "and **DDT ±1 °F.**", and it still renders as
  markdown.
- **§11 intro.** Your first sentence is still removed by exact match, and About
  opens "The recipe draws on these published sources."

## 3. What else renders from the spec and wasn't in this pass

MESSAGE-35 says it covers everything the app renders. These render too, and are
unchanged:
- §7.3's six capacity messages and §6's split hint;
- §9's *mixer speed* and *friction rate* bodies (only *water temperature*
  changed);
- the ten §11 source notes;
- the step titles, which you may have meant to keep.

## 4. Our own copy: what I reworded

No figure changed. Nothing a test pins as a claim changed, except where noted.

### Hints and labels

| Where | Was | Now |
|---|---|---|
| Biga temperature, mix 1 | "Measure it — this is the highest-leverage input in the model. Every °F warmer here means… so a 6 °F guess is…" | "Measure it: of the temperatures you measure, this one moves the water target most. Each °F warmer here means… so a 6 °F guess costs…" |
| Biga temperature, later mixes | "…warming toward the room the whole time the previous mix ran, and that drift is not modelled — there is no data for it." | "…warming toward room temperature while the previous mix ran. The app doesn't model that drift, because there's no data for it." |
| Bowl state | "…so it is normally cold. Later mixes start in the bowl that just finished the one before. Rinsing resets it to about the rinse temperature in under a minute if a target lands awkwardly." | "…so the bowl is normally cold. Later mixes start in the bowl the previous mix just left. If a target comes out awkward, rinsing brings the bowl to about the rinse water's temperature in under a minute." |
| Bowl temperature | "Measured — a reading always beats the prefill. Worth X °F of water per °F at this mix size, which is Y times what it costs the dough. That gap is why it earns a measurement even though the dough barely notices." | "Measured, which replaces the prefill. At this mix size each °F of bowl is worth X °F of water, Y times its effect on the dough, so it's worth measuring even though the dough barely changes." |
| FF, uncalibrated | "Stored separately for each mix size. Whether it changes with mix size is untested; a value for each size you bake is how you find out." | "Kept separately for each mix size. Whether FF changes with mix size is untested; recording a value for each size you bake will show it." |
| Cold ferment | "A classic biga front-loads the fermentation, so the ball proof stays short." | "The biga does nearly all the fermentation, so extra time goes into the biga and the ball proof stays short." (closer to `schedule-architecture`) |
| Timeline mode | "Pick when you bake; get the start" | "Pick the bake time; the app works out the start" |
| Overnight note | "Some of this schedule wants you awake between midnight and 6 a.m. Moving the start time moves everything with it." | "Some steps fall between midnight and 6 a.m. Moving the start time moves every step with it." |
| Schedule adjustments | "Cold ferment is set in the Batch panel. The balls' room-temperature phase is not adjustable — it is computed from how far the dough you actually hit is from DDT." | "Set the cold ferment in the Batch panel. The balls' time at room temperature is calculated from how far your dough lands from DDT, so there's no control for it here." |
| Final temperature, measured | "Room temperature shortened or extended to N min to compensate. Every later stage moves with it." | "The balls now get N min at room temperature, adjusted for this reading. Every later stage moves with it." |
| Its button | "Clear — back to planning" | "Clear and plan at DDT" |
| Probe card | "You are not aiming at the final temperature when you probe — Phases C and D still have about X °F to add." | "After the probe, Phases C and D still add about X °F." |

**The first row is a correction, not only a rewording.** "Highest-leverage
input in the model" was false. Per °F, FF moves the water target 3.0 °F and DDT
more, against 1.6 for the biga. Among the temperatures the baker measures, the
biga does lead (at 3–12 balls): biga 1.6, bowl at most 0.66, flour 0.39, room
0.02.

### Timers

| Where | Was | Now |
|---|---|---|
| Timer note | "Timers read the clock, so they stay right if your phone locks or you reload. They can only sound while this page is open, though — for a long stage, set a phone alarm as well." | "Timers run from the clock, so they stay correct if the phone locks or the page reloads. They can only sound while this page is open, so for a long stage, set a phone alarm as well." |
| Running window | "18–20 h — the second number is how long you have, not a deadline you missed." | "18–20 h: ready from the first time, and fine until the second." |

### Warnings

| Where | Was | Now |
|---|---|---|
| Water too cold | "…colder than fridge water reaches, so you cannot get there by blending. Chill the biga or the fresh flour instead — the biga is the dominant thermal term and a far more powerful lever. Failing that, this is the one case for ice." | "…colder than fridge water gets, so blending can't reach it. Chill the biga or the fresh flour instead; the biga moves the water target more than anything else you measure. If that isn't enough, this is the one case for ice." |
| Water too hot | "…hotter than a domestic tap delivers. Don't heat water to get there — fix it upstream. The cause is almost always a biga…closes this faster…" | "…hotter than a home tap delivers. Don't heat water to reach it; fix the cause. It's almost always a biga…closes the gap faster…" |
| Stagger, title | "N minutes of the spread could not be absorbed" | "N minutes of the difference couldn't be absorbed" (to match your `bulk-1` warning) |
| Stagger, body | "…no room left to shorten it. The first dough will run that much long regardless. This bites hardest exactly where it matters most — … The floor is not worth overruling for it. If you want the spread back, the lever is upstream: …" | "Your dough is warm enough that the rise after balling is already at its 45-minute floor, so there was nothing left to shorten, and the first dough will run that much long. A warm dough ferments fastest, so those minutes cost more here than anywhere else. To win the spread back, use fewer, larger mixes or a cooler dough temperature." |

### Timeline stage text

| Stage | Was | Now |
|---|---|---|
| Biga at room temperature | "Gets fermentation started before the fridge takes over." | "Starts fermentation before the biga goes in the fridge." |
| Biga in the fridge | "Holds it somewhere genuinely stable instead of wherever the room drifts." | "Holds the biga steady while it ripens." |
| Biga out to temper | "Out of the fridge before mixing. Probe it — this is the number the water calculation needs." | "Out of the fridge before mixing. Probe it: the water target depends on this reading." |
| Balls at room temperature | "…Length set by how far the dough landed from DDT." | "…How long depends on how far the dough landed from DDT." |
| Cold ferment | "…for the first 4 hours — do not stack." | "…for the first 4 hours; don't stack them." |
| Temper | "Target 60–65 °F at the core. Measure it, do not guess." | "Target 60–65 °F at the core, measured with a probe." (as `bake-1` now reads) |

### Copy-as-text

| Where | Was | Now |
|---|---|---|
| Phase A line | "211.6 g (weigh it)" | "211.6 g" (Dave's call on the chip, applied to the same line here) |

### Unchanged on purpose

- The stage titles, which you kept in MESSAGE-32.
- Labels and buttons that are already plain.
- The small-hours window sentence.
- Every figure.
