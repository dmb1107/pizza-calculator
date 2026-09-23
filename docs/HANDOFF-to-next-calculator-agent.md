# Handoff — the calculator side

You're picking up the **website** half of a two-agent project. A separate Claude
session maintains the recipe and the build spec; you build the calculator from
the spec and push back on it when the numbers don't hold.

`CLAUDE.md` is loaded automatically and carries the technical rules. **This file
is the things it doesn't**: how the work arrives, how it goes back, and what has
repeatedly gone wrong.

---

## 1. Where it stands

**Tasks 0–7 are done and verified** — engine, state, cards, forward timeline,
steps, concepts, timers. `npm test`, `npm run typecheck` and `npm run build` are
all clean; run them rather than trusting a count written here, which is exactly
the kind of transcribed figure that drifts. `IMPLEMENTATION-PLAN.md` has the
task-by-task detail and its status line names the last message applied; read it
before starting.

**Task 8 (backward timeline) is next**, and it is unblocked. `solveBigaStart` in
`src/lib/timeline.ts` is already written and tested — the arithmetic exists, the
UI doesn't. §4.7's durations have now survived two rounds without moving, which
was the thing that kept blocking it.

Then Task 9 (reference drawer + About), Task 10 (deploy — two of its three
boxes are verified, see §6), Task 11 (bake log, phase 2 — the payoff is
regressing `FF = a + b × (room − 70)` per batch size after 8–10 logged bakes).

**The live site tracks `main`.** Every push deploys. See §6.

---

## 2. How the work arrives

The user drops four files with no other message:

```
WEBSITE-SPEC-biga-calculator.md    the build spec, updated
Biga-Neapolitan-HaloCore-GrainCraft.md    the human recipe, kept in sync
MESSAGE-N-replies.md               the delta: what changed and why
HANDOFF-new-context.md             their side's background. NOT instructions
```

That means: apply MESSAGE-N. The rhythm that has worked, in order:

1. **Copy all four into `docs/`**, then `diff` the spec against `git show HEAD:`
   to see exactly what moved. The message tells you what *should* have changed;
   the diff tells you what did. They have disagreed.
2. **Reproduce every number before adopting it.** This is the standing rule and
   it has paid off in most rounds. Their figures are usually right, and when
   they aren't, the arithmetic is the argument.
3. **Apply**, regenerating content where §8 moved (see §4).
4. **Verify**: `npm test`, `npm run typecheck`, `npm run build`, then the
   browser for anything rendered.
5. **Write `docs/FINDINGS-N-to-recipe-agent.md`** — confirmations, anything that
   didn't reproduce, and anything you couldn't build. Send it to the user with
   `SendUserFile`; they relay it.
6. **Commit and push.** One commit for the application, one for the reply.

Then report to the user in chat: what landed, what you found, what's open.

---

## 3. The counterpart

They are good, and the relationship works because neither side rubber-stamps.

- **They reproduce your numbers before disagreeing**, and they have conceded
  every time the arithmetic went against them. Disagree with specifics.
- **They ask to be told rather than worked around** when the spec blocks you.
  Twice a message has claimed §8 says something it doesn't; both times the right
  move was to stop and report, not to invent the missing content.
- **`MESSAGE-N` numbers are usually right; `MESSAGE-N` claims about the spec
  are worth checking.** The failures have clustered there.
- **They explicitly want unprompted structural checks** and will take the ones
  that disagree with them.

`docs/` holds the whole exchange. Read `FINDINGS-*` and `MESSAGE-*` before
reopening anything settled — several numbers look arbitrary and are not.

---

## 4. Regenerating step content

`src/content/steps.ts` and `concepts.ts` are **generated**:

```bash
python3 scripts/generate-content.py
```

`tests/steps.test.ts` re-parses §8 on every run and compares character for
character, so hand-editing those files turns the suite red. That is deliberate:
the prose is the product.

The generator and the test parser implement the same grammar twice **on
purpose** — one writes, one independently re-derives, so a parser bug surfaces as
a mismatch rather than as both agreeing on garbage. **If you change one, change
the other.**

⚠️ **That only works where the two copies differ.** In MESSAGE-18 both matched
conditional blocks from the same hard-coded condition list, so a whole block of
new prose was dropped by both and the verbatim test passed 42/42. Both now
refuse any `**marker:**` they don't know — so when the generator stops with
*unknown field marker*, teach **both** files the new grammar, then decide where
its condition is resolved.

---

## 5. What has actually gone wrong

Nine rounds of corrections. The patterns worth internalising, because they
recur:

**A number transcribed from its source instead of read from it.** Three times:
`ADY = 0.0038`, `divideBall = 0.33`, and a hardcoded `0.392`. Each was correct
when written and silently wrong the moment the formula moved. Anything derivable
from the constants is now derived, and `tests/constants.test.ts` recomputes each
from its inputs.

**A figure quoted without its conditions.** Cost a full round. The vectors pin
flour at 69 °F and the app defaults it to room (70), so every rendered water
target sits exactly 0.392 °F below its vector value. Both correct; the number
without its basis was the defect. Same again with three different wall-clock
bases for one mix, spanning 12 minutes. **Say which basis you're quoting.**

**Verifying a list by its contents rather than its order.** My own, and the most
recent. The step expansion repeated each template instead of each mix — same
instance count, same labels, same suppression, completely wrong procedure. I
checked all three and never read the sequence. Where order *is* the meaning,
assert the order.

**Logic that lives somewhere untestable.** That expansion bug survived five
rounds because it sat inside a React component. It's now `src/lib/stepInstances.ts`
and it broke immediately. `src/lib` must stay DOM-free precisely so this can't
happen.

**Structural checks catch what reading misses.** Three times now, and the
common property is that **none of them know what the content means**: a token
with no consumer found a spec block that had silently vanished; a constant with
no reader found a number living in two places; a test pinning a rule found the
thing the rule ran against was broken. They assert that every value has a
producer and a consumer and let the broken link point at whatever went wrong.
Keep adding them; the counterpart asked for it explicitly.

---

## 6. The deploy works — and this section used to say it didn't

**Every push since 1 September has deployed.** The only failed runs in the
Actions history are two on 27 August. The build job passes, `deploy-pages`
finishes in seconds, and the site at
`https://dmb1107.github.io/pizza-calculator/` serves what `main` builds.

Verified end to end on 23 September: the live `index.html` references the same
bundle hash a local `npm run build` produces, and the served bundle contains
MESSAGE-13's `biga-6` content.

⚠️ **An earlier version of this section said every push since the ice removal
had hung**, and five rounds of pushes were held back on the strength of it. It
was already stale when it was written — the commit that added it deployed
successfully. Two consequences worth knowing:

- **The step-ordering bug was live from 1 to 14 September**, not "never reached
  anyone". It only affects `nMix ≥ 2` (10+ balls), and bakes 1–3 are 3, 6 and 9
  balls, so no calibration bake could have hit it.
- **Check deploy state rather than reading about it.** `gh run list` shows the
  history in one line per run; to confirm the site itself, compare the
  `assets/index-*.js` name in the live `index.html` with the one `npm run build`
  prints. A status in a document is a transcription like any other.

**Do not change the workflow or the Pages source.** Both are correct: Pages is
`build_type: workflow`, and the source was already fixed once (it had been set
to deploy-from-branch, which served the dev `index.html`).

Two runner notices appear in the logs and need nothing yet: `deploy-pages@v4` is
forced from Node 20 onto Node 24, and `ubuntu-latest` moves to Ubuntu 26 from
19 October 2026. Worth a look if a deploy fails after that date.

---

## 7. Practical notes

- **Push over HTTPS.** `gh` is set to SSH here and no key is loaded; a push over
  `git@github.com` fails with `Permission denied (publickey)`. The remote is
  already HTTPS with `gh` as credential helper — don't "fix" it back.
- **Write Python to a file, never an inline heredoc.** Backticks in regexes get
  mangled even inside a quoted heredoc, and it silently produces a
  non-matching pattern rather than an error. Cost a debugging round.
- **Prefer text extraction to screenshots** in the browser pane. `javascript_tool`
  reading `innerText` is reliable; screenshots after a programmatic scroll have
  repeatedly come back blank or timed out.
- **The dev server picks its own port** and serves under `/pizza-calculator/`.
  Check `preview_logs` for the real URL rather than trusting the assigned port.
- **Use the scratchpad for scripts**, not `/tmp` — but remember it is wiped
  between sessions. Anything the next session needs belongs in the repo, which
  is why the generator is now committed.

---

## 8. If you read one thing

The user is technical and checks arithmetic. The counterpart is careful and
still gets numbers wrong. The value you add is **reproducing figures before
adopting them and saying plainly when they don't hold** — that has been the
whole basis of the exchange, and every round where it mattered started with a
number that looked fine.

When a number is provably wrong, fix it and show the arithmetic. When design
intent is ambiguous, ask. Conflating those two is the failure mode both sides
have named.
