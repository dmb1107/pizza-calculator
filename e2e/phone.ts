/**
 * An iPhone, as near as WebKit off the device gets.
 *
 * - **WebKit** with the iPhone 15's screen, touch, scale and user agent.
 * - **A profile on disk**, so storage survives `forceClose` and a relaunch,
 *   as it does when the app is swiped away.
 * - **A home-screen app** when `standalone`: `navigator.standalone` is true
 *   before any of the app's code runs, as iOS reports it for a web app. Whether
 *   iOS reports it for an icon from a site with no manifest is the one thing
 *   this can't check (MESSAGE-67 §1).
 * - **A fake clock**, so a 30-minute rest takes a moment. Each launch installs
 *   it at the time given, so a relaunch carries on later in the same day.
 * - **A beep counter**: each beep makes two oscillators.
 * - **iOS focus**: a tapped button leaves the field being typed into focused,
 *   as on Dave's phone. Desktop WebKit doesn't, so this is modelled, not native.
 *
 * What this can't reach: the real keyboard, iOS discarding the app in the
 * background, its separate storage from Safari, and the speaker.
 */
import { devices, expect, webkit, type BrowserContext, type Locator, type Page } from '@playwright/test';

export const IPHONE = devices['iPhone 15'];

export interface Phone {
  context: BrowserContext;
  page: Page;
}

export async function openPhone(
  profileDir: string,
  { path = '', standalone = true, time }: { path?: string; standalone?: boolean; time: number },
  baseURL: string,
): Promise<Phone> {
  const { defaultBrowserType: _unused, ...device } = IPHONE;
  const context = await webkit.launchPersistentContext(profileDir, { ...device, baseURL });
  await context.addInitScript(
    ({ standalone }) => {
      if (standalone) Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
      // iOS: a tapped button leaves a field being typed into focused, keyboard
      // up (Dave's phone, FINDINGS-67). Desktop WebKit moves focus off the
      // field, which hid the Reset bug here as Chrome did, so model it:
      // cancelling mousedown on a button keeps focus where it was, and the
      // click still fires.
      document.addEventListener(
        'mousedown',
        (e) => {
          const onButton = e.target instanceof Element && e.target.closest('button');
          if (onButton && document.activeElement instanceof HTMLInputElement) e.preventDefault();
        },
        true,
      );
      const w = window as unknown as { __oscillators: number };
      w.__oscillators = 0;
      const Ctx = window.AudioContext;
      if (Ctx) {
        const create = Ctx.prototype.createOscillator;
        Ctx.prototype.createOscillator = function (this: AudioContext) {
          w.__oscillators += 1;
          return create.call(this);
        };
      }
    },
    { standalone },
  );
  const page = context.pages()[0] ?? (await context.newPage());
  // Paused: time moves only when a test moves it, so a timer reads exactly.
  await page.clock.install({ time: time - 1_000 });
  await page.clock.pauseAt(time);
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  return { context, page };
}

/** Swipe the app away: the process ends, storage on disk stays. */
export async function forceClose(phone: Phone): Promise<void> {
  await phone.context.close();
}

export const beeps = async (page: Page): Promise<number> =>
  (await page.evaluate(() => (window as unknown as { __oscillators: number }).__oscillators)) / 2;

/** A step's card: the list item holding its "Mark … done" checkbox. */
export function step(page: Page, title: string, label?: string): Locator {
  const name = `Mark "${title}"${label ? ` (${label})` : ''} done`;
  return page.locator('li').filter({ has: page.getByRole('checkbox', { name, exact: true }) });
}

/** The timer card inside a step, and what it shows. */
export function timer(card: Locator) {
  const box = card.locator('div.rounded-lg.border.p-3');
  return {
    box,
    start: card.getByRole('button', { name: /^Start .* timer$/ }),
    stop: box.getByRole('button', { name: 'Stop', exact: true }),
    resume: box.getByRole('button', { name: 'Resume', exact: true }),
    clear: box.getByRole('button', { name: 'Clear', exact: true }),
    time: box.locator('p.text-4xl'),
    label: box.locator('p').first(),
    tag: card.getByText(/^Logged/),
  };
}

/** Advance the fake clock and let one 1 s tick render it. */
export async function wait(page: Page, ms: number): Promise<void> {
  await page.clock.fastForward(ms);
  await page.clock.runFor(1_000);
}

/** Type a number the way a thumb does: tap, clear, type. Leaves the field focused. */
export async function typeInto(page: Page, field: Locator, value: string): Promise<void> {
  await field.tap();
  await field.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(value);
}

/** The keypad's Done: the field loses focus (Dave, 10 Nov: Done commits a reading). */
export const done = (field: Locator) => field.blur();
