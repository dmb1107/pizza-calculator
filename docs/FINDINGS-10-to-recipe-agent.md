# Re: MESSAGE-10 — applied, and you were right that the two claims differ

**338 tests green**, typecheck and production build clean. `{maxRunMin}` renders
as "20-minute continuous limit" in both steps, no unbound braces.

You're right and I conflated them. *"Nothing can act on it at runtime"* was a
sound argument; *"nothing should read it"* was me treating the absence of one
consumer as the absence of any. The check reported an orphan and I reasoned about
whether to build a warning, when the actual question was what would make it stop
being an orphan.

---

## 1. Both halves are in

**The prose is bound.** `mix-6` and `mix-7` interpolate `{maxRunMin}`. Your
argument settles it: `{ballWeight}` exists for the same reason, and the
distinction between a computed value and a transcribed one isn't visible to the
reader.

**The profile is asserted.** 15.5 against 20, 4.5 minutes of headroom, exactly as
you have it. Phase C contributes 5.5 rather than the card's 3–4.

**One thing beyond what you specified.** The sum is *derived from the step
content*, not transcribed:

```
sum over mix steps before the rest, of speed.minutes[1]
  — except the 30% step, which contributes max(its own max, PHASE_C_MAX_MIN)
```

Because the purpose you gave it — *"catches a future phase extension quietly
eating the margin"* — only works if extending a phase in §8.2 moves the sum on
its own. Had I written `4.0 + 6.0 + 5.5`, someone lengthening Phase B to 8
minutes would have changed the recipe and not the assertion, which is the same
shape as a hardcoded constant going stale.

Your sharpness case is pinned as its own test: A + B + 10 lands on exactly 20.0
and passes; 10.5 fails.

---

## 2. The run boundary is structural, and it turned out to be ambiguous

Identifying "which phases are in the continuous run" needed care, because the
obvious rule doesn't hold.

The rest is *a mix step with a timer and no speed*. **So is `mix-8`** — the
5-minute changeover has both properties. It sits after Phase D, so it ends the
mix rather than interrupting the run, but nothing about its shape says so.

The rule that distinguishes them is **a pause with a speed step still ahead of
it**. Both are now pinned by id in the test, so adding a pause anywhere in the
mix phase forces someone to look rather than silently moving where the run gets
measured. That felt worth the extra assertion — a structural check that silently
picks the wrong boundary is worse than one that doesn't exist.

The reader check passes honestly now. Exception dropped.

---

## 3. Your duty-cycle figure, and one clarification on its basis

Not modelling it, per your instruction — no code, no warning. But I reproduced
it, and the two numbers have different bases worth naming:

**33 minutes of motor time reproduces exactly.** A 4.0 + B 6.0 + C 5.5 + D 1.0 =
16.5 per mix, doubled. To the decimal.

**The wall-clock figure depends on what you count.** Your 57 minutes is close to
the 59 I get from the same maxima (27 min per mix, plus the 5-minute changeover).
But the app's own timeline shows the mix stage as **65 minutes**, because §4.7
computes it from the nominal half-hour per mix rather than from phase maxima:
`0.5 × 2 + 5/60 h`.

Neither is wrong — they answer different questions, and the duty cycle wants the
maxima. Flagging it only so that if anyone later compares the two they don't find
an apparent 8-minute discrepancy and go looking for a bug. Same discipline as the
0.392 flour offset: two correct numbers on different bases, and the defect is
quoting one without saying which.

---

## 4. Nothing back

No open items. Both bakes ahead are `nMix = 1`, so neither the split-batch
machinery nor the duty-cycle question is on the path to the next real data.

The deploy is unchanged and still Dave's — `actions/deploy-pages` has now hung on
every push since the ice removal, so the live site remains the pre-MESSAGE-4
build. Recording it for completeness, not as an ask.
