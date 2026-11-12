/**
 * MESSAGE-75 §7's *Done when* on the preview deploy (`npm run test:preview`).
 *
 * Runs only when PREVIEW_URL (the preview's workers.dev address) and
 * PREVIEW_SETUP_CODE (the setup code set on the preview) are in the
 * environment, which Dave sets in his own terminal. Chromium's virtual
 * authenticator makes a passkey for the preview's address only; it can't
 * sign in anywhere else, and the preview Worker is deleted afterwards.
 *
 * It writes one idea with a photo, named PREVIEW_IDEA, to the repository the
 * preview reaches, reads it back from a second browser, and deletes both.
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

const URL_ = process.env['PREVIEW_URL'] ?? '';
const CODE = process.env['PREVIEW_SETUP_CODE'] ?? '';
const PREVIEW_IDEA = 'Preview check (delete me)';

test.skip(!URL_ || !CODE, 'Set PREVIEW_URL and PREVIEW_SETUP_CODE to run against the preview deploy');

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
  return { page, cdp, authenticatorId };
}

const logPanel = (page: Page) => page.getByRole('tabpanel', { name: 'Bake log' });
const openTab = (page: Page, name: string) => page.getByRole('tab', { name: name === 'Recipe' ? /^Recipe/ : name, exact: name !== 'Recipe' }).click();
const button = (page: Page, name: string) => logPanel(page).getByRole('button', { name, exact: true });
async function press(target: Locator) {
  await target.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await target.click();
}

test('the preview: a passkey, a sign-in, bakes, an idea and a photo through the Worker, Sign out, and the refusals', async ({ browser }) => {
  test.setTimeout(120_000);
  const base = URL_.replace(/\/?$/, '/');
  const contextA = await browser.newContext({ baseURL: base });
  const a = await device(contextA);
  await a.page.goto('/');
  await openTab(a.page, 'Bake log');
  await logPanel(a.page).getByLabel('Setup code').fill(CODE);
  await press(button(a.page, 'Create a passkey'));
  await expect(button(a.page, 'Sign out')).toBeVisible({ timeout: 20_000 });
  await expect(logPanel(a.page)).toContainText('Synced the log', { timeout: 20_000 });
  // The bakes already in the repository came down.
  await expect(logPanel(a.page).getByText(/ · \d+ × \d+ g · /).first()).toBeVisible();

  // An idea with a photo.
  await openTab(a.page, 'Toppings');
  await a.page.getByRole('button', { name: 'Add idea', exact: true }).click();
  const form = a.page.getByRole('tabpanel', { name: 'Toppings' }).locator('form');
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill(PREVIEW_IDEA);
  const jpeg = await a.page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 600;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'hsl(30 70% 50%)';
    ctx.fillRect(0, 0, 800, 600);
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const [chooser] = await Promise.all([a.page.waitForEvent('filechooser'), form.getByRole('button', { name: 'Add photo', exact: true }).click()]);
  await chooser.setFiles({ name: 'preview.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await openTab(a.page, 'Bake log');
  await expect(logPanel(a.page)).toContainText('Synced the topping ideas', { timeout: 30_000 });
  await expect(logPanel(a.page)).not.toContainText('waiting to sync', { timeout: 30_000 });

  // A second browser with the same passkey reads it back, photo included.
  const synced = await a.cdp.send('WebAuthn.getCredentials', { authenticatorId: a.authenticatorId });
  const contextB = await browser.newContext({ baseURL: base });
  const b = await device(contextB);
  await b.cdp.send('WebAuthn.addCredential', { authenticatorId: b.authenticatorId, credential: synced.credentials[0]! });
  await b.page.goto('/');
  await openTab(b.page, 'Bake log');
  await button(b.page, 'Sign in').click();
  await expect(button(b.page, 'Sign out')).toBeVisible({ timeout: 20_000 });
  await openTab(b.page, 'Toppings');
  const card = b.page.locator('li').filter({ has: b.page.getByRole('button', { name: new RegExp(`^${PREVIEW_IDEA.replace(/[()]/g, '\\$&')}`) }) });
  await expect(card.getByRole('button').first().locator('img')).toBeVisible({ timeout: 30_000 });

  // The refusals, signed in, from the page itself.
  const refused = await b.page.evaluate(async () => {
    const put = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'x', content: '' }) };
    const cases: [string, RequestInit?][] = [
      ['/api/github/repos/dmb1107/other/contents/bakes'],
      ['/api/github/contents/README.md'],
      ['/api/github/contents/.github/workflows/x.yml', put],
      ['/api/github/git/trees/main'],
      ['/api/github/contents/bakes/a.json', { method: 'POST', body: '{}' }],
      ['/api/github/contents/bakes%2F..%2Fx'],
      ['/api/github/contents/bakes/a.json', { ...put, body: JSON.stringify({ message: 'x', content: '', branch: 'other' }) }],
    ];
    const out: string[] = [];
    for (const [p, init] of cases) out.push(`${init?.method ?? 'GET'} ${p} ${(await fetch(p, init)).status}`);
    return out;
  });
  for (const line of refused) expect(line, line).toMatch(/ (400|403|404)$/);
  const signedOutContext = await browser.newContext({ baseURL: base });
  const anon = await signedOutContext.newPage();
  await anon.goto('/');
  expect(await anon.evaluate(async () => (await fetch('/api/github/contents/bakes')).status)).toBe(401);

  // Clean up: delete the idea (and with it its photo) from the first browser.
  await openTab(a.page, 'Toppings');
  const own = a.page.locator('li').filter({ has: a.page.getByRole('button', { name: new RegExp(`^${PREVIEW_IDEA.replace(/[()]/g, '\\$&')}`) }) });
  const edit = own.getByRole('button', { name: 'Edit', exact: true });
  // A card just saved may already be open.
  if (!(await edit.isVisible())) await own.getByRole('button').first().click();
  await edit.click();
  await own.getByRole('button', { name: 'Delete', exact: true }).click();
  await own.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await openTab(a.page, 'Bake log');
  await button(a.page, 'Sync now').click();
  await expect(logPanel(a.page)).not.toContainText('waiting to sync', { timeout: 30_000 });

  // Sign out.
  await button(a.page, 'Sign out').click();
  await expect(button(a.page, 'Sign in')).toBeVisible();
  expect(await contextA.cookies()).toEqual([]);
  await Promise.all([contextA.close(), contextB.close(), signedOutContext.close()]);
});
