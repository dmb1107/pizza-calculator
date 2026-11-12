# FINDINGS-74 — reply to MESSAGE-73

APP-8 is built and runs in the WebKit suite as a home-screen app at 375 px. All nine spec edits are applied and reproduced. The unit suite is **912 of 912** and the WebKit suite **24 of 24**. Screenshots are in §8.

Two things need words from you. **Dave asked mid-round for the photos to show square**, since a pizza is round (§2), and that needs a §13.2 sentence. **73a is built as "its going moves nothing"**, which releases the held space in one more case than "off screen" does (§4).

## 1. The documents and the gate

- **Hashes match.** `apply_73.py` on `main`'s spec at `4a83ac7` gives `778fb624…`, byte for byte the attached spec. The recipe is unchanged (`6885f481…`).
- **The gate.** With the new spec alone it is 895 of 897, the two failures you named. The expected list gains the four phrases, and `Toppings.tsx` carries them. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. The typecheck is clean.
- **Where it is:** `app-8-photos`, from `main` at `4a83ac7`.

## 2. Dave's call mid-round: photos show square

Dave asked that the pictures show as squares, since a pizza is round. **On the card and in the editor every photo is shown in a square box**, filled and centred (`object-cover`). The closed card's thumbnail was already a 56 px square. **The stored JPEG is not cropped.** It keeps its whole frame at 1600 px on the long side, as §13.3 says, so a later change to how it is shown costs nothing.

Showing it square also settles your §5 point about reserving the photo's box. The box is square before the photo arrives, so nothing under it moves when the photo loads.

Suggested wording for §13.2, after "the open card shows it at full width":

> Both show it square, filled and centred, since a pizza is round (Dave, 11 Nov 2026); the photo kept is not cropped.

## 3. What was built

- **The field.** `photo` is `photoName(id, sha256)`: the idea's id and the first 12 hex characters of the JPEG's SHA-256, for example `2026-10-11-180000-b2c3-1f9a…`. `parseIdea` reads a missing or null `photo` as none. It refuses anything that isn't `[\w-]{1,120}`, the same character rule as `id`.
- **The shrink** (`src/state/photoImage.ts`). The file is decoded through an `<img>`, which applies EXIF orientation. It is drawn to a canvas at no more than 1600 px on the long side, on white so a transparent PNG doesn't turn black, and encoded as JPEG at quality 0.82. A 4032 × 3024 drawn sample (gradient, discs and grain) comes to **413,830 bytes**. I had no real 12-megapixel photo to test with: the system's own are 356 px thumbnails, and I didn't read Dave's library. A real photo with fine detail may come out larger or smaller. Anything that won't decode is refused with §13.2's message.
- **HEIC.** I checked once, outside the suite: WebKit in the harness decodes a real HEIC file (Apple's own, 356 px) and the same picture upscaled to 4032 × 3024 HEIC. The second came out as a 1600 × 1200 JPEG. Mac WebKit decodes HEIC through the system's image framework, and iOS has the same framework. I haven't checked it on an iPhone.
- **The local store** (`src/state/photoStore.ts`): one IndexedDB store keyed by `photo`, on every device. A write is held in memory until IndexedDB has it, so a sync starting a moment after Save still finds the photo. Where IndexedDB can't be opened, the photos last for the session.
- **A thumbnail, local only.** The closed card shows a 112 px JPEG made from the photo on this device and kept beside it under `{photo}~thumb`. A list of many ideas then decodes only small images. It is never synced, so §13.3 needs no sentence for it, but say if you want one. The open card's photo loads lazily, so Expand all doesn't decode every full photo at once.
- **The editor.** The photo sits after Comments and before Rating, under the label "Photo". The buttons are **Add photo**, or **Replace photo** and **Remove photo**. The picker is `<input type="file" accept="image/*">`. "Preparing the photo…" shows under the buttons while a photo shrinks, and Save waits until it's done. The error shows under the buttons too. Every change waits for Save, and Remove doesn't ask.
- **Screen readers.** The open card's photo, and the editor's, are named by the idea's name. The closed card's thumbnail is hidden from screen readers, because it sits inside the header button, which already reads the name. It would otherwise say the name twice.
- **Card height.** A closed card with a photo is taller than one without, since the 56 px box sets its height. The box is fixed, so the header doesn't change height when the thumbnail arrives.

## 4. 73a: when the held space goes

Built: the space goes **as soon as its going moves nothing on screen**. That is the moment the page without it would still reach the bottom of the screen at the current scroll. That includes Dave's case, the space wholly below the screen. It adds one more: a short page whose space is still visible but would leave nothing to scroll past, for example at the top of the page. There, removing it changes nothing you can see. The seeded lists in the suite are that short, so the stricter rule never released the space. Expand all and Add idea still release it at once.

Suggested wording for §13.2, replacing "the empty space at its foot goes once it is off screen":

> the empty space at its foot goes as soon as its going moves nothing on screen

The suite checks that the control stays put at Collapse all, that scrolling up releases the space, and that neither the control nor the scroll position moves when it goes.

## 5. The sync

- **Photos ride on the ideas' sync** through two optional hooks in `repoSync.ts`. The bake log passes neither, and its 31 tests are unchanged.
  - `beforePut` uploads an idea's photo just before the idea is written. It runs only once the sync has decided to write that idea, so a copy that loses to `keepRemote` uploads nothing.
  - `afterSync` deletes the old photos queued on this device, unless an idea still names one. It then fetches every named photo this device doesn't have.
- **The order is yours:** the JPEG, then the JSON naming it, then the old file deleted. A unit test checks the order of the writes. Moving the upload after the JSON fails two tests.
- **"A photo follows its idea."** Replaced and removed photos are queued in `deletedPhotos` and deleted only if no idea names them after the pull. Without that check, an older copy's removal deletes the photo the winning copy names, and a test catches that. When the phone and the laptop both replace an idea's photo, the copy saved later wins. The losing device never uploads its photo, so no unnamed file is left behind in that case.
- **Fetching.** Photos are fetched through the **git blobs API** (`GET /git/blobs/{sha}`, base64 in JSON, up to 100 MB). The sha comes from a listing of `toppings/images/`. That keeps the client's one JSON fetch path, where the raw media type would need a second, binary one. The unit fake leaves the contents API's `content` empty for a photo, as GitHub does past 1 MB, so the test only passes through the blobs API.
- **Fetched once.** A photo's name changes with each new photo, so a stored one is never stale. The suite counts one blob request across two syncs.
- **Cleanup on this device.** After each sync the app deletes local photos no idea names, for example one another device replaced. It keeps photos saved this session, in case the store hasn't rendered yet.
- **No photo requests** are made while no idea has a photo.

## 6. Tests

Your §6 list:

1. **The field.** Unit: missing or null reads as none. `../a`, `a/b`, `a.jpg`, empty, a space, a number, an object and a 121-character name are refused.
2. **Add, Save, Cancel.** WebKit: a 4032 × 3024 photo previews and saves at 1600 × 1200. Cancel after Replace, and Cancel after Remove, leave the same stored name and bytes.
3. **Replace, Remove, Delete.** Unit: the order of writes for replace (new JPEG, JSON, old JPEG deleted), remove (JSON, then the file deleted), and delete (the JSON and the photo). WebKit: Replace then Save gives a new name; Remove then Save leaves none on the card or in IndexedDB; deleting a synced idea removes its photo from the stubbed repository.
4. **Orientation, and a file that isn't a photo.** WebKit: landscape pixels tagged EXIF orientation 6 save as 1200 × 1600 portrait. A text file shows the message under the buttons, and the photo stays as it was.
5. **Sync.** Unit: a photo reaches another device; when both devices replace it, both end on the photo of the copy saved later; a photo is fetched once and again only after a change; a photo the winning copy names isn't deleted. WebKit: a photo added in one profile shows in another, with one blob request across two syncs.
6. **Without a token.** WebKit: the photo survives a force close with no requests made. After a token is set, the photo goes up before the idea. Unit: the same through storage.
7. **73a**, as in §4.
8. **Reset and a shared link.** WebKit: the photo is still there after Reset. Photos have their own IndexedDB store, which Reset doesn't touch, and the link codec has no key for them.

**Done when:** all five are in the WebKit suite, and no page scrolls sideways at 375 px with every card open. The photos are square there too (§2).

Still out of reach: the iPhone camera and photo picker, HEIC on iOS itself, and memory with many large photos on a phone.

## 7. Older devices: reload after the deploy

An APP-7 device keeps `photo` through an edit, but can't show it. An APP-6 device drops it, as it drops `comments`. **On every device, reload the app once after the deploy before editing an idea.** For the home-screen app, swipe it away and reopen it. You can tell the new version by opening Edit on any idea: it has a Photo section.

The bake-log repository's `README.md` line for `toppings/images/` is Dave's, as you said.

## 8. Screenshots

At 375 px, light, as a home-screen app (sent with this). The photos are drawn test images, not pizzas.

- `lists-375-with-photos.png`: the lists, one idea with a photo and four without.
- `card-375-open-with-photo.png`: an open card with its photo, square, at full width.
- `editor-375-with-photo.png`: the editor with a photo, and Replace photo and Remove photo below it.
