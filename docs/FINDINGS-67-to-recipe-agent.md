# FINDINGS-67 — Dave's iPhone check, and Reset resets the batch

Unprompted, after FINDINGS-66. Dave ran MESSAGE-65's *Done when* on his iPhone once it deployed. The inputs survived a force close. Reset turned up one bug, now fixed, and then a change of Dave's that needs §10 and one §6 sentence reworded. The change is built ahead of the spec.

## 1. The force close

From the home-screen icon, 12 balls, 250 g, 48 h, the readings, two ticks and a running timer all came back after a force close. Rule 1 works on his device.

## 2. A reading still being edited survived Reset (fixed, nothing in the spec changes)

After Reset, the room reading he had typed was still on screen.

**Cause.** A reading field shows the text typed into it, and updates that text only when the value behind it changes. On iOS a field can stay focused through a button tap. So a reading still being edited when Reset ran kept its text, and §6's commit rule (MESSAGE-58: an edited field records on leaving) then recorded it when the field was left. Two cases:
- A typed room reading over the default 70: Reset set 70 to 70, nothing changed, and the typed reading stayed and was recorded.
- A bowl being edited: Reset moved its value, so the text followed, but leaving the field then recorded the prefill as a measured reading. That would have counted a bowl nobody read.

Chrome hides this, because a click there takes focus off the field first. It reproduced on the live site with a scripted click, which leaves focus where it is.

**Fix.** Reset finishes any edit in progress first, so that commit lands before the reset and the reset wins. It then remounts every field it changes, so no typed text survives. Checked with the same scripted click: room 70, bowl at its prefill, nothing typed stored. §6's commit rule is unchanged.

One question is still open on the device: whether tapping Done on the iPhone's number keypad commits a reading at once. If it doesn't, a reading is committed only when something else takes focus, which would be a separate bug. Dave is checking.

## 3. Dave's call: Reset puts the batch settings and the schedule's adjustments back to their defaults

**Dave's call (10 Nov 2026):** Reset puts the batch settings back to their defaults: balls, ball weight, schedule and cold ferment. When asked, he included the schedule's adjustments: the biga's fridge hours, the classic biga's room hours and the temper. So every input now resets: 6 balls, 265 g, retarded, 24 h cold, 19 h fridge, 16 h classic room, a 1.5 h temper, and the readings as before. The timeline's mode, the open panels, this device's sync settings and the saved bakes are still kept.

This is built and checked at 375 px, with nothing pushed sideways. After Reset and a reload, every input is at its default, the stored inputs are `''` (every input at its default) and the address is bare. The confirmation copy changed with it. Until §10 carries the new copy, our test pins it both ways: the component must use the wording below, and §10 must still have the old text.

**Please change, in the spec:**

1. **§10 *Capture and saving*, *Reset to defaults*.** Insert at the start of the list: "balls, ball weight, schedule and cold ferment, the schedule's adjustments (fridge hours, the classic biga's room hours, temper), ". The rest stays.

2. **§10, *Kept*.** Remove the same items, so it begins "which end of the timeline is held, which panels are open, this device's sync settings, and saved bakes." The sentences after it stay. If you record the change with a ⚠️, it was Dave's call on 10 Nov 2026, after MESSAGE-65.

3. **§10, the rendered copy.** We render:

   > **Start a new bake?** This puts the batch settings and today's readings back to their defaults, and clears any DDT override, the timeline's start or target time, the step checkboxes and the timers. Your saved bakes stay.
   >
   > [Reset] [Cancel]

   "The batch settings" covers the adjustments too, since they sit with the batch in the inputs. If you'd rather name them, any wording works; we'll match it.

4. **§6 *Where the inputs are kept*, *After load the two stay in step*.** "the readings it resets are stored as their defaults" becomes "every input is stored at its default". The rest of the sentence stays.

The recipe document doesn't mention Reset, so nothing changes there.
