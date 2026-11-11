/**
 * Dave's iPhone checks, run in WebKit as an iPhone home-screen app (`phone.ts`).
 *
 * - APP-3 (MESSAGE-65): the inputs survive a force close; a home-screen app
 *   ignores the address its icon was saved with.
 * - Reset (FINDINGS-67, MESSAGE-67): every input back to its default, and a
 *   reading still being edited doesn't survive it.
 * - APP-4 (MESSAGE-67): a stopped timer resumes with the pause left out.
 */
import { expect, test, type Page } from '@playwright/test';
import { beeps, done, forceClose, openPhone, step, timer, typeInto, wait } from './phone';

const T0 = new Date('2026-11-12T18:00:00-05:00').getTime();
const S = 1_000;
const MIN = 60 * S;

/** The icon was saved from an address that carried a setup. */
const STALE_ICON = '?balls=9&ball=270';

const field = (page: Page, name: string) => page.getByRole('spinbutton', { name, exact: true }).first();
const balls = (page: Page) => page.locator('output').first();

async function expectBatch(page: Page, b: { balls: string; weight: string; cold: string; schedule: string }) {
  await expect(balls(page)).toHaveText(b.balls);
  await expect(field(page, 'Ball weight')).toHaveValue(b.weight);
  await expect(page.getByRole('slider', { name: 'Cold ferment' })).toHaveValue(b.cold);
  await expect(page.getByRole('button', { name: new RegExp(`^${b.schedule}`), pressed: true })).toBeVisible();
}

async function tapReset(page: Page) {
  await page.getByRole('button', { name: 'Reset', exact: true }).tap();
  // The question takes the button's place; its own Reset sits lower.
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).tap();
}

test.describe('APP-3: the inputs survive closing the app', () => {
  test("MESSAGE-65's done-when, from a stale icon, then Reset", async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { path: STALE_ICON, time: T0 }, baseURL!);
    let { page } = phone;
    // Nothing stored yet: the launch address applies (§6, rule 1's fallback).
    await expectBatch(page, { balls: '9', weight: '270', cold: '24', schedule: 'Retarded' });

    await typeInto(page, field(page, 'Ball weight'), '250');
    await done(field(page, 'Ball weight'));
    for (let i = 0; i < 10 && (await balls(page).textContent()) !== '12'; i++) {
      await page.getByRole('button', { name: 'Increase number of balls' }).tap();
    }
    await page.getByRole('slider', { name: 'Cold ferment' }).fill('48');
    for (const [name, value] of [['Room', '67'], ['Biga, after crumbling', '59'], ['Bowl', '71']] as const) {
      await typeInto(page, field(page, name), value);
      await done(field(page, name));
    }
    await page.getByRole('checkbox', { name: 'Mark "Start the yeast, break up the flour" done' }).tap();
    await page.getByRole('checkbox', { name: 'Mark "Mix by hand to chunks" done' }).tap();
    const phaseA = () => timer(step(page, 'Phase A, breakdown', 'Mix 1'));
    await phaseA().start.tap();
    await wait(page, MIN);
    await expectBatch(page, { balls: '12', weight: '250', cold: '48', schedule: 'Retarded' });

    await forceClose(phone);
    phone = await openPhone(profile, { path: STALE_ICON, time: T0 + 5 * MIN }, baseURL!);
    page = phone.page;
    // All of it is there, and the icon's own address is ignored (rule 1).
    await expectBatch(page, { balls: '12', weight: '250', cold: '48', schedule: 'Retarded' });
    await expect(field(page, 'Room')).toHaveValue('67');
    await expect(field(page, 'Biga, after crumbling')).toHaveValue('59');
    await expect(field(page, 'Bowl')).toHaveValue('71');
    await expect(page.getByRole('checkbox', { name: 'Mark "Start the yeast, break up the flour" done' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Mark "Mix by hand to chunks" done' })).toBeChecked();
    await expect(phaseA().label).toHaveText('Past the window');
    await expect(phaseA().time).toHaveText('5:00');

    // Reset: every input to its default (Dave, 10 Nov), ticks and timers gone.
    await tapReset(page);
    await expectBatch(page, { balls: '6', weight: '265', cold: '24', schedule: 'Retarded' });
    await expect(field(page, 'Room')).toHaveValue('70');
    await expect(field(page, 'Biga, after crumbling')).toHaveValue('58');
    await expect(page.getByRole('checkbox', { name: 'Mark "Start the yeast, break up the flour" done' })).not.toBeChecked();
    await expect(timer(step(page, 'Phase A, breakdown')).start).toBeVisible();

    // And it holds through a force close: stored defaults, not the icon's 9 × 270.
    await forceClose(phone);
    phone = await openPhone(profile, { path: STALE_ICON, time: T0 + 10 * MIN }, baseURL!);
    await expectBatch(phone.page, { balls: '6', weight: '265', cold: '24', schedule: 'Retarded' });
    await expect(field(phone.page, 'Room')).toHaveValue('70');
    await forceClose(phone);
  });

  test('in Safari, a shared link shows its setup over a stored session', async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { path: '?balls=12&ball=250', standalone: false, time: T0 }, baseURL!);
    await forceClose(phone);
    // A bare address takes what is stored (rule 3) ...
    phone = await openPhone(profile, { standalone: false, time: T0 + MIN }, baseURL!);
    await expectBatch(phone.page, { balls: '12', weight: '250', cold: '24', schedule: 'Retarded' });
    await forceClose(phone);
    // ... and a link wins (rule 2), whole.
    phone = await openPhone(profile, { path: '?balls=9&ball=270', standalone: false, time: T0 + 2 * MIN }, baseURL!);
    await expectBatch(phone.page, { balls: '9', weight: '270', cold: '24', schedule: 'Retarded' });
    await forceClose(phone);
  });
});

test.describe('Reset discards a reading still being edited (FINDINGS-67)', () => {
  test('typed and not left: room and bowl come back at their defaults, and nothing is recorded', async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;
    await typeInto(page, field(page, 'Room'), '66');
    await typeInto(page, field(page, 'Bowl'), '71');
    // A tapped button doesn't take focus in WebKit: the bowl is still being edited.
    await tapReset(page);
    await expect(field(page, 'Room')).toHaveValue('70');
    await expect(field(page, 'Bowl')).toHaveValue('58');
    // Leaving the field afterwards records nothing.
    await done(field(page, 'Bowl'));
    await page.locator('body').tap({ position: { x: 5, y: 5 } });
    expect(page.url()).not.toMatch(/room=|bowlt=/);

    await forceClose(phone);
    phone = await openPhone(profile, { time: T0 + MIN }, baseURL!);
    page = phone.page;
    await expect(field(page, 'Room')).toHaveValue('70');
    await expect(field(page, 'Bowl')).toHaveValue('58');
    expect(page.url()).not.toMatch(/room=|bowlt=/);
    await forceClose(phone);
  });
});

test.describe('APP-4: a stopped timer resumes', () => {
  test("MESSAGE-67's done-when", async ({ baseURL }, info) => {
    const profile = info.outputPath('profile');
    let phone = await openPhone(profile, { time: T0 }, baseURL!);
    let { page } = phone;

    // Phase C: stopped at 3:00, resumed 20 s later, stopped 1:00 after.
    const c = () => timer(step(page, 'Phase C, development'));
    await c().start.tap();
    await wait(page, 3 * MIN - S);
    await expect(c().time).toHaveText('3:00');
    await c().stop.tap();
    await expect(c().label).toHaveText('Stopped');
    await wait(page, 20 * S - S);
    await expect(c().time).toHaveText('3:00');
    await c().resume.tap();
    await expect(c().tag).toHaveText('Logged');
    await wait(page, MIN - S);
    await c().stop.tap();
    await expect(c().time).toHaveText('4:00');
    await expect(c().tag).toHaveText('Logged · 4:00');
    // The log card records the time the timer ran.
    const logRow = page.getByText('Phase C', { exact: true }).locator('xpath=following-sibling::span');
    await expect(logRow).toHaveText('4:00');

    // A bulk rest stopped at 30:00 and resumed five minutes later carries on from 30:00.
    const bulk = () => timer(step(page, 'Bulk rest'));
    await bulk().start.tap();
    await wait(page, 30 * MIN - S);
    await bulk().stop.tap();
    await expect(bulk().time).toHaveText('30:00');
    await wait(page, 5 * MIN - S);
    await bulk().resume.tap();
    await expect(bulk().time).toHaveText('30:00');
    await wait(page, MIN - S);
    await expect(bulk().time).toHaveText('31:00');
    // Stopped here, or it crosses its own bound during the beep checks below.
    await bulk().stop.tap();

    // A timer past its range resumes without a beep.
    const a = () => timer(step(page, 'Phase A, breakdown'));
    const before = await beeps(page);
    await a().start.tap();
    await wait(page, 5 * MIN);
    await expect(a().label).toHaveText('Past the window');
    expect(await beeps(page)).toBe(before + 1);
    await a().stop.tap();
    await wait(page, MIN);
    await a().resume.tap();
    await wait(page, 2 * MIN);
    await expect(a().label).toHaveText('Past the window');
    expect(await beeps(page)).toBe(before + 1);

    // One resumed before its lower bound beeps once on reaching it.
    const b = () => timer(step(page, 'Phase B, salt and bassinage'));
    await b().start.tap();
    await wait(page, 2 * MIN);
    await b().stop.tap();
    await wait(page, MIN);
    await b().resume.tap();
    await wait(page, 4 * MIN);
    expect(await beeps(page)).toBe(before + 1);
    await wait(page, 2 * MIN);
    await expect(b().label).toHaveText('In the window');
    expect(await beeps(page)).toBe(before + 2);

    // A double tap on Stop leaves the timer running from where it was.
    const rest = () => timer(step(page, 'Rest'));
    await rest().start.tap();
    await wait(page, 2 * MIN - S);
    await rest().stop.dblclick();
    await expect(rest().label).toHaveText('Running');
    await expect(rest().time).toHaveText('2:00');
    await wait(page, MIN - S);
    await expect(rest().time).toHaveText('3:00');

    // All of it survives a reload ...
    await page.reload();
    await expect(c().label).toHaveText('Stopped');
    await expect(c().time).toHaveText('4:00');
    await expect(c().resume).toBeVisible();
    await expect(bulk().time).toHaveText('31:00');
    await expect(rest().label).toHaveText('Running');

    // ... and a force close.
    const now = await page.evaluate(() => Date.now());
    await forceClose(phone);
    phone = await openPhone(profile, { time: now + MIN }, baseURL!);
    page = phone.page;
    await expect(c().time).toHaveText('4:00');
    await expect(c().tag).toHaveText('Logged · 4:00');
    await expect(page.getByText('Phase C', { exact: true }).locator('xpath=following-sibling::span')).toHaveText('4:00');
    await expect(rest().time).toHaveText('4:00');
    await forceClose(phone);
  });
});
