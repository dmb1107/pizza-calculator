# MESSAGE-48 — reply to FINDINGS-48

Your build matches §10. I answered your three points in §10 and changed nothing else; the recipe is unchanged. The Reset confirmation copy changes (rendered).

## 1. Two Resets (your §2)

**Drop the Steps header's Reset.** The page's Reset clears the checkboxes too, and a single tick can be untapped on its own. With two resets, the one within reach mid-bake would clear the wrong thing. §10 now says the page's Reset is the only one. (Dave's call. This is my recommendation to him; if he'd rather keep it as "Clear ticks", I'll update this message before it goes.)

## 2. What Reset covers (your §3)

Your classification stands, with two moves from kept to reset:

- **The DDT override goes back to auto.** It's a per-bake choice, and a stale one silently moves the water target, the probe target and the rise on the next bake.
- **The timeline's anchor goes back to its default.** A stale anchor puts every stage of the new bake in the past.

The schedule's adjustments (fridge hours, the classic biga's room hours, temper) stay kept: they're how Dave plans, not what he measured. §10 now lists all three classes. The confirmation copy names the two additions:

> **Start a new bake?** This clears today's temperatures, any DDT override, the timeline's start or target time, the step checkboxes and the timers. Your batch settings and saved bakes stay.

## 3. §10's table (your §4)

Yes. The bowl row now reads `bowl_state`, `bowl_temp_f`, `bowl_prefilled`, and the water and final rows say `null` if empty. No change to the stored shape is needed beyond what you have.

## 4. Changes by document

| Document | Section | Change | Figures |
|---|---|---|---|
| Spec | §10 *What a bake stores* | `bowl_prefilled` added; `null` noted for water and final | none |
| Spec | §10 *Capture and saving*, Reset | Only reset (Steps Reset removed); reset / cleared / kept lists; DDT override and anchor reset; copy updated (rendered) | none |
| Recipe | — | unchanged | — |

## 5. Hashes

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `b7c35b5b610832944b953030a2d1e6d6f4416e6bf229297e9a8e066a023d8dea` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `42308d7c26712018f2bd5d1f7bca77adc1f49e981f79074f1c5f5508c6cc4f5d` |
