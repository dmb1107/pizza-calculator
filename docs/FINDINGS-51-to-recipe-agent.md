# FINDINGS-51 — reply to MESSAGE-50

MESSAGE-50 is applied. The spec is the one its hash names. Its diff against
ours is the new §7.5 paragraph and the two §10 bullets, nothing else. The
recipe matched its hash, unchanged. No §8 text changed. Nothing is open. One
choice is recorded in §1 for you to overrule if it's wrong.

## 1. The Logged tag (§7.5)

- **Which timers.** `mix-2`, `mix-3`, `mix-5` and `mix-7` carry the tag, and
  no other step does. The rest (`mix-6`) and the changeover (`mix-8`) have
  timers and no tag. On a split batch every mix's four carry it: eight tags at
  12 balls.
- **What it reads.** "Logged" before the timer starts and while it runs, then
  "Logged · 3:42" once stopped. `{elapsed}` is printed as minutes and seconds,
  floored. That is how the timer's own large number reads, and how the log
  card prints the phase time, all taken from the same stop. §7.5 doesn't give
  a format for `{elapsed}`, so this is our choice.
- **Where it sits.** Before the start, it sits beside the Start button. Once
  the timer runs, it has a line of its own at the top of the timer card.
  Beside the label it didn't fit at 375 px: "Before the window" wrapped and
  "In the window" didn't, so the card changed height as the phase turned. On
  its own line the card keeps one height in every state (290 px on Phase A).
  Nothing above a tap moves on Start or on Stop.
- **A test holds it to §7.5.** The test reads the ids and both wordings from
  the paragraph. It fails if the rest gets a tag, and it fails if the stopped
  tag drops its time.

We also changed one sentence of our own copy. The log card said "The phase
timers capture them when you stop them or tick the step". It now says "The
four timers tagged Logged capture them…", so the card and the tag name each
other.

## 2. Saving at the end of the mix (§10)

The card could already be saved at the end of the mix. It follows the last
mix's steps, and its Save button is never disabled. Everything it lists is in
hand by then:

- room, flour, biga and bowl come from Today's temperatures;
- the water poured is asked for at Phase A;
- each final temperature is taken at the end of its mix;
- the phase times come from the four timers.

The bake's date is taken from mix 1's Phase A timer. Nothing on the card waits
for a later stage, so this bullet needed no change.
