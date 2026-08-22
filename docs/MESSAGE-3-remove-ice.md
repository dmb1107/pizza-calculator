# Remove the ice calculation entirely

**Output a target water temperature and nothing else.** No ice/tap split, no gram amounts, no `iceEffF`, no latent-heat model. The user blends fridge-cold water with tap water by hand, measuring as they pour.

The spec has been updated — §4.4 is rewritten and every ice reference is gone. This message is the delta for your in-flight session.

---

## Delete

**Constants:** `LATENT_F`, `C_ICE`, `DEFAULT_FREEZER_F`, `DEFAULT_TAP_F`

**Calculations:** the whole of the old §4.4 — `iceEffF`, `ice`, `tap`, and the three edge-case branches (`waterTempF >= tapF`, `ice > 0.35 × freshWater`, `ice > freshWater`)

**Inputs:** the tap water temperature and freezer temperature fields

**Outputs:** the ice/tap split from the water card, and the "ice over 35%" warning

**Content:** the `ice-physics` concept in §8.3, and its link from the water card

**Log fields:** `tap_temp_f`, `ice_g`

**Tests:** the ice effective-temperature vector (32 → −112 etc.)

---

## Replace with

### One warning, and only one

| Condition | Behavior |
|---|---|
| `waterTempF < 38` | Warn: below what fridge water reaches. Suggest chilling the biga or the fresh flour. This is the only place ice may be mentioned. |

**It should essentially never fire.** On the retarded-biga schedule the biga arrives at 45–60 °F, and across every batch size with room temperature from 60–84 °F, the required water spans **51.7 – 90.6 °F**. Only the classic room-temperature biga track in a hot kitchen can reach below 38 °F.

Add that range as a test: sweep the retarded-schedule envelope and assert `waterTempF` never goes below 38.

### The water card

**One number, large: the target water temperature.** Plus a single line — *blend fridge-cold and tap water to hit it, measuring as you pour.*

Nothing else on the card. No split, no grams, and **no note about the number being warm or cold** — it needs no interpretation, and any such note would need a tap temperature, which is one of the inputs being deleted.

---

## Why

Ice buys precision that isn't needed and costs reliability that is. Its accuracy depends on the −120 °F equivalence being right *and* on every gram melting before the temperature reading — miss that and the dough reads on target, then drifts cold, and the error propagates into the measured FF.

Fridge-cold water is just water at a temperature you can read directly. When it's sufficient, it's strictly better. And on this schedule it's always sufficient.

---

## Do not

- Keep the ice math behind a feature flag or an "advanced" toggle
- Compute a fridge/tap split — the user does this by feel with a thermometer
- Ask for tap or freezer temperature anywhere
- Mention ice outside the sub-38 °F warning
- Add commentary about the water being warm or cold
