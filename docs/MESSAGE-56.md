# MESSAGE-56 — reply to FINDINGS-56: the water is logged as its target

This answers FINDINGS-56 and carries one change from Dave: **the "Water poured" field goes, and the log records each mix's water target as the water used.** Both documents change. No engine figure moves, and no §8 step or concept text changes.

## 1. On FINDINGS-56

- **§2, the card links.** Keep the Calibration panel's link to `friction-factor`. Thanks for building it rather than dropping the sentence.
- **§3, the site.** Thanks. A line in each reply on whether the site is current is exactly right.

## 2. Why the field goes (§10)

Dave measures the water as he blends it and pours right away. He asked how much the field buys. The answer is very little, for two reasons:

- **It never measured heat loss.** It was read once, at Phase A's pour. The only real loss comes later: the Phase B water, 40% of the total, waits 4–10 minutes and drifts toward the room. By estimate, not measurement, that drift is under 0.3 °F of dough at app defaults and about 1 °F at the hot corner (3 × 265 g, biga 45 °F, room 60 °F), which Phase C's probe range covers. It runs the same way on most bakes, so FF absorbs most of it.
- **What it caught was a blend that missed the target.** A 1 °F miss moves the dough by `Cw/(Ct + C_bowl)`, which is 0.27, 0.30 and 0.31 °F at 3, 6 and 9 balls per mix. It moves the solved FF by `Cw/Ct` = 0.33. In a mean of three bakes, a one-off miss moves the next target by a third of itself. At a size with one counted bake, it moves the target by the full miss.

So the page asks for a blend within 1 °F, and the log takes the target.

## 3. What changes

**Removed:** the "Water poured" field in `mix-2` and its "Poured at the target" button, on the step and on the log card. If stored state or the URL codec carries the poured water, ignore it on read, as with `bowlst`.

**Logged:** Save records each mix's water target, to the tenth as `mix-1` shows it, in `water_temp_used_f`, like any other input as it stands. **Store it; don't derive it on read.** It's what went into the bowl, so re-solving under a corrected constant must not recompute it. A biga or bowl reading changed after the pour moves the logged water with it. That's accepted, and §10 says to exclude such a mix.

**Older bakes** keep the reading they were saved with. One saved without a water reading stays out, as before.

**Which mixes count** (§10), replacing "its final dough temperature and water poured have values":

- its final dough temperature has a value, and so does its water (always, on a bake saved since MESSAGE-56);
- its water is inside `WATER_MIN_F`–`WATER_MAX_F` (38–120 °F). A target outside that band can't be blended, so it isn't what went in.

The second rule reads the stored value, so it needs no record of whether a warning fired.

## 4. Rendered copy

| Where | Now |
|---|---|
| §7.2, the line under the target | "Blend fridge-cold and tap water to within 1 °F of it." (was "Blend fridge-cold and tap water to hit it, measuring as you pour.") Copy-as-text says the same |
| §9 *Water temperature*, first sentence | "Blend fridge-cold water with tap water to within 1 °F of the target." |
| Log card, the water row | Label "Water target", showing the value with no button |
| Log card, the new reason | "the water target was out of blending range" |

The existing reason for a mix with no water is needed only for older bakes saved that way. If none were, it can go.

## 5. Elsewhere in the spec

- **§4.4:** the user blends "until the thermometer reads within 1 °F of the target", not "measuring as they pour".
- **§6:** readings are "rendered the way `mix-7`'s final dough temperature is", since Phase A's field is gone.
- **§7.2:** "A batch that doesn't split shows "Water target", like the final reading."
- **§10:** the table row, Reset's list (water poured removed), the capture bullet with its reasoning, the counting rules, and *What each reading is worth* ("a blend that misses the target, since the log takes the target").

## 6. The gate and tests

| Where | Literal | Classification |
|---|---|---|
| §9 *Water temperature* | 1 °F | FIXED: a tolerance, Dave's call |

§7.2's line and the log card aren't §8 content. I regenerated content from this spec in a scratch copy: 21 steps, 11 concepts and 11 sources, with `steps.ts` and `concepts.ts` identical to round 55. Only the `water-temperature` reference body changes.

Tests I'd expect:

- `mix-2` renders no water field;
- a saved mix's `water_temp_used_f` equals its target to the tenth;
- a mix whose stored water is outside 38–120 °F doesn't count and shows the new reason;
- an older bake with a typed reading still solves from it.

## 7. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §4.4 | Blend to within 1 °F |
| Spec | §6 | The rendering reference |
| Spec | §7.2 | The instruction line, verbatim; "like the final reading" |
| Spec | §9 | *Water temperature*'s first sentence |
| Spec | §10 | `water_temp_used_f`; Reset; capture bullet and reasoning; counting rules; what each reading is worth |
| Recipe | §6 *Hitting the water temperature* | "Within 1 °F is close enough" and "Don't re-blend the Phase B water" |
| Recipe | §12, quick card | Water target logged as the water used; blend to within 1 F |

## 8. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `21cbf8abd2daba4478e23d1b8f089a96b7e69111ed74d833b89b7fbe3045ea2d` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `b30c1946e5ac9ec791313f56e84818a36a258aedf454848fdc69f503d4fe24a0` |
