# FINDINGS-69 — reply to MESSAGE-68

APP-5 is built: ticked steps and groups fold, and the Bake log opens from the header. MESSAGE-68's *Done when* runs in the WebKit suite at 375 px and passes. Four things I'd like your view on (§5): where `mix-0` sits, a ticked step that stays open after its timer stops, the closed heading's timer mark, and long titles on a folded step. One defect turned up while building: the beep lived in the timer card, so a closed group would have silenced it. It is fixed (§2).

## 1. The documents and the gate

- **Hashes match.** `apply_68.py`, run on `main`'s spec at `b155742`, reproduces the attached spec byte for byte (`1bd5e8e8…`). The recipe is unchanged (`6885f481…`).
- **On `main` with the new spec: 834 of 834**, typecheck clean, as you said. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.
- **The gate needed no new classification.** Every new string with a digit in it is an interpolation. It did flag one string, a step id (`'mix-1'`) in a filter inside the list. The rule behind it belongs in `src/lib` anyway, so it moved there (`prepMixesIn`), and nothing was classified.

With APP-5's tests the suite is **849 of 849**, and the WebKit suite is 8 of 8.

## 2. APP-5: what was built

**The groups** come from `groupSteps` in `src/lib/stepGroups.ts`.
- At one mix they are the four phases under §8.2's phase labels.
- At `nMix > 1` the mix phase becomes "Mix 1", "Mix 2" …, and **`mix-0` opens Mix 1** (§5.1). At two mixes the groups hold 6, 9, 7, 4 and 2 steps on the retarded track, and 4, 9, 7, 4 and 2 on the classic. Mix 1 has two more steps than Mix 2: `mix-0`, and the changeover, which is suppressed after the last mix.
- The stored keys are `biga`, `mix`, `bulk`, `bake`, and `mix#1`, `mix#2` … at a split batch. A key names the same group at every size where it exists, so Mix 1 closed at two mixes is still closed at three.
- **A stored key that names no group at this size is ignored, not removed.** So Mix 2 closed at two mixes is ignored at one mix, and is closed again if the batch goes back to two. Removing it would make the outcome depend on whether a heading was tapped in between. Say if you'd rather it were dropped.

**The heading** is a 48 px button holding a chevron, the label and "3 / 6 done", in the list count's form.
- For screen readers it reads "Biga, 3 of 6 done", plus the timer's phase while the group is closed with a timer running (below), and it carries `aria-expanded`.
- Closing a group removes what is below the heading, and opening adds it below, so nothing moves above the tap.

**A ticked step** shows its checkbox, its struck title and its mix label. At 375 px that row is 62 px tall, against 478 px open for `biga-3` ("Mix by hand to chunks"), 516 for Phase C and 936 for `mix-1` with its readings.
- Its title row is a 48 px button. A tap opens the step without unticking it, and another folds it.
- The opened state is in memory, as the "Why" is, so a reload folds every ticked step again.
- **The checkbox doesn't move when the step folds.** In the suite its page and screen positions are the same before and after the tick.

At the default batch (6 balls, 375 px) the page is 12,932 px tall with every step open, 6,152 with every step ticked, and 4,794 with every group closed.

**Warnings.** A folded `mix-1` shows its mix's water warnings under its title. A closed group shows the warnings of each mix whose prep step it holds, under its heading. At a split batch that is Mix N's group for mix N.

**The log card** sits after the last mix's group and outside it, so Save stays visible with every mix group closed.

**Storage.** `closedGroups` is a new persisted field. `state.test.ts` made me classify it, and it is under *Cleared*, as §10 now says: Reset opens every group. Unreadable stored values come back as an empty list.

**The header.** "Bake log" sits under "Share setup", the same size and style. In a row beside it, the two buttons would leave the title about a third of a 375 px phone. Both are 48 px tall and 105 px wide, and the header is 140 px tall. The footer's button stays.

**A reading being typed is recorded before anything folds.** Ticking a step, folding it from its row and closing a group all finish the edit first, as Reset does (FINDINGS-67). Without that, a step or group folding away would unmount the field mid-edit, and iOS keeps a field focused through a tap. The suite checks the row and the heading. The checkbox is in §4.

**The beep moved out of the card.** Each timer card used to beep for itself, so it could beep only while on screen.
- With the fold, a timer in a closed group would have crossed its bound in silence.
- Reopening the group would then have remounted the card with an empty memory, and it would have beeped late.

One beeper now stays mounted with the list (`TimerBeeper`). It makes the same decision as before (`beepDecision`), for every timer the list renders at this size. A stored timer from another size still stays quiet, as it did when it had no card. One small change: two timers that cross on the same one-second tick make one beep rather than two at once. The APP-4 checks in the suite pass unchanged.

## 3. Rendered copy we added

All of it under the writing rules. It carries no typed figure:
- **"Bake log"** in the header, the footer's label.
- **The headings:** the four phase labels as they are, and "Mix 1", "Mix 2" … at a split batch. The counts read "3 / 6 done", and "Biga, 3 of 6 done" for screen readers.
- **The timer mark** on a closed heading: "Timer · Before the window · 12:04", then "Timer · In the window · 30:00", then "Timer · Past the window · 45:10". An exact timer reads "Running", then "Time's up". These are the timer card's own labels from one function, `timerPhaseLabel`, so the two can't drift. Nothing says "ready" (§7.5). The pill takes the card's tone: grey before the window, green in it, amber past it.

## 4. Tests

**`tests/stepGroups.test.ts`** (15 tests), against your list:
- **Test 4:** the groups at one and two mixes. At two mixes they are Biga, Mix 1 (with `mix-0` first), Mix 2, Bulk, ball, cold, and Temper and bake, with each group's count over its own steps. At three mixes the same on both tracks. Every instance is in exactly one group, in list order.
- **Test 3:** closing and reopening, and stored keys from another size ignored.
- **Test 5 and part of 6:** ticking a group's last step changes its count and nothing else. Reset's classification is in `state.test.ts`.
- **Tests 8 and 9:** the mark at the lower and upper bound; the timer that comes due first; per-dough timers; nothing from a stopped timer or another group. A running timer holds a ticked step open, which can happen only after a Resume.
- **Test 10:** the log card's place after the last mix group.

Each rule was broken once and the suite failed each time: `mix-0` left out of Mix 1, unknown keys not ignored, a running timer not holding the step open, a stopped timer marking, the latest-due timer marking, and the key form changed.

**`e2e/fold.spec.ts`** (4 scenarios, WebKit as a home-screen app at 375 px):
- **MESSAGE-68's *Done when*:**
  - A ticked step is one line and reopens on a tap.
  - Each group closes, and stays closed after a reload and a force close.
  - Reset opens every group.
  - A water warning shows with `mix-1` ticked and with its group closed.
  - Save is reachable with every mix group closed.
  - The Bake log opens from the header and from the footer.
  - No sideways scroll in either timeline mode, with the groups open and closed.
  - That covers your tests 1, 2, 5, 6, 7, 10 and 11.
- **A split batch:** the five headings and their counts at 12 balls, `mix-0` first in Mix 1, and Save with both mix groups closed.
- **A running timer in a closed group (tests 8 and 9):**
  - The mark turns at 3:00 on Phase A, and the beep comes with the card out of sight.
  - Reopening the group doesn't beep again.
  - A ticked step that is resumed stays open while its timer runs, a reload included.
  - It stays open after Stop, and folds on the next reload.
- **A reading being typed** is recorded when its step is ticked, when it is folded from its row, and when its group closes.

Each scenario was confirmed by putting its bug back: the beep only for open groups, as the card-local beep behaved; folding at Stop; closed groups not read back; no warning under a closed heading; no warning on a folded `mix-1`; the log card closing with its group; and closing a group or folding a row without finishing the edit. Each one failed.

**What the suite can't reach:**
- **Whether iOS keeps a field focused through a tap on a checkbox.** The harness models it for buttons only, from Dave's phone (FINDINGS-67). On a checkbox, desktop WebKit moves focus and commits the edit itself, so removing the commit before a tick doesn't fail the suite. The commit is in place either way.
- How the fold feels under a thumb while scrolling.
- The speaker, as before.

## 5. For you

1. **Where `mix-0` sits: at the head of Mix 1.** It is the first thing done at the bench on mix day, just before mix 1's prep, so it belongs in the group the baker is working in. In the Biga group it would close with the biga steps, which on the retarded track are done by the evening before (apart from the temper). The baker who closes Biga would then hide the next step to do. Its own group would be a heading for one step. If you agree, §7.5's sentence could read: "`mix-0` (split the biga) opens Mix 1's group."
2. **A ticked step stays open after its timer stops.** §7.5 says a ticked step with a running timer "stays open until the timer stops". Built that way, it folds on the tap of Stop. Everything below it then moves up, and a second tap lands on whatever has moved under the finger. Stop and Resume share a spot so that a double tap is safe (APP-4). So the step stays open when its timer stops, as if the baker had opened it, and folds from its row or on a reload. While the timer runs, the row isn't a toggle. Possible wording: "A ticked step with a running timer stays open, and stays open once the timer stops, until its row is tapped or the page reloads."
3. **The mark's form**, if you want it in §7.5: "the timer card's phase label and its running time, 'Timer · In the window · 30:00', in the card's tone; the timer that comes due first when the group holds more than one."
4. **"One line" with a long title.** A folded step shows its whole title, and at 375 px a long one wraps. "Start the yeast, break up the flour" takes two lines, a 90 px row against 62 px. A one-line cut would truncate it, and at a split batch it would cut off the mix label, which tells Mix 1's step from Mix 2's. I kept the whole title. If that's right, "shrinks to its title row" would match what's built.

## 6. The live site

The live site is current through MESSAGE-67 (PR #27). It serves `index-bi2G1eTO.js`, the same name `main` builds, and the last three Pages runs succeeded. This round is on the branch `app-5-fold` and isn't deployed.
