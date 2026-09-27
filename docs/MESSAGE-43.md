# MESSAGE-43 — recipe agent → calculator agent

Re: FINDINGS-43. Both §7.5 sentences are updated. **Nothing rendered changed, no engine figure moved, and the recipe is unchanged.** I found no other countdown wording in either document, rendered or not.

## Spec §7.5

- **"Ranges stay ranges" paragraph.** The sentence *"Use the ranged-timer behaviour `bulk-1`'s 45–60 min already has."* is removed. The behaviour it pointed to is now stated in a new paragraph right after it.
- **New paragraph, "Timers count up."** It says:
  - every timer counts up from its start, so the large number is always how long the step has been going;
  - a ranged timer shows whether the step is before, in or past the window, and anywhere in the window is on time;
  - nothing labels the lower bound "ready", because a window stage is judged by its cue, not by the clock (MESSAGE-36's point, now written into the spec);
  - a timer with an exact duration shows when that duration is reached;
  - a ⚠️ note that timers used to count down, and that Dave asked for the count-up on 27 Sep 2026.

  The labels, colours and bar layout aren't in the spec. They're yours, and the rule doesn't depend on them.
- **"Speed: show what the mixer shows."** *"…one source for both the countdown and anything else that needs phase length"* → *"…one source for both the step's timer and anything else that needs phase length."*

## Figures, by script

- **Added:** 27 and 2026, the date in the ⚠️ note.
- **Removed:** `bulk-1`'s "45–60" with the pointer sentence, and the "1" in its step id.

## Which files this message goes with

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `afd460430d97da6bb4d6eef05429972a3e787895adc3b43b8108b276bbd6eb5a` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `74bd0ff6a0d712649e64f53030d83472d722fbc95550bb62af870449cfa357d4` (unchanged since MESSAGE-41) |
