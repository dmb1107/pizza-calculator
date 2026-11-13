/**
 * MESSAGE-75 §7's *Done when*, against the real Worker in workerd
 * (`npm run test:worker`): a passkey created with the setup code, a sign-in,
 * bakes, ideas and a photo synced through the Worker, Sign out, and the
 * out-of-scope requests of §6 test 4 refused by the running Worker, none of
 * them reaching GitHub. The passkey is Chromium's virtual authenticator;
 * GitHub is `fakeGitHub.mjs`.
 *
 * Screenshots go to `APP10_WORKER_SHOTS` when it is set.
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { currentFormulaSnapshot } from '../src/lib/bakeLog';

const GITHUB = 'http://127.0.0.1:8790';
const SETUP_CODE = 'local-setup-code';
const SHOTS = process.env['APP10_WORKER_SHOTS'];

interface GitHubLog {
  log: { method: string; path: string; auth: string | null; cookie: string | null }[];
  files: string[];
}
const github = async (): Promise<GitHubLog> => (await fetch(`${GITHUB}/__log`)).json() as Promise<GitHubLog>;

/** A device with a passkey store: Chromium's virtual platform authenticator, user verified. */
async function device(context: BrowserContext) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return { page, cdp, authenticatorId, errors };
}

const logPanel = (page: Page) => page.getByRole('tabpanel', { name: 'Bake log' });
const openTab = (page: Page, name: string) => page.getByRole('tab', { name: name === 'Recipe' ? /^Recipe/ : name, exact: name !== 'Recipe' }).click();
const button = (page: Page, name: string) => logPanel(page).getByRole('button', { name, exact: true });


async function drawnJpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 900;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'hsl(20 70% 45%)';
    ctx.fillRect(0, 0, 1200, 900);
    ctx.fillStyle = 'hsl(50 80% 70%)';
    ctx.beginPath();
    ctx.arc(600, 450, 300, 0, 7);
    ctx.fill();
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

async function shot(page: Page, name: string, target?: Locator) {
  if (!SHOTS) return;
  if (target) await target.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** A bake as another device would have saved it, put straight into the fake repository. */
async function bakeFromElsewhere(id: string) {
  const bake = {
    bake_id: id,
    date: id.slice(0, 10),
    balls: 6,
    ball_g: 265,
    n_mix: 1,
    formula: currentFormulaSnapshot(),
    room_temp_f: 70,
    flour_temp_f: 69,
    flour_follows_room: false,
    mixes: [
      {
        mix_index: 1,
        biga_temp_at_mix_f: 58,
        bowl_temp_f: 58,
        bowl_prefilled: false,
        water_temp_used_f: 63,
        final_dough_temp_f: 73.5,
        phase_seconds: { a: 210, b: 480, c: 210, d: 52.5 },
        excluded: false,
      },
    ],
  };
  const res = await fetch(`${GITHUB}/repos/dmb1107/pizza-bake-log/contents/bakes/${id}.json`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer local-test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test', content: Buffer.from(`${JSON.stringify(bake, null, 2)}\n`).toString('base64') }),
  });
  expect(res.status).toBe(201);
}

test.beforeEach(async () => {
  await fetch(`${GITHUB}/__reset`, { method: 'POST' });
});

test('a passkey made with the setup code; bakes, ideas and a photo through the Worker; Sign out', async ({ browser }) => {
  await bakeFromElsewhere('2026-11-08-170000');
  const contextA = await browser.newContext();
  const a = await device(contextA);
  await a.page.goto('/');
  await openTab(a.page, 'Bake log');
  await expect(button(a.page, 'Sign in')).toBeVisible();
  await shot(a.page, 'worker-signed-out', logPanel(a.page).getByRole('heading', { name: 'Sync between devices' }));
  // Signed out, nothing has reached GitHub.
  expect((await github()).log.filter((r) => !r.path.includes('/bakes/2026-11-08'))).toEqual([]);

  // Signing in with no passkey on the device fails and says so.
  await button(a.page, 'Sign in').click();
  await expect(logPanel(a.page).getByRole('status')).not.toHaveText('');
  await expect(button(a.page, 'Sign in')).toBeVisible();

  // A wrong setup code, then the right one.
  const code = logPanel(a.page).getByLabel('Setup code');
  await code.fill('wrong code');
  await button(a.page, 'Create a passkey').click();
  await expect(logPanel(a.page).getByRole('status')).toHaveText("That setup code isn't right.");
  await code.fill(SETUP_CODE);
  await shot(a.page, 'worker-creating-a-passkey', button(a.page, 'Create a passkey'));
  await button(a.page, 'Create a passkey').click();
  await expect(button(a.page, 'Sign out')).toBeVisible();
  const made = await a.cdp.send('WebAuthn.getCredentials', { authenticatorId: a.authenticatorId });
  expect(made.credentials).toHaveLength(1);
  expect(made.credentials[0]!.rpId).toBe('localhost');
  expect(made.credentials[0]!.isResidentCredential).toBe(true);

  // The cookie: HttpOnly, Secure, SameSite=Strict, this address only.
  const cookies = await contextA.cookies();
  expect(cookies).toHaveLength(1);
  expect(cookies[0]).toMatchObject({ name: '__Host-pizza-session', httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
  expect(await a.page.evaluate(() => document.cookie)).toBe('');

  // The bake saved elsewhere came down through the Worker.
  await expect(logPanel(a.page)).toContainText('Synced the log');
  await expect(logPanel(a.page)).toContainText('2026-11-08 · 6 × 265 g');
  await shot(a.page, 'worker-signed-in', logPanel(a.page).getByRole('heading', { name: 'Sync between devices' }));

  // An idea with a photo goes up: the photo first, then the idea.
  await openTab(a.page, 'Toppings');
  await a.page.getByRole('button', { name: 'Add idea', exact: true }).click();
  const form = a.page.getByRole('tabpanel', { name: 'Toppings' }).locator('form');
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill('Soppressata, hot honey');
  // The field formats as typed (APP-14): typed into, as a person would.
  await form.getByRole('textbox', { name: 'Pre-bake', exact: true }).click();
  await a.page.keyboard.type('Fior di latte');
  await a.page.keyboard.press('Enter');
  await a.page.keyboard.type('Soppressata');
  // In the middle of the screen, clear of the tab bar that comes back as focus leaves the field (#64).
  const addPhoto = form.getByRole('button', { name: 'Add photo', exact: true });
  await addPhoto.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const [chooser] = await Promise.all([a.page.waitForEvent('filechooser'), addPhoto.click()]);
  await chooser.setFiles({ name: 'pizza.jpg', mimeType: 'image/jpeg', buffer: await drawnJpeg(a.page) });
  await expect(form.getByRole('img', { name: 'Soppressata, hot honey' })).toBeVisible();
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await github()).files.filter((f) => f.startsWith('toppings/')).length, { timeout: 15_000 }).toBe(2);
  const gh = await github();
  expect(gh.files.some((f) => /^toppings\/images\/[\w-]+\.jpg$/.test(f))).toBe(true);
  // Every request reached GitHub with the Worker's token and none of the page's cookies.
  for (const r of gh.log) {
    expect(r.auth).toBe('Bearer local-test-token');
    expect(r.cookie).toBeNull();
    expect(r.path.startsWith('/repos/dmb1107/pizza-bake-log')).toBe(true);
  }

  // Sign out ends it on the Worker: a copy of the old cookie no longer works.
  const before = await contextA.cookies();
  await openTab(a.page, 'Bake log');
  await button(a.page, 'Sign out').click();
  await expect(button(a.page, 'Sign in')).toBeVisible();
  expect(await contextA.cookies()).toEqual([]);
  const replay = await browser.newContext();
  await replay.addCookies(before);
  const replayPage = await replay.newPage();
  await replayPage.goto('/');
  expect(await replayPage.evaluate(async () => (await (await fetch('/api/session')).json()) as unknown)).toEqual({ signedIn: false });

  // And signs in again with the passkey alone.
  await button(a.page, 'Sign in').click();
  await expect(button(a.page, 'Sign out')).toBeVisible();

  // The same passkey on a second device, as a password manager syncs it.
  const contextB = await browser.newContext();
  const b = await device(contextB);
  // Taken after A's last use: a virtual passkey counts its signatures, and the
  // Worker refuses a count that goes backwards. Synced passkeys (iCloud,
  // Bitwarden) send 0, which isn't checked.
  const synced = await a.cdp.send('WebAuthn.getCredentials', { authenticatorId: a.authenticatorId });
  await b.cdp.send('WebAuthn.addCredential', { authenticatorId: b.authenticatorId, credential: synced.credentials[0]! });
  await b.page.goto('/');
  await openTab(b.page, 'Bake log');
  await button(b.page, 'Sign in').click();
  await expect(button(b.page, 'Sign out')).toBeVisible();
  await expect(logPanel(b.page)).toContainText('2026-11-08 · 6 × 265 g');
  await openTab(b.page, 'Toppings');
  const card = b.page.locator('li').filter({ has: b.page.getByRole('button', { name: /^Soppressata, hot honey/ }) });
  await expect(card).toBeVisible();
  // The closed card's thumbnail (decorative), then the photo itself once opened.
  await expect(card.getByRole('button').first().locator('img')).toBeVisible({ timeout: 15_000 });
  await card.getByRole('button').first().click();
  await expect(card.getByRole('img', { name: 'Soppressata, hot honey', exact: true })).toBeVisible();
  expect((await github()).log.some((r) => r.path.includes('/git/blobs/'))).toBe(true);

  // No answer the page saw carried the token, and nothing it stored does.
  const stored = await b.page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain('local-test-token');
  expect(stored).not.toContain(SETUP_CODE);
  const answers = await b.page.evaluate(async () => {
    const out: string[] = [];
    for (const p of ['/api/github', '/api/github/contents/bakes', '/api/github/contents/toppings', '/api/session']) {
      const r = await fetch(p);
      out.push(JSON.stringify([...r.headers]) + (await r.text()));
    }
    return out.join('\n');
  });
  expect(answers).not.toContain('local-test-token');
  expect(answers).not.toContain('download_url');

  expect(a.errors.filter((e) => !/401|Failed to load resource/.test(e))).toEqual([]);
  await Promise.all([contextA.close(), contextB.close(), replay.close()]);
});

test('the running Worker refuses what the sync never sends, and none of it reaches GitHub', async ({ browser }) => {
  const context = await browser.newContext();
  const d = await device(context);
  await d.page.goto('/');

  // No sign-in: 401, for every path.
  const signedOut = await d.page.evaluate(async () => {
    const out: number[] = [];
    for (const p of ['/api/github', '/api/github/contents/bakes', '/api/github/git/blobs/' + 'a'.repeat(40)]) out.push((await fetch(p)).status);
    return out;
  });
  expect(signedOut).toEqual([401, 401, 401]);

  await openTab(d.page, 'Bake log');
  await logPanel(d.page).getByLabel('Setup code').fill(SETUP_CODE);
  await button(d.page, 'Create a passkey').click();
  await expect(logPanel(d.page)).toContainText('Synced the log');
  await fetch(`${GITHUB}/__reset`, { method: 'POST' });

  const refused = await d.page.evaluate(async () => {
    const put = (body: unknown) => ({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const cases: [string, RequestInit?][] = [
      ['/api/github/repos/dmb1107/other/contents/bakes'],
      ['/api/github/contents/README.md'],
      ['/api/github/contents/secrets'],
      ['/api/github/contents/.github/workflows/x.yml', put({ message: 'x', content: '' })],
      ['/api/github/contents/bakes/x.txt', put({ message: 'x', content: '' })],
      ['/api/github/git/trees/main'],
      ['/api/github/collaborators'],
      ['/api/github/contents/bakes/a.json', { method: 'POST', body: '{}' }],
      ['/api/github/contents/bakes/a.json', { method: 'PATCH', body: '{}' }],
      ['/api/github', { method: 'DELETE' }],
      ['/api/github/contents/bakes%2F..%2F..%2Fx'],
      ['/api/github/contents/bakes%2fa.json', put({ message: 'x', content: '' })],
      ['/api/github/contents/bakes/a.json?ref=other'],
    ];
    const out: string[] = [];
    for (const [p, init] of cases) {
      const r = await fetch(p, init);
      out.push(`${init?.method ?? 'GET'} ${p} ${r.status}`);
    }
    return out;
  });
  for (const line of refused) expect(line, line).toMatch(/ (403|404)$/);

  // ".." in a raw request line, past the browser's own normalizing.
  const raw = await fetch(`http://localhost:8788/api/github/contents/bakes/../../collaborators`, {
    headers: { Cookie: (await context.cookies()).map((c) => `${c.name}=${c.value}`).join('; '), Origin: 'http://localhost:8788' },
  });
  expect([403, 404]).toContain(raw.status);

  // A write from another page is refused before anything else.
  const foreign = await fetch('http://localhost:8788/api/passkey/register/options', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupCode: SETUP_CODE }),
  });
  expect(foreign.status).toBe(403);

  expect((await github()).log).toEqual([]);
  await context.close();
});

test('wrong setup codes are limited, the right one included, across fresh browsers', async ({ browser }) => {
  // Earlier tests in this run may have used some of the tries; the limit is
  // over every address, so count until it bites.
  const statuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const res = await fetch('http://localhost:8788/api/passkey/register/options', {
      method: 'POST',
      headers: { Origin: 'http://localhost:8788', 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupCode: `guess ${i}` }),
    });
    statuses.push(res.status);
  }
  const first429 = statuses.indexOf(429);
  expect(first429).toBeGreaterThan(-1);
  expect(statuses.slice(0, first429).every((x) => x === 403)).toBe(true);
  expect(statuses.slice(first429).every((x) => x === 429)).toBe(true);
  const context = await browser.newContext();
  const d = await device(context);
  await d.page.goto('/');
  await openTab(d.page, 'Bake log');
  await logPanel(d.page).getByLabel('Setup code').fill(SETUP_CODE);
  await button(d.page, 'Create a passkey').click();
  await expect(logPanel(d.page).getByRole('status')).toHaveText(/^Too many wrong setup codes\. Try again in \d+ minutes?\.$/);
  await expect(button(d.page, 'Sign in')).toBeVisible();
  await context.close();
});
