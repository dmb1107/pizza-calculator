# Update: bowl thermal mass, measured FF, and two new features

First bake is done and it invalidated part of the thermal model. **The old `3.00 ×` scale-independent water formula is dead** — do not keep it as a fallback anywhere. There are also two new features and a recipe bug to fix.

Test vectors at the bottom have all been regenerated. Get them green before touching UI.

---

## 1. ⚠️ The mixer bowl is a thermal mass and must be in the model

The bowl absorbs friction energy alongside the dough. Omitting it made the water-temperature output **5 °F wrong** on the first bake.

**New constant:**
```ts
C_BOWL_SPECIFIC_HEAT: 0.12,   // stainless, cal/g·°C
DEFAULT_BOWL_MASS_G: 965,     // measured; user-editable, persist to localStorage
```
`C_bowl = bowlMassG × 0.12` → 115.8 at the default.

**`T_bowl` defaults to `T_biga`.** The biga ferments in the mixer bowl, so 19 h of contact puts them at equilibrium. Provide an override for when the bowl sat on the counter (then it's `T_room`), but **do not add a required bowl-temperature input** — the effect is about −0.3 °F and isn't worth a measurement.

### ⚠️ The FF definition is the trap here

**FF is defined as the temperature rise the mixer produces in the *dough alone*.** So the work term is `FF × Ct`, **not** `FF × (Ct + C_bowl)`.

Getting this backwards returns a water temperature several degrees off while looking completely reasonable. If exactly one thing gets a comment in the code, make it this.

### The three formulas

Let `Ct = Cb + Cf + Cw + Cs` (dough only) and `TOT = Ct + C_bowl`.

```
// water temperature required
T_water = (DDT × TOT − FF × Ct − Cb×T_biga − Cf×T_flour − Cs×T_room − C_bowl×T_bowl) / Cw

// predicted final dough temperature
T_final = (Cb×T_biga + Cf×T_flour + Cw×T_water + Cs×T_room + C_bowl×T_bowl + FF × Ct) / TOT

// FF from a measured bake (for the log)
FF = (T_final × TOT − Cb×T_biga − Cf×T_flour − Cw×T_water − Cs×T_room − C_bowl×T_bowl) / Ct
```

These must round-trip: feed `T_water` back into `T_final` and you must land on `DDT` exactly. Assert it.

### Why not just fold the bowl into FF

Because the bowl is fixed mass while the dough scales, the same FF of 14 shows up as a different *apparent* rise at every batch size:

| Batch | Bowl share | Rise diluted to | FF 14 appears as |
|---|---:|---:|---:|
| 3 balls | 18.0% | 82% | 11.5 °F |
| 6 balls | 9.9% | 90% | 12.6 °F |
| 9 balls | 6.8% | 93% | 13.0 °F |
| 12 balls | 5.2% | 95% | 13.3 °F |

Folding it in makes the per-batch-size FF table drift for no physical reason.

---

## 2. FF is now measured: **14.0 °F**

Replace `DEFAULT_FF: 14` framed as "estimated" with a measured value.

- **6 balls: FF = 14.04 °F** — bake 1, 21 Aug 2026. Badge as measured.
- 3, 9, 12, 18 balls: still uncalibrated, fall back to 14.0.

Keep the per-batch-size FF map exactly as specced.

---

## 3. NEW — shaped rise time from actual final dough temperature

After mixing, the user enters the dough temperature they actually hit. The room-temperature phase before the fridge adjusts to compensate.

```
f  = 2 ** ((T_actual − DDT) / 17)
R' = (90 + 150) / f − 150
R' = clamp(R', 45, 180)
```

`90` is the base room time, `150` is the cooldown's equivalent fermentation at DDT — a cool dough loses ground on the counter *and* on the way down to 40 °F, and this compensates for both. Expose both as tunable constants; the 150 is a modelling estimate.

| Final dough | Room time |
|---:|---:|
| 77 °F | 71 min |
| 76 °F | 80 min |
| **75 °F** | **90 min** |
| 74 °F | 100 min |
| 73 °F | 110 min |
| 72 °F | 121 min |
| 71 °F | 133 min |
| 70 °F | 144 min |

**This REPLACES `ballRoomTemp` in the §4.7 timeline — it does not sit alongside it.** That row is currently a fixed 1.5 h with a 1–2 h user-adjustable range; delete the fixed value and the range, and compute the duration from `R'` instead. The 1–2 h range is now wrong at both ends: the model reaches 71 min for a warm dough and 144 min for a cold one.

**Fallback:** before mixing there is no measured temperature, so the calculator is in planning mode. Default `T_actual = DDT`, which yields exactly 90 min. Once the user enters a real final dough temperature, recompute and shift every downstream stage — fridge entry, cold ferment end, temper, bake.

The input belongs at the end of the mixing step, next to where the final dough temperature is recorded for the log. One number, two uses.

---

## 4. Probe target formula changed

```
probeTarget = DDT − 0.33 × FF × Ct/(Ct + C_bowl) + 0.2 × (DDT − T_room)
```

Two corrections from bake 1: remaining friction is diluted by the bowl, and the 10-minute rest loses heat in proportion to the dough-to-room gap rather than a flat 1 °F.

At FF 14 in a 70 °F room: **3 balls 72.2 · 6 balls 71.8 · 9 balls 70.5**

---

## 5. Recipe bug — Phase A water must be in grams

"~60% of final water" caused a guess, which cost a data point. Show **weighable grams** for both additions.

| Batch | Phase A (60%) | Phase B (40%) |
|---|---:|---:|
| 3 balls | 105.8 g | 70.5 g |
| 6 balls | 211.6 g | 141.1 g |
| 9 balls | 317.4 g | 211.6 g |

Make the 60/40 split a named constant — there's some evidence Phase A runs dry and it may move to 70/30, but that needs a clean repeat first.

---

## 6. New log fields

```
bowl_mass_g, bowl_temp_f          // bowl_temp_f defaults to biga_temp_at_mix_f
phase_a_water_g                   // actual, weighed
phase_c_seconds_actual
final_dough_temp_f                // also drives the shaped rise time
```

---

## 7. Regenerated test vectors

`FF = 14.0`, `T_biga = T_bowl = 58`, `T_flour = 69`, `T_room = 70`, bowl 965 g. DDT auto (75 for ≤6, 74 for 7+).

| balls | ball g | F | bigaFlour | bigaWater | bigaADY | freshFlour | freshWater | phaseA | phaseB | salt | Ct | DDT | waterTemp | probe |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 265 | 470.2 | 305.6 | 152.8 | 1.16 | 164.6 | 176.3 | 105.8 | 70.5 | 13.2 | 529.4 | 75 | 73.7 | 72.2 |
| 6 | 265 | 940.4 | 611.2 | 305.6 | 2.32 | 329.1 | 352.6 | 211.6 | 141.1 | 26.3 | 1058.7 | 75 | 68.1 | 71.8 |
| 9 | 265 | 1410.6 | 916.9 | 458.4 | 3.48 | 493.7 | 529.0 | 317.4 | 211.6 | 39.5 | 1588.1 | 74 | 63.0 | 70.5 |
| 12 | 265 | 1880.8 | 1222.5 | 611.2 | 4.65 | 658.3 | 705.3 | 423.2 | 282.1 | 52.7 | 2117.5 | 74 | 62.1 | 70.4 |
| 18 | 265 | 2821.1 | 1833.7 | 916.9 | 6.97 | 987.4 | 1057.9 | 634.8 | 423.2 | 79.0 | 3176.2 | 74 | 61.3 | 70.3 |
| 5 | 270 | 798.4 | 519.0 | 259.5 | 1.97 | 279.5 | 299.4 | 179.6 | 119.8 | 22.4 | 898.9 | 75 | 69.1 | 71.9 |
| 7 | 260 | 1076.4 | 699.7 | 349.8 | 2.66 | 376.7 | 403.7 | 242.2 | 161.5 | 30.1 | 1211.9 | 74 | 64.1 | 70.6 |

**Ingredient columns are unchanged** — only the thermal outputs moved.

### Regression test: bake 1

6 balls, `FF = 14.04`, biga 58 °F, flour 69 °F, room 70 °F, bowl 965 g at 58 °F, **water actually used 63.0 °F**:

- `T_final` must predict **73.50 °F** (measured: 73.5 °F)
- `T_water` for DDT 75 must return **67.97 °F**

The gap between 63.0 used and 68.0 required, times water's 30% share of the system, is exactly the 1.5 °F the dough finished low. **This test failing means the bowl term is wired wrong.**

### Invariants still holding

- `(bigaWater + freshWater) / F` = 0.700, `salt / F` = 0.028, `bigaFlour / F` = 0.650
- `phaseA + phaseB` = `freshWater`
- Thermal weights are **no longer scale-invariant** — that assertion must be deleted, not updated

---

## Do not

- Keep the `3.00 ×` formula as a fast path or fallback
- Use `FF × (Ct + C_bowl)` for the work term
- Add a required bowl-temperature input
- Change the 60/40 Phase A split without asking
