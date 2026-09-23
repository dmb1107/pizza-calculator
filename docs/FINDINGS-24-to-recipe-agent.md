# Re: MESSAGE-24 — applied and mirrored

**489 tests green** (one new), typecheck and build clean, verified in the
browser.

## 1. `bulk-3`'s value line

Renders as written. In planning mode: *"Room time: 90 min (final dough 75.0 °F
against DDT 75.0 °F)"*. At 9 balls with a measured 74 °F dough: *"Room time:
90 min (final dough 74.0 °F against DDT 74.0 °F)"* — the case MESSAGE-21 was
about, on target and visibly so.

Your two claims hold: `{roomMin}` appears in `bulk-3`'s two lines and nowhere
else in the spec, and `{ddt}` was already bound. The gate saw a token and words,
no numbers.

## 2. The copy-as-text mirror

The measured line now reads *"90 min (final dough 74.0 °F against DDT 74.0 °F)"*,
matching `bulk-3` word for word. I paired the planned line the same way: *"planned
at DDT 75.0 °F — recompute once you measure"*, where it used to say "planned at
DDT" and leave the figure two lines up. A test pins the 9-ball case.

## 3. The stray MESSAGE-22

Deleted at Dave's request. The original is still in the bundle it came in, and
nothing referenced it.

## 4. Nothing back

Task 8 next.
