# MESSAGE-69 — the spec catches up with APP-5

**For Dave: run this round at Opus 5.5 `high`.** It changes spec text; there is nothing new to build.

Reply to FINDINGS-69. All four of your questions are answered yes, two of them by Dave, and §7.5 and §10 now describe what you built. Nothing in §8 changes and the recipe doesn't change. Based on `app-5-fold` at `08ecd0c`, whose spec matches MESSAGE-68's hash (`1bd5e8e8…`). Land it on that branch, so APP-5 merges with its spec.

## 1. On FINDINGS-69

All accepted. Reproduced: 849 of 849 on `app-5-fold`, and both hashes.

- **The beep moving out of the card** was the right fix, and §7.5 now commits to it: a timer in a closed group beeps when it reaches its lower bound, and reopening the group doesn't beep again. One beep for two timers crossing on the same tick is fine.
- **`prepMixesIn` in `src/lib`** rather than a classified step id: agreed.
- **Stored keys from another size are ignored and kept.** Agreed; §7.5 says so.
- **Finishing an edit before anything folds** is now in §7.5, beside Reset's. The checkbox case the suite can't reach stays as you left it, with the commit in place.

## 2. Your four questions

1. **`mix-0` opens Mix 1's group.** Your reason goes in with it.
2. **A ticked step stays open after its timer stops** (Dave's call). It folds from its row or on a reload, and the row isn't a toggle while the timer runs.
3. **The mark's form** goes into §7.5 as you wrote it, with the first-due rule.
4. **A folded step shows its whole title row**, wrapping when it's long. §7.5 says "shrinks to its title row".

**And the header** (Dave's call): "Bake log" stays stacked under "Share setup", so the title keeps its width. §10's opening said "beside"; it now says "under".

## 3. The spec text

§7.5, *Finished steps and groups fold away*, in the bullets it changes:

> - **A ticked step shrinks to its title row:** its checkbox, its struck-through title and its mix label. A long title wraps rather than being cut, since at a split batch the mix label tells one mix's step from the other's.

> - **A ticked step with a running timer stays open, and stays open once the timer stops**, until its row is tapped or the page reloads; while the timer runs, the row isn't a toggle. Ticking stops a step's timers, so this happens only after a Resume. Folding at Stop would pull everything below up under the finger, and a second tap would land on whatever moved there (Dave's call, 10 Nov 2026, FINDINGS-69).

In the groups bullet:

> `mix-0` (split the biga) opens Mix 1's group: it is the first thing done at the bench on mix day, and in the Biga group it would close with steps finished the evening before.

In the storage bullet:

> A stored group that doesn't exist at this batch size, such as a mix group after the batch drops to one mix, is ignored and kept, so it applies again if the batch goes back to that size.

> - **A closed group with a running timer in it says so on its heading**, with the timer card's own phase label and running time, such as "Timer · In the window · 30:00", in the card's tone. When the group holds more than one running timer, the mark follows the one that comes due first. The beep doesn't depend on the card being on screen: a timer in a closed group beeps when it reaches its lower bound, and reopening the group doesn't beep again.

A new bullet before *Nothing depends on the fold*:

> - **A reading being typed is recorded before anything folds.** Ticking a step, folding it from its row and closing a group each finish an edit in progress first, as Reset does, since iOS keeps a field focused through a tap.

§10's opening:

> The log is a drawer. It opens from a **Bake log** button in the page header, under "Share setup" so the title keeps its width (Dave's call, FINDINGS-69), and from the footer, the Calibration panel and the log card after the last mix (APP-5).

## 4. The gate

On `app-5-fold` with this spec, regenerated: **849 of 849**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. The text is in §7.5 and §10, which don't render. "30:00" sits in §7.5, which the gate doesn't read. No gate patch.

## 5. Changes by document

**Spec** (7 edits): six in §7.5's *Finished steps and groups fold away* (the title row, a running timer holding a step open, `mix-0`'s place, stored groups from another size, the closed heading's mark and the beep, an edit in progress), and §10's opening (the header button under "Share setup").

**Recipe:** unchanged.

## 6. Attachments and hashes

`apply_69.py`, run on the spec at `app-5-fold` `08ecd0c`. It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `e022c23273d0bbc07c3289b3b5bf18bd21edfa9f808a025d0c5cdae5af1ac6e0` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
