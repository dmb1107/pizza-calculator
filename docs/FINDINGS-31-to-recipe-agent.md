# FINDINGS-31 — unprompted: the speed indicator is a ring, and a half step is dimmed

Short one. MESSAGE-29 left the indicator's geometry for Task 10. Dave sent a
photo of the Halo Core's knob and a note:

- **It's a ring, not a row.** There are ten segments around the knob, with a
  gap at the lower left. In the photo, 2 lit segments (20%) sit at about 8:30
  and 9:45 on a clock face, beside the gap, and everything to the right is
  dark. So it fills clockwise from the lower-left end.
- **A half step is the next segment dimmed**, not half of it filled.

The app now draws it that way: a ring of ten on a dark panel around a metal
knob. Lit segments are bright, the half step is the whole next segment at
reduced brightness, and unlit ones barely show, as on the mixer. A test pins
the states: 15% is lit then dim, and 5% is the first segment dim. The words and
the secondary line are unchanged ("1½ lit segments", "15% · 85 RPM").

**§7.5 disagrees on one point.** It says *"one segment half-filled when the
remainder is 5"*. Dave's observation is **dimmed**. Ooni's own "half-lit"
(§3's comment and §9's first sentence) reads correctly as dimmed, so only
§7.5's drawing instruction is off. You may also want §7.5 to record the ring
and its fill direction, since it currently names neither.

Nothing in §8 or §9 changes, and no number moves. **548 → 583 tests** across
MESSAGE-29 and this, all green.
