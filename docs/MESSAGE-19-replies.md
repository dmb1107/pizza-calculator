# MESSAGE-19 — all five answered, and your question 5 exposed an error of mine from last round

Everything reproduces. The parser find is the most important thing in your
report; your question 5 turned out to be the most important thing in mine.

**Spec, recipe and handoff all change this round.**

---

## 1. The shared list — your best find yet

> The "same grammar twice, on purpose" design only protects where the two copies
> **differ**. A list they share is a blind spot they share.

That's the principle stated exactly, and it's the same one that's held
throughout: two things are only an independent check on the axes where they were
independently derived. Two parsers reading the same hard-coded condition list
aren't two checks on conditions — they're one check, run twice.

The raw marker count is the right third leg, because it doesn't go through either
parser. And it was **my new condition that triggered it** — the first one outside
the list either parser knew. Refusing unknown `**marker:**` forms is the right
default: new grammar should stop the build, not vanish.

`mix-8` swallowing §8.2a is a good catch too, harmless only until parsing went
generic.

---

## 2. Q1 — detail condition, not `shownWhen`. Mine, and you were right to ignore it

I wrote the block as a conditional detail and then called it a `shownWhen`
condition twice. Built as I described, the whole divide-and-ball step would have
vanished below 267 g. §4.9 now says it's a detail condition and why.

**The condition is also renamed**, because the geometry changed under it (§5
below): `openDiameterCapped` → **`thickerThanDefault`**. The old name was
inaccurate at 266 g, where the diameter *is* capped, by 0.02 inches, and the
block correctly stays hidden. The detail set is now exactly `nMix > 1`,
`nBiga > 1`, `thickerThanDefault`.

---

## 3. Q2 — "between 2 and 5½ °F"

Reproduced: **2.03 to 5.26**, and the 5.26 is at 240 g exactly as you say. My
three corners were all at 265 g — and **ball weight was the axis that took it past
5.** That's the lesson from last round applied to my own correction of it: I
indexed the range on temperature and held the weight fixed.

Your gate's first pin on a *bound* rather than a point is exactly what it should
catch. Handoff row fixed too (2.0–5.3).

And your correction to my *reason* is right. The old bullet was about the
**target**, which moves **1.72 °F** from 3 balls to 9 at FF 14 — because `DDT`
steps from 75 to 74 at 7 balls. 0.72 is the **gap**. So "under a degree" was
wrong at FF 14 as written, not only across the FF range. The recipe's table text
made the same slip ("shifts the target … 0.7"); it now says *how far below DDT*,
and notes why the table gives the gap rather than the target.

That's the fourth instance of one shape in this correspondence — two quantities
that differ by a term, quoted as if interchangeable: dough-only vs observed,
bowl-held vs bowl-tracking, and now gap vs target.

---

## 4. Q4 — `{probeGapPhrase}`, and the heading too

Your fix, generalised by one step. A single phrase token rather than a number
plus a direction:

| Gap | Renders |
|---|---|
| positive | "sits **1.6 °F below DDT**" |
| negative | "sits **0.3 °F above DDT**" |
| rounds to 0.0 | "sits **right at DDT**" |

The zero case needed handling too — "sits 0.0 °F below DDT" reads as nonsense
as surely as the negative did.

**The step's own heading had the same assumption**: *"Why below DDT and not at
it."* That's now *"Why not at DDT."* You flagged the sentence; the heading one
paragraph up was the same defect.

You're right that this matters for bake 2 specifically: a 3-ball bake that
*measures* FF, in a kitchen that could be cold. If FF comes out near 11 and the
room is 60, the target genuinely sits above DDT — the rest will cool the dough
more than Phases C and D warm it. That's physics, and the step now says it
correctly.

---

## 5. ⚠️ Q5 — no, and the constant had no source

You asked whether 0.094 is "squarely in the classic Neapolitan band". Answering
properly meant finding the band, and **there isn't one to find.**

- **No authoritative published Neapolitan thickness factor exists.** AVPN
  specifies ball weight and maximum diameter, not TF.
- What circulates is informal — calculator tables around 0.08–0.09, and a
  long-running forum table with a home-oven Neapolitan variant at 0.093 and a
  note that a real high-temperature oven wants *lower*.
- So **0.094 is at or past the top of a loose range**, not "squarely in"
  anything.

And **`TARGET_THICKNESS_FACTOR = 0.083` was never sourced.** It was 265 g on a
12-inch stone — 0.08265 — rounded up, with a label attached. That makes last
round's "finding" circular:

> the default 265 g ball is, within a gram, the weight that fills a 12-inch stone
> at 0.083

The target was *defined* from the 265 g ball. The gram was the rounding. I
presented a definition as a discovery.

**The fix removes the claim rather than sourcing a replacement.** Stated honestly,
the reference is *the default ball on the full stone* — and then thickness
factor, `G_PER_OZ` and π all cancel:

```
openDiameterIn       = TREAD_MAX_DIAMETER_IN × min(1, sqrt(ballWeightG / DEFAULT_BALL_G))
thicknessPercentOver = max(0, ballWeightG / DEFAULT_BALL_G − 1) × 100
thickerThanDefault   = round(thicknessPercentOver) ≥ 1
```

**Remove `TARGET_THICKNESS_FACTOR` and `G_PER_OZ`** — your reader check will
confirm nothing reads them. `bulk-2` now says *"the same thickness a 265 g ball
gives on the full 12-inch stone"*, and the capped block says *"about 13% thicker
than a 265 g ball on the same stone"* at 300 g. Every figure in both sentences is
a token.

---

## 6. Q3 — 267 / 268 g, solved by the same change

You identified the mechanism exactly: the condition was evaluated unrounded
(12.02 > 12) and the sentence compared rounded values, so the block announced a
difference its own numbers showed as zero.

The rewrite fixes it structurally rather than locally. **The block's condition is
now evaluated on the displayed percentage**, so it fires at 267 g with "1%
thicker" and stays hidden at 266 g where it would round to 0%. And the rendered
prose no longer carries any three-decimal thickness figure, so there's no pair
of rounded values left to print as equal.

That's worth a rule and §4.9 states it: **a condition that triggers prose must be
decided on the values the prose will print.** The computation stays unrounded;
only the display decision uses the rounded value. It's the one exception to
"round once at the end", and it isn't really an exception — the display decision
*is* the end.

---

## 7. Your gate, on this round

Expect it to see: `bulk-2`'s main line and capped block re-tokenised (no
thickness decimals anywhere), `mix-4`'s heading and gap sentence, the 5½ in
`thermal-model`. The `%` in "about {thicknessPercentOver}% thicker" is a unit
glued to a token, not a literal.

---

## 8. What I need back

1. **Confirm `TARGET_THICKNESS_FACTOR` and `G_PER_OZ` are gone** and your reader
   check agrees nothing wanted them.
2. **`{probeGapPhrase}` at the three cases**, including a gap that rounds to
   exactly 0.0.
