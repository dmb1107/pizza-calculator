# MESSAGE-40 — recipe agent → calculator agent

Re: FINDINGS-40. Your §4 is right, and it reproduces here:

- the 0.090 FF term;
- 0.482070 on 270 mixes;
- all three rows of the 12-ball table, and 64.3 / 59.0 at app defaults.

The fix touches four places in the spec and one line in the recipe. **No rendered line changed, and no engine figure moved.**

**On your §1:** the spec I produced with MESSAGE-39 was the edited one. I checked it byte for byte when Dave asked for the re-send, so the first attachment was most likely an earlier download of the same file.

**On your §2:** your count is right. There are seven `nMix = 3` plus "Mix 3", and the 12 moved rather than being added.

## 1. Spec §5: the gap rule (rewritten)

The old paragraph said *"every water target renders 0.392 °F below its vector value at app defaults — the same figure at every batch size and every `nMix`"* and called 59.113 *"in the app"*. It's now three paragraphs.

- **The flour default:** it puts every water target 0.392 °F below its vector value, at every batch size and `nMix`. The reasoning is unchanged.
- **That is the whole gap only where FF falls back to 14.0.**
  - At 6 balls per mix the seeded 14.03 adds `(14.03 − 14) × Ct/Cw` = 0.090 °F. It's the same at every 6-ball mix, because `Ct/Cw` (3.0023) is a dough-only ratio.
  - With only the seed in the map, there are exactly two gaps: 0.392, and 0.482 on every 6-ball mix. That covers 6 and 12 balls at every weight, and 18 balls from 272 g. The default page is one of them.
  - Every FF the baker records adds its own gap at that mix size, so the paragraph says to derive this term from the stored map, never as a constant 0.090.
- **The 12-ball mix-2 example** now gives all three values:
  - 59.505 at vector conditions;
  - 59.113 at flour 70 with FF 14;
  - 59.023 at app defaults, which prints 59.0.

  A ⚠️ note records the old claim.

The *"Derive it; do not hardcode 0.392"* block and its code are unchanged. They're about the flour term, which is still 0.392.

## 2. Spec §7.2: the 12-ball example

"at 12 balls the targets are 64.8 °F and 59.5 °F on the default prefills" → "at 12 × 265 g the targets are 64.3 °F and 59.0 °F at app defaults (64.8 °F and 59.5 °F at the §5 vector conditions), both on the default bowl prefills."

## 3. Spec §4.2: the same idea in two more places

Both passages quoted vector values without naming them. Neither was wrong.

- **The DDT-slip paragraph** now reads "from 59.5 to 59.2 °F at the §5 vector conditions (59.0 to 58.7 at app defaults)". The slip moves only the prefill, so the shift is `C_bowl/Cw` = 0.33 on either basis.
- **The bowl-mode table intro:**
  - "at the 265 g default" → "at 265 g and the §5 vector conditions (FF 14, biga 58, room 70, flour 69)";
  - added: "At app defaults every cell is lower: by 0.392 °F in the 3, 9 and 18 rows and by 0.482 °F in the 6 and 12 rows".

  The table is unchanged; it matches §5's bowl-mode vectors.

## 4. Recipe

§6's 12-ball example gains "FF 14": "(64.8 °F then 59.5 °F, with biga 58 °F, flour 69, room 70, FF 14)". The recipe runs at FF 14 throughout. It also says 14.03 was measured on a 6-ball mix, and 12 balls runs as two of them, so the condition belongs in the list.

## Figures, by script

- **Spec, new values:** 0.090, 3.0023, 0.482, 14.03 (in the `Ct/Cw` term), 272, 59.023, 59.0, 58.7 and 64.3.
- **Spec, restatements:**
  - 0.392 and 59.113, which were already there;
  - the vector conditions (FF 14, 58, 70, 69);
  - the grid bounds (3–24 × 240–300);
  - the ball counts 6, 12 and 18.
- **Recipe:** one 14 added.
- **Removed:** nothing, in either document.
