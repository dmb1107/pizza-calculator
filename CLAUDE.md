# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

A static, client-side dough calculator for one specific setup: **Grain Craft
Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven, and a
65% biga.** The user enters batch size, measured temperatures, and a cold-ferment
length; the app returns gram weights, a target water temperature, a clock-time
timeline, and a guided step list.

Served at **https://pizza.dave-becker.com** by one Cloudflare Worker (§14,
APP-10, MESSAGE-75): the built page as static assets, and the Worker's own
`/api/` routes for the passkey sign-in and the sync. No build-time data
fetching. The page's only runtime network calls are to its own `/api/`: the
sign-in, and the bake log's and the topping ideas' syncs, which the Worker
passes to one private GitHub repository with the token it holds. A device
signs in with a passkey and holds no token (§2, §13.3, §14).

## The documents

| File | Role |
|---|---|
| [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md) | **The build spec.** Formulas, constants, test vectors, step prose, build order. |
| [`docs/Biga-Neapolitan-HaloCore-GrainCraft.md`](docs/Biga-Neapolitan-HaloCore-GrainCraft.md) | The human-readable recipe the spec was derived from. |

Keep those two in sync if either changes. **The spec wins** where they disagree
— §4.7 says so explicitly, and they have disagreed twice.

The remaining files in `docs/` are correspondence, kept because they record
*why* several numbers are what they are. Read them before re-opening a settled
question:

| File | Settles |
|---|---|
| `MESSAGE-to-calculator-agent.md` | The bake-1 revision: bowl thermal mass, measured FF, shaped rise time, Phase A/B water in grams |
| `REPLY-to-calculator-agent.md` | Bowl-vs-flour crossover, the bowl-temperature coefficient, the first overhead-band correction |
| `REPLY-2-to-calculator-agent.md` | `bulkRest` and `divideBall` stay fixed; final band 25.6–30.8 h |
| `MESSAGE-3-remove-ice.md` | Why the ice model was deleted outright rather than kept behind a toggle |
| `FINDINGS-3-to-recipe-agent.md` | Settled by MESSAGE-4: both findings confirmed |
| `MESSAGE-4-corrections.md` | Per-mix thermal weights, `MIN_BALLS = 3`, the hot-end warning, ADY 0.00375, `observedRate`, biga default 58, bowl state, the nMix timeline |
| `HANDOFF-new-context.md` | Background for a fresh session on either side. Not instructions |
| `FINDINGS-4-to-recipe-agent.md` | Settled by MESSAGE-5: all six confirmed |
| `MESSAGE-5-replies.md` | `thermal-model` rewritten, split-batch step content, `staggerUncentred`, per-mix temperature arrays, overhead 28.12 |
| `FINDINGS-5-to-recipe-agent.md` | Settled by MESSAGE-6: `mix-8`, and the whole mix phase repeats |
| `MESSAGE-6-replies.md` | `mix-8`, `repeatsPerMix` across the mix phase, per-biga values, overhead 28.42, bowl-share floor from the mixer cap |
| `FINDINGS-6-to-recipe-agent.md` | Settled by MESSAGE-7 |
| `MESSAGE-7-replies.md` | Scope suffixes (`PerMix`/`PerBiga`), bare identifiers only, both warnings kept, `mix-8` cross-references |
| `FINDINGS-7-to-recipe-agent.md` | Settled by MESSAGE-8: both confirmed |
| `MESSAGE-8-replies.md` | `bulk-1`'s warning rewritten for its own moment; editorial notes moved out of §8.2 |
| `FINDINGS-8-to-recipe-agent.md` | Settled by MESSAGE-9 |
| `MESSAGE-9-replies.md` | Derive the flour offset rather than hardcode it; document the unexercised parser branch |
| `FINDINGS-9-to-recipe-agent.md` | Settled by MESSAGE-10 |
| `MESSAGE-10-replies.md` | `{maxRunMin}` bound into `mix-6`/`mix-7`; the profile asserted against `MAX_RUN_MIN` at build time; split-batch duty cycle deliberately unmodelled |
| `FINDINGS-10-to-recipe-agent.md` | Settled by MESSAGE-11 |
| `MESSAGE-11-replies.md` | Three wall-clock bases, not two; the boundary rule is template-scoped; `stagger` stays on the planning basis |
| `FINDINGS-11-to-recipe-agent.md` | Nothing open. Records the expansion-order bug their §2 exposed |
| `MESSAGE-12-replies.md` | Golden sequences for §4.7 stages and §8.2a instances — order is the meaning |
| `MESSAGE-13-replies.md` | `biga-6` (the temper had no step), `shownWhen`, the stage/step mapping check |
| `MESSAGE-14-replies.md` | Two biga sensitivities, both correct: `Cb/Cw` held, `(Cb + C_bowl)/Cw` tracking |
| `MESSAGE-15-replies.md`, `-16-` | Handoff-only: figures in summary tables drift because they are transcribed |
| `MESSAGE-17-replies.md` | Probe gap moves with room far more than batch; no §8 literal may restate an engine output |
| `MESSAGE-18-replies.md` | §4.9 thickness factor and `openDiameterCapped`; §4.10 probe tokens; all eight FINDINGS-17 items |
| `MESSAGE-19-replies.md` | §4.9 re-referenced to the default ball on the full stone (the 0.083 thickness target had no source); `{probeGapPhrase}`; display conditions decided on printed values |
| `MESSAGE-20-replies.md` | §4.9 rewritten header to header; the thickness claim traced to the recipe, where it started |
| `MESSAGE-21-replies.md` | The DDT "band" removed as unsourced; every rise table keyed on the offset from DDT; the thicker note from 10%, Dave's call (`THICKER_NOTE_MIN_PERCENT`) |
| `MESSAGE-23-replies.md` | Sweep a retraction for the idea, not only its figures; `bulk-3` reworded. **There is no MESSAGE-22** — a stray draft by that number was superseded by 21 |
| `MESSAGE-24-replies.md` | `bulk-3`'s room time printed beside both its terms, dough temperature and DDT; copy-as-text mirrors it |
| `FINDINGS-12` … `FINDINGS-24` | Replies to the above. 17 carries the §8 literal audit; 18 the parser gap that dropped a whole block; 20 a retracted figure still live in UI copy |
| `FINDINGS-25-to-recipe-agent.md` | Unprompted: the biga hint quoted the tracking basis beside a measured bowl, and the copy gate was blind twice |
| `MESSAGE-25.md` | Replies to FINDINGS-25, plus a sweep: bake-1 FF 14.03, the FF map keyed per mix, two FF claims relabelled untested, per-mix tables, "more than three times" rests on 0.0023 |
| `FINDINGS-26-to-recipe-agent.md` | Reply to MESSAGE-25. Numbered 26 because 25 went first |
| `MESSAGE-26.md` | Pairs with FINDINGS-26: the 96.3 °F split-batch ceiling, §4.2's closed form for the batch-total error, and two of our errors (a round-twice in reading scratch output; a tie's reason asserted unchecked) |
| `FINDINGS-27-to-recipe-agent.md` | Reply to MESSAGE-26. From here FINDINGS-N and MESSAGE-N pair up |
| `FINDINGS-28-to-recipe-agent.md` | Unprompted, after Task 9: §9's 80% row is 250 RPM against 249.48 on the measured line (`knownWrong`); implementer voice in rendered §9/§11 |
| `MESSAGE-28.md` | 80% is 249, a slip. The RPM line is derived from two anchors, 60 at 5% (measured) and 300 at 100% (Ooni's published), not rounded constants. **There is no MESSAGE-27** |
| `FINDINGS-29-to-recipe-agent.md` | Reply to MESSAGE-28 |
| `MESSAGE-29.md` | Unprompted, Dave's three asks: speed shown as lit LED segments (§7.5), bowl mass a constant, and §7.3 *Capacity* messages that say when and how the batch splits |
| `FINDINGS-30-to-recipe-agent.md` | Reply to MESSAGE-29, including Dave's indicator geometry (a ring of ten, half steps dimmed) and the §7.5 "half-filled" correction it needs |
| `MESSAGE-30.md` | §7.5 records Dave's ring and draws the half step dimmed; the chip's minutes and §7.3's severities written into the spec; §7.3's near-limit list across 240–300 g. Nothing renders differently |
| `FINDINGS-31-to-recipe-agent.md` | Reply to MESSAGE-30. Nothing open. The near-limit ball list can't see the 5% (it holds from 94.03% to 98.11%); the printed-value edge is unreachable from the inputs |
| `MESSAGE-31.md` | Unprompted, Dave's ask: ranges stay ranges. `biga-4b` (the fridge) split out of `biga-4`, per-track timers, `bake-1` 2–3 h, `bulk-3` timed, the planning point beside its range on the timeline (§7.4) |
| `FINDINGS-32-to-recipe-agent.md` | Reply to MESSAGE-31. Two pins live: §8.2a's stale retarded counts, and `bulk-3`'s timer running long at split batches. The gate had read neither titles, new step fields nor the timeline's stage text |
| `MESSAGE-32.md` | Both pins settled: `{ballRoomMin}`, the rise the timeline plans, for `bulk-3`; counts 20/28/36. `biga-4`'s classic summary reworded, `biga-4b` "Refrigerate the biga". Dave's timers on the four mixer phases; `speed` loses its minutes |
| `FINDINGS-33-to-recipe-agent.md` | Reply to MESSAGE-32. Nothing open; two unpinned notes: at `nMix` 2 `bulk-3`'s block prints 90, 18 and 73 (17.5 rounds up), and the §4.10 ⚠️'s overrun is "up to" at the floor |
| `MESSAGE-33.md` | `bulk-3`'s block states both rises ("would rest 90 min; this batch rests 73") instead of a subtraction; `{staggerHalfMinutes}` stays in `bulk-1` only. §4.10 ⚠️ says "up to" |
| `FINDINGS-34-to-recipe-agent.md` | Reply to MESSAGE-33. Nothing open. The token check listed step fields by hand too; it now walks them |
| `MESSAGE-34.md` | Unprompted, Dave's two asks: `biga-2` folded into `biga-3` (ids **not** renumbered; `biga-2` is absent on purpose), counts 19/27/35 and 17/25/33; the Halo Core limits sourced to Ooni's help center in §3 and §11 |
| `FINDINGS-35-to-recipe-agent.md` | Reply to MESSAGE-34. Nothing open. The generator split a comma-separated concepts line into `"mix-dont-knead,"` and both parsers agreed; §11 renders in About, and its Halo Core figures are now claimed against the constants that cite them |
| `MESSAGE-35.md` | Unprompted, Dave's ask: every rendered spec paragraph rewritten to the humanizer patterns (the writing rules below); no token or figure changed except those listed; asks for the same pass on our copy |
| `FINDINGS-36-to-recipe-agent.md` | Reply to MESSAGE-35: five unlisted figures (all restatements), 29 claims re-anchored, the sections the pass skipped, and the before/after list of our own copy, including the false "highest-leverage input" |
| `MESSAGE-36.md` | Our copy kept, with two changes: a window timer is "on time" anywhere in the window (not "ready" at the lower bound), and the stagger lever is a batch size needing fewer mixes (`nMix` is already the fewest that fit). §11's note no longer cites "§9" |
| `FINDINGS-37-to-recipe-agent.md` | Reply to MESSAGE-36. Nothing open |
| `MESSAGE-37.md` | The recipe's phrasing pass (nothing renders); §4.7/§6 say the biga leads among *measured* temperatures; three mixes from 19 balls at 265 g; Dave's deletion of the unsourced motor-protection advice from `mix-2` |
| `FINDINGS-38-to-recipe-agent.md` | Reply to MESSAGE-37. All reproduced; nothing open. `mix-1`'s "trip the motor protection" stays: Dave confirms the Core has one |
| `MESSAGE-38.md` | Unprompted sweep for two-mix wording: `bulk-1` and `mix-8` count-neutral; `mix-1`'s overrun is "five minutes", not "2½" (the cut is half the *planned* stagger, so an overrun lands whole on the first dough); the recipe's split-batch text at three mixes |
| `FINDINGS-39-to-recipe-agent.md` | Reply to MESSAGE-38. All reproduced; nothing open. Our gate had classified the "2½" with the same misreading. Notes §4.2's remaining two-mix phrasings (not rendered) |
| `MESSAGE-39.md` | The spec's engineering sections swept for two-mix wording (§4.2, §4.8, §6, §7.2); nothing renders. §4.8 separates correcting `CHANGEOVER` from an overrun on the day. Its first attached spec was MESSAGE-38's, byte for byte |
| `FINDINGS-40-to-recipe-agent.md` | Reply to MESSAGE-39. All reproduced. Unprompted: the rendered gap is 0.482, not 0.392, at 6 balls per mix, where the seeded FF 14.03 applies; §5's rule and §7.2's 12-ball figures need their conditions |
| `MESSAGE-40.md` | Accepts FINDINGS-40 §4: §5's gap rule rewritten (0.392 is the flour term; the seeded FF adds 0.090 at 6 balls per mix), §7.2 and §4.2's 12-ball figures conditioned, the recipe's example gains FF 14. Nothing renders. Its first attached files were earlier copies |
| `FINDINGS-41-to-recipe-agent.md` | Reply to MESSAGE-40. All reproduced except §5's 59.023, which is 59.022 (our four-place 59.0225 rounded again). The DDT slip is now pinned on both bases |
| `MESSAGE-41.md` | 59.023 → 59.022, the one change. From here they send SHA-256 hashes for the files that go with each message |
| `FINDINGS-42-to-recipe-agent.md` | Reply to MESSAGE-41. Nothing open |
| `FINDINGS-43-to-recipe-agent.md` | Unprompted, Dave's ask: step timers count up. Two §7.5 sentences to update ("the countdown", and the pointer to `bulk-1`'s ranged-timer behaviour). **There is no MESSAGE-42** |
| `MESSAGE-43.md` | Both §7.5 sentences changed, plus a new "Timers count up" paragraph: nothing labels the lower bound "ready". Nothing renders |
| `FINDINGS-44-to-recipe-agent.md` | Reply to MESSAGE-43. All reproduced. The new rule caught our tab title ("Ready"), now "Check timer". Nothing open |
| `FINDINGS-45-to-recipe-agent.md` | Unprompted, Dave's asks for Task 11: the log syncs through a private GitHub repo (decided), FF inputs only, history sets the FF. Open: how history becomes the FF in use, and whether the solve needs phase durations (Phase C alone spans 3.78 °F of FF) |
| `MESSAGE-45.md` | Every FINDINGS-45 question answered: normalize a solved FF to mid-range phase times (A 3.5, B 5.5, C 3.5, D 52.5 s); mean of the last three counted bakes, interpolation across sizes, the seed stays 14.03; §10's counting rules; §4.8's `T_actual` is the mean of the mixes; no typed FF. Bake 1's Phase C ran 6.5 min (10.791045 once corrected) |
| `FINDINGS-46-to-recipe-agent.md` | Reply to MESSAGE-45. All reproduced; the log built. Found in passing: mix 1's bowl reading overrode later mixes' warm prefill (mix 2's water 4.6 °F warm at 12 × 265 g), fixed |
| `MESSAGE-46.md` | FINDINGS-46 accepted. §6: read the bowl by index; mix sizes print with ½, ⅓, ⅔. §10 *Capture and saving*: "entered" is per bake, only the water can be confirmed, phase times beside their ranges, saving over an earlier-date bake asks, a bake is dated by its first mix. Nothing in §8 changes |
| `FINDINGS-47-to-recipe-agent.md` | Reply to MESSAGE-46. All applied; nothing open |
| `MESSAGE-47.md` | Dave's change: no tracking of which values were typed. Save records the inputs as they stand; a Reset button above the panels starts a new bake (rendered copy in §10); a bowl at its prefill still doesn't count |
| `FINDINGS-48-to-recipe-agent.md` | Reply to MESSAGE-47. Applied; asks about the two buttons labelled Reset and suggests `bowl_prefilled` in §10's table |
| `MESSAGE-48.md` | The Steps header's Reset dropped: the page's Reset is the only one. It also resets the DDT override (to auto) and the timeline's anchor; §10 lists reset / cleared / kept, and its copy names both. §10's table gains `bowl_prefilled` and `null` |
| `FINDINGS-49-to-recipe-agent.md` | Reply to MESSAGE-48. Applied; a test now holds the Reset copy to §10. Asks about two stored fields §10 doesn't list, both kept: which end of the timeline is held, and which panels are open |
| `MESSAGE-49.md` | Both kept: §10's *Kept* list names the timeline's mode, the open panels and this device's sync settings; "the anchor is the held time, not the mode". Nothing renders |
| `FINDINGS-50-to-recipe-agent.md` | Reply to MESSAGE-49. Reproduced (51.833333 h at the defaults); nothing open. Notes that "now" is rounded up to the next quarter hour |
| `MESSAGE-50.md` | Unprompted, Dave's workflow: the four mixer-phase timers carry a **Logged** tag (§7.5), "Logged · {elapsed}" once stopped; Start and Stop are enough. §10: the bake is saved at the end of the mix, because nothing the log stores comes later. Numbered 50 because FINDINGS-50 needed no reply |
| `FINDINGS-51-to-recipe-agent.md` | Reply to MESSAGE-50. The tag built and held to §7.5 by a test; on its own line, since beside the label it wrapped at phone width. Nothing on the log card waits for a later stage. Nothing open |
| `MESSAGE-51.md` | Unprompted, part 1 of Dave's recipe review: sources that use oil or sugar dropped (Ooni/Fuso, Gozney, Stadler); the biga's ADY rehydrated at 100–110 °F in `biga-1`; the retarded schedule's dose stated as an assumption (`biga-4b`); salt against AVPN's range; §4.9's opening size removed. **MESSAGE-52 and 53 follow with their own documents; don't start them from 51's description** |
| `FINDINGS-52-to-recipe-agent.md` | Reply to MESSAGE-51. Four figures it filed as FIXED are claimed (2–3 °F, 11 hours, 2.2–3.75%, 0.64%); the gate now reads concept titles; `biga-1`'s chip suffix at `nBiga > 1`; Grain Craft's ash is a USDA database value, and AVPN's two sources disagree on type 00 |
| `MESSAGE-52.md` | Part 2 of Dave's review, and the reply to FINDINGS-52: `COOLDOWN_EQUIV_MIN` 150 → 35 (an estimate from `Q_DOUBLING_F`); `DEFAULT_FF` retired, bake 1's normalized 10.791045 is the FF in use at every size until a counted bake; the probe's remaining friction from Phases C and D at their references (4.5325 × Ct/TOT), no FF; the ash argument withdrawn. Part 3 (MESSAGE-53) follows our reply |
| `FINDINGS-53-to-recipe-agent.md` | Reply to MESSAGE-52. All reproduced. §4.2's two app-default sentences weren't swept; §4.10's zero crossing is 56.0–56.7; 35 sits a minute above the middle of 29–39; our ingredients card still said "room temperature" for the biga water |
| `MESSAGE-53.md` | Part 3, the last of Dave's review, and the reply to FINDINGS-53: one biga at every size (`nBiga`, `FLOUR_CAP_55`, the biga-split warning and the `PerBiga` scope removed); `mix-0`, split the biga once at `nMix > 1`; `biga-6`'s large-biga note; temper 1.5–2 h (planning 1.5) with Dave's waves; divide scales with total balls (timeline only); classic cold ferment 6–8 h, default 6 |
| `FINDINGS-54-to-recipe-agent.md` | Reply to MESSAGE-53. All reproduced. Both parsers derived `repeatsPerMix` from the phase, so `mix-0` would have repeated: they now read §8.2a's span, each in its own way. `mix-0` says "tempered" on the classic track; §8.1 still names `{bigaCountSuffix}`; the temper times were rounded twice |
| `MESSAGE-54.md` | Reply to FINDINGS-54. `BOWL_MASS_G` 965 → 963 (weighed; the seed re-solves to 10.787531); 10 × 244 g is the largest unsplit batch, not 9 × 270; **the readings move into `mix-1`** (Today's temperatures, the water card and the bowl-state selector removed; panels Batch and Calibration); steps name no sources; concept links "Read more: {title}" |
| `FINDINGS-55-to-recipe-agent.md` | Reply to MESSAGE-54. All reproduced (the share at the cap is 6.624486%, both print 6.62%). The gate never checked a claim's `covers`; it does now, and it found `biga-4.detail`'s "2 hours" excused by a claim that didn't build it. `mix-0` still sends the baker to the changeover for the biga reading |
| `MESSAGE-55.md` | Reply to FINDINGS-55; no figure moves. `mix-0` sends the baker to each later mix's prep step; both our label choices kept ("Water target" at one mix, no unit in labels); `mix-1` links `thermal-model`, and §8.3 still asks the Calibration panel to link `friction-factor` |
| `FINDINGS-56-to-recipe-agent.md` | Reply to MESSAGE-55. Applied; nothing open. No component had ever linked a concept: §8.3's two card links went unbuilt from the start. `mix-1`'s field covers one, and the Calibration panel now has the other |
| `MESSAGE-56.md` | Dave's change: **the "Water poured" field goes, and the log records each mix's water target** (to the tenth, stored) as the water used. The page asks for a blend within 1 °F; a mix whose water is outside 38–120 °F doesn't count. Keep the Calibration panel's `friction-factor` link |
| `FINDINGS-57-to-recipe-agent.md` | Reply to MESSAGE-56. Applied; nothing open. The synced log repository holds no bakes, so no older bake is known to lack a water reading; the reason stays for local ones we can't see. The site is current through MESSAGE-55 |
| `MESSAGE-57.md` | Reply to FINDINGS-57; nothing renders. §10 gains the Phase B drift's basis (Newton cooling, `k` 0.02–0.04/min, a 6-minute wait) and its table, up to about 0.3 °F at the default readings and 1.3 at the hot corner; the recipe's leftovers from MESSAGE-53 and 54 cleared |
| `FINDINGS-58-to-recipe-agent.md` | Reply to MESSAGE-57. All reproduced; nothing open. PR #13's deploy succeeded, and the site is current through MESSAGE-56 |
| `MESSAGE-58.md` | A bug: a reading typed at the value the field already shows (a bowl at its prefill, a final on DDT) wasn't recorded, so the mix didn't count. §6: an edited reading field records on leaving even when unchanged; focus and leave without an edit records nothing. Found the day of bake 2 |
| `FINDINGS-59-to-recipe-agent.md` | Reply to MESSAGE-58. Fixed (`leaveField`, `recordsReading`) and checked by typing in the browser; nothing open. The fix also covers a later mix's biga read at the carried-forward value |
| `MESSAGE-59.md` | Bakes 2 and 3 (the first counted bakes). **D2:** the log corrects Phase C only — the 15% and 20% rates are unmeasured and both bakes say they run high. **E1:** the retarded cold ferment runs to 48 h, default still 24 |
| `FINDINGS-60-to-recipe-agent.md` | Reply to MESSAGE-59. All reproduced. Open: `schedule-architecture`, `why-biga` and `formula-rationale` are linked by no step and no drawer, so the app never shows them; whether §3 should name `bigaRoomTemp`'s 2 h. The gate's walker read only strings inside JSX, so the Calibration panel's `FRICTION_HINT` and the Batch panel's schedule descriptions were invisible |
| `MESSAGE-60.md` | Reply to FINDINGS-60, with Dave's three concept links (`biga-1` → `why-biga`, the cold-ferment slider → `schedule-architecture`, the ingredients card → `formula-rationale`). **C1:** one ball per lidded 24 oz deli container, tempered 1½–2 h per ball, the waves gone. **C4:** the cooling estimate is for an open tray. **G1:** the mix ends mostly smooth. **P1:** Phase B 7–9 min, so the profile has 1.5 min of headroom |
| `FINDINGS-61-to-recipe-agent.md` | Reply to MESSAGE-60. All reproduced; the three links built and a test now requires every concept to be opened from somewhere. PR #16 deployed; bake 2 back on, FF in use 9.447610 |
| `MESSAGE-61.md` | Reply to FINDINGS-61, and three of Dave's changes. **C2:** each dough runs on its own clock (its own bulk, divide, rise and fridge), the timeline plans the last dough, and `stagger` and its tokens and warnings are gone; `bulk-1`–`bulk-3` carry one timer per dough. **C2d:** ball counts split evenly between the mixes. **C3:** `DDT` by balls per mix, so 12 balls is 75 |
| `FINDINGS-62-to-recipe-agent.md` | Reply to MESSAGE-61. All reproduced; the code built. `thermal-model` still says "1.5 to 6.2 °F" against §4.2's 1.5–6.4, pinned `knownWrong`; the step-level warning grammar removed from both parsers |
| `MESSAGE-62.md` | Reply to FINDINGS-62, spec only: `thermal-model` reads 6.4 (the `knownWrong` pin is now a claim), §4.8's nominal pair is 86 against 89. The bowl after the temper and where the dough rises move to MESSAGE-63 |
| `FINDINGS-63-to-recipe-agent.md` | Reply to MESSAGE-62. Reproduced; nothing open. PR #18 deployed |
| `MESSAGE-63.md` | Unprompted, Dave's two calls from bakes 2 and 3. **F1:** the temper warms the bowl faster than the biga (9–10.5 °F above at mix 1), so `biga-6` quotes `Cb/Cw` (1.6) for a reading and "about 2 °F" only for a skipped temper; the prefill stays `T_biga` (Dave's call) and §4.2 records its cost. **R1:** `bulk-1` asks for a steady spot near the target dough temperature, no figures. Nothing modelled moves |
| `FINDINGS-64-to-recipe-agent.md` | Reply to MESSAGE-63. All reproduced except `roomrise.py`'s table, whose script wasn't sent. Two more sweeps still counted disallowed batches; the tracking span's minimum moved to 10 × 244 g. Nothing open |
| `MESSAGE-64.md` | Dave's science review, wording only (W1–W18): a yeast biga, not a sourdough (no acetic acid, no water activity); no best-flavor claim at 61–65 °F; the retarded track moves part of the work into the dough; a doubled biga may be over-fermented; the jar gone; six papers in §11. No formula, constant or token moves |
| `FINDINGS-65-to-recipe-agent.md` | Reply to MESSAGE-64. All reproduced (761 → 766 with their gate patch). Our cold-ferment slider hint still said the biga "does nearly all the fermentation"; Dave's per-track hint replaced it, and a test now bans MESSAGE-64's retired phrases from our copy. Asks about `schedule-architecture`'s 6–48 h title on the classic track and W16's unsourced steel claim |
| `MESSAGE-65.md` | Reply to FINDINGS-65. W16's steel sentence removed (Dave's call), `schedule-architecture` retitled "How long the cold ferment runs, and why". **APP-3: the inputs are stored as well as written to the URL** (§6 *Where the inputs are kept*), with a four-case load rule; a home-screen app takes what is stored |
| `FINDINGS-66-to-recipe-agent.md` | Reply to MESSAGE-65. All reproduced (765 → 766); APP-3 built and checked in a browser with the home-screen case simulated, not yet on Dave's iPhone. Rule 1 rests on the icon opening standalone, and there is no manifest |
| `FINDINGS-67-to-recipe-agent.md` | Unprompted, after Dave's iPhone check: Reset now resets the batch settings and the schedule's adjustments too (Dave's call), ahead of §10, with the §10 and §6 wording to change. Also the Reset focus bug (PR #23): a reading being edited survived Reset on iOS |
| `MESSAGE-67.md` | Replies to FINDINGS-66 and 67 (**there is no MESSAGE-66**). Reset's confirmation names "the schedule adjustments" (Dave). **APP-4: a stopped timer resumes**, the pause left out on every timer; Resume takes Stop's place, Clear moves away; the beep only when the count crosses the bound while running |
| `FINDINGS-68-to-recipe-agent.md` | Reply to MESSAGE-67. All reproduced (808 → 809 with their patch); APP-4 built and checked at 375 px. Done on the iPhone commits a reading at once. §4, added after: the WebKit iPhone suite, what it models, and the Resume glitch it found (fixed) |
| `MESSAGE-68.md` | Reply to FINDINGS-68, and **APP-5: finished steps and groups fold away** (a ticked step is one line until its row is tapped; group headings close their groups, stored, opened by Reset), and the Bake log in the header. From here Dave runs no phone checks: each round's *Done when* goes in the WebKit suite |
| `FINDINGS-69-to-recipe-agent.md` | Reply to MESSAGE-68. APP-5 built; `mix-0` opens Mix 1; a ticked step stays open after its timer stops (a double tap on Stop); the beep moved out of the card, since a closed group would have silenced it. Asks about all three and long titles |
| `MESSAGE-69.md` | Reply to FINDINGS-69, spec only: §7.5 and §10 brought to what APP-5 built. `mix-0` opens Mix 1; a ticked step stays open after its timer stops (Dave); the mark's form and the first-due rule; stored groups from another size ignored and kept; the beep off screen; an edit finished before a fold; "Bake log" under "Share setup" (Dave) |
| `FINDINGS-70-to-recipe-agent.md` | Reply to MESSAGE-69. All reproduced; each new sentence checked against the code; one test added for "ignored and kept". Landed on `message-69`, since `app-5-fold` had merged. Nothing open |
| `MESSAGE-70.md` | **APP-6, spec §13**: three tabs (Recipe, Toppings, Bake log; a bottom bar on a phone, a sticky strip from 768 px), the log's drawer and its two buttons gone, and Dave's topping ideas with their own store and sync under `toppings/`. Gate 849 → 850 with their Reset copy patch |
| `FINDINGS-71-to-recipe-agent.md` | Reply to MESSAGE-70. APP-6 built and run in the WebKit suite. A reload carries the page's own inputs, so "a link" is read as one whose setup differs from the stored one; "last write wins" read by `updated`; Save left the bar hidden in WebKit (fixed). Screenshots sent with it |
| `MESSAGE-71.md` | Spec only: §13 brought to what APP-6 built (the bar on focus, the mark, what counts as a link, Share setup beside Reset, Untested by `created`, the rating control, which copy wins). Nothing renders |
| `FINDINGS-72-to-recipe-agent.md` | Reply to MESSAGE-71. Applied, 893 → 894. Our §13.3 wording was half true: between a deletion and an edit the device syncing last wins, so an edit synced after an unseen deletion brings the idea back (pinned by a test). Two §13.1 wording notes |
| `MESSAGE-72.md` | FINDINGS-72's three corrections taken (Dave's 72a: no tombstones). **APP-7:** a `comments` field (how it tasted; `notes` is recipes and advice) below Notes, and one Expand all / Collapse all control above both lists, not stored, an open editor kept |
| `FINDINGS-73-to-recipe-agent.md` | Reply to MESSAGE-72. APP-7 built, 897 unit and 19 WebKit tests. Unknown keys kept through a read and a save; reload every device after the deploy. Collapse all holds the page's height so the control stays under the finger. Screenshots sent with it |
| `MESSAGE-73.md` | **APP-8: a photo on each idea** (`photo`, a safe name that changes with each photo; JPEGs under `toppings/images/`, shrunk on the device, IndexedDB without a token; a photo follows its idea). 73a: the held space after Collapse all goes once off screen |
| `FINDINGS-74-to-recipe-agent.md` | Reply to MESSAGE-73. APP-8 built; 912 unit, 24 WebKit. Photos fetched by the git blobs API; a local thumbnail; photos shown square (Dave, mid-round); 73a read as "its going moves nothing". Screenshots sent with it |
| `MESSAGE-74.md` | Spec only: §13 brought to what APP-8 built (photos square, the held space goes once its going moves nothing, Photo and Preparing the photo… in the rendered copy, the local small copy). Gate patch for the phrase list |
| `FINDINGS-75-to-recipe-agent.md` | Reply to MESSAGE-74. All reproduced, 912 of 912; nothing open |
| `MESSAGE-75.md` | **APP-10, spec §14**: the app moves to Cloudflare at `pizza.dave-becker.com`; the GitHub token moves into a Worker; devices sign in with a passkey (90 days, renewed on use), a setup code guards creating one; Pages off once the new address works |
| `FINDINGS-76-to-recipe-agent.md` | Accepted (Dave, 12 Nov; APP-10 done, #35 closed). Reply to MESSAGE-75. APP-10 built: the Worker's routes and what each checks, the switchover checklist, the secrets and deploy steps. Writes pass only `message`, `content`, `sha`; `download_url`s stripped. Screenshots sent with it |
| `HANDOFF-to-next-calculator-agent.md` | **Start here on a fresh session.** Where things stand, what's open, how a round works, what each test catches |

## How work comes in (Dave, 12 Nov 2026)

From FINDINGS-76 on, the work is split by kind, so that two agents don't
pass every app feature back and forth through Dave.

- **App features come from Dave directly**, as GitHub issues labelled
  `backlog` and `app` (APP-14, then APP-11, APP-9 and APP-12). The queue's
  order and the working rules are in issue **#60**; each item's decisions,
  with Dave's dates, are in its own issue's body. When an item is done,
  comment on it with the date and the result (the PRs, what passed), then
  close it.
- **We own how features are built, and the spec's app sections:** §13, §14
  and any new feature section. Keep them in step with what is built, worded
  as behaviour, not implementation.
- **Bring Dave the decisions and the on-screen text to approve**, worded
  under the writing rules below. Ask him only about what he'd see.
- **The recipe agent still owns the recipe, its science, the step prose, and
  the spec's formulas and numbers (§3–§9).** Don't change those without it.
  When a round needs both, it pushes the spec change and a MESSAGE to a
  branch, we build on that branch and commit FINDINGS there, and Dave merges
  one PR.
- **Phone checks:** each round's *Done when* runs in the WebKit suite. Ask
  Dave to check on his iPhone only what the suite can't reach and that
  really matters, and say which parts those are.
- **Effort:** Dave picks `low`, `medium` or `high` per round, and `extra`
  only for the hardest cases.

## Rules that matter more than usual here

**Do not invent dough science.** Every formula, constant, and piece of step
content needed is in the spec. If something isn't specified there, ask rather
than guessing — the numbers are load-bearing and were derived carefully.

**Ask before deviating on any number.** The formulas were derived and
cross-checked. A plausible-looking simplification produces a wrong answer that
won't be obvious until 50 hours of fermentation later.

**The whole `mix` phase repeats, and instances are the primary key.** §8.2a:
`mix-1` … `mix-8` carry `repeatsPerMix`, so at `nMix = 2` the list renders them
twice with ids `mix-2#1`, `mix-2#2`. **`mix-0` (split the biga, MESSAGE-53) is
a `mix`-phase step that does not repeat**: shown once, before `mix-1#1`, when
`nMix > 1`. So repetition is read from §8.2a's sentence "Mark **`mix-1` …
`mix-8`** with `repeatsPerMix: true`", never from the phase: the generator
reads it as a numeric range, `steps.test.ts` as a span of step order. Both
used to derive it from the phase, which would have repeated `mix-0`. **`expandSteps` repeats the contiguous
block per mix, not each template in turn** — the baker runs mix-1 through mix-8,
then mix-1 through mix-7 again. Repeating each template individually gives the
same instance count and the same labels but the wrong procedure: both bowls
prepped, then Phase A twice, changeover last. That shipped once and browser
checks that counted instances rather than reading the order missed it. **Checkbox and timer state key off the
instance id**, which is the entire point — one id for two passes meant one
checkbox and one timer slot for two mixes. `mix-8` (the changeover) also carries
`suppressOnFinal`: there is no changeover after the last mix. At `nMix = 1` the
instance id is the bare template id, so nothing changes for 3, 6 or 9 balls and
no persisted checkbox is orphaned.

**Step tokens are scoped to their step, and getting that wrong is a live
bug class.** `mix-*` are per-mix steps, so they bind `{phaseAWaterPerMix}`,
`{phaseBWaterPerMix}` and `{saltPerMix}` — a batch total there would have the
baker pour double into mix 1. There is one biga at every size since
MESSAGE-53, so the biga steps take batch totals, bare: `{bigaFlour}`,
`{bigaWater}`, `{bigaADY}`. The ingredients card shows batch totals; that is
the shopping list.
(`biga-2` no longer exists — MESSAGE-34 folded it into `biga-3` and kept every
other id, so the gap is deliberate.) Three
instances of this have been found in three rounds — check every new token
against its step's scope.

**Every token is a bare identifier — an expression is a parse error.** The regex
is deliberately narrow, and `unboundTokens` reports anything brace-delimited
that isn't an identifier. §8 prose is edited often; an evaluator there is a
code-execution surface that grows one convenient ternary at a time. What were
`{mixIndex + 1}` and a ternary became `{nextMixIndex}` and `{bigaCountSuffix}`
(the latter gone with `nBiga`), computed in `bindTokens` where every other
value lives.

**Rendered numbers don't match their vector values, and that is not a bug.**
Two terms separate them. The §5 vectors pin flour at 69 °F so the flour term
stays independently observable; the app defaults flour to room (70 °F), which
is what a bag of flour actually is. That part is `Cf/Cw`, which has no
total-flour term in it: 0.392 °F lower at every batch size and ball weight. The
vectors run at FF 14, and the app at the FF in use: until the log has a counted
bake, bake 1's normalized 10.787531 at every mix size (MESSAGE-52; 963 g
bowl, MESSAGE-54), which adds `(14 − FF) × Ct/Cw` = 9.645. So the app sits
**9.253 °F above** the vectors everywhere, and 12 balls' two targets print
77.3 and 71.8 against the vectors' 68.1 and 62.5 (DDT 75 at 6 balls per mix
since MESSAGE-61). **Quote the conditions whenever you quote a rendered number**, FF
included; one without them cost a round of correspondence (FINDINGS-40).

**Anything derivable from the formula constants is derived, never written down.**
`C_BIGA`, `ADY_OF_BIGA_FLOUR`, the divide (`divideBallH`: minutes from
`DIVIDE_BASE_MIN + DIVIDE_PER_BALL_MIN × balls`, divided by 60 once — the flat
20/60 it replaced was once typed as 0.33),
`FRESH_FLOUR_FRACTION`, `FRESH_WATER_FRACTION`,
`APP_DEFAULT_FLOUR_OFFSET_F`, and the RPM line — `RPM_SLOPE` and
`RPM_INTERCEPT` from the two anchors `RPM_AT_5_PCT` (measured) and
`RPM_AT_100_PCT` (Ooni's published maximum). Four of those got that treatment
only after a literal went wrong — a hardcoded value is correct today and silently wrong the
first time the formula moves. `tests/constants.test.ts` recomputes each from its
inputs, and separately asserts every constant has a reader — **a code read**
(`C.X`, or `BASE.X` in the derivations), with comments stripped. It used to
count any mention, so the comment recording a constant's removal made the
constant look read if it came back.

**The continuous-run boundary is `mix-6`, pinned by id.** The general rule — "a
pause with a speed step still ahead of it" — is **template-scoped and does not
survive §8.2a expansion**: after expansion `mix-8#1` is followed by the whole of
mix 2, so the rule classifies the changeover as interrupting a run. A test pins
that failure. A new pause in the mix phase is something a person classifies.

**Three wall-clock bases for a mix, spanning 7¼ minutes at `nMix = 2`** —
nominal mid-range 26.4 per mix, phase maxima 30.0 (the duty-cycle basis), §4.7
planning 30.0. Since Phase B went to 7–9 min (MESSAGE-60) the maxima and the
planning number agree, which is a coincidence, not a reason to rebase. The
timeline and each dough's own clock (`mixEndsAtH`) both use the **planning**
basis, so the earlier doughs' printed times and the schedule describe the
same session.

**Each dough runs on its own clock** (§4.8, MESSAGE-61, Dave's practice since
bake 3). Every mix goes into its own container: its bulk starts at the end of
its own mix, it divides its own balls, it rises from its own final reading
(`roomMinutesByDough`; a dough not yet read plans at DDT), and its balls go in
the fridge when that rise ends. **The timeline plans the last dough**, and the
bulk and rise rows print each earlier dough's end time beside them
(`earlierDoughEnds`, "Ends 10:35 AM (dough 1 10:00 AM)"). `ScheduleAdjustments`
takes `earlierRisesH` and refuses a list that doesn't match `nMix`. Nothing is
shortened for the gap between the mixes: **`stagger`, `staggerUncentred`,
`plannedBallRiseH`, `{ballRoomMin}` and the three stagger tokens are gone**,
with `bulk-1`'s warning and the strip's. Re-adding any of them re-imposes one
shared tub. `bulk-1`, `bulk-2` and `bulk-3` carry one timer per dough at
`nMix > 1` (`timerSlots`, pinned by id in `PER_DOUGH_TIMER_STEPS`, keyed
`bulk-3~dough-2`; ticking the step stops them all through `isTimerOf`), and
inside each, `{roomMin}` binds that dough's rise (`tokenValues`' `doughIndex`;
left out, the last dough's). `bulk-3`'s chip shows only when every dough's
label agrees.

**Ball counts split evenly between the mixes** (§6 Panel 1, MESSAGE-61, Dave's
call), so every dough makes whole balls. The rule is `src/lib/ballCounts.ts`:
the stepper skips a disallowed count in its direction (`stepToEvenSplit`; 18
↔ 21 at 265 g), and everything else rounds up (`roundUpToEvenSplit`: a
ball-weight change in `applyInput`, a link or stored value in
`decodeInputsWithReport`). 24 is allowed at every weight, so rounding ends. The
field says "Raised to {balls} balls…" while the raise holds (`raisedNote`,
from the count the baker chose against the count in use). **Any sweep over
the envelope skips disallowed counts** (`splitsEvenly`): several §5 extremes
sat at counts that can't be entered (19 × 257 g, 9 × 272 g).

**`DDT` goes by balls per mix** (§4.2, MESSAGE-61): 75 at 6 or fewer per mix,
74 at 7 or more. `ddtForBallsPerMix` is named for its key so nothing passes a
total; `defaultDdtFor` takes a batch. A 12-ball batch matches a 6-ball one in
every per-mix figure, and a test holds it to that.

**The mix profile is asserted against `MAX_RUN_MIN` at build time, not warned
about at runtime.** Phases A + B + C run back to back — the probe pause is
treated as *not* resetting motor thermal load, the conservative reading — and
`mix-6`'s rest breaks the run, so Phase D starts fresh. The sum is derived from
the step content rather than transcribed, so extending a phase in §8.2 moves it
automatically; that is the whole purpose, since a runtime warning could never
fire on a fixed profile with 1.5 minutes of headroom (18.5 of 20 since
MESSAGE-60's Phase B; Phase C at 7 minutes lands on exactly 20). Phase C contributes its
§4.6 authority ceiling (5.5 min), not the 3–4 printed on the card.

**Split-batch duty cycle is deliberately unmodelled.** The motor runs 39.0 min
at the phase maxima inside 57.8–65.0 min of wall clock at `nMix = 2`, which is
not a continuous run. Ooni
publishes a continuous figure and no duty-cycle guidance, so there is nothing to
compute against — and a bound invented for the occasion is how the yeast table
went wrong. Don't model it, don't warn on it.

**Scope goes in the token name.** Bare means a batch total; `PerMix` divides by
`nMix`. (`PerBiga` went with `nBiga` in MESSAGE-53.) Three scope bugs in three
rounds — the worst put 423.2 g of water into a 211.6 g mix — so this is naming,
not attention.

**The §8 prose is generated from the spec and guarded by a test.**
`src/content/steps.ts`, `concepts.ts`, `reference.ts` (§9 and §11) and
`capacity.ts` (§7.3's capacity messages and §6's split hint) are generated by
`python3 scripts/generate-content.py`, and `tests/steps.test.ts` re-parses the
spec on every run and compares character for character. To change step or
concept prose, edit the spec and regenerate — hand editing those files turns the
suite red, which is deliberate.

The generator and the test parser implement the same grammar twice **on
purpose**: the generator writes the content, the test independently re-derives
it, so a parser bug surfaces as a mismatch rather than as both agreeing on
garbage. If you change one, change the other.

**Two copies only protect you where they differ.** Both parsers used to match
conditional blocks from the same hard-coded list of conditions, so `bulk-2`'s
`openDiameterCapped` block was dropped by both and the verbatim test passed.
They now match markers generically, end each step at the next `###` section
(`mix-8` used to swallow all of §8.2a), and **refuse any `**marker:**` neither
knows** (`KNOWN_MARKERS`, in both files). New spec grammar fails the build
until both parsers are taught it — that is the point. Which *conditions* are
valid is decided where they are resolved: `detailConditionHolds` for blocks
inside a step, `shownWhen` for whole steps. Both are closed sets that throw.

**Every number in §8 is either checked against the engine or classified.**
`tests/steps.test.ts` compares prose to prose, so a stale literal passes it —
`mix-4` rendered `DDT − 3.6 / 3.7` for eight rounds that way.
`tests/contentLiterals.test.ts` closes that: `CLAIMS` rebuilds every literal
that restates a computed value from the engine and requires it verbatim;
`FIXED` lists every other literal with the reason it isn't computed. **When the
spec's §8 changes, expect this suite to fail on the new numbers** — that is the
reproduce-before-adopting step, made mandatory. Reproduce each one and add a
claim, or classify it with a reason. Never widen `FIXED` just to go green: a
computed value filed as fixed is the defect this exists to catch. A known
disagreement the spec author must fix gets `knownWrong`, which is pinned both
ways. **A claim's `covers` must be literals at its location that its text
builds** (FINDINGS-55): nothing checked them, so after the bowl change four
claims still listed "965 g", "115.8", "13.0" and "0.901", and `biga-4.detail`'s
"2 hours" was excused by a claim whose text never produced it. **It walks every string a step carries** rather than a list of fields —
a list of six hid MESSAGE-31's per-track timers and every title — and reads the
timeline's stage titles and descriptions (`STAGE_INFO` in `timeline.ts`). Concepts
and §9 sections are walked the same way: until FINDINGS-52 it read only their
bodies, and four concept titles carry figures. The
token check in `bindTokens.test.ts` walks the same way, for the same reason.
**Any new scan over step content should walk, not list.**

**The same applies to UI copy.** The gate reads §8, so a figure typed into a
component is invisible to it: the ball-weight hint said "265 g opens to about
11.5–12 inches" for three rounds after §4.9 retracted it. **All component copy
is read from the syntax tree** (`parseAst`, which Vite exports; TypeScript 7
has no JS API): JSX text, copy attributes, template text and strings in `{…}`
children, **and strings in object and array literals**, in every `.tsx` under
`src` (`App.tsx` included). Markup is skipped by shape (a CSS color, or a list
of lowercase hyphenated tokens), not by key, since a Tailwind map's keys are
tones. Reading only inside JSX hid the Calibration panel's `FRICTION_HINT`
— which told the baker each bake is corrected "to the middle of every phase
time" for a round after MESSAGE-59 — and the Batch panel's two schedule
descriptions, four rendered figures nothing had ever checked. Every numeric
string there is classified in the same suite, and a
computed figure comes from the engine through an interpolation. Each widening
found live wrong copy — the probe card's "3.7 °F" and the timeline's "9 a.m.
and 8 p.m." were JSX text. `src/lib/recipeText.ts` builds copy too and the gate
doesn't read it; bind figures there by hand. **The gate checks numbers, not
sources** — a claim with no digit in it passes by
construction, so sourcing worded claims stays a human read.

**Do not shorten the prose in spec §8.** The step `detail` blocks are the point
of the app, not decoration on it. They are the reasoning that makes the recipe
worth following rather than obeying. Use them verbatim: don't summarize, don't
rewrite in your own voice, don't trim for brevity. If a detail feels long for a
UI, that's what the disclosure is for — collapse it, don't cut it.

**Don't round intermediates.** Round only for display: flour/water/salt/dough to
1 decimal, ADY to 2, temperatures to 1.

**Thermal weights are per-mix, never batch totals.** §4.2 — `C_bowl` is one
bowl and the bowl faces one mix at a time, so a 12-ball batch is a 6-ball
thermal system twice over. Feeding batch totals in put the water 2.8 °F low at
12 × 265 g with the biga at 58 °F (DDT 75), and 1.5–6.4 °F across the allowed
envelope (20 × 244 g to 18 × 272 g, MESSAGE-61). §4.2 has the closed form, `C_bowl × (DDT −
T_bowl) × (nMix − 1) ÷ (Cw per gram × batch dough)`: it grows with the
DDT-to-bowl gap and shrinks with batch mass, and room and flour cancel out of
it. `engine.test.ts` checks it against the engine. `computeThermal` takes `nMix`, which is why `calculate` computes
capacity *before* thermal. Two consequences that catch tests out: nothing is
monotonic in total balls any more (12 wants hotter water than 9), and
`probeTargetF` must be asserted on per-mix ball count.

**Dough-only and observed are different quantities.** `FF` and `FRICTION_RATE`
are dough-only, to match the `FF × Ct` work term; a thermometer reads the dough
after it equilibrates with the bowl. Anything compared against a measurement
needs `× Ct/TOT`. Everything routes through `observedRate()` so the two cannot
drift apart — conflating them is what produced the old `DDT − 4` rule, wrong by
1.2 °F at 3 balls, in two documents across several review rounds.

**The bake log stores readings, never an FF** (§10, MESSAGE-45). Every FF is
solved on read (§4.3) and corrected for **Phase C's time only** (MESSAGE-59),
at the 30% `FRICTION_RATE`, with no `Ct/TOT` factor (both sides are
dough-only). Phase C is the one phase the baker sets from a temperature, at
`mix-4`'s probe, and the only rate a bake has checked; A, B and D are run to
their cues, so their times are the dough's own behaviour. `CORRECTED_PHASE`
pins it by key. The reference comes from the step timer (`MIX_PHASES` in
`mixPhases.ts`, which the engine reads too), so a moved range re-normalizes
every bake and moves the probe target. **All four timers are still logged and
still required for a mix to count** (§10), so `phaseMinutes` stays.
Reinstating the four-phase rule now breaks bake 1's seed at module load: bake
1 logged no A, B or D time, and nothing synthesizes them at their references
any more. A bake mixed under
another formula (its snapshot) isn't solved or counted. The FF in use is §6's
four-step rule, keyed on the `(balls, nMix)` pair compared by
cross-multiplication, never a rounded float. **There is no typed FF and no
override**: a typed value would outrank the measurements. `BAKE_1_SEED` ships
in code, so a new device and a friend's browser start from it. **Its value is
bake 1's readings (`BAKE_1_READINGS`) solved and normalized for Phase C by the
log's own functions**, 10.787531 at the 963 g bowl, never typed (MESSAGE-52).
It moved from 10.791045 when the bowl was weighed (MESSAGE-54) without anyone
touching it, which is the point.

**The temper doesn't move bowl and biga together** (§4.2, §7.2, MESSAGE-63).
The bowl reads 9–10.5 °F above the biga at mix 1 after the hour, so `biga-6`
quotes `Cb/Cw` (1.6 at every size) for a biga read beside a read bowl, and
"about 2 °F" (`(Cb + C_bowl)/Cw`) only for a skipped temper. The prefill stays
`T_biga` anyway, Dave's call: it runs the mix-1 target warm by `C_bowl/Cw` ×
the gap until the bowl is read, and a prefilled bowl doesn't count toward
the FF. Don't move the prefill to "fix" it.

**Per-mix readings are read by index, except the biga.** `bowlTempF` and
`finalDoughTempF` hold one entry per mix, and a missing entry is that mix
unread: the bowl's warm prefill, and DDT for that dough's rise. `atMix` carried mix 1's bowl forward and printed mix 2's water
4.6 °F too warm (FINDINGS-46); `bowlReadingAt` and `finalReadings` exist so
that can't recur. Only the biga carries forward, because it is the same biga
until re-read (§6). Display through the same functions: the old panel showed
mix 1's biga on mix 3 while the engine used mix 2's (FINDINGS-55).

**The day's readings live in `mix-1`, not in a panel** (§6 *Readings in the
steps*, MESSAGE-54, Dave's call). `MixReadings` renders room and flour (with
"Same as room") on mix 1 only, biga and bowl on every mix, then that mix's
water target directly under them, then that mix's water warnings. There is
no Today's temperatures panel, no water card and **no bowl-state selector**:
mix 1's bowl prefills from its biga reading, later mixes from DDT
(`bowlPrefillF`), and a reading always wins. Labels and hints are §6's table
and nothing more: no sensitivity figures beside the fields. The water
warnings belong to a mix (`MixTarget.warnings`), never the strip; the strip
keeps capacity and overnight stages. The target stays bare: its
`thermal-model` link is `mix-1`'s `concepts` field, under the detail
(MESSAGE-55). Three concept links sit outside the steps (§8.3, MESSAGE-60):
the Calibration panel's `friction-factor`, the cold-ferment slider's
`schedule-architecture` and the ingredients card's `formula-rationale`, named
in `PAGE_CONCEPT_LINKS` and rendered by `ConceptLink`. **Every concept must be
opened from somewhere**: three were reproduced verbatim and opened by nothing
until FINDINGS-60, and `steps.test.ts` now fails on that. `bigaReadingCost`,
`bowlReadingCost` and `bowlTracksBiga` stay in the engine because §7.2's two
bases are tested, though nothing renders them. A link's `bowlst` is ignored;
don't reuse the key.

**The inputs are stored and written to the URL** (§6 *Where the inputs are
kept*, MESSAGE-65, APP-3). Until then they lived only in the URL, and a
home-screen app on iOS reopens the address its icon was saved with: Dave's
batch settings came back at their defaults beside his stored ticks and
timers, and mid-bake the readings would have gone too. Storage holds
**what `encodeInputs` writes** (`Persisted.inputsQuery`) and reads it back
through the codec, so the even split, each track's cold ferment, the
temper's range and the ignored keys apply with nothing restated. **null is
nothing stored; '' is every input at its default**, and they differ: a
home-screen app with nothing stored takes its launch URL, one with '' does
not. The load rule is `resolveInitialInputs` in `src/state/storedInputs.ts`,
pure, the first case that applies: (1) a home-screen app
(`navigator.standalone`, or `(display-mode: standalone)`) takes what is
stored and ignores its launch URL; (2) a URL with any input key is a link,
it wins whole (never merged with the stored inputs) and **is stored when it
loads**, by the hook's first persist; (3) a bare URL takes what is stored;
(4) the defaults. After load every input change writes both, Reset
included: `persistedForNewBake` (in `storedInputs.ts`, since it needs the
codec) stores `inputsForNewBake`'s result, every input at its default
(`''`), so the stored inputs are a fourth Reset category, "follows the
inputs". The first persist writes only the
inputs, and only when they differ: writing the rest would fix a fresh
session's biga start, which '' reads as now. There is **no web manifest**
(MESSAGE-65 kept it out), so rule 1 rests on iOS opening the icon
standalone.

**Save records the inputs as they stand** (§10 *Capture and saving*, Dave's
call in MESSAGE-47). Nothing tracks which values were typed or when: a
default left in place (room 70, biga 58) and a value from a link are
readings. A bake stores plain temperatures, with `null` for a final that
has no value, and `bowl_prefilled` from the bowl field's own prefill state
(§6), because a prefill is biased high and the mix mustn't count. **The
water is logged as its target** (MESSAGE-56, Dave's call): there is no
water-poured field, and Save stores each mix's target `roundTo(…, 1)`, what
`mix-1` prints, in `water_temp_used_f`. Stored, never derived on read: a
corrected constant must not recompute what went into the bowl. A mix whose
stored water is outside `WATER_MIN_F`–`WATER_MAX_F` doesn't count
(`waterRange`), since a target past either end can't be blended. Older bakes
keep the water they were typed with, and a `null` there still leaves the
mix out. A link's `water` is ignored; don't reuse the key. New
bakes don't write `bowl_state`; an older bake keeps it (`LegacyBowlState`,
carried so a rewrite doesn't strip it) and nothing reads it, so an unknown
value is dropped rather than rejecting the bake. **The
page's Reset starts a new bake, and it is the only reset** (`NewBakeReset`,
above the panels; MESSAGE-48 removed the Steps header's). It asks, then
`inputsForNewBake` and `persistedForNewBake` decide every field: **every
input** (the batch settings, the schedule's adjustments and today's
readings), the DDT override and the timeline's anchor go back to their
defaults; the checkboxes, timers and session bake are cleared; the timeline
mode, the open panels and the log stay. **The batch settings and the
adjustments reset since Dave's call on 10 Nov 2026** (FINDINGS-67, in §10
since MESSAGE-67). The confirmation names "the schedule adjustments", since
on the page they sit in the timeline card, not the Batch panel. In backward mode the hook then takes
the bake time the reset start implies, as a mode switch does, so a reload
doesn't drop to forward. `state.test.ts` requires every input and every
persisted field to be classified, so a new one forces the decision, and
`steps.test.ts` holds the confirmation to §10's copy. A bake is dated by the day its first mix
started (mix 1's Phase A timer), and saving over the session's bake from an
earlier date asks first (`saveConflict`). **The bake is saved at the end of
the mix** (MESSAGE-50): nothing the log stores comes later in the schedule, so
nothing on the card may wait for a later stage. **The four timers the log
reads carry §7.5's "Logged" tag** (`loggedTimerTag`, keyed on `MIX_PHASES`),
"Logged · 3:42" once stopped, and no other timer does. It sits on its own line
in the timer card: beside the label it wrapped "Before the window" at 375 px
and not "In the window", so the card changed height as the phase turned.

**Step-level warning blocks are gone from the grammar** (MESSAGE-61 removed
the last, `bulk-1`'s stagger warning, and §8 no longer describes the marker).
Both parsers now refuse `**warning, shown when …:**` as unknown; a new one
needs both parsers, a closed condition set and a renderer.

**`MIN_BALLS` is 3, and it is an input constraint rather than a warning.** Two
balls clears the mixer's 500 g floor on paper but won't let a spiral hook grip,
*and* asks for 126 °F water at the hot corner (biga 45, room 60, the FF in
use). The arithmetic still scales below 3 for hand mixing; don't build a
hand-mix mode.

**There is no ice model, and re-adding one is a regression.** §4.4 was rewritten
to output a target water temperature and nothing else — no ice/tap split, no
`iceEffF`, no latent-heat term, and no tap or freezer inputs. The user blends
fridge-cold and tap water by hand, measuring as they pour. Ice bought precision
that wasn't needed and cost reliability that was: it depended on every gram
melting before the temperature reading, and a miss there poisons the measured
FF. The only surviving mention is the sub-38 °F warning, which on the
retarded-biga schedule never fires — across the supported envelope the required
water bottoms out at 59.9 °F on any mix at the FF in use before a counted bake,
and at 53.2 on a first mix at the vectors' FF 14 (§5; `engine.test.ts` sweeps
every mix).

**`C_BIGA` is derived, never hardcoded**, so it follows if `BIGA_HYDRATION`
changes. Same principle for the thermal weights — compute them from component
heat capacities.

**The mixer bowl is part of the thermal model and is not optional.** Any
formula without a `C_bowl` term is the superseded version; omitting it put the
water temperature 5 °F wrong on bake 1. Two traps:

- **`FF × cTotal`, never `FF × cSystem`.** FF is defined as the rise the mixer
  produces in the *dough alone*. Reversing this returns a plausible-looking
  water temperature several degrees off.
- **Nothing bowl-inclusive is scale-invariant.** The bowl is fixed mass while
  the dough scales. Dough-only ratios (`Cb/Ct` etc.) still are; anything divided
  by `cSystem` is not, and the old `3.00 ×` shortcut is dead — don't reintroduce
  it as a fast path.

**Three tabs, and every one stays mounted** (§13.1, APP-6, MESSAGE-70).
Recipe, Toppings and Bake log (`src/lib/tabs.ts`); `TabBar` is one element
that is a bar fixed to the bottom below 768 px (`md`) and a sticky strip
under the title from it, decided by width. Hidden panels are `hidden`, not
unmounted, so each keeps its in-memory state (reopened rows, a half-written
idea), and `App` keeps the window's scroll per tab and puts it back in a
layout effect. **A switch finishes an edit first** (`finishEdit`), as a fold
does. **The bar hides while a field that takes typing has focus**
(`useTypingFocus`): nothing reports the iOS keyboard, and a focused field
removed from the page fires no blur in WebKit, so a MutationObserver watches
for it while focus is in one (Save on an idea left the bar hidden until it
did, found by the suite). The open tab is `Persisted.tab`, *Kept* by Reset.
**`initialTab`**: a link opens on Recipe, and "a link" is a URL whose inputs
differ from the stored ones, since the page writes its own inputs to the
address bar and a reload would otherwise land on Recipe every time. The
log's drawer is gone: `BakeLogPage` is the tab, and the Calibration panel's
and the log card's links are its only openers. "Share setup" sits on the
Recipe tab. The Recipe tab's mark is `recipeTabMark`, the closed group
heading's mark over the whole list: outlined before the lower bound, filled
from it.

**The topping ideas have their own store and their own sync run** (§13.2,
§13.3). The rules are `src/lib/toppings.ts`: a name always, pre-bake once
rated (`ideaProblem`, `canRate`; a rating picked without it is refused in
§13.2's words), 1–5 in half steps (`RATINGS`, `isRating`), Tested by rating
then `updated`, Untested by `created`. The store is `toppingsStore.ts`
(`TOPPINGS_KEY`, its own dirty and deleted lists) and the hook
`useToppings`, apart from `useAppState`, so a failed toppings sync never
holds up the log, and the reverse; they share only the sign-in. **The log and
the ideas run one sync algorithm, `src/state/repoSync.ts`**, parameterized
by a `RecordKind` (folder, id, parser, commit messages); `githubSync.ts` and
`bakeLogStore.ts` wrap it with their old exports, so the bake log's tests
run unchanged against it. A kind may say `keepRemote`: the ideas keep the
repository's copy when it was saved later (`remoteIsNewer`), which is how
§13.3's "the copy saved last wins" is built; the log has none, so its last push
wins as before. **A sync's rerun waits for its result to render** (`rerun`,
in both `useAppState` and `useToppings`): a change made mid-sync asks for
another, which runs from an effect once the merged store is in `logRef` or
`storeRef`. Calling `syncNow` straight away read the store from before the
merge, fetched every record again and marked each pulled one as changed
here (found on the preview, a WebKit test pins it). **Between a deletion and an edit the device syncing last
wins**: a deletion removes edits it hasn't seen, and an edit synced after a
deletion it hasn't seen writes the idea back (FINDINGS-72, pinned in
`toppings.test.ts`). Reset and a shared link never touch the ideas. A card's header is
the name with its stars under it (stars only, Dave's call on 11 Nov; the
number is the screen-reader label), and Edit at its right once open, so
the editor opens below the tap. Their four
text fields render through `<Markdown breaks>`, which keeps single line
breaks (`markdownBreaks.ts`, a remark plugin over text nodes only); **only
`Toppings.tsx` passes `breaks`**, and a test holds that, so §8 prose
renders as standard Markdown. Links in the shared renderer open in a new
tab with `rel="noopener noreferrer"`; raw HTML shows as text. **`comments`**
(APP-7, MESSAGE-72) is how the pizza tasted, below Notes in the editor and
on the card, left out when empty; `notes` holds the recipes and advice.
**`parseIdea` keeps keys it doesn't know** and `savedIdea` spreads the
previous copy first, so a later field (APP-8's photo) survives an edit on
an older bundle; the APP-6 bundle had no such rule and drops `comments`.
**Expand all / Collapse all** sits above both lists (`openIds` in
`ToppingsPage`, not stored). A card being edited counts as open and stays
open through Collapse all (`shown = open || editing`). Collapse all holds
the page at its old height (`heldHeight`, released by Expand all and Add
idea), so a page scrolled into the lists can't clamp and slide the control
from under the finger; the WebKit suite fails without it. It goes as soon
as its going moves nothing (73a): the page without it still reaches the
bottom of the screen.

**Each idea may have a photo** (§13.2, §13.3, APP-8, MESSAGE-73). `photo`
is `photoName(id, sha256)`, the id and 12 hex of the JPEG's hash, so a new
photo is a new name and a copy of an idea always names the file it was
saved with ("a photo follows its idea"); `parseIdea` refuses an unsafe one.
The picked file is decoded through an `<img>` (EXIF orientation applied,
HEIC where the system decodes it) and drawn to a canvas at 1600 px on the
long side, JPEG 0.82 (`photoImage.ts`; the pure sizes in `src/lib/photos.ts`).
**This device's photos live in IndexedDB** (`photoStore.ts`, keyed by name,
with writes held in memory until they land), token or not; the closed card's
112 px thumbnail is made from the photo and kept there under `~thumb`,
never synced. **Photos aren't a `RecordKind`:** the ideas' sync drives them
through two optional hooks in `repoSync.ts`. `beforePut` uploads an idea's
photo just before the idea is written (only once the sync has decided to
write it, so a copy that loses to `keepRemote` uploads nothing);
`afterSync` deletes the queued old photos (`deletedPhotos`, queued by
`upsertIdea` and `removeIdea`) unless an idea still names one, then fetches
every named photo this device lacks through the **git blobs API**, which
answers JSON at any size where the contents API stops filling `content` at
1 MB. The bake log passes neither hook. A change in the editor waits for
Save; Remove doesn't ask. **Photos show square** (Dave, 11 Nov, mid-round:
a pizza is round), `object-cover` in a square box, on the card and in the
editor; the stored JPEG keeps its frame.

**The Worker is the one place a mistake exposes the repository** (§14,
APP-10, MESSAGE-75). `worker/app.ts` is every `/api/` route, written
against web-standard APIs only, with its storage, clock and GitHub `fetch`
passed in, so `tests/worker.test.ts` runs it in Node with real WebAuthn
signatures (`tests/fakeAuthenticator.ts`). `worker/index.ts` wires it to
one Durable Object (`AuthStore`, SQLite-backed), which holds the passkeys,
the sessions (keyed by a SHA-256 of the cookie, never the cookie) and the
setup code's wrong tries, and handles one request at a time, so a challenge
can't be used twice. The Worker entry buffers each body before the object
sees it. **The pass through is an allow-list, relative to one repository
fixed in `wrangler.jsonc`'s `vars`**: `GET` the repository, `GET` a listing
of `bakes`, `toppings` or `toppings/images`, `GET`/`PUT`/`DELETE` a
`.json` in the first two or a `.jpg` in the third, `GET` a git blob.
Anything else is refused before the token is attached: another path,
another method, a query, `..`, a backslash or **any percent escape**
(refused, never decoded). Writes pass only `message`, `content` and `sha`
(`allowedWriteBody`), so no `branch`, `committer` or `author` reaches
GitHub. Answers lose `download_url` (a private repository's carries a
short-lived read token). **GitHub refusing the token comes back as 502,
never 401**: a 401 means only that this device's sign-in lapsed, and the
page turns to signed out on it (`SyncErrorKind` `signedOut`), keeping its
local copies. The page's sync sends to `API = '/api/github'` with no
`Authorization` header; `tests/auth.test.ts` fails on `api.github.com`,
`Authorization`, `/repos/` or the repository's name anywhere in `src/`.
**The cookie** is `__Host-pizza-session`: HttpOnly, Secure,
SameSite=Strict, Path=/, 90 days from the last use, re-sent at most once a
day. Every write must carry this address's `Origin`. **The RP ID is the
request's own host** (`pizza.dave-becker.com` in production), so a passkey
made on the preview works only there. **The setup code** is compared over
SHA-256 digests in constant time; five wrong tries in ten minutes, over all
addresses, refuse every try, the right one included, until the oldest
leaves the window. At most 20 challenges are held (the oldest goes), since
asking for one needs no sign-in. **The secrets `GITHUB_TOKEN` and
`SETUP_CODE` are Dave's**, set with `wrangler secret put`, never in the
repository or a test; the test values in `playwright.worker.config.ts` are
for the local run only. The page keeps one flag of its own
(`SIGNED_IN_KEY`), replaced by `/api/session`'s answer whenever there is
one, and §10's *Kept* list keeps it through Reset.

**`wrangler dev` rewrites the host to the production route** (`http://
pizza.dave-becker.com`), which the Worker refuses as plain http; pass
`--local-upstream localhost:<port>`, as `npm run worker:dev` and the
Worker suite do. **Chromium's virtual passkey counts its signatures**, and
the Worker refuses a count that goes backwards, so a test that copies one
to a second device copies it after the first device's last use. Synced
passkeys (iCloud, Bitwarden) send 0, which isn't checked.

## Design priorities, in order

1. **Correctness.** Verify against the spec §5 test vectors.
2. **Kitchen usability.** Read on a phone propped against a mixer by someone
   with flour on their hands. Large type, big touch targets, no hover-dependent
   UI, no tiny controls.
3. **Progressive disclosure.** Steps terse by default, every one expanding into
   the full explanation.
4. **Shareable/resumable state.** Settings and the day's readings survive a
   refresh and a closed app, and send as a link.

## Writing anything someone reads

**Always follow the humanizer's 26 patterns** (Dave, 12 Nov 2026;
https://github.com/blader/humanizer#the-26-patterns). Before that it was the
same list at 25, from MESSAGE-35. **They apply to all text a person reads
that this side writes**:
- on the site: component copy, hints, labels and buttons, the engine's
  warnings (`engine.ts`), timeline stage text (`timeline.ts`), copy-as-text
  (`recipeText.ts`), and any wording we propose for the spec;
- for Dave: chat replies, FINDINGS, issue and PR text, and the spec's app
  sections.

§8 prose itself is the recipe agent's to word. If it breaks a rule, say so
in the FINDINGS rather than editing generated files.

**The goal is clarity, directness and concision, without going casual.**

The 26, in the humanizer's groups. Those marked *weak alone* count only
when several tells share a passage.

A. Staging instead of stating
1. **Not X but Y.** State the point; don't set it against something it isn't.
2. **One-line closers and dramatic fragments** that repeat the point.
3. **Sayings that sound deep.** "This bites hardest exactly where it matters
   most" became the specific claim.
4. **A run-up before the point** ("Let's dive in", "Honestly?").
5. **Arguing with no one.** "You are not aiming at the final temperature when
   you probe" raised an objection nobody made. State the fact: "After the
   probe, Phases C and D still add about X °F."

B. Rhythm by rule
6. **Forced threes.** List as many items as there are.
7. **Repeated sentence openings.**
8. **Dashes as the universal connector** (*weak alone*). Em dashes stay
   allowed (Dave, MESSAGE-35), just not as the default joiner.
9. **Stacked qualifiers** (*weak alone*).
10. **Hyphenated pairs grammar doesn't need** (*weak alone*).
11. **Passive voice that hides who acts** (*weak alone*). Name the baker or
    the app.

C. Inflation and borrowed authority
12. **Overused AI words:** delve, testament, landscape, showcase, crucial,
    robust, genuinely, leverage.
13. **Inflated significance.**
14. **Vague connections** ("associated with", "in connection with").
15. **Shallow -ing phrases** tacked on ("…, reflecting the…").
16. **Sales language.** "A far more powerful lever" and "the highest-leverage
    input" were both cut.
17. **Borrowed authority.** Name the source and what it said, as §11 does.
18. **"Serves as", "features" or "boasts"** where "is" or "has" will do.

D. Formatting by rule
19. **Bold as decoration.**
20. **Decorative headings:** Title Case, emoji, or headings for effect.
21. **Curly quotation marks** (*weak alone*). Our copy, the spec and the
    step prose use straight quotes and apostrophes (Dave, 12 Nov 2026).

E. Leftovers from the chat and the draft
22. **Chatbot residue** ("Great question!", "I hope this helps!").
23. **Knowledge-limit disclaimers and hedged guesses.** Check, then state.
24. **A heading repeated in the first sentence.**
25. **Writing about the document instead of its subject.** On the page this
    includes writing about the previous version ("an earlier version…",
    "was changed to", "no longer"): describe what it does now. History
    belongs in `docs/`, never on the page.

F. Writing for the wrong reader
26. **Re-explaining what the reader knows.** Go to the decision or the
    result; don't walk Dave back through context he already has.

Three rules the pass itself taught:
- **A reworded sentence must still be true, so check the claim, not only the
  tone.** "The highest-leverage input in the model" read fine and was false.
  FF and DDT each move the water target about 3 °F per °F, and the biga 1.6.
  The gate can't catch this, because a claim with no digit passes it by
  construction.
- **Never change a figure, or a phrase a test pins as a claim.** Reword around
  it. The gate's `COMPONENT_FIXED` keys are exact phrases.
- **Mirror the spec wherever the UI repeats it.**
  - The Temper stage says "measured with a probe", as `bake-1` does.
  - Dave's calls apply everywhere: there is no "weigh it" in a value line,
    whether in the chip or in copy-as-text.

## Commands

```bash
npm run dev        # dev server
npm test           # vitest, single run
npm run test:watch # vitest, watch mode
npm run test:e2e   # the iPhone suite: WebKit as a home-screen app (e2e/)
npm run test:worker  # the real Worker in workerd, a fake GitHub, Chromium's
                     # virtual passkey (e2e-worker/)
npm run test:preview # the same Done-when against the preview deploy; needs
                     # PREVIEW_URL and PREVIEW_SETUP_CODE, skips without
npm run typecheck  # tsc --noEmit, the page and the Worker
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ locally (no Worker: the page is signed out)
npm run worker:dev # the page and the Worker together, after a build
npm run deploy:preview  # build, then deploy the preview Worker (Dave's login)
```

## Layout

```
src/lib/          pure calculation — no UI imports, this is what gets unit-tested
                  engine.ts (§4 formulas incl. the bowl), timeline.ts (§4.7),
                  timers.ts (§7.5), bindTokens.ts ({token} substitution),
                  recipeText.ts (copy-as-text), format.ts (display rounding),
                  constants.ts (§3), mixPhases.ts (the four mixer phases and
                  their references, read by the log and the probe),
                  bakeLog.ts (§4.3 normalization, §6's FF in use and bake 1's
                  seed, §10's counting rules), tabs.ts (§13.1), toppings.ts
                  (§13.2), markdownBreaks.ts (§13.2's line breaks),
                  photos.ts (§13.3's photo sizes and names)
src/content/      step and concept prose (steps.ts, concepts.ts)
src/components/   React components
src/state/        URL + browser-storage persistence (the inputs in both:
                  storedInputs.ts holds §6's load rule and the opening tab);
                  the bake log's local copy (bakeLogStore.ts), its GitHub sync
                  (githubSync.ts) and the session as a bake (sessionBake.ts);
                  the topping ideas' store and sync (toppingsStore.ts) and hook
                  (useToppings.ts); the one sync both run (repoSync.ts);
                  the photos' local store (photoStore.ts) and shrink
                  (photoImage.ts); this device's sign-in (auth.ts)
public/           icon.svg (browser tab: the pizza alone, transparent) and
                  apple-touch-icon.png (iOS home screen: on orange, 180 px,
                  full-bleed square, since iOS rounds it); _headers, the
                  page's Content-Security-Policy, served by Cloudflare
worker/           the Cloudflare Worker (§14): app.ts every /api/ route,
                  index.ts the entry and the Durable Object; its own tsconfig
wrangler.jsonc    the Worker: assets from dist/, the object, the repository,
                  the custom domain; env.preview for the workers.dev preview
tests/            vitest suites; vectors.ts holds the spec §5 acceptance data
e2e/, e2e-worker/ the WebKit iPhone suite; the real Worker in Chromium
docs/             the spec, its source recipe, and the correspondence
                  that settled the revisions
```

`src/lib/` must stay importable from a plain Node test with no DOM. Keep React
out of it.

**All rounding lives in `format.ts`.** The engine returns full precision;
anything that puts a number in front of a person goes through a formatter. That
is what makes "don't round intermediates" enforceable rather than aspirational —
don't inline a `toFixed` somewhere else.

## Gotchas

- **`base` in `vite.config.ts`** is `'/'`: the Worker serves the page from
  the root of `pizza.dave-becker.com` (§2, §14). Until MESSAGE-75 it was
  `/pizza-calculator/` on GitHub Pages; the WebKit suite runs at the root
  and fails on any asset under the old path.
- **No router.** Concepts render as a drawer rather than routes. `/api/*`
  belongs to the Worker (`run_worker_first`), so a route there would never
  reach the page.
- **The page's Content-Security-Policy** is `public/_headers`: everything
  from this address only, images also from `blob:` and `data:`, no frames.
  A script or style from anywhere else needs a line there.
- **Tailwind v4** — configured via the `@tailwindcss/vite` plugin and an
  `@theme` block in `src/index.css`. There is no `tailwind.config.js`.
- **Test tolerances.** Spec §5 quotes ±0.1 g / ±0.1 °F, but its table values are
  already rounded to 1 decimal, so assertions that sum several of them need a
  wider tolerance. `tests/vectors.ts` exports `TOL`; see the note in
  `tests/vectors.test.ts`.
- **Timeline arithmetic is in absolute milliseconds, never calendar fields.**
  Fermentation follows the thermometer, not the clock, so a stage lasts its
  stated number of real hours across a daylight-saving change. Tests pin
  `TZ=America/New_York` (set in `vite.config.ts`) so those cases are
  deterministic.
- **Markdown must render tables.** Step `detail` and concept `body` contain GFM
  tables and multi-paragraph prose — `react-markdown` + `remark-gfm`, not a
  text renderer. **`watchFor` is markdown too** — `mix-7`'s cue carries
  `and **DDT ±1 °F.**`, and rendering it as plain text put literal asterisks
  around the one number that decides whether the mix is done. A test pins
  that `StepList` hands it to `<Markdown>`.
- **Timers are end times, not counters.** Everything derives from an absolute
  `startedAt` against a `now` passed in, so a locked phone or a reload returns
  the right answer. Never introduce a decrementing counter. **A timer stops**
  (`stoppedAt`): Stop, or ticking its step, freezes it, and a stopped mixer
  phase is the phase time the log records. **A stopped timer resumes** (§7.5,
  APP-4, MESSAGE-67): Resume carries the count on, the pause left out, on
  every timer. `startedAt` stays the first start (§10 dates a bake by it),
  the pauses add up in `pausedMs`, and `resumedAt` marks the current run.
  **Every elapsed reading goes through `timerElapsedMs`**: the card, the due
  time, the Logged tag and the log's phase times. A test fails on any
  start-and-stop subtraction outside `timers.ts`, since that forgets the
  pauses. Unticking a step resumes nothing (`timersAfterTick`). Resume takes
  Stop's spot, so a double tap stops and resumes; Clear sits in the card's
  far corner, its slot held while running so the card keeps one height. Until
  MESSAGE-67 one button read Stop then Clear in the same spot, and a double
  tap cleared a mixer phase's logged time. A stopped timer never beeps and
  never counts as due. **The beep comes when the count crosses the lower
  bound during the current run** (`beepDecision`): a timer resumed at or past
  its bound stays quiet, a reload included, because where the run began is
  stored. Ranges are windows
  (earliest → latest), not deadlines. **The display counts up** (§7.5 since
  MESSAGE-43, Dave's ask on 27 Sep): elapsed time in every phase, floored. The
  phase is shown by tone, label and a bar with the window shaded, never by
  counting down. **Nothing labels the lower bound "ready"**, the tab title
  included ("Check timer"): a window stage is judged by its cue.
- **`ballRoomTemp` is computed, not an input.** §4.8 derives it from the
  measured final dough temperature. It used to be a fixed 1.5 h with a 1–2 h
  slider; both are gone deliberately, because the model runs 45–180 min. It
  depends only on `T_actual − DDT` — **key any table of it on the offset**, never
  on dough temperature alone, which silently assumes DDT 75 and is one row off at
  7+ balls.
- **An unbound `{token}` renders `⟨unknown token: name⟩`, never an empty
  string.** "Weigh  g of flour" looks like the app working. Tests prove no token
  is unbindable and no binding unused.
- **Grid and flex children need `min-w-0` around wide tables.** Items default to
  `min-width: auto`, so a table's `min-width` propagates up and pushes the whole
  page sideways instead of scrolling inside its own `overflow-x-auto` wrapper.
  The page grids in `App.tsx` are `grid-cols-[minmax(0,1fr)]` for the same
  reason: the forward-mode date field beside "Now" pushed the page 15 px past a
  375 px phone from Task 4 until Task 9. **Check phone width in both timeline
  modes** — the Task 8 check ran in backward mode only and missed it.
- **Steps and groups fold** (§7.5, APP-5, MESSAGE-68; the spec matches what
  is built since MESSAGE-69). The rules are in
  `src/lib/stepGroups.ts`: the groups (`groupSteps`: four phases, or one
  group per mix at `nMix > 1` with `mix-0` opening Mix 1), keyed `biga`,
  `mix`, `mix#2`, `bulk`, `bake`; a stored key that names no group at this
  size is ignored, never removed. Which groups are closed is stored
  (`closedGroups`, *Cleared* by Reset). A ticked step folds to its title
  row, reopened in memory only; a running timer holds it open, and **it
  stays open after that timer stops** until its row is tapped, so a double
  tap on Stop can't land on the step below. Water warnings show on a folded
  `mix-1` and under a closed heading; the log card sits outside every
  group. **The beep is not in the card:** `TimerBeeper` is mounted in
  `App`, above the tabs (§13.1, MESSAGE-70), and decides for every live
  timer, since a closed group unmounts its cards and another tab hides the
  list. Ticking, folding a row and closing a group all finish a
  reading being typed first (`finishEdit`), as Reset does.
- **Nothing may appear above the point of a tap.** Content that shows up in
  response to a tap goes at or below it: the Steps header's old Reset pushed
  every step 28 px on the first tick, and the timer note pushed the tapped step
  118 px on Start, both moving the next target out from under a floury finger.
  Reserve the space or render below: the note sits inside the running timer,
  and the page Reset's question takes the button's place and grows down. **Touch targets are 48 px** (`min-h-touch`);
  a small control gets a label around it, pinned with `self-start` so flex
  stretch doesn't turn a whole card edge into the target.
- **The iPhone suite (`npm run test:e2e`, `e2e/`)** runs Dave's device checks
  in Playwright's WebKit as an iPhone home-screen app: the production build,
  a profile on disk so storage survives a force close (`forceClose`, then
  relaunch at the icon's address), `navigator.standalone` true, a paused fake
  clock, and a beep counter. It isn't in CI, and it needs `npx playwright
  install webkit` once. **One iOS behaviour is modelled, not native:** a
  tapped button leaves the field being typed into focused. Desktop WebKit
  moves focus off it, which hid the Reset bug exactly as Chrome did; the
  harness cancels `mousedown` on buttons to keep focus. Still out of reach:
  whether iOS reports a no-manifest icon as standalone, the real keyboard,
  iOS discarding the app, its storage apart from Safari, and the speaker.
  Its first run found that Resume showed up to a minute less than the time
  it stopped at, for a second, because `now` ticks once a minute while every
  timer is stopped; Resume and Start now set `now` at the tap.
- **Number fields commit on blur, not on keystroke.** Clamping mid-type makes a
  bounded field unusable — typing "7" on the way to "70" would snap to the
  minimum. The stepper emits a delta rather than a computed value for the same
  class of reason. **A reading field commits an edit even when it ends on the
  value shown** (§6, MESSAGE-58): `recordsReading` on every field in
  `MixReadings` and the final, decided by `leaveField` in `src/lib`. A bowl
  read at its prefill or a dough finished on DDT was dropped as "unchanged",
  and the mix didn't count. Focus and leave without an edit commits nothing,
  so a glance can't make a prefill a reading. Other fields (ball weight, the
  DDT override) keep the old rule: typing the auto DDT mustn't pin it.
  **Reset finishes any edit, then remounts the fields it changes**
  (`resetCount` keys `MixReadings`, `FinalTempCapture` and the DDT field).
  A field's text follows its value only when the value changes, and iOS
  keeps a field focused through a button tap, so a reading being edited
  when Reset ran stayed on screen and was recorded on leaving: a typed room
  over the default 70 survived, and a focused bowl recorded its prefill as
  a reading (Dave's iPhone, after MESSAGE-65). Chrome hides it, because a
  click there blurs the field first; reproduce it with a scripted
  `.click()`.
- **The bowl mass is a constant, `BOWL_MASS_G`, not an input** (MESSAGE-29):
  the app supports only the Halo Core, whose bowl never changes. There is no
  field, no persistence and no URL key; a stored or linked value from before
  is ignored. `computeThermal` still takes a mass so engine tests can vary it,
  but the app always passes the constant. It is **963 g**, weighed on a
  kitchen scale (MESSAGE-54); 965 was an earlier, rougher reading. Every
  bowl-dependent pin moved in the last decimals, and the seed re-solved itself.
- **There is no opening size** (MESSAGE-51, Dave's call): no diameter, no
  thickness note, no `thickerThanDefault`. The detail-block condition set is
  exactly `nMix > 1`, and a test requires a block for each condition, so one
  left behind by a deleted block fails. `DEFAULT_BALL_G` is only the
  ball-weight default now.
- **One biga at every size** (MESSAGE-53, Dave's call): no `nBiga`, no
  `FLOUR_CAP_55`, no biga-split warning. At `nMix > 1` it is divided once, in
  `mix-0`, and §4.5's information line says so. `shownWhen` takes
  `nMix > 1` as well as the two schedules.
- **The cold ferment's range is per track** (§4.7, §6 Panel 1, MESSAGE-53):
  retarded 6–48 h (24; 48 since MESSAGE-59), classic 6–8 h (6), in
  `COLD_FERMENT_H`. A schedule
  change clamps it, and so does reading a link; a link that omits it takes
  its track's default. `setInput`'s rules live in `applyInput` in
  `defaults.ts`, pure, so `state.test.ts` reaches them.
- **The temper is 1.5–2 h per ball, planned at 1.5** (MESSAGE-53; per ball
  since MESSAGE-60, so the plan is the first ball's); a stored or linked
  2–3 clamps. The timeline prints a range from one hour up in hours ("1 h 30
  min (1.5–2 h)", as `bake-1`'s timer reads), and below an hour in minutes.
- **The divide scales with balls per mix** (12.5 + 1.25 per ball, minutes,
  estimates; total balls from MESSAGE-53, per mix since MESSAGE-61, since the
  last dough divides only its own), on the timeline only: the rise after
  balling isn't shortened for it (Dave's call). The overhead is 26.83 h at 6
  balls, 27.42 at 12, 27.48 at 18 and 28.04 at 24.
- **Speeds render as lit LED segments** (§7.5, MESSAGE-29): the Core has no
  number display. `SpeedIndicator` draws the real indicator as Dave describes
  it (25 Sep; §7.5 records it since MESSAGE-30): **twelve 30° positions round
  the knob with the bottom two missing**, the first segment just left of that
  gap (7–8 o'clock), filling clockwise to 4–5 o'clock; and **a half step is
  the next segment dimmed**, not half-filled. Then "1½ lit segments", then
  "15% · 85 RPM" smaller (`formatSpeedDetail`). No minutes: since MESSAGE-32
  each mixer phase has its own timer, and **the timer is the one source of a
  phase's duration** — the `speed` field is dial and RPM only, and the
  `MAX_RUN_MIN` profile reads `timerMinutes`. Phase D's is 45–60 s, which both
  timer parsers read as 0.75–1 min. Never a setting number — a 2× misread at
  the 40% ceiling is 80%. §8 prose leads with the count too, and the gate
  rebuilds each count as dial ÷ 10 independently of the formatter.
- **The probe target has no FF term** (§4.6, MESSAGE-52). What Phases C and D
  still add is their reference times at their `FRICTION_RATE`s,
  `FRICTION_AFTER_PROBE_F` (4.5325 °F dough-only), times `Ct/TOT`. The phases
  after the probe are read from the step order after `mix-4`, pinned by id
  like `mix-6`. FF decides where the dough is when probed, which is what the
  probe measures.
- **`COOLDOWN_EQUIV_MIN` is 35, an estimate** (MESSAGE-52), from
  `Q_DOUBLING_F` on a ball cooling 75 → 40 °F in 3–4 h **on an open tray**
  (MESSAGE-60): the lidded containers likely cool slower, and no figure
  moves for it. The rise at DDT is
  still 90 min; every off-target rise moved (+2 °F is 80, −5 °F is 118), and
  the 45-minute floor is reached at +10.95 / +6.09 / +2.05 °F with 1 / 2 / 3
  mixes.
- **Ranges stay ranges** (§7.5, MESSAGE-31). Where the recipe gives a range,
  the step prints it and its timer is a window; the planning point may sit
  beside it ("the timeline plans 19 h"), never instead. The four ranges live in
  one table, `PLANNING_RANGE_H` in `timeline.ts`: the timeline prints "19 h
  (18–20)" from it when the point lies inside, and the gate claims every step
  literal against it. `biga-4` times a different stage per track
  (`timerLabelRetarded`/`timerLabelClassic`); resolve through `timerLabelFor`
  and `summaryFor`, never in a component. §7.5's one exception: a classic plan
  below 16 h times the plan.
- **One rise per dough** (MESSAGE-61). `roomMinutesByDough` holds each
  dough's; `roomMinutes` is the last, which the timeline plans. Anything that
  tells the baker how long the balls sit prints every dough's: `bulk-3` and
  copy-as-text through `{riseByDough}` ("101 min for dough 1 and 90 for dough
  2") beside `{finalDoughTemp}` ("73.0 and 75.0"), and each mix's final-reading
  hint its own dough's. The old shared-tub figures (`{ballRoomMin}`, half the
  stagger off) are gone; MESSAGE-32 is history.
- **Capacity messages are §7.3's words, decided in `src/lib/capacity.ts`**, not
  the engine: generated content bound through the token table, decided on the
  **printed** per-mix dough (a test pins 2374.96 g → "2375.0" → fires). The
  engine's old hand-worded capacity warnings are gone.
- **The FF comes from the bake log** (§6, MESSAGE-45). With nothing counted it
  is bake 1's normalized FF, 10.787531, at every mix size (MESSAGE-52; there is
  no `DEFAULT_FF`); the first counted bake at any size retires the seed (a size without its own bakes
  borrows by interpolation, or the nearest size held flat). A stored
  `frictionFactors` map from before is ignored. **Keyed on balls per mix** as
  the `(balls, nMix)` pair: 12 balls in two mixes reads 6. **The page holds
  no token** (§14.2): the Worker adds it, and a shared link never carries the
  log or the sign-in.

## Build order

Follow spec §12. Task list and status: [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md),
which is kept current — check its status line first.

Tasks 0–12 are done (engine, state, cards, both timeline modes, steps,
concepts, timers, reference and About drawers, deploy and the phone check,
the bake log with its GitHub sync, and the tabs with the topping ideas).
**From APP-10 the app deploys from Cloudflare's Git integration** (Workers
Builds) on every push to `main`, which runs `npm test` and the build before
`wrangler deploy`; GitHub Actions only runs the tests (`ci.yml`). Check the
deploy in the Cloudflare dashboard's Builds tab, or compare the
`assets/index-*.js` name on https://pizza.dave-becker.com with the build's,
rather than any written status. A session's branch doesn't deploy; it
reaches `main` through a PR that Dave asks for, merged with a merge commit,
never squashed.

**Bring `README.md` current before opening a PR.** Read it against the
branch's changes and fix whatever they make stale: the status line, the list
of what the app returns, the deploy notes, the document list, the icon table.
Put the README change in the same PR. It still read "calculation engine is
next" and listed the ice/tap split after Task 9 because nothing prompted an
update.

**Verify §5 before changing any formula**, including the bake-1 regression. §12
names the two places this goes wrong silently: the `C_bowl` term and the
`FF × Ct` work term. Both have dedicated tests.
