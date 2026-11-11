# FINDINGS-72 — reply to MESSAGE-71

All seven edits applied and reproduced. Each new sentence was checked against the code. Six describe it as built. One doesn't quite, and the wording that falls short is ours, from FINDINGS-71 §5.2: the deletion rule holds in one order only (§2). Two smaller notes follow (§3). No app code changed. One test was added.

## 1. The documents and the gate

- **Hashes match.** `apply_71.py` reproduces the spec byte for byte (`8af1fa42…`). The recipe is unchanged (`6885f481…`).
- **Where it landed.** `app-6-toppings` was merged into `main` as PR #30 before MESSAGE-71 arrived, so APP-6 merged with MESSAGE-70's spec. `main`'s spec is byte-identical to `aa3b05b`'s (`4e1ba5f3…`), so the script ran on the same text. This round is on a new branch, `message-71`, from `main`.
- **The gate: 893 of 893** with the new spec, as you said, and the typecheck is clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. With the test in §2 the suite is **894 of 894**.
- **The live site** is current through APP-6. The Pages run for PR #30's merge succeeded, and the site serves `index-DvTP7vnP.js`, the name `main` builds. MESSAGE-71 changes nothing in the bundle.

## 2. A deletion against an edit: it depends on which is pushed last

§13.3 now says "a deletion wins over any edit it hasn't seen". That is true when the deleting device pushes after the edit. It is not true the other way round, and I didn't say so in FINDINGS-71.

- **The edit is pushed first, then the deletion.** The laptop edits an idea and syncs. The phone, which hasn't pulled that edit, deletes the idea and syncs. The phone's sync removes the file whatever it holds, so the idea is gone everywhere. This is the sentence's case.
- **The deletion is pushed first, then the edit.** The phone deletes the idea and syncs. The laptop, holding an edit it saved before it saw the deletion, syncs after. The file is gone, so there is nothing to compare `updated` against. The laptop writes its copy, and the idea comes back on every device.

So between a deletion and an edit, the device that syncs last wins, which is the log's rule. Only between two edits does `updated` decide. A new test in `toppings.test.ts` pins both orders against the fake repository.

The second order needs two devices, an offline edit, and a deletion of the same idea in between, so it's rare. Restoring an idea is also the safer failure: nothing typed is lost. I'd keep the behaviour and correct the sentence. Suggested wording for §13.3:

> the copy saved last wins, by `updated`, and on a tie the device syncing keeps its own. A deletion carries no time to compare, so between a deletion and an edit the device that syncs last wins: a deletion removes edits it hasn't seen, and an edit synced after a deletion it hasn't seen brings the idea back. The bake log's own rule (the device pushing last wins) is unchanged.

If you'd rather a deletion always win, the sync has to remember deleted ids in the repository (a tombstone file per idea, or a list). Say if you want that and I'll propose the form.

## 3. Two smaller notes on §13.1

- **Which fields hide the bar.** The parenthetical lists "text, number, a text area or a select". The code hides the bar for any input that takes a value from the keyboard or a picker, and the timeline card's two `datetime-local` fields (the start in forward mode, the bake time in backward mode) are among them. iOS brings up its date picker there, so hiding the bar is right. Suggested: "(text, number, a date and time, a text area or a select)".
- **"The header is the title alone on every tab."** The header has the title and, under it, the formula line (biga share, hydration, then "Grain Craft 00 · Halo Core · Tread"). The sentence meant no buttons, and that's true, but read literally it says there is no subtitle. Suggested: "The header is the title and its formula line on every tab, with no buttons."

## 4. The spec against the code

Each changed sentence, checked:

- **The bar and focus:** `useTypingFocus` in `TabBar.tsx`, from `focusin`/`focusout`, with the page watched for a focused field being removed. It hides with `max-md:hidden`, so the strip at 768 px and up never hides, and a desktop window below 768 px hides the bar until the field is left. See §3 for the field types.
- **The mark:** `recipeTabMark` gives the closed heading's mark over the whole list. The pill is outlined before the lower bound and filled from it, green in the window and amber past it (`MARK_TONES`). It sits on the icon's corner below 768 px and beside the label from 768 px. It has no visible phase words; the tab's `aria-label` carries them ("Recipe, timer in the window").
- **What counts as a link:** `initialTab` opens on Recipe only for a URL whose inputs encode to something other than what is stored, nothing stored included. A home-screen app takes the stored tab.
- **Share setup and the header:** "Share setup" sits on the Recipe tab beside Reset, and the header has no buttons (§3 on its wording).
- **Untested order:** sorted by `created`, newest first; `created` is kept across edits.
- **The rating control:** nine buttons from `RATINGS` and Clear, two rows of five. The lists show stars only, and the label reads "Rated 3.5 of 5".
- **Which copy wins:** `remoteIsNewer` keeps the repository's copy only when its `updated` is later, so a tie keeps this device's. For deletions, see §2.
