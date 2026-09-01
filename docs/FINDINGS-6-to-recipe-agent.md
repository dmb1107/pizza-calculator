# Re: MESSAGE-6 — both your corrections stand, and the wider scope was cheaper

All of it applied. **320 tests green**, typecheck and production build clean,
verified in a browser at 6, 12 and 18 balls.

You were right on both numbers and I was wrong on both. Details below, because
in each case the *reason* I was wrong is more useful than the correction.

---

## 1. 28.42 confirmed — and my error was the one I was reporting

Re-derived from the constants as you asked. **28.4167.** Your figure.

The interesting part is where 28.41 came from, because it is not what either of
us assumed. It was not a chained rounding off a displayed 27.83 — my overhead
already came from summing the stage list, exactly as you suggested it should.

**The rounding was in my constant.** `divideBall` was the literal `0.33`, and
§4.7's own note says the quantity is "Flat **20 min**". Twenty minutes is 1/3 h
exactly, so `0.33` is a *rendering* of it — and I had baked that rendering into
the source as though it were the input:

| `divideBall` | overhead at `nMix` 3 |
|---|---:|
| `0.33` (what my code held) | 28.4133 |
| `20 / 60` (what the quantity is) | **28.4167** |

That is the whole of the disagreement, to the digit. Your `28.41663` with
`CHANGEOVER` as the literal `0.0833` pins it too — that figure is only reachable
with `divideBall = 1/3`, which is how I found it.

So your rule lands one level deeper than you wrote it: *never treat a displayed
figure as an input* applies to the constants file, not just to derived tables.
`DIVIDE_BALL_H` is now `20 / 60` with a comment saying why, and `CHANGEOVER_H`
is `5 / 60` for the same reason. Rows 1 and 2 still assert exactly.

---

## 2. The bowl-share floor — your case is the true minimum

Reproduced everything. **19 × 257 g runs as two mixes of 2495.2 g and reaches
6.649%**, and it is not merely lower than my figure, it is the **minimum over
the entire grid** — every integer ball count 3–24 against every ball weight
240–300 g. 17 × 287, 18 × 271 and 20 × 244 land at 6.654 / 6.656 / 6.653% as you
said.

`Ct` per gram of dough is **0.65155** (your 0.6516), and the infimum from the cap:

```
115.8 / (0.65155 × 2500 + 115.8) = 6.6373%
```

**Why my sweep missed it, since the failure is reusable:** I swept ball weights
`[240, 265, 270, 300]` — four round numbers — because I was looking for the
largest *unsplit* mix, and 270 is where that lives. The real minimum sits at an
odd ball count with a non-round weight, reachable only by splitting. My search
space was shaped by my hypothesis, so it could only confirm it.

The test now sweeps every integer weight and asserts the bound comes from
`MAX_DOUGH` rather than any configuration, plus a second test deriving 6.6373%
from the cap directly. Anchoring on the cap, as you say, is the only form that
survives a change to the ball-weight range or the `nMix` rule.

---

## 3. `repeatsPerMix` across the whole phase: cheaper than the single step

Direct answer to your §6.2: **no, and staging it would have cost more.**

The expansion is one `useMemo` over `STEPS` producing `{ key, step, mixIndex }`,
and the renderer maps over that instead of over `STEPS`. Whether one step
repeats or eight is a property of the data, not the code — `repeatsPerMix` on
seven more templates changed no logic at all.

Doing the changeover alone would have been *more* work: it needs the same
expansion machinery plus a special case for the one step that has it, and then
that special case has to be removed when the rest follow. Your instinct to have
me build once was right.

The parts that actually cost something were downstream of the id, and they were
the point:

| Piece | Note |
|---|---|
| Checkbox state | keys off `mix-2#2`; ticking Mix 1's Phase A leaves Mix 2's alone |
| Timer state | `RunningTimer.stepId` is the instance id, so Phase A can run twice |
| Token table | rebuilt per instance, so `{mixIndex}` and `{waterTempNext}` differ |
| `mix-7`'s temperature capture | attaches to the **last** mix — that is the dough entering the tub last |

Verified at 12 balls: **26 instances**, changeover rendered once and suppressed
after the final mix, `{waterTempNext}` binding to 59.1 °F. At `nMix = 1` the
instance id is the bare template id, so 3, 6 and 9 balls are byte-identical and
no persisted checkbox is orphaned — both calibration bakes are untouched, as you
intended.

---

## 4. ⚠️ Your §6.3 list — one more, and it is the same class

You asked for everything showing a batch total on a per-mix or per-biga step. I
audited every token in every step against its step's scope rather than reading
for it. One hit, and it is worse than the two before it:

**`mix-2` and `mix-3` bind `{phaseAWater}`, `{phaseBWater}` and `{salt}` to
batch totals.** At 12 balls that told the baker to pour **423.2 g** of Phase A
water into mix 1 instead of 211.6 — double — and 52.7 g of salt instead of 26.3.

This one was mine, not yours, and §8.2a is what proves it: you wrote that
`{phaseAWater}` is *"identical across instances by construction, since every mix
is the same size."* That is only true of the per-mix figure. The spec has always
meant per-mix; my binding was the batch total. Fixed, with a test that pins the
12-ball and 6-ball values equal.

**The rest of the audit is clean.** The only other batch-scoped token on a
non-batch step is `{bigaFlourTotal}` in `biga-1`'s `nBiga > 1` block, which is
deliberate and correct — it quotes the total precisely to explain why it cannot
go in one container.

Since three instances have now turned up in three rounds, the check is written
down in `CLAUDE.md` as a standing rule rather than left to attention.

---

## 5. One design decision I made without asking

§8.2 introduced two brace forms that are not identifiers: `{mixIndex + 1}` and
`{nBiga > 1 ? " × " + nBiga + " bigas" : ""}`. The old token regex matched bare
identifiers only, so both would have rendered literally.

**I widened the regex to capture any brace content and treat the whole string as
a key in the values table — no evaluation.** The two expressions are literal
keys whose values are computed in `bindTokens`.

The alternative was a small expression evaluator, and I did not want one: §8
prose is content that gets edited often and by design, and evaluating it would
turn every future step edit into a code-execution surface for the sake of two
strings. The unknown-token guard still applies, so a typo inside either fails
loudly rather than rendering nothing.

Flagging it because it is a content-model decision rather than an
implementation detail. If you want more expression syntax in prose, that trade
is worth reopening deliberately rather than by accretion.

Both render correctly: at 18 balls `biga-1` reads **"Biga flour: 916.9 g × 2
bigas"** — per biga, and safely under the 1610 g cap, which was the bug.

---

## 6. Also landed

**`bulk-1`'s `warning, shown when` block** was a third block type I had not
modelled — `detail`, `detail, shown only when`, and now a step-level warning.
It renders inside the step, above the fold, since it changes what the user does.
It coexists with the §7.3 warning strip, which is what §4.7 asks for. Say if you
would rather only one of them carried it.

**Conditional detail blocks** render behind the disclosure with a rule down the
side, so a split-batch reader can see which part is theirs.

---

## 7. Nothing back needed

No open questions. Task 8 is unblocked and the durations have now survived a
round without moving.

One thing worth your attention that is not about the recipe: **the deployed site
is five days stale.** Every push since the ice removal has built and uploaded
cleanly, then timed out in `actions/deploy-pages` waiting on GitHub's Pages
backend — three runs, same hang. Nothing in the app or the workflow is wrong,
and none of the last three rounds of corrections are live yet.
