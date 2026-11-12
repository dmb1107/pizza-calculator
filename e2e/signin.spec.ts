/**
 * APP-10 (MESSAGE-75): the app at the root of its own address, and the
 * passkey sign-in, as a home-screen app at 375 px. The Worker and the
 * passkey are stood in for (`worker.ts`); the Worker's own checks are
 * `tests/worker.test.ts`, and a real passkey through the real Worker is
 * `e2e-worker/passkey.spec.ts` in Chromium.
 *
 * Screenshots for FINDINGS go to `APP10_SHOTS` when it is set.
 */
import { expect, test, type Page } from '@playwright/test';
import { forceClose, openPhone, tab } from './phone';
import { TEST_SETUP_CODE, fakePasskeys, newRepo, stubWorker, type FakeRepo } from './worker';

const T0 = new Date('2026-11-12T18:00:00-05:00').getTime();
const S = 1_000;
const MIN = 60 * S;
const SHOTS = process.env['APP10_SHOTS'];

const panel = (page: Page, label: string) => page.getByRole('tabpanel', { name: label });
const logTab = (page: Page) => panel(page, 'Bake log');
const button = (page: Page, name: string) => logTab(page).getByRole('button', { name, exact: true });
const ideaFiles = (repo: FakeRepo) => [...repo.files.keys()].filter((p) => /^toppings\/[^/]+\.json$/.test(p));

async function phoneAt(profile: string, repo: FakeRepo, device: string, time: number, baseURL: string) {
  const phone = await openPhone(profile, { time }, baseURL);
  await phone.page.setViewportSize({ width: 375, height: 812 });
  await fakePasskeys(phone.context);
  await stubWorker(phone.context, repo, device);
  // The stubs apply from the next load.
  await phone.page.reload();
  await expect(tab(phone.page, 'Recipe')).toBeAttached();
  return phone;
}

async function addIdea(page: Page, name: string) {
  await tab(page, 'Toppings').tap();
  await page.getByRole('button', { name: 'Add idea', exact: true }).tap();
  const form = panel(page, 'Toppings').locator('form');
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await form.getByRole('button', { name: 'Save', exact: true }).tap();
  await expect(form).toHaveCount(0);
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await logTab(page).getByRole('heading', { name: 'Sync between devices' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('APP-10: the app on its own address, with a passkey sign-in', () => {
  test('loads from the root path, assets included, with nothing from the old address', async ({ baseURL }, info) => {
    const repo = newRepo();
    const failed: string[] = [];
    const phone = await openPhone(info.outputPath('p'), { time: T0 }, baseURL!);
    phone.page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('/api/')) failed.push(`${r.status()} ${r.url()}`);
    });
    await stubWorker(phone.context, repo, 'p');
    await phone.page.reload();
    await expect(tab(phone.page, 'Recipe')).toBeAttached();
    const assets = await phone.page.evaluate(() =>
      [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>('script[src], link[href]')].map((e) =>
        e instanceof HTMLScriptElement ? e.src : e.href,
      ),
    );
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      expect(new URL(a).origin).toBe(new URL(baseURL!).origin);
      expect(a).not.toContain('/pizza-calculator/');
    }
    expect(assets.some((a) => /\/assets\/index-[\w-]+\.js$/.test(a))).toBe(true);
    expect(failed).toEqual([]);
    expect(phone.page.url()).toBe(baseURL);
    await forceClose(phone);
  });

  test('signed out: everything stays on this device, and nothing reaches the repository', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phone = await phoneAt(info.outputPath('a'), repo, 'a', T0, baseURL!);
    const { page } = phone;
    await addIdea(page, 'Anchovy, capers, oregano');
    await page.clock.runFor(5 * S);
    await expect(panel(page, 'Toppings')).toContainText('Saved in this browser. Sign in on the Bake log tab');

    await tab(page, 'Bake log').tap();
    await expect(logTab(page)).toContainText('This device is signed out, so the log and the topping ideas are kept in this browser only.');
    await expect(button(page, 'Sign in')).toBeVisible();
    await expect(logTab(page).getByLabel('Setup code')).toBeVisible();
    await expect(button(page, 'Create a passkey')).toBeDisabled();
    await expect(logTab(page).getByRole('button', { name: 'Sync now' })).toHaveCount(0);
    await shot(page, 'app10-signed-out');

    // No request reached the repository; the page only asked whether it was signed in.
    expect(repo.requests).toEqual([]);
    expect(new Set(repo.authRequests)).toEqual(new Set(['GET /api/session']));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // Through a force close: still here, still signed out.
    await forceClose(phone);
    const again = await phoneAt(info.outputPath('a'), repo, 'a', T0 + MIN, baseURL!);
    await tab(again.page, 'Toppings').tap();
    await expect(panel(again.page, 'Toppings')).toContainText('Anchovy, capers, oregano');
    expect(repo.requests).toEqual([]);
    await forceClose(again);
  });

  test('creating a passkey: a wrong setup code is refused, the right one signs in and syncs', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phone = await phoneAt(info.outputPath('a'), repo, 'a', T0, baseURL!);
    const { page } = phone;
    await addIdea(page, 'Potato, rosemary, pecorino');
    await tab(page, 'Bake log').tap();

    const code = logTab(page).getByLabel('Setup code');
    const create = button(page, 'Create a passkey');
    await code.fill('not the code');
    // Measured once it's on screen, since a tap scrolls a control into view first.
    await create.scrollIntoViewIfNeeded();
    const before = await create.boundingBox();
    await create.tap();
    await expect(logTab(page).getByRole('status')).toHaveText("That setup code isn't right.");
    // The message is below the buttons: nothing moved above the tap.
    expect((await create.boundingBox())!.y).toBe(before!.y);
    expect(repo.sessions.has('a')).toBe(false);

    await code.fill(TEST_SETUP_CODE);
    await shot(page, 'app10-creating-a-passkey');
    await create.tap();
    await expect(button(page, 'Sign out')).toBeVisible();
    await expect(logTab(page)).toContainText('Synced the log');
    await expect(logTab(page)).toContainText('Synced the topping ideas');
    await expect.poll(() => ideaFiles(repo).length).toBe(1);
    await shot(page, 'app10-signed-in');

    // The page never sent a token, and stores nothing like one.
    expect(repo.tokensSeen).toEqual([]);
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored).not.toMatch(/token|github_pat_|ghp_|Bearer/i);
    expect(stored).not.toContain(TEST_SETUP_CODE);

    // The sign-in survives a force close, as the cookie does.
    await forceClose(phone);
    const again = await phoneAt(info.outputPath('a'), repo, 'a', T0 + MIN, baseURL!);
    await tab(again.page, 'Bake log').tap();
    await expect(button(again.page, 'Sign out')).toBeVisible();
    await forceClose(again);
  });

  test('a lapsed sign-in turns the page to signed out, keeps what is here, and syncs it after signing in', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phone = await phoneAt(info.outputPath('a'), repo, 'a', T0, baseURL!);
    const { page } = phone;
    await tab(page, 'Bake log').tap();
    await button(page, 'Sign in').tap();
    await expect(logTab(page)).toContainText('Synced the topping ideas');

    // The Worker's session lapses (90 days unused, or Sign out on the Worker).
    repo.sessions.delete('a');
    await addIdea(page, 'Nduja and stracciatella');
    await page.clock.runFor(3 * S);
    await tab(page, 'Bake log').tap();
    await expect(button(page, 'Sign in')).toBeVisible();
    await expect(logTab(page)).toContainText('This device is signed out, so the log and the topping ideas are kept in this browser only.');
    await tab(page, 'Toppings').tap();
    await expect(panel(page, 'Toppings')).toContainText('Nduja and stracciatella');
    expect(ideaFiles(repo)).toEqual([]);

    await tab(page, 'Bake log').tap();
    await button(page, 'Sign in').tap();
    await expect(button(page, 'Sign out')).toBeVisible();
    await expect.poll(() => ideaFiles(repo).length).toBe(1);
    await forceClose(phone);
  });

  test('Sign out ends the sign-in on the Worker, and the page stays signed out', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phone = await phoneAt(info.outputPath('a'), repo, 'a', T0, baseURL!);
    const { page } = phone;
    await tab(page, 'Bake log').tap();
    await button(page, 'Sign in').tap();
    await expect(button(page, 'Sign out')).toBeVisible();
    await button(page, 'Sign out').tap();
    await expect(button(page, 'Sign in')).toBeVisible();
    expect(repo.sessions.has('a')).toBe(false);
    expect(repo.authRequests).toContain('POST /api/sign-out');
    await forceClose(phone);
    const again = await phoneAt(info.outputPath('a'), repo, 'a', T0 + MIN, baseURL!);
    await tab(again.page, 'Bake log').tap();
    await expect(button(again.page, 'Sign in')).toBeVisible();
    await forceClose(again);
  });
});
