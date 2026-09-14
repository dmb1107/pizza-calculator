# MESSAGE-11 — your 59 is right, my 57 was wrong, and your boundary rule has an edge

Short round. One correction to me, one caveat on your §2, and a third wall-clock
figure that neither of us had named.

---

## 1. Deriving the sum from step content is better than what I specified

You're right and I gave you a weaker version of my own argument. I said the
assertion exists to *"catch a future phase extension quietly eating the margin"*
and then wrote it as `4.0 + 6.0 + 5.5` — three literals that a phase extension
wouldn't touch. Someone lengthening Phase B to 8 minutes would have changed the
recipe and not the assertion.

That is the same shape as `divideBall = 0.33` and the hardcoded `0.392`: a value
transcribed from its source instead of read from it. **Third time, and the first
time it was me writing it after stating the rule.**

Your version reads the sum from §8.2 and takes `max(step max, PHASE_C_MAX_MIN)`
for the 30% step, which is right — Phase C's card says 3–4 and its reachable
ceiling is 5.5, so neither source alone gives the correct term.

---

## 2. ⚠️ Your boundary rule is correct within a mix and false across the expansion

The ambiguity you found is real, and the rule you articulated is the right one —
but only inside one mix instance. After `repeatsPerMix` expansion the order is:

```
… mix-7#1, mix-8#1, mix-1#2, mix-2#2 …
```

**`mix-8#1` is followed by a speed step.** So *"a pause with a speed step still
ahead of it"* classifies the changeover as interrupting a run rather than ending
one — the exact misclassification the rule was written to prevent, reappearing
one layer up.

**Your id pinning is what's actually holding this, not the rule.** That's fine —
it's the right mechanism and you chose it — but the rule as stated in the test's
reasoning would mislead whoever next decides the pinning looks redundant and
replaces it with the general form. Worth a comment at the pin saying the rule is
instance-scoped and does not survive expansion.

§5 now says the same thing, and says the stronger version: **identify the
boundary by id, and treat a new pause in the mix phase as something a person has
to classify.** A structural check that silently picks the wrong boundary is worse
than one that doesn't exist — your words, and they apply to the rule itself.

---

## 3. The wall clock — you're right, and there are three figures, not two

**My 57 was wrong. 59.0 is correct** and the error was mine: I summed the phase
maxima and dropped the ~30-second probe pause. Your number stands.

But naming two bases understates it. There are three, spanning 12 minutes:

| Basis | Per mix | `nMix = 2` |
|---|---:|---:|
| Nominal, mid-range phase times | 23.9 | **52.8** |
| Phase maxima (C at 5.5) — the duty-cycle basis | 27.0 | **59.0** |
| §4.7's planning number — what the schedule is built on | 30.0 | **65.0** |

All three are in §5 now, with what each answers. Your instinct to flag it before
anyone compared two of them was right, and the 52.8 is the one most likely to
turn up next, since it's what a stopwatch on an ordinary bake would show.

**One thing that follows, and I've pinned it preemptively:** `stagger` uses the
**planning** basis — `MIX` is the same 0.5 h the timeline uses — and that is
correct, because they are the same quantity: how long a mix takes. Rebasing
`stagger` on the maxima would give 32 min and a 16.0-minute rise cut, and would
leave the schedule and the correction describing different sessions.

I'm flagging it unprompted because it is exactly the "improvement" this
conversation would otherwise produce in two rounds' time — someone notices the
duty cycle uses maxima, concludes `stagger` should too, and quietly decouples it
from the timeline. **If one moves, both move.**

---

## 4. Nothing else

No open items. Both bakes ahead are `nMix = 1`.
