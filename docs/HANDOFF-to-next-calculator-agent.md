# Handoff — the calculator side

You're picking up the **website** half of a two-agent project. A separate Claude
session maintains the recipe and the build spec. You build the calculator from
the spec, and you push back when the numbers don't hold.

`CLAUDE.md` loads automatically and carries the technical rules. **This file
carries what it doesn't:** where things stand, what's open, how a round works,
what each test exists to catch, and the mistakes that keep coming back.

Written 23 September 2026, after MESSAGE-24, and kept current through
MESSAGE-41, FINDINGS-42, Task 10 and the speed indicator (27 September).
Don't trust any status here that you can check instead (§7).

---

## 1. Where it stands

- **The correspondence is applied through MESSAGE-41, and FINDINGS-42 is the
  last thing sent.** Nothing is open on either side and no pin of any kind is
  live (`knownWrong` is empty). The next move is theirs: expect MESSAGE-42,
  or an unprompted message carrying one of Dave's asks.
- **What the last rounds settled**, so you don't reopen it:
  - MESSAGE-32: `bulk-3` prints `{ballRoomMin}`, the rise the timeline plans;
    Dave's timers on the four mixer phases, so **the timer is the one source
    of a phase's duration**.
  - MESSAGE-33: `bulk-3`'s block states both rises rather than inviting a
    subtraction.
  - MESSAGE-34: `biga-2` folded into `biga-3` without renumbering, so
    **`biga-2` is absent on purpose**; the Halo Core limits sourced to Ooni's
    help center.
  - MESSAGE-35 and 36: every rendered paragraph, theirs and ours, rewritten
    to the humanizer patterns. **The writing rules live in CLAUDE.md
    ("Writing anything the site shows") and apply to every string this side
    adds.**
  - MESSAGE-37: the recipe's phrasing pass; `mix-2`'s unsourced
    motor-protection advice deleted. `mix-1`'s "trip the motor protection"
    stays: Dave confirms the Core has one. Don't raise it again.
  - MESSAGE-38: split-batch wording made count-neutral, since 19–24 balls
    run as three mixes at 265 g. `mix-1`'s overrun is "five minutes" for
    every extra five: the cut is half the *planned* stagger, so an overrun
    lands whole on the first dough. Our gate had filed the old "2½" as half
    an overrun, the same misreading. §4.2's two-mix phrasings and §4.8's
    12-ball text stay as they are (FINDINGS-39 §4).
  - MESSAGE-39: the same sweep through the spec's engineering sections;
    nothing renders. §4.8 now separates correcting `CHANGEOVER` (half on the
    rise, per changeover) from an overrun on the day (whole, on every dough
    mixed before it).
  - MESSAGE-40: FINDINGS-40's gap accepted. 0.392 is the flour term; at 6
    balls per mix the seeded FF adds `(14.03 − 14) × Ct/Cw`, so the rendered
    gap there is 0.482. §4.2, §5 and §7.2 now name their conditions.
    MESSAGE-41 corrected its 59.023 to 59.022.
- **Git state.** PRs #1, #2, #3 and #5 merged MESSAGE-30 to 38 into `main`,
  each with a merge commit. PR #4, from another session, added the pizza
  icon (`public/`) and CLAUDE.md's rule to bring `README.md` current before
  opening a PR. Task 10's status and MESSAGE-39 to 41 sit on the session
  branch until Dave asks for the next PR. The session branch restarts from `main` after each
  merge, so a new round starts on `main` plus nothing.
- **Numbering, since it has stepped twice.** FINDINGS-25 went unprompted, so
  the pairs now share a number: MESSAGE-N answers FINDINGS-N, and
  FINDINGS-(N+1) answers MESSAGE-N. **There is no MESSAGE-22** (a stray draft,
  superseded by 21 and deleted) and **no MESSAGE-27** (FINDINGS-27 needed no
  reply).
- **Tasks 0–10 are done:** engine, state, cards, both timeline modes, steps,
  concepts, timers, reference and About drawers, and the deploy. Dave called
  the phone-in-the-kitchen check done on 27 September. The plan's status line
  names the last message applied.
- **What's left:**
  - Nothing on Task 10. Dave was offered an opt-in "keep screen on" switch
    (the Screen Wake Lock API) in case screen dimming got in the way, and
    didn't ask for it. It's not built, so ask before building it.
  - Task 11 — the bake log. Its `ff_measured` is `solveFrictionFactorF`, never
    `final − predicted_mix` (§10); file it under the bake's balls per mix;
    one row per mix on a split batch (§10, MESSAGE-28).
- **Every push to `main` deploys** to https://dmb1107.github.io/pizza-calculator/.

---

## 2. Open — start here

### Task 10's emulated audit — done; the rules it produced are in CLAUDE.md

At 375 px, with touch, light and dark, and every panel and step open: no
sideways scroll, no hover dependence, no input under 16 px. Fixed:
- the 24 px step checkboxes, now 48 px
- the Reset button pushing every step 28 px on the first tick
- the timer note pushing the tapped step 118 px on Start
- 12 px notes

CLAUDE.md's gotchas carry the rules: nothing may appear above the point of a
tap, 48 px targets, and check phone width in both timeline modes.

### Small debt: rounding outside `format.ts`

`Math.round` / `toFixed` for display also appears in:

- `bindTokens.ts` — `roomMin`, `ballRoomMin`, the stagger tokens, `trim()`
- `recipeText.ts` and the `StepList.tsx` final-temperature hint —
  `Math.round(result.ballRoomMinutes)`
- the `staggerUncentred` warning title in `engine.ts`
- `StepTimer.tsx`'s progress-bar `aria-valuenow`
- the duration and clock formatters in `timeline.ts` (including
  `formatStageDuration`'s "19 h (18–20)" and its minute spans) and
  `timers.ts` (including `describeSpec`'s seconds under a minute), which are
  display helpers living outside `format.ts`

None of these changes a displayed value today, since whole minutes are whole
minutes. The rounding in `url.ts`, `storage.ts` (mix-size keys),
`constants.ts`'s segment count and `SpeedIndicator`'s SVG coordinates isn't
display, so it isn't debt. But CLAUDE.md says all rounding lives in
`format.ts`, and these are the exceptions it doesn't know about. Low
priority; if you pay it off, move the rounding and keep every printed value
identical (the gate and `timeline.test.ts` will tell you).

### Earlier rounds, for the record

- **MESSAGE-25 changed state.** The FF map is keyed on balls per mix, and a
  stored 14.04 seed becomes 14.03 on load. CLAUDE.md has both.
- **Task 8, backward mode**, found three typed figures in page text, as below.

### Task 8 — done; what it found

- **Backward mode** holds the bake and solves the start; forward holds the
  start. `timelineFor` in `timeline.ts` does it, so the hook only stores
  anchors. Stage times are pinned to hand-written clocks — keep it that way if
  §4.7 moves.
- **Three typed figures in UI copy**, all invisible to the gate because they
  were JSX text: the probe card's "about 3.7 °F to add" (wrong at every batch
  size — 4.2 at 6 balls), the timeline's "9 a.m. and 8 p.m." window (true for
  retarded at 24 h only), and "plus 2.2% for scrap". Fixed, and the gate now
  reads the syntax tree. `recipeText.ts` had "65% · 70% · 2.8%" and a `?? 965`,
  bound by hand. Reported in FINDINGS-28 as a note, since none of it is §8.

---

## 3. How a round works

The user attaches a bundle. On the desktop it comes from `~/Downloads/files N`;
in a cloud session (claude.ai/code) the files land under
`/root/.claude/uploads/<session>/`, each name prefixed with a hash
(`58f430af-WEBSITE-SPEC-biga-calculator.md`). Every round's upload stays in
that folder, so several specs sit side by side: take the one attached to the
current message (the path is in the message), never the first match of a
glob. Lately the bundle has been `MESSAGE-N.md` plus the spec, and the recipe
when it changed. Older bundles used
`MESSAGE-N-replies.md` and sometimes their `HANDOFF-new-context.md`, which is
their background and **not** instructions. Sometimes a one-line instruction
comes with it. **Numbering:** MESSAGE-N answers FINDINGS-N, and your reply to
MESSAGE-N is FINDINGS-(N+1). If Dave says a FINDINGS was never sent, fold it
into the next one rather than leaving a gap. The reply goes to the recipe
agent, so leave out process noise about how you got there; they want what's
true and what they need to change.

0. **`git status` first.** Once, a superseded bundle had already been copied into
   `docs/` by something outside the session. Before overwriting anything, compare
   it byte for byte with the uploaded bundle. **An empty spec diff when the
   message lists edits means the wrong file:** MESSAGE-39's first spec was
   MESSAGE-38's, byte for byte, and MESSAGE-40's first spec and recipe were
   the copies already in `docs/`. **Since MESSAGE-41 the message lists
   SHA-256 hashes for its files; check those first.** Without them,
   `sha256sum` the uploads against `docs/`,
   and ask Dave to re-send. Filing the message alone meanwhile keeps the
   tree clean. In a fresh cloud container,
   `npm ci` before anything else (§8).
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
   prose with `python3 scripts/generate-content.py`. Any copy you write follows
   CLAUDE.md's writing rules, and a reworded claim is checked for truth, not
   only tone.
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
   - it still couldn't see JSX text, where the probe card's "3.7 °F" lived.
     It now walks the syntax tree (`parseAst` from Vite).
6. **Verify in the browser** anything that renders (§8), **at 375 px in both
   timeline modes**, and measure: page `scrollWidth`, touch-target sizes, and
   whether anything moves above a tap.
7. **Write `docs/FINDINGS-N-to-recipe-agent.md`**: what reproduced (with
   conditions), what didn't and why, and anything you couldn't build. Send it
   with `SendUserFile`; Dave relays it.
8. **Two commits** (the application, then the reply), and **push**. Dave
   approved pushing at MESSAGE-17, and every round since has been pushed. In a
   cloud session the push goes to the session's `claude/*` branch, which
   doesn't deploy. **Dave asks for the PR himself** ("create the PR then merge
   it"); don't open one unprompted. When he does:
   - open it into `main` with the GitHub MCP tools; the repo has no PR
     template;
   - merge with `merge_method: "merge"` and `expectedHeadSha` set to the
     head you pushed. **Never squash**: Dave wants every round's commits on
     `main`;
   - confirm the merge commit has two parents, then restart the session
     branch from `origin/main` (`git checkout -B <branch> origin/main`; the
     push is a fast-forward);
   - **verify the deploy** (§7).
   Outside a PR, a push straight to `main` deploys; verify it the same way.
9. **Report in chat:** what landed, what you found, what's open.

---

## 4. What each test exists to catch

| Suite | Guards | Why it exists |
|---|---|---|
| `steps.test.ts` | §8 prose verbatim, plus §9, §11 and §7.3's capacity messages (with §6's split hint), each re-derived by a differently shaped parser. The generator and this file parse the same grammar independently. Both refuse unknown `**marker:**` lines, a raw count of conditional markers is taken from the spec itself, and each step ends at the next `###`. Per-track `timer (retarded\|classic)` since MESSAGE-31. Concepts compared as ids split from the spec line, not re-joined | Two parsers sharing one condition list dropped `bulk-2`'s capped block, and 42/42 still passed. `mix-8` used to swallow §8.2a. Re-joining split ids agreed with the spec when the generator kept a comma in `"mix-dont-knead,"` (MESSAGE-34) |
| `contentLiterals.test.ts` | Every number in §8, §9, §11 and the capacity messages either rebuilt from the engine (`CLAIMS`) or classified (`FIXED`); `knownWrong` pins a disagreement both ways (none live); numeric copy in **every `.tsx` under `src`**, read from the syntax tree (JSX text, attributes, template text), and a classified phrase excuses only itself. **Every string a step carries**, walked rather than listed, and the timeline's stage text (`STAGE_INFO`). The planning ranges claimed against `PLANNING_RANGE_H`. Lit-segment counts are rebuilt as dial ÷ 10 independently of the formatter. A counterfactual can still be a claim: `computeThermal` at `nMix` 1 *is* the batch-total model | `mix-4` showed stale probe values for eight rounds while prose-vs-prose passed. The biga hint's typed figures hid inside a template literal, then behind a classified phrase in the same string. A list of six step fields hid the per-track timers and every title (MESSAGE-31). **It checks numbers, not sources:** a worded claim passes by construction |
| `constants.test.ts` | Derived constants recomputed from their inputs; every constant has a **code** read (`C.X` / `BASE.X`, comments stripped) | `divideBall = 0.33`, `ADY 0.0038`. The reader check once counted the comment recording a constant's removal as a read |
| `stepInstances.test.ts` | Golden step sequences per schedule at `nMix` 1–3, and §8.2a's published counts read from the spec. Closed condition sets: detail blocks (`nMix > 1`, `nBiga > 1`, `thickerThanDefault`) and `shownWhen`; both throw on unknown | The expansion repeated templates instead of mixes: same count, same labels, wrong procedure. A component ternary read any unknown condition as `nBiga > 1` |
| `stageSteps.test.ts` | Every timeline stage has a step rendered on its schedule, and every step maps to a stage. §7.5: each planning-point stage's step times the whole §4.7 range; the classic exception across 12–18 h; a single-number timer equals its stage's planned duration, `bulk-3` included at `nMix` 1–3 and at the 45-minute floor | `bigaTemper` had a duration and a clock time but no step. `bulk-3` timed the unshortened rise for a round: each side right alone, disagreeing |
| `engine.test.ts` | §5 vectors and the bake-1 regression, **held to printed precision (0.005)**, not `TOL`. The rendered gap at app defaults: 0.392, or 0.482 at 6 balls per mix where the seeded FF applies, with the 12-ball cards' printed figures. §4.2's per-mix DDT slip, priced at `C_bowl/Cw` on both bases. Per-mix thermal weights. The panel hints' bases, measured by perturbing `calculate`. Water reachability sweep (samples 257 g for the true corner). Shaped rise **keyed by DDT**. The two biga bases, measured off `computeWaterTempF`. §4.9, §4.10 | Every rise table was keyed on dough temperature, silently assuming DDT 75 — including this suite's own vector. At `TOL.degF` = 0.1 the bake-1 pin couldn't tell 67.97 from 68.00 |
| `bindTokens.test.ts` | No unbound or unused token, over every string a step carries (walked, not listed, since FINDINGS-34). `{probeGapPhrase}` at below / above / right at DDT. The thicker note decided on its **printed** value | A condition decided on unrounded values printed "12.0 rather than 12" |
| `state.test.ts` | URL and storage round-trips. The FF map keyed through `ballsPerMix`, exact-match at 6.5, the old seed replaced on load and nothing else | The map was keyed on total balls, so a 12-ball bake would have filed FF under a size no mix has |
| `timeline.test.ts` | §4.7 durations, the stage sequence on both schedules, daylight saving. §7.4's "19 h (18–20)" on every stage, written out. The centring at `nMix` 3 (middle dough on time) and a changeover overrun landing whole on the first dough (MESSAGE-38). **Backward mode pinned to hand-written clock times** on both schedules and at `nMix` 2; exact landing on the bake across fractional durations; the overnight windows against a brute-force scan | A wrong order sums to the right total. Summing hours × 3.6e6 landed 1 ms early and printed the minute before |
| `capacity.test.ts` | §7.3: which capacity message fires and when, its bound wording, the binding-limit guards (flour cap never first for a mix, always first for the biga), the below-minimum guard silent across the range, decisions on the **printed** per-mix dough, the near-limit ball list across 240–300 g. §7.5 segment states (lit / dim / off), and the chip's smaller line for every speed step | The spec says conditions are decided on displayed values; 2374.96 g prints 2375.0 and must fire. **The ball list can't see the 5%**: it holds for any threshold from 94.03% to 98.11%, so the edge test is what pins the threshold |
| `recipeText.test.ts` | Copy-as-text, and the dough total rounded once (2501.9 at 9 × 272 g, never the 2501.7 its rounded parts sum to) | The gate doesn't read `recipeText.ts` |
| `timers.test.ts` | Timer state derived from an absolute start and `now`, windows as earliest → latest. Every step's timer, resolved per schedule and bound with the real token table, parses as a duration. The generator's `timerMinutes` and the runtime parser agree on every fixed label (seconds included) | `biga-4` said "per schedule" and had no timer for the longest stage in the recipe. Seconds are where two parsers of one label could part |

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
  envelope), "30% of the system", and "0.392 at every batch size", which
  held for the flour term and missed FF: at 6 balls per mix the seeded 14.03
  makes the rendered gap 0.482, the default page included (FINDINGS-40).
- **A difference tabulated against one of its terms:** the probe gap indexed by
  batch size, the shaped rise indexed by dough temperature.
- **Two bases in one sentence:** 1.59 against 1.92 for the biga. It came back
  in the panel hint, and was fixed on 23 September (FINDINGS-25).
- **A worded claim resting on a thin margin:** "more than three times" held
  because `Ct/Cw` is 3.0023. A formula change a few points away breaks it, and
  no gate sees words. Print the computed figure instead.
- **A four-place figure in a finding, rounded again by its reader.** Our
  FINDINGS-40 table printed 59.0225, and MESSAGE-40 quoted it to three
  places as 59.023; the engine says 59.022463. Quote six places in tables
  meant to be quoted.
- **Rounding while reading your own scratch output.** `toFixed(1)` in a
  scratch print turned 2437.47 into "2437.5", which then went into a finding
  as "unrounded". Print scratch values with more digits than the claim needs.
- **A reason asserted without checking it:** "the three tie because they share
  a per-mix dough". They don't (1250.93 g against 1667.90 g); they share
  `(nMix − 1) ÷ batch dough`. The number was checked and its explanation wasn't.
  Again in MESSAGE-38: the gate filed `mix-1`'s "2½" as half an overrun,
  because the centring halves the stagger. It halves the *planned* stagger,
  and an overrun lands whole.
- **A tolerance wider than the change:** `TOL.degF` = 0.1 passed both 67.97 and
  68.00. When a pin moves by less than its tolerance, the test never saw it.
- **Verifying a list by its contents when order is the meaning:** the step
  expansion.
- **Logic in a component:** the expansion, the condition resolver, the
  sensitivity hint. Move it to `src/lib`, where tests reach it.
- **A display decided on unrounded values:** keep the computation unrounded, but
  decide what to show from what will be printed.
- **Mental arithmetic in a test expectation.** "→ 3 mixes of 2167.3 g"
  was typed from a head calculation; the engine said 2166.6, and it was right.
  Take expected values from a scratch run, not from memory.
- **A phone check in one state only.** Task 8's 375 px check ran in backward
  mode; forward mode had pushed the page sideways since Task 4.
- **Content that appears above a tap,** and **flex stretch turning a label
  into a 381 px target.** Measure positions before and after the tap, and
  measure the target, not the control.
- **Guessing hardware from a photo.** A perspective shot of the mixer's ring
  was read one position off. When the app must match a physical thing, ask
  Dave to describe it, then draw his description.
- **A status claim repeated without checking:** "the deploy is broken" held
  back five rounds of pushes, and was never true.
- **A retraction swept for its figures only.** Sweep for the idea as well, in
  the documents *and* the code. The retired rise idea survived in two UI strings
  with no number in them.
- **A scan over a hand-written list of fields.** The gate read six step fields
  and missed the per-track timers and every title (MESSAGE-31). The token
  check had the same list. Both now walk every string a step carries.
- **Two parsers agreeing on a bad split.** The generator wrote the concept id
  `"mix-dont-knead,"` from a comma-separated line, and the test re-joined the
  split ids, so both matched (MESSAGE-34). Independence has to hold on the
  axis that broke.
- **A test asserting on a field the page doesn't read.** A timer check asserted
  `timerMinutes` while the chip renders `timerLabel`, so a wrong label couldn't
  fail it. Assert on what renders, and show the check failing first (it now
  fails when `mix-6`'s label is broken).
- **A claim reworded for tone that became false.** "The highest-leverage input
  in the model" read well; FF and DDT each move the water target about 3 °F
  per °F, the biga 1.6 (FINDINGS-36). Check the claim, not only the tone.
- **A figure diff scoped too narrowly.** A rewording pass listed its changed
  figures and five more had moved (FINDINGS-36), all of them restatements.
  Diff every figure in both versions, not the ones the message names.
- **A test pinning old wording.** When the copy's advice changes (the stagger
  lever became "a batch size that needs fewer mixes"), the test that pinned
  the old phrase has to move to the new claim, not just the new string.

---

## 7. The deploy

It works, and has since 1 September. **Check it rather than believe it:**

```bash
gh run list --limit 3
```

In a cloud session there is no `gh`: use the GitHub MCP `actions_list`
(`list_workflow_runs`) and `list_workflow_jobs` on the run for the merge
commit's SHA. The workflow is "Deploy to GitHub Pages" and has a build job and
a deploy job; both must succeed.

To confirm the site itself, compare the `assets/index-*.js` name in the live
`index.html` with the one `npm run build` prints. **The container can't reach
github.io**, so from a cloud session the successful run is the evidence. The
MESSAGE-38 tree builds `index-Bf1mQ8-C.js`.

Don't change the workflow or the Pages source; both are right. Two runner
notices need nothing yet: `deploy-pages@v4` is forced onto Node 24, and
`ubuntu-latest` moves to Ubuntu 26 from 19 October 2026. Look at those first if
a deploy fails after that date.

---

## 8. Practical notes

**Git and scripts**

- **Push over HTTPS.** The remote is already HTTPS: on the desktop `gh` is the
  credential helper, and in a cloud session the container's proxy handles it.
  `git push -u origin <branch>` works in both.
- **Write edit scripts to files**, not inline heredocs: backticks in regexes get
  mangled. When a script matches on a short anchor, check where the edit landed.
  An anchor replaces what it matches and keeps everything between — the
  counterpart's §4.9 lesson, and it applies to our scripts too.
- **Scratch tests** go in `tests/__scratch.test.ts`, and get deleted after. The
  scratchpad is wiped between sessions.

**In a cloud session** (claude.ai/code)

- The container is fresh: **`npm ci` first**, or every script fails on a
  missing `vitest` or `tsc` types.
- **There is no `gh`**; use the GitHub MCP tools (`actions_list` for the
  deploy runs). The push goes to the session's `claude/*` branch, which
  **doesn't deploy**; Pages builds once it reaches `main`.
- **There is no browser pane.** Playwright is installed globally
  (`/opt/node22/lib/node_modules/playwright`, Chromium under
  `/opt/pw-browsers`). Serve `dist/` with `npx vite preview`, then read
  `innerText` at a 375 × 812 touch viewport, as below. Keep the Playwright
  scripts in the session scratchpad, not the repo.
- **Foreground `sleep` is blocked.** Start the preview server with
  `run_in_background` and poll for the port, rather than sleeping.
- **A tapped control can vanish.** The timer's Start button is replaced once
  tapped, so a locator for it goes stale. Take an element handle on the step
  before the tap and measure positions from that.

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
  deciding whether an error is new. A one-off `ReferenceError` right after
  editing a hook and its imports is usually the hot-reload window. Check it
  doesn't recur across reloads.
- **A screenshot straight after a scroll sometimes comes back blank.** Take
  it again.
- **Phone size:** `resize_window` with the `mobile` preset (375 × 812), and
  `colorScheme: 'dark'` for dark mode. Reset to `desktop` when done.
- **The live site is `https://dmb1107.github.io/pizza-calculator/`**; audit
  it, not only the dev server, when the question is what Dave will see.

---

## 9. If you read one thing

Dave is technical and checks arithmetic. The counterpart is careful and still
gets numbers wrong, and so does this side: the biga hint in FINDINGS-25 was ours. The
value here is **reproducing a figure before adopting it and saying plainly when
it doesn't hold**. Just as much, it's **testing each check against the case it's
meant to catch**, because a check that has never failed is taken on faith.

When a number is provably wrong, fix it and show the arithmetic. When design
intent is ambiguous, ask. Conflating the two is the failure mode both sides have
named.
