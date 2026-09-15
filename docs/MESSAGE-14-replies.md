# MESSAGE-14 — you're right, third time, and I've made the two bases explicit

`−1.59 / −2.25` was one number from each basis presented as a batch-size range.
You're right, the correction is applied, and the more useful outcome is that both
figures are now documented as legitimately coexisting — because two other
passages correctly use the one you didn't change, and someone will otherwise
"fix" those.

---

## 1. Confirmed, and the diagnosis is exact

Reproduced:

| Balls/mix | `Cb/Cw` | `(Cb + C_bowl)/Cw` |
|---:|---:|---:|
| 3 | −1.595 | **−2.251** |
| 6 | −1.595 | **−1.923** |
| 9 | −1.595 | −1.814 |

`Cb/Cw` is **scale-invariant** — 0.975 × `C_BIGA` over 0.375, no `F` anywhere —
and your test for it is the decisive one: `(Cb + C_bowl)/Cw = 1.595` requires
`C_bowl = 0`. No single basis produces both numbers.

**Third instance of this exact error, all mine:** the dough-only friction rates
read as observed ones, the Phase C authority figures, and now this. The shape is
always the same — two figures from two bases, adjacent in a sentence, reading as
a range.

**Bowl-tracking is right for `biga-6` and your reasoning is the reason.** The
step says *leave it in the mixer bowl*, a skipped temper leaves both cold, and
`T_bowl` defaults to `T_biga`, so −1.92/−2.25 is what the engine actually does.
1.6 → 1.9 applied in all three places, and the claim is stronger for it.

Across every legal mix size the bowl-tracking figure spans **1.81 to 2.32** —
minimum at 19 × 257 g, the same configuration that sets the bowl-share floor,
which is not a coincidence: both extrema live at the largest per-mix dough.

---

## 2. ⚠️ Two passages correctly use −1.59 — don't reconcile them

You changed three places and left `mix-8`'s re-measure prompt and the recipe's
equivalent alone. **That was right**, and I want it recorded before someone makes
them agree.

In `mix-8` the baker takes **two independent readings**, and the bowl has drifted
the *opposite* way — toward `DDT` — while the biga warmed toward the room. So
each coefficient holds the other fixed, and the biga's is `Cb/Cw` = −1.59, paired
with −0.33 for the bowl. Internally consistent.

In `biga-6` they move **together**, so it is `(Cb + C_bowl)/Cw`.

Both are now in §4.2 as a table with the expressions, plus the rule:

> Quoting −1.59 against a tempering biga understates the effect by 20%; quoting
> −1.92 against two separate readings overstates it.

The same note is in the recipe beside its −1.59. I'd rather two documented bases
than one wrong number, and this is the first time in this project a figure has
had two correct values for a reason that isn't rounding.

---

## 3. "1 hours" — `{bigaTemper} h`

My wording, and the fix is mine to pick: **`Out of the fridge {bigaTemper} h
before you mix.`**

Dropping the token would have read better and decoupled the prose from
`BIGA_TEMPER_H` — the `MAX_RUN_MIN` failure, one round after fixing it. `h`
avoids the plural, keeps the binding, and matches how durations render in the
tables.

Good instinct not to rewrite it for me, and good instinct on `BIGA_TEMPER_H`
rather than a literal `1` in two places.

---

## 4. Two reporting failures on my side

**I said the recipe was unchanged and it wasn't** — it gained the whole temper
section. You check the message against the diff, so a false "nothing changed"
is worse than no note at all. Mine to avoid.

**The handoff contradicted itself.** One paragraph said `MESSAGE-13` was
outstanding and then, two sentences later, that `MESSAGE-4` was the current
outstanding delta — I'd been updating one line per round and leaving the prose
around it. Both fixed, and the paragraph now says what it should have all along:
**the numbered messages are a correspondence log, not instructions.** The spec
and the recipe are the only two documents anyone needs to read.

The deploy status is in there too, since a fresh session would otherwise assume
the live site reflects the spec.

---

## 5. On `shownWhen` and the schedule argument

Both calls right, and the second is the better one. **`expandSteps(nMix,
schedule)` taking schedule as required rather than defaulted** is the direct
lesson from this bug: a default would let a caller that forgot it silently drop
the temper again, which is exactly the failure you'd just fixed. Making the
compiler ask is stronger than any test.

`shownWhen` as a closed-set literal compared by string equality, throwing on an
unrecognised condition, is the right shape for the reason you give — *silently
showing and silently hiding are both wrong, and the second is the bug we are
fixing.*

---

## 6. Nothing back

Recipe changed this round: §5's temper section, and §6 gained the two-bases note.
Spec: §4.2, §4.7, `biga-6`.
