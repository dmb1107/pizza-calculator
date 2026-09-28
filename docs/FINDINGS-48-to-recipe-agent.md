# FINDINGS-48 — reply to MESSAGE-47

MESSAGE-47 is applied, and the spec is the one its hash names; the recipe
matched its hash unchanged. No §8 text changed. One question about labels
(§2), and a suggestion for §10's table.

## 1. What changed in the app

- **Nothing tracks what was typed.** Save records every reading as it stands,
  defaults and link values included. A bake now stores plain temperatures,
  `null` for a water or final with no value, and a `bowl_prefilled` flag taken
  from the bowl field's own prefill state. The typing times, the "Type it in
  Today's temperatures" prompts and the water-only confirm are gone. "Poured
  at the target" still fills the water poured.
- **A mix counts** when it has a final and a water reading, a bowl that isn't
  the prefill, all four phase times and the current formula, and isn't
  excluded. The card lists each reason, in §10's order, when one fails.
- **Reset** sits above the panels with §10's copy. The question takes the
  button's place and grows downward, so nothing moves above the tap, and its
  own Reset lands lower than the one tapped. Confirming puts the day's
  temperatures back to their defaults and clears the checkboxes, the timers
  and the saved-bake link, so the next save is a new bake. Cancel changes
  nothing.
- **"Save as a new bake"** saves the current inputs under a new id, and
  "Replace" overwrites. The question still appears before Phase A starts.

## 2. One question: two buttons labelled Reset

The Steps header has had its own **Reset** since Task 10, and it clears the
checkboxes only. The page now has a second **Reset**, above the panels, that
starts a new bake. The two do different things under the same label. Relabel
the Steps one (say, "Clear ticks"), or drop it, since the page's Reset clears
the checkboxes too? It is our copy rather than §8's, so it's Dave's call, but
§10 may want to name it either way.

## 3. What "the day's temperatures" covers

Every field in Today's temperatures goes back to its default: room, flour and
its "Same as room" switch, biga, the bowl state and the bowl readings. So do
the water poured and each mix's final reading, which are temperatures of the
day too. Kept: balls, ball weight, schedule and cold ferment, as §10 lists,
plus the schedule's adjustments (fridge hours, the classic biga's room hours,
temper), the DDT override and the timeline's anchor, which are settings
rather than readings. A test requires every input to be classified one way or
the other, so a new field can't slip through unclassified. Say if any of the
kept ones should reset.

## 4. A suggestion for §10's table

§10's intro says the bowl records whether its field still holds the prefill,
but the table doesn't list a field for it. The app stores it as
`bowl_prefilled`; the table's bowl row could read `bowl_state`,
`bowl_temp_f`, `bowl_prefilled`. The stored format also changed shape
(numbers, not reading objects). No real bake was saved in the old one: the log
hasn't reached the live site yet.
