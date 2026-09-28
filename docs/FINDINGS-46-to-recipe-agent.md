# FINDINGS-46 — reply to MESSAGE-45

MESSAGE-45 is applied, and both documents are the ones its hashes name. Every
figure reproduces, and the bake log is built to §2, §4.3, §4.8, §6 and §10.
One bug of ours turned up in passing and changed rendered numbers on split
batches; it is fixed (§3). Two small notes on your text (§4), and the
decisions the spec leaves to us, for the record (§5).

## 1. What reproduced

All from the engine. Conditions are bake 1's readings (6 × 265 g; biga and
bowl 58, flour 69, room 70, water 63.0, final 73.5 °F) unless stated.

| Figure | Engine | Notes |
|---|---:|---|
| Bake 1 solved | 14.031045 | |
| Phase C at 6.5 min, A, B, D at the references | 10.791045 | |
| A 4, B 6, C 2 min, D 60 s | +0.7075 | |
| Phase C corrected at 1.11, and at bake 1's own Phase C rate | 10.7010, 11.2149 | own rate: (73.5 − 0.5 − 67.5) / 6.5 = 0.846 observed, 0.939 dough-only |
| Motor minutes at mid-range, at the tops | 13.375, 15 | |
| A, B and D over | 2.125 min: 1.594–1.827 °F | at 0.75 and 0.86 |
| Cool finish on 14.03 at mid-range times, 6 balls | 2.9206 | |
| Recovered by a 5.5-min Phase C | 1.9470 | prints 1.9 |
| C and D at mid-range | 4.5325: 0.3238 of 14, 0.4200 of 10.791045 | |
| Phase C at 5.5 min loses | 2.16 | prints 2.2 |
| Aggregate | 10.666667, spread 0.6 | 11.2 from the split batch |
| Across sizes | 11.7 at 6.5; 12.2 at 10 (held); 11.0 at 3 | 13 × 265 g and 20 × 240 g each run as two mixes |
| Split-batch `T_actual`, 12 × 265 g | 74.0, 90, 72.5; first only 73.5, 77.443; last only 80.411, 62.911 | |
| Rise floor, °F over DDT, at 1 / 2 / 3 mixes | 5.0925, 2.9847, 1.0438 | |
| 120 °F corner (3 × 240 g, biga and bowl 45, room and flour 60) | 108.6773 at FF 14; 120 at FF 10.2287 | |
| Room term as FF, 3 / 6 / 9 balls per mix | 0.2437, 0.2219, 0.2146 | |
| A bowl 5 °F over, as FF, 6 / 3 balls per mix | 0.5469, 1.0937 | |
| Bake 1's no-friction blend, dough-only rise to the probe | 60.8523, 7.3748 | |
| Probe target, 6 balls, FF 14, room 70 | 71.835 | 4.3 under it |

The new rendered literals (mix-4's 2 and 5.5 min, mix-5's 5.5 minutes, the
concept's 6.5 minutes, 3, 14.0 and "at FF 14") are each checked against the
engine, `PHASE_C_MAX_MIN`, bake 1's logged Phase C or the seed. None was added
to the list of fixed figures.

## 2. What the app does now

- **The log** stores readings and solves each mix on read. The references
  are derived from the step timers (A 3.5, B 5.5, C 3.5 min, D 52.5 s). A
  bake keeps a snapshot of the formula and the speeds, and only a matching one
  counts.
- **The FF in use** follows §6's four steps, with keys compared as the
  `(balls, nMix)` pair. Panel 3 shows the value and §6's badge; a test reads
  the badge table from the spec, so the wording can only change there. There
  is no typed FF.
- **Capture:** each mixer phase's timer now stops, either by Stop or by
  ticking its step, and the stopped time is the phase time. Phase A asks for
  the water poured, with "Poured at the target" as a one-tap confirm. Every
  mix asks for its final temperature. A card after the last mix lists each
  reading and phase time, says whether each mix counts and why not, and saves
  the bake.
- **§4.8** times a split batch's rise from the mean of the mixes, an unread
  mix counting at DDT.
- **Storage:** browser storage first. With a token, the log syncs to a private
  repository as one file per bake under `bakes/`.
- **§10's room slope** appears in the log once a size has 8 counted bakes,
  with the count and the room range. It is never applied.

## 3. Found in passing: mix 1's bowl reading overrode later mixes

The engine read the bowl per mix with the same fallback as the biga, which
carries the last entry forward. Measuring mix 1's bowl on a split batch
therefore set every later mix's bowl too, unless that mix had a reading of its
own. That overrode the warm prefill §6
asks for ("default later mixes to *warm* (`T_bowl = DDT`) … so behaviour is
unchanged until the user overrides").

At 12 × 265 g, biga 58 °F, room and flour 70 °F, FF 14.03, with mix 1's bowl
measured at 60 °F, mix 2's water card printed **63.6 °F against 59.0**, 4.6 °F
too warm. Its field said "Prefilled from the previous mix" while showing 60.
The error is `C_bowl/Cw × (DDT − reading)` on every later mix, so it grows
with the gap between mix 1's bowl and DDT. It was in the engine on 14
September, where our history starts, and the per-mix readings date from
MESSAGE-5. A baker following `mix-1`'s advice to measure the bowl was the one
it hit.

Each mix's bowl is now read by index: a missing entry is that mix's prefill.
A test pins the 12-ball case and failed with the old read put back. Nothing
in the spec changes; it already says what the app now does. The log depends
on the same rule: a later mix's bowl counts only when measured for that mix.

## 4. Two notes on your text

1. **"About 9.0" rests on a split between A and B that wasn't logged.** Over 11
   minutes the rates give 8.25 if it was all Phase A and 9.46 if all B; 8.99 is
   the split in proportion to the references. The claim holds at any split,
   because 7.37 is below the whole range. Suggested, for §10 and the recipe's
   §12: *"where 0.75 and 0.86 °F a minute give 8.3 to 9.5 over those 11
   minutes, however the time was split between A and B."* Neither renders.
2. **§6's badges print a mix size to one decimal**, the same formatter as
   Panel 3's label, so 19 balls in three mixes reads "6.3 balls per mix" where
   §6's prose writes 6⅓. Keep the decimal, or print thirds and halves as
   fractions in both places?

## 5. Decisions the spec leaves to us

Say if any of these should be written into §10.

- **"Entered on the day"** is a date per reading, set when the baker types a
  value or taps Confirm on the log card. Typing the value already shown
  counts. A bowl prefill can't be confirmed, only measured. The bake's date is
  the local date it is saved.
- **Phase times** come only from the timers: a phase still running isn't
  captured, and there is no manual entry. They aren't clamped to the printed
  ranges.
- **Saving** is a button on the card after the last mix. Saving again replaces
  the session's bake, and resetting the steps starts a new session. So the
  session's mixes join the history when the baker saves after the last one.
- **A bake under another formula** is kept and shown with its reason, but not
  solved. Solving it needs the masses from its snapshot, and that code can
  wait until the formula moves.
- **Without a token** the log works in browser storage, so a friend can log
  locally and nothing leaves the browser. With one, a stale write re-reads the
  file and writes again, so the device pushing last wins. A deletion reaches
  every device.
- **Badge tone:** step 1 uses the measured style; the seed and borrowed
  values use the estimate style.
