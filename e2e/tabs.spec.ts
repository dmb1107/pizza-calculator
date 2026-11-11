/**
 * APP-6 (MESSAGE-70): three tabs, and the topping ideas. MESSAGE-70's *Done
 * when*, as a home-screen app at 375 px and in a desktop-width browser, run
 * as the rest of the iPhone suite is (`phone.ts`).
 *
 * The GitHub API is stubbed with one in-memory repository that every
 * profile in a test talks to, so "added in one profile, appears in another"
 * is two browsers and one repository.
 *
 * Screenshots for FINDINGS go to `APP6_SHOTS` when it is set.
 */
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { beeps, done, forceClose, openPhone, step, tab, timer, typeInto, wait } from './phone';

const T0 = new Date('2026-11-12T18:00:00-05:00').getTime();
const S = 1_000;
const MIN = 60 * S;
const SHOTS = process.env['APP6_SHOTS'];

async function phoneWidth(page: Page) {
  await page.setViewportSize({ width: 375, height: 812 });
}

async function expectNoSidewaysScroll(page: Page, width = 375) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

const bar = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const panel = (page: Page, label: string) => page.getByRole('tabpanel', { name: label === 'Recipe' ? /^Recipe/ : label });
const list = (page: Page, heading: 'Tested' | 'Untested') =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
const ideaCard = (page: Page, name: string) => page.locator('li').filter({ has: page.getByRole('button', { name: new RegExp(`^${name}`) }) });

/** Add an idea from the Toppings tab: name only, or with its fields. */
async function addIdea(page: Page, name: string, fields: { pre?: string; notes?: string } = {}) {
  await tab(page, 'Toppings').tap();
  await page.getByRole('button', { name: 'Add idea', exact: true }).tap();
  const form = panel(page, 'Toppings').locator('form');
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  if (fields.pre) await form.getByRole('textbox', { name: 'Pre-bake', exact: true }).fill(fields.pre);
  if (fields.notes) await form.getByRole('textbox', { name: 'Notes', exact: true }).fill(fields.notes);
  await form.getByRole('button', { name: 'Save', exact: true }).tap();
  await expect(form).toHaveCount(0);
  // The field focused at Save went with the editor, and the bar comes back.
  await expect(bar(page)).toBeVisible({ timeout: 2_000 });
}

// ---------------------------------------------------------------------------
// A fake GitHub: one repository shared by every profile in a test
// ---------------------------------------------------------------------------

interface FakeRepo {
  files: Map<string, { content: string; sha: string }>;
  requests: string[];
  /** Folders that answer 500. */
  failing: Set<string>;
}

const newRepo = (): FakeRepo => ({ files: new Map(), requests: [], failing: new Set() });

async function stubGitHub(context: BrowserContext, repo: FakeRepo) {
  let n = 0;
  await context.route('https://api.github.com/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    repo.requests.push(`${method} ${url.pathname}`);
    const json = (status: number, body: unknown = {}) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.headers()['authorization'] !== 'Bearer test-token') return json(401);
    const base = '/repos/dave/pizza-bake-log';
    if (!url.pathname.startsWith(base)) return json(404);
    const path = url.pathname.slice(base.length);
    if (path === '') return json(200, { full_name: 'dave/pizza-bake-log' });
    const dir = /^\/contents\/(\w+)/.exec(path)?.[1];
    if (dir && repo.failing.has(dir)) return json(500);
    if (path === `/contents/${dir}`) {
      const entries = [...repo.files.keys()]
        .filter((p) => p.startsWith(`${dir}/`))
        .map((p) => ({ type: 'file', name: p.slice(dir!.length + 1), sha: repo.files.get(p)!.sha }));
      return entries.length ? json(200, entries) : json(404);
    }
    const file = path.replace('/contents/', '');
    const body = (req.postDataJSON() ?? {}) as { content?: string; sha?: string };
    if (method === 'GET') return repo.files.has(file) ? json(200, repo.files.get(file)) : json(404);
    if (method === 'PUT') {
      const current = repo.files.get(file);
      if (current && body.sha !== current.sha) return json(409);
      const sha = `sha${++n}`;
      repo.files.set(file, { content: body.content!, sha });
      return json(201, { content: { sha } });
    }
    if (method === 'DELETE') {
      repo.files.delete(file);
      return json(200);
    }
    return json(405);
  });
}

/** This device's repository and token, on the Bake log tab. A test token, for the stub only. */
async function connect(page: Page) {
  await tab(page, 'Bake log').tap();
  const log = panel(page, 'Bake log');
  await log.getByRole('textbox', { name: 'Repository' }).fill('dave/pizza-bake-log');
  await log.getByLabel('Token').fill('test-token');
  await log.getByRole('button', { name: 'Save and sync' }).tap();
}

const ideaFiles = (repo: FakeRepo) => [...repo.files.keys()].filter((p) => p.startsWith('toppings/'));

// ---------------------------------------------------------------------------

test.describe('APP-6: three tabs, and the topping ideas', () => {
  test('the bar at the bottom at 375 px, the strip at the top from 768 px, and the order', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);

    // Three, in §13.1's order, each a 48 px target.
    await expect(page.getByRole('tab')).toHaveText(['Recipe', 'Toppings', 'Bake log']);
    await expect(tab(page, 'Recipe')).toHaveAttribute('aria-selected', 'true');
    for (const t of await page.getByRole('tab').all()) expect((await t.boundingBox())!.height).toBeGreaterThanOrEqual(48);

    // A bar fixed to the bottom of the screen, whatever the scroll.
    const atBottom = async () => {
      const box = (await bar(page).boundingBox())!;
      expect(box.y + box.height).toBe(812);
      expect(box.width).toBe(375);
    };
    await atBottom();
    await page.evaluate(() => window.scrollTo(0, 3000));
    await atBottom();

    // The end of each tab clears it, and nothing scrolls sideways.
    for (const label of ['Recipe', 'Toppings', 'Bake log'] as const) {
      await tab(page, label).tap();
      await expect(tab(page, label)).toHaveAttribute('aria-selected', 'true');
      await expectNoSidewaysScroll(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const footer = (await page.getByRole('contentinfo').boundingBox())!;
      const barTop = (await bar(page).boundingBox())!.y;
      expect(footer.y + footer.height).toBeLessThanOrEqual(barTop);
    }

    // It hides while a field that takes typing has focus, and comes back.
    await tab(page, 'Recipe').tap();
    const room = step(page, 'Prep the bowl').getByRole('spinbutton', { name: 'Room', exact: true });
    await room.scrollIntoViewIfNeeded();
    await room.tap();
    await expect(bar(page)).toBeHidden();
    await done(room);
    await expect(bar(page)).toBeVisible();
    // A checkbox brings no keyboard up.
    await step(page, 'Prep the bowl').getByRole('checkbox', { name: /^Mark / }).focus();
    await expect(bar(page)).toBeVisible();

    // From 768 px: the strip at the top of the column, under the title, in view as the page scrolls.
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const strip = (await bar(page).boundingBox())!;
    const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    expect(strip.y).toBeGreaterThan(title.y + title.height);
    expect(strip.width).toBeLessThan(1024);
    await page.evaluate(() => window.scrollTo(0, 4000));
    expect((await bar(page).boundingBox())!.y).toBe(0);
    await expect(page.getByRole('tab')).toHaveText(['Recipe', 'Toppings', 'Bake log']);
    await expectNoSidewaysScroll(page, 1024);
    // A field's focus doesn't hide the strip: no phone keyboard there.
    await room.focus();
    await expect(bar(page)).toBeVisible();
    await forceClose(phone);
  });

  test('switching tabs mid-mix returns to the same step with its readings', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);

    // On the phone the keypad's Done finishes the reading, then the bar is there.
    const prep = step(page, 'Prep the bowl');
    const room = prep.getByRole('spinbutton', { name: 'Room', exact: true });
    await room.scrollIntoViewIfNeeded();
    await typeInto(page, room, '64');
    await done(room);
    const box = prep.getByRole('checkbox', { name: /^Mark / });
    const before = (await box.boundingBox())!.y;
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await tab(page, 'Toppings').tap();
    await expect(panel(page, 'Toppings')).toBeVisible();
    await expect(panel(page, 'Recipe')).toBeHidden();
    await tab(page, 'Recipe').tap();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    expect((await box.boundingBox())!.y).toBe(before);
    await expect(room).toHaveValue('64');

    // On the strip a reading can still be focused when a tab is tapped: it is
    // recorded first, as a fold records it (§7.5). The harness keeps focus on
    // the field through the tap, as iOS does.
    await page.setViewportSize({ width: 1024, height: 800 });
    await room.scrollIntoViewIfNeeded();
    await typeInto(page, room, '66');
    await expect(room).toBeFocused();
    await tab(page, 'Toppings').tap();
    // The field is hidden with its tab, so ask the page what has focus.
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('INPUT');
    await tab(page, 'Recipe').tap();
    await expect(room).toHaveValue('66');
    // Recorded, not just shown: stored with the inputs, and a reload keeps it.
    await page.reload();
    await expect(step(page, 'Prep the bowl').getByRole('spinbutton', { name: 'Room', exact: true })).toHaveValue('66');
    await forceClose(phone);
  });

  test('a running timer beeps with Toppings open, and the Recipe tab carries its mark', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    await page.evaluate(
      ({ key, ideas }) => localStorage.setItem(key, JSON.stringify({ items: ideas, shas: {}, dirty: [], deleted: [], lastSyncedAt: '' })),
      { key: 'biga-calculator:toppings:v1', ideas: SEED_IDEAS },
    );
    await page.reload();
    await phoneWidth(page);

    const chunks = step(page, 'Mix by hand to chunks');
    await timer(chunks).start.tap();
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe');
    await tab(page, 'Toppings').tap();
    await wait(page, 30 * S);
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe, timer before the window');
    await expect(bar(page)).toContainText('0:3');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/bar-375-timer-on-toppings.png` });

    // The lower bound, 3 minutes, with Toppings open: one beep, and the mark turns.
    expect(await beeps(page)).toBe(0);
    await wait(page, 2 * MIN + 30 * S);
    expect(await beeps(page)).toBe(1);
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe, timer in the window');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/bar-375-timer-in-window.png` });
    // On the Bake log too, and no second beep.
    await tab(page, 'Bake log').tap();
    await wait(page, 30 * S);
    expect(await beeps(page)).toBe(1);
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe, timer in the window');

    // Back on Recipe: no mark, and the timer card reads on (each wait adds the
    // one-second tick it renders: 30 + 1, 150 + 1, 30 + 1).
    await tab(page, 'Recipe').tap();
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe');
    await expect(timer(chunks).time).toHaveText('3:33');

    // The strip, with the timer running on another tab.
    await page.setViewportSize({ width: 1024, height: 800 });
    await tab(page, 'Toppings').tap();
    await expect(tab(page, 'Recipe')).toHaveAccessibleName('Recipe, timer in the window');
    await expect(bar(page)).toContainText('3:33');
    if (SHOTS) {
      await page.screenshot({ path: `${SHOTS}/strip-1024-timer-on-toppings.png` });
      await page.setViewportSize({ width: 375, height: 812 });
      for (const name of ['Hot honey soppressata', 'Potato, rosemary, pecorino']) await ideaCard(page, name).getByRole('button').first().tap();
      // The screen as the phone shows it: a full-page capture draws the fixed bar mid-page.
      const hotHoney = ideaCard(page, 'Hot honey soppressata');
      await page.evaluate((y) => window.scrollTo(0, y), (await hotHoney.boundingBox())!.y - 120);
      // The chevrons turn by CSS transition, which runs on real time, not the page clock.
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/lists-375-open.png` });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({ path: `${SHOTS}/lists-375-open-dark.png` });
    }
    await forceClose(phone);
  });

  test('an idea with only a name, then rated 3.5, through a reload and a force close', async ({ baseURL, }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;
    await phoneWidth(page);

    await addIdea(page, 'Hot honey soppressata');
    await expect(list(page, 'Untested')).toContainText('Hot honey soppressata');
    await expect(list(page, 'Tested')).toContainText('Nothing rated yet.');

    // Rating it without its pre-bake toppings is refused, in §13.2's words.
    const card = ideaCard(page, 'Hot honey soppressata');
    await card.getByRole('button', { name: 'Edit', exact: true }).tap();
    await card.getByRole('button', { name: 'Rate 3.5' }).tap();
    await expect(card.getByRole('alert')).toHaveText('Add the pre-bake toppings before rating it.');
    await expect(card.getByRole('button', { name: 'Rate 3.5' })).toHaveAttribute('aria-pressed', 'false');
    await card.getByRole('textbox', { name: 'Pre-bake', exact: true }).fill('San Marzano\nFior di latte\nSoppressata');
    await expect(card.getByRole('alert')).toHaveCount(0);
    await card.getByRole('button', { name: 'Rate 3.5' }).tap();
    await card.getByRole('textbox', { name: 'Notes', exact: true }).fill('Honey from [the farm stand](https://honey.example/)\nLess cheese next time.');
    await card.getByRole('button', { name: 'Save', exact: true }).tap();

    const rated = ideaCard(page, 'Hot honey soppressata');
    await expect(list(page, 'Tested')).toContainText('Hot honey soppressata');
    await expect(list(page, 'Untested')).toContainText('Nothing waiting to be tried.');
    await expect(rated.getByLabel('Rated 3.5 of 5')).toBeVisible();
    // Single line breaks kept.
    await expect(rated.locator('br')).toHaveCount(3);

    // The link opens in a new tab.
    const link = rated.getByRole('link', { name: 'the farm stand' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await phone.context.route('https://honey.example/**', (r) => r.fulfill({ body: 'honey', contentType: 'text/plain' }));
    const [opened] = await Promise.all([phone.context.waitForEvent('page'), link.tap()]);
    await expect(opened).toHaveURL('https://honey.example/');
    expect(page.url()).toContain('/pizza-calculator/');
    await opened.close();

    // A reload comes back to the Toppings tab, at 3.5.
    await page.reload();
    await expect(tab(page, 'Toppings')).toHaveAttribute('aria-selected', 'true');
    await expect(ideaCard(page, 'Hot honey soppressata').getByLabel('Rated 3.5 of 5')).toBeVisible();

    // And so does the home-screen app after a force close.
    await forceClose(phone);
    phone = await openPhone(profile, { time: T0 + 10 * MIN }, baseURL!);
    page = phone.page;
    await phoneWidth(page);
    await expect(tab(page, 'Toppings')).toHaveAttribute('aria-selected', 'true');
    await expect(list(page, 'Tested')).toContainText('Hot honey soppressata');
    await expect(ideaCard(page, 'Hot honey soppressata').getByLabel('Rated 3.5 of 5')).toBeVisible();

    // Clearing the rating moves it back; Delete asks first.
    const again = ideaCard(page, 'Hot honey soppressata');
    await again.getByRole('button').first().tap();
    await again.getByRole('button', { name: 'Edit', exact: true }).tap();
    await again.getByRole('button', { name: 'Clear', exact: true }).tap();
    await again.getByRole('button', { name: 'Save', exact: true }).tap();
    await expect(list(page, 'Untested')).toContainText('Hot honey soppressata');
    const last = ideaCard(page, 'Hot honey soppressata');
    await last.getByRole('button', { name: 'Edit', exact: true }).tap();
    const del = last.getByRole('button', { name: 'Delete', exact: true });
    await del.scrollIntoViewIfNeeded();
    const delY = (await del.boundingBox())!.y;
    await del.tap();
    const ask = last.getByRole('alertdialog');
    await expect(ask).toContainText('Delete "Hot honey soppressata"?');
    // Its Delete sits below the one tapped.
    expect((await ask.getByRole('button', { name: 'Delete', exact: true }).boundingBox())!.y).toBeGreaterThan(delY);
    await ask.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await expect(ask).toHaveCount(0);
    await last.getByRole('button', { name: 'Delete', exact: true }).tap();
    await last.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).tap();
    await expect(page.getByText('Hot honey soppressata')).toHaveCount(0);
    await forceClose(phone);
  });

  test('Reset and a shared link leave the ideas, and the tab', async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;
    await phoneWidth(page);
    await addIdea(page, 'Potato, rosemary, pecorino');

    await tab(page, 'Recipe').tap();
    await page.getByRole('button', { name: 'Reset', exact: true }).tap();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).tap();
    await expect(tab(page, 'Recipe')).toHaveAttribute('aria-selected', 'true');
    await tab(page, 'Toppings').tap();
    await expect(list(page, 'Untested')).toContainText('Potato, rosemary, pecorino');
    await page.reload();
    await expect(tab(page, 'Toppings')).toHaveAttribute('aria-selected', 'true');

    // A shared link opened in Safari, with Toppings stored: Recipe, with its
    // setup, and the link carries no idea. The ideas are still here.
    await forceClose(phone);
    phone = await openPhone(profile, { path: '?balls=12&room=66', standalone: false, time: T0 + MIN }, baseURL!);
    page = phone.page;
    await phoneWidth(page);
    await expect(tab(page, 'Recipe')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Share setup' })).toBeVisible();
    expect(page.url()).not.toMatch(/potato|idea|topping/i);
    await tab(page, 'Toppings').tap();
    await expect(list(page, 'Untested')).toContainText('Potato, rosemary, pecorino');
    // "Share setup" belongs to Recipe: it isn't on this tab.
    await expect(page.getByRole('button', { name: 'Share setup' })).toBeHidden();
    // A reload of the page's own address is not a link: it stays on Toppings.
    await page.reload();
    await expect(tab(page, 'Toppings')).toHaveAttribute('aria-selected', 'true');
    await forceClose(phone);
  });

  test('the Calibration panel and the log card open the Bake log tab', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    // Nothing else opens the log: no button names it.
    await expect(page.getByRole('button', { name: 'Bake log', exact: true })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: /^Calibration/ }).tap();
    await page.getByRole('button', { name: 'Open the bake log' }).first().tap();
    await expect(tab(page, 'Bake log')).toHaveAttribute('aria-selected', 'true');
    await expect(panel(page, 'Bake log').getByRole('heading', { name: 'Bakes' })).toBeVisible();

    await tab(page, 'Recipe').tap();
    const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Log this bake' }) }).last();
    await card.getByRole('button', { name: 'Open the bake log' }).tap();
    await expect(tab(page, 'Bake log')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await forceClose(phone);
  });

  test('an idea added in one profile appears in another after a sync', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phoneA = await openPhone(info.outputPath('a'), { time: T0 }, baseURL!);
    await stubGitHub(phoneA.context, repo);
    const a = phoneA.page;
    await phoneWidth(a);

    // Without a token the ideas stay in this browser: no request at all.
    await addIdea(a, 'Clams, garlic, parsley', { pre: 'Garlic oil, clams' });
    await a.clock.runFor(5 * S);
    expect(repo.requests).toEqual([]);
    await expect(panel(a, 'Toppings')).toContainText('Saved in this browser.');

    // With the log's token and repository, they sync under toppings/.
    await connect(a);
    await expect(panel(a, 'Bake log')).toContainText('Synced the topping ideas with dave/pizza-bake-log');
    await expect(panel(a, 'Bake log')).toContainText('Synced the log with dave/pizza-bake-log');
    expect(ideaFiles(repo)).toHaveLength(1);

    // An idea added after connecting goes up shortly after it is saved.
    await addIdea(a, 'Nduja and stracciatella');
    await a.clock.runFor(2 * S);
    await expect.poll(() => ideaFiles(repo).length).toBe(2);

    const phoneB = await openPhone(info.outputPath('b'), { time: T0 + MIN }, baseURL!);
    await stubGitHub(phoneB.context, repo);
    const b = phoneB.page;
    await phoneWidth(b);
    await connect(b);
    await tab(b, 'Toppings').tap();
    await expect(list(b, 'Untested')).toContainText('Clams, garlic, parsley');
    await expect(list(b, 'Untested')).toContainText('Nduja and stracciatella');
    await expect(panel(b, 'Toppings')).toContainText('Synced the ideas with dave/pizza-bake-log');

    // A failing toppings sync leaves the log syncing.
    repo.failing.add('toppings');
    await tab(b, 'Bake log').tap();
    await panel(b, 'Bake log').getByRole('button', { name: 'Sync now' }).tap();
    await expect(panel(b, 'Bake log')).toContainText("Couldn't sync the topping ideas with dave/pizza-bake-log. GitHub answered 500.");
    await expect(panel(b, 'Bake log')).toContainText('Synced the log with dave/pizza-bake-log');
    // And the reverse.
    repo.failing.clear();
    repo.failing.add('bakes');
    await panel(b, 'Bake log').getByRole('button', { name: 'Sync now' }).tap();
    await expect(panel(b, 'Bake log')).toContainText("Couldn't sync the log with dave/pizza-bake-log. GitHub answered 500.");
    await expect(panel(b, 'Bake log')).toContainText('Synced the topping ideas with dave/pizza-bake-log');
    await forceClose(phoneA);
    await forceClose(phoneB);
  });
});

/** A few ideas for the screenshots, shaped as the app saves them. */
const SEED_IDEAS = [
  {
    id: '2026-10-04-191500-a1f0',
    name: 'Hot honey soppressata',
    pre_bake: 'San Marzano, crushed by hand\nFior di latte, torn\nSoppressata, thin',
    post_bake: 'Hot honey\nBasil',
    notes: 'Honey from [the farm stand](https://honey.example/).\nLess cheese next time: it pooled.',
    rating: 4.5,
    created: '2026-10-04T23:15:00.000Z',
    updated: '2026-10-24T01:00:00.000Z',
  },
  {
    id: '2026-10-11-180000-b2c3',
    name: 'Potato, rosemary, pecorino',
    pre_bake: 'Olive oil\nPotato, sliced thin on a mandoline\nRosemary\nPecorino',
    post_bake: '',
    notes: 'Salt the potato first and pat it dry.',
    rating: 4,
    created: '2026-10-11T22:00:00.000Z',
    updated: '2026-10-11T22:00:00.000Z',
  },
  {
    id: '2026-10-18-180000-c4d5',
    name: 'Mushroom and taleggio',
    pre_bake: 'Roasted mushrooms\nTaleggio\nThyme',
    post_bake: 'Lemon zest',
    notes: '',
    rating: 3.5,
    created: '2026-10-18T22:00:00.000Z',
    updated: '2026-10-18T22:00:00.000Z',
  },
  {
    id: '2026-11-02-200000-d6e7',
    name: 'Clams, garlic, parsley',
    pre_bake: '',
    post_bake: '',
    notes: '',
    rating: null,
    created: '2026-11-03T01:00:00.000Z',
    updated: '2026-11-03T01:00:00.000Z',
  },
  {
    id: '2026-11-08-200000-e8f9',
    name: 'Nduja and stracciatella',
    pre_bake: 'Tomato\nNduja',
    post_bake: 'Stracciatella\nHoney',
    notes: '',
    rating: null,
    created: '2026-11-09T01:00:00.000Z',
    updated: '2026-11-09T01:00:00.000Z',
  },
];

export type { Locator };
