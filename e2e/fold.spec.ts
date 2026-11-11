/**
 * APP-5 (MESSAGE-68): finished steps and groups fold away. (The Bake log
 * opened from the header too, until MESSAGE-70 made it a tab.) Run as the rest of the iPhone suite is (`phone.ts`),
 * at 375 px, the width MESSAGE-68's done-when names.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { beeps, forceClose, openPhone, step, timer, typeInto, wait, done } from './phone';

const T0 = new Date('2026-11-12T18:00:00-05:00').getTime();
const S = 1_000;
const MIN = 60 * S;

/** Room, flour, biga and bowl at 32 °F: mix 1's target is past 120 °F, so it carries a warning. */
const COLD_KITCHEN = '?room=32&biga=32&bowlt=32';
const WATER_WARNING = /^Target water is above/;

const heading = (page: Page, label: string) =>
  page.getByRole('button', { name: new RegExp(`^${label}, \\d+ of \\d+ done`) });
const rowToggle = (card: Locator, title: string) => card.getByRole('button', { name: new RegExp(`^${title}`) });

async function phoneWidth(page: Page) {
  await page.setViewportSize({ width: 375, height: 812 });
}

async function expectNoSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
}

/** The step's text, on one line: what a folded step shows. */
const textOf = async (card: Locator) => (await card.innerText()).replace(/\s+/g, ' ').trim();

test.describe('APP-5: finished steps and groups fold away', () => {
  test("MESSAGE-68's done-when", async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { path: COLD_KITCHEN, time: T0 }, baseURL!);
    let { page } = phone;
    await phoneWidth(page);

    // A ticked step is one line: checkbox and struck title, nothing else.
    const yeast = step(page, 'Start the yeast, break up the flour');
    await expect(yeast.getByRole('button', { name: 'Why', exact: true })).toBeVisible();
    const box = yeast.getByRole('checkbox', { name: /^Mark / });
    // Page coordinates: a tap scrolls its target into view first.
    const pageTop = () => box.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await box.scrollIntoViewIfNeeded();
    const boxTop = await pageTop();
    const viewTop = (await box.boundingBox())!.y;
    await box.tap();
    expect(await textOf(yeast)).toBe('Start the yeast, break up the flour');
    // It folds below its own checkbox: nothing above the tap moves, on the
    // page or on the screen.
    expect(await pageTop()).toBe(boxTop);
    expect((await box.boundingBox())!.y).toBe(viewTop);

    // A tap on the row opens it without unticking; another folds it.
    await rowToggle(yeast, 'Start the yeast').tap();
    await expect(box).toBeChecked();
    await expect(yeast.getByRole('button', { name: 'Why', exact: true })).toBeVisible();
    await rowToggle(yeast, 'Start the yeast').tap();
    expect(await textOf(yeast)).toBe('Start the yeast, break up the flour');
    // Opened, then reloaded: one line again, since the opening isn't stored.
    await rowToggle(yeast, 'Start the yeast').tap();
    await page.reload();
    await phoneWidth(page);
    expect(await textOf(yeast)).toBe('Start the yeast, break up the flour');
    // Unticking restores the step.
    await box.tap();
    await expect(yeast.getByRole('button', { name: 'Why', exact: true })).toBeVisible();

    // The water warning stays in sight with mix-1 ticked ...
    const prep = step(page, 'Prep the bowl');
    await expect(prep.getByText(WATER_WARNING)).toBeVisible();
    await prep.getByRole('checkbox', { name: /^Mark / }).tap();
    await expect(prep.getByRole('spinbutton', { name: 'Room', exact: true })).toHaveCount(0);
    await expect(prep.getByText(WATER_WARNING)).toBeVisible();

    // ... and with its group closed, under the heading.
    await heading(page, 'Final mix').tap();
    await expect(heading(page, 'Final mix')).toHaveAttribute('aria-expanded', 'false');
    await expect(prep).toHaveCount(0);
    await expect(page.getByText(WATER_WARNING)).toBeVisible();
    // Save is still there with every mix group closed.
    await expect(page.getByRole('button', { name: 'Save to the bake log' })).toBeVisible();

    // Each group closes; a closed one keeps its count.
    await heading(page, 'Biga').tap();
    await heading(page, 'Bulk, ball, cold').tap();
    await heading(page, 'Temper and bake').tap();
    await expect(heading(page, 'Biga')).toHaveAccessibleName('Biga, 0 of 6 done');
    await expect(page.getByText('0 / 6 done')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^Mark / })).toHaveCount(0);
    await expectNoSidewaysScroll(page);

    // Closed groups survive a reload and a force close; a ticked step stays ticked.
    await page.reload();
    await phoneWidth(page);
    for (const label of ['Biga', 'Final mix', 'Bulk, ball, cold', 'Temper and bake']) {
      await expect(heading(page, label)).toHaveAttribute('aria-expanded', 'false');
    }
    const now = await page.evaluate(() => Date.now());
    await forceClose(phone);
    phone = await openPhone(profile, { time: now + MIN }, baseURL!);
    page = phone.page;
    await phoneWidth(page);
    await expect(heading(page, 'Final mix')).toHaveAttribute('aria-expanded', 'false');
    await expect(heading(page, 'Final mix')).toHaveAccessibleName('Final mix, 1 of 7 done');
    await expect(page.getByText(WATER_WARNING)).toBeVisible();

    // A group reopens from its heading; ticking its last step leaves it open.
    await heading(page, 'Temper and bake').tap();
    for (const title of ['Temper', 'Bake']) await step(page, title).getByRole('checkbox', { name: /^Mark / }).tap();
    await expect(heading(page, 'Temper and bake')).toHaveAccessibleName('Temper and bake, 2 of 2 done');
    await expect(heading(page, 'Temper and bake')).toHaveAttribute('aria-expanded', 'true');

    // The Bake log is a tab since MESSAGE-70 (§13.1); the header and footer
    // buttons APP-5 added are gone. tabs.spec.ts checks the tabs.
    await expect(page.getByRole('button', { name: 'Bake log', exact: true })).toHaveCount(0);

    // No sideways scroll in either timeline mode, groups closed and open.
    await expectNoSidewaysScroll(page);
    await page.getByText('From the bake time').tap();
    await expectNoSidewaysScroll(page);
    await heading(page, 'Biga').tap();
    await heading(page, 'Final mix').tap();
    await expectNoSidewaysScroll(page);

    // Reset opens every group.
    await page.getByRole('button', { name: 'Reset', exact: true }).tap();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).tap();
    for (const label of ['Biga', 'Final mix', 'Bulk, ball, cold', 'Temper and bake']) {
      await expect(heading(page, label)).toHaveAttribute('aria-expanded', 'true');
    }
    await page.reload();
    await expect(heading(page, 'Bulk, ball, cold')).toHaveAttribute('aria-expanded', 'true');
    await forceClose(phone);
  });

  test('a split batch: one group per mix, mix-0 in Mix 1, Save after the last', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { path: '?balls=12', time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    const labels = await page.getByRole('button', { name: /, \d+ of \d+ done/ }).evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')),
    );
    expect(labels).toEqual([
      'Biga, 0 of 6 done',
      'Mix 1, 0 of 9 done',
      'Mix 2, 0 of 7 done',
      expect.stringMatching(/^Bulk, ball, cold, 0 of \d+ done$/),
      expect.stringMatching(/^Temper and bake, 0 of \d+ done$/),
    ]);
    // Split the biga opens Mix 1.
    const firstInMix1 = page.locator('#steps-mix\\#1 > li').first();
    await expect(firstInMix1.getByRole('checkbox', { name: /^Mark / })).toHaveAccessibleName('Mark "Split the biga" done');

    await heading(page, 'Mix 1').tap();
    await heading(page, 'Mix 2').tap();
    await expect(page.getByRole('button', { name: 'Save to the bake log' })).toBeVisible();
    await expectNoSidewaysScroll(page);

    // At one mix the stored Mix 2 names no group, and is ignored.
    await page.getByRole('button', { name: 'Decrease number of balls' }).tap();
    while ((await page.locator('output').first().innerText()) !== '6') {
      await page.getByRole('button', { name: 'Decrease number of balls' }).tap();
    }
    await expect(heading(page, 'Final mix')).toHaveAttribute('aria-expanded', 'true');
    await forceClose(phone);
  });

  test('a running timer in a closed group: marked, beeps on time, and holds a ticked step open', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);

    const card = () => step(page, 'Phase A, breakdown');
    const a = () => timer(card());
    await a().start.tap();
    await heading(page, 'Final mix').tap();
    const mark = heading(page, 'Final mix').getByText(/^Timer · /);
    await expect(mark).toHaveText('Timer · Before the window · 0:00');
    await expect(heading(page, 'Final mix')).toHaveAccessibleName('Final mix, 0 of 7 done, timer before the window');

    // Phase A is 3–4 min: the mark turns at 3:00, and the beep comes with the
    // card out of sight.
    const before = await beeps(page);
    await wait(page, 3 * MIN - S);
    await expect(mark).toHaveText('Timer · In the window · 3:00');
    expect(await beeps(page)).toBe(before + 1);
    // Reopening the group doesn't beep again.
    await heading(page, 'Final mix').tap();
    await expect(a().label).toHaveText('In the window');
    await wait(page, 5 * S);
    expect(await beeps(page)).toBe(before + 1);
    await expect(mark).toHaveCount(0);

    // Ticking stops the timer and folds the step. Reopened and resumed, it
    // stays open while the timer runs, a reload included.
    await card().getByRole('checkbox', { name: /^Mark / }).tap();
    expect(await textOf(card())).toBe('Phase A, breakdown');
    await rowToggle(card(), 'Phase A').tap();
    await a().resume.tap();
    await expect(a().label).toHaveText('In the window');
    await page.reload();
    await phoneWidth(page);
    await expect(a().stop).toBeVisible();
    // While it runs the row isn't a toggle.
    await expect(rowToggle(card(), 'Phase A')).toHaveCount(0);
    // Stopped, it stays open rather than folding under a second tap ...
    await a().stop.tap();
    await expect(a().resume).toBeVisible();
    await expect(card().getByRole('checkbox', { name: /^Mark / })).toBeChecked();
    // ... and folds from its row, or on a reload.
    await page.reload();
    await phoneWidth(page);
    expect(await textOf(card())).toBe('Phase A, breakdown');
    await forceClose(phone);
  });

  test('a reading being typed is recorded when its step folds or its group closes', async ({ baseURL }, info) => {
    const phone = await openPhone(info.outputPath('profile'), { time: T0 }, baseURL!);
    const { page } = phone;
    await phoneWidth(page);
    const room = page.getByRole('spinbutton', { name: 'Room', exact: true });

    // Typed, not left, then the step ticked: iOS keeps the field focused.
    await typeInto(page, room, '66');
    await step(page, 'Prep the bowl').getByRole('checkbox', { name: /^Mark / }).tap();
    await expect(page).toHaveURL(/room=66/);

    // Reopened, typed, then the group closed from its heading.
    await rowToggle(step(page, 'Prep the bowl'), 'Prep the bowl').tap();
    await typeInto(page, room, '67');
    await heading(page, 'Final mix').tap();
    await expect(page).toHaveURL(/room=67/);
    await heading(page, 'Final mix').tap();

    // Reopened, typed, then folded from its row.
    await rowToggle(step(page, 'Prep the bowl'), 'Prep the bowl').tap();
    await expect(room).toHaveValue('67');
    await typeInto(page, room, '68');
    await rowToggle(step(page, 'Prep the bowl'), 'Prep the bowl').tap();
    await expect(page).toHaveURL(/room=68/);
    await rowToggle(step(page, 'Prep the bowl'), 'Prep the bowl').tap();
    await expect(room).toHaveValue('68');
    await done(room);
    await forceClose(phone);
  });
});
