# MESSAGE-67 — a stopped timer resumes, and Reset resets the batch

**For Dave: run this round at Opus 5.5 `high`.** It changes the timer state, the timer card, one test and the spec's text, and touches nothing in the engine.

Reply to FINDINGS-66 and FINDINGS-67, and the second of Dave's queued app changes (APP-4 in his backlog). **There is no MESSAGE-66:** it was written as the reply to FINDINGS-66, FINDINGS-67 arrived before Dave sent it, and this message replaces it, so it pairs with FINDINGS-67 and your reply is FINDINGS-68.

The spec changes in ten places and the recipe doesn't change. Nothing in §8 changes. Two things render differently: the timer card, where a stopped timer gets a **Resume** button in Stop's place and Clear moves; and the Reset confirmation, which names the schedule adjustments. Based on `main` at `3a2977e` (PRs #23 and #24 merged), whose documents still match MESSAGE-65's hashes.

## 1. On FINDINGS-66

All accepted.

- **Reproduced:** 809 of 809 on `main` after the merge, both hashes, and `resolveInitialInputs` read against §6's four cases. The `null` / `''` distinction and the first persist that writes only the inputs are both right, and §10 needs no line for the new field.
- **§4, the icon opening standalone.** On iOS 26, Add to Home Screen opens every site as a web app unless the user switches off "Open as Web App" in the sheet when adding it. That holds with or without a manifest or the `apple-mobile-web-app-capable` tag (WebKit, *WebKit Features in Safari 26.0*, "Every site can be a web app on iOS and iPadOS"). Dave's icon was added this year, so it is very likely a web app. WebKit's post doesn't say whether a web app built from a site with no manifest reports `navigator.standalone` or `(display-mode: standalone)`, so rule 1's detection is still unverified on a device. If detection fails, the page counts as a browser, a bare launch URL still takes the stored inputs by rule 3, and only an icon saved from an address with input keys shows the failure you described. Your remedy stands: re-add the icon from the bare address. Dave knows the check: no Safari address bar means a web app. No manifest, agreed.
- **Dave's iPhone check** passed for the force close (FINDINGS-67 §1), and you checked Reset and a reload. Dave won't run the last part of the done-when, a shared link opened in Safari, so APP-3 is done. Your tests cover that case.

## 2. On FINDINGS-67

All accepted, with one change to the confirmation's wording (below).

- **§2, a reading still being edited survived Reset.** Agreed on the cause and the fix. The bowl case was the serious one: a prefill recorded as a reading would have counted a mix whose bowl nobody read. §6's commit rule stands as written. **The open question on the device** (whether Done on the iPhone's number keypad commits a reading at once) is yours and Dave's to settle. If it doesn't, send it as a finding and I'll decide whether §6 needs a line.
- **§3, Reset puts every input back to its default (Dave's call, 10 Nov 2026).** The four edits you asked for are in, with a ⚠️ after the *Kept* list recording the change. One wording change, Dave's call: **the confirmation names the schedule adjustments.** §6 counts them among the batch settings, but on the page they sit in the timeline card under "Adjust the schedule", not in the Batch panel, so "the batch settings" alone doesn't tell the baker the temper and fridge hours go back too. The phrase "schedule adjustments" is the one the card's toggle already uses ("Hide schedule adjustments").

The §6 sentence:

> **After load the two stay in step.** Every change to an input writes storage and the URL together. Reset does too (§10): every input is stored at its default, so a reopened app doesn't bring back the last bake's.

§10's two lists, as they now begin and end:

> - **Reset to defaults:** balls, ball weight, schedule and cold ferment, the schedule's adjustments (fridge hours, the classic biga's room hours, temper), the readings in the prep steps (room, flour and its "Same as room" switch, each mix's biga and bowl), each mix's final reading, the DDT override (back to auto) and the timeline's anchor. …
> - **Kept:** which end of the timeline is held, which panels are open, this device's sync settings, and saved bakes. The anchor is the held time, not the mode: a Reset in either mode starts the schedule now. Since MESSAGE-65 the inputs are stored as well as written to the URL (§6, *Where the inputs are kept*), so all three lists hold when the app is closed and reopened. ⚠️ Until Dave's call on 10 Nov 2026 (FINDINGS-67) the batch settings and the schedule's adjustments were kept.

The rendered copy (§4 below has it again):

> **Start a new bake?** This puts the batch settings, the schedule adjustments and today's readings back to their defaults, and clears any DDT override, the timeline's start or target time, the step checkboxes and the timers. Your saved bakes stay.
>
> [Reset] [Cancel]

## 3. APP-4: a stopped timer resumes

### What Dave asked

A stopped timer can't be continued; he has to clear it and start again from zero. He wants to resume it, including when it is already past its range.

### Decided (Dave)

- **4a (9 Nov).** The time between Stop and Resume doesn't count, on any timer. Resume carries the count on from where it stopped, like a stopwatch. One behaviour for every timer, mixer phases and rests alike. He accepted the cost: a rest or ferment stopped by a slip and resumed later reads short by the pause, though the dough kept going.
- **4b (10 Nov).** Unticking a step doesn't resume the timers the tick stopped. Resume is always a tap.
- **4c (10 Nov).** A resumed timer beeps when its count crosses the lower bound while it runs. Resumed before the bound, it beeps when it gets there; resumed at or past it, it stays quiet.
- **4d (10 Nov).** Resume takes Stop's place and Clear moves away from it, with no confirmation. On `main` the card's one button reads Stop while running and Clear once stopped, in the same spot (`StepTimer.tsx`, the button with `onClick={state.stopped ? onClear : onStop}`), so a quick second tap on Stop clears the timer. A cleared mixer phase loses its logged time, and that mix doesn't count. With Resume in that spot, a double tap stops and resumes, which loses nothing.

### The spec text

§7.5, the first sentence of *Timers count up*:

> **Timers count up.** Every timer counts up from its start, so its large number is how long the timer has run. Time between Stop and Resume doesn't count (below).

§7.5, a new paragraph after *The logged timers are marked*:

> **A stopped timer resumes** (APP-4; Dave's calls, 9 and 10 Nov 2026). A stopped timer shows **Resume** and **Clear**, whether it stopped before, in or past its window. Resume carries the count on from where it stopped, as a stopwatch does: the time between Stop and Resume doesn't count, on every timer, mixer phases and rests alike. Clear removes the timer, and Start then begins again at 0:00.
>
> - **What it costs** (Dave accepted it): a rest or ferment stopped by a slip and resumed later reads short by the pause, though the dough kept going, and nothing corrects for it. A mixer phase works the same way: its logged time is the time its timer ran, which is the motor's time only if the mixer stopped with the timer (§10).
> - **Resume is always a tap.** Ticking a step stops its timers, and unticking it leaves them stopped.
> - **Resume takes Stop's place**, so Stop and Resume share one spot, and Clear sits away from it, with no confirmation. Start stays where it is. ⚠️ Until MESSAGE-67 one button read Stop and then Clear in the same place, so a quick second tap on Stop cleared the timer, and a cleared mixer phase lost its logged time, so that mix didn't count.
> - **The beep comes when the count crosses the lower bound while the timer runs.** A timer resumed before its lower bound beeps when it gets there; one resumed at or past it stays quiet.
> - **A resumed logged timer** reads **Logged** while it runs and **Logged · {elapsed}** once stopped again, with the pause left out.
> - **A timer with an exact duration** prints its start, as in "10 min from 2:15 PM". After a resume that time moves later by the pause, so the start plus the duration is still when the timer gets there.
> - **Each dough's timer resumes on its own**, and a resumed timer survives a reload like any other.

§10 *Capture and saving*, the Save bullet's date sentence:

> The bake's date is the day mix 1's Phase A timer first started; a resume doesn't move it.

§10 *Capture and saving*, the phase-time bullet's opening:

> **Phase times come only from the logged timers** (§7.5). A timer stops on Stop or when its step is ticked, and the time it has run is the phase time. Resume carries it on and the pause doesn't count (§7.5). If the mixer kept running through the pause, the phase reads short by it: 20 seconds of Phase C adds 0.36 °F to its normalized FF. A bake saved before a resume keeps the earlier time until it is saved again. A phase still running at save isn't captured, …

The rest of that bullet is unchanged. 0.36 is `FRICTION_RATE[30]` × 20/60 = 1.08 × ⅓, the same arithmetic as the bullet's "two extra minutes take 2.16 °F off the FF".

§10 *Solving a mix*, the pauses sentence:

> Pauses aren't normalized. The rest has a fixed timer, and nothing measures what a pause between phases costs. A pause inside a phase, timed with Stop and Resume, is left out of the phase time and isn't otherwise corrected.

### Notes for the build

The design is yours. What I found reading `main` at `4f05a44` (PRs #23 and #24 don't touch the timers):

- **Elapsed is computed in several places.** `timerState` and `timerDueAt` (`src/lib/timers.ts`), `phaseSeconds` (`src/state/sessionBake.ts`), `loggedTimerTag` (`src/lib/bakeLog.ts`), and `dueTimerStepIds` through `timerDueAt` (`useAppState.ts`). `firstMixStartedAt` reads `startedAt` for §10's date, and `StepTimer.tsx` reads it for the beep's key and the exact-duration line. Walk for `startedAt` and `stoppedAt` rather than trusting this list.
- **I'd keep `startedAt` as the first start** and store the paused total beside it, with every elapsed reading going through one function, as `observedRate()` does for the dough-only factor. Shifting `startedAt` forward by the pause would also work for the count, but it moves §10's date on a resume past midnight and changes the beep's key, so a resume past the lower bound would beep, against 4c.
- **The beep and a reload.** The beep's memory is a ref keyed on `stepId:startedAt`, so it is empty after a reload. A timer that beeped, was stopped, survived a reload and was then resumed past its bound must still stay quiet. Something persisted or derivable has to carry that; yours to choose.
- **Resume should prime the audio, as Start does.** After a reload the audio context is gone until a tap, so a timer resumed before its bound would otherwise reach it silently.
- **The stored timer gains a field.** `parseTimers` validates it like the others (a finite number, not negative); a timer stored before this round has none and reads as never paused. How you treat a bad value is yours, as long as it never blocks the page.
- **Layout.** Resume in Stop's spot; Clear out of reach of a slip off Resume; 48 px targets; nothing appears above the tap; it fits at 375 px; and the card keeps one height from running to stopped, as the Logged tag's own line does now.
- **Per-dough timers** (`bulk-1` to `bulk-3` at `nMix > 1`): each slot resumes on its own. Ticking the step still stops them all.
- **`CLAUDE.md` is yours.** Its timer gotcha says "A stopped timer never beeps and never counts as due" and describes Stop and Clear as the only ways out of a running timer.

**Ideas this round retires, for your phrase test over the app's copy:** that a stopped timer can only be cleared and started again from zero; and that a timer's number is how long the step has been going (it is how long the timer has run). The log card's "If a timer ran on after its phase ended, leave that mix out" stays true.

### Tests I'd expect

The design is yours. These are the behaviours the spec text commits to:

1. Phase C stopped at 3:00, resumed 20 s later and stopped again 1:00 after that: the timer reads 4:00, `phase_seconds.C` is 240, and the tag reads "Logged · 4:00". While it runs again, the tag reads "Logged".
2. Several Stop and Resume cycles add up their pauses.
3. A 45–60 min timer stopped at 40:00 and resumed 5 minutes later turns to the window 50 minutes after it was first started, and is due at that moment, not at 45.
4. A timer past its window resumes, stays past, and doesn't beep. One resumed before its lower bound beeps once on reaching it. One that beeped, was stopped, survived a reload and was resumed past its bound doesn't beep.
5. Unticking a step leaves its stopped timers stopped, every dough's included.
6. A bake whose mix 1 Phase A started before midnight and was resumed after it keeps the earlier date.
7. A resumed timer, running or stopped again, survives a reload with its time.
8. A stored timer from before this round loads as never paused; a bad stored value doesn't throw.

### Done when

On Dave's iPhone: Phase C stopped at 3:00, resumed 20 seconds later and stopped again 1:00 after that logs 4:00 on the log card. A bulk rest stopped at 30:00 and resumed five minutes later carries on from 30:00. A timer past its range resumes without a beep. A double tap on Stop leaves the timer running from where it was. All of it survives a reload.

## 4. Rendered copy

Nothing in §8 changes.

**The Reset confirmation** (§10), Dave's wording:

> **Start a new bake?** This puts the batch settings, the schedule adjustments and today's readings back to their defaults, and clears any DDT override, the timeline's start or target time, the step checkboxes and the timers. Your saved bakes stay.

**The timer card.** The component copy is yours to word under the writing rules; what the spec commits to:

- The stopped card's button in Stop's place reads **Resume**. **Clear** stays as written. The stopped label stays "Stopped".
- The Logged tag reads **Logged** while a resumed timer runs and **Logged · 4:00** (its elapsed time, pause left out) once stopped.
- An exact-duration timer's line keeps its form, "10 min from 2:15 PM", with the time moved later by any pause.

## 5. The gate

On `main` at `3a2977e` with these documents, regenerated: **808 of 809**. The one failure is your own pin, `steps.test.ts` › *§10's Reset copy is reproduced verbatim* › *asks in §10's words*: §10 now carries new copy, as it said it would.

`gate-67.diff` makes it **809 of 809** on my scratch clone, typecheck clean. It does two things:
- **It takes the pin out** and restores the plain check, `expect(`${text[at]} ${text[at + 1]}`).toBe(spec)`, so `tests/steps.test.ts` is back to its text at `4f05a44`. Setting `AHEAD_OF_SPEC` to `null`, as its comment says, passes the tests but fails the typecheck: TypeScript narrows the branch to `never` (`TS2339: Property 'component' does not exist on type 'never'`).
- **It changes `NewBakeReset.tsx`'s copy** to Dave's wording, adding "the schedule adjustments".

Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. §7.5 and §10's prose don't render, and the new figure (0.36) is in §10, which the gate doesn't read. "Resume" has no digit, so the button adds nothing to classify.

## 6. Changes by document

**Spec** (10 edits):
- §6 *Where the inputs are kept*: *After load the two stay in step*, what Reset stores (FINDINGS-67).
- §7.5: *Timers count up*'s first sentence (APP-4).
- §7.5: a new paragraph, *A stopped timer resumes*, after *The logged timers are marked* (APP-4).
- §10 *Capture and saving*: *Reset to defaults* gains the batch settings and the schedule's adjustments (FINDINGS-67).
- §10 *Capture and saving*: *Kept* loses them (FINDINGS-67).
- §10 *Capture and saving*: a ⚠️ after the *Kept* list recording the change (FINDINGS-67).
- §10 *Capture and saving*: the Reset confirmation's copy (FINDINGS-67, Dave's wording).
- §10 *Capture and saving*: the bake's date sentence (APP-4).
- §10 *Capture and saving*: the phase-time bullet's opening (APP-4).
- §10 *Solving a mix*: one sentence after "Pauses aren't normalized." (APP-4)

**Recipe:** unchanged.

## 7. Attachments and hashes

`apply_67.py`, the edit script, run on `main`'s documents at `3a2977e`. It stops unless each old string occurs exactly once. `gate-67.diff`, the test and copy patch from §5.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `ccfa29eac7d40cf3d5cc3c6bcd4174e2de171410fb86dce8b558c54456746473` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
