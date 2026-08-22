# Re: your three findings

All three are correct. Two were errors on my side; the third needs a documented number changed rather than just tested around.

---

## 1. "More than the fresh flour does" — wrong, fix the prose

You're right, and the crossover is 5.03 balls almost exactly.

| Balls | Fresh flour C | Bowl C | Ratio |
|---:|---:|---:|---:|
| 3 | 69.1 | 115.8 | 1.68× |
| **5** | **115.2** | **115.8** | **1.01×** |
| 6 | 138.2 | 115.8 | 0.84× |
| 9 | 207.4 | 115.8 | 0.56× |

**Replace with:** "A 965 g bowl contributes 115.8 — comparable to the fresh flour, and larger than it below about 5 balls."

Good catch on flagging it as user-facing. A verbatim-rendered claim that's false at the default batch size is worse than a vague one.

---

## 2. The −0.3 °F figure — your reading is right, but state the coefficient instead

The two numbers were quoted against different reference points, which is why they looked irreconcilable. They come from the same place.

**Sensitivity = `C_bowl / (Ct + C_bowl)`:**

| Batch | °F of dough per 1 °F of bowl-temp error |
|---|---:|
| 3 balls | 0.18 |
| 6 balls | 0.10 |
| 9 balls | 0.07 |

At 6 balls: a 3 °F assumption error → 0.30 °F (the "−0.3"). A 20 °F cold-vs-room bowl → 1.97 °F (the "2.0"). Same coefficient, different inputs.

**Assert the coefficient, not either endpoint.** It's the honest quantity and it makes the "no measurement needed" argument properly — even a 10 °F misestimate of `T_bowl` costs under 1 °F at 6 balls.

Both documents now state it this way.

---

## 3. The overhead band — change the number, don't just test around it

You're right that 30.2 h exceeds it, and right about the cause: the band predates the shaped rise, and the old fixed 1–2 h stage couldn't reach 2.4 h.

Recomputed across the full input ranges, using the clamp bounds rather than the realistic 71–144 min:

- **25.3 – 30.8 h**
- **Defaults: 27.8 h** (unchanged)

**Please update the documented band to 25.3–30.8 h** rather than leaving 25.5–30 in place with a test noting it's exceeded. A number in the spec that's provably wrong at a reachable corner will mislead the next reader, and the test only protects someone who runs it.

Keep asserting the defaults as an equality — ~34 / ~52 / ~64 h are unchanged and remain the meaningful check. Treat the band as a range check.

---

## On all three

These were exactly the right things to surface: a user-facing claim that's false at the default, two figures that can't both be right, and a documented bound that a new feature quietly invalidated. Keep flagging that class of thing.

One preference for next time: when a documented number turns out to be wrong rather than ambiguous, propose the corrected value rather than recording the discrepancy. A test that encodes "the spec says 30 but it's really 30.2" preserves the error.
