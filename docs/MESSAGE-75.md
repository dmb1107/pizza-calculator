# MESSAGE-75 — APP-10: the app on Cloudflare, with a passkey sign-in

**For Dave: run this round at Opus 5.5 `xhigh`.** It adds a server (a Cloudflare Worker), a passkey sign-in and a new deploy, and moves the GitHub token off every device.

Reply to FINDINGS-75, and the next of Dave's queued app changes (APP-10 in his backlog). The spec gains §14 and changes in twelve other places; the recipe doesn't change, and nothing in §8, no engine, formula, step content or FF moves. Based on `main` at `e2b8458` (PR #34 merged), whose spec matches MESSAGE-74's hash (`5ec71619…`).

## 1. On FINDINGS-75

All accepted, nothing open. Reproduced on `message-74` before it merged: the spec's hash, 912 of 912, the typecheck clean, and regeneration changes nothing.

## 2. APP-10: what Dave asked

Each device has the fine-grained GitHub token pasted into it and kept in browser storage, and the page calls api.github.com with it (§2, §10). Dave wants the token off the devices: a Worker holds it, and devices sign in. APP-9's menu pages will later need a Worker too, and they share this one.

### Decided (Dave)

- **10a (11 Nov).** The app moves from GitHub Pages to Cloudflare, at `pizza.dave-becker.com`, so the page and the Worker share one address; a sign-in held by another address would be a third-party cookie, which Safari blocks. The move costs each device its stored setup, ticks and timers; bakes and ideas come back from GitHub; the icon is re-added. Between bakes.
- **10b (11 Nov).** The Worker holds the GitHub token as a secret; devices sign in with a passkey.
- **10c (11 Nov).** A sign-in lasts 90 days, renewed on use.
- **10d (12 Nov).** GitHub Pages is switched off once the new address works. No redirect.
- **10e (12 Nov).** A setup code, a second Worker secret, guards creating a passkey. Dave keeps his passkeys in Bitwarden.
- **10f (12 Nov).** On an iPhone, sign in in Safari first, then add the icon: iOS copies Safari's cookies to a home-screen app once, when it is added. No device-to-device code fallback unless that fails.
- **10g (12 Nov).** The Worker uses the existing token. Dave clears the old copies from his devices after the move.

**The zone is ready.** `dave-becker.com` has been active on Cloudflare since 11 Nov 2026, 11:43 PT, on `emerie.ns.cloudflare.com` and `max.ns.cloudflare.com`, so the Worker can take the custom domain `pizza.dave-becker.com`.

## 3. The spec text

the opening, where the app is hosted:

> Hosted on Cloudflare at `pizza.dave-becker.com` (§14).

§2, static only:

> - **Static, with one small Worker.** The page is static assets served by a Cloudflare Worker, with no build-time data fetching. The Worker signs a device in and passes the sync's requests to GitHub (§14); the sync is the one network call the page makes.

§2, the base path:

> - **The page is served from the domain's root**, so `base` in `vite.config.ts` is `'/'`. ⚠️ Until MESSAGE-75 it was on GitHub Pages under `/pizza-calculator/`.

§2, the deploy:

> - A push to `main` builds the page and deploys it with the Worker (§14).

§2, the bake log bullet:

> read and written through GitHub's API by way of the Worker, which holds the one token that can reach that repository; a device signs in with a passkey and holds no token (§14). Each device writes its own copy first and syncs after, so a mix never waits on the network. **Signed out**, the log stays in browser storage,

§6, what a shared link carries:

> a shared link carries no log, no sign-in, no topping ideas

§10's opening, storage:

> a private GitHub repository with one JSON file per bake when this device is signed in, browser storage when it isn't.

§10 Capture and saving, Kept:

> which tab is open (§13.1), this device's sign-in (§14), saved bakes,

§12 Build order:

> 12. The move to Cloudflare and the passkey sign-in (§14).

§13.3, the ideas' storage:

> through the same Worker and sign-in as the log (§2, §14).

§13.3, photos signed out:

> Signed out, the photos stay in this browser, in IndexedDB,

§13.3, ideas signed out:

> Signed out, the ideas stay in this browser.

§14, appended after the last line:

> ---
>
> ## 14. Hosting and sign-in
>
> APP-10 (Dave's calls, 11 and 12 Nov 2026). The app moves from GitHub Pages to Cloudflare, and the GitHub token moves off the devices into a Cloudflare Worker that each device signs in to with a passkey.
>
> ### 14.1 Where the app lives
>
> **At `https://pizza.dave-becker.com`**, served by one Cloudflare Worker: the built page as static assets, and the Worker's own routes for the sign-in and the sync (Dave, 11 Nov 2026). The domain's DNS has been on Cloudflare since 11 Nov 2026, and the Worker's custom domain creates the `pizza` record.
>
> **GitHub Pages is switched off** once the new address works (Dave, 12 Nov 2026). Nothing redirects the old address, so a link shared from it stops working.
>
> **The move costs each device what it stored at the old address:** the inputs, the ticks and timers, the open tab and the closed groups. Bakes and topping ideas come back from GitHub after signing in. Anything not synced at the old address stays there, so each device syncs before the move. The home-screen icon is added again from the new address.
>
> ### 14.2 The token
>
> **The Worker holds the GitHub token as a secret** (Dave, 11 Nov 2026). It is the existing fine-grained token, which reaches only the bake-log repository (Dave, 12 Nov 2026). The page never sees it: the sync sends its requests to the Worker, which checks the sign-in and passes them to GitHub with the token. The Worker passes only what the sync uses, in the bake-log repository and no other: the repository itself, the contents of `bakes/`, `toppings/` and `toppings/images/`, and git blobs. The page's token and repository fields go.
>
> Once the move works, Dave deletes the old home-screen icon and clears Safari's website data for `dmb1107.github.io` on each device, so no device keeps a copy of the token.
>
> ### 14.3 Signing in
>
> **With a passkey** (Dave, 11 Nov 2026): Face ID, Touch ID, or a password manager that holds passkeys, such as Bitwarden, which Dave uses. Signing in asks for the passkey and nothing else.
>
> **A setup code guards creating a passkey** (Dave, 12 Nov 2026). Dave sets it as a second secret in the Worker. Creating a passkey asks for it, so someone who finds the address can't add one of their own; signing in never asks for it. The Worker limits how often a wrong code can be tried.
>
> **A sign-in lasts 90 days and renews each time the app is used** (Dave, 11 Nov 2026). It is a cookie the page's script can't read, sent only to this address. **Sign out** ends it on this device.
>
> **On an iPhone, sign in in Safari first, then add the icon** (Dave, 12 Nov 2026). A home-screen app keeps its own storage, apart from Safari's, and iOS copies Safari's cookies to it once, when it is added. If a passkey works inside the icon as well, either order does. If the icon's sign-in ever lapses and its passkey prompt doesn't work, sign in in Safari again and re-add the icon.
>
> **Signed out, everything stays on this device:** the whole calculator works, and the bake log and the ideas are kept in this browser only. Friends opening a shared link are signed out.
>
> **Rendered copy** (the calculator agent words the rest under the writing rules):
> - Buttons: **Sign in**, **Sign out**, **Create a passkey**.
> - The field that asks for the setup code: **Setup code**.
>
> **No engine, formula, step content or FF changes.** Nothing in §1–§13's calculations reads the sign-in.

## 4. Rendered copy

- Buttons: **Sign in**, **Sign out**, **Create a passkey**.
- The setup code's field: **Setup code**.

The rest is yours under the writing rules: the signed-in and signed-out states where the token fields were, a wrong setup code, an expired sign-in, and the sync messages that said "no token". FINDINGS sends screenshots so Dave can approve the words with the look.

## 5. Notes for the build

The design is yours. What I'd watch, from `main` at `e2b8458`:

- **One Worker, two jobs.** The built page as static assets, and its own routes (under one prefix, such as `/api/`) for the sign-in and the sync. Leave room for APP-9's menu pages on the same Worker. `vite.config.ts`'s `base` becomes `'/'`, and `REPO_NAME` with it.
- **The sync changes least if the Worker passes requests through.** `repoSync.ts` sends everything to `API` (`https://api.github.com`) with `Authorization: Bearer` from `GitHubConfig`. Point `API` at the Worker's prefix, drop the header and the token, and let the Worker add it. The bake log's 31 tests and the ideas' tests then run against the fake at a new base, unchanged otherwise.
- **The Worker passes only what the sync uses** (§14.2). The repository is fixed in the Worker's configuration, so `GitHubConfig`'s `owner`, `repo` and `token` go, and so do `BakeLog.tsx`'s token and repository fields. Allow `GET` on the repository itself (`checkRepo`), `GET`, `PUT` and `DELETE` on contents under `bakes/`, `toppings/` and `toppings/images/`, and `GET` on `git/blobs/{sha}`; refuse everything else, before the token is attached. A path with `..` or an encoded slash is refused, not normalized.
- **Passkeys through a maintained library**, such as SimpleWebAuthn's server package; confirm it runs on Workers (it uses WebCrypto). The relying party is `pizza.dave-becker.com`. Challenges are single-use and short-lived. Ask for user verification.
- **Where the Worker keeps things.** Passkey credentials and sessions need storage: Workers KV, D1 or a Durable Object, your call. A session kept on the Worker's side lets Sign out end it there, not only in the browser.
- **The cookie.** `HttpOnly`, `Secure`, `SameSite=Strict`, for the whole address. 90 days from the last use: re-issue it as it's used (once a day is enough). Check `Origin` on every write as well.
- **The setup code.** Compared in constant time. Limit wrong tries, per address or overall; a few a minute is plenty.
- **The secrets.** `GITHUB_TOKEN` and `SETUP_CODE` (or your names) are set by Dave, through `wrangler secret put` or the dashboard, never in the repository. FINDINGS gives him the exact steps. The recipe agent doesn't handle the token's value.
- **The deploy.** Cloudflare's Git integration (Workers Builds) deploys on a push to `main` with no Cloudflare token in GitHub; a GitHub Action needs a Cloudflare API token as a repository secret. Propose one; Dave sets it up. `deploy.yml`'s Pages job goes in the same PR, and Dave switches Pages off in the repository's settings once the new address works (§14.1).
- **Test on a preview first.** A `workers.dev` address, or `wrangler dev`, before the custom domain. The passkey's relying party ties it to one address, so a passkey made on a preview won't work on `pizza.dave-becker.com`; Dave makes his real one there.
- **The WebKit suite can't create a passkey.** A virtual authenticator is reached only through Chromium's DevTools protocol, which WebKit doesn't have. Test the Worker's sign-in in unit tests with a fake authenticator, and one end-to-end pass in Chromium with a virtual one if you can. What WebKit can't reach goes in FINDINGS: a passkey in Safari, in the icon, and through Bitwarden.
- **Signed out is today's no-token path.** `SyncState`'s no-token state becomes signed out. A request that comes back 401 (a lapsed sign-in) turns the page to signed out and keeps the local copies, which sync after the next sign-in.
- **The switchover, for FINDINGS:** a checklist for Dave in order: sync every device at the old address; set the two secrets; deploy; open the new address in Safari on the Mac and create the passkey with the setup code; sign in on the iPhone in Safari, then add the icon; check bakes, ideas and photos came back; delete the old icon and clear Safari's data for `dmb1107.github.io` on each device; switch Pages off.
- **A security read.** The Worker is the one place where a mistake exposes the repository. List every route in FINDINGS with what it checks, so it can be read against §14.
- **`CLAUDE.md` and `README.md`** describe GitHub Pages, `base`, "no server of its own" and the token; bring them current in the same PR.

## 6. Tests I'd expect

1. Signed out: the page makes no sync request, and the bake log, the ideas and their photos stay in the browser.
2. Creating a passkey without the setup code, or with a wrong one, is refused, and repeated wrong tries are limited.
3. Signed in: the sync works through the Worker; the token appears nowhere on the page (storage, the bundle, any response).
4. The Worker refuses a request with no sign-in (401), for another repository, for a path outside the three folders, with `..` or an encoded slash, and with any other method, and none of them reach GitHub.
5. A sign-in renews on use and lapses after 90 days unused (a faked clock); Sign out ends it on the Worker's side.
6. A lapsed sign-in turns the page to signed out without losing local copies, and they sync after signing in again.
7. The page loads from the root path, assets included.

## 7. Done when

- On a preview deploy: a passkey created with the setup code, a sign-in, bakes, ideas and a photo synced through the Worker, and Sign out;
- the out-of-scope requests in §6, test 4, refused by the deployed Worker;
- the WebKit suite passes as a home-screen app at 375 px, served from the root path;
- FINDINGS carries the switchover checklist, the route list, and the steps for the secrets and the deploy.

**Send screenshots in FINDINGS** of the signed-out and signed-in states, and of creating a passkey, at 375 px.

## 8. The gate

On `main` at `e2b8458` with this spec, regenerated: **912 of 912**, typecheck clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. §14 isn't read by the gate, and its figures (90 days, the address) aren't engine outputs. A phrase test for §14's rendered copy, like §13.2's, is your call.

## 9. Changes by document

**Spec** (13 edits, all APP-10):
- The opening: hosted on Cloudflare.
- §2: one small Worker; the root path; the deploy; the bake log's sync goes through the Worker.
- §6 *Where the inputs are kept*: a shared link carries no sign-in.
- §10's opening and *Kept*: signed in, and this device's sign-in.
- §12: build step 12.
- §13.3: the ideas and photos through the same Worker; signed out, both stay in the browser.
- §14: new, *Hosting and sign-in*.

**Recipe:** unchanged.

## 10. Attachments and hashes

`apply_75.py`, run on `main`'s spec at `e2b8458`. It stops unless each old string occurs exactly once.

| File | SHA-256 |
|---|---|
| `WEBSITE-SPEC-biga-calculator.md` | `3e0172dee48573b542a8335b3f8d4f9ef22092b0b3182533c49ca56f703389d9` |
| `Biga-Neapolitan-HaloCore-GrainCraft.md` | `6885f481d6b4680bf0c42e0fd9d7ad686016159307642c74fd92c4b5d1edda2b` (unchanged) |
