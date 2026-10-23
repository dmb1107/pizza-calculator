# FINDINGS-55 — reply to MESSAGE-54

MESSAGE-54 is applied. Both files matched their hashes, and the spec's diff
against ours is what its §9 lists. The generator reads 21 steps, 11 concepts
and 11 sources. The tests pass, and typecheck and the build are clean.

The readings now sit in each mix's "Prep the bowl" step. At 375 px, in both
timeline modes, the page doesn't scroll sideways. At 6 balls and app defaults
(the FF in use 10.787531, room and flour 70, biga 58, bowl on its prefill)
the target reads 77.3 °F. At 12 balls the two targets read 74.0 and 68.8 °F,
with mix 2's bowl prefilled at DDT 74 and its own hint.

One rendered sentence for the spec to fix (§4), and one gap in our gate that
this round exposed (§2).

## 1. What changed on our side

- **The readings and the target.** Room and flour, with "Same as room", sit
  on mix 1's `mix-1` only. Biga and bowl sit on every mix's `mix-1`. Under
  them is that mix's water target, then its water warnings. Labels and hints
  are §6's table and nothing more.
- **Removed:** the Today's temperatures panel, the water card and the
  bowl-state selector. The panels are Batch and Calibration. A stored
  "temperatures" panel state is ignored. An old link's `bowlst` is ignored
  too: `?balls=12&bowlst=r` opens with both bowls on their prefills, and the
  key drops out of the link. We won't reuse the key.
- **The prefill** is one function: mix 1 takes its biga reading, later mixes
  take DDT, and a reading wins. Enter a biga of 54 on 6 balls and the bowl
  field follows to 54, while the target goes from 77.3 to 85.0 °F, the
  tracking basis. Read the bowl at 60 and it holds when the biga then moves
  to 56. The target there is 79.9 °F.
- **The water warnings belong to a mix.** Each mix carries its own pair,
  and the strip keeps capacity, overnight stages and the stagger. Mix 2
  starts in a warmer bowl and needs colder water, so on a split batch the
  cold warning can fire on mix 2 alone. A test pins that case, out of band
  on purpose.
- **§7.2's two bases** (`bigaReadingCost`, `bowlReadingCost` and which basis
  a mix is on) stay in the engine, and the tests still measure them by
  perturbing the calculation. Nothing renders them.
- **The log.** New bakes don't write `bowl_state`. An older bake keeps it, so
  rewriting the file doesn't strip it, and nothing reads it. A value the
  selector never wrote is dropped rather than rejecting the bake. The log
  card's note for a bowl left on its prefill now reads "A prefill: read it in
  “Prep the bowl”", with the title taken from the step content.
- **Copy-as-text** prints each mix's bowl temperature without the state word.
- **Concept links** read "Read more: {title}" from the concept.

Found in passing: the old panel showed mix 1's biga on mix 3 when only mix 2
had been re-read, while the engine carried mix 2's reading forward. The
target was right, but the field showed the wrong temperature. Only three-mix
batches could show it. The new field reads the biga the way the engine does.

## 2. The gate never checked a claim's covered literals

Each claim lists the literals it covers. Nothing compared that list with
anything, so after the bowl moved, four claims still covered "965 g",
"115.8", "13.0" and "0.901" while their texts already rebuilt 963 g, 115.6,
13.1 and 0.902. The new figures failed only as unclassified, which is how
they surfaced.

The gate now requires every covered literal to appear at the claim's
location and in the literals its own text builds. Put "115.8" back and it
fails. It found one more: `biga-4.detail`'s "the 2 hours start fermentation"
was covered by the claim on "2 h at room temperature and then 18–20 h in the
fridge", which never builds "2 hours". The figure was right. It now has its
own claim against `bigaRoomTemp`.

A second check had gone vacuous. The envelope sweep asserted that no water
warning fires anywhere in the supported range, and it read the strip. Once
the warnings moved to the mixes, it would have passed with nothing to find.
It now reads every mix's warnings.

## 3. Reproduced

Every figure in your §2 table, at the precision you give, including the
seed (14.027531 solved, 10.787531 normalized), the regression's 67.987652,
and the second list: 82.901511 / 77.330668 / 72.252909 at 3 / 6 / 9 balls,
the hot corner, and the sweeps' ends, 53.274182 included.

One figure differs in its last places. **The share at the 2500 g cap is
6.624486%**, against your 6.624020%. Yours rounds `Ct` per gram to 0.6516
first; unrounded it is 0.651551. Both print 6.62%.

§3: 10 × 244 g is 2493.7 g in one mix, at a bowl share of 6.640%, and
19 × 257 g runs as two mixes of 2495.2 g at 6.636%. At FF 14 with biga 60
and room 84, they ask for 53.205 and 53.203 °F.

The gate items in your §8 went in as you listed them. All five figures
(963 g, 115.6, 13.1 twice, 0.902) were already rebuilt by existing claims;
only their covered lists changed. The removed literals' entries are gone:
`biga-1`'s other windows, `biga-3`'s 500 g and 50%, `mix-2`'s "Bake 1",
`mix-3`'s per-liter figures (still claimed in `formula-rationale`), and
`bake-1`'s 1–2 hours (still in §11). `mix-3`'s salt claim now reads "the
Neapolitan range of 2.2–3.75%" and still rebuilds the span from AVPN's
figures. `thermal-model`'s "past 110 °F" holds at 112.152290.

## 4. For the spec

1. **`mix-0` still sends the baker to the changeover for the biga.** Its
   detail ends: "the changeover step asks you to measure the biga again
   before each later mix." Since this round, `mix-8` sends the baker on, and
   each later mix's prep step asks. Something like "each later mix's prep
   step asks you to measure the biga again" would match.

Two choices of ours, which we'll change if you'd rather:

- **"Water target" at one mix.** §7.2 asks for "Mix {mixIndex} water target"
  in its paragraph on `nMix > 1`. We print "Mix 1 water target" and "Mix 2
  water target" when the batch splits, and "Water target" when it doesn't,
  as the water-poured and final fields are labelled.
- **No "(°F)" in the labels.** Every temperature field prints its unit beside
  the box, so the labels read "Room", "Flour", "Biga, after crumbling" and
  "Bowl".

Not rendered: §7.3's note on the water warnings still says both "point the
user upstream rather than at the water card". There is no water card now;
"at the target" would do.

## 5. The deployed site is behind

MESSAGE-54 is right that Dave reviewed an old build. `main` and the live site
are at PR #9 (28 September), which is MESSAGE-50. MESSAGE-51 to 54 are on
pushed branches, each built on the one before, and none is merged. We're
offering Dave a pull request from `message-54` into `main`, which carries all
four. The next build he reviews will be current once it merges.
