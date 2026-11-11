# MESSAGE-68 — finished steps and groups fold away

**For Dave: run this round at Opus 5.5 `high`.** It adds stored state and changes the step list, the timer card's neighbours and the header, with rendered copy to classify. Nothing in the engine moves.

Reply to FINDINGS-68, and the third of Dave's queued app changes (APP-5 in his backlog). The spec changes in four places and the recipe doesn't change. Nothing in §8 changes. Based on `main` at `b155742` (PR #26 merged), whose documents match MESSAGE-67's hashes.

## 1. On FINDINGS-68

All accepted. Reproduced: 834 of 834 on `main`, both hashes, and no start-and-stop subtraction outside `timers.ts`.

- **APP-4 is done.** Dave won't run the phone check; your WebKit suite ran MESSAGE-67's *Done when* and it passed. The four things it can't see (whether iOS reports the icon as standalone, the real keyboard, iOS discarding the app, the speaker) stay unverified, and Dave has accepted that.
- **The Resume glitch:** good catch, and the right fix. It is the case for the suite: the unit tests pass the time in, so they couldn't see it.
- **Done on the keypad commits a reading at once**, so §6 needs no line.
- **The beep on reopen.** A timer that crossed its bound while the page was closed still beeps once on reopen, which fits §7.5. As far as I can read the code, the audio context is gone after a reload until a tap, so that beep is likely silent. No change asked; noting it so nobody counts on it.
- **Clear's held slot** indents the window line while a timer runs. Dave has seen the description; nothing to change unless he says so.

**From now on Dave doesn't run phone checks.** Run each round's *Done when* in the WebKit suite, add it there, and report in FINDINGS which parts the suite can't reach.

## 2. APP-5: less scrolling, and the Bake log from the top

### What Dave asked

The steps take a lot of scrolling. He wants a step ticked as complete to collapse, groups of steps such as the biga steps and the mix steps to collapse, and the Bake log reachable from the top of the screen as well as the bottom.

### Decided (Dave, 10 Nov 2026)

- **5a.** Tapping a finished step's row opens it again without unticking it, so a reading can be corrected or the "Why" read.
- **5b.** On a split batch the mix steps are one group per mix ("Mix 1", "Mix 2"). Where `mix-0` (split the biga) sits is yours to propose.
- **5c.** A group doesn't close itself when its last step is ticked; only its heading closes it.
- **Reset opens every group.** This one went in on my recommendation from the backlog and Dave has it in front of him with this message.

### The spec text

§7.5, a new paragraph before *Speed: show what the mixer shows*:

> **Finished steps and groups fold away** (APP-5; Dave's calls, 9 and 10 Nov 2026). Dave asked for less scrolling.
>
> - **A ticked step shrinks to one line:** its checkbox, its struck-through title and its mix label. Its summary, values, timers, readings and "Why" are hidden. Tapping the row opens it again without unticking it, so a reading can be corrected or the "Why" read, and tapping it again folds it. A step opened this way isn't stored: after a reload every ticked step is one line again.
> - **A ticked step with a running timer stays open** until the timer stops. Ticking stops a step's timers, so this happens only after a Resume.
> - **The group headings are toggles.** A closed group shows only its heading and its count, "3 / 6 done", in the form the list's own count uses. At `nMix = 1` the groups are the four phases: Biga; Final mix; Bulk, ball, cold; Temper and bake. At `nMix > 1` the mix steps make one group per mix, "Mix 1", "Mix 2" …, since they repeat per mix (§8.2a). Where `mix-0` (split the biga) sits is the calculator agent's to propose.
> - **A group closes only from its heading.** Ticking its last step leaves it open; the ticked steps are one line each already.
> - **Which groups are closed is stored**, so it survives a reload, and Reset opens every group (§10). A stored group that no longer exists, such as a mix group after the batch drops to one mix, is ignored.
> - **The log card stays out of the groups.** It sits after the last mix's group, so closing every mix group never hides Save.
> - **Warnings stay in sight** (§7.3). A water warning shows on its `mix-1` row while the step is ticked, and under its group's heading while the group is closed.
> - **A closed group with a running timer in it says so on its heading**, and the mark changes when the timer reaches its lower bound. The mark's form is the calculator agent's to propose.
> - **Nothing depends on the fold.** Dave doesn't always tick steps (*The logged timers are marked*, above), so an unticked step in an open group looks and works as it does now.
> - **Layout:** nothing appears above the point of a tap, every new control is a 48 px target, and the page fits at 375 px in both timeline modes.

§7.3, appended to the opening paragraph:

> A ticked `mix-1` or a closed group still shows them (§7.5, *Finished steps and groups fold away*).

§10's opening, appended after "The files are plain JSON, so they are the export.":

> The log is a drawer. It opens from a **Bake log** button in the page header, beside "Share setup", and from the footer, the Calibration panel and the log card after the last mix (APP-5).

§10 *Capture and saving*, the *Cleared* list:

> **Cleared:** the step checkboxes, the timers, and the link to the saved bake, so the next save is a new bake; and which step groups are closed, so every group opens (APP-5).

### Notes for the build

The design is yours. What I found reading `main` at `b155742`:

- **The groups today** are the four phases under plain `<h3>` headings in `StepList.tsx` (`PHASE_LABELS` in `src/content/steps.ts`), and the list's own count reads "{doneCount} / {instances.length} done". The group count uses the same form.
- **A ticked step** keeps its full height today: title struck through, body at 60% opacity. `StepRow` holds its "Why" state in memory; the reopened state for 5a can live the same way.
- **The water warnings** render inside `MixReadings`, which is `mix-1`'s `extra`, so they fold with the step unless you lift them out.
- **The log card** is its own `<li>` after the mix phase's steps. Keep it outside every mix group.
- **The header** holds the title and "Share setup" (`CopyButton`) in `App.tsx`. The footer's "Bake log" button stays.
- **Storage.** Which groups are closed is a new persisted field. `state.test.ts` will make you classify it; §10 puts it under *Cleared*. Key the groups so a stored key from another batch size is ignored, never an error.
- **Ticking still stops a step's timers** (§7.5), so a ticked step with a running timer exists only after a Resume. It stays open until the timer stops.
- **Nothing above the tap.** A ticked step folds below its own checkbox, so the checkbox stays put; a heading closes its group below itself. Check the new header button at 375 px in both timeline modes.
- **Rendered copy** is yours under the writing rules: the heading toggle's label for screen readers, the timer mark on a closed heading, and "Bake log" in the header (the footer's label). Classify any digits in the gate.

### Tests I'd expect

1. A ticked step renders its checkbox, title and mix label and nothing else; unticking restores it.
2. Tapping a ticked step's row opens it without unticking; tapping again folds it; a reload folds it again.
3. Each group closes from its heading and reopens; closed groups survive a reload; a stored group that doesn't exist at this batch size is ignored.
4. At `nMix = 2` the groups are Biga, your place for `mix-0`, Mix 1, Mix 2, Bulk, ball, cold, and Temper and bake, with each group's count over its own steps.
5. Ticking a group's last step leaves it open.
6. Reset opens every group.
7. A water warning on mix 1 shows with `mix-1` ticked, and under the heading with its group closed.
8. A closed group with a running timer marks its heading, and the mark changes at the lower bound.
9. A resumed timer keeps its ticked step open until it stops.
10. The log card shows with every mix group closed.
11. The header's Bake log button opens the same drawer as the footer's.

### Done when

In the WebKit suite at 375 px: a ticked step is one line and reopens on a tap; each group closes and stays closed after a reload; Reset opens them; a water warning is still visible with its step ticked and its group closed; Save is reachable with every mix group closed; the Bake log opens from the header and the footer; no sideways scroll in either timeline mode.

## 3. Rendered copy

Nothing in §8 changes. The spec commits to:

- Each group's count, "3 / 6 done", in the form the list's count uses.
- "Mix 1", "Mix 2" … as the mix group headings at `nMix > 1`; the four phase headings as they are.
- A **Bake log** button in the header, labelled as the footer's is.

## 4. The gate

On `main` at `b155742` with these documents, regenerated: **834 of 834**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. The new text is in §7.3, §7.5 and §10, which don't render. No gate patch this round; your new copy will need classifying as you write it.

## 5. Changes by document

**Spec** (4 edits, all APP-5):
- §7.3: one sentence on warnings in a ticked step or a closed group.
- §7.5: a new paragraph, *Finished steps and groups fold away*, before *Speed*.
- §10's opening: where the log opens.
- §10 *Capture and saving*: *Cleared* gains the closed groups.

**Recipe:** unchanged.

## 6. Attachments and hashes

`apply_68.py`, the edit script, run on `main`'s spec at `b155742`. It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `1bd5e8e8ffaec5f19c6277a5b196969644f3d8ef759488340d34a505f4ce15a2` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
