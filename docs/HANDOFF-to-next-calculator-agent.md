# Handoff — the calculator side

You're picking up the **website** half of a two-agent project. A separate Claude
session maintains the recipe and the build spec. You build the calculator from
the spec, and you push back when the numbers don't hold.

`CLAUDE.md` loads automatically and carries the technical rules. **This file
carries what it doesn't:** where things stand, what's open, how a round works,
what each test exists to catch, and the mistakes that keep coming back.

Written 23 September 2026, after MESSAGE-24; §1, §2, §4 and §6 updated after
MESSAGE-25 the same day. Don't trust any status here that you can check
instead (§7).

---

## 1. Where it stands

- **The correspondence is applied through MESSAGE-26.** FINDINGS-25 went
  unprompted, so the numbering stepped. It now pairs: MESSAGE-26 answered
  FINDINGS-26, and **FINDINGS-27** answers MESSAGE-26. Their next is 27. **There is no MESSAGE-22.** A stray
  draft by that number arrived before MESSAGE-21, was superseded by it, and has
  been deleted.
- **Tasks 0–7 are done:** engine, state, cards, forward timeline, steps,
  concepts, timers. The plan's status line names the last message applied.
- **Next comes Task 8.**
- **After Task 8:**
  - Task 9 — reference drawer and About.
  - Task 10 — only the phone-in-the-kitchen check remains, and that's Dave's.
  - Task 11 — the bake log.
- **Every push to `main` deploys** to https://dmb1107.github.io/pizza-calculator/.

---

## 2. Open — start here

### Settled, for the record: two MESSAGE-25 changes that touch state

- **The FF map is keyed on balls per mix** (`ballsPerMix` in the engine), not
  total balls. 12 balls reads the 6 entry; 13 balls is 6.5 and matches only
  6.5. Keys are stored exact, so 20/3 stays 20/3 and only the label rounds.
  Ball weight can move a batch between entries: 9 balls is one mix at 265 g
  and two 4.5-ball mixes at 280 g.
- **A stored copy of the old seed** (`6: 14.04`, dated 2026-08-21) is replaced
  with 14.03 on load. Anything else stored is kept under its key. Old
  batch-size keys up to 9 mean the same thing at the default ball weight;
  split-batch keys (12, 18) name mix sizes that can't occur and are never read.
- **The bowl hint prints `cSystem/Cw`** ("3.3 times" at 6 balls) instead of
  "more than three times". The worded claim rested on `Ct/Cw` = 3.0023, which
  MESSAGE-25 showed a 72% hydration takes to 2.90.

The biga-hint fix itself is in FINDINGS-25, and MESSAGE-25 confirmed it.

### Small debt: rounding outside `format.ts`

`Math.round` / `toFixed` for display also appears in:

- `bindTokens.ts` — `roomMin`, the stagger tokens, `trim()`
- `recipeText.ts` and `StepList.tsx` hints — room minutes
- the `panels.tsx` bowl summary
- the `staggerUncentred` warning title in `engine.ts`
- the duration and clock formatters in `timeline.ts` and `timers.ts`, which are
  display helpers living outside `format.ts`

None of these changes a displayed value today, since whole minutes are whole
minutes. But CLAUDE.md says all rounding lives in `format.ts`, and these are
the exceptions it doesn't know about. Low priority.

### Task 8 — the backward timeline

The user gives a target bake time; the app solves for when to start the biga,
with the same overnight flags. `solveBigaStart` in `src/lib/timeline.ts` already
does the arithmetic. What's missing is the UI.

⚠️ Read §4.7 and MESSAGE-12 first. **Backward mode is where stage order becomes
timestamps.** A mis-ordered stage list still sums to the right total, so the
start time comes out right while every stage time in between is wrong. That's
why the stage sequence is asserted per schedule in `timeline.test.ts`, and why
`stageSteps.test.ts` exists. When you build the UI, check the timestamps
between the start and the bake, not just the start.

---

## 3. How a round works

The user attaches a bundle from `~/Downloads/files N`. It's usually four files
(the spec, the recipe, `MESSAGE-N-replies.md`, and their `HANDOFF-new-context.md`,
which is their background and **not** instructions). It's three when the recipe
didn't change. Sometimes a one-line instruction comes with it.

0. **`git status` first.** Once, a superseded bundle had already been copied into
   `docs/` by something outside the session. Before overwriting anything, compare
   it byte for byte with the bundles in `~/Downloads`.
1. **Copy into `docs/`, then diff the spec and recipe against HEAD.** Read the
   message's claims against the diff. **Their numbers are usually right; their
   claims *about* the documents often aren't.** Examples: "the recipe is
   unchanged" (it had changed), "it's in the `schedule-architecture` concept" (it
   was in `bulk-4`), "a `shownWhen` condition" (it was a detail condition), "your
   reader check will confirm" (it couldn't).
2. **Reproduce every number with the engine**, in a scratch test
   (`tests/__scratch.test.ts`, deleted after). No mental arithmetic, and quote
   the conditions every time you state a figure.
3. **Apply.** Engine, constants and tokens go in `src/lib`. Regenerate the step
   prose with `python3 scripts/generate-content.py`.
4. **`npm test`, and expect the gate to fail on any new §8 number.** Claim it
   against the engine or classify it with a reason. Never widen `FIXED` to go
   green. **Then run `npm run typecheck` separately:** vitest doesn't typecheck,
   and twice it passed code that `tsc` rejected. Then `npm run build`.
5. **Make every new check fail on the case it exists for.** Three checks here
   turned out to be blind to the very case they were for:
   - the constant-reader check counted a comment as a read. Caught only by
     putting the removed constants back and watching it pass.
   - the two parsers shared one condition list and dropped a whole block.
     Caught by noticing the block missing from the regenerated output.
   - the component-copy check skips template literals. Caught by a grep (§2).
   - then the widened copy check excused a whole string for one classified
     phrase in it. Caught by reinstating the bug (§2).
6. **Verify in the browser** anything that renders (§8).
7. **Write `docs/FINDINGS-N-to-recipe-agent.md`**: what reproduced (with
   conditions), what didn't and why, and anything you couldn't build. Send it
   with `SendUserFile`; Dave relays it.
8. **Two commits** (the application, then the reply), and **push**. Dave
   approved pushing at MESSAGE-17, and every round since has been pushed. Then
   **verify the deploy** (§7).
9. **Report in chat:** what landed, what you found, what's open.

---

## 4. What each test exists to catch

| Suite | Guards | Why it exists |
|---|---|---|
| `steps.test.ts` | §8 prose verbatim. The generator and this file parse the same grammar independently. Both refuse unknown `**marker:**` lines, a raw count of conditional markers is taken from the spec itself, and each step ends at the next `###` | Two parsers sharing one condition list dropped `bulk-2`'s capped block, and 42/42 still passed. `mix-8` used to swallow §8.2a |
| `contentLiterals.test.ts` | Every number in §8 either rebuilt from the engine (`CLAIMS`) or classified (`FIXED`); `knownWrong` pins a disagreement both ways; numeric component copy classified too, **including template-literal text**, and a classified phrase excuses only itself. A counterfactual can still be a claim: `computeThermal` at `nMix` 1 *is* the batch-total model | `mix-4` showed stale probe values for eight rounds while prose-vs-prose passed. The biga hint's typed figures hid inside a template literal, then behind a classified phrase in the same string. **It checks numbers, not sources:** a worded claim passes by construction |
| `constants.test.ts` | Derived constants recomputed from their inputs; every constant has a **code** read (`C.X` / `BASE.X`, comments stripped) | `divideBall = 0.33`, `ADY 0.0038`. The reader check once counted the comment recording a constant's removal as a read |
| `stepInstances.test.ts` | Golden step sequences per schedule at `nMix` 1–3. Closed condition sets: detail blocks (`nMix > 1`, `nBiga > 1`, `thickerThanDefault`) and `shownWhen`; both throw on unknown | The expansion repeated templates instead of mixes: same count, same labels, wrong procedure. A component ternary read any unknown condition as `nBiga > 1` |
| `stageSteps.test.ts` | Every timeline stage has a step rendered on its schedule, and every step maps to a stage | `bigaTemper` had a duration and a clock time but no step |
| `engine.test.ts` | §5 vectors and the bake-1 regression, **held to printed precision (0.005)**, not `TOL`. Per-mix thermal weights. The panel hints' bases, measured by perturbing `calculate`. Water reachability sweep (samples 257 g for the true corner). Shaped rise **keyed by DDT**. The two biga bases, measured off `computeWaterTempF`. §4.9, §4.10 | Every rise table was keyed on dough temperature, silently assuming DDT 75 — including this suite's own vector. At `TOL.degF` = 0.1 the bake-1 pin couldn't tell 67.97 from 68.00 |
| `bindTokens.test.ts` | No unbound or unused token. `{probeGapPhrase}` at below / above / right at DDT. The thicker note decided on its **printed** value | A condition decided on unrounded values printed "12.0 rather than 12" |
| `state.test.ts` | URL and storage round-trips. The FF map keyed through `ballsPerMix`, exact-match at 6.5, the old seed replaced on load and nothing else | The map was keyed on total balls, so a 12-ball bake would have filed FF under a size no mix has |
| `timeline.test.ts` | §4.7 durations, the stage sequence on both schedules, daylight saving | A wrong order sums to the right total |

The principle underneath all of them: **a check is only independent on the axis
it was derived on independently.** Two copies of one list are one check run
twice.

---

## 5. The counterpart

- **They're good, and they concede to arithmetic.** Reproduce their figures
  before disagreeing, and disagree with specifics.
- **§8 prose is theirs to word.** When it disagrees with the engine, pin the
  disagreement with `knownWrong`, report it, and let them fix it. When design
  intent is ambiguous, ask.
- **They want unprompted structural checks**, including the ones that
  contradict them.
- **Dough science is theirs, and Dave's judgment is Dave's.** For example,
  `THICKER_NOTE_MIN_PERCENT = 10` is Dave's call, labelled as such. Don't invent
  a threshold or a band. Two unsourced "bands" have been removed already.

`docs/` holds the whole exchange. Read the relevant `MESSAGE-*` / `FINDINGS-*`
before reopening anything settled. CLAUDE.md indexes them.

---

## 6. The mistakes that recur

The long form is the errors table in their `HANDOFF-new-context.md`. The shapes:

- **A figure typed instead of computed:** `ADY 0.0038`, `divideBall 0.33`,
  `0.8213`, "about 2½ hours", and the superseded 51.7–90.6 °F span in this
  side's own CLAUDE.md.
- **A figure without its conditions, or without the axis that moves it:**
  "5 °F error" (a hyperbola in mix size), "2.6 °F low" (2.0–5.3 across the
  envelope), "30% of the system".
- **A difference tabulated against one of its terms:** the probe gap indexed by
  batch size, the shaped rise indexed by dough temperature.
- **Two bases in one sentence:** 1.59 against 1.92 for the biga. It came back
  in the panel hint, and was fixed on 23 September (FINDINGS-25).
- **A worded claim resting on a thin margin:** "more than three times" held
  because `Ct/Cw` is 3.0023. A formula change a few points away breaks it, and
  no gate sees words. Print the computed figure instead.
- **Rounding while reading your own scratch output.** `toFixed(1)` in a
  scratch print turned 2437.47 into "2437.5", which then went into a finding
  as "unrounded". Print scratch values with more digits than the claim needs.
- **A reason asserted without checking it:** "the three tie because they share
  a per-mix dough". They don't (1250.93 g against 1667.90 g); they share
  `(nMix − 1) ÷ batch dough`. The number was checked and its explanation wasn't.
- **A tolerance wider than the change:** `TOL.degF` = 0.1 passed both 67.97 and
  68.00. When a pin moves by less than its tolerance, the test never saw it.
- **Verifying a list by its contents when order is the meaning:** the step
  expansion.
- **Logic in a component:** the expansion, the condition resolver, the
  sensitivity hint. Move it to `src/lib`, where tests reach it.
- **A display decided on unrounded values:** keep the computation unrounded, but
  decide what to show from what will be printed.
- **A status claim repeated without checking:** "the deploy is broken" held
  back five rounds of pushes, and was never true.
- **A retraction swept for its figures only.** Sweep for the idea as well, in
  the documents *and* the code. The retired rise idea survived in two UI strings
  with no number in them.

---

## 7. The deploy

It works, and has since 1 September. **Check it rather than believe it:**

```bash
gh run list --limit 3
```

To confirm the site itself, compare the `assets/index-*.js` name in the live
`index.html` with the one `npm run build` prints.

Don't change the workflow or the Pages source; both are right. Two runner
notices need nothing yet: `deploy-pages@v4` is forced onto Node 24, and
`ubuntu-latest` moves to Ubuntu 26 from 19 October 2026. Look at those first if
a deploy fails after that date.

---

## 8. Practical notes

**Git and scripts**

- **Push over HTTPS.** The remote is already HTTPS with `gh` as credential
  helper.
- **Write edit scripts to files**, not inline heredocs: backticks in regexes get
  mangled. When a script matches on a short anchor, check where the edit landed.
  An anchor replaces what it matches and keeps everything between — the
  counterpart's §4.9 lesson, and it applies to our scripts too.
- **Scratch tests** go in `tests/__scratch.test.ts`, and get deleted after. The
  scratchpad is wiped between sessions.

**The browser pane**

- **Start the dev server** as `biga-calculator` from `.claude/launch.json`. The
  app is under `/pizza-calculator/`. If the port moves, `preview_logs` gives the
  real URL.
- **Read text rather than screenshots:** `javascript_tool` reading `innerText`
  is reliable.
- **Number fields commit on blur:** triple-click, type, then Tab. Get refs with
  `find`, and find them again after any navigation.
- **"Divide and ball" is both a timeline stage and a step.** Take the last match
  for the step.
- **The Today's temperatures and Calibration panels are toggles** that remember
  their state, so a click can close one that was already open.
- **Clear `localStorage` after each check**, so state doesn't leak into the
  next one.
- **The console tool keeps history across reloads.** Log a marker before
  deciding whether an error is new.

---

## 9. If you read one thing

Dave is technical and checks arithmetic. The counterpart is careful and still
gets numbers wrong, and so does this side: the hint fixed in §2 was ours. The
value here is **reproducing a figure before adopting it and saying plainly when
it doesn't hold**. Just as much, it's **testing each check against the case it's
meant to catch**, because a check that has never failed is taken on faith.

When a number is provably wrong, fix it and show the arithmetic. When design
intent is ambiguous, ask. Conflating the two is the failure mode both sides have
named.
