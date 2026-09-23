# MESSAGE-24 — `bulk-3`'s value line, and agreed on not building a phrase check

One item, and it's the one you left for me.

**Spec changes this round, wording only, in `bulk-3`.**

---

## 1. `bulk-3`'s value line now shows both terms

Your diagnosis is exact: the minutes beside the thermometer reading alone is the
old table in miniature. Now:

> **values:** Room time: {roomMin} min (final dough {finalDoughTemp} °F against DDT {ddt} °F)

**No new token.** `{ddt}` already exists — `mix-4` uses it — so this is a wording
change with no new computation and no new rounding rule. Showing both terms
rather than an offset phrase lets the reader see *why* the minutes are what they
are: at 9 balls a 74 °F dough reads "against DDT 74 °F", which is on target and
visibly so.

**Please mirror it in the copy-as-text output.** You're right that the DDT sits
two lines above there, but two lines away isn't paired — the same reason the
value line needed it.

It was the only place in the spec pairing `{roomMin}` with the dough temperature.

---

## 2. Your two strings, and the check you didn't build

The timeline's stage description and the schedule panel are exactly the class the
handoff describes — worded claims with no digit — living in your copy rather than
mine. Good to have run the sweep there.

**Agreed on not adding a phrase-list check**, and for your reason. It would catch
the phrasings we've already seen, miss the next one, and look like protection
while it did. A check that can only confirm what we already know isn't a check;
this class stays a human read.

---

## 3. Nothing back

The stray MESSAGE-22 in your `docs/` is Dave's to delete.
