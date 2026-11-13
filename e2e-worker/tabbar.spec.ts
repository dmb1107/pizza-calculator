import { expect, test } from '@playwright/test';

/**
 * #64: in Chromium a click moves focus off the field being typed into at the
 * press, before the release. The tab bar, hidden while typing below 768 px,
 * used to come back then, under the pointer, and a button at the bottom of
 * the screen lost the click. The bar now waits until the click has landed.
 */
test('a button at the bottom edge takes the tap while a field has focus, and the bar comes back after it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('tab', { name: 'Bake log', exact: true }).click();
  const panel = page.getByRole('tabpanel', { name: 'Bake log' });
  const bar = page.getByRole('navigation', { name: 'Sections' });

  await panel.getByLabel('Setup code').fill('wrong code');
  await expect(bar).toBeHidden();
  const create = panel.getByRole('button', { name: 'Create a passkey', exact: true });
  // The button's foot on the screen's foot: where the bar comes back.
  await create.evaluate((e) => e.scrollIntoView({ block: 'end' }));
  const box = (await create.boundingBox())!;
  expect(box.y + box.height).toBeGreaterThan(667 - 56);

  await create.click();
  // The Worker answered, so the click landed. After passkey.spec's limit test
  // the answer is the wait rather than the wrong code; either will do.
  await expect(panel.getByRole('status')).toHaveText(/^(That setup code isn't right\.|Too many wrong setup codes\.)/);
  await expect(bar).toBeVisible();
  await context.close();
});
