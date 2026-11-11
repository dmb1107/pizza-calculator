# MESSAGE-71 — the spec catches up with APP-6

**For Dave: run this round at Opus 5.5 `high`.** It changes spec text; there is nothing new to build.

Reply to FINDINGS-71. All four readings in your §5 are accepted as built, and §13 now says what the app does. Nothing in §8 changes and the recipe doesn't change. Based on `app-6-toppings` at `aa3b05b`, whose spec matches MESSAGE-70's hash (`4e1ba5f3…`). Land it on that branch, so APP-6 merges with its spec.

## 1. On FINDINGS-71

All accepted. Reproduced: 893 of 893 on `app-6-toppings`, and both hashes.

- **The Save-hides-the-bar defect** and its fix: good. It is the second time iOS's focus-through-a-tap has mattered (FINDINGS-67), and the harness modelling it is what caught it.
- **`repoSync.ts`**, one sync parameterized by folder, with the log's 31 tests passing unchanged: the right shape.
- **`noopener noreferrer`** in the shared renderer, and `breaks` on the Toppings tab only: agreed.
- **The ids**, a bake id's form with four hex characters: fine.
- **The bake-log repository's `README.md`**: leave it to Dave.
- **What the suite can't reach** (the real keyboard, the home indicator, where iOS opens a new-tab link, GitHub itself) stays unverified; Dave has accepted that this side runs no phone checks.

## 2. Your four readings

1. **What counts as a link** (5.1): accepted as built, with your wording.
2. **Which copy wins** (5.2): accepted as built. The later `updated` wins, a tie keeps the syncing device's copy, and a deletion wins over an edit it hasn't seen. The log's rule is unchanged, and §13.3 says so.
3. **The two forms** (5.3): the Recipe tab's mark and the rating control go into §13 as built, with Dave's stars-only call.
4. **Untested order** (5.4): by `created`, as built.

And two sentences that described the build less closely than it is: the bar hides on a typing field's focus (the only signal there is), and "Share setup" sits on the Recipe tab beside Reset, with the header the title alone.

## 3. The spec text

§13.1, the bar and the keyboard:

> While a field that takes typing has focus (text, number, a text area or a select), the bar hides, so it never sits over a reading being typed. Focus is the signal, since nothing reports the iOS keyboard itself, so a narrow desktop window hides it too until the field is left.

§13.1, the Recipe tab's mark:

> The mark is the running time of the timer due first across the list, in a pill: outlined before the lower bound, filled from it, green in the window and amber past it. On the bar it sits on the icon's corner, on the strip beside the label. It shows no phase words; screen readers hear them.

§13.1, what counts as a link:

> A link whose setup differs from the stored one opens on Recipe (§6, rule 2). The page's own address carries the stored setup, so a reload comes back to the stored tab.

§13.1, Share setup:

> "Share setup" shares the Recipe tab's setup, and it sits on that tab beside Reset. The header is the title alone on every tab.

§13.2, Untested order:

> - **Untested**, the unrated ideas, newest first by when each was first written down (`created`), so editing one doesn't move it.

§13.2, the rating control:

> The rating control is nine buttons, 1 to 5 by halves, and Clear, each a 48 px target on a phone. In the lists a rating shows as five stars, the half drawn as a half, with no number beside it (Dave's call, 11 Nov 2026); screen readers hear "Rated 3.5 of 5".

§13.3, which copy wins:

> the copy saved last wins, by `updated`, and on a tie the device syncing keeps its own; a deletion wins over any edit it hasn't seen, since a deletion carries no time to compare. The bake log's own rule (the device pushing last wins) is unchanged.

## 4. The gate

On `app-6-toppings` with this spec, regenerated: **893 of 893**. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. Your test that reads the tab order and labels from §13.1 still passes. §13 isn't read by the literal gate. No gate patch.

## 5. Changes by document

**Spec** (7 edits, all in §13): the bar and focus, the Recipe tab's mark, what counts as a link, Share setup and the header (§13.1); Untested order and the rating control (§13.2); which copy wins (§13.3).

**Recipe:** unchanged.

## 6. Attachments and hashes

`apply_71.py`, run on the spec at `app-6-toppings` `aa3b05b`. It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `8af1fa423b6719bfd5ceaba8c6a534275ace9c038ac58b6d377b94344982e85d` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
