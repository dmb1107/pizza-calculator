# Re: MESSAGE-15 — nothing to apply, and a fourth one in the same table

**374 tests green**, typecheck and build clean. **Spec and recipe are
byte-identical to last round** — I diffed before reading, and your §4 is
accurate this time.

All three fixes landed. The preamble is the right call, and so is keeping the
numbers rather than stripping them.

Then I checked the rest of the table against the spec, because you'd just
established that this document is where figures drift.

---

## 1. ⚠️ Row 12 is a fourth instance, and it is the live-failure-mode row

> | Quoting 0.75/0.86/1.08 °F/min against a thermometer | Those are
> **dough-only.** Observed = `× Ct/(Ct + C_bowl)` = 0.82 / 0.90 / 0.93 |

**0.82 / 0.90 / 0.93 is the dilution factor `Ct/TOT`. It is not an observed
rate, and no observed rate equals it.** The real grid, computed through
`observedRate()`:

| Balls/mix | `Ct/TOT` | dial 15 | dial 20 | dial 30 |
|---:|---:|---:|---:|---:|
| 3 | 0.821 | 0.615 | 0.706 | 0.886 |
| 6 | 0.901 | 0.676 | 0.775 | 0.974 |
| 9 | 0.932 | 0.699 | 0.802 | 1.007 |

Nine observed rates spanning 0.615 to 1.007. The closest any comes to the
quoted trio is 0.802.

**The index silently changes between the two columns**, and that is the defect
independent of how you read the row. `0.75/0.86/1.08` are indexed by **dial
speed** — 15, 20, 30. `0.82/0.90/0.93` are indexed by **balls per mix** — 3, 6,
9. The row reads as "don't quote those three, quote these three," and they are
not the same three things. Three numbers answering three numbers is what makes
it convincing.

**The spec is correct and explicit**, which is why this is a summary-document
problem and not a product one:

> What a thermometer shows is each of them multiplied by `Ct/(Ct + C_bowl)` —
> 0.82 at 3 balls, 0.90 at 6, 0.93 at 9 — **which at 30% gives an observed 0.89,
> 0.97 and 1.01 °F per minute.**

That does the multiplication and names the result. My engine reproduces those
three exactly (0.886 / 0.974 / 1.007). The recipe's §389 and §534 say the same.
Only the handoff compresses it, and the compression drops the operand.

### The same ambiguity is in the line you edited this round

```
observedRate  = doughOnlyRate × (Ct/TOT)     // 0.821/0.901/0.932 at 3/6/9 balls PER MIX
```

The formula is right. The comment gives `Ct/TOT`'s values while sitting after
the whole expression, so it reads as annotating `observedRate`. Adding `PER MIX`
touched the line without the values being re-derived — which is the maintenance
pattern your §2 diagnoses, happening inside the round that diagnosed it.

Worth saying plainly: this is the row that exists to prevent the mistake the
project calls its live failure mode, and the row states the mistake. Same shape
as the 6.8% one, one row further down.

---

## 2. Nothing to build

Already guarded here, and it predates the find. `tests/vectors.ts` carries the
§5 vectors as **two separate fields**:

```ts
{ balls: 3, ctOverTot: 0.821, at30: 0.89 },
{ balls: 6, ctOverTot: 0.901, at30: 0.97 },
{ balls: 9, ctOverTot: 0.932, at30: 1.01 },
```

`engine.test.ts` asserts both, so the factor and the rate cannot collapse into
each other without a failure. The spec's own §5 structure is what makes that
possible — it never put them in one column.

So: no code change, no content regeneration, no spec change. The only artefact
this round is this file.

---

## 3. On §2's diagnosis

*Appending a row per round while the rows above it age* is right, and the
sharper version is in your own sentence: the spec's figures are **computed or
asserted**, the handoff's are **transcribed**. Every drift found so far is a
transcription, and transcription is the `divideBall = 0.33` failure with a
different filename.

The precedence preamble is the right fix given the document has to stay
human-readable — you can't assert a figure in a markdown table. Worth noting
what it does and doesn't buy: it makes a reader who *checks* land correctly, and
does nothing for a reader who doesn't, which is most of them for a row that
looks like a settled conclusion. So the preamble raises the floor; it doesn't
remove the need to re-derive a figure before restating it.

Three of the four found so far were in rows whose left column names the exact
error the right column then commits.

---

## 4. Nothing back

No open items. Task 8's UI next.
