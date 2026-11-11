# MESSAGE-72 — FINDINGS-72's corrections, and APP-7: comments and expand all

**For Dave: run this round at Opus 5.5 `high`.** It changes spec text and adds a field and a control to the Toppings tab.

Reply to FINDINGS-72, and the next of Dave's queued app changes (APP-7 in his backlog). Ten spec edits, all in §13; the recipe doesn't change, and nothing in §8, no engine, formula, step content or FF moves. Based on MESSAGE-71's spec (`8af1fa42…`): build it on a branch from `message-71`, or from `main` once that has merged.

## 1. On FINDINGS-72

All accepted. Reproduced: `apply_71.py` gives `8af1fa42…` on `main`'s spec, and each of your three points against the code.

- **A deletion against an edit (your §2).** Right, and the sentence was ours to check. In `repoSync.ts` a pushed deletion removes the file whatever it holds; an edit pushed after it finds no remote copy, so `keepRemote` is never asked and `put` writes the idea back. Dave's call (72a, below): keep the behaviour, take your wording.
- **Which fields hide the bar.** `takesTyping` in `TabBar.tsx` hides it for any input outside `NOT_TYPED`, and `TimelineCard.tsx`'s two `datetime-local` fields are among them. Your wording, taken.
- **The header.** `App.tsx` has the title and the formula line under it, and no buttons. Your wording, taken.
- **The `message-71` branch** wasn't on GitHub when I looked. Push it and open the PR so Dave can merge it; this round's spec builds on it.

## 2. What Dave decided

### FINDINGS-72 (11 Nov 2026)

- **72a.** Between a deletion and an edit, the device that syncs last wins. No record of deleted ids in the repository. The case needs two devices, an offline edit and a deletion of the same idea in between, and the failure brings an idea back rather than losing text.
- **72b.** Both §13.1 corrections, in your words.

### APP-7: comments, and expand or collapse every idea

Dave asked for a way to open or close every topping idea at once, and for comments on each idea about how the pizza tasted, kept apart from the notes, which hold the recipes and advice for making it.

- **7a.** One control above both lists, acting on Tested and Untested together, and not stored.
- **7b.** One **Comments** field, Markdown like Notes, not dated entries. It syncs with the idea.
- **7c.** The control reads **Expand all** while any card is closed and **Collapse all** once every card is open.
- **7d.** No hint under the field, as the other three have none. It sits below Notes in the editor and on an open card; an empty one isn't shown.
- **7e.** Collapse all leaves an open editor open, so text being typed is never lost.

The `notes` row in §13.2's table now reads "recipes for the toppings and advice for making the pizza": "critiques" moved to `comments`.

## 3. The spec text

§13.1, which fields hide the bar:

> (text, number, a date and time, a text area or a select)

§13.1, the header:

> The header is the title and its formula line on every tab, with no buttons.

§13.3, a deletion against an edit:

> the copy saved last wins, by `updated`, and on a tie the device syncing keeps its own. A deletion carries no time to compare, so between a deletion and an edit the device that syncs last wins: a deletion removes edits it hasn't seen, and an edit synced after a deletion it hasn't seen brings the idea back. The bake log's own rule (the device pushing last wins) is unchanged.

§13.2, what an idea has:

> **Each idea has a name, pre-bake toppings, post-bake toppings, notes, comments and a rating.**

§13.2, the field table:

> | `notes` | Markdown | may be empty: recipes for the toppings and advice for making the pizza |
> | `comments` | Markdown | may be empty: how the pizza tasted (APP-7, Dave, 11 Nov 2026); an idea saved without it has none |

§13.2, the expand and collapse control:

> **One control above both lists opens or closes every card at once** (Dave, 11 Nov 2026). It reads **Expand all** while any card is closed and **Collapse all** once every card is open, and it acts on Tested and Untested together. It isn't stored, as a card's own open state isn't. An open editor stays open, so text being typed is never lost; Collapse all closes every other card.

§13.2, Markdown:

> **The four text fields are Markdown**

§13.2, where comments sit:

> **Comments sit below Notes**, in the editor and on an open card (Dave, 11 Nov 2026), and the card leaves out an empty one.

§13.2 rendered copy, fields:

> - Fields: **Name**, **Pre-bake**, **Post-bake**, **Notes**, **Comments**, **Rating**.

§13.2 rendered copy, buttons:

> - Buttons: **Add idea**, **Save**, **Delete**, **Cancel**; above the lists, **Expand all** or **Collapse all**.

## 4. Rendered copy

- Field: **Comments**, below **Notes**.
- Above the lists: **Expand all**, or **Collapse all** once every card is open.

Anything else (an accessible label for the control, what shows with no ideas at all) is yours under the writing rules.

## 5. Notes for the build

The design is yours. What I'd watch, from `main` at `edc1688`:

- **The field, end to end.** `ToppingIdea`, `IdeaDraft`, `EMPTY_DRAFT`, `savedIdea` (trimmed like the others) and `draftOf` in `src/lib/toppings.ts`; `parseIdea` in `toppingsStore.ts`, whose `text()` already reads a missing key as `''`, so every idea saved so far reads as having no comments. Dave has been saving ideas since this morning, so the repository has some.
- **An old bundle drops the field.** `parseIdea` builds a fresh object from the keys it knows, so a device still running the APP-6 bundle that saves an idea writes it back without `comments`, and its sync pushes that. Nothing in this round can protect against the bundle already deployed; FINDINGS should say to reload each device after the deploy before editing ideas. If you want later fields (APP-8's photo) safe from the same thing, keeping unknown keys through a parse and a save is one way; say if you do it.
- **Expand all** sets `openIds` in `ToppingsPage` to every idea; Collapse all empties it. `IdeaCard`'s `shown = open || editing` already keeps an editor on screen, which is 7e. A card opened by Expand all is an ordinary open card: tapping its header closes it, and the control's label follows.
- **Nothing above the point of a tap.** The control sits above the lists, so the cards grow and shrink below it. If the page is scrolled into the lists, keep the control where the finger is after Collapse all.
- **Markdown.** Comments render through `<Markdown breaks>` like the other three. `CLAUDE.md` says "Their three text fields"; it becomes four.
- **The rendered-copy test** (§8 here) reads §13.2's list, so its expected phrases gain **Comments**, **Expand all** and **Collapse all**, and the component has to carry all three.

## 6. Tests I'd expect

1. Comments save, sync, and come back after a reload; an idea's JSON without `comments` parses with none and saves without error.
2. Comments render as Markdown below Notes, single line breaks kept, links in a new tab; an empty field isn't shown on the card.
3. With one card open, the control reads Expand all and opens every card in both lists; it then reads Collapse all and closes them; closing one card by its header turns it back to Expand all.
4. Collapse all with an editor open leaves the editor and its unsaved text; every other card closes.
5. Nothing is stored: after a reload every card is closed.
6. §13.3: a deletion synced before an edit of the same idea leaves the idea restored, and the reverse order deletes it (your new test; keep it).

## 7. Done when

In the WebKit suite, as a home-screen app at 375 px:
- a comment typed on an idea survives a reload and a force close, and shows below Notes on the open card;
- Expand all opens every card in both lists, and Collapse all closes them;
- Collapse all with an editor open keeps the typed text;
- an idea added in one profile with a comment appears with it in another after a sync (stubbed);
- nothing scrolls sideways at 375 px.

**Send screenshots in FINDINGS** of the open card with Notes and Comments, and of the lists with the control above them, so Dave can approve the look.

## 8. The gate

On `main` at `edc1688` with MESSAGE-71's and this round's spec, regenerated: **891 of 893**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.

The two failures are both in `toppings.test.ts` › *§13.2's rendered copy is the app's*:
- *reads every phrase §13.2 words*: the list now has 19 phrases, with **Comments** after **Notes**, and **Expand all** and **Collapse all** after the first **Cancel**;
- *puts each one on the page in those words*: `Toppings.tsx` doesn't carry **Comments** yet, nor the control's two labels.

Both pass once APP-7 is built, so there is no gate patch: the expected list is yours to update with the component.

## 9. Changes by document

**Spec** (10 edits, all in §13):
- §13.1: the date and time fields hide the bar; the header is the title and its formula line, with no buttons (FINDINGS-72).
- §13.2: comments in the opening sentence and the field table, `notes` reworded beside it; the Expand all / Collapse all control; four Markdown fields; where comments sit; both lines of rendered copy (APP-7).
- §13.3: between a deletion and an edit, the device that syncs last wins (FINDINGS-72).

**Recipe:** unchanged.

## 10. Attachments and hashes

`apply_72.py`, run on MESSAGE-71's spec (`8af1fa42…`). It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `49fcbd664fcb8ecfa56221ac8c15151b53c17cf94cb83139bbb8e75b3c37cd55` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
