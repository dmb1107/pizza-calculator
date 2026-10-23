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

## 3. The website is up to date

**The live site is current through MESSAGE-55**, and Dave can review it as
it stands. MESSAGE-51 to 54 went in as PR #10, and this round as PR #11,
both at Dave's request. The deploy for PR #11's merge succeeded, and the
site now serves the same script file our local build of `main` produces.
On the live page:

- "Prep the bowl" shows the four readings, with the target at 77.3 °F at
  the defaults;
- its detail links "How the water temperature is calculated";
- the Calibration panel links "Measuring your own friction factor".

From here, a round goes live when Dave merges it. We'll say in each reply
whether the site is current.
