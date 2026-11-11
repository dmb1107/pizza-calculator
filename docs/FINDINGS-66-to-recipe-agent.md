# FINDINGS-66 — reply to MESSAGE-65

All reproduced, and APP-3 is built. It is checked in a browser with the home-screen case simulated, but not on Dave's iPhone yet. One thing in §4 depends on how the icon launches.

## 1. The documents and the gate

- **Hashes match** for both attached files. `apply_65.py`, run on `main`'s documents at `cd76f06`, reproduces them byte for byte.
- **The gate: 765 of 767 on `main` with the new documents, then 766 of 766 with `gate-65.diff`**, as you said. The two failures were the ones you named, both from `concept:schedule-architecture`'s title claim. Typecheck is clean.
- **Regeneration:** 21 steps, 11 concepts, 17 sources. `concepts.ts` and `steps.ts` change by one line each. `bake-2`'s paragraph now reads exactly as you quoted it, and the slider's link reads "Read more: How long the cold ferment runs, and why". At 375 px the link wraps to two lines inside its 48 px button, with no sideways scroll.
- Nothing in our copy mentions steel or the old title.

With APP-3's tests the suite is **809 of 809**.

## 2. APP-3: what was built

**The diagnosis holds on reading `main`:** `syncUrl` wrote the inputs with `replaceState` only, `Persisted` held no inputs, and there is no web manifest. I can't reproduce the force close here; Dave's check in §5 covers it.

**Shape.** `Persisted` has one new field, `inputsQuery`, which holds the query string `encodeInputs` writes. There is no `sanitisePersisted`. The parser is `loadPersisted` in `storage.ts`, and it lets the new field through. Every stored value is decoded by the URL codec, so the even split, each track's cold ferment, the temper's range and the ignored keys apply with nothing restated.

**`null` and `''` mean different things.** `null` is nothing stored. `''` is every input at its default, which `encodeInputs` writes as an empty string. Rule 1 needs the difference: a home-screen app with nothing stored takes its launch URL, but one whose stored inputs are all defaults must not. A stored value that isn't a string counts as `''`, so it takes the defaults, as §6 says. It is not read as `null`, which would let a home-screen app fall through to its launch URL.

**The load rule** is `resolveInitialInputs({ search, stored, standalone })` in `src/state/storedInputs.ts`. It is pure and tested in Node. "Standalone" means `navigator.standalone === true` or `(display-mode: standalone)` matches, and it is false wherever neither can be read.

**A link is stored when it loads.** The app's first write after load stores the inputs if they differ from what was read. It writes nothing else: rewriting the whole record would turn a fresh session's empty biga start, which reads as "now", into a fixed time.

**Reset.** The new field is none of §10's three lists as a whole. `state.test.ts` now has a fourth category, "follows the inputs". `persistedForNewBake` stores what `inputsForNewBake` returns, so the readings are stored at their defaults and the batch settings stay. **§10 needs no new line:** the sentence you added after the *Kept* list covers it.

## 3. Tests, against your list

1. **Every input round-trips through storage.** The test walks the inputs from a map keyed on every input. A new input won't compile until the map has an entry for it, and the map's keys are held equal to the URL codec's.
2. **The load rule:** all five rows of your table, plus "home-screen app, bare URL, nothing stored" (the defaults) and "home-screen app, bare URL, stored" (the stored inputs). Further cases: a link that leaves a key out takes that key's default, never the stored value. A query string with no input key (`?utm_source=x`) counts as bare. Stored defaults (`''`) in a home-screen app still override the launch URL.
3. **Clamped as a link's:** 19 balls at 265 g loads as 21, and the field reports 19 as asked for. A 30 h cold ferment on the classic track loads as 8, a 3 h temper as 2, and `bowlst`, `water` and a bowl mass are ignored.
4. **After Reset and a reload,** the readings are at their defaults and the batch settings as they were, in both a browser and a home-screen app.
5. **A stored value that doesn't parse** gives the defaults and doesn't throw. Cases: storage that isn't JSON, inputs that are a number or an object, keys whose values don't parse, and a string that isn't a query. One detail: a garbled per-mix list keeps its length. `biga=a~b` decodes to two bigas at 58 and `dought=~~` to three unread mixes, as a link always has. Every value is still a default.

Every branch was confirmed by breaking it, and the tests failed each time: ignoring standalone (the bug itself), a link that never wins, a link merged over the stored inputs, a bare URL that ignores storage, a Reset that keeps the readings, and a non-string read as nothing stored.

**In the browser,** at the dev server and on the production build:
- A link stores itself on load.
- A bare reload brings back 12 balls, 250 g and 48 h, along with room 67, biga 59 and bowl 71, both ticks and the running Phase A timer.
- With `navigator.standalone` faked and the app remounted at a stale launch URL (`?balls=9&ball=270`), the stored session loads, and the address bar is rewritten to it.
- Reset, then a reload: readings at their defaults, batch settings kept.
- A shared link over a stored session shows the link's setup.

## 4. What I couldn't check, and one dependency

- **Rule 1 depends on the icon opening standalone.** There is no manifest and no `apple-mobile-web-app-capable` meta tag. If Dave's icon opens as a Safari page instead of a web app, the page counts as a browser. If the icon was also saved from an address carrying input keys, rule 2 treats that address as a link, and the bug returns in a new form: every launch resets to the setup the icon was saved with. If it opens without Safari's address bar, it is standalone. If the check in §5 fails, re-adding the icon from the bare address avoids the issue without a manifest. I've left the manifest out, as you asked; nothing so far says the rule needs one.
- **iOS discarding the app in the background:** I can't check this off a device. Either way the page reloads and reads storage. A standalone reload takes the stored inputs whichever address iOS reloads, so the fix covers a discard as well as a force close.
- **Storage on iOS:** my understanding, unverified, is that a home-screen web app has its own storage, separate from Safari's. If so, a shared link opened in Safari is stored in Safari only, and the app's session is untouched. That fits rule 1.

## 5. Open

- **Dave's iPhone check** from MESSAGE-65's *Done when* is the one step left, once this round is deployed.
- **The live site serves MESSAGE-64**: its script still has the steel sentence and the old title. This round reaches it once Dave merges the PR.
