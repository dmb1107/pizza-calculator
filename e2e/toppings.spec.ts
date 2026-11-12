/**
 * APP-14 (#36, Dave's decisions of 12 Nov 2026): the Toppings tab redesign,
 * run as the rest of the iPhone suite is (`phone.ts`), at 375 px and at
 * desktop width.
 *
 * - 14a, 14f: Pizzas, Dessert pizzas, then Untested at the bottom, split by
 *   kind only when both have untested ideas; the Dessert pizza toggle.
 * - 14g: Add idea floats at the bottom right, above the phone's tab bar.
 * - 14d: no Expand all or Collapse all anywhere.
 * - 14b: from 1024 px a photo gallery, an idea opening in a panel at the right.
 * - 14c, 14e: the fields format as typed and store Markdown; the name
 *   capitalizes words.
 *
 * Screenshots go to `APP14_SHOTS` when it is set.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { forceClose, openPhone, tab } from './phone';

const T0 = new Date('2026-11-12T18:00:00-05:00').getTime();
const SHOTS = process.env['APP14_SHOTS'];
const KEY = 'biga-calculator:toppings:v1';

const idea = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  pre_bake: '* Tomato sauce\n* Fior di latte\n* Basil',
  post_bake: '',
  notes: '',
  comments: '',
  rating: null,
  photo: null,
  created: '2026-11-10T18:00:00.000Z',
  updated: '2026-11-10T18:00:00.000Z',
  ...extra,
});

const SEED = [
  idea('2026-11-01-180000-aa01', 'Margherita Pizza', { rating: 5 }),
  idea('2026-11-01-180000-aa02', 'Pepperoni Pizza', { rating: 4.5, pre_bake: '* Tomato sauce\n* Mozzarella\n* Pepperoni' }),
  idea('2026-11-01-180000-aa03', 'Birria pizza', { rating: 5, pre_bake: '* Thickened consomé\n* Queso Oaxaca\n* Birria beef' }),
  idea('2026-11-01-180000-aa04', 'Pad Thai Pizza', { rating: 5, notes: '* Pad Thai sauce\n    * Tamarind\n    * Fish sauce' }),
  idea('2026-11-01-180000-aa05', 'Cubano Pizza', { rating: 4 }),
  idea('2026-11-01-180000-aa06', 'Chili Dog Pizza', { rating: 4.5 }),
  idea('2026-11-01-180000-dd01', 'Nutella pizza', { rating: 5, dessert: true, pre_bake: '* Vanilla custard\n* Sliced banana' }),
  idea('2026-11-01-180000-dd02', 'Tiramisu Pizza', { rating: 5, dessert: true, pre_bake: '* Blind bake' }),
  idea('2026-11-02-180000-uu01', 'Okonomiyaki Pizza', { created: '2026-11-02T18:00:00.000Z' }),
  idea('2026-11-03-180000-uu02', 'Carne asada, lime cream', { pre_bake: '', created: '2026-11-03T18:00:00.000Z' }),
];

async function seed(page: Page, ideas: readonly object[]) {
  await page.evaluate(
    ({ key, ideas }) => localStorage.setItem(key, JSON.stringify({ items: ideas, shas: {}, dirty: [], deleted: [], lastSyncedAt: '' })),
    { key: KEY, ideas },
  );
  await page.reload();
  await tab(page, 'Toppings').tap();
}

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const fab = (page: Page) => page.getByRole('button', { name: 'Add idea', exact: true });
const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"items":[]}').items as Record<string, unknown>[], KEY);
const y = async (l: Locator) => (await l.boundingBox())!.y;

/**
 * The editor's fields load when it first opens, and React shows loaded
 * content on a timer, which the suite's paused clock holds: move it on.
 */
async function editorReady(page: Page) {
  await page.clock.runFor(1000);
  await expect(page.getByRole('textbox', { name: 'Pre-bake', exact: true }).first()).toBeVisible();
}

test.describe('APP-14 on a phone (375 px)', () => {
  test('the order, untested at the bottom, the floating button, and no Expand all', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('p'), { time: T0 }, baseURL!);
    const { page } = phone;
    await page.setViewportSize({ width: 375, height: 812 });
    await seed(page, SEED);

    // 14f: Pizzas, Dessert pizzas, Untested, in that order down the page.
    const pizzas = region(page, 'Pizzas');
    const desserts = region(page, 'Dessert pizzas');
    const untested = region(page, 'Untested');
    expect(await y(pizzas)).toBeLessThan(await y(desserts));
    expect(await y(desserts)).toBeLessThan(await y(untested));
    await expect(desserts).toContainText('Nutella pizza');
    await expect(pizzas).not.toContainText('Nutella pizza');
    await expect(untested).toContainText('Okonomiyaki Pizza');
    // Only pizzas are untested, so no small headings yet.
    await expect(untested.getByRole('heading', { name: /^(Pizzas|Dessert pizzas)$/, level: 3 })).toHaveCount(0);

    // 14d: no control that opens or closes every card.
    await expect(page.getByRole('button', { name: /^(Expand all|Collapse all)$/ })).toHaveCount(0);

    // 14g: floating at the bottom right, above the tab bar.
    const button = fab(page);
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    const bar = (await page.getByRole('navigation', { name: 'Sections' }).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
    expect(box.x + box.width).toBeGreaterThan(375 - 40);
    expect(box.height).toBeGreaterThanOrEqual(48);
    // It stays in view as the page scrolls.
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(button).toBeInViewport();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/app14-phone-list.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    // The editor opens at the top of the tab, in view, and the button hides.
    await button.tap();
    await editorReady(page);
    const form = page.getByRole('tabpanel', { name: 'Toppings' }).locator('form');
    await expect(form).toBeInViewport();
    await expect(fab(page)).toHaveCount(0);
    expect(await y(form)).toBeLessThan(await y(pizzas));

    // 14e: the name capitalizes words on a phone's keyboard.
    await expect(form.getByRole('textbox', { name: 'Name', exact: true })).toHaveAttribute('autocapitalize', 'words');
    await form.getByRole('textbox', { name: 'Name', exact: true }).fill('Fig and mascarpone');

    // 14a: the toggle, off for a new idea.
    const toggle = form.getByRole('switch', { name: /Dessert pizza/ });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.tap();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // 14c: Pre-bake starts with a bullet; Enter makes the next; the toolbar's
    // Indent nests it and Bold bolds what follows.
    const pre = form.getByRole('textbox', { name: 'Pre-bake', exact: true });
    await pre.tap();
    const toolbar = form.getByRole('toolbar', { name: 'Pre-bake formatting' });
    await expect(toolbar).toBeVisible();
    await page.keyboard.type('Mascarpone');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Figs, ');
    await toolbar.getByRole('button', { name: 'Indent' }).tap();
    await toolbar.getByRole('button', { name: 'Bold' }).tap();
    await page.keyboard.type('halved');
    await expect(pre.locator('ul ul li strong')).toHaveText('halved');
    // Every toolbar button is a full touch target.
    for (const b of await toolbar.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/app14-phone-editor.png` });

    await form.getByRole('button', { name: 'Save', exact: true }).tap();
    await expect(form).toHaveCount(0);
    await expect(fab(page)).toBeVisible();

    // An untested dessert pizza joins the untested pizzas: now split by kind.
    await expect(untested.getByRole('heading', { name: 'Dessert pizzas', level: 3, exact: true })).toBeVisible();
    await expect(untested.getByRole('heading', { name: 'Pizzas', level: 3, exact: true })).toBeVisible();
    await expect(untested).toContainText('Fig and mascarpone');

    const saved = (await stored(page)).find((i) => i['name'] === 'Fig and mascarpone')!;
    expect(saved['dessert']).toBe(true);
    expect(saved['pre_bake']).toBe('* Mascarpone\n    * Figs, **halved**');
    // Post-bake, left at its first empty bullet, saves empty.
    expect(saved['post_bake']).toBe('');
    // The seeded ideas, never opened in the editor, are as they were.
    expect((await stored(page)).find((i) => i['name'] === 'Pad Thai Pizza')!['notes']).toBe('* Pad Thai sauce\n    * Tamarind\n    * Fish sauce');
    await forceClose(phone);
  });

  test('an idea saved before APP-14 opens and saves as a pizza, its text untouched', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('p'), { time: T0 }, baseURL!);
    const { page } = phone;
    await page.setViewportSize({ width: 375, height: 812 });
    const old = idea('2026-10-01-180000-ol01', 'Potato pizza', {
      rating: 2,
      notes: '* Garlic cream sauce\n    * 1 cup cream\n* Potatoes\n    * Very thinly sliced',
      comments: 'Par boil the potatoes next time.',
    });
    delete (old as Record<string, unknown>)['dessert'];
    await seed(page, [old]);
    await expect(region(page, 'Pizzas')).toContainText('Potato pizza');

    const card = page.locator('li').filter({ has: page.getByRole('button', { name: /^Potato pizza/ }) });
    await card.getByRole('button').first().tap();
    await card.getByRole('button', { name: 'Edit', exact: true }).tap();
    await editorReady(page);
    await expect(card.getByRole('switch', { name: /Dessert pizza/ })).toHaveAttribute('aria-checked', 'false');
    // Formatted as it will show: the nested bullets are nested.
    await expect(card.getByRole('textbox', { name: 'Notes', exact: true }).locator('ul ul li')).toHaveCount(2);
    await card.getByRole('button', { name: 'Save', exact: true }).tap();
    const after = (await stored(page))[0]!;
    expect(after['notes']).toBe('* Garlic cream sauce\n    * 1 cup cream\n* Potatoes\n    * Very thinly sliced');
    expect(after['comments']).toBe('Par boil the potatoes next time.');
    expect(after['dessert']).toBe(false);
    await forceClose(phone);
  });
});

test.describe('APP-14 from desktop width', () => {
  test('the gallery, an idea in the panel, and a new one added there', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('d'), { time: T0 }, baseURL!);
    const { page } = phone;
    await page.setViewportSize({ width: 1280, height: 900 });
    await seed(page, SEED);

    // 14b: five to a row at 1280 px, the pre-bake toppings where there is no photo.
    const pizzas = region(page, 'Pizzas');
    const tiles = pizzas.getByRole('listitem');
    await expect(tiles).toHaveCount(6);
    const tops = await Promise.all((await tiles.all()).map(async (t) => Math.round((await t.boundingBox())!.y)));
    expect(tops.filter((t) => t === tops[0])).toHaveLength(5);
    await expect(tiles.first()).toContainText('Tomato sauce');
    await expect(region(page, 'Untested')).toContainText('Only a name so far.');
    await expect(page.getByRole('button', { name: /^(Expand all|Collapse all)$/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/app14-desktop-gallery.png` });

    // An idea opens in the panel at the right, with Edit and Close.
    await pizzas.getByRole('button', { name: /Pad Thai Pizza/ }).click();
    const panelEl = page.getByRole('complementary', { name: 'Pad Thai Pizza' });
    await expect(panelEl).toBeVisible();
    expect((await panelEl.boundingBox())!.x).toBeGreaterThan(1280 - 460);
    await expect(panelEl.locator('ul ul li')).toHaveCount(2);
    await expect(fab(page)).toHaveCount(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/app14-desktop-panel.png` });
    // Escape closes it, and the button is back.
    await page.keyboard.press('Escape');
    await expect(panelEl).toHaveCount(0);
    await expect(fab(page)).toBeVisible();

    // Add idea opens the editor in the panel. Tab nests, Shift-Tab brings back.
    await fab(page).click();
    await editorReady(page);
    const editor = page.getByRole('complementary', { name: 'Add idea' });
    await expect(editor.locator('form')).toBeVisible();
    await expect(editor.getByRole('toolbar')).toHaveCount(0);
    await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Hot honey soppressata');
    await editor.getByRole('textbox', { name: 'Pre-bake', exact: true }).click();
    await page.keyboard.type('San Marzano');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Crushed by hand');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('Soppressata');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();

    // Saved: the panel shows it, and it sits under Untested.
    const shown = page.getByRole('complementary', { name: 'Hot honey soppressata' });
    await expect(shown).toBeVisible();
    await expect(region(page, 'Untested')).toContainText('Hot honey soppressata');
    const saved = (await stored(page)).find((i) => i['name'] === 'Hot honey soppressata')!;
    expect(saved['pre_bake']).toBe('* San Marzano\n    * Crushed by hand\n* Soppressata');
    expect(saved['dessert']).toBe(false);

    // Edit in the panel, Cancel back to the idea, then Close.
    await shown.getByRole('button', { name: 'Edit', exact: true }).click();
    await editorReady(page);
    await expect(shown.locator('form')).toBeVisible();
    await shown.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(shown.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await shown.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('complementary')).toHaveCount(0);

    // At 1024 px, four to a row; nothing scrolls sideways.
    await page.setViewportSize({ width: 1024, height: 800 });
    const rowTops = await Promise.all((await tiles.all()).map(async (t) => Math.round((await t.boundingBox())!.y)));
    expect(rowTops.filter((t) => t === rowTops[0])).toHaveLength(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
    await forceClose(phone);
  });
});
