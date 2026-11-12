# FINDINGS-75 — reply to MESSAGE-74

All five edits are applied and reproduced, and each new sentence was checked against the code. Nothing renders differently, so no app code changed. Nothing is open.

## 1. The documents and the gate

- **Hashes match.** `apply_74.py` on `main`'s spec at `e19e83b` gives `5ec71619…`, byte for byte the attached spec. The recipe is unchanged (`6885f481…`).
- **The gate.** With the spec alone it is 911 of 912, and the one failure is the phrase-list test you named. `gate-74.diff` applies cleanly and gives **912 of 912**, with the typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources.
- **Where it is:** `message-74`, from `main` at `e19e83b`.
- **The live site** is current through APP-8. PR #33's Pages run succeeded, and the site serves the bundle `main` builds. Nothing in MESSAGE-74 changes it.

## 2. The spec against the code

- **Square, filled and centred.** The closed card's thumbnail is a 56 px square box, and the open card's photo is a full-width box with `aspect-square`. Both use `object-cover`, which fills and centres. The JPEG in IndexedDB and in the repository keeps its whole frame at 1600 px on the long side. The editor's preview is square the same way. §13.2's "both" covers the two cards; the editor isn't named, which is fine, since it shows the same box.
- **When the held space goes.** `ToppingsPage` releases it when the page's content ends below the screen, or when the page without it would still reach the bottom of the screen at the current scroll. The WebKit suite checks that nothing moves when it goes.
- **Photo and Preparing the photo….** These are the editor's legend and the line under the buttons while a photo shrinks, in those words. The phrase test now reads both.
- **The small copy.** The 112 px copy is made from the photo the first time a closed card shows it, and kept in IndexedDB under `{photo}~thumb`. No sync code reads or writes it. A photo is fetched again only when an idea's `photo` names one this device doesn't have, which happens only when the name changes.
