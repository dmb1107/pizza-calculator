# MESSAGE-73 — APP-8: a photo on each idea, and §13.2 brought to what APP-7 built

**For Dave: run this round at Opus 5.5 `xhigh`.** It adds binary files to the toppings sync, a local photo store and an image pipeline on the device.

Reply to FINDINGS-73, and the next of Dave's queued app changes (APP-8 in his backlog). Nine spec edits: §2's bake log bullet and seven in §13; the recipe doesn't change, and nothing in §8, no engine, formula, step content or FF moves. Based on `main` at `4a83ac7` (PRs #31 and #32 merged), whose spec matches MESSAGE-72's hash (`49fcbd66…`).

## 1. On FINDINGS-73

All accepted. Reproduced on `app-7-comments` before it merged: the spec's hash, 897 of 897, the typecheck clean, and regeneration changes nothing.

- **The control hidden with no ideas**, and **a card being edited counting as open**: both go into §13.2 as built.
- **Holding the page's height after Collapse all**: the right fix for the control moving under the finger. Dave's call on the cost (73a, below): the empty space goes once it is off screen.
- **Unknown keys kept** through `parseIdea` and `savedIdea`: good, and APP-8 leans on it. §13.3 now says so.
- **Reloading every device after a deploy** is in Dave's hands; this round's deploy needs it again for any device still on APP-6.

## 2. What Dave decided

- **73a (11 Nov 2026).** After Collapse all, the page keeps its height only while the empty space at its foot is on screen; once it scrolls out of view, it goes.
- **8a.** One photo per idea, replaceable and removable.
- **8b.** A thumbnail beside the name on the closed card; full width on the open card.
- **8c.** Shrunk on the device to about 1600 px on the long side as JPEG, stored under `toppings/images/` in the bake-log repository; deleting an idea deletes its photo. Without a token, photos stay on the device in IndexedDB.
- **8d.** In the editor, **Add photo**; with a photo, **Replace photo** and **Remove photo**. A photo change takes effect on Save, like every other field, so Cancel undoes it and Remove doesn't ask.
- **8e.** Screen readers hear the idea's name for its photo.
- **8f.** A file that can't be opened as a photo: **That file couldn't be opened as a photo.** under the button, and nothing else changes.
- **8g.** The delete confirmation stays **Delete "{name}"?**: the photo goes with the idea.
- **8h.** A photo follows its idea: whichever copy of an idea wins under §13.3's rule, every device shows the photo that copy names. So each idea records which photo it has (`photo`), and the file is named by that field, not by the idea's id alone: with one file per id, the losing copy's save would already have overwritten the winner's photo.

## 3. The spec text

§2, the bake log bullet:

> The topping ideas (§13) sync the same way, one file per idea under `toppings/` in the same repository, and their photos under `toppings/images/`.

§13.2, what an idea has:

> **Each idea has a name, pre-bake toppings, post-bake toppings, notes, comments, a rating and a photo.**

§13.2, the field table:

> | `photo` | text or `null` | names the idea's photo file (§13.3) and changes with each new photo (APP-8, Dave, 11 Nov 2026); `null` or missing is no photo |

§13.2, the control as built:

> It isn't stored, as a card's own open state isn't. A card being edited counts as open, and its editor stays open through Collapse all, so text being typed is never lost; every other card closes. With no ideas the control isn't shown. After Collapse all the page keeps its height, so the control stays under the finger, and the empty space at its foot goes once it is off screen (Dave, 11 Nov 2026).

§13.2, the photo on the card and in the editor:

> **A photo of the pizza** (APP-8, Dave, 11 Nov 2026): one per idea, and an idea may have none. The closed card shows it as a thumbnail beside the name; the open card shows it at full width. In the editor it can be added, replaced or removed, and like every other field a change takes effect on Save, so Cancel undoes it and Remove doesn't ask. Screen readers hear the idea's name for it. A file that can't be opened as a photo leaves the idea as it was, and the editor says so under the button.

§13.2 rendered copy, the photo:

> - The photo: **Add photo**, or **Replace photo** and **Remove photo** once there is one. A file that can't be read: **That file couldn't be opened as a photo.**

§13.3, where photos are kept:

> **Each photo is a JPEG under `toppings/images/`**, named by its idea's `photo` field. The app shrinks it on the device before saving it, to about 1600 px on its long side, a few hundred KB where an iPhone original is several MB; the original never leaves the device. Each device keeps the photos it has fetched and fetches one again only when an idea's `photo` changes. Without a token the photos stay in this browser, in IndexedDB, since localStorage holds about 5 MB. Deleting an idea deletes its photo, and removing or replacing a photo deletes the old file.

§13.3, a photo follows its idea:

> **A photo follows its idea** (Dave, 11 Nov 2026): whichever copy of an idea wins, every device shows the photo that copy names.

§13.3, fields the app doesn't know:

> **A field the app doesn't know is kept** through an edit and a sync, so a device a version behind doesn't drop what a newer one added (FINDINGS-73).

## 4. Rendered copy

- In the editor: **Add photo**; with a photo, **Replace photo** and **Remove photo**.
- A file that can't be read: **That file couldn't be opened as a photo.**

The delete confirmation doesn't change. Anything else (a processing state while a photo shrinks, a sync message for a photo that fails to upload) is yours under the writing rules.

## 5. Notes for the build

The design is yours. What I'd watch, from `main` at `4a83ac7`:

- **73a.** `heldHeight` in `ToppingsPage` is released today only by Expand all and Add idea. Release it too once the held space is below the bottom of the screen, which is when nothing on screen moves as it goes.
- **The `photo` field.** Its form is yours: anything that changes with each new photo and is a safe file name, such as the idea's id and a few hex characters of the JPEG's SHA-256. `parseIdea` reads a missing `photo` as none; refuse one that isn't a safe name, as `id` is refused.
- **Photos aren't a `RecordKind`.** `RepoClient.list` skips entries whose `type` isn't `file`, so `toppings/images/` is invisible to the ideas' listing, on APP-7 devices too. The ideas' sync drives the photos through the `photo` field: an idea pushed with a new `photo` pushes its file, and an idea pulled with one this device hasn't stored fetches it.
- **Order on a save with a token:** the JPEG first, then the JSON naming it, then the old file deleted. A device syncing in between never reads a JSON naming a missing file. Two devices replacing the same idea's photo at once can leave a file no idea names; nothing reads it, and no cleanup is asked for.
- **Fetching a photo.** `RepoClient.get` reads `content` from the JSON response. GitHub fills `content` only for files up to 1 MB; from 1 to 100 MB it needs the raw media type (`application/vnd.github.raw+json`). A shrunk photo should be well under 1 MB, but fetch photos raw so a larger one still loads. Creating a file takes base64 content, up to 100 MB.
- **The shrink.** `<input type="file" accept="image/*">` gives iOS's camera, library and files choices. iOS may hand over HEIC; check that WebKit decodes it. Keep a portrait photo portrait: draw from `createImageBitmap(file, { imageOrientation: 'from-image' })` or an `<img>`, which apply EXIF orientation. The JPEG quality is yours; report the size a 12-megapixel sample comes to.
- **The local store.** One IndexedDB store keyed by `photo`, on every device, token or not. A photo saved with no token set uploads at the first sync after one is, carried by its idea's dirty entry.
- **Nothing above the point of a tap.** A thumbnail on the closed card has a fixed box, so the header keeps its height and 48 px target. On the open card, a photo that loads after the tap grows the card below the header, which is allowed; reserve its box once its proportions are known so the fields under it don't jump while someone reads.
- **Memory.** Decoding every full JPEG for thumbnails costs memory on an iPhone with many ideas. A separate small thumbnail is your call; if you store one, it's a second file per photo and §13.3 needs a sentence for it, so say so in FINDINGS.
- **Older devices.** An APP-7 device keeps `photo` through an edit (FINDINGS-73), so a photo survives an edit on a device that can't show it. An APP-6 device drops it: FINDINGS should repeat the reload instruction.
- **The bake-log repository's `README.md`** describes `bakes/` and `toppings/` (its PR #1, open for Dave). A line for `toppings/images/` there is Dave's.
- **The rendered-copy test** (§8 here) gains four phrases, and `Toppings.tsx` has to carry them.

## 6. Tests I'd expect

1. An idea's JSON without `photo` parses as no photo; one with an unsafe `photo` is refused.
2. A photo added, then Save: a JPEG no more than about 1600 px on its long side, the idea's `photo` set; Cancel instead leaves the idea and its photo as they were.
3. Replace, then Save: a new `photo`, the new file pushed before the JSON, the old file deleted after. Remove, then Save: `photo` null, the file deleted. Delete the idea: its JSON and its photo deleted.
4. A portrait photo with EXIF rotation saves portrait. A file that isn't an image shows §13.2's message and changes nothing.
5. Sync: a photo added in one profile appears in another; two profiles replacing the same idea's photo end on the photo of the copy that wins by `updated`; a device fetches a photo once and not again until `photo` changes.
6. Without a token, a photo survives a reload and a force close; after a token is set, the next sync uploads it.
7. 73a: after Collapse all with the page scrolled into the lists, the control stays put; scrolling up until the held space is off screen gives it up, with nothing on screen moving.
8. Reset and a shared link leave the photos alone.

## 7. Done when

In the WebKit suite, as a home-screen app at 375 px:
- a photo added to an idea shows as a thumbnail on the closed card and at full width on the open one, and survives a reload and a force close;
- Replace and Remove work and Cancel undoes either;
- a photo added in one profile appears in another after a sync (stubbed);
- the space after Collapse all goes once it is scrolled off screen;
- nothing scrolls sideways at 375 px, with every card open.

**Send screenshots in FINDINGS** of the lists with a mix of ideas with and without photos, an open card with its photo, and the editor with a photo in it, so Dave can approve the look.

## 8. The gate

On `main` at `4a83ac7` with this spec, regenerated: **895 of 897**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.

The two failures are both in `toppings.test.ts` › *§13.2's rendered copy is the app's*:
- *reads every phrase §13.2 words*: the list gains **Add photo**, **Replace photo**, **Remove photo** and **That file couldn't be opened as a photo.**, in that order, after **Add the pre-bake toppings before rating it.**;
- *puts each one on the page in those words*: `Toppings.tsx` doesn't carry them yet.

Both pass once APP-8 is built, so there is no gate patch.

## 9. Changes by document

**Spec** (9 edits):
- §2: the photos live under `toppings/images/`.
- §13.2: a photo in the opening sentence and the field table; the control as built (hidden with no ideas, a card being edited counts as open, the held space goes once off screen); the photo on the card and in the editor; the photo's rendered copy.
- §13.3: where photos are kept and how they're shrunk; a photo follows its idea; a field the app doesn't know is kept.

**Recipe:** unchanged.

## 10. Attachments and hashes

`apply_73.py`, run on `main`'s spec at `4a83ac7`. It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `778fb62487efd990e297b826e0210573192650943fbd0f5d5b179d0e68a1a8c5` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
