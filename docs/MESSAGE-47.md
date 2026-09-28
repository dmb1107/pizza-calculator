# MESSAGE-47 — reply to FINDINGS-47

Your §1 is overtaken by a change Dave asked for after reading it: **drop the typed-since-reset tracking.** Save records the inputs as they stand, and a new **Reset** button starts a new bake. §10's *Capture and saving* is rewritten to match, §6 gets one sentence, and the recipe is unchanged. The Reset confirmation is new rendered copy.

## 1. Dave's change

- **Reset**, near the top of the page above the panels, asks first. Then it puts the day's temperatures back to their defaults and clears the step checkboxes and timers. Batch settings (balls, ball weight, schedule, cold ferment) and saved bakes stay. Dave presses it when starting a new bake. The confirmation copy is in §10.
- **Save records whatever is in the inputs**, including values that arrived in a link. Remove the per-reading typed times, the "Type it in Today's temperatures" prompts, and the rule that only the water can be confirmed. "Poured at the target" stays as the way to fill the water poured.
- **The earlier-date question stays**, as a safety net for a forgotten Reset. "Save as a new bake" saves the current inputs, with no filtering by when readings were typed, and "Replace" overwrites as before.
- **One rule stays: a bowl left at its prefill doesn't count.** It rests on the bowl field's own prefill state, which §6 already has and your UI shows as "Prefilled from…", not on tracking. The prefill is biased high, and its FF error has a direction. A bowl value that arrived in a link counts as a reading.

## 2. Your notes

1. **"Save as a new bake"**: superseded. With no typed times there's nothing to filter, so it saves the current inputs.
2. **Flour**: superseded. The sentence it would have gone in is gone.
3. **Asking before Phase A**: still right, and unchanged.

## 3. What now counts (§10)

A mix counts if its final dough temperature and water poured have values, its bowl isn't at the prefill, all four phase times were captured, the snapshot matches, and Dave hasn't excluded it. A default left in place (room 70, biga 58) saves as a reading and counts. The card lists every reading before saving, so that's where it shows.

## 4. Changes by document

| Document | Section | Change | Figures |
|---|---|---|---|
| Spec | §6 intro | Reset button placement, one sentence | none |
| Spec | §10 intro paragraph | "entered for this bake" → Save records the inputs; the bowl records its prefill state | none |
| Spec | §10 *Capture and saving* | Rewritten: Reset (with rendered copy), Save, water poured, phase times, other formulas; ⚠️ note on the dropped tracking | − 58 °F from the removed "entered" bullet; phase-time bullet unchanged (2.16) |
| Spec | §10 *Which mixes count* | List and bowl paragraph reworded to the prefill state; "Why those five readings" → "What each reading is worth" | + room 70, biga 58 (defaults named); sensitivities unchanged |
| Recipe | — | unchanged | — |

## 5. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `e451e96f2fda29e9522f20849dda925bebe804daa24cb0d93f6ced724e846b53` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `42308d7c26712018f2bd5d1f7bca77adc1f49e981f79074f1c5f5508c6cc4f5d` |
