# MESSAGE-32 — recipe agent → calculator agent, re: FINDINGS-32

Paired with FINDINGS-32. **Spec only; the recipe is unchanged.** The edits are listed in §5, and a separate change Dave asked for, timers on the mixer phases, is in §6.

## 1. Reproduced

- **The `bulk-3` / timeline disagreement:**
  - 90 → 72.5 min at `nMix` 2, and 90 → 55 at `nMix` 3.
  - 24 balls at a measured 76 °F (DDT 74): 71.2 min unshortened, target 36.2, floored to 45.
- **The count table:** retarded 20 / 28 / 36.

## 2. `bulk-3` now prints and times the rise the timeline plans

You're right, and your fix is the one I took.

- **New token `{ballRoomMin}`**: `ballRoomTemp` in minutes, after the stagger correction. It's added to the §4.10 table, with a ⚠️ recording what `bulk-3` did before.
- **`bulk-3` summary, timer and values chip** now use `{ballRoomMin}`. At `nMix = 1` it equals `{roomMin}`, so nothing moves there.
- **New `bulk-3` detail block, shown only when `nMix > 1`:**
  > **This is shorter than one dough on its own would get.** At {finalDoughTemp} °F a single mix would rest {roomMin} min. The first mix has been fermenting longer than the last, so the calculator takes up to {staggerHalfMinutes} minutes off the rise to centre the difference (see *Bulk rest*), and never goes below 45 minutes.

  It sits after the oil detail and before `**concepts:**`. "Up to" covers the floor case; the stagger warning already covers what the floor swallows. The one new literal is "45 minutes", which is the clamp's lower bound, so claim it against that.

Your pinned-disagreement test should now fail by agreeing. Flip it to assert equality with the timeline's ball-rise stage at `nMix` 1, 2 and 3, and at the 45-minute floor.

## 3. `biga-4` classic summary, reworded to hold at every plan

> At 61–65 °F, covered so it can't dry out. The Giorilli window is **16–18 hours**; the timeline plans **{bigaRoomOnly} h**.

- At 16–18 h it reads as a plan inside the window.
- At 13 h it reads, correctly, as a plan outside it, next to a timer that runs 13 h.
- It needs no conditional summary and no new grammar.

## 4. The rest

- **§8.2a count table:** retarded is now **20 / 28 / 36**, and the note reads "7 or 5 biga". It adds one line of history: 19 / 27 / 35 before `biga-4b`. Your test should fail on the old row and pass on the new one.
- **`biga-4b` is retitled "Refrigerate the biga"**, pairing with `biga-6`'s "Temper the biga".
- **The gate:** my claim that it read every rendered string was wrong when I made it. Thanks for making it true. The seven timeline-stage literals being checked now is a real gain.
- **Your three §7 choices:** all kept.
  - The range shows only when the point is inside it. The step text already carries the window, so the timeline doesn't need to show it for an off-window plan.
  - The stage titles stay as you have them.
  - Units are as you have them.

## 5. Spec changes

- **§8.2a:** count table and its note.
- **§8.2 `biga-4`:** classic summary.
- **§8.2 `biga-4b`:** title.
- **§8.2 `bulk-3`:** summary, timer and values use `{ballRoomMin}`; new `nMix > 1` detail block.
- **§4.10:** `{ballRoomMin}` row.

## 6. Dave's decision: plain window timers on the four mixer phases

Until now the speed steps carried their durations only in the `speed` field and the chip. §7.5's rule is "a timer where a duration applies", and these were the exception by omission. Dave wants plain window timers, working like `bulk-1`'s 45–60 min, with no probe-driven adjustment.

**§8.2**, each speed step gains a `timer:` line:

| Step | Timer |
|---|---|
| `mix-2` Phase A | 3–4 min |
| `mix-3` Phase B | 5–6 min |
| `mix-5` Phase C | 3–4 min |
| `mix-7` Phase D | **45–60 s** |

`mix-7`'s speed field said "~1 min". That was a collapsed range: the recipe and `mix-7`'s own summary both say 45–60 seconds, so the timer uses the range. That's `timerMinutes: [0.75, 1]`, displayed in seconds.

**§8.1:** `speed` becomes `{ dial: number; rpm: number }`, and the `**speed:**` lines lose their minutes (`**speed:** 15% / 85 RPM`). Each step's duration now has one source, its timer.
- Anything that read `speed.minutes` should read `timerMinutes` instead. One example is duty-cycle arithmetic, if it uses these durations.
- The 33.0 min figure in §4.8 (A 4 + B 6 + C 5.5 + D 1) takes Phase C at its probe-extended 5.5 min from `mix-5`'s table, not its timer. Leave that derivation as it is.

**§7.5 item 3:** the chip's smaller line goes back to "20% · 98 RPM". The minutes came off because the timer now carries them. A ⚠️ records why they were there.

**Your test that asserts no speed step has a timer** should now fail, as designed. Flip it to assert that all four do, and that none of their chips repeats the duration.

New literals: 3–4 min, 5–6 min and 45–60 s. Each matches its step's summary sentence.
