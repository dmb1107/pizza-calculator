# Re: MESSAGE-3 — ice is out, and the sweep exposed a gap at the other end

Applied in full. Nothing kept behind a flag: `LATENT_F`, `C_ICE`,
`DEFAULT_FREEZER_F`, `DEFAULT_TAP_F`, `computeIce`, `iceEffF`, all five
`IceStatus` branches, both inputs, the split in the water card and the text
export, the four ice warnings, and `ice-physics` are deleted. 267 tests green,
typecheck and production build clean, live and verified in a browser.

**Your premise checks out.** I ran the sweep you asked for and the cold end is
solid — see §1. But the same sweep turned up a problem at the *hot* end that the
old `warm-water` status was quietly covering, and removing ice removed the cover
with it. That's §3, and it's the one I need a decision on.

---

## 1. The cold end holds — the deletion is safe

Sweeping the retarded-biga envelope, the coldest requirement is **51.7 °F**, at
18 balls with a 60 °F biga in an 84 °F kitchen. That reproduces your §5 figure
exactly.

Pushed wider — the full range the UI actually permits, balls 1–24, ball weight
240–300 g, biga 45–60 °F, room 60–84 °F — the minimum only moves to **51.2 °F**,
at 24 × 300 g. Nowhere in that space does it approach 38 °F.

Two tests now assert this: one that the minimum never crosses the floor, one
that the sub-38 warning fires nowhere in the envelope. If either ever goes red,
the ice decision needs revisiting; until then it doesn't.

---

## 2. §5's upper bound does not reproduce

§5 gives the span as 51.7–90.6 °F. The minimum is exact. **The maximum is
106.6 °F**, at 3 balls with a 45 °F biga in a 60 °F kitchen.

It isn't a rounding difference. The requirement climbs as the batch gets
*smaller*, because the bowl is fixed mass and a much larger share of a small
one — 18% at 3 balls against 3.5% at 18:

| Balls | 3 | 5 | 6 | 7 | 9 | 12 | 18 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| Max water °F | **106.6** | 98.7 | 96.8 | 92.1 | 90.3 | 88.7 | 87.1 |

90.6 sits just above the 9-ball maximum of 90.3, so I think the published sweep
started around 9 balls and didn't reach the small batches. Worth confirming,
because if that's right the same omission is in §9 and in the recipe document
(both quote a ~90 °F ceiling).

On its own this is only a documentation error — 106.6 °F is reachable from a hot
tap. §3 is where it starts to matter.

---

## 3. ⚠️ There is no upper-bound guard, and the UI reaches 152 °F

The sub-38 warning catches "you cannot get there by blending" at the cold end.
Nothing catches it at the hot end, and the hot end is the reachable one:

| Balls | Dough | Max water needed | Status |
|---:|---:|---:|---|
| 1 | 271 g | **146.0 °F** (152.2 at a 240 g ball) | below the 500 g mixer minimum — already warned about, separately |
| 2 | 542 g | **116.5 °F** | **legitimate batch, no warning of any kind** |
| 3 | 812 g | 106.6 °F | legitimate, above the documented ceiling |

The 2-ball case is the one that bothers me. It clears the mixer minimum, draws no
capacity warning, and the app will print **116.5 °F** in 48-point type directly
above the line *"Blend fridge-cold and tap water to hit it, measuring as you
pour."* Domestic taps are commonly capped at 120–140 °F for scald safety, so
that instruction ranges from barely-followable to impossible, and the app gives
no hint which.

At 1 ball it's 146–152 °F, which is not blendable from any tap and needs a
kettle.

**This is not new arithmetic** — the old model asked for the same temperatures.
What changed is that `warm-water` used to reframe the card as *"Warm the water
to X °F"*, which at least told you the tap wasn't going to do it. With that
status gone the number is presented as an ordinary blend target.

### The underlying shape

The card carries exactly one instruction line, and that line assumes the number
is blendable. Both ends break the assumption. The sub-38 case is covered by a
warning; the hot case isn't covered at all.

### What I'd suggest

**A second warning at the hot end, mirroring the cold one.** Same failure mode,
same remedy shape, and it keeps the card itself bare as §7.2 requires:

| Condition | Behavior |
|---|---|
| `waterTempF > 130` (threshold yours to set) | Warn: above what a tap delivers. Heat a portion separately, or warm the biga before mixing. |

I have deliberately **not built this** — MESSAGE-3 says "one warning, and only
one", and I'm not going to add a second on my own reading. Three alternatives if
you'd rather not:

1. **Raise the batch minimum to 3 balls.** 1 ball is already under the mixer
   minimum and 2 is marginal for a spiral. Caps the requirement at ~106.6 °F,
   which a hot tap reaches. Simplest, and it removes two batch sizes that are
   arguably not worth supporting.
2. **Make the card's instruction line conditional** — the blend line only inside
   the blendable band. Cheapest, but it's the "commentary about the number" your
   Do-not list rules out, so it needs your explicit say-so.
3. **Accept it and document the range honestly**, correcting §5/§9/recipe §6 to
   the true span. Defensible if you consider sub-3-ball batches out of scope,
   but the app would still print an unfollowable instruction to anyone who tries.

My preference is (1) plus the corrected documentation, with (1) doing the real
work — it fixes the cause rather than annotating the symptom, and the batch sizes
it removes were already marginal on this mixer.

---

## 4. Smaller items

**§12 build order** still reads *"Ingredients, water/ice, and warnings cards."*
Leftover from before the rewrite.

**§9 "Water temperature"** quotes the 52–91 °F span, and the recipe document's
§6 "Hitting the water temperature" says *"between 52 °F and 90 °F"*. Both carry
the same too-low ceiling as §5, so all three want the same correction.

**Concept count is now 11, not 12.** Deleting `ice-physics` also changed
`thermal-model`'s closing line, so I regenerated `concepts.ts` from §8.3 rather
than hand-editing — the verbatim test compares character for character. Total
concept prose is 9,829 chars, still above the 9,000 floor that test asserts.

**`Disclose.tsx` deleted.** It existed only for the effective-ice-temperature
disclosure §7.2 no longer asks for, and had no other caller.

**One code comment corrected on the way past.** `constants.ts` still described
the bowl as contributing "more than the fresh flour does" — the claim your first
reply corrected to "comparable, and larger below about 5 balls." The concept
prose had been fixed; this comment hadn't.

---

## 5. What I need back

Only §3 blocks anything, and it blocks nothing I'm currently building — Task 8
(backward timeline) is unaffected and I'll carry on with it.

1. **§3** — which of the four options, or something else. I'll hold until you say.
2. **§2** — confirm the 106.6 figure and I'll leave `WATER_REACHABILITY.max`
   recording the measured value, or send a corrected §5 and I'll follow it.
3. **§4** — no action needed from me, they're your documents.

The measured maximum is pinned in `tests/vectors.ts` with the disagreement noted
beside it rather than silently adopted, the same way the 30.2 h overhead finding
was handled before §4.7 got corrected.
