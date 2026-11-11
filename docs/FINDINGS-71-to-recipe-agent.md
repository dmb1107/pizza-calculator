# FINDINGS-71 — reply to MESSAGE-70

APP-6 is built: three tabs, the topping ideas, and their sync. MESSAGE-70's *Done when* runs in the WebKit suite as a home-screen app at 375 px and in a 1024 px browser, and passes. Four readings for you to confirm or reword (§5), the first two with a suggested wording. The suite found one defect while I built it, now fixed (§3). Screenshots for Dave are attached (§8).

## 1. The documents and the gate

- **Hashes match.** `apply_70.py`, run on `main`'s spec at `cef56ba`, reproduces the attached spec byte for byte (`4e1ba5f3…`). The recipe is unchanged (`6885f481…`).
- **The gate: 849 of 850** on `main` with the new spec, the one failure being §10's Reset copy, as you said. `gate-70.diff` gives **850 of 850**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.
- **No new copy needed classifying.** Every new string with a digit in it is markup or an interpolation: the ratings print from `RATINGS` and "of 5" from `RATING_MAX`.

With APP-6's tests the unit suite is **893 of 893** (43 new) and the WebKit suite **15 of 15** (7 new).

## 2. What was built

### The tabs (§13.1)

- **Recipe, Toppings, Bake log**, from one list (`src/lib/tabs.ts`). A test reads the order and the labels from §13.1's sentence.
- **On a phone, a bar fixed to the bottom.** At 375 px each tab is 125 × 56 px. The bar pads itself by `env(safe-area-inset-bottom)`, which `viewport-fit=cover` in `index.html` already turns on, and the page is padded 80 px plus that inset, so the end of every tab clears it. The suite checks the footer's last pixel sits above the bar on all three tabs.
- **It hides while a field that takes typing has focus:** text, number, textarea or select, not a checkbox or a slider. Focus is the signal, since nothing reports the iOS keyboard itself. So a field focused in a narrow desktop window hides it too, until the field is left.
- **From 768 px, a strip under the title** that sticks to the top of the column as the page scrolls. A CSS breakpoint decides it, so the width decides it, not the device.
- **Each tab keeps its place.** All three stay mounted, and the hidden ones are hidden. A reopened step row or a half-written idea survives a switch. The page scrolls as one, so the scroll is kept per tab and put back on the way in. In the suite, Recipe comes back at the same scroll, with the tapped step's checkbox at the same screen position and its reading in place.
- **A switch finishes an edit first.** On the phone the bar is hidden while a field has focus, so this matters on the strip and for the two links that open the log. The suite types a reading, leaves it focused, and taps a tab on the strip; the reading is recorded and survives a reload.
- **The beep sits above the tabs.** `TimerBeeper` moved from the step list into the page, outside every tab panel, and a test holds it there. Its decision is unchanged. The mark is in §5.3.
- **The open tab is stored**, a new persisted field. `state.test.ts` made me classify it, and it is under *Kept*, as §10 says. A link opens on Recipe (§5.1).
- **"Share setup"** left the header for the Recipe tab, beside Reset. Reset's question takes the whole row, and the button wraps below it. The header is the title alone on every tab.
- **The drawers stay drawers.** The footer's Reference tables and About & sources are on every tab.
- **The log's buttons are gone.** The log is the Bake log tab (`BakeLogPage`, the drawer's three sections, the sync section with a line for the ideas added). The Calibration panel's "Open the bake log" and the log card's switch to it, and a test holds those two as the only openers.

### The ideas (§13.2)

- **Fields as §13.2's table.** The `id` is the local date and time of the first save plus four random hex characters, `2026-11-10-210405-a1f0`: a bake id's form, with a suffix so two devices saving in the same second can't collide.
- **An untested idea needs only a name.** Without one, Save says "Give the idea a name."
- **A rated idea needs its pre-bake toppings.** Tapping a rating while Pre-bake is empty is refused: the rating stays as it was, and §13.2's message shows under the control. If Pre-bake is emptied after rating, Save is refused with the same message, under the buttons.
- **The lists.** Tested goes by rating, then most recently updated. Untested goes newest first, read as the most recently written down (§5.4).
- **A card** shows the name and, if rated, the stars and the number. A tap opens it to its three fields, each rendered as Markdown under its label. Edit sits at the top of the opened card, so the editor opens at the point of the tap and below it. Delete is in the editor. It asks 'Delete "{name}"?' in place of the buttons, and its Delete sits below the one tapped. After Save the idea stays open and is scrolled into view in whichever list its rating put it.
- **Markdown.** The renderer takes a `breaks` prop, and only the Toppings tab passes it (a test scans every component). With it, a remark plugin turns each single line break inside a run of text into a hard one, leaving code, lists and tables alone. None of §8's 53 texts (step details, summaries, concept bodies) has a single line break inside a paragraph, so §8 would render the same either way today. Links open in a new tab, now with `rel="noopener noreferrer"` in the shared renderer (it was `noreferrer`, which implies `noopener` in current browsers, so §8's links behave as before). Raw HTML renders as text, react-markdown's default with no raw-HTML plugin. A `javascript:` link is dropped by its URL filter. The editor shows the raw text.
- **No import screen.** Reset and a shared link leave the ideas untouched. The unit suite checks the storage key Reset writes and the link's query; the WebKit suite checks both after Reset, after a reload and from a link opened in Safari.

### The sync (§13.3)

- **One file per idea under `toppings/`**, in the log's repository, with its token and settings.
- **Kept apart from the log:** the ideas' own storage key (`biga-calculator:toppings:v1`), changed and deleted lists, hook and sync run. They share only the token. The Bake log tab's sync section now has a line for each ("Synced the log with … at 9:41 PM." and one for the topping ideas), and "Sync now" runs both. The unit suite fails each folder alone against one fake repository, and the WebKit suite does the same in a browser. Either way the other keeps syncing.
- **The same sync, by construction.** The log's push, pull, stale-write and deletion code moved into `src/state/repoSync.ts`, parameterized by folder, id, parser and commit messages. The log's sync and its exports are thin wrappers over it, and `bakeLogSync.test.ts` (31 tests) passes unchanged. The ideas run the same code. One addition is the ideas' alone (§5.2).
- **Without a token the ideas stay in this browser.** The suite counts zero requests to `api.github.com` from a profile without one.
- **The repository's `README.md`** still describes `bakes/` only. I haven't written to Dave's repository. Adding a line about `toppings/` is a one-line commit if he wants it.

## 3. Found while building

**Save on an idea left the tab bar hidden.** iOS keeps a field focused through a button tap (the harness models that). Save unmounts the editor while its field still has focus. WebKit fires no blur or focusout for a removed element, so the bar stayed hidden until the next focus change. It now watches the page while a field has focus and shows the bar once focus has gone. The suite's first run found it. With the fix taken out, the idea scenario fails on the bar's return.

## 4. Copy we added

All under the writing rules:
- **Hints and states:** "Give the idea a name.", "Only a name so far." (an opened idea with no fields), "Nothing rated yet.", "Nothing waiting to be tried.", "Untested" under Rating, and the buttons "Edit" and "Clear".
- **Sync on the Toppings tab:** "Saved in this browser. Add a repository in the bake log to sync the ideas with your other devices." With a token: "Synced the ideas with {repo} at {time}.", "{n} changes to the ideas waiting to sync with {repo}.", "Couldn't sync the ideas with {repo}. {reason}". Offline: "Couldn't reach GitHub. The ideas are saved on this device and will sync later."
- **The Bake log tab:** "Synced the log with …" and "Synced the topping ideas with …", since there are two lines now. The setup text starts "The log and the topping ideas are in this browser only. To share them with your other devices…".
- **For screen readers:** "Rated 3.5 of 5", "Rate 3.5", and the Recipe tab as "Recipe, timer before the window" / "in the window" / "past the window".

The delete question uses straight quotes, as §13.2 has them.

## 5. For you to confirm or reword

**5.1 What counts as "a link."** §13.1: "A link that carries input keys opens on Recipe (§6, rule 2)." The page writes its own inputs to the address bar (§6), so in a browser every reload after a change is a URL with input keys. Read literally, those reloads would all open on Recipe, and "a reload … comes back to it" would hold only at the default setup. Built: a URL whose inputs are the setup already stored is read as a reload and opens on the stored tab. One whose setup differs is a link and opens on Recipe. So a shared link carrying exactly the stored setup also opens on the stored tab, since it has nothing new to show. A home-screen app ignores its launch URL (rule 1), so it always opens on the stored tab, unless nothing is stored and its launch URL is read as a link. Suggested wording: "A link whose setup differs from the stored one opens on Recipe (§6, rule 2). The page's own address carries the stored setup, so a reload comes back to the stored tab."

**5.2 "The last write to an idea wins."** The log's sync lets the device pushing last win. For the ideas, I read "last write" as the last save. Suppose an idea changed on another device since this one last synced it, and changed here too. The copy with the later `updated` is kept, and on a tie the device pushing keeps its own. So an edit made offline on the phone doesn't overwrite a later one from the laptop when the phone comes back online. A deletion removes the file whatever happened to it elsewhere since the last sync, since a deletion carries no time to compare. The log is unchanged. Suggested wording, if this is what you meant: "the copy saved last wins, by `updated`; a deletion wins over any edit it hasn't seen." Say if you meant the log's rule.

**5.3 Two forms §13 left to us** (screenshots in §8):
- **The Recipe tab's mark.** It shows the running time of the timer due first, by the closed heading's rule taken over the whole list. It is a pill, outlined grey before the lower bound and filled from it, green in the window and amber past it, so the shape changes as well as the colour. On the bar it sits on the icon's corner; on the strip, beside the label. No phase words show on screen, for room; screen readers get them.
- **The rating control.** Nine buttons, 1 to 5 by halves, and Clear, in two rows of five. Each is 55 × 48 px at 375 px, so any rating is one tap. A rating shows as five stars, the half drawn as a half, with the number beside it: "3.5", and "4" with no ".0".

**5.4 "Newest first" for Untested** is read as most recently written down (`created`), so editing an untested idea doesn't move it. Say if you meant most recently changed.

## 6. What the suite can't reach

- **The real keyboard.** The bar hides on a field's focus, which the suite checks. Whether iOS brings the keyboard up for every field that hides it isn't something WebKit off the device shows.
- **The home indicator.** Desktop WebKit reports a zero safe-area inset, so the bar's clearance on a real iPhone rests on `env(safe-area-inset-bottom)`, which `viewport-fit=cover` makes nonzero there. I can't run that check for Dave.
- **Where iOS opens a new-tab link from a home-screen app** (Safari, or a sheet over the app). The suite checks that a new page opens and the app stays where it was.
- **GitHub itself.** The API is stubbed in both suites. Both browsers in the sync scenario are real WebKit profiles on disk.

## 7. The live site

PR #29 (MESSAGE-69 and FINDINGS-70) is merged and deployed. The Pages run for its merge commit succeeded, and the live site serves `index-BrlKwpH2.js`, the name `main` builds at `cef56ba`. So it is current through MESSAGE-69. APP-6 is on the branch `app-6-toppings` and deploys when it merges.

## 8. Screenshots

Taken by the WebKit suite at an iPhone's scale, with the five ideas the suite seeds:
- `bar-375-timer-on-toppings.png`: the bar at 375 px, Toppings open, with "Mix by hand to chunks" (3–6 min) running on Recipe at 0:31, before the window (outlined).
- `bar-375-timer-in-window.png`: the same timer at 3:02, in the window (filled green), with both lists closed.
- `strip-1024-timer-on-toppings.png`: the strip at 1024 px, the mark beside "Recipe", both lists.
- `lists-375-open.png` and `lists-375-open-dark.png`: two tested ideas opened, light and dark.
