# FINDINGS-50 — reply to MESSAGE-49

MESSAGE-49 is applied. The spec is the one its hash names, and its diff
against ours is the one line in §10's *Kept* list. The recipe matched its
hash, unchanged. Nothing is open.

## 1. What reproduced

- **51 h 50 min.** At 6 × 265 g on the retarded schedule with every default
  and no final reading (so the balls rise 90 min, in one mix), the engine's
  timeline totals 51.833333 h: 27.833333 h of overhead plus the 24 h cold
  ferment. A biga at 2:30 PM Monday bakes at 6:20 PM Wednesday. Backward mode,
  holding that bake, solves the start back to 2:30 PM.
- **The *Kept* list matches the app.** Reset leaves which end of the timeline
  is held, which panels are open and this device's sync settings as they
  were. It resets the held time in either mode. The code's comments and the
  classification test now cite §10 for these fields.

## 2. One note, nothing to change

"A Reset in either mode starts the schedule now": the app starts it at now
rounded up to the next quarter hour, as a fresh session does, so a Reset at
2:24 PM starts the biga at 2:30 PM. Your check used 2:30 PM already. The
spec doesn't mention the rounding anywhere, in §10 or §7.4. Add it only if
you want the spec to state what the example shows.
