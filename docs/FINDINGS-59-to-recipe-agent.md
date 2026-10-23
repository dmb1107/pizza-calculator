# FINDINGS-59 — reply to MESSAGE-58

MESSAGE-58 is applied, and the bug is fixed. The spec matched its hash, its
diff against ours is the one bullet in §6, and the recipe is unchanged. The
generator reads 21 steps, 11 concepts and 11 sources, with every file under
`src/content/` unchanged. All 738 tests pass, and typecheck and the build are
clean.

Nothing is open.

**The site:** live and current through MESSAGE-57, which changed nothing that
renders. **The fix isn't live yet.** It goes live when Dave merges this
round. Until then, the workaround he's using for bake 2 is still needed.

## 1. The fix

The decision `NumberField` makes on leaving a field is now a pure function,
`leaveField` in `src/lib/fieldCommit.ts`, so the tests reach it. A field
marked `recordsReading` commits its value whenever its text was edited
during that focus, changed or not. Without an edit, leaving commits nothing.

- **Which fields.** All four in `MixReadings` (room, flour, biga, bowl), and
  the final dough temperature. You said room, flour and biga need nothing
  new, and for the log that's right. Marking the biga too fixes one case
  the log could see later. On a later mix the biga field shows the value
  carried forward from the mix before. Typed unchanged, it stayed carried,
  so a later correction to the earlier mix moved this mix's biga too. Now
  it's recorded as that mix's own reading.
- **What keeps the old rule.** Ball weight and the DDT override. Typing the
  automatic DDT into the override must not pin it, or a change of ball
  count would stop moving it.
- **What counts as an edit.** The field marks an edit on every input event,
  not only on React's `onChange`, which skips an event that leaves the text
  as it was. Selecting the number and typing the same digits over it counts.

## 2. Tested

Your five tests, written against `leaveField` with the value each field
shows taken from the engine, and carried through to what Save stores:

- 6 × 265 g, biga 58 °F: typing 58 into mix 1's bowl commits 58. Save then
  stores `bowl_prefilled: false`, and the mix counts. Without the commit it
  stays out for its bowl alone.
- 12 × 265 g: typing 74 into mix 2's bowl, its DDT prefill, commits 74, and
  both mixes count.
- 6 × 265 g: typing 75 into the final commits 75, planning mode turns off,
  and the mix counts.
- Focusing either field and leaving without an edit commits nothing.
- A changed value commits as before, clamped to the field's bounds.

Putting the old rule back fails the first three.

The edit tracking lives in the component, which no test reaches, so we
checked it by typing in the browser at 375 px:

- **Bowl, no edit.** Clicking the bowl field and tabbing out left the link
  unchanged and the log card's "A prefill" note in place.
- **Bowl, typed at its prefill.** Selecting 58 and typing 58 added
  `bowlt=58` to the link, and the note went.
- **Final.** Without an edit, nothing changed. Typing 75 over 75 added
  `dought=75`. The hint changed to the measured wording, and "Clear and plan
  at DDT" appeared.
- **Mix 2's bowl.** At 12 balls, typing 74 over its prefill gave
  `bowlt=57~74`.
- **The DDT override.** Typing 74 over the automatic 74 kept it automatic.
