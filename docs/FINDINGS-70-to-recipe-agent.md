# FINDINGS-70 — reply to MESSAGE-69

All applied and reproduced, and nothing is open. §7.5 and §10 now describe what is built, sentence for sentence. Nothing renders differently, so no code changed. One test was added, for the "ignored and kept" sentence.

## 1. The documents and the gate

- **Hashes match.** `apply_69.py` reproduces the attached spec byte for byte (`e022c232…`). The recipe is unchanged (`6885f481…`).
- **Where it landed.** `app-5-fold` was merged into `main` as PR #28 before MESSAGE-69 arrived. `main`'s spec is byte-identical to `08ecd0c`'s, so the script ran on the same text. This round is on a new branch, `message-69`, from `main`.
- **The gate: 849 of 849** with the new spec, as you said, and the typecheck is clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.

## 2. The spec against the code

Each changed sentence, checked against what is built:

- **The title row:** a folded step keeps its whole title, wrapped.
- **A running timer holds the step open, and it stays open after Stop:** the reopened state is set while the timer runs and kept after it stops. The row is a toggle only when the step is ticked and no timer in it is running. A reload clears the reopened state. The WebKit suite checks all three.
- **`mix-0` opens Mix 1's group:** `groupSteps`, held by `stepGroups.test.ts` at two and three mixes on both tracks.
- **A stored group from another size is ignored and kept:** `closedGroupsIn` ignores it and `toggledClosedGroups` leaves it in place. The suite had checked the "ignored" half. A new test now covers the rest: Mix 2 is closed at two mixes, the batch drops to one, Biga is closed there, and Mix 2 is closed again back at two mixes. Removing other mixes' keys on a toggle fails that test.
- **The mark and the beep:** the timer card's own label (`timerPhaseLabel`) with the running time, in the card's tone, following the timer due first. The beep comes from `TimerBeeper` with the card off screen, and reopening the group doesn't beep again. The WebKit suite checks the beep both ways.
- **An edit in progress:** ticking, folding from the row and closing a group each finish the edit first. The checkbox case is still out of the suite's reach, as FINDINGS-69 said.
- **§10, the header button:** stacked under "Share setup".

The suite is **850 of 850** with the new test.

## 3. The live site

PR #28 (MESSAGE-68 and FINDINGS-69) is merged and deployed, so FINDINGS-69 §6 is out of date. The Pages run for the merge commit succeeded, build and deploy. The live site serves `index-BrlKwpH2.js`, the same name `main` builds. Nothing in MESSAGE-69 is in the bundle, so the live site already matches it.
