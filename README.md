<img src="public/icon.svg" width="96" alt="The app icon: a margherita pizza">

# Biga Neapolitan Dough Calculator

A static, client-side dough calculator tuned to one specific setup: **Grain
Craft Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven,
and a 65% biga.**

Live at **https://dmb1107.github.io/pizza-calculator/**

Enter the batch size, your measured temperatures, and how long you want the
cold ferment. The app returns:

- gram weights for the biga and the final mix, with a copy-as-text button;
- the target water temperature, which you hit by blending fridge-cold and tap
  water as you pour (one card per mix when the batch is more than the Halo Core
  holds and splits);
- a timeline with real clock times, planned forward from the biga start or
  backward from the bake time;
- a guided step list with timers and mixer speeds drawn as the Core's lit
  segments, where every step expands into the reasoning behind it.

The setup survives a refresh, and **Share setup** copies it as a link.
Reference tables and the recipe's sources open in drawers at the bottom of the
page.

Built to be read on a phone propped against a mixer, by someone with flour on
their hands.

## Status

Tasks 0–9 are done and the site is live. Left: the phone-in-the-kitchen check
(Task 10) and the bake log (Task 11). See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md).

## Home screen icon

On an iPhone, open the site in Safari, tap Share, then **Add to Home Screen**.
The icon files live in `public/`:

| File | Used by | Shape |
|---|---|---|
| `apple-touch-icon.png` | iOS home screen | The pizza on orange: 180 × 180 px, opaque, full-bleed square |
| `icon.svg` | Browser tab | The pizza alone on a transparent background |

iOS rounds the home-screen icon itself, so the PNG must stay a plain square:
pre-rounded corners can leave slivers of the corner color, and iOS fills
transparent pixels with black. If you change the artwork, export both files
again. iOS caches the icon, so remove the home-screen shortcut and add it again
to see a new one.

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
```

| Script | |
|---|---|
| `npm run dev` | dev server |
| `npm test` | vitest, single run |
| `npm run test:watch` | vitest, watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run preview` | serve `dist/` locally |

## Deploy

Every push to `main` runs the tests, builds, and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Other branches don't deploy; work reaches
`main` through a pull request.

`vite.config.ts` sets `base: '/pizza-calculator/'`. Pages serves from a subpath
and asset links break silently without it — if the repo is renamed, change it
there too.

## Documents

- [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md)
  — the build spec: formulas, constants, test vectors, step prose
- [`docs/Biga-Neapolitan-HaloCore-GrainCraft.md`](docs/Biga-Neapolitan-HaloCore-GrainCraft.md)
  — the human-readable recipe it was derived from
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) — the task list and its
  status
- [`docs/HANDOFF-to-next-calculator-agent.md`](docs/HANDOFF-to-next-calculator-agent.md)
  — where things stand, for a fresh session
- The rest of `docs/` is the MESSAGE and FINDINGS correspondence that settled
  each revision to the spec; [`CLAUDE.md`](CLAUDE.md) indexes it
- [`CLAUDE.md`](CLAUDE.md) — working notes for Claude Code

The recipe draws on published sources, listed in spec §11 and in the app's
About drawer.

## Accuracy

The formulas are the product. A wrong number ruins 50 hours of work, so the
spec's test vectors are encoded as acceptance criteria in
[`tests/vectors.ts`](tests/vectors.ts) and CI will not deploy a red suite.
