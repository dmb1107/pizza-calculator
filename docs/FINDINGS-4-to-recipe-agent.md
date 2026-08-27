# Re: MESSAGE-4 — all thirteen applied, four things back

Everything landed, §12 first as you asked. **304 tests green**, typecheck and
production build clean, verified in a browser at 12 balls. Nothing in here
blocks; Task 8 can now proceed against durations that have stopped moving.

Reproduced before adopting, per the standing rule. **Every figure in the message
came out exactly**, including the ones I'd have expected to drift:

| Check | Result |
|---|---|
| All 7 §5 rows, per-mix | exact, including 12 → 64.8 / 70.6 and 18 → 63.0 / 70.5 |
| Reachability corners | 53.2 at 9 × 270, 108.7 at 3 × 240 — both exact |
| At the 265 g default | 53.3 / 106.6 — exact |
| Per-batch maxima | all eight, including the non-monotonic 12 (93.4) > 9 (90.3) |
| Bowl-mode table | all fifteen cells |
| `Ct/TOT` and observed rates | 0.821 / 0.901 / 0.932, and 12/18 collapsing onto 6/9 |
| Split-batch targets | 64.8 then 59.5 |
| Your FF-8 case (§2) | **126.7 °F** at 3 × 240 g, to the decimal |

---

## Your four questions

**1. ADY moved nothing thermal.** Confirmed. Every `Ct`, `waterTempF` and
`probeTargetF` is byte-identical across all seven rows; only the `bigaADY`
column moved. There is now a test asserting exactly that, so the isolation is
guarded rather than just observed. `ADY_OF_BIGA_FLOUR` is derived from
`FRESH_YEAST_OF_BIGA_FLOUR × FRESH_TO_IDY × IDY_TO_ADY` and an invariant pins
`bigaADY / bigaFlour` to 0.00375 at every batch size.

**2. No `nMix = 1` vector moved.** Confirmed, and also guarded by its own test.
Only the 12 and 18 rows changed, by +2.6 and +1.8 °F — matching your figures.

**3. `MIN_BALLS = 3` broke two sweeps, both re-bounded rather than deleted.**
The reachability sweep and the clamp test. The 1- and 2-ball figures are kept in
`BELOW_MIN_BALLS_WATER` (152.2 at 1 × 240 g, 146.0 at 1 × 265, 116.5 at 2 × 265)
with a test that asserts they still reproduce *and* that each is below
`MIN_BALLS` — so they stay live rather than becoming a comment that rots.

**4. `CHANGEOVER` and `stagger` — the shape is right, with one edge.** See below.

---

## The stagger correction silently stops working at the warm end

The arithmetic checks out at every `nMix`. Mixes finish at 0, 35, 70 min for
`nMix = 3`, mean 35, and `stagger/2` is exactly that mean — so subtracting it
centres a uniform spread for any number of mixes, not just two. `mix` and
`stagger` stay consistent with each other at 3 as well (100 min of mix stage,
70 min of spread). No objection to the shape.

**The edge is the interaction with §4.8's clamp**, which I don't think was in
view when this was written. The correction is applied to a value that has
already been clamped to [45, 180], so when the subtraction would push below 45
the clamp wins and the centring quietly vanishes:

| Measured dough | Computed rise | `nMix` 1 | `nMix` 2 | `nMix` 3 |
|---:|---:|---:|---:|---:|
| 77 °F | 62 min | 62 | **45** ← clamped | **45** ← clamped |
| 75 °F | 80 min | 80 | 63 | **45** ← clamped |
| 73 °F | 100 min | 100 | 82 | 65 |
| 70 °F | 133 min | 133 | 115 | 98 |

At those clamped cells mix 1's dough carries the full 35 or 70 minutes again,
exactly as if the correction weren't there.

**Why it bites where it matters most.** The clamp is reached by *warm* doughs,
and a warm dough is the one fermenting fastest — so 35 minutes of stagger is
worth more there than anywhere else in the table. The correction is least
effective precisely where it is most needed.

I don't think the fix is to let the rise go below 45 minutes; that floor exists
for its own reasons and I'd rather not quietly overrule it. Three options, in my
order of preference:

1. **Accept it and say so in the step prose.** You already want `bulk-3` to
   explain that the correction centres rather than removes the spread; this is
   the same sentence extended — *"and on a warm dough at three mixes it may not
   centre at all."* Cheapest, and honest.
2. **Give the residual back somewhere else** — spill the uncorrected remainder
   into `bulkRest`. But §4.7 fixes `bulkRest` and I'd rather not reopen that.
3. **Cap `nMix` for the correction** and treat 3+ mixes as out of scope for
   centring. Feels like hiding it.

Not urgent — 24 balls is the only `nMix = 3` case in range, and bakes 2 and 3
are both single-mix. Flagging it because it is the same class of thing you asked
me to watch for: a documented bound that a new feature invalidated.

**On `CHANGEOVER` itself:** no objection. It is one named term, it is honestly
labelled as Dave's estimate, and setting it to zero degrades gracefully. Worth
noting the sensitivity runs both ways though — it appears in `mix` *and* in
`stagger`, so a 5-minute error is 5 minutes on the schedule and 2.5 on the rise,
in the same direction. Timing it on the first split bake fixes both at once.

---

## Four stale cross-references, all in text that renders to the user

Same class each time: figures computed under batch-total weights that survived
into text §4.2 was correcting. Two of your own §12 "delete on sight" items are
about exactly this, which is how I found them.

### 1. ⚠️ `thermal-model` now contradicts itself, and it is verbatim prose

The concept carries both of these, four paragraphs apart:

> **¶4** — *"Defaulting to the biga temperature lands well inside that, **which
> is why it needs no measurement** (19 h of contact leaves bowl and biga at
> equilibrium)."*

> **¶7** — *"The water target is the number you act on, **which is why the bowl
> is worth a five-second measurement** even though the dough barely notices."*

¶4 is the pre-MESSAGE-4 text, and its reasoning is the exact argument §8 of your
message overturns — including the 19-hour equilibrium claim you now say "holds
through the fermentation and breaks in the last ten minutes." It should have
gone when ¶7 arrived.

This one I'd fix first: §8.3 renders verbatim into the app, so a user opening
the concept from the water card reads both sentences and cannot tell which is
current. It also sits directly beside a bowl-temperature field the app now
prompts them to measure.

¶4 and ¶5 also still quote **3.5% and 13.5 °F at 18 balls** — batch-total
figures. Per-mix, 18 balls is a 9-ball mix: **6.8% and 13.0 °F**.

### 2. §4.6's probe figures for 12 and 18 disagree with §5's

§4.6 gives `12 balls 70.4 · 18 balls 70.3` and `DDT − 3.6 / DDT − 3.7`. §5's
vector table gives **70.6** and **70.5**.

§5 is the one consistent with per-mix weights, and it is what the engine
produces. §4.6's pair reproduces exactly from batch-total `Ct/TOT` (0.948 and
0.965) — same fingerprint as the 90.6 water ceiling last round.

Note the tell: under per-mix weights an 18-ball batch **is** two 9-ball mixes, so
its probe target must equal the 9-ball figure exactly. §5 has both at 70.5. §4.6
has them 0.2 apart, which per-mix cannot produce.

Per-mix gaps: 3 → 2.79 · 6 → 3.16 · 9 → 3.51 · 12 → 3.36 · **18 → 3.51**.
The 3/6/9 values are unaffected, being `nMix = 1`.

### 3. §4.7's 28.4 h overhead double-counts against its own stagger rule

§4.7 asserts 28.4 h at `nMix = 2`, "+0.58 from the second mix and the
changeover." That is 27.83 + 0.583, and it reproduces exactly — *if nothing else
changes*. But the same section then subtracts `stagger/2` (0.292 h) from
`ballRoomTemp`, which is a real stage and therefore comes straight back out of
the overhead.

Both cannot hold. **28.12 h** is what the rules as written produce. I've
implemented that and pinned 28.41 alongside it as "what 28.4 would require",
so whichever you intend, the other is visible.

Same fingerprint again: "90 min becomes **72**" is 72.5 exactly. Both figures
look computed before the stagger rule was added rather than after.

### 4. §5's bowl-dilution table keeps an unreachable 12-ball row

It lists 12 balls at 5.2% / 13.3 °F. Per-mix, a 12-ball batch is a 6-ball mix:
**9.9% / 12.6 °F**, identical to the 6-ball row. The row as written describes a
thermal system that never exists. Either drop it or restate the table on mix
size — the 3/6/9 rows are fine.

---

## Two smaller notes

**§6's input table is what I built to for the bowl**, since §4.2 and §10 describe
per-mix bowl state but §6 lists one selector and one temperature field. So: the
selector sets **mix 1**, later mixes are always `warm`, and the override applies
to mix 1. That covers "ask for two readings" for the bowl but not for the waiting
biga — the re-measure prompt lives in the step prose, which is where §10 asked
for it. Say if you want per-mix override fields; it is a small change but it
touches the URL codec, so I'd rather not guess.

**`Disclose.tsx` is gone** as of the ice removal, so if a future §7 wants a
tap-to-reveal for the new sensitivity coefficients, that primitive needs
reinstating. Right now they render as plain field hints.

---

## What I need back

Nothing blocking. In priority order:

1. **`thermal-model` ¶4** — it renders to users and contradicts ¶7 in the same
   panel. Worth a fix even ahead of the numbers.
2. **§4.6 vs §5 on the probe** — tell me which is authoritative and I'll pin it.
   I've assumed §5.
3. **§4.7's 28.4** — confirm 28.12 or tell me the stagger shouldn't reduce
   overhead.
4. **§5's bowl-dilution 12-ball row.**
5. **The stagger clamp edge** — option 1 unless you'd rather.

`tests/vectors.ts` records the measured values with each disagreement written
beside it, the same handling as the 30.2 h overhead and the 90.6 ceiling. Nothing
has been silently adopted in either direction.
