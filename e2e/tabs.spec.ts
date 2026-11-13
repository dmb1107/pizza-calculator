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
import { fakePasskeys, newRepo, stubWorker, type FakeRepo } from './worker';

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
/** §13.2 (APP-14): a section of the Toppings tab, by its heading. */
const list = (page: Page, heading: 'Pizzas' | 'Dessert pizzas' | 'Untested') => page.getByRole('region', { name: heading, exact: true });

/**
 * Type into one of an idea's formatting fields (APP-14, 14c) as a person
 * does: what's there is replaced, and each line after the first starts with
 * Enter, which in a list is the next bullet.
 */
async function typeRich(page: Page, field: Locator, lines: string[]) {
  // The fields load when an editor first opens, and React shows them on a
  // timer that the suite's paused clock holds: move it on.
  await page.clock.runFor(1000);
  await field.tap();
  // A new field's first bullet stays: only text already there is cleared.
  if ((await field.innerText()).trim() !== '') {
    await page.keyboard.press('Meta+a');
    await page.keyboard.press('Backspace');
  }
  for (const [i, line] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter');
    await page.keyboard.type(line);
  }
}

/** Select the last `text` typed and make it a link through the link row (14c). */
async function linkLast(page: Page, field: Locator, text: string, href: string) {
  for (let i = 0; i < text.length; i++) await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Meta+k');
  const row = field.locator('xpath=ancestor::*[@role="group"][1]');
  await row.getByRole('textbox', { name: 'Link address' }).fill(href);
  await page.keyboard.press('Enter');
  await expect(row.getByRole('textbox', { name: 'Link address' })).toHaveCount(0);
  // Focus comes back on the next turn of the clock, which the suite holds paused.
  await page.clock.runFor(100);
  // The text has focus again, the caret after the link.
  await expect(field).toBeFocused();
}
const ideaCard = (page: Page, name: string) => page.locator('li').filter({ has: page.getByRole('button', { name: new RegExp(`^${name}`) }) });

/** Add an idea from the Toppings tab: name only, or with its fields. */
async function addIdea(page: Page, name: string, fields: { pre?: string; notes?: string } = {}) {
  await tab(page, 'Toppings').tap();
  await page.getByRole('button', { name: 'Add idea', exact: true }).tap();
  const form = panel(page, 'Toppings').locator('form');
  await form.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  if (fields.pre) await typeRich(page, form.getByRole('textbox', { name: 'Pre-bake', exact: true }), fields.pre.split('\n'));
  if (fields.notes) await typeRich(page, form.getByRole('textbox', { name: 'Notes', exact: true }), fields.notes.split('\n'));
  await form.getByRole('button', { name: 'Save', exact: true }).tap();
  await expect(form).toHaveCount(0);
  // The field focused at Save went with the editor, and the bar comes back.
  await expect(bar(page)).toBeVisible({ timeout: 2_000 });
}

// ---------------------------------------------------------------------------
// The Worker: one repository shared by every profile in a test (e2e/worker.ts)
// ---------------------------------------------------------------------------

/** One profile's stand-in Worker and passkey. Its name keeps its sign-in apart. */
async function stubGitHub(context: BrowserContext, repo: FakeRepo, device: string) {
  await fakePasskeys(context);
  await stubWorker(context, repo, device);
}

/** §14.3: this device signs in on the Bake log tab, with its passkey and nothing else. */
async function connect(page: Page) {
  await tab(page, 'Bake log').tap();
  await panel(page, 'Bake log').getByRole('button', { name: 'Sign in', exact: true }).tap();
  await expect(panel(page, 'Bake log').getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}

const ideaFiles = (repo: FakeRepo) => [...repo.files.keys()].filter((p) => /^toppings\/[^/]+\.json$/.test(p));
const photoFiles = (repo: FakeRepo) => [...repo.files.keys()].filter((p) => p.startsWith('toppings/images/'));

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
    await expect(list(page, 'Pizzas')).toContainText('Nothing rated yet.');

    // Edit sits in the opened card's header, and the editor opens below it:
    // nothing appears above the point of the tap, and the header stays put.
    const card = ideaCard(page, 'Hot honey soppressata');
    const edit = card.getByRole('button', { name: 'Edit', exact: true });
    await edit.scrollIntoViewIfNeeded();
    const editBox = (await edit.boundingBox())!;
    const headerY = (await card.getByRole('button').first().boundingBox())!.y;
    await edit.tap();
    const form = card.locator('form');
    expect((await form.boundingBox())!.y).toBeGreaterThanOrEqual(editBox.y + editBox.height);
    expect((await card.getByRole('button').first().boundingBox())!.y).toBe(headerY);
    await expect(card.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);

    // Rating it without its pre-bake toppings is refused, in §13.2's words.
    await card.getByRole('button', { name: 'Rate 3.5' }).tap();
    await expect(card.getByRole('alert')).toHaveText('Add the pre-bake toppings before rating it.');
    await expect(card.getByRole('button', { name: 'Rate 3.5' })).toHaveAttribute('aria-pressed', 'false');
    await typeRich(page, card.getByRole('textbox', { name: 'Pre-bake', exact: true }), ['San Marzano', 'Fior di latte', 'Soppressata']);
    await expect(card.getByRole('alert')).toHaveCount(0);
    await card.getByRole('button', { name: 'Rate 3.5' }).tap();
    // A link made in the link row, then a new line.
    const notes = card.getByRole('textbox', { name: 'Notes', exact: true });
    await typeRich(page, notes, ['Honey from the farm stand']);
    await linkLast(page, notes, 'the farm stand', 'honey.example/');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Less cheese next time.');
    await card.getByRole('button', { name: 'Save', exact: true }).tap();

    const rated = ideaCard(page, 'Hot honey soppressata');
    await expect(list(page, 'Pizzas')).toContainText('Hot honey soppressata');
    await expect(list(page, 'Untested')).toContainText('Nothing waiting to be tried.');
    await expect(rated.getByLabel('Rated 3.5 of 5')).toBeVisible();
    // Stars only on screen, the number for screen readers (Dave, 11 Nov 2026).
    expect((await rated.getByRole('button').first().innerText()).trim()).toBe('Hot honey soppressata');
    // Three bullets, and the notes' two lines (14c).
    await expect(rated.locator('h4:text-is("Pre-bake") + * li')).toHaveCount(3);
    await expect(rated.locator('h4:text-is("Notes") + * p')).toHaveCount(2);

    // The link opens in a new tab.
    const link = rated.getByRole('link', { name: 'the farm stand' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await phone.context.route('https://honey.example/**', (r) => r.fulfill({ body: 'honey', contentType: 'text/plain' }));
    const [opened] = await Promise.all([phone.context.waitForEvent('page'), link.tap()]);
    await expect(opened).toHaveURL('https://honey.example/');
    // The page itself stays where it was (§14.1: the root of its own address).
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
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
    await expect(list(page, 'Pizzas')).toContainText('Hot honey soppressata');
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
    await stubGitHub(phoneA.context, repo, 'a');
    const a = phoneA.page;
    await phoneWidth(a);

    // Signed out, the ideas stay in this browser: no request reaches the repository.
    await addIdea(a, 'Clams, garlic, parsley', { pre: 'Garlic oil, clams' });
    await a.clock.runFor(5 * S);
    expect(repo.requests).toEqual([]);
    await expect(panel(a, 'Toppings')).toContainText('Saved in this browser.');

    // Signed in, they sync under toppings/.
    await connect(a);
    await expect(panel(a, 'Bake log')).toContainText('Synced the topping ideas');
    await expect(panel(a, 'Bake log')).toContainText('Synced the log');
    expect(ideaFiles(repo)).toHaveLength(1);

    // An idea added after connecting goes up shortly after it is saved.
    await addIdea(a, 'Nduja and stracciatella');
    await a.clock.runFor(2 * S);
    await expect.poll(() => ideaFiles(repo).length).toBe(2);

    const phoneB = await openPhone(info.outputPath('b'), { time: T0 + MIN }, baseURL!);
    await stubGitHub(phoneB.context, repo, 'b');
    const b = phoneB.page;
    await phoneWidth(b);
    await connect(b);
    await tab(b, 'Toppings').tap();
    await expect(list(b, 'Untested')).toContainText('Clams, garlic, parsley');
    await expect(list(b, 'Untested')).toContainText('Nduja and stracciatella');
    await expect(panel(b, 'Toppings')).toContainText('Synced the ideas');

    // A failing toppings sync leaves the log syncing.
    repo.failing.add('toppings');
    await tab(b, 'Bake log').tap();
    await panel(b, 'Bake log').getByRole('button', { name: 'Sync now' }).tap();
    await expect(panel(b, 'Bake log')).toContainText("Couldn't sync the topping ideas. GitHub answered 500.");
    await expect(panel(b, 'Bake log')).toContainText('Synced the log');
    // And the reverse.
    repo.failing.clear();
    repo.failing.add('bakes');
    await panel(b, 'Bake log').getByRole('button', { name: 'Sync now' }).tap();
    await expect(panel(b, 'Bake log')).toContainText("Couldn't sync the log. GitHub answered 500.");
    await expect(panel(b, 'Bake log')).toContainText('Synced the topping ideas');
    await forceClose(phoneA);
    await forceClose(phoneB);
  });
});

// ---------------------------------------------------------------------------
// APP-7 (MESSAGE-72): comments
// ---------------------------------------------------------------------------

/** The seed ideas, two with comments; the rest saved before comments existed. */
const app7Ideas = () =>
  SEED_IDEAS.map((idea, i) =>
  i === 0
    ? { ...idea, comments: 'Best one yet. The honey cut the **salt** of the soppressata.\nDave wants it again for the party.' }
    : i === 1
      ? { ...idea, comments: 'Crisp edges, soft middle. Needed more salt.' }
      : idea,
  );

async function seedIdeas(page: Page, ideas: readonly object[]) {
  await page.evaluate(
    ({ key, ideas }) => localStorage.setItem(key, JSON.stringify({ items: ideas, shas: {}, dirty: [], deleted: [], lastSyncedAt: '' })),
    { key: 'biga-calculator:toppings:v1', ideas },
  );
  await page.reload();
  await phoneWidth(page);
  await tab(page, 'Toppings').tap();
}

const header = (card: Locator) => card.getByRole('button').first();

test.describe('APP-7: comments', () => {
  test('a comment survives a reload and a force close, below Notes on the open card', async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;
    await phoneWidth(page);

    await addIdea(page, 'Pistachio pesto', { pre: 'Pistachio pesto\nFior di latte', notes: 'Toast the pistachios first.' });
    const card = ideaCard(page, 'Pistachio pesto');
    // Saved without a comment: the open card leaves the field out.
    await expect(card.getByRole('heading', { name: 'Notes' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Comments' })).toHaveCount(0);

    await card.getByRole('button', { name: 'Edit', exact: true }).tap();
    // In the editor, Comments sits below Notes.
    const notesBox = (await card.getByRole('textbox', { name: 'Notes', exact: true }).boundingBox())!;
    const comments = card.getByRole('textbox', { name: 'Comments', exact: true });
    expect((await comments.boundingBox())!.y).toBeGreaterThan(notesBox.y);
    await typeRich(page, comments, ['Nutty, ']);
    await page.keyboard.press('Meta+i');
    await page.keyboard.type('rich');
    await page.keyboard.press('Meta+i');
    await page.keyboard.type('.');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Mortadella next time, see this one');
    await linkLast(page, comments, 'this one', 'https://mortadella.example/');
    await card.getByRole('button', { name: 'Save', exact: true }).tap();

    const check = async (p: Page) => {
      const c = ideaCard(p, 'Pistachio pesto');
      if ((await header(c).getAttribute('aria-expanded')) !== 'true') await header(c).tap();
      const notesY = (await c.getByRole('heading', { name: 'Notes' }).boundingBox())!.y;
      const commentsH = c.getByRole('heading', { name: 'Comments' });
      await expect(commentsH).toBeVisible();
      expect((await commentsH.boundingBox())!.y).toBeGreaterThan(notesY);
      // Formatted as typed (14c): emphasis, two lines, a link in a new tab.
      const body = c.locator('h4:text-is("Comments") + *');
      await expect(body.locator('em')).toHaveText('rich');
      await expect(body.locator('p')).toHaveCount(2);
      await expect(body.getByRole('link', { name: 'this one' })).toHaveAttribute('target', '_blank');
    };
    await check(page);

    await page.reload();
    await check(page);
    await forceClose(phone);
    phone = await openPhone(profile, { time: T0 + 10 * MIN }, baseURL!);
    page = phone.page;
    await phoneWidth(page);
    await check(page);
    await expectNoSidewaysScroll(page);
    await forceClose(phone);
  });

  test('an idea added with a comment in one profile appears with it in another after a sync', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phoneA = await openPhone(info.outputPath('a'), { time: T0 }, baseURL!);
    await stubGitHub(phoneA.context, repo, 'a');
    const a = phoneA.page;
    await phoneWidth(a);
    await connect(a);

    await tab(a, 'Toppings').tap();
    await a.getByRole('button', { name: 'Add idea', exact: true }).tap();
    const form = panel(a, 'Toppings').locator('form');
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill('Fig and gorgonzola');
    await typeRich(a, form.getByRole('textbox', { name: 'Comments', exact: true }), ['Too sweet with the honey.']);
    await form.getByRole('button', { name: 'Save', exact: true }).tap();
    await a.clock.runFor(2 * S);
    await expect.poll(() => ideaFiles(repo).length).toBe(1);

    const phoneB = await openPhone(info.outputPath('b'), { time: T0 + MIN }, baseURL!);
    await stubGitHub(phoneB.context, repo, 'b');
    const b = phoneB.page;
    await phoneWidth(b);
    await connect(b);
    await tab(b, 'Toppings').tap();
    const card = ideaCard(b, 'Fig and gorgonzola');
    await header(card).tap();
    await expect(card.locator('h4:text-is("Comments") + *')).toHaveText('Too sweet with the honey.');
    await forceClose(phoneA);
    await forceClose(phoneB);
  });
});

// ---------------------------------------------------------------------------
// APP-8 (MESSAGE-73): a photo on each idea
// ---------------------------------------------------------------------------

const SHOTS8 = process.env['APP8_SHOTS'];

/**
 * A test photo drawn in the page: a gradient, discs and grain, so it
 * compresses roughly as a photo does. Returned as JPEG bytes.
 */
async function drawnJpeg(page: Page, width: number, height: number, hue: number): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ({ width, height, hue }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, `hsl(${hue} 70% 40%)`);
      g.addColorStop(1, `hsl(${hue + 40} 60% 75%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      let seed = hue + 1;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `hsl(${(hue + i * 37) % 360} 65% ${25 + (i % 50)}%)`;
        ctx.beginPath();
        ctx.arc(rnd() * width, rnd() * height, width / 40 + (rnd() * width) / 25, 0, 7);
        ctx.fill();
      }
      const img = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (rnd() - 0.5) * 24;
        img.data[i]! += n;
        img.data[i + 1]! += n;
        img.data[i + 2]! += n;
      }
      ctx.putImageData(img, 0, 0);
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.92));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(s);
    },
    { width, height, hue },
  );
  return Buffer.from(b64, 'base64');
}

/** The same JPEG with an EXIF Orientation tag, as an iPhone writes for a portrait photo. */
function withOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.from([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const len = payload.length + 2;
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1, len >> 8, len & 0xff]), payload, jpeg.subarray(2)]);
}

/** Tap a photo button and choose a file in the picker it opens. */
async function choosePhoto(page: Page, button: Locator, file: { name: string; mimeType: string; buffer: Buffer }) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), button.tap()]);
  await chooser.setFiles(file);
}

const natural = (img: Locator) => img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight]);
const thumbOf = (card: Locator) => header(card).locator('img');
const fullOf = (card: Locator, name: string) => card.getByRole('img', { name, exact: true });
/** This device's stored photo for an idea, in bytes, read from IndexedDB. */
const storedPhotoBytes = (page: Page, ideaName: string) =>
  page.evaluate(async (ideaName) => {
    const store = JSON.parse(localStorage.getItem('biga-calculator:toppings:v1')!) as { items: { name: string; photo: string | null }[] };
    const photo = store.items.find((i) => i.name === ideaName)?.photo;
    if (!photo) return null;
    const db: IDBDatabase = await new Promise((r, j) => {
      const req = indexedDB.open('biga-calculator-photos');
      req.onsuccess = () => r(req.result);
      req.onerror = () => j(req.error);
    });
    const blob: Blob | undefined = await new Promise((r) => {
      const req = db.transaction('photos').objectStore('photos').get(photo);
      req.onsuccess = () => r(req.result as Blob | undefined);
    });
    return blob ? blob.size : null;
  }, ideaName);

test.describe('APP-8: a photo on each idea', () => {
  test('added, shown as a thumbnail and at full width, through a reload, a force close and Reset', async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;
    await phoneWidth(page);
    await seedIdeas(page, app7Ideas());

    // A 12-megapixel photo, as an iPhone takes one.
    const big = await drawnJpeg(page, 4032, 3024, 20);
    const card = ideaCard(page, 'Mushroom and taleggio');
    await header(card).tap();
    await card.getByRole('button', { name: 'Edit', exact: true }).tap();
    const form = card.locator('form');
    await expect(form.getByRole('button', { name: 'Replace photo' })).toHaveCount(0);
    await choosePhoto(page, form.getByRole('button', { name: 'Add photo', exact: true }), {
      name: 'IMG_0412.jpg',
      mimeType: 'image/jpeg',
      buffer: big,
    });
    const preview = form.getByRole('img', { name: 'Mushroom and taleggio', exact: true });
    await expect(preview).toBeVisible();
    expect(await natural(preview)).toEqual([1600, 1200]);
    await expect(form.getByRole('button', { name: 'Replace photo', exact: true })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Remove photo', exact: true })).toBeVisible();
    if (SHOTS8) {
      await page.setViewportSize({ width: 375, height: 1900 });
      await card.screenshot({ path: `${SHOTS8}/editor-375-with-photo.png`, animations: 'disabled' });
      await phoneWidth(page);
    }
    await form.getByRole('button', { name: 'Save', exact: true }).tap();
    await expect(form).toHaveCount(0);

    // Open: the photo at the card's full width, named for screen readers.
    const full = fullOf(ideaCard(page, 'Mushroom and taleggio'), 'Mushroom and taleggio');
    await expect(full).toBeVisible();
    const cardBox = (await ideaCard(page, 'Mushroom and taleggio').boundingBox())!;
    const fullBox = (await full.boundingBox())!;
    expect(fullBox.width).toBeGreaterThan(cardBox.width - 40);
    // Square, as a round pizza is shown whole (Dave, 11 Nov 2026).
    expect(Math.round(fullBox.height)).toBe(Math.round(fullBox.width));
    const bytes = await storedPhotoBytes(page, 'Mushroom and taleggio');
    expect(bytes).toBeGreaterThan(20_000);
    expect(bytes).toBeLessThan(1_000_000);
    info.annotations.push({ type: 'photo bytes, 4032 × 3024 drawn sample', description: String(bytes) });

    // Closed: a thumbnail beside the name, small, in a fixed box.
    await header(ideaCard(page, 'Mushroom and taleggio')).tap();
    const thumb = thumbOf(ideaCard(page, 'Mushroom and taleggio'));
    await expect(thumb).toBeVisible();
    expect(Math.max(...(await natural(thumb)))).toBe(112);
    const box = (await thumb.boundingBox())!;
    expect([Math.round(box.width), Math.round(box.height)]).toEqual([56, 56]);
    await expect(thumbOf(ideaCard(page, 'Potato, rosemary, pecorino'))).toHaveCount(0);

    const check = async (p: Page) => {
      await expect(thumbOf(ideaCard(p, 'Mushroom and taleggio'))).toBeVisible();
      await header(ideaCard(p, 'Mushroom and taleggio')).tap();
      await expect(fullOf(ideaCard(p, 'Mushroom and taleggio'), 'Mushroom and taleggio')).toBeVisible();
      await header(ideaCard(p, 'Mushroom and taleggio')).tap();
    };
    await page.reload();
    await phoneWidth(page);
    await check(page);
    await forceClose(phone);
    phone = await openPhone(profile, { time: T0 + 10 * MIN }, baseURL!);
    page = phone.page;
    await phoneWidth(page);
    await check(page);

    // Reset leaves the photos alone.
    await tab(page, 'Recipe').tap();
    await page.getByRole('button', { name: 'Reset', exact: true }).tap();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).tap();
    await tab(page, 'Toppings').tap();
    await check(page);

    if (SHOTS8) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${SHOTS8}/lists-375-with-photos.png`, animations: 'disabled' });
    }
    // Every card open, one by one: nothing scrolls sideways.
    const closed = panel(page, 'Toppings').locator('li button[aria-expanded="false"]');
    while ((await closed.count()) > 0) await closed.first().tap();
    await expectNoSidewaysScroll(page);
    if (SHOTS8) {
      await page.setViewportSize({ width: 375, height: 1900 });
      await ideaCard(page, 'Mushroom and taleggio').screenshot({ path: `${SHOTS8}/card-375-open-with-photo.png`, animations: 'disabled' });
      await phoneWidth(page);
    }
    await forceClose(phone);
  });

  test('Replace and Remove work, Cancel undoes either, and a file that is not a photo changes nothing', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    await seedIdeas(page, app7Ideas());
    const first = await drawnJpeg(page, 2000, 1500, 200);
    const second = await drawnJpeg(page, 2000, 1500, 90);
    const name = 'Potato, rosemary, pecorino';
    const card = () => ideaCard(page, name);
    const form = () => card().locator('form');
    const photoSrc = async () => {
      const bytes = await storedPhotoBytes(page, name);
      const stored = (JSON.parse((await page.evaluate(() => localStorage.getItem('biga-calculator:toppings:v1')))!) as {
        items: { name: string; photo: string | null }[];
      }).items.find((i) => i.name === name)!.photo;
      return { bytes, stored };
    };
    const edit = async () => {
      if ((await header(card()).getAttribute('aria-expanded')) !== 'true') await header(card()).tap();
      await card().getByRole('button', { name: 'Edit', exact: true }).tap();
    };

    await edit();
    await choosePhoto(page, form().getByRole('button', { name: 'Add photo', exact: true }), { name: 'a.jpg', mimeType: 'image/jpeg', buffer: first });
    await expect(form().getByRole('img', { name })).toBeVisible();
    await form().getByRole('button', { name: 'Save', exact: true }).tap();
    const one = await photoSrc();
    expect(one.stored).toMatch(/^2026-10-11-180000-b2c3-[0-9a-f]{12}$/);

    // Replace, then Cancel: the photo it had.
    await edit();
    await choosePhoto(page, form().getByRole('button', { name: 'Replace photo', exact: true }), { name: 'b.jpg', mimeType: 'image/jpeg', buffer: second });
    await expect(form().getByRole('button', { name: 'Remove photo' })).toBeVisible();
    await form().getByRole('button', { name: 'Cancel', exact: true }).tap();
    expect(await photoSrc()).toEqual(one);

    // Remove, then Cancel: still there. Remove doesn't ask.
    await edit();
    await form().getByRole('button', { name: 'Remove photo', exact: true }).tap();
    await expect(form().getByRole('img', { name })).toHaveCount(0);
    await expect(form().getByRole('button', { name: 'Add photo', exact: true })).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await form().getByRole('button', { name: 'Cancel', exact: true }).tap();
    expect(await photoSrc()).toEqual(one);
    await expect(fullOf(card(), name)).toBeVisible();

    // A file that isn't a photo: §13.2's message under the button, and the photo as it was.
    await edit();
    await choosePhoto(page, form().getByRole('button', { name: 'Replace photo', exact: true }), {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('San Marzano, fior di latte'),
    });
    const alert = form().getByRole('alert');
    await expect(alert).toHaveText("That file couldn't be opened as a photo.");
    const buttonsBottom = await form().getByRole('button', { name: 'Remove photo' }).evaluate((b) => b.getBoundingClientRect().bottom);
    expect((await alert.boundingBox())!.y).toBeGreaterThanOrEqual(buttonsBottom);
    await expect(form().getByRole('img', { name })).toBeVisible();
    await form().getByRole('button', { name: 'Save', exact: true }).tap();
    expect((await photoSrc()).stored).toBe(one.stored);

    // Replace, then Save: a new name and new bytes.
    await edit();
    await choosePhoto(page, form().getByRole('button', { name: 'Replace photo', exact: true }), { name: 'b.jpg', mimeType: 'image/jpeg', buffer: second });
    await expect(form().getByRole('button', { name: 'Remove photo' })).toBeVisible();
    await form().getByRole('button', { name: 'Save', exact: true }).tap();
    const two = await photoSrc();
    expect(two.stored).not.toBe(one.stored);
    expect(two.bytes).toBeGreaterThan(0);

    // Remove, then Save: no photo, on the card or in the store.
    await edit();
    await form().getByRole('button', { name: 'Remove photo', exact: true }).tap();
    await form().getByRole('button', { name: 'Save', exact: true }).tap();
    expect(await photoSrc()).toEqual({ bytes: null, stored: null });
    await expect(fullOf(card(), name)).toHaveCount(0);
    await forceClose(phone);
  });

  test('a portrait photo with EXIF rotation saves portrait', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    await seedIdeas(page, app7Ideas());
    // Landscape pixels, tagged "rotate 90° clockwise": an iPhone's portrait photo.
    const tagged = withOrientation(await drawnJpeg(page, 2400, 1800, 300), 6);
    const card = ideaCard(page, 'Clams, garlic, parsley');
    await header(card).tap();
    await card.getByRole('button', { name: 'Edit', exact: true }).tap();
    await choosePhoto(page, card.locator('form').getByRole('button', { name: 'Add photo', exact: true }), {
      name: 'IMG_0413.jpg',
      mimeType: 'image/jpeg',
      buffer: tagged,
    });
    const preview = card.locator('form').getByRole('img', { name: 'Clams, garlic, parsley' });
    await expect(preview).toBeVisible();
    expect(await natural(preview)).toEqual([1200, 1600]);
    await card.locator('form').getByRole('button', { name: 'Save', exact: true }).tap();
    const full = fullOf(ideaCard(page, 'Clams, garlic, parsley'), 'Clams, garlic, parsley');
    await expect(full).toBeVisible();
    expect(await natural(full)).toEqual([1200, 1600]);
    const box = (await full.boundingBox())!;
    expect(Math.round(box.height)).toBe(Math.round(box.width));
    await forceClose(phone);
  });

  test('a photo added in one profile appears in another after a sync, and one saved signed out uploads later', async ({ baseURL }, info) => {
    const repo = newRepo();
    const phoneA = await openPhone(info.outputPath('a'), { time: T0 }, baseURL!);
    await stubGitHub(phoneA.context, repo, 'a');
    const a = phoneA.page;
    await phoneWidth(a);

    // Signed out: the photo stays in this browser, through a force close.
    await tab(a, 'Toppings').tap();
    await a.getByRole('button', { name: 'Add idea', exact: true }).tap();
    const form = panel(a, 'Toppings').locator('form');
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill('Margherita, extra basil');
    await choosePhoto(a, form.getByRole('button', { name: 'Add photo', exact: true }), {
      name: 'IMG_0420.jpg',
      mimeType: 'image/jpeg',
      buffer: await drawnJpeg(a, 2000, 1500, 0),
    });
    await expect(form.getByRole('img', { name: 'Margherita, extra basil' })).toBeVisible();
    await form.getByRole('button', { name: 'Save', exact: true }).tap();
    await a.clock.runFor(5 * S);
    expect(repo.requests).toEqual([]);
    await forceClose(phoneA);
    const phoneA2 = await openPhone(info.outputPath('a'), { time: T0 + MIN }, baseURL!);
    await stubGitHub(phoneA2.context, repo, 'a');
    const a2 = phoneA2.page;
    await phoneWidth(a2);
    await expect(thumbOf(ideaCard(a2, 'Margherita, extra basil'))).toBeVisible();

    // Signed in: the photo goes up before the idea that names it.
    await connect(a2);
    await expect(panel(a2, 'Bake log')).toContainText('Synced the topping ideas');
    // The photo, then the idea, then the photo's square copy for the gallery and the portfolio (§13.3).
    const [photoFile] = photoFiles(repo);
    expect(photoFiles(repo)).toEqual([photoFile, photoFile!.replace(/\.jpg$/, '.square.jpg')]);
    const puts = repo.requests.filter((r) => r.startsWith('PUT') && r.includes('/toppings/'));
    expect(puts[0]).toContain('/toppings/images/');
    expect(puts[1]).toMatch(/\/toppings\/[^/]+\.json$/);
    expect(puts[2]).toMatch(/\/toppings\/images\/[\w-]+\.square\.jpg$/);

    const phoneB = await openPhone(info.outputPath('b'), { time: T0 + 2 * MIN }, baseURL!);
    await stubGitHub(phoneB.context, repo, 'b');
    const b = phoneB.page;
    await phoneWidth(b);
    await connect(b);
    await tab(b, 'Toppings').tap();
    const card = ideaCard(b, 'Margherita, extra basil');
    await expect(thumbOf(card)).toBeVisible();
    await header(card).tap();
    await expect(fullOf(card, 'Margherita, extra basil')).toBeVisible();
    const blobs = repo.requests.filter((r) => r.includes('/git/blobs/')).length;
    expect(blobs).toBe(1);

    // Fetched once: another sync doesn't fetch it again.
    await tab(b, 'Bake log').tap();
    await panel(b, 'Bake log').getByRole('button', { name: 'Sync now' }).tap();
    await expect(panel(b, 'Bake log')).toContainText('Synced the topping ideas');
    expect(repo.requests.filter((r) => r.includes('/git/blobs/')).length).toBe(blobs);

    // Deleting the idea deletes its photo.
    await tab(a2, 'Toppings').tap();
    const own = ideaCard(a2, 'Margherita, extra basil');
    await header(own).tap();
    await own.getByRole('button', { name: 'Edit', exact: true }).tap();
    await own.getByRole('button', { name: 'Delete', exact: true }).tap();
    await own.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).tap();
    await a2.clock.runFor(2 * S);
    await expect.poll(() => photoFiles(repo).length).toBe(0);
    expect(ideaFiles(repo)).toHaveLength(0);
    await forceClose(phoneA2);
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
