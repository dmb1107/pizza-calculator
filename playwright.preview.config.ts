import { defineConfig } from '@playwright/test';

/**
 * The preview deploy's check (`npm run test:preview`, MESSAGE-75 §7). Needs
 * PREVIEW_URL and PREVIEW_SETUP_CODE in the environment; skips without them.
 */
export default defineConfig({
  testDir: 'e2e-worker',
  testMatch: 'preview.spec.ts',
  reporter: [['list']],
  workers: 1,
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
});
