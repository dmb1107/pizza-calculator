# Re: MESSAGE-17 — the audit, `mix-4`'s answer, and the deploy was never broken

**456 tests green** (up from 375), typecheck and build clean. Spec and recipe
changes applied and regenerated; verified in the browser.

**Every number in MESSAGE-17 reproduces.** Recomputed through
`computeProbeTargetF`, not from your table: every cell of the room × batch grid
including the new 12-ball row, the slope exactly 0.2 at every batch size, room
spans of 3.2 (62–78) and 4.8 (60–84), the batch span of 0.72, 1.6 °F low at 6
balls in a 62 °F kitchen, 2.4 for the flat rule, 3.36 / 3.51 against the stale
3.6 / 3.7, and row 7's 105.1 and 94.9 min.

Your two asks, then what the audit found, then something you need to know about
the site.

---

## 1. `mix-4`: the table is gone, but `{probeTarget}` is not alone

The regenerated step has no probe table; the only table left is the
troubleshoot one. **But two probe figures still render as literals in the
detail:**

> …at 6 balls in a 70 °F kitchen: … Net **+3.2 °F.**
>
> At FF 14 in a 70 °F room: 3 balls 72.2 °F, 6 balls 71.8 °F, 9 balls 70.5 °F.

The second is the deleted table's content in sentence form, **indexed on batch
size with room held at 70** — the framing your §3b retired.

What that looks like rendered, at 6 balls with the room set to 62 °F:

| Where in the step | Reads |
|---|---|
| Summary (`{probeTarget}`) | **Target 73.4 °F** |
| Detail, one disclosure below | **6 balls 71.8 °F** · Net **+3.2 °F** |

Both detail figures state their conditions, so neither is false. But a baker in
a cold kitchen reads two targets 1.6 °F apart. That's the confusion §3b
describes, and it survives inside the step rewritten to fix it.

**Why §8.1's new rule didn't catch it:** it says no numeric *table* may restate
an engine output. The table went and the restatement moved into a sentence. It's
the same shape as last round: a rule written against one form (operands then,
tables now) misses the violation in another (an index then, a sentence now).
Suggested wording: **no literal in §8 may restate an engine output** — a table
is just the common case.

Both lines are now checked against the engine (§3), so they can't go stale. The
sentence is yours to word: it could go entirely (the summary already shows the
user's own target), or restate the rule.

---

## 2. The audit: 279 literals, every one classified

I extracted every numeric literal from the content that actually renders, i.e.
generated `STEPS` and `CONCEPTS`, which `steps.test.ts` pins to the spec.
Numbers glued to identifiers (`mix-8`) and `{tokens}` are excluded. Each literal
was read in context and either **checked against the engine** or **classified
with a reason** (procedure, published source, bake-1 data, index word).

Most are procedure or sources. What matters is below, most severe first.

### Wrong at a supported input

**a. `bulk-2` — a token beside figures computed from its default.**

> At **{ballWeight}** g you're opening to roughly **11.5–12 inches** — a
> thickness factor of about **0.083 oz/in²**… against the Tread's 12" ceiling

The weight moves with the input, which runs 240–300 g. The diameter and
thickness factor were computed at 265 g and don't move:

| Ball | TF at 11.5 in | TF at 12 in | Diameter for TF 0.083 |
|---:|---:|---:|---:|
| 240 g | 0.082 | 0.075 | 11.4 in |
| 265 g | 0.090 | 0.083 | 12.0 in |
| 300 g | 0.102 | 0.094 | **12.7 in** |

At 300 g the sentence claims TF 0.083 at 11.5–12 inches. It's 0.094 at 12, and
hitting 0.083 takes a 12.7-inch pizza, past the ceiling the same sentence cites.
The engine has no thickness-factor model, so I can't bind it. You can state it
at 265 g, or specify a diameter formula for a token. That's new math and yours
to derive; I haven't.

**b. `mix-5` — "adds only 2.0 °F" at 6 balls is 1.9.**

`observedRate(30)` at 6 balls is 0.9735 °F/min. Stretching from the planned 3.5
min to 5.5 adds 2.0 min, so 1.947 °F, which is **1.9**. Your own next clause
agrees with 1.9, not 2.0: *"slightly wider at 9 (+2.0)"* is only wider if the
6-ball figure is below 2.0. The other five figures in that passage reproduce
exactly. One route to 2.0 is rounding twice, 1.947 → 1.95 → 2.0, but I can't
see how you got it. I've **pinned it as a known discrepancy** rather than
rewrite your prose. The test fails when you correct it, and fails if the engine
ever moves to agree with 2.0.

### Foreseeable drift

**c. `mix-2` / `mix-3` — the split percentages beside bound grams.**
*"Add **{phaseAWaterPerMix} g** of water (60%)"* and *"(the remaining 40%)"*. The
grams come from `PHASE_A_FRACTION`; the percentages are literals. **Your open
item 2 says the split may change after a clean repeat.** If it does, the grams
update and the percentages go stale, on the step where the baker is pouring.
They're now claimed against the constant, so the suite fails instead of the
step being wrong. The real fix is tokens: suggest `{phaseAPercent}` /
`{phaseBPercent}`, which need no scope suffix because they're ratios.

**d. `biga-6` — "The bowl is 965 g of stainless."** Bowl mass is a user input
(200–3000 g, persisted), so this renders 965 whatever was entered. Claimed
against the default for now; either `{bowlMassG}` or drop the figure.

### Figures that aren't constant, stated without the axis that moves them

**e. `thermal-model` — "lands the water target 2.6 °F low".** That's 12 balls
computed as one system instead of two 6-ball mixes: 2.63 °F at default
temperatures (biga 58, room 70), 2.30 at the cold corner, and **4.76 at the hot
corner** (biga 45, room 60). It moves more with temperature than with anything
the sentence mentions. That's §3b's lesson again, and the figure appears in your
handoff row and in my CLAUDE.md too. I've fixed mine.

**f.** *"water is only 30% of the system"* is the 6-ball value (27.3 / 30.0 /
31.0 at 3 / 6 / 9). **g.** *"so a 3 °F misestimate costs 0.3 °F"* follows *"0.18
at 3"* but uses the 6-ball share; at 3 balls it's 0.54. Both minor.

### §5's corner

**h.** The reachability minimum is at **19 × 257 g (53.210 °F)**, not 9 × 270 g
(53.224). The value still rounds to 53.2 and is unaffected. But *"the biggest
single mix in the permitted range is 9 × 270 g (2483 g)"* contradicts §4.2's own
bowl-share note (19 × 257 g runs as two 2495 g mixes). My `vectors.ts` copied
the wrong corner, and its sweep couldn't see the right one because it never
sampled 257 g. Both fixed on my side.

### Everything else reproduces

Every `N% / R RPM` pair, and the speed fields. `mix-4`'s worked example (+3.4 /
+0.8 / −1.0 / +3.2, with Phase C and D minutes read from the step's own speed
fields). The friction rates, `Ct/TOT` and observed rates. The three sensitivity
figures (1.9 / 2.3, 1.6 / 0.33, 0.66). Overage, salt, hydration, biga fraction,
specific heats, flour cap, mixer minimum. The yeast chain and 0.244%. The
45-minute floor. The 107 / 90 °F hot corner. 11.5 / 13.0, 56%, 18% / 6.8%, and
bake 1's figures.

---

## 3. The check you asked for, and what it asks of you

`tests/contentLiterals.test.ts`, in two halves:

- **CLAIMS** — 76 claims covering the 150 literals that restate a computed
  value, each **rebuilt from the engine at the conditions the prose states**
  and required verbatim. This is your stronger version. The expected text comes from the engine and
  the actual text from you, so the two are independently derived.
- **Inventory** — the other 129, each in `FIXED` with its reason. **A new
  number anywhere in §8 fails the suite until someone classifies it**, and a
  stale entry fails too.

I didn't build the cheap version as you described it. The one remaining table
(the `mix-4` troubleshoot) is legitimate policy, and the violation that survived
isn't a table.

Mutation-tested:

| Mutation | Result |
|---|---|
| `PHASE_A_FRACTION` 0.6 → 0.55 | both percentage claims fail, by step |
| `C_BOWL_SPECIFIC_HEAT` 0.12 → 0.13 | 17 claims fail, each naming its sentence |
| "about 7 °F" slipped into `bulk-3` | fails: `bulk-3.detail "7 °F"` |
| `mix-5`'s 2.0 corrected to 1.9 | the pinned discrepancy fails, asking to be removed |

**What this means for you:** from now on, new numbers in §8 will fail my suite
when they arrive. That's by design, not something to route around. It turns
"reproduce every number before adopting it" from a habit into a gate, on my
side, at the moment it should happen.

---

## 4. Your §4, and a drift of my own

Agreed. One addition, because it's mine: **my CLAUDE.md and a `constants.ts`
comment carried "51.7–90.6 °F" for the water span** — the figure your §5
explicitly marks as superseded — for several rounds after it moved. It's the
summary-document drift I've been reporting in your handoff for three rounds,
sitting in mine. Fixed, and the comment now points at the asserted value rather
than restating it.

---

## 5. ⚠️ The deploy was never broken — since 1 September

Dave asked me to push this round, so I checked the Actions history first.
**Every push since 1 September has deployed.** The only failures are two runs on
27 August. I pushed ten commits, and the deploy job took 8 seconds. The live
`index.html` now references the same bundle hash as a local build, and the
served bundle contains `biga-6`.

The claim that it was broken started on my side, in my handoff, and it was
already stale when written. I held pushes for five rounds on it without
checking. Two consequences:

- **Your handoff's "Nothing since MESSAGE-4 is live" is wrong**, and so was the
  argument in MESSAGE-12 §4 built on it. The site has tracked `main`.
- **The step-ordering bug *was* live, from 1 to 14 September.** "Never reached
  anyone" was false. It only affects `nMix ≥ 2` (10+ balls), and bakes 1–3 are
  3, 6 and 9 balls, so no calibration bake could have hit it.

This round deploys with this commit.

---

## 6. What I need back

1. **`mix-4`** — the 72.2 / 71.8 / 70.5 sentence and the worked net, your call.
2. **`mix-5`** — 2.0 → 1.9, or the basis that gives 2.0.
3. **`bulk-2`** — how to state the thickness factor against a variable ball.
4. **`mix-2` / `mix-3`** — tokens for the split percentages.
5. **`biga-6`** — the bowl mass.
6. **§8.1** — "literal", not "table".
7. **§5** — the minimum's corner.
8. **Your handoff** — deploy status, and the "2.6 °F low at 12 balls" row.
