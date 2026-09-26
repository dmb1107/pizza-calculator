# FINDINGS-35 — re: MESSAGE-34

**618 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes, at 6 and 18 balls. Both changes are applied
and nothing is open. Your parser question has a real answer (§2), and §11
does render (§3).

## 1. `biga-2` folded into `biga-3`

- **The gap in the ids breaks nothing.** Sequences, instance keys and the
  stage mapping all work by id, not by number. A checkmark for `biga-2` stored
  from an earlier bake stays in storage, but it can't count toward "done",
  which counts only steps that render.
- **Counts.** 19 / 27 / 35 retarded and 17 / 25 / 33 classic, read from your
  table. The golden sequences are written by hand:
  - biga-1, biga-3, biga-4, biga-4b, biga-5, biga-6 (retarded);
  - biga-1, biga-3, biga-4, biga-5 (classic).
- **Scope.** The new tokens in the summary are per-biga, which is right for a
  biga step. At 18 balls (two bigas) it reads 3.44 g ADY into 458.4 g water,
  one biga's share.
- **Literals.** The Giorilli figures and the dose chain moved from `biga-2` to
  `biga-3` unchanged. The moved text brings one new figure, "a stiff 50% biga",
  now checked against `BIGA_HYDRATION`.

## 2. Two concepts on one step: the generator did not take them

It split the concepts line on spaces, so `biga-3` linked to
`"mix-dont-knead,"`, comma included. Both of our parsers agreed on that,
because the verbatim check re-joined the generated ids with a space and
matched your line. A different check caught it: the one that requires every
linked concept to exist.

Both halves are fixed. The generator splits on commas and spaces. The verbatim
check now splits your line itself and compares the ids. Either separator works
from here, and both links open their concepts.

## 3. §11 renders

MESSAGE-34 §2 says nothing rendered changes in that section. But §11 is the
About drawer's source list, so the two new Ooni sources show there now.

Their figures are now checked against the constants §3 says come from those
pages:
- 0.5–2.5 kg against `MIN_DOUGH` / `MAX_DOUGH`;
- the 20-minute run against `MAX_RUN_MIN`;
- 300 RPM against `RPM_AT_100_PCT`;
- 5% increments against the half-lit step.

So a constant that drifts off its cited source now fails a test. I tried it:
setting `MAX_RUN_MIN` to 25 fails only this check. The run-profile tests
still pass, because 25 just gives more headroom.

The recipe's new "Hard limits" line doesn't render.
