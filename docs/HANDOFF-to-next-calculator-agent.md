# Handoff — the calculator side

You're picking up the **website** half of a two-agent project. A separate Claude
session maintains the recipe and the build spec. You build the calculator from
the spec, and you push back when the numbers don't hold.

`CLAUDE.md` loads automatically and carries the technical rules. **This file
carries what it doesn't:** where things stand, what's open, how a round works,
what each test exists to catch, and the mistakes that keep coming back.

Written 23 September 2026, after MESSAGE-24, and kept current through
MESSAGE-70 and FINDINGS-71 (11 November); §1's first bullet, §7 and §8
brought current for APP-10 (MESSAGE-75, 12 November).
Don't trust any status here that you can check instead (§7).

---

## 1. Where it stands

- **APP-10 (MESSAGE-75, spec §14) is built, and FINDINGS-76 is the last
  thing sent.** The app moves from GitHub Pages to one Cloudflare Worker at
  `https://pizza.dave-becker.com`; the GitHub token moves off the devices
  into the Worker; devices sign in with a passkey. CLAUDE.md's "The Worker
  is the one place a mistake exposes the repository" has the rules, and
  FINDINGS-76 lists every route with what it checks. **Live since 12 Nov
  2026**: the preview passed its check on Cloudflare and was deleted, PR #61
  merged, Workers Builds deploys `main`, both secrets are set, Dave's
  devices moved with every bake, idea and photo back, and GitHub Pages is
  off (the old address is 404). Dave revokes the old token himself. The
  Worker's token is a new one, not the existing one §14.2 names (FINDINGS-76
  §13). **For FINDINGS-77:** the sync-rerun bug FINDINGS-76 §13 reported is
  fixed (both hooks, a WebKit test); it was worse than reported, since the
  rerun also marked every pulled record as changed here. Three test
  layers: `tests/worker.test.ts` (the routes, with real WebAuthn
  signatures), `e2e/signin.spec.ts` (WebKit, a stub Worker and a fake
  passkey), and `npm run test:worker` (the real Worker in workerd, a fake
  GitHub, Chromium's virtual passkey). What none can reach: a passkey in
  Safari, in the icon, and through Bitwarden; iOS copying Safari's cookie
  to an icon.
- **The correspondence is applied through MESSAGE-70, and FINDINGS-71 is the
  last thing sent.** MESSAGE-70 was APP-6, the fourth of Dave's queued app
  changes and spec §13: **three tabs** (Recipe, Toppings, Bake log; a bar
  fixed to the bottom below 768 px, a sticky strip from it), the log's
  drawer and its header and footer buttons gone, and **Dave's topping
  ideas** on their own tab with their own store and sync under `toppings/`
  in the log's repository (CLAUDE.md's "Three tabs" and "The topping ideas"
  have the rules). The log and the ideas now run one sync,
  `src/state/repoSync.ts`. FINDINGS-71 reports three readings for the
  counterpart to confirm or reword (what counts as "a link" when the page's
  own address carries its inputs; "last write wins" by `updated`; the
  mark's form) and a WebKit bug the suite found (Save left the bar hidden).
  Screenshots went with it for Dave's approval of the look. MESSAGE-69 was spec only: §7.5 and §10
  now describe APP-5 as built, with all four of FINDINGS-69's answers
  accepted (two of them Dave's calls). MESSAGE-68 was APP-5, the third of Dave's queued app
  changes: **finished steps and groups fold away** and the Bake log opens
  from the header (CLAUDE.md's "Steps and groups fold" has the rules).
  FINDINGS-69 asked four things (`mix-0` opening Mix 1, a ticked step that
  stays open after its timer stops, the closed heading's timer mark, and
  long titles on a folded step), all settled in MESSAGE-69. **From MESSAGE-68 Dave runs no phone
  checks:** each round's *Done when* goes in the WebKit suite
  (`npm run test:e2e`), and FINDINGS says which parts it can't reach.
  Building APP-5 found that the beep lived in the timer card, so a closed
  group would have silenced it; `TimerBeeper` now stays mounted with the
  list. **There is no MESSAGE-66**: MESSAGE-67 replaced it, after
  FINDINGS-67 arrived first. MESSAGE-67 brought §10 up to Dave's Reset
  (the confirmation names "the schedule adjustments") and **APP-4, a
  stopped timer resumes**: the pause left out on every timer, Resume in
  Stop's place, Clear in the card's far corner, the beep only when the
  count crosses the bound during the current run (CLAUDE.md's timer gotcha
  has the rules). APP-4 is done on the WebKit suite's check (MESSAGE-68). Done on the
  iPhone's keypad commits a reading at once (Dave, 10 Nov), so FINDINGS-67's
  open question is closed.
  MESSAGE-65 was the first of Dave's queued app changes
  (APP-3): **the inputs are stored in the browser as well as the URL**, with
  §6's four-case load rule in `src/state/storedInputs.ts` (CLAUDE.md has the
  rules). It was checked in a browser with `navigator.standalone` faked and
  the app remounted at a stale launch URL. **On Dave's iPhone the inputs
  survived a force close.** Reset didn't clear a reading still being edited
  (iOS keeps a field focused through a button tap), fixed in PR #23. Then
  **Dave's call: Reset puts the batch settings and the adjustments back to
  their defaults too**, built ahead of §10 and sent as FINDINGS-67 with the
  wording to change (in §10 since MESSAGE-67, whose gate patch removed the
  `AHEAD_OF_SPEC` pin: a pin typed to allow `null` should be removed, not
  nulled, since TypeScript narrows the dead branch to `never`). Rule 1 rests on the
  icon opening standalone, with no manifest.
  It also removed W16's steel sentence and retitled `schedule-architecture`.
  Before it: FINDINGS-65 was the reply to MESSAGE-64. No pin of any kind is live (`knownWrong` is empty).
  FINDINGS-65 asks two wording questions (`schedule-architecture`'s 6–48 h
  title on the classic track, and W16's unsourced steel claim); nothing
  blocks. MESSAGE-64 was Dave's science review, wording only: the biga is a
  yeast preferment, not a sourdough, and the retarded track moves part of
  the work into the dough. Our cold-ferment slider hint still said the
  opposite; it is per track now, and `contentLiterals.test.ts` bans the
  retired phrases from our copy. **From MESSAGE-64 every MESSAGE opens with
  the effort level Dave should run the round at.** The next four rounds are
  Dave's queued app changes, one per round. MESSAGE-63 changed wording only: the temper warms the
  bowl faster than the biga, so `biga-6` quotes 1.6 °F per °F of biga for a
  reading and "about 2" for a skipped temper, and `bulk-1` asks for a steady
  spot near the target dough temperature. The prefill stays `T_biga`, Dave's
  call. MESSAGE-62 was spec only: `thermal-model` reads 6.4. MESSAGE-61
  changed behaviour, not just copy: **each dough runs on its own clock**
  (own bulk, divide, rise and fridge; the timeline plans the last dough and
  prints the earlier doughs' end times; `stagger` and everything built on it
  is gone; `bulk-1`–`bulk-3` carry one timer per dough), **ball counts split
  evenly between the mixes** (`src/lib/ballCounts.ts`; the stepper skips,
  everything else rounds up and says so), and **`DDT` goes by balls per
  mix**, so 12 balls is 75 and matches 6 everywhere. Every envelope sweep
  now skips disallowed counts. MESSAGE-60 settled FINDINGS-60's two questions (Dave
  placed the three unlinked concepts; `BIGA_ROOM_TEMP_H` stays in
  `timeline.ts`, no §3 entry) and changed the recipe: **one ball per lidded
  24 oz deli container**, tempered 1½–2 h per ball, Dave's waves gone; the
  cooling estimate behind `COOLDOWN_EQUIV_MIN` is for an open tray (no
  figure moves); the mix ends mostly smooth; **Phase B is 7–9 min**, so the
  profile has 1.5 min of headroom and Phase B's log reference is 8 (nothing
  reads it: the log corrects Phase C only). Concepts outside the steps are
  `PAGE_CONCEPT_LINKS`, rendered by `ConceptLink`, and `steps.test.ts`
  requires every concept to be opened from somewhere. Bake 2 is back on.
  MESSAGE-59 carried bakes 2 and 3, the first counted bakes, and two
  changes. **D2: the log corrects Phase C only** — the phase `mix-4` sets
  from the probe, and the only rate a bake has checked; the 15% and 20%
  rates are unmeasured and both bakes say they run high. `CORRECTED_PHASE`
  pins it by key, and `normalizeFrictionFactorF` now takes just Phase C's
  minutes. All four timers are still logged and still required for a mix to
  count. **E1: the retarded cold ferment runs to 6–48 h**, default still 24;
  at 48 h the total is 74 h 50 min. The log holds bakes 2 and 3, both
  counted since Dave switched bake 2 back on after PR #16 deployed, so the FF
  in use at 6 balls per mix is their mean, **9.447610**. Before this round the
  live site served bake 3 under the four-phase rule and asked for 90.1 °F
  water at its default page; it is 81.3 now.
  MESSAGE-58 reported a live bug on the day of bake 2: a reading typed at
  the value the field already showed (a bowl at its prefill, a final on
  DDT) wasn't recorded, so the mix didn't count. Fixed with `leaveField`
  and `recordsReading`, and checked by typing in the browser, since the
  edit tracking lives in the component where no test reaches it.
  MESSAGE-57 changed documents only: §10's basis for the Phase B drift
  (reproduced, every mix swept) and the recipe's leftovers from MESSAGE-53
  and 54. PR #13 (MESSAGE-56) is live.
  MESSAGE-56 (Dave's change) removed the "Water poured" field: the log
  records each mix's water target, to the tenth, as the water used, and the
  page asks for a blend within 1 °F. A stored water outside 38–120 °F
  leaves the mix out. The synced log repository held no bakes at the time,
  so the old "no water reading" reason stays only for local bakes on a
  device without sync.
  MESSAGE-55 moved no figure: `mix-0`'s pointer to the prep step, both of our
  label choices written into §6 and §7.2, and `mix-1` linking
  `thermal-model`. The Calibration panel's `friction-factor` link, asked for
  by §8.3 since the start and never built, went in with it.
  MESSAGE-54 weighed the bowl at 963 g (the seed re-solved itself to
  10.787531, and every water target moved by about 0.01 °F), named 10 × 244 g
  as the largest unsplit batch, and **moved the day's readings into `mix-1`**:
  no Today's temperatures panel, no water card, no bowl-state selector, and
  each mix's water target under its readings with its own warnings. Steps
  name no sources since then. FINDINGS-55 left one note: `mix-0` still says
  the changeover step asks for the biga reading (fixed in MESSAGE-55).
  MESSAGE-51, 52 and 53 are Dave's three-part recipe review, now complete.
  MESSAGE-53 made one biga at every size (no `nBiga`, no `PerBiga` scope),
  added `mix-0` (split the biga, once, at `nMix > 1`), set the temper to
  1.5–2 h, scaled the divide with total balls on the timeline only, and gave
  the classic track a 6–8 h cold ferment. FINDINGS-54 left three notes, none
  blocking: `mix-0` says "tempered" on the classic track, §8.1 still names
  `{bigaCountSuffix}`, and the temper times were rounded twice. MESSAGE-51 dropped sources that use oil or sugar, moved the yeast
  dose to `biga-1` with a warm rehydration, stated the retarded schedule's
  dose as an assumption, and removed §4.9's opening size. MESSAGE-52 put
  `COOLDOWN_EQUIV_MIN` at 35, made bake 1's normalized FF (10.791045 then,
  10.787531 at the 963 g bowl) the FF in use at every size until a counted
  bake (every water target rose about 9.6 °F), and
  took FF out of the probe target. FINDINGS-53 left four notes, none
  blocking: §4.2's two app-default sentences, §4.10's 56.7, the 35 against
  the middle of 29–39, and §4.4's mixed bases. MESSAGE-48 made the page's Reset the only one and
  added the DDT override and the timeline's anchor to what it resets.
  MESSAGE-49 put the rest of the page in §10's *Kept* list: which end of the
  timeline is held, which panels are open and this device's sync settings.
  The anchor is the held time, not the mode. MESSAGE-50 (Dave's workflow:
  he starts and stops the mixing timers, doesn't always tick, and times the
  long stages on his phone) tagged the four mixer-phase timers "Logged" and
  put in §10 that the bake is saved at the end of the mix. Task 11, the bake log, is built: readings stored as they stand and
  solved on read, normalized to mid-range phase times, §6's four-step FF in
  use, §10's counting rules, and sync through a private GitHub repository
  with a per-device token.
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
  - FINDINGS-43 and MESSAGE-43: step timers count up (Dave's ask, PR #7),
    and §7.5 now says so. **Nothing labels a timer's lower bound "ready"**,
    the tab title included, since a window stage is judged by its cue.
- **Git state.** PRs #1, #2, #3, #5 and #6 merged MESSAGE-30 to 41 and
  Task 10's status into `main`, each with a merge commit. PR #7 made the
  step timers count up, PR #8 carried FINDINGS-43 to 44, and PR #9 carried
  Task 11 with MESSAGE-45 to 50 and FINDINGS-51. PR #10 (23 October) carried
  MESSAGE-51 to 54 and FINDINGS-52 to 55, after Dave had spent a round
  reviewing a site four messages behind: check `gh run list` and the live
  page's script hash, and offer a PR when branches pile up. PR #11 carried
  MESSAGE-55, and PR #13 MESSAGE-56. **Every FINDINGS says whether the live site is current**
  (promised in FINDINGS-56): name the last message it serves, checked
  against the live script, not the merge. PR #4, from
  another session, added the pizza icon (`public/`) and CLAUDE.md's rule to
  bring `README.md` current before opening a PR. The session branch restarts from `main` after each
  merge, so a new round starts on `main` plus nothing.
- **Numbering, since it has stepped twice.** FINDINGS-25 went unprompted, so
  the pairs now share a number: MESSAGE-N answers FINDINGS-N, and
  FINDINGS-(N+1) answers MESSAGE-N. **There is no MESSAGE-22** (a stray draft,
  superseded by 21 and deleted), **no MESSAGE-27** (FINDINGS-27 needed no
  reply) and **no MESSAGE-42** (the same, for FINDINGS-42).
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
- **Every push to `main` deploys** to https://pizza.dave-becker.com through
  Workers Builds, once Dave has connected it (§7). Before APP-10 it went to
  https://dmb1107.github.io/pizza-calculator/.

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

- `bindTokens.ts` — `trim()` (the rises go through `formatWholeMinutes` and
  `formatRiseByDough` since MESSAGE-61, and the stagger tokens are gone)
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
| `steps.test.ts` | §8 prose verbatim, plus §9, §11, §7.3's capacity messages (with §6's split hint) and §10's Reset confirmation (read from `NewBakeReset`'s syntax tree), each re-derived by a differently shaped parser. The generator and this file parse the same grammar independently. Both refuse unknown `**marker:**` lines, a raw count of conditional markers is taken from the spec itself, and each step ends at the next `###`. Per-track `timer (retarded\|classic)` since MESSAGE-31. Concepts compared as ids split from the spec line, not re-joined | Two parsers sharing one condition list dropped `bulk-2`'s capped block, and 42/42 still passed. `mix-8` used to swallow §8.2a. Re-joining split ids agreed with the spec when the generator kept a comma in `"mix-dont-knead,"` (MESSAGE-34) |
| `contentLiterals.test.ts` | Every number in §8, §9, §11 and the capacity messages either rebuilt from the engine (`CLAIMS`) or classified (`FIXED`); every claim's `covers` a literal at its location that its own text builds (FINDINGS-55); `knownWrong` pins a disagreement both ways (none live); numeric copy in **every `.tsx` under `src`**, read from the syntax tree (JSX text, attributes, template text), and a classified phrase excuses only itself. **Every string a step carries**, walked rather than listed, and every string of a concept or §9 section (titles included since FINDINGS-52), and the timeline's stage text (`STAGE_INFO`). Figures derived from §11's sources (AVPN, Grain Craft) are claimed against constants that are themselves checked against §11's notes, and `biga-4b`'s "11 hours" re-runs MESSAGE-51's integration from `Q_DOUBLING_F` and §4.7. The planning ranges claimed against `PLANNING_RANGE_H`. Lit-segment counts are rebuilt as dial ÷ 10 independently of the formatter. A counterfactual can still be a claim: `computeThermal` at `nMix` 1 *is* the batch-total model | `mix-4` showed stale probe values for eight rounds while prose-vs-prose passed. The biga hint's typed figures hid inside a template literal, then behind a classified phrase in the same string. A list of six step fields hid the per-track timers and every title (MESSAGE-31). **It checks numbers, not sources:** a worded claim passes by construction |
| `constants.test.ts` | Derived constants recomputed from their inputs; every constant has a **code** read (`C.X` / `BASE.X`, comments stripped) | `divideBall = 0.33`, `ADY 0.0038`. The reader check once counted the comment recording a constant's removal as a read |
| `stepInstances.test.ts` | Golden step sequences per schedule at `nMix` 1–3, and §8.2a's published counts read from the spec. Closed condition sets: detail blocks (`nMix > 1`) and `shownWhen` (two schedules and `nMix > 1`); both throw on unknown, the retired `openDiameterCapped`, `thickerThanDefault` and `nBiga > 1` included. Every detail condition must have a block. **`mix-0` renders once, before `mix-1#1`, only at `nMix > 1`**, and the repeating block is selected by `repeatsPerMix`, not by phase. Counts 19 / 28 / 36 and 17 / 26 / 34 | The expansion repeated templates instead of mixes: same count, same labels, wrong procedure. A component ternary read any unknown condition as `nBiga > 1` |
| `stageSteps.test.ts` | Every timeline stage has a step rendered on its schedule, and every step maps to a stage. §7.5: each planning-point stage's step times the whole §4.7 range; the classic exception across 12–18 h; a single-number timer equals its stage's planned duration, `bulk-3` included at `nMix` 1–3 and at the 45-minute floor | `bigaTemper` had a duration and a clock time but no step. `bulk-3` timed the unshortened rise for a round: each side right alone, disagreeing |
| `engine.test.ts` | Each mix's bowl read by index (FINDINGS-46: mix 1's reading printed mix 2's water 4.6 °F warm). §5 vectors and the bake-1 regression, **held to printed precision (0.005)**, not `TOL`. The rendered gap at app defaults: one gap, −9.253 (the flour's 0.392 less the FF in use's 9.645), with the 12-ball targets' printed figures. §4.4's hot-corner table and §5's reachability at the FF in use, **swept over every mix** (later mixes are the cold end: 59.9, and 50.2 at FF 14), and the water warnings read from **every mix's** list, since MESSAGE-54 moved them out of the strip (read from the strip, that sweep would pass with nothing in it). The bowl prefill: mix 1 from its biga, later mixes from DDT. The probe target at several FFs, identical. §4.2's per-mix DDT slip, priced at `C_bowl/Cw` on both bases. Per-mix thermal weights. §7.2's two bases (`bowlTracksBiga`), measured by perturbing `calculate`, on mix 1 and on a later mix. Water reachability sweep (samples 257 g for the true corner). Shaped rise **keyed by DDT**. The two biga bases, measured off `computeWaterTempF`. §4.10 | Every rise table was keyed on dough temperature, silently assuming DDT 75 — including this suite's own vector. At `TOL.degF` = 0.1 the bake-1 pin couldn't tell 67.97 from 68.00 |
| `bindTokens.test.ts` | No unbound or unused token, over every string a step carries (walked, not listed, since FINDINGS-34). `{probeGapPhrase}` at below / above / right at DDT, decided on the **printed** DDT and target | A condition decided on unrounded values printed "12.0 rather than 12" (§4.9's thicker note, removed in MESSAGE-51) |
| `ballCounts.test.ts` | §6's even split at every entry point: the stepper skips (18 ↔ 21 at 265 g), a weight change, a set count and a link round up, 24 is allowed at every weight, and the raised note. A 12-ball batch equals a 6-ball one figure for figure (DDT, water, probe, prefill, rise). The per-dough timer keys | MESSAGE-61. Each was confirmed by breaking the rule it guards |
| `state.test.ts` | URL and storage round-trips. Final readings by index, padded to the mixes (`73~`); an old link's `water` and `bowlst` ignored, and a pre-per-mix `dought` read as the batch reading. A stored FF map ignored. §10's Reset: every input and every persisted field classified as reset, cleared or kept. The cold ferment's per-track range (clamped on a schedule change and from a link, defaulted by track) and the temper's 1.5–2 h, through `applyInput` | The map was keyed on total balls, so a 12-ball bake would have filed FF under a size no mix has. Reset's classification fails with the DDT override or the anchor left out (MESSAGE-48) |
| `bakeLog.test.ts` | §5 *Bake log* pins: bake 1 at 14.027531 and 10.787531 (963 g bowl), the 0.7075 correction, no `Ct/TOT` factor; the counting rules one reason at a time; the aggregate (10.666667, spread 0.6), interpolation (11.7) and holding (12.2), the seed; **§6's badge table read from the spec**; the room slope; §4.8's mean (74.0 → 72.5, first mix only 75.1); the 120 °F warning at 10.21, and not at the FF in use. **The seed is bake 1's readings solved and normalized by the log's own code** (10.787531), and those readings are held equal to §5's `BAKE_1`. §7.5's **Logged** tag: the ids and both wordings read from the spec, the stopped tag equal to the time the log records | Mutation-checked: a carried-forward final list and a 0.9 factor on the correction both fail it, and so do a tag on the rest and a stopped tag without its time |
| `bakeLogSync.test.ts` | The local log's parsing and edits; sync against a fake repository (push, pull, stale write, deletions both ways, a refused token, an unreachable repo, offline, an unparseable file); `mergeAfterSync`; the session as a bake (entry dates, prefills, phase times by instance, no `bowl_state`, each mix's water as its target to the printed tenth, a target past 120 °F leaving the mix out); an older bake's `bowl_state` kept, and an unknown one dropped without rejecting the bake | A sync result applied over edits made while it ran would drop them |
| `timeline.test.ts` | §4.7 durations, the stage sequence on both schedules, daylight saving. §4.8's overhead table at six ball counts (the divide scales with balls), the 25.0–29.9 band at its two corners, classic at its 6 h cold ferment. §7.4's "19 h (18–20)" on every stage, written out. The centring at `nMix` 3 (middle dough on time) and a changeover overrun landing whole on the first dough (MESSAGE-38). **Backward mode pinned to hand-written clock times** on both schedules and at `nMix` 2; exact landing on the bake across fractional durations; the overnight windows against a brute-force scan | A wrong order sums to the right total. Summing hours × 3.6e6 landed 1 ms early and printed the minute before |
| `capacity.test.ts` | §7.3: which capacity message fires and when, its bound wording, the binding-limit guards (flour cap never first for a mix), the one-biga line exactly when the batch splits, the below-minimum guard silent across the range, decisions on the **printed** per-mix dough, the near-limit ball list across 240–300 g. §7.5 segment states (lit / dim / off), and the chip's smaller line for every speed step | The spec says conditions are decided on displayed values; 2374.96 g prints 2375.0 and must fire. **The ball list can't see the 5%**: it holds for any threshold from 94.03% to 98.11%, so the edge test is what pins the threshold |
| the gate's component walker | Widened in MESSAGE-59's round to strings in **object and array literals**, not just inside JSX. Markup is skipped by shape (a CSS color, or a list of lowercase hyphenated tokens), never by key, since a Tailwind map's keys are tones. A phrase guard bans any copy saying the log corrects more than Phase C | Reading only inside JSX hid `FRICTION_HINT`, whose step-1 badge still said each bake is corrected "to the middle of every phase time", and the Batch panel's two schedule descriptions — four rendered figures nothing had ever checked. The guard was blind when first written, and was found so by reinstating the stale hint |
| concept reachability (`steps.test.ts`) | Every concept is opened by a step's `concepts` or a `PAGE_CONCEPT_LINKS` entry, and each entry is rendered as a `ConceptLink` in the component §8.3 names (read from the syntax tree, by function). Also pins `biga-1`'s two links in order and that `watchFor` goes through `<Markdown>`. A phrase guard in `contentLiterals.test.ts` bans "tray" from our copy, the stage text and `recipeText.ts` | Three concepts were reproduced verbatim and opened by nothing (FINDINGS-60): the verbatim test compares text, not reachability. Each check was confirmed by mutation |
| `storedInputs.test.ts` | §6 *Where the inputs are kept* (MESSAGE-65): every input round-trips through storage, walked from a map keyed on every input (a new input won't compile without an entry, and the walk is held to the URL codec's keys); the load rule's four cases, browser and home-screen app; a link replaces the stored inputs whole; stored defaults ('') against nothing stored (null); a stored value read by the link's rules (19 × 265 g → 21, 30 h classic → 8, the temper, the retired keys); Reset then a reload; bad stored data, and `isStandalone` | A home-screen app reopened at its icon's address with default inputs beside stored ticks and timers. Each branch confirmed by mutation: ignoring standalone (the bug), a link that never wins, a link merged over the stored inputs, a bare URL that ignores storage, a Reset that keeps the readings, a non-string read as nothing stored. The hook's first persist (a link stored on load) only a browser reaches |
| `timerResume.test.ts` | §7.5 *A stopped timer resumes* (APP-4): MESSAGE-67's eight behaviours (Phase C 3:00 + 20 s pause + 1:00 logs 4:00 on the tag and the saved bake; pauses add up; the window and due time move by the pause; the beep only for a crossing in the current run, through a reload; unticking resumes nothing, per dough; a resume past midnight keeps the date; storage round-trips; old and bad stored timers); and a scan that fails on any start-and-stop subtraction outside `timers.ts` | Each rule confirmed by mutation (ten breaks, each failing). The scan exists because MESSAGE-67 found five places that computed elapsed time on their own |
| `e2e/iphone.spec.ts` (`npm run test:e2e`) | Dave's device checks in WebKit as an iPhone home-screen app: MESSAGE-65's done-when from a stale icon, then Reset, across force closes; a shared link in Safari; Reset with a reading still being edited; MESSAGE-67's done-when (Phase C 4:00 on the log card, bulk rest from 30:00, beeps, a double tap on Stop, reload and force close). Not in CI | Chrome and desktop WebKit both hid the Reset focus bug, so the harness models iOS keeping focus on a field when a button is tapped. Each scenario confirmed by putting its bug back: the focus bug, Stop then Clear in one spot, a home-screen app taking its launch address, and Resume's stale `now` (found by the suite's first run) |
| `stepGroups.test.ts` | §7.5 *Finished steps and groups fold away* (APP-5): the groups at one, two and three mixes on both tracks (`mix-0` opens Mix 1; every instance in one group, in order), each group's count, closing and reopening, stored keys from another size ignored, the fold rule, the closed heading's timer mark at both bounds (the timer due first; per-dough timers; nothing from a stopped timer or another group), the log card after the last mix group | MESSAGE-68. Each rule confirmed by mutation (six breaks, each failing) |
| `e2e/fold.spec.ts` | MESSAGE-68's *Done when* at 375 px, a split batch's groups, a running timer in a closed group (mark, beep, no second beep on reopening, a ticked step held open), and a reading being typed when its step folds or its group closes | The beep lived in the card: a closed group would have unmounted it. Each scenario confirmed by putting its bug back. **Can't see** whether iOS keeps a field focused through a checkbox tap (the harness models buttons only) |
| `tabs.test.ts` | §13.1: the three tabs in the spec's order and words; the stored tab and a bad one; Reset keeps it; `initialTab` across §6's four load cases, a reload of the page's own address, a reordered link and one reading different; the Recipe tab's mark (none on Recipe, the turn at the lower bound, a stored timer from another size ignored); no Bake log button in `App`, the log's two openers, and `TimerBeeper` mounted once, above the tab panels | MESSAGE-70. Each rule confirmed by mutation |
| `toppings.test.ts` | §13.2 and §13.3: the ratings (1–5 by halves, read from §13.2's table), a name-only idea, a rating refused without pre-bake, created kept and updated stamped, the two lists' order (Untested by `created`, with data where `updated` would sort otherwise), rated and cleared; storage (3.5 stays 3.5, its own key, malformed ideas dropped), Reset and a link untouched; sync against one fake repository holding both folders (push under `toppings/`, one browser to another, the last write by `updated` both ways, deletions both ways, each folder failing alone, offline, an unparseable file, an edit during a sync); §13.2's rendered copy read from the spec and found in `Toppings.tsx` | MESSAGE-70. Twelve breaks, each failing, among them the sort keys, `keepRemote`, a shared storage key and reworded copy |
| `markdown.test.tsx` | §13.2's Markdown: single line breaks kept with `breaks` and not without, lists and code untouched, links `_blank` with `noopener noreferrer`, a `javascript:` link dropped, raw HTML as text; only `Toppings.tsx` passes `breaks`. None of §8's 53 texts has a single line break inside a paragraph, so the pass would change nothing there today | MESSAGE-70 |
| `e2e/tabs.spec.ts` | MESSAGE-70's *Done when* at 375 px and 1024: the bar's place and the page clearing it, hidden while typing; the strip under the title and sticky; a tab switch keeping Recipe's scroll and readings, and recording one still focused on the strip; a beep and the mark with Toppings open; a name-only idea rated 3.5 through a reload and a force close, a link opening a new page, Delete asking; Reset and a shared link leaving the ideas; the log's two openers; two profiles and one stubbed repository, and each folder failing alone. Writes FINDINGS' screenshots when `APP6_SHOTS` is set | Its first run found Save leaving the bar hidden (WebKit fires no blur for a removed field). Each scenario confirmed by putting its bug back (eight) |
| `fieldCommit.test.ts` | §6's rule for leaving a number field (MESSAGE-58): an edited reading commits even at the value shown, through to `bowl_prefilled: false` and a counted mix; no edit commits nothing; other fields keep the old rule | A bowl read at its prefill and a final on DDT were dropped as unchanged. The edit tracking itself is in `NumberField` and only a browser check reaches it |
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
  `THICKER_NOTE_MIN_PERCENT = 10` was Dave's call, labelled as such, until he
  removed the feature in MESSAGE-51. Don't invent a threshold or a band. Two
  unsourced "bands" have been removed already.
- **Read the sources when a round is about sources.** The gate checks numbers
  only. In FINDINGS-52, reading them found Grain Craft's ash in a nutrition
  panel sourced to the USDA database, and AVPN's regulation and web page
  giving type 00 different limits.

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
  Take expected values from a scratch run, not from memory. It happened again
  in MESSAGE-52's round: a probe phrase at a 54 °F room typed as "0.3 above"
  from a head calculation; the engine said 0.5.
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
  with no number in them. MESSAGE-51's room-temperature biga water survived as
  the ingredients card's bare "room temperature" note for a round, because the
  sweep searched phrases ("room-temperature water") rather than the idea.
- **A scan over a hand-written list of fields.** The gate read six step fields
  and missed the per-track timers and every title (MESSAGE-31). The token
  check had the same list. Both now walk every string a step carries. The
  gate then still read only a concept's body, and four concept titles carry
  figures (FINDINGS-52). Concepts and §9 sections are walked now too.
- **Two parsers agreeing on a bad split.** The generator wrote the concept id
  `"mix-dont-knead,"` from a comma-separated line, and the test re-joined the
  split ids, so both matched (MESSAGE-34). Independence has to hold on the
  axis that broke. Again in MESSAGE-53: both derived `repeatsPerMix` from the
  phase, which `mix-0` broke. Each now reads §8.2a's span its own way
  (numeric range, step order).
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
- **A check that goes vacuous when the data moves.** The envelope sweep
  asserted no water warning in `result.warnings`; MESSAGE-54 moved those to
  each mix, and the sweep would have passed with nothing to find. When data
  moves, grep for every reader of the old place.
- **A field nobody checked inside a checker.** The gate's claims listed the
  literals they cover, and nothing compared the list with the claim's text,
  so "965 g" sat there after the bowl moved and `biga-4.detail`'s "2 hours"
  was excused by a claim that never built it (FINDINGS-55).
- **A test pinning old wording.** When the copy's advice changes (the stagger
  lever became "a batch size that needs fewer mixes"), the test that pinned
  the old phrase has to move to the new claim, not just the new string.

---

## 7. The deploy

**From APP-10 (MESSAGE-75):** Cloudflare's Git integration (Workers Builds)
builds and deploys every push to `main`: `npm test && npm run build`, then
`npx wrangler deploy`. GitHub Actions only runs the tests (`ci.yml`, "Tests")
and deploys nothing. Check the deploy rather than believe it: the Worker's
**Builds** tab in the Cloudflare dashboard, and the `assets/index-*.js` name
in `https://pizza.dave-becker.com/` against the one `npm run build` prints.

```bash
gh run list --limit 3
```

shows the tests. In a cloud session there is no `gh`: use the GitHub MCP
`actions_list`. The Worker's secrets (`GITHUB_TOKEN`, `SETUP_CODE`) are
Dave's; never set or read them. `wrangler.jsonc`'s `env.preview` is a
second Worker, `pizza-calculator-preview`, on workers.dev, deployed by hand
(`npm run deploy:preview`) and deleted after the switchover.

**Before APP-10** the site was GitHub Pages, deployed by the "Deploy to
GitHub Pages" workflow, with `base` `/pizza-calculator/`. The workflow is
gone; Pages keeps serving its last build until Dave switches it off.

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
  app is at the root (`/`) since APP-10. If the port moves, `preview_logs`
  gives the real URL. The dev server has no Worker, so the page is signed
  out; `npm run worker:dev` after a build runs both.
- **Read text rather than screenshots:** `javascript_tool` reading `innerText`
  is reliable.
- **Number fields commit on blur:** triple-click, type, then Tab. Get refs with
  `find`, and find them again after any navigation.
- **"Divide and ball" is both a timeline stage and a step.** Take the last match
  for the step.
- **The Batch and Calibration panels are toggles** that remember their
  state, so a click can close one that was already open. The day's readings
  are in each mix's "Prep the bowl" step (`mix-1`), not a panel.
- **Ctrl+A doesn't select a number field's text on macOS.** It typed "60"
  in front of "54" and clamped the bowl to 120. Triple-click instead.
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
- **The live site is `https://pizza.dave-becker.com`** (from APP-10's
  switchover; before it, `https://dmb1107.github.io/pizza-calculator/`);
  audit it, not only the dev server, when the question is what Dave will see.

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
