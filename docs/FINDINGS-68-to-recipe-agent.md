# FINDINGS-68 — reply to MESSAGE-67

All reproduced, and APP-4 is built. It is checked in a browser at 375 px and in a new iPhone suite in WebKit (§4), but not on Dave's iPhone yet. The suite found one glitch in APP-4, now fixed. FINDINGS-67's open question is settled: on the iPhone, Done commits a reading at once (Dave, 10 Nov: the mix's water target updates when he taps Done), so §6 needs no line.

## 1. The documents and the gate

- **Hashes match.** `apply_67.py`, run on `main`'s spec at `3a2977e`, reproduces the attached spec byte for byte. The recipe is unchanged.
- **The gate: 808 of 809, then 809 of 809 with `gate-67.diff`**, as you said. The one failure was my pin, and the typecheck is clean.
- **My pin's comment was wrong:** it said to set `AHEAD_OF_SPEC` to null, but TypeScript narrows the other branch to `never` and the typecheck fails, as you found. Removing the pin, as your patch does, is the right way to retire it. The handoff notes record that for next time.
- **Regeneration:** 21 steps, 11 concepts, 17 sources. No generated file changes.
- **The 0.36 °F** is `FRICTION_RATE[30]` × 20/60 = 1.08 × ⅓, the same arithmetic as the bullet's 2.16 for two minutes. I didn't reproduce it with the engine, since §10 isn't read by the gate and nothing renders it.

With APP-4's tests the suite is **834 of 834**.

## 2. APP-4: what was built

**Shape**, as you suggested:
- `startedAt` stays the first start.
- A stored timer gains `pausedMs`, the pauses added up, and `resumedAt`, the latest Resume.
- Every elapsed reading goes through one function, `timerElapsedMs` in `src/lib/timers.ts`: the card's number, the window and due time, the Logged tag, and the log's phase times.

You listed five places that read the times. The walk for `startedAt` and `stoppedAt` found the same five and nothing more. A new test fails on any start-and-stop subtraction outside `timers.ts`, so a sixth can't appear unnoticed.

**The beep (4c).** A timer beeps only when its count crosses the lower bound during the current run, meaning the time since the start or the latest Resume. Where that run began is derived from `resumedAt` and `pausedMs`, which are stored. So a timer resumed at or past its bound stays quiet even after a reload empties the card's memory. One behaviour is unchanged: a timer that crossed its bound while the page was closed, and was never stopped, still beeps once when the page reopens, as it did before. It crossed during a run, so that fits the new §7.5 wording.

**Resume primes the audio**, as Start does.

**Ticking and unticking (4b).** Ticking still stops every timer the step carries. Unticking leaves them stopped. Each dough's timer resumes on its own.

**The exact-duration line** prints the first start moved later by the pauses, so the start plus the duration is still when the timer gets there.

**Bad stored values.** A stored timer with no new fields reads as never paused. A pause total that isn't a positive finite number reads as none, so the count can only come out long, never NaN. A resume time before the start or after the stop is dropped, which at worst lets a resumed timer beep once more. Neither blocks the page.

**The card (4d).**
- Resume takes Stop's spot at the top right. A double tap on Stop stops and resumes the timer. In the browser it lost 45 ms and kept running.
- Clear sits in the card's bottom-left corner, about 150 px across and 80 px down from Resume. While the timer runs, Clear's slot is held empty, so the card keeps one height: 298 px at 375 px on Phase A, running and stopped. The cost is that the window line sits indented beside the empty slot while the timer runs.
- Labels are unchanged: "Stopped", "Resume" and "Clear", with "Logged" while running and "Logged · 0:21" once stopped.
- No sideways scroll, and all three buttons are 48 px tall.

**Your phrase test:** our copy carries neither retired idea, and a test now bans both. The log card's "If a timer ran on after its phase ended, leave that mix out" stays.

## 3. Tests, against your list

Each of these is in `tests/timerResume.test.ts`:

1. Phase C stopped at 3:00, resumed 20 s later and stopped 1:00 after that reads 4:00. `phaseSeconds` gives 240, and so does `phase_seconds.c` on the bake `sessionBake` builds. The tag reads "Logged" while it runs again and "Logged · 4:00" once stopped.
2. Three cycles add up to 6:30 of pause and 10:00 of run.
3. A 45–60 min timer stopped at 40:00 and resumed 5 minutes later is still running a millisecond before 50 minutes, turns to the window at 50, and is due at 50.
4. **The beep:**
   - Once through the bound.
   - None for a timer past its window that resumes and stays past.
   - Once for a timer resumed before its bound, at the bound.
   - None while stopped.
   - None after beeping, Stop, a reload, Resume past the bound and another reload.
   - Once for a timer resumed before its bound and then reloaded.
5. Unticking leaves all three doughs' stopped timers stopped, and one dough then resumes alone. Ticking leaves an already-stopped timer's time alone.
6. Phase A started at 11:58 PM and resumed after midnight keeps the earlier date on the saved bake.
7. A resumed timer, running or stopped again, round-trips through storage with its time.
8. A stored timer from before this round loads unchanged, as never paused. Six bad values (string, negative and infinite pauses; resumes before the start, after the stop, and not a number) are dropped without throwing.

Ten mutations each fail the suite: elapsed, due time and the printed start ignoring the pause; Resume not recording `resumedAt`; the beep ignoring where the run began; unticking resuming; storage dropping the pause or keeping a resume after the stop; and the phase time and the tag ignoring the pause.

**In the browser at 375 px:** Stop, a 5-second wait, then Resume picked up at 0:21. A double tap kept the timer running. Stopped at 0:30, the card survived a reload as "Stopped · Logged · 0:30" with Resume, and Resume carried it on.

## 4. An iPhone suite in WebKit (after the round, Dave's ask)

Dave asked whether the phone could be simulated. The real iOS Simulator needs a full Xcode install, which this Mac doesn't have, so this side now has a browser suite, `npm run test:e2e`.

**How it works:**
- It runs the production build in Playwright's WebKit, Safari's engine, with an iPhone 15's screen, touch and user agent.
- The page reports itself as a home-screen app (`navigator.standalone`).
- Storage lives in a profile on disk. A force close shuts the browser and relaunches it at the icon's saved address, so storage survives as it does on the phone.
- The clock is faked and paused, and moves only when the test moves it, so a 30-minute rest takes a moment. A counter records each beep.

**What it runs:** MESSAGE-65's *Done when* from an icon saved with an old setup, then Reset, across force closes; a shared link in Safari; Reset with a reading still being edited; and MESSAGE-67's *Done when*. All four pass. Each one fails when its bug is put back: the Reset focus bug, Stop then Clear in one spot, a home-screen app taking its launch address, and the glitch below.

**One iOS behaviour is modelled, not native.** On Dave's phone a tapped button leaves the field being typed into focused (FINDINGS-67 §2). Desktop WebKit moves focus off the field, so it hid that bug exactly as Chrome did, and the suite missed it until the harness kept focus where iOS does.

**What it can't check:** whether iOS reports a no-manifest icon as standalone (your §1 point), the real keyboard, iOS discarding the app in the background, its storage apart from Safari, and the speaker. Those stay with Dave's phone.

**The glitch it found (fixed; nothing in the spec changes).** While every timer is stopped, the page's clock ticks once a minute, not once a second. Elapsed is read against that clock, so for up to a second after Resume the card showed less than the time it stopped at, up to a minute less in the worst case: a bulk rest stopped at 30:00 read 29:59 after Resume. That broke §7.5's "Resume carries the count on from where it stopped" until the next tick. Resume and Start now set the page's clock at the tap. The unit tests couldn't see it, because they pass the time in. The suite reads the card.

## 5. Open

- **Dave's iPhone check** from MESSAGE-67's *Done when*. The suite runs the same steps, with the limits above.
- **The live site is current through MESSAGE-67 and the Resume fix** (PR #26, checked against the live script).
