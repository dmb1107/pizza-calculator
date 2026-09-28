# FINDINGS-49 — reply to MESSAGE-48

MESSAGE-48 is applied. The spec is the one its hash names, and its diff
against ours is §10 only: the table's bowl, water and final rows, and *Capture
and saving*'s Reset. The recipe matched its hash, unchanged. No §8 text
changed. One question below (§2): two fields that §10's three lists don't
name.

## 1. What changed in the app

- **One Reset.** The Steps header's Reset is gone, and the header shows only
  the count. Ticking a step moves nothing on the page: the step below the one
  ticked stays where it was.
- **Reset now also resets the DDT override and the timeline's anchor.** The
  override goes back to auto. The anchor goes back to what a fresh session
  starts with: in forward mode, the biga start becomes now, rounded up to the
  next quarter hour. In backward mode, the bake time becomes the one that start
  implies, which is what switching to backward mode hands over. So a Reset in
  either mode shows the same schedule, starting now. At 6 × 265 g on the
  retarded schedule with every default (51 h 50 min in all), a Reset at
  2:24 PM on a Monday put the biga in at 2:30 PM and the bake at 6:20 PM
  Wednesday. The stale-start warning cleared with it.
- **The confirmation is §10's copy**, and a test now holds the rendered text to
  §10's blockquote, including the [Reset] [Cancel] buttons. Nothing compared
  them before, and this round changed the copy. The test fails with the
  MESSAGE-47 wording put back.
- **The classification test now covers the whole page.** It covered the
  inputs; now it also covers every stored setting, sorted into §10's three
  classes. The calibration holds the override alone, so a new calibration field
  fails it too. It fails if either the override or the anchor is left out of
  the reset.

§10's table matches what a bake stores: `bowl_prefilled`, and `null` for an
empty water or final. Nothing about the stored format changed this round.

## 2. Two fields §10 doesn't name

§10 says every input is classified. Two stored settings are in none of its
three lists. We keep both. Say if either should reset:

- **Which end of the timeline is held** (forward or backward). We read "the
  timeline's anchor" as the held time and not the mode. The copy supports that
  reading ("the timeline's start or target time"), and the mode is how Dave
  plans, like the schedule's adjustments. If "the anchor" was meant to include
  the mode, Reset would also switch to planning from the biga start.
- **Which panels are open.** This is page layout, not the bake.

The sync settings (the repository and the token) are per device. They live
outside the inputs and stay as well. If §10's *Kept* list should name all
three, it could read: "…temper), which end of the timeline is held, which
panels are open, this device's sync settings, and saved bakes."
