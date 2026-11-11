# MESSAGE-65 — the inputs are stored, and two fixes from FINDINGS-65

**For Dave: run this round at Opus 5.5 `high`.** It changes state code behind a load rule with four cases, and the bug it fixes only shows on a device.

Reply to FINDINGS-65, and the first of Dave's queued app changes (APP-3 in his backlog). The spec changes in six places and the recipe in one. Two things render differently: `bake-2` loses a sentence and `schedule-architecture` has a new title. Based on `main` at `cd76f06`, whose documents match MESSAGE-64's hashes.

## 1. On FINDINGS-65

All accepted.

- **The slider's hint.** My sweep searched for the spec's words ("nearly all the work") and the hint said "nearly all the fermentation", so it passed. Your phrase test over the app's own copy is the right guard, and the two hints Dave chose stand.
- **The reason comments on the FIXED entries, and "16–18 hours" left FIXED:** agreed.
- **The gate keys literals by string per location:** noted. Nothing to change.
- **My scripts have no independent check on your side:** agreed. Their figures are recipe-only.

**§3's W16, the steel sentence: it is gone**, from `bake-2` and from recipe §9 (Dave's call, 10 Nov 2026). The recipe is written for the Tread, so saying which surface to bake on adds nothing. It was also wrong, not only unsourced. Steel's thermal effusivity is 8–15 times cordierite's, but by the contact-temperature rule for two solids the heat into the base is 1.5–2.2 times faster: under a 65 °F base a 750 °F steel stays at 687–703 °F where the stone's surface drops to 354–475 °F. None of that goes into the documents. `bake-2`'s paragraph is back to its text before MESSAGE-64:

> A 750 °F stone with full flame gives that balance. Pushing the stone to 800 °F or more shifts it the wrong way and burns the base before the cornicione sets.

**§3's title: changed** (§2 below).

## 2. `schedule-architecture`'s title

> How long the cold ferment runs, and why

Dave's call. The slider's link now reads "Read more: How long the cold ferment runs, and why", which is true under the classic track's 6–8 h slider as well as the retarded track's 6–48 h. The concept's body is unchanged.

## 3. APP-3: the inputs survive closing the app

### What Dave saw

He uses the site as a home-screen web app on iOS. With a non-default number of balls, ball weight or cold ferment, and some steps ticked, he force-closed the app and reopened it. The batch settings were back at their defaults and the ticks were still there.

### Why, from reading `main`

I read the code and haven't reproduced this on a device, so check it before building on it.

- **The inputs live only in the URL.** `syncUrl` in `useAppState.ts` writes them to the query string with `history.replaceState`, and the initial state reads them back with `decodeInputsWithReport(currentSearch())`.
- **Storage holds everything else.** `Persisted` (`types.ts`) has the DDT override, the open panels, the biga start, the timeline's mode and anchor, the ticks, the timers and the session's bake id. It has no inputs.
- **There is no web manifest**, so a home-screen app cold-starts at the address its icon was saved with. The query string `replaceState` wrote is gone, the inputs decode from a bare URL, and storage brings back the rest.

### It is wider than the report

The readings are inputs too: room, flour, each mix's biga and bowl, each final dough temperature. A cold start mid-bake loses them, the water targets fall back to their prefills, and a Save would record defaults. Please also check whether iOS discarding the app in the background does the same as a force close.

### The rule

A new subsection of §6, in full:

> ### Where the inputs are kept
>
> **Every input is stored in the browser and written to the URL** (MESSAGE-65). Storage brings a session back; the URL is for sharing. An input here is anything the URL codec carries: the batch settings (balls, ball weight, schedule, cold ferment and the schedule's adjustments) and the day's readings (room, flour and its "Same as room" switch, each mix's biga and bowl, each mix's final dough temperature).
>
> ⚠️ **Until MESSAGE-65 the inputs lived only in the URL.** A home-screen web app on iOS reopens the address its icon was saved with, so a closed app came back with default inputs beside its stored ticks and timers. The batch settings reset, and the readings went with them: mid-bake, the water targets fell back to their prefills and a Save would have recorded defaults (Dave, 9 Nov 2026).
>
> **On load, the first of these that applies:**
>
> 1. **A home-screen app takes the stored inputs and ignores the launch URL** (Dave's call). The page is a home-screen app when `navigator.standalone` is true or `(display-mode: standalone)` matches. Its launch URL is the address the icon was saved with, which says nothing about the session. If no inputs are stored yet, the launch URL's apply, as in 2.
> 2. **In a browser, a URL that carries any input key is a link, and the link wins.** Its inputs replace the stored ones at once (Dave's call). A key the link leaves out takes its default, as it always has: a link is a whole setup and is never merged with what was stored.
> 3. **A bare URL takes the stored inputs.**
> 4. **With nothing stored, the defaults.**
>
> **After load the two stay in step.** Every change to an input writes storage and the URL together. Reset does too (§10): the readings it resets are stored as their defaults, so a reopened app doesn't bring back the last bake's.
>
> **Stored inputs are read by the same rules as a link's:** the even-split ball rule (Panel 1), the cold ferment's range for its track (§4.7), the temper's range, and the keys that are ignored (`bowlst`, `water`, a bowl mass). Storing what the URL codec writes and reading it back through the codec gives all of that with nothing restated. A stored value that doesn't parse takes its default and never blocks the page.
>
> **What stays as it is:** the URL codec and its keys; "Share setup"; a shared link carries no log, no token and none of the session's ticks, timers or saved-bake id; the DDT override, the timeline's mode and anchor and the open panels, which were stored already; and the three Reset lists (§10).

§1's fourth design priority, §2's *State* bullet and one sentence after §10's *Kept* list say the same in brief.

### Notes for the build

- **Shape.** I'd expect one new field on `Persisted` holding what the codec writes, let through by `sanitisePersisted`. The structure is yours.
- **Keep the rule pure.** `src/lib` and the state helpers stay importable without a DOM, so the load rule wants to be a function of the query string, the stored value and whether the page is standalone, with the four cases tested in Node.
- **A link is stored when it loads**, not at the first edit after it.
- **Reset's classification test.** `state.test.ts` requires every persisted field to be reset, cleared or kept. The new field is none of the three as a whole: its contents follow §10's per-input lists. Classify it as you see fit, and tell me if §10 needs a line for it.
- **No manifest in this round.** The rule doesn't need one, and a manifest changes how the icon launches. If you find it does need one, say so in FINDINGS and leave it out.
- **`CLAUDE.md` is yours:** its fourth design priority and its state notes describe the old split.

### Tests I'd expect

The design is yours. These are the behaviours the spec text commits to:

1. Every input round-trips through storage. Walk the inputs; don't list them.
2. The load rule, case by case:

   | Page | URL | Stored inputs | Loads |
   |---|---|---|---|
   | Browser | carries input keys | present | the URL's, and stores them |
   | Browser | bare | present | the stored ones |
   | Browser | bare | none | the defaults |
   | Home-screen app | carries input keys | present | the stored ones |
   | Home-screen app | carries input keys | none | the URL's |

3. A stored value is clamped as a link's is: 19 balls at 265 g loads as 21, and a 30 h cold ferment stored on the classic track loads as 8.
4. After Reset and a reload, the readings are at their defaults and the batch settings are as they were.
5. A stored value that doesn't parse gives the defaults and doesn't throw.

### Done when

On Dave's iPhone, from the home-screen icon: set 12 balls, 250 g and 48 h; type room, biga and bowl readings; tick two steps and start a timer; force close; reopen. All of it is there. Reset then returns the readings to their defaults and keeps the batch settings, and that also survives a force close. In Safari, a shared link shows the link's setup.

## 4. The gate

On `main` with these documents, regenerated: **765 of 767**. Both failures come from one claim in `tests/contentLiterals.test.ts`, `concept:schedule-architecture`'s "`BOUNDS.coldFermentH`, in the title": its text is gone, and its cover "6–48 h" is stale. `gate-65.diff` removes the claim, which gives **766 of 766** on my scratch clone with the typecheck clean. The title now carries no figure, so nothing replaces it.

Regeneration gives 21 steps, 11 concepts and 17 sources. `concepts.ts` and `steps.ts` change by one line each. Nothing in §6's new subsection renders.

## 5. Changes by document

**Spec** (6 edits):
- §1: the fourth design priority (APP-3).
- §2: the *State* bullet (APP-3).
- §6: a new subsection, *Where the inputs are kept*, before *Panel 2* (APP-3).
- §8.2: `bake-2`, the steel sentence removed.
- §8.3: `schedule-architecture`'s title.
- §10: one sentence after the *Kept* list (APP-3).

**Recipe** (1 edit): §9, the steel sentence removed.

## 6. Attachments and hashes

`apply_65.py` (the edit script, run on MESSAGE-64's documents) and `gate-65.diff`.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `0bec9fa7902d0b6cbcb146f35274a5b91f810d9a5525f04db2dbb5e6bc211ef6` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` |
