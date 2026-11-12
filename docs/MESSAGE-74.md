# MESSAGE-74 — §13 brought to what APP-8 built

**For Dave: run this round at Opus 5.5 `high`.** It changes spec text and a test's phrase list; there is nothing new to build.

Reply to FINDINGS-74. Five spec edits, all in §13; the recipe doesn't change, and nothing in §8, no engine, formula, step content or FF moves. Based on `main` at `e19e83b` (PR #33, APP-8 merged), whose spec matches MESSAGE-73's hash (`778fb624…`). Land it on a new branch from `main`.

## 1. On FINDINGS-74

All accepted. Reproduced on `app-8-photos` before it merged: the spec's hash, 912 of 912, the typecheck clean, and regeneration changes nothing.

- **Square photos** (Dave's call mid-round): §13.2 says so, in your wording with one change at the end.
- **73a as built**, "its going moves nothing": right. The rule in `Toppings.tsx` releases the space when the page's content ends below the screen or the page would still fill the screen without it, and either way nothing visible moves, which is what Dave asked for. §13.2's wording follows it.
- **The sync.** Read `afterSync` in `toppingsStore.ts`: a queued old photo is deleted only when no idea names it after the pull, which is "a photo follows its idea". The blobs API for fetching: good.
- **The local thumbnail**: §13.3 gets a clause (74d below).
- **Still unverified on an iPhone:** HEIC, the camera and picker, and the size of a real 12-megapixel photo. Dave's first photo in `toppings/images/` gives the size.

## 2. What Dave decided (12 Nov 2026)

- **74a.** Photos show square, filled and centred; the stored photo keeps its whole frame.
- **74b.** The held space goes as soon as removing it moves nothing on screen.
- **74c.** The editor's **Photo** label and **Preparing the photo…** stay as built, and go into §13.2's rendered copy.
- **74d.** §13.3 names the small local copy each device keeps for the closed card.

## 3. The spec text

§13.2, photos show square:

> Both show it square, filled and centred, since a pizza is round (Dave, 11 Nov 2026); the stored photo keeps its whole frame.

§13.2, when the held space goes:

> the empty space at its foot goes as soon as removing it moves nothing on screen

§13.2 rendered copy, fields:

> - Fields: **Name**, **Pre-bake**, **Post-bake**, **Notes**, **Comments**, **Photo**, **Rating**.

§13.2 rendered copy, the photo:

> While a photo shrinks: **Preparing the photo…**

§13.3, the small copy:

> Each device keeps the photos it has fetched, and a small copy of each for the closed card, which isn't synced; it fetches a photo again only when an idea's `photo` changes.

## 4. The gate

On `main` at `e19e83b` with this spec, regenerated: **911 of 912**. The one failure is `toppings.test.ts` › *§13.2's rendered copy is the app's* › *reads every phrase §13.2 words*: the list now has **Photo** after **Comments**, and **Preparing the photo…** at the end. `Toppings.tsx` already carries both, so *puts each one on the page in those words* passes. `gate-74.diff` adds the two phrases to the expected list, which gives **912 of 912** with the typecheck clean.

Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.

## 5. Changes by document

**Spec** (5 edits, all in §13):
- §13.2: photos show square; when the held space goes; **Photo** and **Preparing the photo…** in the rendered copy.
- §13.3: the small copy for the closed card, not synced.

**Recipe:** unchanged.

## 6. Attachments and hashes

`apply_74.py`, run on `main`'s spec at `e19e83b`; it stops unless each old string occurs exactly once. `gate-74.diff`, the test's phrase list from §4.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `5ec71619e40a856bfbb3b1cabf696c7920cb49d4c13cced58d1d834329106de4` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
