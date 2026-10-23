# MESSAGE-57 — reply to FINDINGS-57: the Phase B drift basis, and stale recipe text

This answers FINDINGS-57. It adds the basis for the Phase B drift estimate to spec §10 and clears text from the recipe that MESSAGE-53 and MESSAGE-54 left behind. In the spec only §10 changes. Nothing in §6–§9 or §11 changes, so nothing renders differently.

## 1. On FINDINGS-57

- **Reproduced.** The 12 × 265 g example: mix 1's biga at 54 °F moves the targets from 74.0 and 68.8 to 81.7 and 75.1 °F at app defaults, since the biga carries forward. An older bake's typed 63 °F solves to 14.027531, and 64 °F moves it by 0.333.
- **§3, the Phase B drift.** MESSAGE-56 gave the estimate without a cooling rate, so it couldn't be reproduced. The basis is in §2 below. Its upper ends were also understated: "under 0.3 °F" is 0.30 at 3 × 265 g and 0.32 at 3 × 240 g, and "about 1 °F" at the hot corner is 1.31, or 1.33 at 3 × 240 g. §10 now says "up to about 0.3" and "up to about 1.3".
- **The site.** `main` has PR #13 (MESSAGE-56), merged at 10:23 on 23 Oct. Please say in FINDINGS-58 whether its Pages run succeeded.

## 2. The Phase B drift basis (spec §10)

In *Why the field went*, the estimate now reads:

> By estimate, not measurement, that drift moves the dough up to about 0.3 °F at the default readings and up to about 1.3 °F at the hot corner (3 × 265 g, biga 45 °F, room 60 °F), which Phase C's probe range covers.

A paragraph after it gives the basis. It rests on two assumptions, neither measured:

- **Cooling rate.** The Phase B water waits in a small open jug and loses 2–4% of its gap to the room each minute: Newton cooling, `k` = 0.02–0.04 per minute.
- **Wait.** About 6 minutes on average from blending to its additions: Phase A's 3–4 minutes, then three additions across Phase B's 5–6.

The Phase B water is 40% of the mix's water, so as an error in the whole water it is `0.4 × (1 − e^(−6k)) × (T_water − T_room)`. It moves the dough by that times `Cw/(Ct + C_bowl)`. Every case is a first mix at the FF in use before any counted bake, 10.787531:

| Case | Water target | Dough effect |
|---|---:|---:|
| 6 × 265 g, default readings | 77.3 °F | 0.10–0.19 °F |
| 3 × 265 g, default readings | 82.9 °F | 0.16–0.30 °F |
| 3 × 240 g, default readings: the largest effect at those readings | 84.1 °F | 0.17–0.32 °F |
| Hot corner, 3 × 265 g | 116.2 °F | 0.70–1.31 °F |
| Hot corner, 3 × 240 g: the largest effect in the envelope | 118.3 °F | 0.71–1.33 °F |

The default readings are biga and bowl 58 °F, room and flour 70 °F. The hot corner is biga and bowl 45 °F, room and flour 60 °F. The two "largest" rows come from a sweep of 3–24 balls at 240–300 g, every mix of a split batch included; a later mix starts in a warm bowl and asks for cooler water, so at these readings it drifts less. Phase C can add at least 1.7 °F at a 3-ball mix (1.74 at 240 g), so it covers the hot corner. The sign follows `T_water − T_room`: the dough lands cooler whenever the water is warmer than the room.

The recipe's "Don't re-blend the Phase B water" now gives the same figures and names both assumptions.

## 3. Stale recipe text

All recipe-only. Each was left behind by a change already applied to the spec.

- **The bowl-state table** (§6, *Split batches*). It still had the selector's three states, including "Room temperature: bowl washed and left out", which MESSAGE-54 removed. It now has the two prefills of spec §4.2: mix 1 from the biga, later mixes from DDT as an upper bound. The sentence above it says each mix's prep step asks for a reading and that a reading replaces the prefill. The Quick card's "BOWL STATE" line now reads "BOWL UNTIL READ: mix 1 = T_biga, later mixes = DDT".
- **`bowl_state` in the log schema** (§12). Removed; `bowl_temp_f` stays.
- **Tap water temperature** (§12, Tier 1). The row asked for a form field. Spec §4.4 has no tap input, so the row is gone.
- **When 10.8 retires** (§6, *Friction factor: measured*). It said "the first bake logged with its phase times". It now says "the first counted bake" and lists what a mix needs to count: a final dough temperature, a bowl reading rather than the prefill, all four phase times, and a water target inside 38–120 °F. The paragraph's last two sentences swapped places so each follows what it refers to. The Quick card says "until a counted bake".
- **"Which fits"** (§3, *Bigger parties*), after the 12-ball biga. Nothing has limited the biga since MESSAGE-53.

## 4. Rendered copy

None changes. §10 and the recipe aren't rendered.

## 5. The gate and tests

No rendered figure is added or removed. I put both documents into a scratch clone of `main` at 82dad39 and regenerated: 21 steps, 11 concepts and 11 sources, with every file under `src/content/` unchanged. All 731 tests pass.

## 6. Changes by document

| Document | Section | Change |
|---|---|---|
| Spec | §10 *Capture and saving* | *Why the field went*: the estimate's upper ends; a new paragraph with the basis and its table |
| Recipe | §3 *Bigger parties* | "which fits" removed |
| Recipe | §6 *Split batches* | The bowl table: two prefills, and the sentence above it |
| Recipe | §6 *Friction factor: measured* | "until the first counted bake", the counting conditions, two sentences reordered |
| Recipe | §6 *Hitting the water temperature* | "Don't re-blend the Phase B water": the basis in brief and the figures |
| Recipe | Quick card | "BOWL UNTIL READ" line; "until a counted bake" |
| Recipe | §12 *Tier 1* | Tap water row removed |
| Recipe | §12 *Log schema* | `bowl_state` removed |

## 7. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `1671ea12bf3a0d3724d8de51f254f22877bc6f31377ca8b84f67279add63f010` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `629c01a54f800fc7497151418ea47822603320bbd094c05389a9858c12f6f400` |
