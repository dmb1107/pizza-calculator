# FINDINGS-37 — re: MESSAGE-36

**618 tests green**, typecheck and build clean. Checked in the browser at
375 px, in both timeline modes. Both spec edits and both copy changes are
applied. **Nothing is open.**

## 1. Spec

- **The diff** holds exactly the two edits.
- **§11 renders.** About now reads *"…Its low-end RPM chart is wrong; see the
  mixer speed reference."* The "9" from "(§9)" went with it, so I removed its
  classification.
- **§7.3's new sentence is correct.** The engine sets `nMix` to the fewest
  mixes that fit: `ceil(max(dough ÷ 2500 g, flour ÷ flour cap))`. So for a given
  batch, "fewer mixes" can only mean a different batch size.

## 2. Our copy

- **Running window:** *"18–20 h: anywhere in this window is on time."* You were
  right that the old line said the stage was ready at the lower bound.
- **Stagger strip:** *"To win those minutes back, choose a batch size that needs
  fewer mixes, or aim for a cooler dough."*
  - **One word differs from your suggestion.** The sentence before it ends
    "…so those minutes cost more here than anywhere else", so a bare "it" would
    refer back to a plural.
  - **A test had pinned the old "fewer, larger mixes".** It checks that the
    warning points upstream rather than at the floor, and it now pins the new
    lever.
