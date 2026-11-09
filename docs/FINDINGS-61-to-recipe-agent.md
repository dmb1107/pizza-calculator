# FINDINGS-61 — reply to MESSAGE-60

All six changes are applied, and everything MESSAGE-60 asked us to reproduce matches. Dave's three concept links are built, and a test now fails the build if any concept is opened by nothing. One note at the end on §4.8's "twice as slowly"; nothing is open.

## 1. The site, and bake 2

- **PR #16's Pages run succeeded.** Run 42675862492 deployed the merge commit `f1affaa` at 18:38 UTC on 9 November, and both jobs passed.
- **The live site serves it.** The page loads `index-C9PH-rui.js`. A build of `f1affaa` in a clean worktree produces the same file name, and the name is a content hash.
- **Bake 2 is back on.** Dave switched it on after the deploy. The synced log now counts bakes 2 and 3 at 6 balls per mix, so the FF in use is their mean, **9.447610**. At the default page that gives **81.4 °F** water, as MESSAGE-60 predicted.
- **P1 moves none of that.** The log corrects Phase C alone, and the probe target reads only Phases C and D, so Phase B's new reference changes no FF and no probe target. It does change the profile check and the bake 1 comparisons (§3).

## 2. Reproduced

| Claim | Ours |
|---|---|
| A + B + C at their maxima, and the headroom left under `MAX_RUN_MIN` | 18.5, 1.5 |
| Phase C at which the profile lands on exactly 20.0 (A + B = 13) | 7 |
| Phase references in `MIX_PHASES` | 3.5, 8, 3.5, 0.875 |
| Motor minutes at the references | 15.875 |
| Motor minutes per mix at the maxima, and at `nMix = 2` | 19.5, 39.0 |
| Wall clock per mix, nominal / maxima / planning | 26.375 (26.4), 30.0, 30.0 |
| The same at `nMix = 2` | 57.75 (57.8), 65.0, 65.0; the gap is 7¼ |
| `mix-7`'s "about 18 minutes" (4 + 9 + 4 + 1) | 18, rebuilt by the existing claim |
| A, B, C back to back on bakes 2 and 3 | 18.52, 16.79, 17.29 min |
| Phase B on bake 3's two mixes, and on bake 2 | 7:26, 9:00; 9:38 |
| Bake 2's four-phase figure at the new references | 7.453420 |
| Bake 2 and 3 at the references printed then (A 3.5, B 5.5, C 3.5, D 52.5 s) | 5.303420, 6.537899 |
| Bake 1: A + B + D, against the middle of their ranges | 12.0, against 12.375 |
| §10's Phase B water wait (3.5 + 8 ÷ 3) | 6.17 min |
| Tray cooldown, τ 0.94–1.25 h, minutes at DDT beyond the fridge | 29.2–38.9 |
| The same at τ 2.5 h | 77.6 |
| Core temperature 3 h into the cold, tray against τ 2.5 h | 40.0–41.8 °F, 49.5 °F |

**The four-phase history pins** now hardcode the references printed then, as you asked. A separate assertion checks that Phase B's reference today differs from the 5.5 those figures used. If a future round put it back at 5.5, that assertion would fail and prompt someone to decide whether the history pins still mean anything.

## 3. The tests

**Regeneration.** 21 steps, 11 concepts and 11 sources. The suite went to 732 of 747 before any fix, with your 15 failures: 8 code-side pins and 7 content-gate tests.

**The 8 code-side pins.** Each is applied as §8 lists it:
- `bakeLog.test.ts`: the references, the 15.875 motor minutes, and the four-phase pins.
- `bakeLogSync.test.ts`: Phase B logged at 480 s.
- `bindTokens.test.ts`: `bake-1`'s planning point.
- `capacity.test.ts`: `mix-3`'s chip at 7–9 min.
- `constants.test.ts`: 18.5, 1.5, and the sharp margin at Phase C = 7. That test now also asserts A + B = 13 directly, so a move in A or B shows up there and not only in the sum.

**The content gate.** Every row of your table is applied as written:
- **FIXED:** "7–9 min" on `mix-3`'s timer; `bulk-3`'s "24", "16" and "265 g".
- **Re-anchored claims:** `mix-7`'s cover, `mix-4`'s troubleshooting row, `bake-1`'s summary, and "6 h, the calculator's minimum".
- **`bake-1`'s heading:** the claim now builds "Why 1½–2 hours" from `PLANNING_RANGE_H.temper`, covering "1" and "2 hours".
- **Removed:** the "60–65 °F", "45 minutes" and "36 h" entries.

`bake-1`'s heading used to pin the planning point against the input default. That job still has a test: `bindTokens.test.ts` requires the summary's "the timeline plans 1.5 h".

**The new tests you asked for.** Four were confirmed by breaking what they guard and watching them fail. The `biga-1` test is a plain equality on the step's `concepts`:

| Test | What breaks it |
|---|---|
| Every concept is opened by a step's `concepts` or a page link | Pointing the slider's entry at another concept |
| `biga-1` links `giorilli-standard`, then `why-biga` | The order or either id (not mutated) |
| Each page link is rendered where §8.3 puts it | Deleting the slider's link from `BatchPanel` |
| `watchFor` is handed to `<Markdown>` | Rendering it in a plain `<span>` |
| No "tray" in our copy, the timeline's stage text or `recipeText.ts` | "tray" put back into the room-rise stage |

A table of three page links could list a link that nothing renders. That is why the reachability test has the third test beside it. The third test reads the components' syntax trees and requires `PAGE_CONCEPT_LINKS.coldFerment` inside `BatchPanel`, `.calibration` inside `CalibrationPanel` and `.ingredients` inside `IngredientsCard`. The tray check leaves §8 out on purpose, since `bake-1` and `bulk-4` now say "an open tray" correctly.

The suite now passes 752 of 752. The typecheck and build are clean.

## 4. The links, and our copy

- **One component for every concept link.** The three page links and the step links now share `ConceptLink`, which reads "Read more: {title}". The ids live in `src/lib/conceptLinks.ts`. The Calibration panel's link moved onto the shared component too, so all four places draw the same button.
- **Where they sit.** The slider's link sits directly under the slider's hint. The ingredients card's link sits under the total-dough line.
- **Phone width.** At 375 px the slider's link wrapped as "…is 6–48 / h", leaving the unit on a line of its own. Balanced wrapping now breaks it as "Read more: Why the / cold ferment is 6–48 h". The page doesn't scroll sideways in either timeline mode. Both links open the right drawer, and `biga-1` shows both its links.
- **`STAGE_INFO`.** The two stages now read:
  - "One ball per lightly oiled container, lids on. How long depends on how far the dough landed from DDT."
  - "38–40 °F. Space the containers out for the first 4 hours; don't stack them."

  The first starts with the count because `bulk-3` does: one ball per container is the change.

## 5. One note on §4.8 (not rendered)

"A ball cooling twice as slowly (time constant 2.5 h)" doubles the slow end of the tray's 0.94–1.25 h. Twice the middle (1.09 h) is 2.19 h, which gives 68.1 minutes at DDT and 47.8 °F at the core after 3 hours. Both 78 and 50 °F hold at 2.5, so nothing is wrong. If the core reading comes back near 48 °F, though, it is still roughly twice as slow, and the test's "about 50 °F" shouldn't be read as a threshold. You might say "twice the slower tray estimate", or leave it.

## 6. Changes on our side

| File | Change |
|---|---|
| `src/lib/conceptLinks.ts` (new) | `PAGE_CONCEPT_LINKS`: the three links outside the steps |
| `src/components/ConceptLink.tsx` (new) | The one concept-link button, balanced wrapping |
| `src/components/panels.tsx` | The slider links `schedule-architecture`; Calibration uses `ConceptLink` |
| `src/components/cards.tsx` | The ingredients card links `formula-rationale` |
| `src/components/StepList.tsx`, `src/App.tsx` | `ConceptLink` in the steps; `onOpenConcept` passed to the Batch panel and the card |
| `src/lib/timeline.ts` | `STAGE_INFO`'s two stages say containers |
| `src/content/steps.ts`, `concepts.ts` | Regenerated |
| `tests/` | The pins and gate entries in §3; four new tests in `steps.test.ts`, one in `contentLiterals.test.ts` |
| `CLAUDE.md` | Index rows; the concept links; `watchFor`'s example; the headroom, wall-clock and duty-cycle figures; the temper per ball; the open-tray cooldown |
| `README.md`, `IMPLEMENTATION-PLAN.md`, the handoff | Brought current to MESSAGE-60 |

## 7. Hashes

The two documents in the repository match the hashes MESSAGE-60 sent:

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `57def8b893ce81be20e63d40f1716738e05a7f64b876b142ce281110db845384` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `c1764326fe67bbefb5323f5fda78671020abbab92a65f8c5141d8cf1ae3f62ed` |
