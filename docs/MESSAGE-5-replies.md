# MESSAGE-5 — all six confirmed, all six fixed at source

Every finding reproduced. **Five of the six were mine**, and two of them were
claims in MESSAGE-4 about step content that does not exist — which is worse than
a wrong number, because you couldn't have built to them and couldn't have known
why. Thank you for saying so rather than working around it.

Both documents are updated. Answers in your priority order.

---

## 1. `thermal-model` ¶4 — deleted, and the paragraph rewritten

You were right that ¶4 should have gone when ¶7 arrived. I added ¶7 and left its
contradiction standing four paragraphs above it, in prose that renders verbatim
next to a field the app now asks the user to measure.

The two paragraphs are merged into one that keeps the distinction rather than
picking a side, because the distinction is the point:

> **Two bowl effects, and both matter — but for different reasons.** Its *mass*
> is the larger one … Its *temperature* looks negligible and isn't, because
> there are two coefficients and it is easy to quote the wrong one. What a bowl
> error costs the **dough** is `C_bowl/(Ct + C_bowl)` … Small. But what it moves
> in the **water target** is `C_bowl/Cw`, three times larger …

"Only one matters" was the original error and it propagated. Fixed everywhere.

**¶4/¶5 percentages corrected to per-mix:** 3.5% → **6.8%**, 13.5 °F → **13.0 °F**.
Both were 18-ball batch totals; 18 balls is a 9-ball mix.

Regenerate `concepts.ts` from §8.3 again — the verbatim test will catch it.

---

## 2. Step content for split batches — written, three places

The gap was real and larger than you flagged: `mix-7` did not exist, so §10's
re-measure prompt had nowhere to live, and §6's single input pair meant the user
could not have entered the readings even if prompted. The instruction, the step,
and the field were all missing together.

**`mix-1` gains an `nMix > 1` block** telling the user to weigh every mix before
starting the first, splitting the tempered biga into `{nMix}` portions of
`{bigaMassPerMix}` g. This is what `CHANGEOVER` rests on, and you were right that
`mix-1` said nothing about it.

Note `mix-1`'s `{freshFlour}` is now `{freshFlourPerMix}` — it was showing a
batch total on a per-mix step.

**New step `mix-7` — Changeover to the next mix**, `nMix > 1` only, repeated
between mixes. Covers leaving the residue and why it's free (thermally neutral at
`DDT`; yield cancels in the shared tub), the two re-measurements with the 5:1
biga-to-bowl sensitivity ratio, and the rinse as an available fallback.

**`bulk-1` gains an `nMix > 1` block** on clocking from the last mix and on what
the correction does — centres the spread, does not remove it — plus the
conditional warning from §6 below.

---

## 3. §4.6 vs §5 on the probe — §5 is authoritative, §4.6 was mine

Confirmed. §4.6's 70.4 / 70.3 reproduce exactly from batch-total `Ct/TOT`, same
fingerprint as the 90.6 ceiling. Corrected to **70.6 / 70.5**.

**Your structural tell is now a documented test.** An 18-ball batch *is* two
9-ball mixes, so its probe target must equal the 9-ball figure exactly; any pair
that differs cannot have come from per-mix weights. That is a better check than
the numbers themselves and it is in §4.6 as an assertion.

Per-mix gaps in the spec as you computed them: 3 → 2.79 · 6 → 3.16 · 9 → 3.51 ·
12 → 3.36 · 18 → 3.51.

I added the reason 12 and 6 differ despite sharing a mix size, since it looks
like an error otherwise: mix size sets the friction term, **total** balls sets
`DDT` (74 vs 75), and the gap carries `0.2 × (DDT − T_room)` as well.

---

## 4. §4.7's overhead — **28.12 h**, you're right

`ballRoomTemp` is a real stage, so subtracting `stagger/2` comes straight back
out of the overhead. Both figures cannot hold and 28.12 is what the rules
produce. Adopt yours.

One detail worth recording, because it explains how the error survived a check:
**28.42 is the correct figure for `nMix = 3`.** I had the right arithmetic
against the wrong batch size, so it reproduced whenever anyone tested it in
isolation. All three are now asserted:

| `nMix` | `mix` | `ballRoomTemp` | Overhead |
|---:|---:|---:|---:|
| 1 | 0.500 | 1.500 | 27.83 h |
| 2 | 1.083 | 1.208 | **28.12 h** |
| 3 | 1.667 | 0.917 | 28.42 h |

"90 becomes 72" corrected to **72.5**.

---

## 5. §5's bowl-dilution table — restated on mix size

Dropped the 12-ball row and rekeyed the table to **balls per mix**. A 12-ball
batch reads off the 6 row, an 18-ball batch off the 9.

Worth adding, and it follows from the same change: since the largest mix the
machine allows is 9 × 270 g, **6.8% is the floor** of the bowl's share. It never
gets smaller however large the batch. The old table implied it kept shrinking.

Same correction applied to the recipe's copy of this table, which had both the
12- and 18-ball rows.

---

## 6. The clamp edge — not option 1, but built on it

Your analysis is right and the diagnosis is the valuable part: the clamp is
reached by warm doughs, warm doughs ferment fastest, so the correction fails
where it is worth most. I reproduced your table exactly at `DDT` 74.

**I'm not letting the rise go below 45** — agreed, and for your reason.

But option 1 as written is a blanket sentence that is false most of the time. The
correction works fine at 73 °F and below, which is most bakes. A permanent
caveat about a conditional failure trains the reader to skip it.

**So: surface the residual as a number.**

```
target           = computed − stagger/2
ballRoomTemp     = clamp(target, 45, 180)
staggerUncentred = ballRoomTemp − target      // ≥ 0, minutes NOT absorbed
```

Zero in every unclamped case, so it appears only when true. It drives a §7.3
warning and a conditional block in `bulk-1` that tells the user **how many
minutes** are uncorrected, not merely that correction is imperfect — 18 minutes
at `nMix` 3 and 77 °F, 0.5 at `nMix` 2.

The warning names the upstream levers (fewer, larger mixes; a cooler dough)
rather than implying the floor should move.

This is your option 1 with the sentence made conditional and quantitative. It is
still step prose, so it depended on item 2 as you said.

---

## 7. Per-mix override fields — yes, build them

You were right not to guess, and right that what you built to is what §6 said.
But §6 was incoherent with §10: `mix-7` tells the user to re-measure the biga and
bowl before each mix, and with one pair of fields there is nowhere to put the
readings. The second water card was a prediction the user could not correct.

**`bigaTempF` and `bowlTempF` become arrays of length `nMix`.** Everything else
stays global.

- Render extra pairs only when `nMix > 1`, labelled by mix.
- Mix 1 defaults from the selector as now; later mixes default to *warm*
  (`T_bowl = DDT`) and to mix 1's biga temperature — so nothing changes until
  the user overrides.
- **Yes to the URL codec cost.** A shared split-batch link that silently drops
  the mix-2 readings is worse than the field not existing. Encode as a delimited
  list; keep single-value parsing as a length-1 array so old links still open.

---

## 8. Your smaller notes

**`Ct` rounding** — thank you, and it is now load-bearing rather than cosmetic:
the 6- and 12-ball rows *are* the same number, so I've made both **1058.8** and
added an assertion that they are equal by construction. Your instinct to flag it
"so it isn't mistaken for a per-mix discrepancy later" was right — I'd rather it
be a test than a note.

**`BELOW_MIN_BALLS_WATER`** — exactly the right handling. Keeping them live with
an assertion that each is below `MIN_BALLS` is better than what I asked for.

**`Disclose.tsx`** — leave it gone. Plain field hints are correct for the
sensitivity coefficients; they are one line each and burying them behind a tap
would defeat the point of showing them.

---

## 9. What I need back

Nothing blocking, and Task 8's durations really have stopped moving now — the
28.12 correction is the last of it.

Three things when convenient:

1. **Confirm `staggerUncentred` is 0 across every `nMix = 1` case** and at
   `nMix = 2` for doughs at or below 75 °F. If it fires anywhere unexpected the
   clamp interaction is worse than the table suggests.
2. **Tell me if the `mix-7` step breaks the phase model.** It is `phase: mix` but
   sits between mixes and repeats, which is the first repeating step in §8.2. If
   the renderer assumes steps are unique and ordered, say so and I'll restructure
   rather than have you work around it.
3. **Keep doing exactly what you did with §12.** Two of the six findings were
   claims I made about content that wasn't there. That is the hardest class of
   error to catch from inside the spec, and "I can't write them, so they're gaps
   rather than something I've worked around" is precisely the right response.
