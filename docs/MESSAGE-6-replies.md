# MESSAGE-6 — `mix-8`, phase-wide repetition, and two of your numbers don't hold

The collision is mine. You were right to stop rather than rename content you
don't own, and right that the ordering question could have changed the answer —
it did, though not in the direction either of us expected.

Both decisions below. Then two figures I need you to re-pin, and one thing I
found while looking at your repetition question.

---

## 1. The id is `mix-8`

`mix-7` is Phase D and stays Phase D. The changeover is **`mix-8`**, which is
also the right ordering: it follows the complete mix sequence rather than
interrupting it.

---

## 2. Option 1 — but the scope is wider than the changeover

Your instance-generation model is right and I'm taking it. **`repeatsPerMix` on
a template, expanded at render time, checkbox and timer state keyed off the
expanded id.** §8.2 stays one entry per kind of step and your uniqueness
assertion holds on the templates.

Options 2 and 3 both fail for your reasons: folding into `mix-1` loses the timer
and the between-mixes position, and one checkbox for all changeovers is visibly
wrong at 24 balls.

**But your question exposed something bigger, and I'd rather you build once.**

At `nMix = 2` the baker runs `mix-1` through `mix-7`, does the changeover, then
runs `mix-1` through `mix-7` **again**. Every one of those steps needs its own
checkbox and its own timer on each pass. Phase A has a 3–4 minute timer and it
runs twice against one timer slot — the exact defect you identified for the
changeover, seven times over. I introduced one repeating step and you found it;
the other seven were already there and neither of us had looked.

**So mark `mix-1` … `mix-8` with `repeatsPerMix: true`.** `mix-8` also takes
`suppressOnFinal: true` — there is no changeover after the last mix.

```ts
repeatsPerMix?: boolean;
suppressOnFinal?: boolean;
```

**Nothing changes at `nMix = 1`.** One instance, `mix-8` never renders. 3, 6 and
9 balls are untouched, including both calibration bakes.

**Bind every value per instance, including the ones that don't vary.**
`{waterTempNext}` and the bowl/biga readings genuinely differ by instance;
`{phaseAWater}`, `{freshFlourPerMix}` and the probe target are identical across
instances because every mix is the same size. Bind them all the same way anyway.
Hard-coding which ones vary is a trap the next change springs.

### The `biga` phase is deliberately not repeated

`nBiga` reaches 2 at 18 and 24 balls, so you would be right to ask. The cases
genuinely differ:

- Mix instances are separated by a 35-minute changeover and carry **different
  water targets.**
- The bigas are mixed back to back on the bench, carry **identical values**, and
  converge on **one shared fermentation** — `biga-4` and `biga-5` apply to both
  at once and duplicating them would be wrong.

Handled with per-biga values and a conditional block instead. Which leads to a
bug I found on the way:

**`biga-1` and `biga-2` show batch totals on what is a per-biga step.** At 18
balls `{bigaFlour}` renders 1833.7 g — a number the user must not weigh into one
container, since it is above the 1610 g the machine handles at that hydration,
which is *why* it splits. Same class as `{freshFlour}` on `mix-1` last round.

Now `{bigaFlourPerBiga}`, `{bigaWaterPerBiga}`, `{bigaADYPerBiga}`, plus an
`nBiga > 1` block on `biga-1` saying the weights are for one biga and to make
them as separate lots.

---

## 3. ⚠️ The `nMix = 3` overhead is 28.42, not 28.41

I need you to unpin this one. Your arithmetic is valid and your inputs look
right, which is what makes it worth spelling out:

```
27.83   + (1.667 − 0.5) + (0.917 − 1.5)  = 28.414   → 28.41
27.8333 + (1.66667 − 0.5) + (0.91667 − 1.5) = 28.4167 → 28.42
```

**The 27.83 is itself a rounded 27.8333**, and the third of a hundredth lost
there is exactly the difference. Computed from the stage list rather than as a
delta, every route gives 28.4167 — including with `CHANGEOVER` as the literal
`0.0833` rather than `5/60`, which returns 28.41663.

Rows 1 and 2 survive the same treatment because their deltas happen not to
straddle a rounding boundary. That is luck, not correctness.

**Worth a rule rather than a correction, because the failure mode is invisible:
derive every row from the constants, round once at the end, and never treat a
displayed figure as an input.** It is in §4.7 now. Your instinct to re-derive
the table from the stage list rather than take it was exactly right — it just
needs to go one step further back, to the constants rather than the rendered
table.

---

## 4. The bowl-share floor is ~6.6%, and neither of us had it right

You are right that 6.8% is the 9 × 265 g figure and that 9 × 270 g gives 6.68%.
But 6.68% is not the floor either, and the reason is worth having:

**A split batch can put more dough against the bowl than any unsplit one.**
19 × 257 g runs as two mixes of **2495 g** — closer to the cap than 9 × 270 g's
2483 g — and reaches **6.65%**. 17 × 287, 18 × 271 and 20 × 244 all land in the
same region.

So the constraint is not "the largest single batch" but **the 2500 g mixer
capacity**. `Ct` is 0.6516 per gram of dough, giving

```
115.8 / (0.6516 × 2500 + 115.8) = 6.637%
```

as the infimum, approached but never reached. **State it as ~6.6% and cite the
capacity**, not a batch size. Both earlier versions anchored on a specific
configuration and both were wrong; anchoring on the cap is the only form that
stays true when the ball-weight range or `nMix` rule changes.

Your sweep was right to look for something lower. It found 6.68 rather than 6.65
because the search space has to include split batches — the minimum sits at an
odd ball count with a non-round ball weight, which is exactly where a sweep
anchored on "largest single mix" won't look.

---

## 5. Your other items

**`staggerUncentred`** — the widened sweep is better than what I asked for, and
pinning the 0.13 min case at 12 balls / 77 °F is the right instinct: it
establishes the residual appears smoothly rather than stepping, which is the
property that makes a 2-minute threshold defensible rather than arbitrary.

**URL codec** — all four cases are the right four. Lazy growth to `nMix` so
single-mix links stay short is a nicer solution than I would have specified.

**The biga-split warning copy bug** — good catch, and it is the same family as
`{bigaFlour}` above. Both say "two" or a batch total where the count is variable.
If you find more of that shape, fix them and tell me rather than asking.

---

## 6. What I need back

1. **Confirm 28.42** once you re-derive it from the constants, or send me the
   arithmetic if you still get 28.41 — I would rather reopen it than have two
   documents disagree quietly.
2. **Tell me if `repeatsPerMix` across the whole mix phase costs materially more
   than the single-step version.** I have specified the wider scope because the
   defect is real, but if the expansion is significantly harder for seven steps
   than for one, say so and we will stage it — the changeover alone is still an
   improvement on nothing.
3. **Anything else in §8.2 that shows a batch total on a per-mix or per-biga
   step.** Two have turned up in two rounds and I would rather have the whole
   list than find a third one later.
