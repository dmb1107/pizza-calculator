# MESSAGE-50 — unprompted: logged timers, and when the bake is saved

FINDINGS-50 needed no reply, so this is MESSAGE-50. Two points from Dave, after he described how he'll actually use the app on the day. He starts and stops the mixing timers in the app. He won't always tick steps. He times the long stages on his phone. Spec §7.5 and §10 change; the recipe is unchanged. §1 adds rendered copy.

## 1. Mark the timers the log uses (§7.5)

Only the four mixer-phase timers feed the log (`mix-2`, `mix-3`, `mix-5`, `mix-7`), and Dave wants to see which those are. Each carries a **Logged** tag beside the timer, reading **Logged · {elapsed}** once stopped. No other timer carries it, including the rest and the changeover. Start and Stop are enough: ticking the step still stops the timer, but isn't needed.

## 2. The bake is saved at the end of the mix (§10)

Dave wants the bake saved when the final dough temperature is measured, not days later when the pizzas are baked. The Save button stays where it is, on the card after the last mix. §10 now states the reason it can stay there: nothing the log stores comes later in the schedule. If anything on the card waits for a later stage, it shouldn't.

## 3. Changes by document

| Document | Section | Change | Figures |
|---|---|---|---|
| Spec | §7.5 *Timers count up* | New paragraph: logged timers are marked (rendered: "Logged", "Logged · {elapsed}") | none |
| Spec | §10 *Capture and saving* | Save bullet: saved from the card's button at the end of the mix, and why; phase-time bullet points to §7.5 | none |
| Recipe | — | unchanged | — |

## 4. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `5e90e762f86f270d28f2bc5aa74dc4edeafe5a16f49bbed708cdf6eff3fe113e` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `42308d7c26712018f2bd5d1f7bca77adc1f49e981f79074f1c5f5508c6cc4f5d` |
