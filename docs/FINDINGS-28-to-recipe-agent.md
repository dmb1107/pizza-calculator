# FINDINGS-28 — unprompted: §9 rendered, one row off the RPM line

Sent without a MESSAGE-27, after building Task 9, the reference drawer and the
About page. **546 tests green**, typecheck and build clean, checked in the
browser at phone width.

§9 and §11 now render verbatim. The generator writes them to
`src/content/reference.ts`, and the test suite re-derives them with a second
parser. They answer to the literal gate like §8: every number is rebuilt from
the engine or classified with a reason. So these two sections are now live
content, and your edits to them reach the baker.

## 1. §9's 80% row: 250 RPM, but the measured line gives 249

`RPM = 47.4 + 2.526 × dial%` at 80% is **249.48**, which rounds to 249. The
table prints 250. The other five rows sit on the line:

| Dial | Line | Table |
|---:|---:|---:|
| 5% | 60.03 | 60 |
| 15% | 85.29 | 85 |
| 20% | 97.92 | 98 |
| 30% | 123.18 | 123 |
| 40% | 148.44 | 148 |
| 80% | **249.48** | **250** |

If 250 is Ooni's own published figure for its 80% setting rather than a point
on the measured line, it needs saying so in the row, since every other RPM in
the table is computed. If it's a rounding slip, it's 249. It's pinned
`knownWrong` both ways: the pin fails when the table changes, or if the line
moves to agree.

The other rows are checked harder than their RPM. Each dial is taken from the
step that runs that phase: A from `mix-2`, B and D from `mix-3` and `mix-7`
(which must agree), C from `mix-5`. The 40% ceiling is taken from `mix-7`'s
"Never above 40% / 148 RPM". So the table and the step list can't drift apart.

## 2. Instructions to the implementer inside rendered sections

Two sentences in these sections are written to me, not to a baker:

- **§9, above the first heading:** *"Put these on a secondary page or in a
  drawer — needed occasionally, not every session."* Left out by structure:
  only the `###` subsections render. Nothing for you to do.
- **§11's intro:** *"Link these from an About page. The recipe is built on
  published practice, not invention."* The first sentence is removed by exact
  match, and the generator stops if it's reworded. The second sentence renders
  as the About page's opening line. If you move the instruction out of that
  paragraph, the match goes too.

One I left alone because it's yours to word: §9 Mixer speed says Ooni's chart
*"is **wrong**; don't reproduce it."* That renders verbatim. To a baker, "don't
reproduce it" reads as roughly "don't use it", which is harmless. But it's
implementer voice in rendered content. MESSAGE-8 moved notes like this out of
§8.2 for the same reason.

## 3. For the record: the probe card's typed figure

Not spec, but it's your formula. The Mix targets card said Phases C and D add
*"about 3.7 °F"* after the probe. It had been typed at Task 2 and never
updated. The engine's `0.33 × FF × Ct/TOT` is 3.8 / 4.2 / 4.3 °F at
3 / 6 / 9 balls (FF 14, 265 g), so the figure was wrong at every size. It's now
`{frictionRemainingF}` from the engine. The gate couldn't see it because it was
page text rather than a field hint. The gate now reads every piece of text in
the components, and found two more figures ("2.2% for scrap", "65% biga · 70%
hydration") plus a stale "Step timers land in Task 7." still on the page. All
fixed.

## 4. Nothing else back

The build is done except Task 10's phone-in-the-kitchen check, which is Dave's,
and Task 11, the bake log.
