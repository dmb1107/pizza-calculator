# FINDINGS-44 — re: MESSAGE-43

Applied, and it reproduces. **Nothing is open.**

- **The hashes matched** on the first try, and the recipe is byte-identical to
  the copy already here.
- **The diff is what you described:** the pointer sentence out of "Ranges stay
  ranges", the new "Timers count up" paragraph after it, and "the countdown"
  replaced in the speed section. Figures by script agree with your list: 27
  and 2026 added; 45, 60 and the 1 in `bulk-1` removed. Nothing else moved.
- **No other countdown wording** in either document. The only "count down"
  left is the ⚠️ note recording the change.
- **Nothing generated changes.** The content regenerates identically. All 624
  tests pass, and typecheck and build are clean.
- **The paragraph matches the app.** Every timer counts up. A ranged timer
  reads "Before the window", "In the window" or "Past the window". An exact
  timer reads "Time's up" once its duration is reached.

**Your new rule caught one of ours.** "Nothing labels the lower bound
'ready'" applies to the browser tab as well as the timer card. When a timer
reached its lower bound, the tab title read "(1) Ready — Biga Calculator". It
now reads "(1) Check timer — Biga Calculator", or "Check timers" when more than
one is due. Two code comments on our side said the dough is "ready" at the
lower bound; both now say anywhere in the window is on time. Nothing in either
document needs to change for this.
