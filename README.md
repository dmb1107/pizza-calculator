# Biga Neapolitan Dough Calculator

A static, client-side dough calculator tuned to one specific setup: **Grain
Craft Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven,
and a 65% biga.**

Enter batch size, your measured temperatures, and how long you want the cold
ferment. It returns exact gram weights, the water temperature to hit, an
ice/tap split, a timeline with real clock times, and a guided step list where
every step expands into the reasoning behind it.

Built to be read on a phone propped against a mixer, by someone with flour on
their hands.

## Status

Scaffold complete; calculation engine is next. See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md).

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

Pushing to `main` runs the tests, builds, and publishes to GitHub Pages via
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages →
Source: GitHub Actions**.

`vite.config.ts` sets `base: '/pizza-calculator/'`. Pages serves from a subpath
and asset links break silently without it — if the repo is renamed, change it
there too.

## Documents

- [`docs/WEBSITE-SPEC-biga-calculator.md`](docs/WEBSITE-SPEC-biga-calculator.md)
  — the build spec: formulas, constants, test vectors, step prose
- [`docs/Biga-Neapolitan-HaloCore-GrainCraft.md`](docs/Biga-Neapolitan-HaloCore-GrainCraft.md)
  — the human-readable recipe it was derived from
- [`CLAUDE.md`](CLAUDE.md) — working notes for Claude Code

The recipe is built on published practice, not invention — sources are listed
in spec §11.

## Accuracy

The formulas are the product. A wrong number ruins 50 hours of work, so the
spec's test vectors are encoded as acceptance criteria in
[`tests/vectors.ts`](tests/vectors.ts) and CI will not deploy a red suite.
