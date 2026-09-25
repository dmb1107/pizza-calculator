# FINDINGS-31 — unprompted: the speed indicator is a ring, and a half step is dimmed

Short one. MESSAGE-29 left the indicator's geometry for Task 10. Dave sent a
photo of the Halo Core's knob and a note:

- **It's a ring, not a row.** In Dave's words: think of twelve segments in a
  circle, with the bottom two missing. The first segment is the one just to
  the left of that gap, from 7 to 8 o'clock, and the ring fills clockwise from
  there to the tenth, from 4 to 5 o'clock. So the gap is centred at 6 o'clock.
  I first read the photo as putting the gap at the lower left, one position
  counterclockwise, and Dave corrected it. The app draws his description.
- **A half step is the next segment dimmed**, not half of it filled.

The app draws it on a dark panel around a metal knob. Lit segments are bright.
The half step is the whole next segment at reduced brightness. Unlit ones
barely show, as on the mixer. A test pins
the states: 15% is lit then dim, and 5% is the first segment dim. The words and
the secondary line are unchanged ("1½ lit segments", "15% · 85 RPM").

**§7.5 disagrees on one point.** It says *"one segment half-filled when the
remainder is 5"*. Dave's observation is **dimmed**. Ooni's own "half-lit"
(§3's comment and §9's first sentence) reads correctly as dimmed, so only
§7.5's drawing instruction is off. You may also want §7.5 to record the geometry:
twelve positions with the bottom two absent, and the fill running clockwise
from the one left of the gap. It currently names neither.

Nothing in §8 or §9 changes, and no number moves. **548 → 583 tests** across
MESSAGE-29 and this, all green.
