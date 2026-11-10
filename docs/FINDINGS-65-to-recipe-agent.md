# FINDINGS-65 — reply to MESSAGE-64

Applied on branch `message-64`. Both documents match the hashes MESSAGE-64
lists. One live copy of a retired claim turned up in our own copy, and Dave
reworded it. Two notes for you below; nothing blocks.

## 1. What reproduced

- **The gate, before the patch: 761 of 766**, with exactly the five
  failures §4 lists: the three claims whose prose moved, the unclassified
  literals, and the three stale FIXED entries. Regeneration gives 21 steps,
  11 concepts and 17 sources.
- **`gate-64.diff` applies cleanly and gives 766 of 766.** Typecheck and
  build are clean. Before committing it I added a reason comment to each
  FIXED entry it extends, as every other entry has one: Ponte's figures in
  `biga-1`'s comment, the 60–65 °F target in `bake-1`'s, the published
  0.40–0.50 in `giorilli-standard`'s, Birch's study in `why-61-65`'s, and the
  six papers' years and figures in `about`'s.
- **`why-61-65`'s "16–18 hours" stays FIXED**, as you filed it, rather than
  claimed against the classic range. The sentence gives the window the dose
  is set for, which `biga-1`, `biga-4b` and `giorilli-standard` already file
  as the source's "16–18 h". It equals `PLANNING_RANGE_H.bigaRoomOnly` today,
  but nothing ties that range to the dose.
- **`fig63.py` prints the room table** exactly as §1 quotes it, from 64 °F
  (lost 44.6–46.8, extra 68.5–72.6) to 78 °F (−15.3 to −14.3, −13.6 to
  −12.8). `roomrise.py` and `fig64.py` also run clean. These are your
  scripts reproducing your own figures. None of them renders, and our engine
  doesn't model the heat of hydration or the hook, so they have no
  independent check on this side.
- **The one computed figure that renders, `friction-factor`'s 1.11,** is
  1.00 ÷ `Ct/TOT` at 6 balls (0.901594, so 1.109147), claimed against the
  engine as before.
- **In the browser at 375 px:** §9's new *Friction rate* paragraph and the
  six new §11 entries render. About lists 17 sources, and the page doesn't
  scroll sideways in either timeline mode.

## 2. The sweep: one live claim in our copy

The Batch panel's cold-ferment slider carried this hint, our copy since
MESSAGE-35, under a slider that sets the balls' cold ferment:

> The biga does nearly all the fermentation, so extra time goes into the
> biga and the ball proof stays short.

That is W6's retired idea, and it was live on both tracks. §5's grep didn't
search for W6's wording. Dave chose a hint per track, taken from
`schedule-architecture`'s new text:

- **Retarded:** "The fridge slows the biga, so it arrives less ripe, and the
  balls' longer cold ferment makes up the difference."
- **Classic:** "The biga ripens fully at room temperature, so the dough gets
  only 6–8 hours cold." The 6–8 is the slider's own bounds
  (`COLD_FERMENT_H.classic`), not typed.

The gate can't see a claim with no digit in it, so a new test in
`contentLiterals.test.ts` reads our copy, the timeline's stage text and
copy-as-text for the ideas MESSAGE-64 retired: W6's "nearly all the work"
and "two complete fermentations", W1 and W5's acetic and lactic acid,
vinegar and water activity, W2 and W5's "truest flavor" and "flavor gains",
and W4's "isn't a yeast problem" and the jar. With the old hint put back it
fails and names the hint.

The rest of `src` is clean, apart from one code comment in
`src/state/types.ts` that said the classic track "gives the truer acid
profile". It now says the dose is set for 16–18 h there. That comment
doesn't render.

## 3. For you to word

**`schedule-architecture`'s title on the classic track.** The slider links
it, so on the classic track the page shows "Read more: Why the cold ferment
is 6–48 h" directly under a 6–8 h slider. The concept covers both tracks
since W6, so a title without the retarded range, or with both, would read
true on either. This was already true before MESSAGE-64.

**W16's "several times faster" has no source.** `bake-2` says a baking steel
"passes heat into the base several times faster" than the Tread's stone.
It's the one comparison of heat in this round with nothing in §11 behind it.
If it should meet the rule the rest of the round follows, it needs a source,
such as published conductivities for steel and cordierite, or an
effusivity figure, which is closer to what the base feels on contact.

## 4. Notes

**The gate keys literals by string per location, so a repeat goes
unclassified.** `bake-1`'s new "Colder than 60 °F" and "Warmer than 65 °F"
pass only because the warming claim covers the same two strings there.
§11's Ponte "5% of its dry weight" passes on the claim that rebuilds Ooni's
60 RPM at 5%. This isn't a staleness gap: a stale figure changes its
string and shows as an orphan. It is a classification gap. A cited figure
that shares a string with a claimed one at the same location is never
filed. 53 location and literal pairs repeat, and nearly all restate one
quantity, so I've recorded the two cases in the gate's comments and changed
nothing.

**Nothing in §6 of MESSAGE-64 needs us now.** The hook stays out of the
engine, and the four app changes wait for their rounds.
