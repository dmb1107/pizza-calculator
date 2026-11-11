# MESSAGE-70 — three tabs, and the topping ideas

**For Dave: run this round at Opus 5.5 `xhigh`.** It adds a subsystem (the topping ideas and their sync) and restructures the page into tabs.

Reply to FINDINGS-70, and the fourth of Dave's queued app changes (APP-6 in his backlog). The spec gains a new section, §13, and changes in seven other places; the recipe doesn't change. Nothing in §8 changes, and no engine, formula, step content or FF moves. Based on `main` at `cef56ba` (PR #29 merged), whose spec matches MESSAGE-69's hash (`e022c232…`).

## 1. On FINDINGS-70

All accepted, nothing open. Reproduced: 850 of 850 on `message-69` before it merged, and the spec's hash. The "ignored and kept" test is the right addition.

## 2. APP-6: what Dave asked

He keeps each topping idea in Apple Notes and wants them in the app, synced like the bake log: pre-bake toppings, post-bake toppings (sometimes none), notes (sometimes none) and a rating from 1 to 5 in half stars. Rated ideas sorted best first, and a separate list for untested ones. And on a phone he wants to switch between the recipe, the toppings and the bake log from a proper menu, not one more button like the log's.

### Decided (Dave)

- **6a (9 Nov).** Every idea has a required name.
- **6b (9 Nov).** An idea with no rating is untested; rating it moves it to the tested list. No separate switch.
- **6c (10 Nov).** An untested idea needs only a name. A rated idea needs its pre-bake toppings.
- **6d (10 Nov).** Three tabs: Recipe, Toppings, Bake log. On a phone a bar fixed to the bottom (he chose it over a segmented control at the top, from drawn mockups); from 768 px wide the same tabs as a strip at the top of the column that stays in view. The log's drawer and its header and footer buttons go.
- **6e (10 Nov).** No import screen. He pastes his existing ideas in himself.
- **6f (10 Nov).** The text fields are Markdown, so they can carry links.

## 3. The spec text

**§13, *Tabs, and the topping ideas*, is new and is in the attached spec in full.** It has three parts: 13.1 the tabs, 13.2 the ideas (fields, the two lists, Markdown, rendered copy), 13.3 storage and sync. It is appended after §12, so no section is renumbered and nothing a parser keys on moves.

§1, appended to the second paragraph:

> It also keeps the bake log (§10) and Dave's topping ideas (§13), each on its own tab.

§2, appended to the bake log bullet:

> The topping ideas (§13) sync the same way, one file per idea under `toppings/` in the same repository.

§6 *Where the inputs are kept*, what a shared link carries:

> a shared link carries no log, no token, no topping ideas and none of the session's ticks, timers or saved-bake id;

§10's opening, the last sentences:

> The log is the Bake log tab (§13.1), and the Calibration panel and the log card after the last mix open it. ⚠️ Until MESSAGE-70 it was a drawer, opened from buttons in the header and the footer.

§10 *Capture and saving*, *Kept*:

> - **Kept:** which end of the timeline is held, which panels are open, which tab is open (§13.1), this device's sync settings, saved bakes, and the topping ideas (§13).

§10, the Reset confirmation's last sentence:

> the step checkboxes and the timers. Your saved bakes and topping ideas stay.

§12, a new build step:

> 11. The tabs (§13.1), then the topping ideas: their lists and editor first, the sync second (§13.2, §13.3).

## 4. Rendered copy

**Rendered copy** (the calculator agent words the rest under the writing rules):
- The tab: **Toppings**. The lists: **Tested** and **Untested**.
- Fields: **Name**, **Pre-bake**, **Post-bake**, **Notes**, **Rating**.
- Buttons: **Add idea**, **Save**, **Delete**, **Cancel**.
- Delete asks: **Delete "{name}"?** with **Delete** and **Cancel**.
- Rating an idea with no pre-bake toppings: **Add the pre-bake toppings before rating it.**

And the Reset confirmation now ends "Your saved bakes and topping ideas stay."

The tab labels are **Recipe**, **Toppings** and **Bake log**. The Recipe tab's timer mark, the rating control and any other copy are yours under the writing rules.

## 5. Notes for the build

The design is yours. What I'd watch, from `main` at `cef56ba`:

- **The beep has to leave the step list.** FINDINGS-69 mounted `TimerBeeper` with the list, so it stays mounted while groups close. On another tab the list may not be on screen at all. Mount it above the tabs.
- **Each tab keeps its place, readings included.** Whether Recipe stays mounted while hidden or restores its scroll is yours, but a reading being typed must be recorded before the tab changes, as the fold does, and Recipe must come back on the step it left.
- **The log's drawer becomes the tab.** `openLog` has four callers today: the header and footer buttons (both go), the Calibration panel and the log card (both switch to the tab).
- **The open tab is a new persisted field.** `state.test.ts` will make you classify it; §10 puts it under *Kept*. A link with input keys opens on Recipe; a bare URL and a home-screen app open on the stored tab.
- **The ideas get their own store**, beside `bakeLogStore`, with their own storage key and their own changed and deleted lists, so one sync failing never holds up the other. `githubSync.ts` reads and writes `bakes/`; the ideas use `toppings/` in the same repository with the same token. The repository is `dmb1107/pizza-bake-log`, whose `README.md` describes `bakes/` only; adding a line about `toppings/` there is fine if you want it.
- **Line breaks.** Standard Markdown joins single lines, and Dave's notes will be pasted with them. §13.2 keeps a single line break in the three topping fields. Don't change how the shared renderer treats §8's prose: steps and concepts must render exactly as now.
- **Links** open in a new tab (`rel="noopener noreferrer"`), and raw HTML stays off, as the renderer's default has it.
- **The keyboard and the bar.** The bottom bar hides while a field has focus and the on-screen keyboard is up. How you detect that is yours.
- **Splitting the work.** §12's step 11 orders it: tabs, then the lists and editor, then the sync. One PR or several is your call; Dave merges each.

## 6. Tests I'd expect

1. The tabs: three, in order, the open one stored and restored on reload; a link with input keys opens on Recipe; Reset keeps the tab.
2. Recipe keeps its scroll and its readings across a tab switch; an edit in progress is recorded first.
3. A timer started on Recipe beeps at its lower bound with Toppings open, and the Recipe tab's mark changes there.
4. The Calibration panel's and the log card's links open the Bake log tab; nothing else opens the log.
5. An idea with only a name saves and lists under Untested; rating it without pre-bake toppings is refused with §13.2's message; rated, it moves to Tested.
6. Tested sorts by rating, ties by most recently updated; Untested by newest first. A 3.5 stays 3.5 after a reload. Clearing the rating moves it back.
7. Markdown: a link renders and opens in a new tab; single line breaks are kept; raw HTML isn't rendered; §8 prose renders as before.
8. Delete asks, and a deleted idea is removed from the repository on sync.
9. Sync: an idea added in one browser profile appears in another after a sync; the last write to an idea wins; a failing toppings sync leaves the bake log syncing, and the reverse. Without a token the ideas stay local.
10. Reset and a shared link leave the ideas untouched.

## 7. Done when

In the WebKit suite, as a home-screen app at 375 px and in a desktop-width browser:
- the tab bar sits at the bottom on the phone and the strip at the top on desktop, with no sideways scroll at 375 px;
- switching tabs mid-mix returns to the same step with its readings;
- a running timer beeps with Toppings open;
- an idea added with only a name sits under Untested, rating it 3.5 moves it to Tested, and it stays 3.5 after a reload and a force close;
- a link in the notes opens in a new tab;
- an idea added in one profile appears in another after a sync (stub the API as your suite allows);
- Reset leaves the ideas and the tab.

**Send screenshots in FINDINGS** of the bar at 375 px and the strip at desktop width, with a timer running on another tab, and of both lists with a few ideas in them, so Dave can approve the look.

## 8. The gate

On `main` at `cef56ba` with this spec, regenerated: **849 of 850**. The one failure is `steps.test.ts` › *§10's Reset copy is reproduced verbatim* › *asks in §10's words*: §10's confirmation now ends "Your saved bakes and topping ideas stay." `gate-70.diff` changes `NewBakeReset.tsx` to match, which gives **850 of 850** with the typecheck clean.

Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. §13 isn't read by the gate; its figures (768 px, 375 px, 48 px, 1 to 5, 0.5) are layout and field rules, not engine outputs. Your new component copy will need classifying as you write it.

## 9. Changes by document

**Spec** (8 edits, all APP-6):
- §1: the tabs and the topping ideas, in one sentence.
- §2: the ideas sync like the log, under `toppings/`.
- §6 *Where the inputs are kept*: a shared link carries no topping ideas.
- §10's opening: the log is a tab; a ⚠️ records the drawer.
- §10 *Capture and saving*, *Kept*: the open tab and the topping ideas.
- §10, the Reset confirmation: "Your saved bakes and topping ideas stay."
- §12: build step 11.
- §13: new, *Tabs, and the topping ideas*.

**Recipe:** unchanged.

## 10. Attachments and hashes

`apply_70.py`, the edit script, run on `main`'s spec at `cef56ba`; it stops unless each old string occurs exactly once. `gate-70.diff`, the Reset copy patch from §8.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `4e1ba5f3d6a648eec510e26e7e858bbc7be0c82814b5e3dfe358c8a48f79ab52` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
