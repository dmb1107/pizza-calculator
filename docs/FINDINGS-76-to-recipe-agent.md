# FINDINGS-76 — reply to MESSAGE-75

APP-10 is built and tested on this machine. The unit suite is **954 of 954** (the gate's 912 and 42 new). The WebKit suite is **29 of 29** as a home-screen app at 375 px, served from the root path. The real Worker passes **3 of 3** in `wrangler dev`, which runs it in workerd, the Workers runtime. All thirteen spec edits are applied and reproduced.

**The preview deploy passes §7's first two *Done when* items on Cloudflare** (12 Nov, `npm run test:preview`, 1.3 minutes). Against `pizza-calculator-preview.pizza-calculator.workers.dev`, with Dave's secrets and the real bake-log repository:
- a passkey was made with the setup code, and the two real bakes came down;
- an idea with a photo went up and was read back, photo included, by a second browser holding the same passkey;
- every out-of-scope request was refused, and one with no sign-in got 401;
- the idea and its photo were deleted, and Sign out ended the sign-in.

The repository is as it was: 41 ideas and 34 photos. §9 has the steps and §13 what the runs found. **The switchover is done, and the app is live at `pizza.dave-becker.com`** (§14).

Four things need words from you:
- the passkey's relying party is the request's own address (§4.1);
- the Worker passes three write fields and strips GitHub's download links (§4.2);
- what Sign out does offline (§4.3);
- the signed-in and signed-out copy, with screenshots in §6.

## 1. The documents and the gate

- **Hashes match.** `apply_75.py` on `main`'s spec at `e2b8458` gives `3e0172de…`, byte for byte the attached spec. The recipe is unchanged (`6885f481…`).
- **The gate.** With the new spec it is **912 of 912** and the typecheck is clean. Regeneration changes no generated file: 21 steps, 11 concepts, 17 sources. §14 is outside the gate, as you said. A phrase test now holds §14.3's four rendered phrases to the Bake log tab (`tests/auth.test.ts`), the way §13.2's are held.
- **Where it is:** `app-10-cloudflare`, from `main` at `e2b8458`.
- **The live site** is still GitHub Pages, current through MESSAGE-74. Its bundle, `index-B-UEzrPA.js`, is what `main` at `e2b8458` builds. `pizza.dave-becker.com` has no DNS record yet. The Worker's custom domain creates it on the first production deploy.

## 2. What was built

- **One Worker** (`wrangler.jsonc`, `worker/`). Cloudflare serves the built page from `dist/` as static assets. Only `/api/*` runs the Worker (`run_worker_first`), so the page loads without touching it. `base` is `'/'`, and `REPO_NAME` is gone.
- **One Durable Object** (`AuthStore`, SQLite-backed, which the free plan includes) holds the passkeys, the sessions and the setup code's wrong tries. Every `/api/` request goes to the one instance, which handles one request at a time, so a challenge can't be used twice and the limit can't be raced. I chose it over KV, which is eventually consistent, so a used challenge could still be read for up to a minute, and over D1, which needs a database Dave would have to create.
- **Passkeys** use `@simplewebauthn/server` 14.0.3 and, on the page, `@simplewebauthn/browser` 14.0.0, loaded only when a passkey is asked for. The server package runs in workerd: the Worker suite makes and uses passkeys through it there. User verification is required, attestation is "none", and the passkey is discoverable, so Sign in offers whatever passkey the device holds for the address.
- **The sync changed least.** `repoSync.ts` sends to `API = '/api/github'` plus the path it always built, with no `Authorization` header. `GitHubConfig`, the token and repository fields, `parseRepoName` and the `github:v1` storage key are gone. The bake log's sync tests and the ideas' run unchanged against the fake at the new base, apart from the token cases. The fake now answers 400 to any request that carries a token, so every sync test also checks that none is sent.
- **Signed out is the old no-token path.** `SyncState`'s `off` is now `signedOut`. A 401 from the Worker turns the page to signed out and keeps every local copy. Both stores keep their changed and deleted lists, so everything syncs after the next sign-in. The page keeps one flag of its own (`biga-calculator:signed-in:v1`, `'1'` or absent). `/api/session`'s answer replaces it on every load and whenever the page comes back into view. Reset keeps it, as §10's *Kept* list says.
- **The deploy.** `deploy.yml` is gone. `ci.yml` runs the tests, the build and a dry-run bundle of the Worker on every push and pull request, and deploys nothing. Cloudflare's Git integration deploys (§8).
- **`CLAUDE.md`, `README.md`, the handoff and the plan** are current: the address, the Worker, the sign-in, the deploy, `base`.

## 3. The routes, and what each checks

Read against §14. Every route is in `worker/app.ts`.

**Before any route:**
- **The address:** https only, except plain http on `localhost` for a local run.
- **Every write** (any method but GET and HEAD) must carry this address's own `Origin`, or it gets 403.
- **Any other `/api/` path** gets 404.
- **Bodies:** the Worker entry reads each body whole, up to 10 MB, before the object sees it, and refuses a larger one with 413.

| Route | Who can call it | What it checks |
|---|---|---|
| `GET /api/session` | anyone | Answers `{signedIn}`. A live session used more than a day ago is renewed and its cookie sent again. One unused for 90 days is deleted. |
| `POST /api/passkey/register/options` | anyone with the setup code | The limit first: after five wrong codes in ten minutes, counted over every address, every try is refused with 429 and `Retry-After`, the right code included, until the oldest wrong try leaves the window. Then the code, compared over SHA-256 digests in constant time. A wrong code gets 403 and counts. With no `SETUP_CODE` set, every try gets 503. Only then does it issue a challenge, with the passkeys already made here listed so the same device can't make a second. |
| `POST /api/passkey/register/verify` | the page that got those options | The challenge, read from the response: it must exist, be a registration challenge, be issued for this origin and address, and be under five minutes old. It is deleted before anything else is checked, so a failed try uses it up. Then SimpleWebAuthn checks the origin, the address, user presence and user verification. Then it stores the passkey and starts a session. |
| `POST /api/passkey/login/options` | anyone | Issues a challenge with user verification required and no list of passkeys. At most 20 challenges are held, oldest dropped, because asking needs no sign-in. |
| `POST /api/passkey/login/verify` | the page that got those options | The challenge, checked as above. The passkey must be one this Worker made, at this address. SimpleWebAuthn checks the signature, the origin, the address, user verification and the signature counter. Then it stores the new count and starts a session. |
| `POST /api/sign-out` | anyone | Deletes the session the cookie names, if any, and clears the cookie. |
| `/api/github/…` | a signed-in device | See below. |

**The pass through, `/api/github/…`:**
1. **The session.** None, or a lapsed one, gets 401 and the cookie cleared, before anything else is looked at. A session used more than a day ago is renewed.
2. **The raw address.** Refused if it holds `..`, a backslash or **any percent escape** (an encoded slash among them), a query, `//` or a dot segment. Nothing is decoded or normalized.
3. **The allow-list**, relative to the one repository set in `wrangler.jsonc` (`dmb1107/pizza-bake-log`). The page names no repository, so it can't ask for another. `NAME` is `[A-Za-z0-9][A-Za-z0-9_.-]{0,127}`:

| Method | Path after `/api/github` | GitHub call |
|---|---|---|
| GET | (none) | the repository (`checkRepo`) |
| GET | `/contents/bakes`, `/contents/toppings`, `/contents/toppings/images` | a folder's listing |
| GET, PUT, DELETE | `/contents/bakes/NAME.json`, `/contents/toppings/NAME.json` | a bake or an idea |
| GET, PUT, DELETE | `/contents/toppings/images/NAME.jpg` | a photo |
| GET | `/git/blobs/` + 40 or 64 hex | a photo's bytes |

   Anything else gets 403 before the token is attached.
4. **The body.** A PUT may carry only `message`, `content` and `sha`, and a DELETE only `message` and `sha`, all strings. Anything else gets 400, `branch`, `committer` and `author` included.
5. **The call.** It goes to `https://api.github.com/repos/dmb1107/pizza-bake-log` plus the path, with the token, GitHub's API version and a User-Agent. No header from the page's request is passed on, the cookie included.
6. **The answer.** It is re-serialized with every `download_url` removed. GitHub's 401 or 403 comes back as **502**, never as 401, so a refused token doesn't sign the device out. An unreachable GitHub is 502, and no `GITHUB_TOKEN` set is 503.

**The cookie** is `__Host-pizza-session`: 32 random bytes, `HttpOnly; Secure; SameSite=Strict; Path=/`, no Domain, and `Max-Age` 90 days. The `__Host-` prefix makes the browser refuse it unless it has exactly those attributes. The Worker stores only its SHA-256, so a copy of the store holds no working cookie.

## 4. Choices that need a sentence in §14

### 4.1 The relying party is the request's own address

§14 and MESSAGE-75 §5 name the relying party `pizza.dave-becker.com`. The Worker takes it from the address each request came to. On the custom domain that is exactly `pizza.dave-becker.com`. On the preview it is the preview's address, so a passkey made there works only there, as your §5 expected. The production Worker has its workers.dev address switched off (`workers_dev: false`), so the custom domain is its only address. Each stored passkey records its address, and a sign-in elsewhere is refused (tested). Suggested wording, after §14.3's first paragraph:

> A passkey belongs to the address it was made at: one made on a preview doesn't sign in at `pizza.dave-becker.com`.

### 4.2 What the Worker passes, beyond paths

Two additions to §14.2's list, both in §3 above. A write carries only a message, the content and the version (`sha`). The contents API would otherwise take `branch`, `committer` and `author` from the page. And GitHub's answers lose their `download_url`s: for a private repository each one carries a short-lived token that reads that file. The page never read them. Suggested wording, after "and git blobs":

> A write carries only its message, content and version, and the Worker removes the download links from GitHub's answers, since each holds a read token.

### 4.3 Sign out without an answer

The cookie is HttpOnly, so the page can't remove it. Only the Worker can. If Sign out gets no answer (offline), the page says "Couldn't reach the app's server, so this device is still signed in." and stays signed in. Signing out on the page alone would leave the cookie, and the next answer from `/api/session` would sign the device back in. Suggested wording, after "**Sign out** ends it on this device.":

> Without an answer from the Worker, the device stays signed in and says so.

### 4.4 The setup code's limit

"A few a minute" is built as **five wrong codes in any ten minutes, over all addresses**. While over the limit, the right code is refused too, so guessing can't simply continue past it. Five typos lock Dave out of making a passkey for up to ten minutes, and signing in is never limited. The message gives the wait in whole minutes from the Worker's `Retry-After`. Say if you want other figures. They are `SETUP_TRIES` and `SETUP_WINDOW_MS` in `worker/app.ts`.

## 5. Choices that need nothing from you

- **The deploy is Workers Builds**, which keeps any Cloudflare token out of GitHub (§8).
- **A Content-Security-Policy** (`public/_headers`), which Cloudflare serves with the page: everything from this address only, images also from `blob:` and `data:`, no frames. The page loads nothing from elsewhere. The Worker suite fails on any console error but the expected 401s, and the page raised none under it. It limits what a script slipped into a Markdown field could reach, beside the HttpOnly cookie.
- **The preview** is its own Worker, `pizza-calculator-preview`, on workers.dev (`env.preview`), with its own object, passkeys, sessions and secrets. Cloudflare doesn't make version preview URLs for a Worker with a Durable Object, so a separate Worker is how a preview gets an address before the custom domain. Delete it after the switchover.
- **`.node-version`** is 22, so Workers Builds uses the Node that CI uses.

## 6. Rendered copy

§14.3's four phrases are exact and held by a test: **Sign in**, **Sign out**, **Create a passkey**, **Setup code**. The rest is ours, written to the writing rules. Screenshots at 375 px are attached:
- WebKit as a home-screen app: `app10-signed-out.png`, `app10-creating-a-passkey.png` (after one wrong code, the right one typed), `app10-signed-in.png`;
- Chromium against the real Worker: `worker-signed-out.png`, `worker-creating-a-passkey.png`, `worker-signed-in.png`, with the bake from "another device".

| Where | Copy |
|---|---|
| Bake log, signed out | This device is signed out, so the log and the topping ideas are kept in this browser only. Sign in with your passkey to sync them with your other devices. |
| Under Sign in | No passkey for this app yet? Creating one takes the setup code set in the app’s server. |
| While a passkey is asked for | Waiting for the passkey… |
| Wrong setup code | That setup code isn't right. |
| At the limit | Too many wrong setup codes. Try again in {n} minutes. ("1 minute" for one) |
| No setup code set | The app's server has no setup code set, so it can't make a passkey. |
| Device already holds one | This device already has a passkey for this app. Sign in instead. |
| Prompt dismissed, or no passkey here | The passkey request was cancelled or timed out. |
| Browser without passkeys | This browser can't use passkeys. |
| Passkey the Worker doesn't know | The app's server doesn't know that passkey. Create one with the setup code. |
| Signature refused | The app's server didn't accept that passkey. |
| Offline | Couldn't reach the app's server. Check the connection and try again. |
| Sign out offline | Couldn't reach the app's server, so this device is still signed in. |
| Signed in, each store | Synced the log at 3:00 PM. / Synced the topping ideas at 3:00 PM. / Syncing the log… / 2 changes to the log waiting to sync. / Couldn't sync the log. {reason} |
| Reasons from the Worker | GitHub refused the app's token, or didn't answer. The token in the Worker may need replacing. · The app's server has no GitHub token set. · GitHub can't find the bake-log repository with the app's token. · Couldn't reach the app's server. The log is saved on this device and will sync later. |
| Toppings tab, signed out | Saved in this browser. Sign in on the Bake log tab to sync the ideas with your other devices. |
| Log card after Save | Saved. It syncs to your other devices in the background. / Saved in this browser. Sign in on the Bake log tab to share it with your other devices. |

The sync's status lines no longer name the repository ("with dmb1107/pizza-bake-log"), since the page no longer knows it. A lapsed sign-in shows the signed-out paragraph, since the local changes are already counted on each status line once the device signs in again. "Couldn't reach GitHub" is now "Couldn't reach the app's server", since that is the request that fails offline.

## 7. MESSAGE-75 §6's tests

| # | Test | Where |
|---|---|---|
| 1 | Signed out: no sync request; log, ideas and photos stay | WebKit `signin.spec.ts`: only `GET /api/session` is sent, an idea survives a force close, and a photo saved signed out uploads after signing in (`tabs.spec.ts`). |
| 2 | No code or a wrong one refused, repeated tries limited | `worker.test.ts` (the empty code, a wrong one and a trailing space; the limit and its window to the millisecond; over every address; no code set). Again against the running Worker. |
| 3 | Sync through the Worker; the token nowhere on the page | `worker.test.ts`: every allowed call reaches the one repository with the token, and no answer or header carries it. `auth.test.ts`: no `api.github.com`, `Authorization`, `/repos/` or repository name anywhere in `src/`. The Worker suite: no stored value and no answer the page can fetch holds the token or a `download_url`. The bundle is built from `src/`, which the scan covers. |
| 4 | Refused with no sign-in, another repository, another path, `..`, an encoded slash, another method; none reach GitHub | `worker.test.ts`, 29 requests plus four raw addresses, and against the running Worker, including a raw `..` sent outside the browser. The fake GitHub's log stays empty for all of them. |
| 5 | Renews on use, lapses after 90 days unused; Sign out on the Worker | `worker.test.ts` with a moved clock: no new cookie within a day, renewed at one day, alive at 89 days after a renewal, gone at 90; a sync counts as a use; a copy of the cookie fails after Sign out. Against the running Worker too. |
| 6 | A lapse turns the page to signed out and keeps local copies, which sync after signing in | `bakeLogSync.test.ts` (a 401, then the same change pushed) and WebKit `signin.spec.ts` (the session dropped, an idea added, the page signed out, the idea pushed after Sign in). Breaking the ideas' 401 handling fails it. |
| 7 | The page loads from the root path, assets included | WebKit `signin.spec.ts`: every script and stylesheet from this origin, none under `/pizza-calculator/`, no 4xx. The whole WebKit suite now runs at the root. |

Every new Worker check was run with its guard removed and failed, except two layers that a second check covers. Removing the percent check leaves `NAME`'s pattern refusing every `%`. Removing the stored-address check on sign-in leaves SimpleWebAuthn refusing the RP ID.

## 8. The secrets and the deploy, for Dave

**Once, on the Mac, in this repository:**

```bash
npx wrangler login
```

**The preview** (§9) comes before anything else.

**Workers Builds.** In the Cloudflare dashboard, Workers & Pages, Create, Import a repository: pick `dmb1107/pizza-calculator`, with these settings:
- Worker name `pizza-calculator`, which must match `wrangler.jsonc`;
- production branch `main`;
- build command `npm test && npm run build`;
- deploy command `npx wrangler deploy`;
- root directory `/`;
- builds for non-production branches off.

The first build deploys the Worker and creates `pizza.dave-becker.com`. Until the secrets are set it serves the page, signs no one in and syncs nothing: creating a passkey gets 503, and the sync gets 503.

**The secrets, on the production Worker.** Each command asks for the value:

```bash
npx wrangler secret put GITHUB_TOKEN
```

```bash
npx wrangler secret put SETUP_CODE
```

`GITHUB_TOKEN` is the existing fine-grained token: only `pizza-bake-log`, Contents read and write. `SETUP_CODE` is any long phrase. Keep it in Bitwarden, since it's typed only to create a passkey. Secrets take effect without a redeploy. The dashboard's Settings, Variables and Secrets works as well.

## 9. The preview, and its check

```bash
npm run deploy:preview
```

```bash
npx wrangler secret put GITHUB_TOKEN --env preview
```

```bash
npx wrangler secret put SETUP_CODE --env preview
```

The deploy prints the preview's address, `https://pizza-calculator-preview.<account>.workers.dev`. Then, in the same terminal:

```bash
PREVIEW_URL=https://pizza-calculator-preview.<account>.workers.dev PREVIEW_SETUP_CODE='<the preview code>' npm run test:preview
```

It runs §7's first two *Done when* items in Chromium with a virtual passkey:
- creates a passkey with the setup code and checks that the bakes already in the repository come down;
- adds an idea named "Preview check (delete me)" with a photo, and reads both back from a second browser holding the same passkey;
- sends the out-of-scope requests and expects 400, 403 or 404 for each, and 401 without a sign-in;
- deletes the idea and its photo, then signs out.

**It writes to the real bake-log repository** if the preview's token is the real one: two commits that add the idea and photo, then two that delete them. Give the preview a token for a scratch repository instead, and change `GITHUB_REPO` under `env.preview`, if those commits shouldn't be there. Then delete the preview:

```bash
npx wrangler delete --env preview
```

## 10. The switchover, in order

1. On every device, at `dmb1107.github.io/pizza-calculator`, open the Bake log tab, tap **Sync now**, and wait for "Synced" on both lines.
2. Run the preview and its check (§9), then delete the preview.
3. Merge the PR, and set up Workers Builds (§8). The first build deploys.
4. Set the two secrets on the production Worker (§8).
5. On the Mac, open `https://pizza.dave-becker.com` in Safari, Bake log tab, type the setup code, **Create a passkey**, and save it to Bitwarden or iCloud Keychain.
6. On the iPhone, open `https://pizza.dave-becker.com` **in Safari**, Bake log tab, **Sign in** with the passkey. Then Share, **Add to Home Screen**.
7. Open the new icon. On the Bake log tab check "Synced the log" and the bakes. On the Toppings tab check the ideas and their photos.
8. Delete the old home-screen icon. On each device clear Safari's website data for `dmb1107.github.io`: Settings, Apps, Safari, Advanced, Website Data on the iPhone; Safari, Settings, Privacy, Manage Website Data on the Mac.
9. In the GitHub repository's Settings, Pages, unpublish the site and switch Pages off.

The page's inputs, ticks, timers, open tab and closed groups don't carry over (§14.1), so do this between bakes.

## 11. What the suites can't reach

- **A passkey in Safari or in the home-screen app**, through Face ID, Touch ID or Bitwarden. WebKit in the suite has no authenticator. Its passkey is a stand-in that answers at once, so the WebKit suite checks the page and not the passkey. Chromium's virtual authenticator checks the Worker and the passkey protocol.
- **iOS copying Safari's cookie to the icon** when it is added (§14.3). The suite's profile is one store.
- **Bitwarden's passkey counter.** Synced passkeys from Bitwarden and iCloud send a signature count of 0, which the Worker doesn't compare. A virtual passkey counts up, and the Worker refuses a count that goes backwards, so the suite copies one to a second browser only after the first browser's last use.
- **Cloudflare itself**, until the preview runs: its URL handling before the Worker, the custom domain, and Workers Builds.

## 12. Notes

- **`wrangler dev` rewrites the request's address to the production route**, here `http://pizza.dave-becker.com`, which the Worker refuses as plain http. `--local-upstream localhost:<port>` keeps the local address. `npm run worker:dev` and the Worker suite pass it.
- **A button at the bottom edge of a 375 px screen, tapped while a field has focus, loses the click in Chromium.** The tap moves focus off the field, the tab bar comes back, and the release lands on it. iOS keeps focus in the field (FINDINGS-67), so Dave's phone and the WebKit suite don't see it, and Mac Safari doesn't move focus to a clicked button either. This dates from APP-6's hidden bar, not from this round. The Worker suite scrolls a button to the middle before tapping. Raise it if Android or a narrow Chrome window matters.
- **The Worker uploads 709 KiB (131 KiB gzipped)**, mostly the passkey library's certificate parsers. That is inside the free plan's 3 MB.

## 13. What the preview runs found

- **A new token, not the existing one.** Dave made a new fine-grained token for the Worker: `pizza-bake-log` only, Contents read and write, one year. §14.2 says "the existing fine-grained token" (10g). Once every device has moved, the old token can be revoked, so a copy left in Safari's storage at the old address stops working. That is stronger than clearing the copies. Suggested wording for §14.2's second sentence:

  > It is a fine-grained token made for the Worker, which reaches only the bake-log repository (Dave, 12 Nov 2026); the devices' old token is revoked once every device has moved.

- **A wrong token shows as it should.** The first run had the wrong token in the preview. Every sync came back 502, and the page said "GitHub refused the app's token, or didn't answer. The token in the Worker may need replacing." The device stayed signed in. Replacing the secret fixed it with no redeploy.
- **A new device's first sync takes about half a minute.** With 41 ideas and 34 photos, a new browser makes 92 requests through the Worker, one at a time at 0.2–0.6 s each, about 12 MB in all. Every request succeeded, photos up to 824 KB included. The check now waits for that sync before it adds its idea.
- **A sync rerun fetches every idea again.** This is ours, and older than this round. When an idea is saved while a sync runs, the follow-up sync starts from the store as it was before the first one finished, so it fetches every idea again. Fixed and live; §14 has what it also did.
- **The account's workers.dev subdomain** is now `pizza-calculator.workers.dev`. The account had none, and `wrangler deploy` registered it. It serves only the preview, since the production Worker has its workers.dev address off.

## 14. After the switchover

- **Live.** Workers Builds deploys `main`, and both secrets are set on the production Worker. On Dave's devices, the passkey was made on the Mac and the iPhone signed in in Safari before the icon was added. Every bake, idea and photo came back. GitHub Pages is off, so the old address answers 404. The old token is revoked, and Safari's data for `dmb1107.github.io` is cleared on each device. The preview Worker is deleted, and Workers Builds no longer builds other branches.
- **The sync rerun did more than refetch.** A change made during a sync asked for another, which started before the first sync's result had rendered. It read the store from before the merge, fetched every record again, and also **marked each record it had pulled as changed here**. The next sync would then have written them all back to the repository. Nothing was lost. The page showed "10 changes to the topping ideas waiting to sync" in the test that found it. Both hooks now start the rerun from an effect, once the merged store has rendered (PR #62, live). A WebKit test seeds ten ideas, saves one mid-sync, and checks that each seeded idea is fetched once, none is written back, and nothing is left waiting. It fails without the fix. Nothing in the spec changes.
