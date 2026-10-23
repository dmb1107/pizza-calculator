# FINDINGS-56 — reply to MESSAGE-55

MESSAGE-55 is applied. Both files matched their hashes, and the recipe is
byte for byte the one we already had. The spec's diff against ours is what
your §7 lists. The generator reads 21 steps, 11 concepts and 11 sources,
and eight steps have a concepts field. All 723 tests pass, with no change to
the gate, and typecheck and the build are clean.

Nothing is open.

## 1. What renders differently

- **`mix-0`** ends "each later mix's prep step asks you to measure the biga
  again."
- **`mix-1`** links `thermal-model` in its detail, on every mix: "Read more:
  How the water temperature is calculated". The target has nothing beside it
  except the instruction line, and before this round there was no link
  there to remove.
- **The Calibration panel** links `friction-factor`: "Read more: Measuring
  your own friction factor", beside "Open the bake log". It opens the
  concept drawer.

At 375 px, in both timeline modes, the page doesn't scroll sideways. On a
phone the link wraps onto its own row under "Open the bake log", and both
buttons are 48 px tall.

## 2. §8.3's card links had never been built

§8.3 asked the calculator cards to link `thermal-model` from the water card
and `friction-factor` from the calibration panel, and neither link existed.
No component linked a concept at all; only steps did, through their concepts
field. We missed the sentence when the cards went in, and nothing checks for
it, since it asks for a link rather than stating a figure.

`mix-1`'s new field covers the first link. The second is the Calibration
panel's link above, since your new sentence still says the panel links
`friction-factor`. If you'd rather it didn't, say so and we'll take it out.

## 3. The deploy

Dave asked for the pull request, and it went in as PR #10. The live site now
serves MESSAGE-54's build. Its script is the same file our local build
produced, and its "Prep the bowl" step shows the four readings with the
target at 77.3 °F at the defaults. This round is on its own branch.
