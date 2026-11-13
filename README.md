<img src="public/icon.svg" width="96" alt="The app icon: a margherita pizza">

# Biga Neapolitan Dough Calculator

A client-side dough calculator tuned to one specific setup: **Grain
Craft Neapolitan 00 flour, an Ooni Halo Core spiral mixer, a Gozney Tread oven,
and a 65% biga.**

Live at **https://pizza.dave-becker.com**

Enter the batch size and how long you want the cold ferment, then the
temperatures you measure on the day, in the steps where you take them. The app
returns:

- gram weights for the biga and the final mix, with a copy-as-text button;
- the target water temperature, which you hit by blending fridge-cold and tap
  water as you pour. It sits in each mix's prep step, under the room, flour,
  biga and bowl readings it is computed from, so a batch that is more than the
  Halo Core holds, and splits, gets one target per mix;
- a timeline with real clock times, planned forward from the biga start or
  backward from the bake time; a batch that splits is planned from its last
  dough, with each earlier dough's bulk and rise end times beside it;
- a guided step list with timers (stop and resume, the pause left out) and
  mixer speeds drawn as the Core's lit segments, where every step expands
  into the reasoning behind it. A ticked step folds to one line, and each
  group of steps (a phase, or one mix of a split batch) closes from its
  heading; a closed group still shows a running timer and any water
  warning. Longer
  background pieces open from the steps, the cold-ferment slider, the
  ingredients card and the Calibration panel;
- a bake log that solves the mixer's friction factor from each bake's measured
  temperatures, water targets and phase times, and sets the friction factor
  the next water target uses. The four mixer-phase timers it reads are tagged **Logged**, and
  the bake is saved from the card after the last mix, once the final dough
  temperature is in;
- a place for topping ideas: a name, pre-bake and post-bake toppings, notes,
  comments on how the pizza tasted, a rating in half stars, a photo of the
  pizza (shrunk on the phone before it is saved), and a switch for dessert
  pizzas. The text fields format as you type (bullets, nested bullets, bold
  and links) and are stored as Markdown. Rated pizzas list best first, then
  rated dessert pizzas, with the untested ideas at the bottom. Add idea
  floats at the bottom right; from desktop width the ideas are a photo
  gallery, and one opens in a panel at the right.

The page has three tabs, **Recipe**, **Toppings** and **Bake log**: on a
phone a bar fixed to the bottom of the screen, and from 768 px wide a strip
at the top of the page that stays in view. Each tab keeps its place, and a
timer started on Recipe runs, beeps and marks the Recipe tab while another
tab is open.

The setup, the day's readings and the open tab survive a refresh and a
closed app, home-screen app included, and **Share setup**, on the Recipe
tab, copies the setup as a link. **Reset**, above the panels, starts a new
bake: it puts the batch settings and today's readings back to their
defaults, clears any DDT override, the timeline's start or target time, the
step checkboxes and the timers, opens every step group, and keeps the log,
the topping ideas and the tab. Reference tables and the recipe's sources
open in drawers at the bottom of every tab.

The bake log and the topping ideas stay in the browser until the device
signs in, with a passkey (Face ID, Touch ID, or a password manager such as
Bitwarden). Signed in, each device syncs one JSON file per bake under
`bakes/` and one per idea under `toppings/` in a private GitHub repository,
through the app's own Cloudflare Worker, which holds the only GitHub token;
no device holds one. A sign-in lasts 90 days from its last use. Creating a
passkey asks for a setup code set in the Worker, so a stranger who finds the
address can't add one. The log and the ideas sync separately, so one failing
never holds up the other. A shared link carries the setup, never the log,
the ideas or the sign-in.

**The portfolio**, at `https://pizza.dave-becker.com/portfolio`, is a
public page of Dave's rated pizzas that have a photo, best first, with the
dessert pizzas after the rest: a grid of
photos with their names, and a page for each with its toppings and Dave's
rating. Anyone can open it without signing in. Notes, comments and dates
stay private, and each idea has a **Hide from portfolio** switch, on for a
rating below 3 until Dave sets it. The Worker builds it as plain HTML, so a
shared link previews the pizza's photo.

Built to be read on a phone propped against a mixer, by someone with flour on
their hands.

## Status

Tasks 0–12 are done and the site is live. The bake log (Task 11) was built
across MESSAGE-45 to MESSAGE-50; MESSAGE-51 to 53 were Dave's recipe review,
MESSAGE-54 moved the day's readings into the steps, and bakes 2 and 3
(MESSAGE-59 and 60) are the first the log counts. Since MESSAGE-61 each
mix of a split batch runs on its own clock, with its own rise and timers.
MESSAGE-64 checked the recipe against food and baking science, and the papers
it rests on are in spec §11 and the About drawer. Since MESSAGE-65 the inputs
are stored in the browser as well as the URL, so a home-screen app reopens
where it was. Since MESSAGE-67 a stopped timer resumes, since MESSAGE-68
finished steps and groups fold away, and since MESSAGE-70 the page is three
tabs, one of them for topping ideas. Since MESSAGE-75 (APP-10) the app is
served from Cloudflare at its own address, and devices sign in with a
passkey instead of holding a GitHub token. APP-14 redesigned the Toppings
tab: dessert pizzas, untested ideas at the bottom, a floating Add idea, a
photo gallery from desktop width, and fields that format as you type.
APP-11 adds the public portfolio (spec §15). See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md).

## Home screen icon

On an iPhone, open the site in Safari, **sign in on the Bake log tab first**,
then tap Share, then **Add to Home Screen**. iOS copies Safari's sign-in to
the home-screen app once, when it is added; if the app's sign-in ever lapses
and its passkey prompt doesn't work, sign in in Safari again and add the icon
again.
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
| `npm run test:e2e` | the iPhone checks in WebKit, as a home-screen app (run `npx playwright install webkit` once first) |
| `npm run test:worker` | the real Worker in `wrangler dev`, a fake GitHub, and a virtual passkey in Chromium (`npx playwright install chromium` once) |
| `npm run test:preview` | the same checks against the preview deploy; needs `PREVIEW_URL` and `PREVIEW_SETUP_CODE` |
| `npm run typecheck` | `tsc --noEmit`, the page and the Worker |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run preview` | serve `dist/` locally, without the Worker (signed out) |
| `npm run worker:dev` | the page and the Worker together on port 8787, after `npm run build` |
| `npm run deploy:preview` | build and deploy the preview Worker to workers.dev |

## Deploy

One Cloudflare Worker serves the app at `https://pizza.dave-becker.com`
(`wrangler.jsonc`): the built page from `dist/` as static assets, and
`worker/` for everything under `/api/`, the passkey sign-in and the pass
through to GitHub, and for `/portfolio`, which it builds from the same
repository with its own token and keeps for a minute in Cloudflare's cache.
A Durable Object holds the passkeys and sign-ins.

Cloudflare's Git integration (Workers Builds) deploys every push to `main`:
it runs `npm test` and `npm run build`, then `npx wrangler deploy`. GitHub
Actions runs the same tests on every push and pull request
(`.github/workflows/ci.yml`) and deploys nothing. Other branches don't
deploy; work reaches `main` through a pull request.

The Worker's two secrets are set in Cloudflare, never in the repository:

```bash
npx wrangler secret put GITHUB_TOKEN
```

```bash
npx wrangler secret put SETUP_CODE
```

`GITHUB_TOKEN` is a fine-grained token that reaches only the bake-log
repository, with Contents set to read and write. The page is served from
the domain's root, so `base` in `vite.config.ts` is `'/'`.

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
[`tests/vectors.ts`](tests/vectors.ts) and a red suite never deploys.
