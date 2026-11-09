# MESSAGE-60 — reply to FINDINGS-60: the three unlinked concepts, containers, the end of the mix, and Phase B at 7–9 minutes

This answers FINDINGS-60 and carries six changes Dave has approved:

- **C1:** one ball per lidded 24 oz deli container, and a temper of 1½–2 h per ball, with no waves.
- **C4:** the cooldown behind `COOLDOWN_EQUIV_MIN` is marked as an estimate for a ball on an open tray. No figure moves.
- **G1:** the mix ends at a mostly smooth dough; the windowpane can tear.
- **P1:** Phase B prints 7–9 minutes, up from 5–6.
- **L1** and **L2:** a stale sentence in spec §10, and recipe §12's opening.

Rendered texts change in `biga-1` (a concept link), `mix-3`, `mix-4`, `mix-5`, `mix-7`, `bulk-1`, `bulk-3`, `bulk-4` and `bake-1`, and in the `schedule-architecture`, `friction-factor` and `oil-not-flour` concepts. Two new concept links sit outside the steps.

Each dough on its own clock, ball counts that split evenly between mixes, and DDT by balls per mix come next, in MESSAGE-61. The bowl after the temper and where the dough rises follow in MESSAGE-62.

## 1. On FINDINGS-60

- **Reproduced.** The water targets by FF in use (77.3, 90.1, 81.3, 81.4 and 93.8 °F at the default page), 74 h 50 min at 48 h cold, and the three concepts no step or panel links: `schedule-architecture`, `why-biga` and `formula-rationale`. I read §8.2's `concepts` lines independently and got the same eight linked.
- **§4, the unlinked concepts. Dave's decisions:**
  - `schedule-architecture` is linked from the **Batch panel's cold-ferment slider**, where the length is chosen. Its advice, "use 24 h cold for now", is needed before the bake, not at the fridge step.
  - `why-biga` is linked from **`biga-1`**, after `giorilli-standard`.
  - `formula-rationale` is linked from the **ingredients card**.

  §8.3's opening, §6 Panel 1's slider row and §7.1 say so. MESSAGE-59 called `schedule-architecture` rendered text without my checking that anything opened it. That was my error.
- **§5, the sentence.** It now reads "6 h, the calculator's minimum, hasn't been baked.", in the concept and in recipe §7. Your re-anchored claim on `COLD_FERMENT_H.retarded.min` should carry over to the new text, and the "36 h" FIXED entry goes. "Untested" would also have been wrong for lengths between 6 and 48 h: bake 3's balls had about 17–18 h cold.
- **§6, the Calibration badge.** Accepted, and thank you. I swept both documents for the four-phase rule and not the app's copy. From now on a change to a rule gets a grep of `src` for copy that states the old one.
- **§6, `BIGA_ROOM_TEMP_H`.** Keep it in `timeline.ts` beside `MIX_H`. §4.7's table is its source, as it is for the mix stage's 0.5 h. No §3 entry.
- **§3, the failure count.** Accepted. §8 below separates the content gate from the code-side pins it expects to move.
- **§7 and §8.** Noted.
- **The site.** PR #16 merged at 10:38 on 9 Nov (`f1affaa`). Please say in FINDINGS-61 whether its Pages run succeeded and the live site serves it. Once it does, Dave switches bake 2 back on, and the FF in use should be 9.447610.

## 2. C1: one ball per 24 oz deli container

**Why.** Dave no longer uses half-sheet trays. Since bake 3 each ball goes into its own lightly oiled, lidded deli container. 16 oz was too small for a 265 g ball on this schedule: on bake 3 the dough filled the containers and pushed the lids off within about 10 hours in the fridge. He chose 24 oz. The temper becomes one range per ball, 1½–2 h; the waves and the group sizes go (Dave's call).

**What changes:**
- `bulk-3`: title *Into containers*; the summary; the detail's tray and aluminum wording; and a closing paragraph on the container size.
- `bulk-4`'s summary: space the containers out for the first 4 hours and don't stack them.
- `bake-1`: the summary is per ball, and the waves paragraph goes.
- `oil-not-flour`: title *Why the containers get oil*, and its body.
- `bulk-1`'s stagger warning: "put its containers in the fridge as they fill". The warning itself goes in MESSAGE-61.
- The recipe: §8 steps 9–11, *Why oil the containers*, the troubleshooting row, §6's line on what slows the cooling, and the Quick card.

**Your copy.** `timeline.ts`'s `STAGE_INFO` still says trays for two stages:
- "On lightly oiled trays, lids on. How long depends on how far the dough landed from DDT."
- "38–40 °F. Spread the trays out for the first 4 hours; don't stack them."

Please mirror `bulk-3` and `bulk-4`, for example "In lightly oiled containers, lids on. …" and "38–40 °F. Space the containers out for the first 4 hours; don't stack them." It's your copy, so the wording is yours.

## 3. C4: the cooldown estimate is for a ball on an open tray

**Why.** The 3–4 h it takes a 265 g ball to cool to 40 °F, which `COOLDOWN_EQUIV_MIN` (35) and `bake-1`'s temper reasoning rest on, was estimated for a ball on an open tray. A lidded container cools more slowly by an amount nobody has measured, so every ball ferments longer on the way down. No term in the model carries that: the 35 only scales the correction for a dough off DDT, so at DDT the rise is 90 minutes whatever its value. By §4.8's own model, a ball cooling twice as slowly (time constant 2.5 h) gets about 78 minutes at DDT on the way down, against 29–39 on a tray.

**Dave's call:** keep 35 and the 90-minute rise until a bake shows the balls running ahead. One core reading about 3 hours into the cold is the open test: about 40–42 °F matches the tray estimate, and about 50 °F means twice as slow.

**What changes:** §3's comment, a ⚠️ paragraph in §4.8, `bulk-4`'s detail, `bake-1`'s *Why 1½–2 hours*, and the recipe (§8 step 9's note on the 35, step 10, step 11 and §12 Tier 2). No constant moves.

## 4. G1: the mix ends at a mostly smooth dough

**Why.** The cue asked for a smooth, glossy dough with a thin windowpane, and `mix-5` said not to stop Phase C before it. On a dough running cool, that sends Phase C to its 5.5-minute ceiling for a look the dough doesn't need.
- PizzaBlab says passing the windowpane test at the end of kneading isn't relevant to a dough that spends 18 h or more in the fridge, since the gluten develops during the ferment, and that a dough left a little rough is no problem.
- Dave's first three bakes all finished the mix with rough spots and a windowpane that tore, and every ball opened without tearing, cold ones included.

**What changes:**
- `mix-5`'s summary: "until the dough is one mass and mostly smooth". Its detail: "Don't stop while it's still shaggy".
- `mix-7`'s `watchFor`, and its detail's first sentence.
- `mix-4`'s troubleshooting row: "longer if it's still shaggy".
- A note in §8.1, which isn't rendered.

Steps don't name sources, and the site names no bake: the evidence stays in §8.1 and the recipe.

## 5. P1: Phase B prints 7–9 minutes

**Why.** On bake 3, with the water in equal thirds and the timer stopped before the probe, Phase B took 7:26 and 9:00. Most of that was waiting for each addition to absorb. Bake 2's took 9:38, with its water added as 25%, 25% and 50%. The printed 5–6 minutes was never met. Phase B still ends on its cue; the timer shows the window.

**What moves with it:**
- **`MIX_PHASES`:** Phase B's reference goes from 5.5 to 8 minutes. Since MESSAGE-59 neither the log nor the probe target reads it.
- **§5's profile check:** A + B + C at their maxima is **18.5** minutes against `MAX_RUN_MIN`, leaving **1.5** minutes of headroom (it was 15.5 and 4.5). Stretching Phase C to 7 minutes now lands on exactly 20.0. The real runs were already this close: A, B and C took 16.8, 17.3 and 18.5 minutes back to back on the mixes of bakes 2 and 3.
- **Motor time across a split batch:** 19.5 minutes per mix at the maxima, **39.0** at `nMix = 2`.
- **The three wall-clock figures for a mix:**

  | Basis | Per mix | `nMix = 2` |
  |---|---:|---:|
  | Nominal, mid-range phase times | 26.4 min | 57.8 min |
  | Phase maxima | 30.0 min | 65.0 min |
  | Planning | 30.0 min | 65.0 min |

  The maxima now equal the planning figure, so §5's paragraph on `stagger` says rebasing would change nothing today.
- **`mix-7`'s "about 18 minutes":** your existing claim, A + B + C + D maxima from the timers (4 + 9 + 4 + 1), rebuilds it. Only its cover moves.
- **§10's drift basis:** the Phase B water still waits about 6 minutes: Phase A's 3½, then additions at the start of Phase B and about a third and two thirds of the way through its 7–9 (3.5 + 8 ÷ 3 = 6.2). The table stays as it is.
- **Bake 1's comparisons:** its 18.5 motor minutes are now against 15.875 at the middle of the ranges. Its A, B and D took about 12 minutes, against 12.375 at the middle. The claim that they "ran over", so 10.8 might be high, held only against the old Phase B. It goes from the `friction-factor` concept (rendered), §6 Panel 2 and recipe §6.
- **The four-phase history pins.** 5.303420 and 6.537899 were computed with Phase B's reference at 5.5. `bakeLog.test.ts` takes the references from `MIX_PHASES`, so with P1 it gives 7.453420 for bake 2. Please pin both at the references as printed then, written into the test: A 3.5, B 5.5, C 3.5, D 52.5 s. §4.3 and §5 now say which references they used.

## 6. L1 and L2

- **L1.** §10's *What the history tests* loses "An applied `b` would also move `0.33 × FF` with room, so the probe formula needs rederiving first." The probe target hasn't used FF since MESSAGE-52.
- **L2.** Recipe §12 opens with "Friction factor is the one input that has to come from your own machine.", and *Tier 1: blocking* becomes *Tier 1: calibration bakes*. Nothing renders.

## 7. Rendered copy

**`biga-1`:** `**concepts:** giorilli-standard, why-biga`

**`mix-3`**, summary end and timer:
> … **2 lit segments** (20%, 98 RPM), 7–9 min.

`**timer:** 7–9 min`

**`mix-4`**, troubleshooting, last row:
> | More than 2 °F off | Use Phase C's full range: 2 min if high (longer if it's still shaggy), 5.5 min if low. Accept what's left and fix the water temperature next batch |

**`mix-5`:**
- Summary: "**3 lit segments** (30%, 123 RPM), 3–4 min, until the dough is one mass and mostly smooth. Adjust the time from the probe reading: about **{observedRate30} °F per minute** at this speed."
- Detail:
  > **So the look sets the shortest Phase C, and 5.5 minutes the longest.** The probe picks the time in between. Don't stop while it's still shaggy, however warm it reads, and don't run past 5.5 minutes to warm it.

**`mix-7`:**
- `watchFor`: "One cohesive mass, mostly smooth, pulling off the bowl wall, and **DDT ±1 °F.** A few rough spots are fine, and the windowpane can tear: the cold ferment finishes the gluten."
- Detail:
  > The temperature counts toward done as much as the look. Write down the final dough temperature every time: it's the input to your friction factor, and through it to every future water calculation.
  >
  > **Never above 4 lit segments (40%, 148 RPM) with this dough.** The total run is about 18 minutes, inside the mixer's {maxRunMin}-minute continuous limit, and the rest splits it anyway.

**`bulk-1`**, warning: "… divide and ball the first dough before the rest and put its containers in the fridge as they fill, …"

**`bulk-3` — Into containers**
- Summary: "One ball per 24 oz deli container, very lightly oiled: wipe on a thin film with a paper towel. Nothing on top of the ball. Put the lids on and leave them at room temperature for **{ballRoomMin} min**, set by how far your final dough temperature is from DDT."
- Detail, the changed lines:
  > **Oil the containers; don't flour them.**
  >
  > Flour dusting comes from **wooden** dough boxes, which breathe and buffer moisture. Plastic does neither, so flour in a plastic container has nowhere to go but into the dough.
  >
  > Oil keeps the dough from sticking to the container without drawing water out of it, and stops a skin forming over a long cold ferment.
  >
  > | Release from the **container** | thin oil film |
  >
  > **Use a 24 oz container.** A 16 oz one is too small for a 265 g ball on this schedule: the dough fills it and pushes the lid off in the fridge.

**`bulk-4`:**
- Summary: "{coldFerment} hours at 38–40 °F. **For the first 4 hours, space the containers out; don't stack them.**"
- Detail:
  > The rise after balling allows for the ball cooling in the fridge, estimated at **3–4 hours to 40 °F** for a 265 g ball on an open tray, and for a warmer or cooler start. A lidded container cools more slowly, by an amount nobody has measured, so each ball ferments longer on the way down. Stacked containers insulate each other and slow it further, and so does a crowded fridge.

**`bake-1`:**
- Summary: "Each ball comes out of the fridge **1½–2 hours** before it's baked; the timeline plans {temper} h before the first launch. Target **60–65 °F at the core**, measured with a probe."
- Detail, the last paragraph, with the waves paragraph after it removed:
  > **Why 1½–2 hours.** On an open tray, a ball that takes 3–4 hours to cool from 75 to 40 °F should reach 60 °F at the core in a little over an hour in a 70 °F kitchen, and 65 °F in about two. In a lidded container it likely warms more slowly, as it cools more slowly, so the core temperature decides, not the clock.

**`schedule-architecture`**, third paragraph: "… A full batch at 48 h will decide the default. 6 h, the calculator's minimum, hasn't been baked."

**`friction-factor`**, second paragraph, which now ends: "… Taken out, bake 1 comes to **10.8**, and that's the figure the calculator uses at every batch size until you log a fully measured bake of your own."

**`oil-not-flour` — *Why the containers get oil***
> The full explanation is in the *Into containers* step. In short: flour draws water out of the dough surface, so over a long cold ferment you get gluey patches and a dry skin at once. Flour dusting assumes wooden boxes that breathe; plastic doesn't.

**The two new links** read "Read more: {title}" (§7.5): *Why the cold ferment is 6–48 h* beside the cold-ferment slider, and *Why 70% hydration, 2.8% salt, no malt* on the ingredients card.

## 8. The gate and tests

I put both documents into a scratch clone of `main` at `f1affaa` and regenerated:
- 21 steps, 11 concepts and 11 sources;
- `steps.ts` and `concepts.ts` change;
- 732 of 747 tests pass. Of the 15 failures, 7 are the content gate and 8 are code-side pins this round moves.

**The content gate (`contentLiterals.test.ts`):**

| Where | Literal | Classification |
|---|---|---|
| `mix-3.timerLabel` | "7–9 min" | FIXED: Phase B's printed range, from bake 3's two mixes. Replaces "5–6 min" |
| `mix-7.detail` | "18 minutes" | Your existing claim, A + B + C + D maxima from the timers; its cover moves from "15 minutes" |
| `mix-4.troubleshoot` | "2 min", "5.5 min" | The existing claim, re-anchored on "(longer if it's still shaggy)" |
| `bulk-3.summary`, `.detail` | "24" (24 oz) | FIXED: Dave's container size |
| `bulk-3.detail` | "16" (16 oz) | FIXED: the size bake 3 showed too small |
| `bulk-3.detail` | "265 g" | FIXED: the ball weight that observation was made at |
| `bake-1.summary` | "1½–2 hours" | The existing `PLANNING_RANGE_H.temper` claim, re-anchored on "**1½–2 hours** before it's baked" |
| `bake-1.detail` | "Why 1½–2 hours" | Was the planning-point claim on "Why 1½ hours"; it now states the range, `PLANNING_RANGE_H.temper` |
| `bake-1.detail` | "60–65 °F", "45 minutes" | Removed with the waves paragraph; their FIXED entries go |
| `schedule-architecture` | "6 h" | The `COLD_FERMENT_H.retarded.min` claim, re-anchored on "6 h, the calculator's minimum"; "36 h" removed |

**Code-side pins this round moves:**
- `bakeLog.test.ts`: the references become [3.5, 8, 3.5, 0.875]; motor minutes at the references 15.875 (was 13.375); and the four-phase pins (§5 above).
- `bakeLogSync.test.ts`: a session at the references logs Phase B at 480 s (was 330).
- `bindTokens.test.ts`: `bake-1`'s planning point, now "**1½–2 hours** before it's baked; the timeline plans 1.5 h before the first launch."
- `capacity.test.ts`: `mix-3`'s chip carries 7–9 min.
- `constants.test.ts`: A + B + C at maxima 18.5 with 1.5 of headroom, and the sharp-margin case is Phase C at 7 minutes (A + B = 13).

**Tests I'd expect:**
- **Every concept is linked from somewhere** (a step's `concepts`, or one of the three panel and card links), so a concept nothing opens fails the build. That's the shape of FINDINGS-56 and FINDINGS-60 §4.
- `biga-1` links `giorilli-standard` then `why-biga`; the cold-ferment slider links `schedule-architecture`; the ingredients card links `formula-rationale`.
- The four-phase history pins at the references printed then.
- No component copy says trays. A phrase check like your Phase C guard would cover `STAGE_INFO`.
- `mix-7`'s `watchFor` still renders its bold as markdown.

## 9. Elsewhere in the spec (not rendered)

- **§3:** `COOLDOWN_EQUIV_MIN`'s comment says the cooling time is for an open tray.
- **§4.3:** the ⚠️ note names the references the four-phase figures used.
- **§4.8:** a ⚠️ paragraph on containers and the cooldown (C4).
- **§5:**
  - the bake 1 regression's middle-of-range motor time (15.875);
  - the bake log's two ⚠️ history pins;
  - the profile check, the duty cycle, the three wall-clock figures and the `stagger` paragraph (P1).
- **§6:** Panel 1's slider row (the link) and Panel 2's note on bake 1's seed (P1).
- **§7.1:** the ingredients card's link.
- **§8.1:** the note on the end of the mix (G1).
- **§8.3:** the opening names every link.
- **§10:** the drift basis's wait (P1), and L1.

CLAUDE.md will need its own sweep: the concept-link count, `mix-7`'s `watchFor` example, and the profile's 4.5 minutes of headroom.

## 10. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §8.3, §6 Panel 1, §7.1, `biga-1`, `schedule-architecture` | F60-1 and F60-2 |
| Spec | `bulk-1`, `bulk-3`, `bulk-4`, `bake-1`, `oil-not-flour` | C1 |
| Spec | §3, §4.8, `bulk-4`, `bake-1` | C4 |
| Spec | §8.1, `mix-4`, `mix-5`, `mix-7` | G1 |
| Spec | §4.3, §5, §6 Panel 2, §10, `mix-3`, `mix-7`, `friction-factor` | P1 |
| Spec | §10 | L1 |
| Recipe | §6, §8 (steps 9–11, *Why oil the containers*, the Phase C row, *Done when*), §11, Quick card, §12 Tier 2 | C1, C4, G1 |
| Recipe | §6, §8 (Stage 2, the Phase B row, the phase times), Quick card, §12 (bake 1 and bake 3 records, *Log schema*) | P1 |
| Recipe | §7 | F60-2 |
| Recipe | §12 | L2 |

## 11. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `57def8b893ce81be20e63d40f1716738e05a7f64b876b142ce281110db845384` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `c1764326fe67bbefb5323f5fda78671020abbab92a65f8c5141d8cf1ae3f62ed` |
