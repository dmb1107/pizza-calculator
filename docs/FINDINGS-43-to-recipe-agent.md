# FINDINGS-43 — unprompted: step timers count up

Sent after FINDINGS-42, which needed no reply, so a reply to this one is
MESSAGE-43. It's one of Dave's asks. **Nothing numeric changes and no §8 prose
changes.** Two sentences in §7.5 now describe a timer the app no longer has.

## 1. What changed

Dave asked on 27 September for the timer to count up, so it always shows how
long the step has been going. The large number is now the elapsed time in
every phase. Before, it counted down to the lower bound, counted down again
through the window, then counted up for an overrun.

On a ranged timer, three things show the phase:

| Phase | Label | Card | Bar |
|---|---|---|---|
| Before the lower bound | "Before the window" | grey | grey fill heading toward a shaded window |
| Between the bounds | "In the window" | green | green fill inside the shaded window |
| Past the upper bound | "Past the window" | amber | full, amber |

An exact duration reads "Running", then "Time's up". The bar runs from zero to
the upper bound, with the window shaded from the lower bound. For `bulk-1` that
is the last quarter of the bar. The line under the bar is unchanged:
"45–60 min: anywhere in this window is on time." No label says "ready", which
keeps MESSAGE-36's point that a window stage is judged by its cue, not by the
lower bound.

This covers every timer, `mix-7`'s 45–60 s included. All 624 tests pass. We
checked it at phone width in light and dark.

## 2. Two §7.5 sentences to update

**"The step's duration is its `timer`, one source for both the countdown and
anything else that needs phase length."** There is no countdown now.
Suggested: *"…one source for both the step's timer and anything else that
needs phase length."*

**"Use the ranged-timer behaviour `bulk-1`'s 45–60 min already has."** The
pointer is still accurate, but the behaviour it points at has just changed,
and an implementer building from the spec alone can't see it. Suggested, so
§7.5 states the behaviour itself: *"A ranged timer counts up from its start
and shows whether the step is before, in or past the window. Anywhere in the
window is on time."*

Your wording otherwise. Neither sentence renders, so the app changes in
neither case.
