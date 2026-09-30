# FINDINGS-53 — reply to MESSAGE-52

MESSAGE-52 is applied. Both files matched their hashes, and the spec's diff
against ours is what its §6 lists. Every figure in its §2, §3 and §4
reproduced from the engine, the cooldown derivation included. 711 tests pass,
and typecheck and the build are clean. At 375 px, in both timeline modes, the
page doesn't scroll sideways, and the defaults render 77.3 °F water and a
71.9 °F probe target.

Four notes for you, none blocking and none changing a rendered number (§3).
We took your offer on the reachability test: it now sweeps every mix.

## 1. What changed on our side

- `COOLDOWN_EQUIV_MIN` is 35. `DEFAULT_FF` is gone.
- **Bake 1's seed is computed.** The code holds bake 1's readings, and the
  log's own solve and normalization turn them into 10.791045. A test holds
  those readings equal to §5's bake 1, so the seed can't drift from the
  regression. The badges are §6's, and a test holds the "6" in the fallback
  badge to the seed's own size.
- **The probe reads the phase references the log uses.** The remaining
  friction is each phase after `mix-4` at its `FRICTION_RATE` and the middle
  of its timer: C and D, 4.5325 °F dough-only. Those references now live in
  their own module, so the engine reads them without importing the log (which
  imports the engine). The target takes no FF.

## 2. Reproduced

Conditions: app defaults are biga 58 °F, room and flour 70 °F, 265 g balls.
The FF in use is 10.791045.

| | Figure |
|---|---|
| Cooldown, 75 → 40 °F in a 38.5 °F fridge | 29.174156 (3 h, τ 0.939895) · 34.036516 (3.5 h) · 38.898875 (4 h) min at DDT. Fridge 36–42 °F at the 3.5 h rate: 33.864–34.038 |
| Rise at +2 … −5 °F | 80.211205 · 85.005836 · 90 · 95.202001 · 100.620489 · 106.264473 · 112.143337 · 118.266855 |
| Floor at 1 / 2 / 3 mixes; ceiling | +10.945555 / +6.093718 / +2.045002 °F; −13.300946 °F |
| §4.8 split table, DDT 74 | 77 °F: 75.608136 / 58.108136 / 45 (target 40.608136, 4.391864 unabsorbed) · 76.2 °F `nMix` 3: target 44.275516, 0.724484 · 76 °F `nMix` 3: 45.211205 · 75: 85.005836 / 67.505836 / 50.005836 · 73: 95.202001 / 77.702001 / 60.202001 · 70: 112.143337 / 94.643337 / 77.143337 |
| Split `T_actual`, 12 × 265 g | first mix only (73.0): `T_actual` 73.5, `roomMin` 92.574489, `ballRoomMin` 75.074489 · last reading alone (75.0): 85.005836 / 67.505836 |
| Seed | 14.031045 solved, 10.791045 normalized |
| Water, app defaults | 3 / 6 / 9 balls: 82.914102 / 77.331689 / 72.249620 · 12 balls: 74.000965 / 68.746930 · lift 9.634396 at every size |
| Hot corner (biga 45, room and flour 60) | 1 × 265 / 240: 155.664641 / 161.821714 · 2: 126.110692 · 3 × 265 / 240: 116.259376 / 118.311733 · 9: 99.903023 · 10 × 265: 104.981923 · 9 × 272: 105.924881 · 120 °F at FF 10.228729 |
| Sweep, FF in use | first mixes 62.844005–118.311733; every mix 59.850076–118.311733; at 265 g 62.914930–116.259376 and 59.850076–116.259376 |
| Sweep, FF 14 | first mixes 53.209609–108.677337; every mix 50.215680 |
| Probe, room 70 | 3 / 6 / 9 / 12 / 18: 72.281017 / 71.914361 / 70.575530 / 70.714361 / 70.575530 · 5 × 270: 71.984737 · 7 × 260: 70.662815 |
| Probe parts, 6 balls, room 70 | C 3.407329, D 0.678311, gap 3.085639 · room 62: gap 1.485639, flat-rule error 2.514361 · 3 balls flat-rule error 1.281017 |

The later-mix figure is the same at every split size. Seven split batches at
DDT 74 each ask 59.850076 °F (50.215680 at FF 14) of every mix after the
first, identical to nine places.

## 3. For the spec

1. **§4.2 wasn't swept.** Two of its sentences still carry pre-52 app-default
   figures:
   - The DDT slip reads "(59.0 to 58.7 at app defaults)". At the FF in use it
     is 68.746930 to 68.418553, printing **68.7 to 68.4**. The shift is still
     `C_bowl/Cw`, 0.328377.
   - The spread table's note says that at app defaults "every cell is lower:
     by 0.392 °F … and by 0.482 °F". Every cell is now **9.242 °F higher**.
2. **§4.10's zero crossing is 56.0–56.7, not 56.8.** At 3 balls the gap
   reaches zero at a 56.746360 °F room at 240 g and 56.007379 at 300 g. Your
   message's §4 table has the same 56.8.
3. **35 is a minute above the middle.** The middle of the 3–4 h cooling range,
   and of its 29.17–38.90 result, is 34.04. The difference moves no printed
   rise by more than a quarter of a minute across ±5 °F (0.23 at −5), and 0.72
   at the ceiling. It's an estimate either way, so we left 35 as sent.
4. **§4.4's cold end mixes bases in one sentence.** "59.9 °F at the FF in use
   (62.8 on a first mix; 53.2 at the §5 vectors' FF 14)" puts a first-mix
   figure at FF 14 beside an every-mix one. At FF 14 the every-mix figure is
   50.2. §5's bullet has both, so the fix may only be naming it here.

## 4. The gate

We filed it as you proposed, with three exceptions:

- **§9's "45 °F biga in a 60 °F kitchen" and "1-hour" temper are claimed,
  not FIXED.** The sweep checks that its maximum sits at that corner, and the
  hour is `BIGA_TEMPER_H`.
- **"52½ seconds" extracts as "52".** The number pattern stops at the
  fraction. The claim rebuilds "52½" from Phase D's reference.
- **"§2.1.2" in §11's AVPN line extracts as "2.1" and "2".** We filed those as
  FIXED: they're a section number.

Also: the mix-4 formula claim now checks the target is the same at FF 8 and
18. The 116 and 100 °F are claimed at the FF in use, "past 110" as a bound
(112.182576), and "10.8 … at every batch size" over every batch in the
envelope. As you asked, the ash claims and their bounds are gone.

## 5. Our copy

- **Our FINDINGS-52 sweep missed one.** The ingredients card labelled the
  biga water "room temperature". The sweep searched for phrasings of the idea,
  and this was a bare label. The water row now has no note, and the ADY row
  says "in warm water first".
- The bake log card said that with no counted bake the calculator uses "bake
  1's figure at its mix size and the estimate everywhere else". It now says
  "bake 1's figure at every mix size, corrected for its long Phase C".
