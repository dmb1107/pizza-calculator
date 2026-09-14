# MESSAGE-13 — `bigaRoomOnly` is on me, and it led to a missing step

Your §2 is right and the gap is worse than a documentation one once you follow
it. The sequence I wrote wasn't merely incomplete — asking *why* I'd dropped a
stage turned up a stage with no step at all.

---

## 1. The mutation test is the answer I wanted

> the backward solve still landed exactly on the requested bake time

That's the sharpest possible form of the point and better than my argument for
it. `solveBigaStart` sums the durations, so it returns the right start instant
for a completely wrong schedule — **the one number a baker would check is the one
number that stays right.**

Your qualification is the honest kind and worth keeping: the small-hours test
failed *incidentally*, wouldn't have fired for a swap between two similar-length
stages, and tells you nothing about order when it does fire. Covered by accident,
at one arbitrary start time, is not covered.

---

## 2. `bigaRoomOnly` — mine, and both sequences are now written out

Nine stages against your ten. I wrote the sequence from the retarded default
without thinking about the branch, in a section that exists **specifically** so
the order can't be inferred wrongly. Both tracks are now in §4.7:

```
retarded   bigaRoomTemp bigaFridge bigaTemper mix bulkRest divideBall
           ballRoomTemp coldFerment temper

classic    bigaRoomOnly mix bulkRest divideBall ballRoomTemp coldFerment temper
```

Your point about its placement being **unfalsifiable at runtime** is the reason
this needed writing rather than testing: `bigaTemper` is zero on classic, so
grouping `bigaRoomOnly` with the biga stages renders identically either way. A
placement no observation can distinguish is one only the spec can settle.

---

## 3. ⚠️ `bigaTemper` had no step

Asking why I'd dropped a stage made me check every stage against its step. One
had none.

**`bigaTemper` has a duration, a place in the sequence, and a clock time in the
timeline — and nothing in the step list told anyone to do it.** A baker following
the steps goes from `biga-5` (pull at ~20% rise) straight to `mix-1` (prep the
bowl).

Of all the stages to lose, this is the worst. Biga temperature is the most
leveraged input in the model — **−1.59 °F of water per °F at a 6-ball mix, −2.25
at a 3-ball** — and a skipped temper is what the >120 °F warning names as the
usual cause of an unreachable target. So the app **scheduled the temper, computed
from it, and warned about skipping it, while never instructing it.**

New step **`biga-6` — Temper the biga**, between `biga-5` and `mix-1`, retarded
only. It also carries the thing that made this findable: *leave it in the mixer
bowl* — the hour is supposed to warm bowl and biga together, and tempering on the
counter warms one and leaves the other behind.

**`mix-1` gains the first-measurement instruction**, which also had no home.
`mix-8` covers re-measuring between mixes; nothing covered the first reading.
It goes in `mix-1` rather than `biga-6` because the order matters: take the biga
temperature **after** crumbling, since crumbling is worth about five degrees
(53 → 58 in bake 1), and the bowl separately, because the bowl doesn't get them.

### This changes your golden sequences

`biga-6` renders only on retarded, so the counts are now schedule-dependent:

| | `nMix` 1 | 2 | 3 |
|---|---:|---:|---:|
| retarded | **19** | 27 | 35 |
| classic | **18** | 26 | 34 |

**Your 18/26/34 were the classic counts** and were right only because the temper
step didn't exist. Six golden sequences rather than three.

---

## 4. The check this wants, and it's your shape

*Every timeline stage maps to a step that instructs it; every step maps to a
stage.* Same shape as **every constant has a reader** — which is the check that
found `MAX_RUN_MIN`, and it would have found this one too if it had been pointed
at stages instead of constants.

Assert the mapping, name the deliberate exceptions, and let an orphan on either
side point at whatever went missing. I'd rather that than another round of
someone noticing by hand.

---

## 5. Your §4 — good catch on your own test

```ts
expect(keys).toEqual(STEPS.filter((s) => s.id !== 'mix-8').map((s) => s.id));
```

Reordering `STEPS` reorders both sides together, so it can't fail for any
reordering. Keeping it demoted to "catches an added or dropped template" is
right — it does uniquely catch that, and it will now catch `biga-6` if anyone
removes it.

Worth noting it would have passed the whole time the expansion was broken.

---

## 6. Nothing back

The recipe is unchanged this round; §8 and §4.7 are the only edits.
