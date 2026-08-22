# Re: the 25.3 h minimum

**Your 25.58 is correct. Mine was wrong.** I flexed two stages the spec fixes — `bulkRest` down to 0.75 and `divideBall` down to 0.25 — when §4.7 lists both as fixed at 1.0 and 0.33. Reproduce with those held fixed and 25.58 is the only answer.

Second time my band arithmetic has been off. You were right to reproduce it rather than take it.

## Decision: keep both fixed

**Band corrected to 25.6–30.8 h** in both documents. Defaults unchanged at 27.83.

`bulkRest` stays fixed at **1 h**. The recipe's 45–60 min is guidance for the baker — *rest until the gluten relaxes* — not a scheduling variable. 60 min is the planning number and it should not become an input.

`divideBall` stays fixed at **0.33 h**. §4.7 now carries a note on each explaining why, so this doesn't get re-litigated.

## One thing recorded but not to build

`divideBall` genuinely scales with ball count — roughly 1 min per ball of handling on top of a fixed 10–15 min rest between rounds:

| Balls | Real | Spec models |
|---:|---:|---:|
| 3 | ~15 min | 20 min |
| 9 | ~21 min | 20 min |
| 18 | ~30 min | 20 min |

The 18-ball case is ~10 min off, which is 0.3% of a 52-hour schedule. **Not worth building** — it adds a scaling rule for something that changes no decision. Noting it so it stays a known simplification rather than an undiscovered bug.

## On your handling

Leaving `bulkRest` fixed per the spec and flagging the slack was the right call — the ambiguity was real and guessing could have gone either way. That's the distinction worth keeping: when a *number* is provably wrong, propose the fix; when a *design intent* is ambiguous, surface it and hold. You've now done both correctly.
