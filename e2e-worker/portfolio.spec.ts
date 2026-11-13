/**
 * APP-11's *Done when*, against the real Worker in workerd (`npm run
 * test:worker`): the portfolio (§15) built from the fake GitHub's ideas,
 * signed out, with only the listed pizzas, their pages and their photos,
 * no script and no console error (a blocked style or image would log one).
 *
 * Screenshots go to `APP11_SHOTS` when it is set.
 */
import { expect, test, type Page } from '@playwright/test';

const GITHUB = 'http://127.0.0.1:8790';
const BASE = `${GITHUB}/repos/dmb1107/pizza-bake-log/contents`;
const SHOTS = process.env['APP11_SHOTS'];

async function put(path: string, base64: string) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer local-test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'seed', content: base64 }),
  });
  expect(res.ok, path).toBe(true);
}

const idea = (id: string, name: string, extra: Record<string, unknown>) => ({
  id,
  name,
  pre_bake: '* Tomato sauce\n* Fresh mozzarella\n    * Torn, not sliced',
  post_bake: '* Basil\n* [Olive oil](https://example.com/oil)',
  notes: 'PRIVATE notes',
  comments: 'PRIVATE comments',
  photo: `${id}-0123456789ab`,
  created: '2026-11-01T18:00:00.000Z',
  updated: '2026-11-01T18:00:00.000Z',
  ...extra,
});

/** A small real JPEG, drawn in the browser. */
async function jpeg(page: Page, color: string): Promise<string> {
  return page.evaluate(async (c) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 64, 64);
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.8));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }, color);
}

test('the portfolio lists the rated pizzas with photos, best first, and keeps the rest private', async ({ page, request }) => {
  await fetch(`${GITHUB}/__reset`, { method: 'POST' });
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('about:blank');

  const ideas = [
    idea('margherita', 'Margherita Pizza', { rating: 5 }),
    idea('tiramisu', 'Tiramisu Pizza', { rating: 4.5, dessert: true, post_bake: '' }),
    idea('secret', 'Secret Pizza', { rating: 5, portfolio: 'hidden' }),
    idea('potato', 'Potato pizza', { rating: 2 }),
    idea('shown', 'Rescued Pizza', { rating: 2, portfolio: 'shown' }),
    idea('untested', 'Okonomiyaki Pizza', { rating: null }),
  ];
  for (const [i, x] of ideas.entries()) {
    await put(`toppings/${x.id}.json`, Buffer.from(JSON.stringify(x)).toString('base64'));
    await put(`toppings/images/${x.photo}.jpg`, await jpeg(page, ['#c2410c', '#f5d0a9', '#333', '#999', '#4a7', '#27a'][i]!));
  }

  await page.goto('/portfolio');
  await expect(page).toHaveTitle("Dave's pizzas");
  const tiles = page.locator('a.tile');
  await expect(tiles).toHaveText(['Margherita Pizza', 'Rescued Pizza', 'Tiramisu Pizza']);
  await expect(page.getByRole('heading', { level: 2, name: 'Dessert pizzas' })).toBeVisible();
  await expect(page.getByText('Neo-Neapolitan style')).toBeVisible();
  for (const img of await page.locator('a.tile img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth)).toBe(64);
  }
  expect(await page.locator('script').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(await page.content()).not.toMatch(/PRIVATE|Secret|Potato|Okonomiyaki|2026-11-01/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/app11-worker-grid.png` });

  await tiles.first().click();
  await expect(page).toHaveURL(/\/portfolio\/margherita$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Margherita Pizza');
  await expect(page.getByRole('img', { name: 'Rated 5 of 5' })).toBeVisible();
  await expect(page.getByText("Dave's rating")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pre-bake' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Olive oil' })).toHaveAttribute('target', '_blank');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/portfolio\/photos\/margherita-0123456789ab\.jpg$/,
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/app11-worker-pizza.png`, fullPage: true });

  await page.getByRole('link', { name: 'All pizzas' }).click();
  await expect(page).toHaveURL(/\/portfolio#margherita$/);

  await page.goto('/portfolio/tiramisu');
  await expect(page.getByRole('heading', { name: 'Post-bake' })).toHaveCount(0);

  // Hidden and below-3 ideas: no page and no photo, though both are in the repository.
  for (const id of ['secret', 'potato', 'untested']) {
    expect((await request.get(`/portfolio/${id}`)).status(), id).toBe(404);
    expect((await request.get(`/portfolio/photos/${id}-0123456789ab.jpg`)).status(), id).toBe(404);
  }
  // The grid's link preview: a static image served with the page.
  await page.goto('/portfolio');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/portfolio-preview\.jpg$/);
  const preview = await request.get('/portfolio-preview.jpg');
  expect(preview.status()).toBe(200);
  expect(preview.headers()['content-type']).toBe('image/jpeg');

  const photo = await request.get('/portfolio/photos/margherita-0123456789ab.jpg');
  expect(photo.status()).toBe(200);
  expect(photo.headers()['content-type']).toBe('image/jpeg');

  // Signed out throughout, and the Worker only read.
  const log = (await (await fetch(`${GITHUB}/__log`)).json()) as { log: { method: string; path: string; auth: string | null }[] };
  const portfolioCalls = log.log.filter((c) => c.path === '/graphql' || c.path.includes('/git/blobs/'));
  expect(portfolioCalls.length).toBeGreaterThan(0);
  expect(portfolioCalls.every((c) => c.auth === 'Bearer local-test-token')).toBe(true);
  expect(log.log.filter((c) => c.method === 'PUT' && !c.path.includes('/contents/toppings')).length).toBe(0);
  expect(errors).toEqual([]);
});
