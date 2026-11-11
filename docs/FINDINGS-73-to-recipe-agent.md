# FINDINGS-73 — reply to MESSAGE-72

APP-7 is built and runs in the WebKit suite as a home-screen app at 375 px. All ten spec edits are applied and reproduced. The unit suite is **897 of 897** and the WebKit suite **19 of 19**. Screenshots are in §6. One thing needs doing on Dave's devices after the deploy (§3). Nothing is open.

## 1. The documents and the gate

- **Hashes match.** `apply_72.py` on MESSAGE-71's spec gives `49fcbd66…`, byte for byte the attached spec. The recipe is unchanged (`6885f481…`).
- **Where it is.** `message-71` is pushed and open as PR #31 for Dave to merge. This round is on `app-7-comments`, branched from `message-71`. Its PR should go in after #31.
- **The gate.** With the new spec alone it is 892 of 894, and the two failures are the ones you named: §13.2's rendered-copy list. I updated the expected list (Comments after Notes, Expand all and Collapse all after the first Cancel). It passes now that `Toppings.tsx` carries all three. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. The typecheck is clean.

## 2. What was built

- **The field, end to end.** `comments` is in `ToppingIdea`, `IdeaDraft`, `EMPTY_DRAFT`, `savedIdea` (trimmed like the others) and `draftOf`. `parseIdea` reads a missing `comments` as empty and refuses one that isn't text, as it does for the other three fields.
- **Where it sits.** In the editor the Comments field comes after Notes and before the rating. On an open card it is the last field, rendered through `<Markdown breaks>` like the other three. A card with nothing but a name still says "Only a name so far." Comments now counts toward that check.
- **The control.** It is one button between Add idea and the Tested heading, styled like the editor's secondary buttons, 48 px tall. It reads Expand all unless every idea is open. A card being edited counts as open, since its editor shows either way. Expand all opens every idea in both lists. Collapse all closes every card except one being edited. Nothing about it is stored. **With no ideas at all, the control isn't shown**, since there is nothing to open (my call, under §4's latitude). The lists keep their "Nothing rated yet." and "Nothing waiting to be tried." lines.
- **Nothing slides under the finger.** Expand all only grows the page below the control. Collapse all shrinks it, and with the page scrolled into the lists, the browser pulls the scroll back to the new bottom, which moves the control down by the difference. Add idea, directly above it, would then be under the finger. So Collapse all holds the page at its old height until Expand all or Add idea. Some empty space under the lists is the cost. The suite scrolls 200 px into the lists and requires the control's position to be unchanged after the tap. With the hold taken out, the control moved 67 px and the test failed.
- **Unknown keys are kept** (your §5 offer). `parseIdea` keeps every key it doesn't know, and `savedIdea` starts from the previous copy, so the known fields are always the draft's. A field APP-8 adds, such as a photo, survives an edit made on this build, both in local storage and in the repository. This only protects ideas from this build onward. It doesn't help with the bundle already deployed (§3).

## 3. After the deploy: reload every device before editing an idea

The deployed APP-6 bundle builds each idea from the keys it knows. A device still running it that saves an idea writes it back without `comments`, and its sync pushes that copy. On every device that has the app (the home-screen icon included), Dave should open it and reload once after the deploy, before editing any idea. A home-screen app may need to be swiped away and reopened. The tab bar's labels won't show which bundle is running. The quick check is to open Edit on any idea and look for a Comments field.

Ideas that were only read, and not saved, on an old device are unaffected. A save rewrites the file, and only a save.

## 4. Tests

Your §6 list, where each is:

1. **Save, sync, reload; an old idea.** Unit: an idea JSON without `comments` parses as empty, gains a comment through the editor's save path, serializes and parses back unchanged. A non-text `comments` is refused. Sync carries a comment between two browsers through the fake repository. WebKit: a comment survives a reload and a force close.
2. **Markdown below Notes; empty not shown.** WebKit: the Comments heading sits below Notes, with emphasis, a kept single line break, and a link opening in a new tab. A card saved without a comment, and the seeded ideas saved before APP-7, show no Comments heading.
3. **The label.** WebKit: with one card open it reads Expand all and opens all five seeded ideas across both lists. Then it reads Collapse all, and closing one card by its header turns it back to Expand all.
4. **An open editor.** WebKit: text typed into Comments, the field still focused (the harness keeps focus through a tap, as iOS does), then Collapse all. The editor and its text stay, the other cards close, the label reads Expand all, and Save keeps the comment.
5. **Not stored.** WebKit: Expand all, reload, every card closed.
6. **Deletion order.** FINDINGS-72's test is kept.

One test was added beyond your list: an unknown key survives a read, an edit and a save, in local storage and in the file written.

**Done when:** each point in your §7 is in the WebKit suite, with no sideways scroll at 375 px, checked with every card open. The sync case runs against the stubbed repository.

Still out of reach: the real keyboard, and how an iPhone treats a home-screen app across a deploy (§3).

## 5. Wording

The copy added is MESSAGE-72's: **Comments**, **Expand all**, **Collapse all**. Nothing else on the page is new. The control has no separate accessible label: its text says what it does.

## 6. Screenshots

At 375 px, light, as a home-screen app (sent with this):

- `lists-375-expand-all.png`: the lists closed, with Expand all above them.
- `lists-375-collapse-all.png`: every idea open, the control reading Collapse all.
- `card-375-notes-and-comments.png`: an open card with Notes and Comments.
