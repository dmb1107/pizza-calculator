# Re: MESSAGE-5 — seven of eight applied, §2 is blocked on a duplicate id

Everything except the step content is in. **296 tests green, 1 red by design**,
typecheck and production build clean, verified in a browser at 6, 12 and 24
balls.

The red one is `§8.2 › gives every step in the spec a unique id`. That is item 2
and it is the answer to your §9.2 question, so it leads.

---

## ⚠️ §2 is blocked: `mix-7` is defined twice

The spec now has two `#### \`mix-7\`` blocks — "Phase D, finish" at line 816 and
"Changeover to the next mix" at line 829. Not a phase-model problem; a primary-key
collision.

**Step ids are the primary key in four places**, and all four break on a
duplicate:

| Where | What happens |
|---|---|
| `STEPS.find(s => s.id === …)` | Always returns Phase D. The changeover step is unreachable |
| `checkedSteps: Set<string>` | One checkbox for two steps — ticking Phase D ticks the changeover |
| `RunningTimer.stepId` | The changeover's 5-min timer attaches to Phase D, which has none |
| `concepts` cross-refs | Resolve to whichever comes first |

I have **not** renamed it. You asked to be told rather than have me work around
it, and the id is content you own — `mix-8` is the obvious choice but it is
yours to make, and the ordering question below might change the answer.

`steps.ts` is therefore still at the 18 pre-MESSAGE-5 steps. `tests/steps.test.ts`
now asserts id uniqueness first and skips the per-step comparisons while it
fails, so the suite reports the cause rather than 19 confusing symptoms.

### The repetition is a second, separate problem

Even with a unique id, **`shown only when: nMix > 1, repeated between mixes`
does not fit the content model**, and this is the part of your §9.2 question
worth a real answer.

`STEPS` is a flat ordered list rendered once each, with one persisted checkbox
and one timer slot per id. At `nMix = 3` the changeover happens **twice** — after
mix 1 and after mix 2 — and the user needs to tick and time each. One id cannot
carry two checkboxes.

It is also the first step whose *content* varies per occurrence: the summary
interpolates `{mixIndex}` and `{mixIndex + 1}`, and `{waterTempNext}` differs
between occurrences (64.8 → 59.5 → 59.5 at 24 balls).

Three ways out, my preference first:

1. **Make it an instance-generated step.** Keep one template in §8.2 with a
   `repeatsPerMix: true` flag; the app expands it to `mix-8#1`, `mix-8#2` … at
   render time, binding `{mixIndex}` per instance. Checkbox and timer state key
   off the expanded id, so both work. §8.2 stays one entry per *kind* of step,
   which is what it is for.
2. **Fold it into `mix-1`** as an `nMix > 1` block, since `mix-1` is already the
   per-mix prep step and already needs an `nMix > 1` block from §2. Loses the
   timer and the between-mixes position.
3. **Accept one checkbox for all changeovers.** Simplest, and wrong at 24 balls
   in a way the user will notice.

**Tell me which and I'll build it.** (1) is a real change to the content model,
so I would rather have it decided than assume.

Everything else in §2 — `mix-1`'s `nMix > 1` block, `{freshFlourPerMix}`,
`bulk-1`'s two blocks — is blocked behind the same regeneration, since I can't
partially regenerate `steps.ts` from a spec that won't parse to unique ids.

---

## Your three questions

**1. `staggerUncentred` is 0 everywhere you asked, and I widened the check.**
Confirmed by exhaustive sweep, not sampling:

- **Every `nMix = 1` case**: balls 3–24, dough 60–90 °F in 0.5 °F steps. Always
  exactly 0. No stagger, nothing to fail to absorb.
- **`nMix = 2` at or below 75 °F**: 12 and 18 balls, 60–75 °F. Always 0.
- It first becomes non-zero at 12 balls / 77 °F, and only just — 0.13 min, which
  is below the 2-minute threshold so no warning fires. That felt worth pinning:
  the residual appears smoothly rather than jumping.
- Also asserted it is never negative anywhere in the envelope.

The `nMix = 3` / 77 °F case renders **18 minutes**, matching your figure.

**2. `mix-7` — see above.** The id collision blocks it outright; the repetition
needs a content-model decision.

**3. Noted, and reciprocated.** The uniqueness assertion is now permanent, so
this class of thing fails loudly at the parse rather than being noticed by
someone reading carefully.

---

## Two small numbers that don't reproduce

Both are the "quoted against a different reference point than the sentence's own
premise" pattern. Neither is load-bearing.

### §5's bowl-share floor is 6.68%, not 6.8%

Your reasoning is right and I confirmed the mechanism: the largest single mix is
9 × 270 g, and 9 × 300 g splits into two and jumps back to **11.4%**, so the
floor is real.

But 6.8% is the 9 × **265** g figure. At the 9 × 270 g mix the same sentence
names as largest, it is **6.68%**. Swept balls 3–24 × ball weights 240–300 g to
confirm nothing goes lower.

### §4.7's `nMix = 3` overhead is 28.41, not 28.42

The table's own values for that row give
`27.83 + (1.667 − 0.5) + (0.917 − 1.5) = 28.414`.

Rows 1 and 2 are internally consistent (27.83 and 28.121 exactly). Only the
third overhead is off by 0.01 against its own `mix` and `ballRoomTemp`. I've
pinned 28.41 and asserted all three as you asked.

---

## What landed

| § | Item | Note |
|---|---|---|
| 1 | `thermal-model` regenerated | 12,055 chars, contradiction gone |
| 3 | Probe vectors | §4.6 and §5 now agree; comments updated to match |
| 4 | Overhead 27.83 / 28.12 / **28.41** | all three asserted |
| 5 | Bowl dilution rekeyed to mix size | plus a floor assertion across the envelope |
| 6 | `staggerUncentred` + §7.3 warning | fires above 2 min, names the upstream levers |
| 7 | Per-mix `bigaTempF` / `bowlTempF` | arrays, URL codec, per-mix fields |
| 8 | `Ct` 1058.8 on both rows | 6 and 12 assert equal by construction |

**On §7's URL codec**, since you accepted the cost: per-mix values encode as a
`~`-delimited list. A bare value still decodes to a length-1 array, so
pre-per-mix links open unchanged; an empty entry means "no measurement" rather
than a fallback; and garbage in one position clamps or falls back without
dropping the rest of the list. All four cases are tested.

Arrays grow to `nMix` lazily on first edit, so a single-mix setup keeps
serializing as one bare value and links stay short.

**One copy bug of my own, found while verifying at 24 balls:** the biga-split
warning said "one batch covers *both* mixes" regardless of count. Now agrees
with `nMix`.

---

## Nothing else blocking

Task 8's durations really have stopped moving — I re-derived the overhead table
from the stage list rather than taking it, and rows 1 and 2 are exact.

The only thing I need is the §2 decision: the id, and which of the three
repetition options.
